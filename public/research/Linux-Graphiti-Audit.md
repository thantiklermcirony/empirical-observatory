# Linux Graphiti audit: four real database scenarios completed

The [corrected Linux run](https://github.com/thantiklermcirony/graphiti/actions/runs/34410688322) passed on 10 September 2026 (Asia/Bangkok; completed 9 September at 22:09:51 UTC). All four planned scenarios executed on real Neo4j Community **5.26.30**, including the full-text-dependent batch case. Required RANGE and FULLTEXT indexes were ONLINE. No cases were skipped and no model API calls were made.

| Finite audit measure | Pristine baseline | Both fixes combined |
|---|---:|---:|
| Database scenarios passed | 0/4 | 4/4 |
| Valid-time query assertions passed | 20/32 | 32/32 |
| Storage assertions passed | 6/13 | 13/13 |
| Developer regression cases passed | 18/48 | 48/48 |

The 32 query assertions cover **16 declared timepoints through two real query paths**: independent Cypher and Graphiti's vector/date filtering. They are finite checks, not statistical samples, distinct bugs or model-accuracy scores. The additional independent suite passed all 16 test methods on the combined candidate; the baseline reproduced 11 failure records across those methods.

The four scenarios test repeated assignment after an explicit NOT_ASSIGNED interval, clipping an older finite interval at a later contradiction, finite-edge expiration metadata without context, and retaining separate periods through the actual batch resolver, full-text search and persistence. The no-context baseline already answers valid-time queries correctly; its failure concerns expiration metadata.

A separate unchanged save/read/save diagnostic fails on the baseline and passes on both the **public UTC-only fix** and combined candidate. The corrected runs preserve exact-boundary answers and native stored values, using zero resolver calls and zero model calls.

## Reproduce and inspect

The [immutable audit implementation](https://github.com/thantiklermcirony/graphiti/tree/1b5670465e0a30854401281f995ff2bcefebbe58/audit/temporal-memory) combines these exact public sources in a disposable checkout:

- Baseline: `eaa4128681bc53487138a4bbc22d58336ebe70d2`.
- UTC fix: `83ded3a6e027be978c78cecc68c920e278e98de1`.
- Temporal fix: `1e6289c1ee40c42dc588791217e3ee0efc175826`.

The combined candidate is a local composition of those patches, not a separate public production commit. The run used frozen lockfile dependencies; recorded versions include Neo4j Python client 6.1.0, NumPy 2.4.1 and Pydantic 2.12.5.

Durable evidence files:

- [Baseline database records and queries](Linux-Graphiti-Baseline-Database.json) and [combined candidate records and queries](Linux-Graphiti-Candidate-Database.json).
- [Baseline unchanged roundtrip](Linux-Graphiti-Baseline-Roundtrip.json) and [public UTC-only roundtrip](Linux-Graphiti-UTC-Roundtrip.json).
- [Exact source/patch manifest](Linux-Graphiti-Source-Manifest.json), [complete stage verdict](Linux-Graphiti-Verdict.json), [runner summary](Linux-Graphiti-Run-Summary.md) and [evidence hashes](Linux-Graphiti-Evidence-Manifest.json).

The [complete Actions artifact](https://github.com/thantiklermcirony/graphiti/actions/runs/34410688322/artifacts/10127132648) includes the combined roundtrip, logs, JUnit files and environment records. Its downloaded ZIP SHA256 independently matches the recorded Actions digest: `c4198b6d623f6ad2da775a9ed634079951ae6b69e2155905a5b017b0f56d4e77`. The durable copies above were verified against the corresponding ZIP members. Temporary Actions retention does not govern copies committed alongside this page.

## What remains outside this result

Facts, event times, model decisions and four-dimensional vectors are supplied synthetic fixtures. The run establishes bounded resolver and persistence correctness on the pinned environment. It does not establish semantic extraction, retrieval relevance, original issue #1841's end-to-end resolution, knowledge-time replay, broad service correctness, model cost savings or validation of the whole scientific framework. Overlapping-interval correction policy and migration of existing mixed-zone data remain separate design questions.

The [first Linux attempt](https://github.com/thantiklermcirony/graphiti/actions/runs/34410253725) failed its strict verdict because the audit wrapper's positional parameter collided with a named full-text query parameter. Renaming that wrapper parameter fixed the instrumentation; a focused test failed before and passed after. The production fixes and all database assertions were unchanged. The failed attempt is retained as diagnostic history.

The upstream [UTC PR #1866](https://github.com/getzep/graphiti/pull/1866) and [temporal PR #1867](https://github.com/getzep/graphiti/pull/1867) remain separate contributions subject to maintainer checks and review. This successful audit does not itself mean either PR has been accepted or merged.
