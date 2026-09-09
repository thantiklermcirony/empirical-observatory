import json
import math
import secrets
import threading
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from brainflow_bridge import Acquisition, make_server
from quantum_beacon import reference, run_aer


class Adapters(unittest.TestCase):
    def test_quantum_cross_library_reference(self):
        path = Path(__file__).resolve().parents[1] / "public/research/quantum-reference.json"
        js = json.loads(path.read_text())["rows"]
        for a, b in zip(reference(), js, strict=True):
            self.assertEqual((a["state"], a["basis"]), (b["state"], b["basis"]))
            self.assertAlmostEqual(a["ideal"], b["ideal"], places=12)
            self.assertAlmostEqual(.88*a["ideal"]+.06, b["depolarised"], places=12)

    def test_aer_eigenstates_and_seed(self):
        self.assertEqual(run_aer("+i", "Y", 128)["plus"], 128)
        self.assertEqual(run_aer("-", "X", 128)["plus"], 0)
        self.assertEqual(run_aer("0", "X", 128), run_aer("0", "X", 128))

    def test_real_brainflow_sdk_and_http_boundaries(self):
        a = Acquisition()
        server = None
        token = secrets.token_urlsafe(32)
        try:
            a.start()
            deadline = time.monotonic()+5
            while not a.packet()["frames"] and time.monotonic() < deadline:
                time.sleep(.05)
            packet = a.packet()
            self.assertEqual(packet["source"], "synthetic-signal")
            self.assertGreater(len(packet["frames"]), 0)
            self.assertTrue(all(math.isfinite(x) for f in packet["frames"] for x in f["channels"]))
            server = make_server(a, token, {"http://localhost:3000"}, port=0)
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            url = f"http://127.0.0.1:{server.server_port}/v1/samples"
            def get(headers=None, suffix=""):
                return urlopen(Request(url+suffix, headers=headers or {}), timeout=5)
            with self.assertRaises(HTTPError) as rejected:
                get()
            self.assertEqual(rejected.exception.code, 401)
            with self.assertRaises(HTTPError) as rejected:
                get({"Authorization": "Bearer "+token, "Origin": "https://untrusted.example"})
            self.assertEqual(rejected.exception.code, 403)
            with get({"Authorization": "Bearer "+token, "Origin": "http://localhost:3000"}) as response:
                self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://localhost:3000")
                data = json.load(response)
                self.assertEqual(data["schema"], "observatory-stream/1")
                self.assertGreater(len(data["frames"]), 0)
            with self.assertRaises(HTTPError) as rejected:
                get({"Authorization": "Bearer "+token}, "?since=nan")
            self.assertEqual(rejected.exception.code, 400)
        finally:
            if server:
                server.shutdown()
                server.server_close()
            a.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
