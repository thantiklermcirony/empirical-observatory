# Graphiti: preserving what was true, when it was true

Evidence recorded 10 September 2026. These two contributions are submitted for review, not accepted or merged. Follow the pull requests for current status.

- [History fix and tests — PR #1867](https://github.com/getzep/graphiti/pull/1867): preserve disjoint occurrences, use source reference clocks and finalize temporal intervals consistently.
- [Timestamp fix and tests — PR #1866](https://github.com/getzep/graphiti/pull/1866): normalize aware Neo4j dates at the shared read boundary so unchanged resaves preserve exact-boundary answers.
- [History reproduction — issue #1865](https://github.com/getzep/graphiti/issues/1865).
- [Timestamp reproduction — issue #1864](https://github.com/getzep/graphiti/issues/1864).

## Recorded results

Against Graphiti 0.30.2 at eaa4128681bc53487138a4bbc22d58336ebe70d2, the 48 new regression cases change from 30 failed / 18 passed to 48 passed with both repairs. These are developer regression cases, not 48 distinct bugs.

The exact published timestamp branch (83ded3a6e027be978c78cecc68c920e278e98de1) independently passed 397 tests, with 11 skipped. The temporal branch (1e6289c1ee40c42dc588791217e3ee0efc175826) passed 415, with 11 skipped. Those totals include existing project tests. Ruff, changed-file formatting and changed-production-file Pyright passed on both branches. Full-project type checking still had optional-integration diagnostics.

A real Neo4j 5.26.30 audit of the combined candidate improved 26 declared query assertions from 16 passing to all 26 passing, across 13 fixed timepoints and two query paths. Three scenarios completed. A fourth, fulltext-dependent batch case could not complete because the sandbox prevented index creation. The separate unchanged-read/resave diagnostic failed before and passed after. Full database integration remains incomplete at this evidence date.

## What this establishes

Concrete, reproducible correctness improvements for temporal memory and timestamp persistence. The tests supply model decisions and embeddings; they do not measure language-model extraction, general retrieval accuracy, cost savings or production adoption.

The original release-event report #1841 remains unresolved: it needs raw extracted edges, model configuration and candidate decisions. Overlapping-interval correction semantics and migration of existing mixed-zone data also remain separate design questions.

This is an application of the programme's focus on state, history and evidence, using established engineering techniques. It is not validation of the whole scientific framework.
