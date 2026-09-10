# Active Context

**Which earlier checks still apply, and what should your coding agent rerun?**

Active Context is a small local Python tool that records real command results, compares declared inputs with their current state, and returns an evidence-linked recheck plan. It keeps failed attempts, explains why an old pass cannot be reused, and accounts for prerequisite checks. It needs Python 3.12+ and no third-party packages.

This first release implements explicit dependency checking. It does not automatically discover every dependency, prove a patch correct, improve an LLM, or replace a build system. Existing content/dependency invalidation is the principal comparison. Benchmark results accompany the release, including any tie or loss.

## Try the real local demo

From this directory:

```sh
python demo.py --output demo-result.json
```

The demo creates a disposable project, executes a passing assertion, edits documentation, breaks the code, records the failed recheck, and checks a repair. Its JSON replay distinguishes these six states. It does not modify another repository and is a demonstration rather than a benchmark.

## Use your own check

Create a configuration outside the paths you watch:

```json
{
  "schema_version": 1,
  "checks": [{
    "id": "parser-tests",
    "claims": ["parser-regressions"],
    "argv": ["{python}", "-m", "unittest", "discover", "-s", "tests"],
    "scopes": ["src", "tests", "pyproject.toml"],
    "env": [],
    "depends_on": [],
    "cost": 1
  }]
}
```

Replace the command and scopes with your actual check. Claims are labels for explicit check obligations: declaring that an import smoke test covers an entire regression suite does not make that true. Put the ledger outside every watched scope. `{python}` uses the interpreter running Active Context; specify your project's interpreter explicitly if it differs.

```sh
python -m active_context run --repo /path/to/project --config checks.json --ledger receipts.jsonl --check parser-tests
python -m active_context inspect --repo /path/to/project --config checks.json --ledger receipts.jsonl
python -m active_context plan --repo /path/to/project --config checks.json --ledger receipts.jsonl --claim parser-regressions --budget 1
python -m active_context verify --ledger receipts.jsonl
```

Run these from this package directory, or add it to your module path. Commands are argument arrays, run without a shell. `inspect` and `plan` never execute configured checks. A plan's `complete` means its proposed coverage is complete, not that its commands have passed; see `execution_required`. Unknown claims and insufficient budgets appear as uncovered obligations.

For an agent, supply the inspection/plan JSON as a tool result. Do not let a natural-language summary replace the recorded result. The separate optional read-only MCP adapter exposes inspection/planning with repository, configuration and ledger fixed at launch; its protocol version and tests are documented with the adapter.

### Read-only MCP connection

Use absolute paths in your client's stdio server configuration (its enclosing configuration format may differ):

```json
{
  "command": "/absolute/path/to/python",
  "args": ["-B", "/absolute/path/to/active-context/serve.py", "--repo", "/absolute/project", "--config", "/absolute/checks.json", "--ledger", "/absolute/receipts.jsonl"]
}
```

On Windows use your Python executable and JSON-escaped paths or forward slashes. `serve.py` needs no installation or module-path change. `tool.py` similarly provides an absolute-path CLI entry point. MCP exposes only `inspect_context` and `plan_checks`; it has no execution tool. The configuration bytes are bound at startup; restart the server after changing them.

The adapter explicitly supports MCP **2025-11-25** initialization, tested with an actual stdio test client. The newer 2026-07-28 protocol is not implemented; modern-only clients are unsupported. No named client is certified. Inspection/planning is synchronous, so a cancellation notification cannot interrupt an in-progress operation; clients should enforce process timeouts. See [the adapter's protocol sources and limits](active_context/mcp.py).

## What the receipts cover

- File bytes, executable bits and directory membership within declared scopes, including missing paths that later appear.
- Exact command definition, repository identity, executable file identity, observer Python version/platform, and watched environment values. Missing and empty environment values differ.
- Before and after execution snapshots, exit code, timeout, elapsed command time, bounded output excerpts and full output hashes.
- Explicit prerequisite receipt identities. A newer attempt, including failure, supersedes the earlier attempt for that check ID.
- A local hash chain, validated before reuse. Corrupt/truncated ledgers fail closed.

The planner exactly searches up to 20 checks for the lowest declared-cost coverage within a budget, including prerequisite closure. These cost units are user estimates, exclude inspection overhead, and are not measured savings or learned values of information.

## Boundaries that matter

Installed package contents, services, undeclared environment variables and files outside scopes remain unknown. Add stable dependency/lock files and relevant inputs to the contract, and rerun when the declared coverage is inadequate. Lockfile equality alone does not establish that an installed environment matches it. No static expiry rule detects an unobserved world change.

Before/after snapshots cannot detect a change-and-revert during execution or provide an atomic filesystem snapshot. Background processes and remote side effects are outside this tool's control. Timeouts stop the direct command, not necessarily all descendants. Explicit `run` executes the caller's command with that caller's privileges; this is not a sandbox.

The tool rejects symlinks/junctions in watched inputs, ignores `.git` and `__pycache__`, and limits snapshots to 50,000 entries/250 MB. Bytecode caches are ignored to avoid self-invalidating Python runs; use source-based checks and do not treat untrusted/stale cache files as covered. Avoid watching generated outputs that the command itself modifies; unstable inputs make a result inapplicable.

Receipts are local and may contain paths, command arguments and output. Environment values are hashed, not encrypted; low-entropy values can still be guessed. Do not publish a private ledger automatically. Hashes detect ordinary edits but cannot authenticate execution, identify a malicious writer who rewrites the whole chain, or prove public issuance time.

## Validation and participation

The first frozen diagnostic is complete: **30/30 correct decisions and 25 continuation checks**, exactly matching conventional content/dependency invalidation. Total measured time was 31.977 seconds versus 30.381 seconds for that baseline in one run. The predeclared superiority gate failed. Read [the complete result](benchmark/RESULTS.md); this is not an AI benchmark or evidence of a new algorithmic advantage.

The tool archive contains source, tests, frozen methods, original input archives and the aggregate result. The separate [complete evidence archive](https://empirical-observatory.madmanmuzza.chatgpt.site/research/Active_Context_Evidence.zip) is self-contained and also retains all 120 decisions, failures, oracle records and copied source fixtures. See [release and reproduction instructions](RELEASE.md).

```sh
python -m unittest discover -s tests -v
python -m unittest discover -s review -p 'test_*.py' -v
```

The benchmark uses constructed continuation cases with pinned, permissively licensed real library source. It does not fix defects in those libraries, train a state-discovery model, or measure an AI agent. Read the frozen protocol and all results before interpreting any cost comparison.

The first useful contribution is a reproducible case where an earlier check is incorrectly reused, a relevant dependency is missed, or rechecking is unnecessarily expensive. Include a minimal configuration, public fixture and expected behavior; omit secrets and private project output. Native client integrations need their own version-specific checks and upstream contribution approval where required.

Uninstall by removing the extracted tool directory and its MCP client entry. Keep or remove your separately located ledger deliberately; this tool creates no service, global package, account or scheduled job.

Part of the [Empirical Observatory](https://github.com/thantiklermcirony/empirical-observatory). The tool can be used independently of the programme's wider scientific claims.
