# Graphiti: preserving what was true, when it was true

Evidence recorded 10 September 2026. These two contributions are submitted for review, not accepted or merged. Follow the pull requests for current status.

- [History fix and tests — PR #1867](https://github.com/getzep/graphiti/pull/1867): preserve disjoint occurrences, use source reference clocks and finalize temporal intervals consistently.
- [Timestamp fix and tests — PR #1866](https://github.com/getzep/graphiti/pull/1866): normalize aware Neo4j dates at the shared read boundary so unchanged resaves preserve exact-boundary answers.
- [History reproduction — issue #1865](https://github.com/getzep/graphiti/issues/1865).
- [Timestamp reproduction — issue #1864](https://github.com/getzep/graphiti/issues/1864).

## Recorded results

Against Graphiti 0.30.2 at eaa4128681bc53487138a4bbc22d58336ebe70d2, the 48 new regression cases change from 30 failed / 18 passed to 48 passed with both repairs. These are developer regression cases, not 48 distinct bugs.

The exact published timestamp branch (83ded3a6e027be978c78cecc68c920e278e98de1) independently passed 397 tests, with 11 skipped. The temporal branch (1e6289c1ee40c42dc588791217e3ee0efc175826) passed 415, with 11 skipped. Those totals include existing project tests. Ruff, changed-file formatting and changed-production-file Pyright passed on both branches. Full-project type checking still had optional-integration diagnostics.

The [Linux / Neo4j 5.26.30 audit passed](https://github.com/thantiklermcirony/graphiti/actions/runs/34410688322). All four declared database scenarios completed: reactivation, finite-interval clipping, expiry without context, and batch period retention. The baseline failures were reproduced; the combined candidate passed. Required fulltext and range indexes were online. The separate unchanged-read/resave diagnostic failed on the baseline and passed on both the timestamp-only branch and the combined candidate, without resolver or model calls.

This closes the fourth-case gap in the earlier Windows audit. The first Linux attempt exposed a naming collision in our forwarding wrapper; renaming its Cypher argument preserved the named fulltext query parameter. No production fix or expected assertion was changed. The passing run records immutable source commits, dependency versions, JSON results and logs. The [audit source](https://github.com/thantiklermcirony/graphiti/tree/1b5670465e0a30854401281f995ff2bcefebbe58/audit/temporal-memory) makes the check reproducible.

Both contributions now have successful CLA and Ruff checks. Other upstream workflows require maintainer approval, and an approving review is still required. Neither contribution has been merged.

## What this establishes

Concrete, reproducible correctness improvements for temporal memory and timestamp persistence. The tests supply model decisions and embeddings; they do not measure language-model extraction, general retrieval accuracy, cost savings or production adoption.

The original release-event report #1841 remains unresolved: it needs raw extracted edges, model configuration and candidate decisions. Overlapping-interval correction semantics and migration of existing mixed-zone data also remain separate design questions.

This is an application of the programme's focus on state, history and evidence, using established engineering techniques. It is not validation of the whole scientific framework.
