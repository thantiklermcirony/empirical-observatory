"""Real stdio subprocess checks; no named MCP client interoperability claim.

Run from the package root: python -B -m unittest discover -s tests -p test_mcp.py -v
The receipt-reuse test explicitly seeds one command through the normal CLI, then
proves MCP inspection/planning never reruns it or changes the ledger.
"""
from __future__ import annotations

import io
import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import tempfile
import threading
import unittest

from active_context import mcp

PACKAGE_ROOT = Path(__file__).resolve().parents[1]


class Client:
    def __init__(self, test, config=None):
        self.test = test
        self.process = subprocess.Popen(
            [sys.executable, "-B", "-m", "active_context.mcp", "--repo", str(test.repo),
             "--config", str(config or test.config_path), "--ledger", str(test.ledger)],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            cwd=PACKAGE_ROOT, env=test.env, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        self.lines = queue.Queue()
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()
        self.next_id = 1

    def _read(self):
        for line in iter(self.process.stdout.readline, b""):
            self.lines.put(line)
        self.lines.put(None)

    def send(self, value):
        self.send_raw(json.dumps(value, ensure_ascii=True).encode("utf-8") + b"\n")

    def send_raw(self, raw):
        self.process.stdin.write(raw)
        self.process.stdin.flush()

    def receive(self):
        line = self.lines.get(timeout=10)
        if line is None:
            raise AssertionError("Server exited before a response")
        self.test.assertLessEqual(len(line), mcp.MAX_RESPONSE_BYTES)
        return json.loads(line)

    def request(self, method, params=None):
        request_id = self.next_id
        self.next_id += 1
        request = {"jsonrpc": "2.0", "id": request_id, "method": method}
        if params is not None:
            request["params"] = params
        self.send(request)
        response = self.receive()
        self.test.assertEqual(response.get("id"), request_id)
        return response

    def initialize(self, version=mcp.PROTOCOL_VERSION):
        result = self.request("initialize", {"protocolVersion": version,
                              "capabilities": {}, "clientInfo": {"name": "stdio-test", "version": "1"}})
        self.test.assertEqual(result["result"]["protocolVersion"], mcp.PROTOCOL_VERSION)
        self.send({"jsonrpc": "2.0", "method": "notifications/initialized"})
        return result

    def call(self, name, arguments=None):
        return self.request("tools/call", {"name": name, "arguments": arguments or {}})

    def close(self):
        try:
            self.process.stdin.close()
        except BrokenPipeError:
            pass
        try:
            self.process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)
            raise AssertionError("Server did not exit after stdin closed")
        finally:
            self.reader.join(timeout=2)
            self.process.stdout.close()
            self.stderr = self.process.stderr.read().decode("utf-8", errors="replace")
            self.process.stderr.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


class MCPTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="active-context-mcp-test-")
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.script = self.repo / "check.py"
        self.script.write_text("from pathlib import Path\np=Path('EXECUTED')\np.write_text(p.read_text()+'x' if p.exists() else 'x')\n", encoding="utf-8")
        self.config_path = self.root / "checks.json"
        self.config = {"schema_version": 1, "checks": [
            {"id": "unit", "claims": ["parser-behavior"], "argv": ["{python}", "check.py"],
             "scopes": ["check.py"], "env": [], "depends_on": [], "cost": 2.0},
            {"id": "full", "claims": ["parser-behavior", "integration"], "argv": ["{python}", "check.py"],
             "scopes": ["check.py"], "env": [], "depends_on": ["unit"], "cost": 5.0},
        ]}
        self.config_path.write_text(json.dumps(self.config), encoding="utf-8")
        self.ledger = self.root / "receipts.jsonl"
        self.env = dict(os.environ)
        self.env["PYTHONPATH"] = str(PACKAGE_ROOT)
        self.env["PYTHONDONTWRITEBYTECODE"] = "1"

    def tearDown(self):
        self.temporary.cleanup()

    def assert_no_execution(self):
        self.assertFalse((self.repo / "EXECUTED").exists())
        self.assertFalse(self.ledger.exists())
        self.assertFalse(self.ledger.with_name(self.ledger.name + ".lock").exists())

    def test_handshake_list_inspect_plan_and_no_execution(self):
        with Client(self) as client:
            init = client.initialize()
            self.assertEqual(init["result"]["capabilities"], {"tools": {"listChanged": False}})
            listing = client.request("tools/list")["result"]
            self.assertEqual([t["name"] for t in listing["tools"]], ["inspect_context", "plan_checks"])
            self.assertTrue(all(t["annotations"]["readOnlyHint"] for t in listing["tools"]))
            self.assertNotIn("nextCursor", listing)
            inspected = client.call("inspect_context")["result"]
            self.assertFalse(inspected["isError"])
            self.assertEqual(inspected["structuredContent"], json.loads(inspected["content"][0]["text"]))
            self.assertEqual(inspected["structuredContent"]["checks"]["unit"]["status"], "missing")
            plan = client.call("plan_checks", {"claims": ["integration"], "budget": 7})["result"]["structuredContent"]
            self.assertEqual(plan["selected_checks"], ["unit", "full"])
            self.assertEqual(plan["estimated_cost"], 7)
            self.assertTrue(plan["complete"])
            constrained = client.call("plan_checks", {"claims": ["integration"], "budget": 1})["result"]["structuredContent"]
            self.assertFalse(constrained["complete"])
            self.assertEqual(constrained["uncovered_claims"], ["integration"])
            self.assert_no_execution()
        self.assertEqual(client.process.returncode, 0)
        self.assertEqual(client.stderr, "")

    def test_modern_probe_legacy_fallback_and_lifecycle(self):
        with Client(self) as client:
            self.assertEqual(client.request("server/discover", {"_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28"}})["error"]["code"], -32601)
            self.assertIn("error", client.request("tools/list"))
            self.assertEqual(client.request("ping")["result"], {})
            self.assertEqual(client.request("initialize", {"protocolVersion": "2026-07-28", "capabilities": {}, "clientInfo": {"name": "test", "version": "1"}})["result"]["protocolVersion"], "2025-11-25")
            self.assertIn("error", client.request("tools/list"))
            client.send({"jsonrpc": "2.0", "method": "notifications/initialized"})
            self.assertIn("tools", client.request("tools/list")["result"])
            self.assertIn("error", client.request("initialize", {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "test", "version": "1"}}))

    def test_notifications_are_silent_and_never_call_tools(self):
        with Client(self) as client:
            client.initialize()
            for method in ("notifications/cancelled", "notifications/roots/list_changed", "unknown_notification", "tools/call"):
                client.send({"jsonrpc": "2.0", "method": method, "params": {"name": "plan_checks", "arguments": {"claims": ["integration"]}}})
            self.assertEqual(client.request("ping")["result"], {})
            self.assert_no_execution()

    def test_unknown_execution_tools_and_path_injection_rejected(self):
        with Client(self) as client:
            client.initialize()
            for name in ("run", "run_check", "execute_command"):
                self.assertEqual(client.call(name)["error"]["code"], -32602)
            for args in ({"repo": str(self.root)}, {"ledger": "elsewhere"}, {"config": {}}, {"argv": ["danger"]}):
                result = client.call("inspect_context", args)["result"]
                self.assertTrue(result["isError"])
                result = client.call("plan_checks", {"claims": ["parser-behavior"], **args})["result"]
                self.assertTrue(result["isError"])
            self.assert_no_execution()

    def test_invalid_tool_arguments_and_cursor(self):
        with Client(self) as client:
            client.initialize()
            bad_arguments = [{}, {"claims": []}, {"claims": "x"}, {"claims": ["x", "x"]},
                             {"claims": [5]}, {"claims": ["x" * 257]},
                             {"claims": [str(i) for i in range(101)]},
                             {"claims": ["x"], "budget": -1}, {"claims": ["x"], "budget": True},
                             {"claims": ["x"], "budget": None}, {"claims": ["x"], "budget": "1"},
                             {"claims": ["x"], "budget": 10 ** 400}]
            for arguments in bad_arguments:
                with self.subTest(arguments=arguments):
                    self.assertTrue(client.call("plan_checks", arguments)["result"]["isError"])
            self.assertEqual(client.request("tools/list", {"cursor": "made-up"})["error"]["code"], -32602)
            self.assertEqual(client.request("tools/call", {"name": "inspect_context", "arguments": []})["error"]["code"], -32602)
            unknown = client.call("plan_checks", {"claims": ["unconfigured"]})["result"]
            self.assertFalse(unknown["isError"])
            self.assertFalse(unknown["structuredContent"]["complete"])
            self.assert_no_execution()

    def test_malformed_json_recovers_without_stdout_noise(self):
        with Client(self) as client:
            for raw in (b"not json\n", b"\xff\n", b'{"id":1,"id":2}\n',
                        b'{"n":NaN}\n', b'{"n":1e999}\n', b'{"s":"\\ud800"}\n',
                        b"[" * 40 + b"0" + b"]" * 40 + b"\n"):
                client.send_raw(raw)
                response = client.receive()
                self.assertEqual(response["error"]["code"], -32700)
                self.assertNotIn("id", response)
            client.initialize()
            self.assertEqual(client.request("ping")["result"], {})

    def test_invalid_envelopes_and_reused_ids(self):
        with Client(self) as client:
            for request in ([], None, {"jsonrpc": "2.0", "id": None, "method": "ping"},
                            {"jsonrpc": "2.0", "id": True, "method": "ping"},
                            {"jsonrpc": "2.0", "id": 1.5, "method": "ping"},
                            {"jsonrpc": "2.0", "id": 3, "result": {}}):
                client.send(request)
                self.assertEqual(client.receive()["error"]["code"], -32600)
            request = {"jsonrpc": "2.0", "id": "same", "method": "ping"}
            client.send(request)
            self.assertEqual(client.receive()["result"], {})
            client.send(request)
            self.assertEqual(client.receive()["error"]["code"], -32600)

    def test_malformed_envelopes_preserve_readable_request_ids(self):
        with Client(self) as client:
            for request in (
                {"jsonrpc": "wrong", "id": 41, "method": "ping"},
                {"jsonrpc": "2.0", "id": 42, "method": False},
                {"jsonrpc": "wrong", "id": "bad-version", "method": "ping"},
                {"jsonrpc": "2.0", "id": "missing-method"},
                {"jsonrpc": "2.0", "id": 0, "method": None},
                {"jsonrpc": "2.0", "id": "", "method": []},
            ):
                with self.subTest(request=request):
                    client.send(request)
                    response = client.receive()
                    self.assertEqual(response["error"]["code"], -32600)
                    self.assertEqual(response.get("id"), request["id"])
            self.assert_no_execution()

    def test_oversized_and_incomplete_frames_close_cleanly(self):
        for raw in (b"x" * (mcp.MAX_MESSAGE_BYTES + 1), b'{"jsonrpc":"2.0"}'):
            with self.subTest(length=len(raw)):
                with Client(self) as client:
                    client.send_raw(raw)
                    if len(raw) < mcp.MAX_MESSAGE_BYTES:
                        client.process.stdin.close()
                    self.assertEqual(client.receive()["error"]["code"], -32700)
                self.assertEqual(client.process.returncode, 2)

    def test_changed_configuration_fails_closed_until_restart(self):
        with Client(self) as client:
            client.initialize()
            self.config_path.write_text(json.dumps(self.config) + " ", encoding="utf-8")
            result = client.call("inspect_context")["result"]
            self.assertTrue(result["isError"])
            self.assertIn("restart", result["structuredContent"]["error"])
            self.assert_no_execution()

    def test_corrupt_ledger_returns_tool_error_without_changing_it(self):
        self.ledger.write_bytes(b'{"not":"a receipt"}\n')
        before = self.ledger.read_bytes()
        with Client(self) as client:
            client.initialize()
            self.assertTrue(client.call("inspect_context")["result"]["isError"])
            self.assertTrue(client.call("plan_checks", {"claims": ["parser-behavior"]})["result"]["isError"])
        self.assertEqual(self.ledger.read_bytes(), before)
        self.assertFalse((self.repo / "EXECUTED").exists())

    def test_recorded_receipt_reuse_and_changed_file_never_execute(self):
        seeded = subprocess.run(
            [sys.executable, "-B", "-m", "active_context", "run", "--repo", str(self.repo),
             "--config", str(self.config_path), "--ledger", str(self.ledger), "--check", "unit"],
            cwd=PACKAGE_ROOT, env=self.env, capture_output=True, timeout=20,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        self.assertEqual(seeded.returncode, 0, seeded.stderr.decode())
        self.assertEqual((self.repo / "EXECUTED").read_text(), "x")
        before = self.ledger.read_bytes()
        with Client(self) as client:
            client.initialize()
            result = client.call("inspect_context")["result"]["structuredContent"]
            self.assertTrue(result["checks"]["unit"]["reusable"])
            reused = client.call("plan_checks", {"claims": ["parser-behavior"]})["result"]["structuredContent"]
            self.assertEqual(reused["selected_checks"], [])
            self.script.write_text(self.script.read_text() + "# relevant declared change\n", encoding="utf-8")
            changed = client.call("inspect_context")["result"]["structuredContent"]
            self.assertEqual(changed["checks"]["unit"]["status"], "changed")
            plan = client.call("plan_checks", {"claims": ["parser-behavior"]})["result"]["structuredContent"]
            self.assertEqual(plan["selected_checks"], ["unit"])
        self.assertEqual((self.repo / "EXECUTED").read_text(), "x")
        self.assertEqual(self.ledger.read_bytes(), before)

    def test_startup_error_only_uses_stderr(self):
        self.config_path.write_text("{}", encoding="utf-8")
        with Client(self) as client:
            self.assertIsNone(client.lines.get(timeout=10))
        self.assertEqual(client.process.returncode, 2)
        self.assertIn("could not start", client.stderr)

    def test_response_size_is_bounded(self):
        stream = io.BytesIO()
        mcp._write(stream, {"jsonrpc": "2.0", "id": 1, "result": {"text": "x" * mcp.MAX_RESPONSE_BYTES}})
        raw = stream.getvalue()
        self.assertLessEqual(len(raw), mcp.MAX_RESPONSE_BYTES)
        self.assertEqual(json.loads(raw)["error"]["code"], -32603)

    def test_tool_rate_limit_does_not_execute_checks_or_break_ping(self):
        with Client(self) as client:
            client.initialize()
            for _ in range(mcp.MAX_TOOL_CALLS_PER_MINUTE):
                self.assertFalse(client.call("inspect_context")["result"]["isError"])
            limited = client.call("inspect_context")["result"]
            self.assertTrue(limited["isError"])
            self.assertIn("rate limit", limited["structuredContent"]["error"])
            self.assertEqual(client.request("ping")["result"], {})
            self.assert_no_execution()


if __name__ == "__main__":
    unittest.main()
