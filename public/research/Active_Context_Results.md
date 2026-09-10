# Active Context — first frozen continuation diagnostic

**Active Context made all 30 continuation decisions correctly, but did not outperform conventional content/dependency invalidation.** Both selected the same 25 checks. Active Context took 31.977 seconds including initial evidence capture, versus 30.381 seconds for the conventional baseline: 5.26% slower in this single run. The predeclared 20% superiority gate failed.

These are 30 authored continuations over five pinned, permissively licensed Python repositories: Packaging, ItsDangerous, Boltons, Schedule and More Itertools. They execute real source and assertions, with no LLM or model API. They are an integration diagnostic, not an official upstream benchmark, discovered upstream bugs or a measure of agent task success.

## Results

| Method | Correct decisions | False verified claims | Checks executed during continuation | Continuation seconds | Total seconds including common capture |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rerun all | 30 / 30 | 0 | 90 | 22.235 | 42.977 |
| Content/dependency invalidation | 30 / 30 | 0 | 25 | 9.639 | 30.381 |
| Fixed one-hour freshness | 20 / 30 | 10 | 20 | 5.162 | 25.904 |
| Active Context | 30 / 30 | 0 | 25 | 11.235 | 31.977 |

Every method was charged the same 20.742 seconds for common initial evidence capture, including five historical failed rechecks. The separate full-rerun oracle cost 19.287 seconds and was excluded from each method's cost. No method timed out or returned an unresolved decision. All 120 policy decisions and all failures remain recorded.

Against rerunning everything, Active Context executed 72.22% fewer checks and used 25.59% less measured total time. Those are **only comparisons with rerun-all**. Conventional invalidation achieved the same check reduction with lower measured time, so these numbers do not establish a new efficiency advantage.

## What the continuations showed

Across all five packages, both Active Context and content/dependency invalidation reused checks for fresh unchanged source, old unchanged source and unrelated documentation edits. Both reran all three checks after a source regression, the primary check after an added assertion file, and the primary check after a failed recheck followed by source restoration.

Fixed freshness reused stale passing evidence for the five source regressions and five added incompatible assertions. It also reran all three checks in the five old-but-unchanged cases. Its shorter time therefore came with ten incorrect accept decisions. This diagnoses this deliberately simple age-only policy; it does not imply every memory or caching system behaves this way.

The source regressions are authored one-line mutations in disposable copies. Added assertion files intentionally propose requirements the packages do not satisfy. These are negative controls, not allegations of defects in the upstream projects. All methods used the same manually declared source, assertion, runtime/environment and prerequisite coverage. None discovered dependencies automatically.

## Freeze and independent reconciliation

The code, protocol and source package were publicly frozen in [commit 3ae0993c86511f119d6f86cbf1ccb98bf192278b](https://github.com/thantiklermcirony/empirical-observatory/commit/3ae0993c86511f119d6f86cbf1ccb98bf192278b). Exact public bytes were verified at **2026-09-10 09:55:39.485680 UTC**; the one authorized scored run started at **09:55:40.604092 UTC** and completed at **09:57:11.479472 UTC**. The freeze manifest SHA-256 is `d24343eaf8d8891e09f35de0c82f30a35ec27cf16593e30ea2b5f6d8f3f80bff`.

The read-only `reconcile_results.py` imports neither the engine nor the benchmark policies. It independently reconciled all 30 episodes, 120 decisions, 180 ledger files and 725 ledger entries, including copied initial evidence. These contain **345 unique executions: 300 passing assertions and 45 ordinary assertion failures**, with no execution errors or timeouts. The failures comprise five historical failures, 30 policy-execution failures and ten full-oracle failures; none were discarded.

The audit verified 690 complete stdout/stderr byte hashes, snapshot/event hash chains, current declared source bytes, actual execution coverage, equal initial ledgers and capture charges, selected checks, final reuse states, every decision and aggregate cost. All 120 original decision files predate their corresponding oracle execution. All 14 frozen files still match their published manifest. `RUN.json` is the initial startup record; `SUMMARY.json` records completion.

Reproduce the reconciliation without running any checks or models:

```text
python benchmark/reconcile_results.py --root . --output benchmark/RECONCILIATION-recheck.json
```

Use `--check-original-mtimes` only with the original result tree; copying files changes filesystem timestamps. Keep `FROZEN.json`, `FREEZE_PUBLICATION.json`, `Active_Context_Freeze_01.zip`, the frozen sources and the complete result directory alongside the script. `RECONCILIATION.json` contains the machine-readable audit and artifact hashes.

## Interpretation and limits

This run supports a useful implementation claim: declared check evidence can be refreshed consistently across these constructed source changes without reviving a latest failed attempt. It establishes neither algorithmic novelty nor an LLM, token-cost or broad developer-productivity gain. The strongest baseline ties it on decisions and check selection.

There is one timing observation per method and episode, one Windows/Python 3.12 environment, five pure-Python projects and shared dual-fingerprint execution instrumentation. No statistical speedup claim is warranted. Local hashes and recorded clocks establish internal consistency, not independent proof that a process truly executed or that every relevant dependency was declared. Future product validation should test real continuation work with the same strong baseline; this result does not justify weakening the comparison or retuning these cases.


The self-contained evidence and audit scripts are in [the complete evidence archive](https://empirical-observatory.madmanmuzza.chatgpt.site/research/Active_Context_Evidence.zip). Extract it before following the reconciliation command above.
