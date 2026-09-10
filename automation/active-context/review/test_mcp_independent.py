"""Independent bounded MCP wire/binding checks; standard library only."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from active_context.mcp import Server


def request(method, id, params=None):
    value = {"jsonrpc": "2.0", "id": id, "method": method}
    if params is not None:
        value["params"] = params
    return value


def initialize(id=1, version="2025-11-25"):
    return request("initialize", id, {"protocolVersion": version, "capabilities": {}, "clientInfo": {"name": "independent-review", "version": "1"}})


READY = {"jsonrpc": "2.0", "method": "notifications/initialized"}


class IndependentMCP(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="mcp-independent-", dir=Path(__file__).resolve().parent)
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.repo = self.folder / "repo"
        self.repo.mkdir()
        (self.repo / "check.py").write_text("from pathlib import Path\nPath('SHOULD_NOT_EXIST').write_text('executed')\n", encoding="utf-8")
        self.config = {"schema_version": 1, "checks": [{"id": "test", "claims": ["one"], "argv": ["{python}", "check.py"], "scopes": ["check.py"], "cost": 1}]}
        self.config_path = self.folder / "checks.json"
        self.config_path.write_text(json.dumps(self.config), encoding="utf-8")
        self.ledger = self.folder / "receipts.jsonl"

    def wire(self, messages, raw_prefix=b""):
        data = raw_prefix + b"".join(json.dumps(m, ensure_ascii=True).encode("utf-8") + b"\n" for m in messages)
        command = [sys.executable, "-B", "-m", "active_context.mcp", "--repo", str(self.repo), "--config", str(self.config_path), "--ledger", str(self.ledger)]
        result = subprocess.run(command, input=data, cwd=ROOT, capture_output=True, timeout=15, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        self.assertEqual(result.returncode, 0, result.stderr.decode(errors="replace"))
        self.assertEqual(result.stderr, b"")
        return [json.loads(line) for line in result.stdout.splitlines()]

    def server(self):
        server = Server(self.repo, self.config_path, self.ledger)
        server.handle(initialize())
        server.handle(READY)
        return server

    def assert_no_execution(self):
        self.assertFalse((self.repo / "SHOULD_NOT_EXIST").exists())
        self.assertFalse(self.ledger.exists())
        self.assertFalse(self.ledger.with_name(self.ledger.name + ".lock").exists())

    def test_readable_id_survives_invalid_jsonrpc_version(self):
        response = self.wire([{"jsonrpc": "wrong", "id": 41, "method": "ping"}])[0]
        self.assertEqual(response["error"]["code"], -32600)
        self.assertEqual(response.get("id"), 41)

    def test_readable_id_survives_invalid_method_type(self):
        response = self.wire([{"jsonrpc": "2.0", "id": "known-42", "method": False}])[0]
        self.assertEqual(response["error"]["code"], -32600)
        self.assertEqual(response.get("id"), "known-42")

    def test_unparseable_input_then_valid_legacy_handshake(self):
        responses = self.wire([initialize(), READY, request("ping", 2)], raw_prefix=b"not-json\n")
        self.assertEqual(responses[0]["error"]["code"], -32700)
        # MCP's declared revision permits an omitted ID when no ID is readable.
        self.assertNotIn("result", responses[0])
        self.assertEqual(responses[1]["result"]["protocolVersion"], "2025-11-25")
        self.assertEqual(responses[2], {"jsonrpc": "2.0", "id": 2, "result": {}})

    def test_unknown_revision_fallback_never_advertises_modern_support(self):
        responses = self.wire([
            request("server/discover", 1, {"_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28"}}),
            initialize(2, "2026-07-28"),
            request("tools/list", 3), READY, request("tools/list", 4),
        ])
        self.assertEqual(responses[0]["error"]["code"], -32601)
        self.assertEqual(responses[1]["result"]["protocolVersion"], "2025-11-25")
        self.assertIn("error", responses[2])
        self.assertEqual({tool["name"] for tool in responses[3]["result"]["tools"]}, {"inspect_context", "plan_checks"})
        self.assert_no_execution()

    def test_planning_and_command_notifications_never_execute(self):
        response = self.wire([
            initialize(), READY,
            {"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "run_check", "arguments": {"check": "test"}}},
            request("tools/call", 2, {"name": "plan_checks", "arguments": {"claims": ["one"], "budget": 1}}),
            request("tools/call", 3, {"name": "run_check", "arguments": {"check": "test"}}),
        ])
        self.assertEqual(len(response), 3)
        planned = response[1]["result"]["structuredContent"]
        self.assertTrue(planned["complete"])
        self.assertEqual(planned["selected_checks"], ["test"])
        self.assertEqual(response[2]["error"]["code"], -32602)
        self.assert_no_execution()

    def test_caller_paths_are_tool_errors_and_never_change_binding(self):
        responses = self.wire([
            initialize(), READY,
            request("tools/call", 2, {"name": "inspect_context", "arguments": {"repo": str(self.folder), "ledger": "other"}}),
            request("tools/call", 3, {"name": "plan_checks", "arguments": {"claims": ["one"], "argv": ["anything"]}}),
            request("tools/call", 4, {"name": "inspect_context"}),
        ])
        self.assertTrue(responses[1]["result"]["isError"])
        self.assertTrue(responses[2]["result"]["isError"])
        self.assertFalse(responses[3]["result"]["isError"])
        self.assertEqual(set(responses[3]["result"]["structuredContent"]["checks"]), {"test"})
        self.assert_no_execution()

    def test_config_edits_cannot_replace_launch_contract(self):
        server = self.server()
        self.config["checks"][0]["claims"] = ["stronger-claim"]
        self.config_path.write_text(json.dumps(self.config), encoding="utf-8")
        result = server.handle(request("tools/call", 2, {"name": "plan_checks", "arguments": {"claims": ["stronger-claim"]}}))["result"]
        self.assertTrue(result["isError"])
        self.assertIn("restart", result["structuredContent"]["error"])
        self.assert_no_execution()

    def test_corrupt_ledger_is_not_repaired_or_ignored(self):
        self.ledger.write_bytes(b"{malformed\n")
        before = hashlib.sha256(self.ledger.read_bytes()).hexdigest()
        responses = self.wire([initialize(), READY, request("tools/call", 2, {"name": "inspect_context"})])
        self.assertTrue(responses[1]["result"]["isError"])
        self.assertEqual(hashlib.sha256(self.ledger.read_bytes()).hexdigest(), before)
        self.assertFalse((self.repo / "SHOULD_NOT_EXIST").exists())

    def test_budget_error_uses_tool_error_but_bad_call_envelope_uses_protocol_error(self):
        responses = self.wire([
            initialize(), READY,
            request("tools/call", 2, {"name": "plan_checks", "arguments": {"claims": ["one"], "budget": True}}),
            request("tools/call", 3, {"name": "plan_checks", "arguments": []}),
        ])
        self.assertTrue(responses[1]["result"]["isError"])
        self.assertNotIn("error", responses[1])
        self.assertEqual(responses[2]["error"]["code"], -32602)
        self.assertNotIn("result", responses[2])


if __name__ == "__main__":
    unittest.main()
