"""Local BrainFlow acquisition -> observatory-stream/1. Never binds to a LAN."""
import argparse
import hmac
import json
import math
import os
import secrets
import threading
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds


class Acquisition:
    def __init__(self, board_id=-1, serial_port="", file="", master_board=-1):
        params = BrainFlowInputParams()
        params.serial_port = serial_port
        params.file = file
        params.master_board = master_board
        self.board = BoardShim(board_id, params)
        self.descriptor = master_board if board_id == BoardIds.PLAYBACK_FILE_BOARD.value else board_id
        self.indices = BoardShim.get_eeg_channels(self.descriptor)
        if not self.indices:
            raise ValueError("This bridge requires a board with EEG channels.")
        self.rate = BoardShim.get_sampling_rate(self.descriptor)
        self.timestamp_channel = BoardShim.get_timestamp_channel(self.descriptor)
        self.channels = [f"EEG {i+1}" for i in range(len(self.indices))]
        self.source = "synthetic-signal" if board_id == -1 else "recorded-signal" if board_id == -3 else "eeg-hardware"
        self.device = f"BrainFlow board {self.descriptor}" + (" playback" if board_id == -3 else "")
        self.frames = deque(maxlen=max(2048, self.rate*60))
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.error = None
        self.thread = None

    def start(self):
        self.board.prepare_session()
        if self.source == "recorded-signal":
            self.board.config_board("loopback_false")
        self.board.start_stream()
        self.thread = threading.Thread(target=self._poll, daemon=True)
        self.thread.start()

    def _poll(self):
        while not self.stop.wait(.04):
            try:
                data = self.board.get_board_data()
                rows = [{"timestamp": float(data[self.timestamp_channel, i]),
                         "channels": [float(data[c, i]) for c in self.indices]}
                        for i in range(data.shape[1])]
                rows = [r for r in rows if math.isfinite(r["timestamp"]) and all(math.isfinite(v) for v in r["channels"])]
                with self.lock:
                    self.frames.extend(rows)
            except Exception as exc:
                self.error = type(exc).__name__
                self.stop.set()

    def packet(self, since=0):
        if self.error:
            raise RuntimeError("Acquisition stopped: " + self.error)
        with self.lock:
            frames = [r for r in self.frames if r["timestamp"] > since][:2048]
        return {"schema": "observatory-stream/1", "source": self.source,
                "device": self.device, "unit": "uV", "sampleRate": self.rate,
                "channels": self.channels, "frames": frames}

    def close(self):
        self.stop.set()
        if self.thread:
            self.thread.join(timeout=2)
        if self.board.is_prepared():
            try:
                self.board.stop_stream()
            finally:
                self.board.release_session()


def make_server(acquisition, token, origins, port=8768):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Do not log session headers or captured signals.

        def allowed(self):
            origin = self.headers.get("Origin")
            return origin is None or origin in origins

        def answer(self, code, payload):
            body = json.dumps(payload, allow_nan=False).encode()
            self.send_response(code)
            origin = self.headers.get("Origin")
            if origin in origins:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            if not self.allowed():
                return self.answer(403, {"error": "Origin not allowed"})
            self.send_response(204)
            origin = self.headers.get("Origin")
            if origin in origins:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.end_headers()

        def do_GET(self):
            if not self.allowed():
                return self.answer(403, {"error": "Origin not allowed"})
            if not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + token):
                return self.answer(401, {"error": "Session token required"})
            parsed = urlparse(self.path)
            if parsed.path != "/v1/samples":
                return self.answer(404, {"error": "Unknown endpoint"})
            try:
                since = float(parse_qs(parsed.query).get("since", ["0"])[0])
                if not math.isfinite(since) or since < 0:
                    raise ValueError("Invalid timestamp")
            except ValueError:
                return self.answer(400, {"error": "Invalid timestamp"})
            try:
                self.answer(200, acquisition.packet(since))
            except RuntimeError:
                self.answer(503, {"error": "Acquisition is unavailable"})

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--board-id", type=int, default=-1)
    parser.add_argument("--serial-port", default="")
    parser.add_argument("--file", default="", help="BrainFlow playback file, not browser JSON")
    parser.add_argument("--master-board", type=int, default=-1)
    parser.add_argument("--enable-hardware", action="store_true")
    parser.add_argument("--port", type=int, default=8768)
    parser.add_argument("--allow-origin", action="append", default=[])
    args = parser.parse_args()
    if args.board_id not in (-1, -3) and not args.enable_hardware:
        parser.error("Hardware acquisition requires --enable-hardware and a connected device.")
    if args.board_id == -3 and not args.file:
        parser.error("Playback requires --file and the recording's --master-board.")
    origins = {"http://localhost:3000", "http://127.0.0.1:3000", *args.allow_origin}
    for origin in origins:
        p = urlparse(origin)
        if p.scheme not in ("http", "https") or not p.netloc or p.path or p.query or p.fragment:
            parser.error("Allowed origins must be exact origins without path or wildcard.")
    token = os.environ.get("OBSERVATORY_BRIDGE_TOKEN") or secrets.token_urlsafe(32)
    acquisition = Acquisition(args.board_id, args.serial_port, args.file, args.master_board)
    server = None
    try:
        acquisition.start()
        server = make_server(acquisition, token, origins, args.port)
        print(f"Local adapter: http://127.0.0.1:{args.port}", flush=True)
        print(f"Source: {acquisition.source}; {acquisition.rate} Hz", flush=True)
        print(f"Session token (paste into Instrument Dock): {token}", flush=True)
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if server:
            server.server_close()
        acquisition.close()


if __name__ == "__main__":
    main()
