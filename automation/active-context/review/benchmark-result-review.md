# Active Context Flight 01: independent saved-result audit

**The saved results reconcile. The candidate ties ordinary content/dependency invalidation on every episode and fails the frozen superiority gate.** This was a read-only audit of completed evidence by another AI agent on the same team. No experiment, check command or model was rerun.

| Method | Correct decisions | False verified claims | Continuation checks | Total charged seconds |
| --- | ---: | ---: | ---: | ---: |
| Active Context | 30/30 | 0 | 25 | 31.977346 |
| Content/dependency invalidation | 30/30 | 0 | 25 | 30.380564 |
| Fixed freshness | 20/30 | 10 | 20 | 25.904007 |
| Rerun all | 30/30 | 0 | 90 | 42.977102 |

All decisions and oracle outcomes were resolved; no continuation timeouts were recorded. The ten fixed-freshness false verifications are the source-regression and newly added incompatible-assertion episodes across five projects. They are also ten incorrect decisions and ten unsupported verified claims, not additional independent failures. The mutations and assertions were authored diagnostic cases, not newly discovered upstream defects.

“25 checks” means 25 continuation executions. Each strategy is also charged the same **20.742031 seconds of common historical evidence capture**: 90 pristine checks and five deliberately failed historical attempts. Construction, ledger copying, result serialization and the later evaluation oracle are excluded under the frozen cost contract. The candidate's continuation cost was 11.235315 seconds versus 9.638533 for content invalidation.

The candidate and content baseline selected the **same ordered check sequence in all 30 episodes**. The ratio of their total charged times is **1.05255934387933**: the candidate was approximately 5.26% slower in this one recorded run. The gate required at least 20% lower cost than the cheapest equally correct conventional method and explicitly disallowed claiming superiority from an identical-check-set timing tie. Both conditions rule out a pass. These timings are single observations on one runtime, not a stable production speed estimate.

## What was independently checked

The audit recomputed outcomes directly from saved return codes, timeout/error/stability flags and assertion-failure traces, without importing the candidate or benchmark classifier. It reconstructed policy decisions and false/unsupported claim lists, verified all 120 episode-method combinations exactly once, and reconciled every aggregate count and time against `SUMMARY.json`. Every executed receipt and oracle receipt matched its locally verified JSONL hash-chain payload. All 30 oracle runs covered the same three configured checks; all initial checks passed, and the five historical negative attempts remained recorded.

The published-freeze record references [commit 3ae0993c86511f119d6f86cbf1ccb98bf192278b](https://github.com/thantiklermcirony/empirical-observatory/commit/3ae0993c86511f119d6f86cbf1ccb98bf192278b). This audit verified the local frozen manifest and archive against that recorded hash evidence; it did not independently re-fetch the remote commit. All **14 frozen source/contract files** still match, including core `d0de7fa87bf8b538148e5773a40026d21ba8e7e0912e54f4fb5ed437986a9552`. The frozen manifest is `d24343eaf8d8891e09f35de0c82f30a35ec27cf16593e30ea2b5f6d8f3f80bff`. Hashes were checked again after the audit, with no change.

## Chronology and its limit

All 120 separate policy-decision files contain no oracle decision or scored false/unsupported-claim fields. Each matches its later scored row exactly after removing those three added fields. All recorded policy executions finished before that episode's first oracle execution. The frozen runner writes the four decision files before entering the oracle capture loop; the audit also locates those calls in the source AST.

On this original local result tree, all 120 decision-file modification times also precede the first oracle start. Those filesystem times are **secondary evidence** and can change when results are copied or checked out. The stronger procedural evidence is the frozen source order and the separately persisted unscored records. Neither local times, a hash chain nor this read-only audit cryptographically proves that execution followed the code, or that an experimenter had never inspected relevant outcomes earlier.

## Interpretation

The diagnostic supports usable integration of explicit dependency checks and avoidance of the constructed stale-evidence errors. It does not show an advantage over the separately implemented content-invalidation baseline. Common execution/receipt instrumentation was shared, so this is not an independently implemented execution platform or a comparison against deployed Bazel. Thirty authored continuations across five small Python projects are not an official benchmark, a representative sample of agent tasks or evidence of LLM performance, automatic dependency discovery or self-improvement.

No reporting blocker remains if the release preserves the failed gate, strong-baseline tie and continuation-only check-count qualification.

## Reproduce this audit without rerunning the experiment

```sh
python -B review/check_benchmark_results.py
```

The script uses only the standard library and reads saved artifacts. It writes `review/benchmark-result-proof.json`, including per-row classifications, input hashes, source hashes, chronology diagnostics and independently recomputed totals.
