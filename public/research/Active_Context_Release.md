# Active Context 0.1 — 10 September 2026

This release provides a local CLI and a read-only MCP 2025-11-25 adapter. It records and checks explicit evidence dependencies. Python 3.12+ is required; no installation or third-party Python package is needed. Begin with `python demo.py --output demo-result.json` from the extracted `active-context` directory.

## What was demonstrated

The frozen diagnostic contains 30 authored continuations over five real, pinned Python libraries. Active Context and conventional content/dependency invalidation both made 30 correct decisions and selected exactly the same 25 continuation checks. Active Context took 31.977 seconds including common capture, versus 30.381 seconds for conventional invalidation. The 20% superiority gate failed. All methods additionally share 95 initial/historical capture executions, charged at 20.742 seconds. The check counts in the comparison table count continuation only.

The implementation passed 4 CLI, 15 MCP, 26 independent core and 9 independent MCP tests on the original Windows/Python 3.12 environment. The benchmark has 18 additional contract tests. These are engineering checks, not independent user adoption or improved agent task success. Platform CI results are reported separately.

## Two archives

- `Active_Context_0.1.zip`: the working tool, tests, original source input archives, frozen evaluation methods, summary and reports. No complete episode tree is included. This is enough to use the tool and run a fresh reproduction.
- `Active_Context_Evidence.zip`: all of the above, plus the complete original `benchmark/results/flight01` tree. This supports read-only reconciliation without rerunning the experiment.

Both extract into `active-context/`. Use separate empty destination folders if examining both. Historical receipts retain execution paths and hashes from their original environment; they are not current receipts for your computer. A local hash chain establishes internal consistency, not authenticated execution or trusted clock time.

To verify the recorded result, extract the evidence archive and run from its `active-context` directory:

```text
python benchmark/reconcile_results.py --root . --output benchmark/RECONCILIATION-recheck.json
```

Do not pass `--check-original-mtimes` on a downloaded copy: archive extraction changes filesystem timestamps. The audit still checks recorded chronology, receipt hashes, source bytes, decisions and totals. Original filesystem-time observations are retained as historical audit records.

To reproduce independently without altering the original scored run:

```text
python benchmark/unpack_sources.py
python -m unittest discover -s benchmark -p test_diagnostic.py -v
python benchmark/preflight.py
python benchmark/run_diagnostic.py --freeze FROZEN.json --output benchmark/results/reproduction01 --authorize-frozen-run
```

Choose a new output name for another reproduction; the runner refuses to overwrite existing results. Preserve results that disagree. The frozen protocol was published before the scored run in [this commit](https://github.com/thantiklermcirony/empirical-observatory/commit/3ae0993c86511f119d6f86cbf1ccb98bf192278b). All 14 frozen files remain byte-identical. Original upstream licenses are preserved inside the acquired archives and source copies; the tool's own MIT license does not replace them.

## What success means next

The immediate target is five independent people using one real check, with median time to a useful packet under ten minutes and at least three eligible users returning on another day or task. Record setup burden, missed dependencies, unnecessary checks and full costs. These are targets, not achieved adoption metrics. See [the adoption plan](ADOPTION_PLAN.md).

Priorities are a verified client recipe, actual continuation cases and improved usability. Automatic dependency discovery, learned check selection and general scientific state discovery require separate versioned experiments. The larger programme remains available through the [Observatory](https://empirical-observatory.madmanmuzza.chatgpt.site/).
