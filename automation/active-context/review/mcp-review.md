# Independent MCP adapter review

10 September 2026. Bounded same-team AI review of `active_context/mcp.py`, using current primary protocol documents and additional tests owned by the reviewer. No production edits, external posts or Site operations.

## Initial actionable finding

`Server.handle()` validates `jsonrpc` and the method type before capturing a readable request ID. Consequently, `{"jsonrpc":"wrong","id":41,"method":"ping"}` returns `-32600` without `id:41`; a request with a string ID and boolean method similarly loses its ID. Capture a valid string/integer ID before envelope validation so the client can correlate the error. Keep invalid/unreadable IDs absent.

This is supported by the declared revision's requirement to match an error to its request ID except where that ID cannot be read. The MCP error schema deliberately allows an omitted ID in that exceptional case; automatically replacing all such omissions with JSON-RPC's generic `null` convention would be an unnecessary protocol change. [MCP 2025-11-25 base protocol](https://modelcontextprotocol.io/specification/2025-11-25/basic).

The initial independent run had **7 passing tests and 2 failing tests**, both reproducing that one correlation defect over actual stdio subprocesses. Test source: `review/test_mcp_independent.py`.

## Other reviewed behaviour

The caller cannot supply replacement repository, configuration, ledger or argv fields through either tool. A changed launch configuration produces an error rather than adopting new claims. Tool calls and notifications do not expose command execution; a sentinel-writing configured command remained unexecuted. The tests also verified that corrupt ledger bytes stay unchanged rather than being repaired or ignored.

The server separates malformed call envelopes/unknown methods from tool-level input or evidence errors. The latter are visible through `isError: true`, while successful structured data is also serialized into the text content block. These choices agree with the declared revision's tool-result and error conventions. [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

Initialization correctly replies with its supported `2025-11-25` revision when the requested revision is unsupported, and tools remain unavailable until the initialized notification. The client is responsible for disconnecting if it cannot support that returned version. [MCP lifecycle and negotiation](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle).

The newer `2026-07-28` protocol is a separate capability: its stateless metadata/discovery mechanism is not implemented here. Returning method-not-found for discovery permits a compatible client to attempt its legacy fallback; it does not certify any particular client. The current official TypeScript SDK documentation distinguishes legacy, automatic fallback and modern-only modes. [Official MCP release](https://blog.modelcontextprotocol.io/posts/2026-07-28/) · [SDK protocol modes](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions).

## Boundaries

The launch binding is a local read-only interface, not a filesystem sandbox or immutable operating-system snapshot. Configured inputs and receipts may legitimately change outside the process; the adapter inspects those changes under the frozen configuration. It cannot prevent another process from replacing files during a read. Cancellation cannot interrupt synchronous core work, and clients need process timeouts. Use the documented `-B`/absolute wrapper launch to suppress bytecode writes as well as application writes.

Neither protocol conformance checks nor a read-only annotation establish agent decision quality, general applicability of a recorded check, interoperability with a named client or support for the newest protocol. `complete` in a plan still means proposed coverage, not completed successful execution.

## Reproduction

From the package root, using only the standard library:

```sh
python -B -m unittest discover -s review -p test_mcp_independent.py -v
```

The tests use disposable projects under `review/`, bound real stdio subprocesses and direct public server calls for a live configuration edit. They write no production source and execute no configured check.

## Final verification after correction

The author fixed readable-ID preservation before envelope validation. The final independent run passed **9/9 tests** on Windows / Python 3.12.14. The MCP adapter hash was identical before and after execution: `ebab65afb5e9d472af7b1152b35392a6fd8a7f8cfe142b56dba5f853bc0954f7`. No remaining blocker was found for the declared read-only legacy-protocol adapter; the scope and interoperability limits above still apply.

Final independent transcript:

```text
test_budget_error_uses_tool_error_but_bad_call_envelope_uses_protocol_error (test_mcp_independent.IndependentMCP.test_budget_error_uses_tool_error_but_bad_call_envelope_uses_protocol_error) ... ok
test_caller_paths_are_tool_errors_and_never_change_binding (test_mcp_independent.IndependentMCP.test_caller_paths_are_tool_errors_and_never_change_binding) ... ok
test_config_edits_cannot_replace_launch_contract (test_mcp_independent.IndependentMCP.test_config_edits_cannot_replace_launch_contract) ... ok
test_corrupt_ledger_is_not_repaired_or_ignored (test_mcp_independent.IndependentMCP.test_corrupt_ledger_is_not_repaired_or_ignored) ... ok
test_planning_and_command_notifications_never_execute (test_mcp_independent.IndependentMCP.test_planning_and_command_notifications_never_execute) ... ok
test_readable_id_survives_invalid_jsonrpc_version (test_mcp_independent.IndependentMCP.test_readable_id_survives_invalid_jsonrpc_version) ... ok
test_readable_id_survives_invalid_method_type (test_mcp_independent.IndependentMCP.test_readable_id_survives_invalid_method_type) ... ok
test_unknown_revision_fallback_never_advertises_modern_support (test_mcp_independent.IndependentMCP.test_unknown_revision_fallback_never_advertises_modern_support) ... ok
test_unparseable_input_then_valid_legacy_handshake (test_mcp_independent.IndependentMCP.test_unparseable_input_then_valid_legacy_handshake) ... ok

----------------------------------------------------------------------
Ran 9 tests in 1.183s

OK
```
