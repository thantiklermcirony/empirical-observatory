# Active Context: external-source continuation diagnostic

This implementation-stage record describes 30 constructed continuations across five pinned, permissively licensed Python projects. Current execution status belongs in a separately frozen manifest and the generated result, not this historical description. No LLM, paid service, package installation or network access is needed to run the acquired sources.

The useful question is narrow: **when a developer resumes a task, which previously executed checks still apply to the declared inputs, and which checks should run again?** The comparison is an engineered diagnostic, not an official benchmark, discovered upstream bugs, an agent-efficiency result or proof of a new memory algorithm.

## Sources and attribution

| Source | Immutable commit | Source license |
| --- | --- | --- |
| [Packaging](https://github.com/pypa/packaging) | [10590c194edb33c82f84a127883d6097c56b7840](https://github.com/pypa/packaging/commit/10590c194edb33c82f84a127883d6097c56b7840) | Apache-2.0 or BSD-2-Clause |
| [ItsDangerous](https://github.com/pallets/itsdangerous) | [672971d66a2ef9f85151e53283113f33d642dabd](https://github.com/pallets/itsdangerous/commit/672971d66a2ef9f85151e53283113f33d642dabd) | BSD-3-Clause |
| [Boltons](https://github.com/mahmoud/boltons) | [961dcff3f42e73b245aef65e377fe82763b257bb](https://github.com/mahmoud/boltons/commit/961dcff3f42e73b245aef65e377fe82763b257bb) | BSD-3-Clause |
| [Schedule](https://github.com/dbader/schedule) | [82a43db1b938d8fdf60103bd41f329e06c8d3651](https://github.com/dbader/schedule/commit/82a43db1b938d8fdf60103bd41f329e06c8d3651) | MIT |
| [More Itertools](https://github.com/more-itertools/more-itertools) | [19ddb972845ab0e5b9b7449d3fd5930781407441](https://github.com/more-itertools/more-itertools/commit/19ddb972845ab0e5b9b7449d3fd5930781407441) | MIT |

The archives retain their original license and copyright files. `MANIFEST.json` records exact archive hashes, source-license hashes and direct immutable license links. `upstream/SOURCE_LOCK.json` preserves the first acquisition. `REPLACEMENT_SOURCE_LOCK.json` records the pre-freeze Humanize exclusion: its source archive needs generated hatch-vcs build metadata unavailable in the chosen no-install setup. No version module or upstream package is faked.

## Six continuations per project

1. Unchanged source with fresh evidence.
2. Unchanged source with evidence older than a fixed one-hour threshold.
3. A documentation edit outside declared check coverage.
4. An authored one-line source regression that breaks a real executable behavior assertion.
5. A new file inside the declared assertion directory, proposing an intentionally incompatible requirement.
6. A failed recheck followed by restoration of the original source; the latest failure remains visible.

The scripts check source-import provenance, one primary API behavior and one separate behavior. Both behavior checks depend on the import check. Source scopes conservatively cover each package directory; only the primary check watches its fixture directory. This is explicit coverage, not automatic dependency discovery. `-I -B` plus an explicit source path prevents accidental use of an installed package and avoids bytecode-cache effects. Every check verifies loaded package modules originate in the copied upstream source.

`source_regression` and `new_assertion_member` are deliberately constructed negative controls. The latter tests a changed proposed requirement that the package does not satisfy; it does not pretend the package ought to satisfy it.

## Equal inputs and comparisons

All four methods receive the same current repository, commands, declared scopes, watched environment/runtime, prior attempts and synthetic evidence age. No policy receives a construction label, expected answer or dependency oracle. Age is an explicit continuation scenario parameter; authentic receipt timestamps are never rewritten.

- **Rerun all:** run every requested check and prerequisite.
- **Content/dependency invalidation:** independently fingerprint declared inputs and recheck changed or failed evidence plus prerequisites.
- **Fixed freshness:** latest passing evidence may be reused for one hour; it ignores file changes but respects latest failure and prerequisite identity.
- **Active Context:** use the core inspector/planner with the same declared scopes and claims.

The conventional baseline has its own fingerprint and decision code and never imports the candidate inspector. Common execution instrumentation records both signatures for every method. This adds overhead and makes timings diagnostic, rather than an optimized build-system comparison. The strong baseline is expected to select exactly the same checks as Active Context. That tie must fail the proposed 20% superiority gate even if one short run's timing appears faster.

All four decisions are saved before a separate full-rerun oracle executes. Exit 10 means an ordinary failed assertion. A timeout, other unexpected exit, launch error or unstable input snapshot is unresolved. All logs, receipts and failed attempts remain in the result tree. An invalid initial setup halts with an explicit incomplete result instead of dropping an episode.

Report unsupported and false verification, incorrect/unresolved decisions, check counts, whole-operation elapsed time, common initial capture time and continuation-only time. Oracle time is recorded separately. The gate requires 30 resolved episodes, no unsupported verification, correctness/coverage at least rerun-all and at least 20% lower total measured time than the cheapest equally correct conventional strategy. A check-set tie fails regardless of timing noise. A single timing observation per method/episode cannot establish a stable production speedup.

## Reproduction

From this directory, using Python 3.12 or later and the adjacent `active_context` source:

```text
python unpack_sources.py
python -m unittest -v test_diagnostic
python preflight.py
```

The preflight runs 15 pristine source assertions only; it does not compare policies. Existing acquisitions are retained and extraction refuses changed bytes.

The parent/reviewer must freeze the implementation before the scored diagnostic. The frozen JSON must have `schema_version: 1`, `status: "frozen"` and a `files` mapping from paths relative to the Active Context project root to their SHA-256 values. `run_diagnostic.required_frozen_files()` enumerates the required benchmark files, source locks and all core Python modules. Extra hashes are welcome. Do not change code after freeze.

```text
python run_diagnostic.py --freeze ../FROZEN.json --output results/flight01 --authorize-frozen-run
```

The runner rejects an existing output directory, an output outside `benchmark/`, a changed freeze, modified extracted upstream bytes or a changed manifest. Keep the entire result directory. `SUMMARY.json` is the aggregate; `RESULTS.json` keeps every policy episode. `episodes/` contains initial attempts, construction manifests, policy decisions, hash-chained check receipts, full oracle outcomes and any setup failures. There is no network access in the runner. Any correction after scored execution needs a new version and freeze; preserve the original run.
