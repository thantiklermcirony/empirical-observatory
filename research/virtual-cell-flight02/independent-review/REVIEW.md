# Flight 02 independent review

10 September 2026. **The current numerical pipeline passes 11 independent synthetic contract checks, and the actual runner passes an independent two-run synthetic audit.** No implementation correction was needed for the tested cases. This is a code/data-separation review, not evidence that the method improves biological prediction. No real response data were opened or scored by this review.

Reviewed `../experiment/pipeline.py`, SHA256 `a39a929a639c2d1621adf889821cfb61c36253a9f8fba7dd0ea686df794a8b71`. `CHECK_RESULTS.json` records exact implementation/test hashes and each result. The independent test runner is `check_pipeline.py`; its record-based arithmetic reference is `reference_oracles.py`.

**Final review complete.** The final runner/data-loader changes were reviewed and the affected synthetic runner checks rerun successfully. The final protocol's spacing changes preserve the original equations, comparison grid and scoring rules. Reviewed production hashes:

| File | SHA256 |
|---|---|
| `pipeline.py` | `a39a929a639c2d1621adf889821cfb61c36253a9f8fba7dd0ea686df794a8b71` |
| `dataio.py` | `9bc7c2b1e05082324ac8f9924128e6b362692c49b285e4116ae02cedda42d1fb` |
| `run.py` | `fe212ed1a72b8f6edaa6ed43305c4fd6738724d1428f4ea12e44fc7ba4c91f28` |
| `protocol.json` | `d869dca89429c23cdebeb793f3db4845e5ca13392f9417b5404f339733f812d7` |

## Verified behavior

- Source means and leave-one-line-out errors match an independent scalar implementation with unequal treatment support. Counts of 2, 3 and 4 are exercised. The support-dependent variance identity holds.
- Missing source pairs remain absent: replacing their array payloads with `1e100` or NaN changes neither means nor error estimates. Missing test truth is excluded by the observed-pair mask.
- Different doses and whitespace-bearing treatment labels retain distinct identities. Hash tie-breaking is invariant to treatment storage order, and 75% nominal coverage uses the declared ceiling rule.
- A hand-built pair of treatment-error patterns produces the independently expected reversal of drug rankings between two contexts. This rules out a candidate that accidentally assigns only a constant destination-distance score to every drug.
- Equal controls give the treatment-only limit. A distant-query test produces finite risk and valid effective support. Invalid nonfinite coordinates fail explicitly.
- Instrumentation captures exactly four freshly fitted inner source models and control maps. Each excludes its entire validation block. Poisoning that block's outcomes leaves the block's ten pre-scoring candidate rank arrays unchanged; inner selection can change when validation losses are subsequently scored.
- The outer fitting API has no destination-outcome argument. Scoring two incompatible synthetic destination truths cannot mutate its fitted outputs. Source-row permutations preserve those outputs byte-for-byte; aligned feature, treatment and gene permutations preserve geometry/predictions/ranks numerically.
- All rankings use the same base prediction. Their losses agree at 100% coverage. Zero-reference errors are calculated on each ranking's own selected mask.
- The unequal-size-line oracle yields equal-line risk 50, rather than the incorrect pooled-row value 10. Random repeats are averaged before line-level aggregation.
- Observed NaN/inf, insufficient inner treatment support, duplicate feature identities and empty scored lines fail explicitly.

## Interpretation and review limits

The primary overall comparison selects one globally strongest conventional ranking. The fold requirement compares the candidate against each fold's own strongest conventional score; the implementation author confirmed this is a conservative descriptive envelope, not a deployable strategy. The protocol must retain that distinction.

The kernel produces a residual-risk ranking, not a calibrated probability or a biological law. Full-coverage prediction accuracy cannot improve through changing only the ranking. A positive result would concern selective use of a fixed source-mean predictor on the released panel; a negative result must remain visible.

## Actual runner and saved evidence

`check_runner.py` creates a 20-line, five-fold synthetic `Panel` with 93 observed and seven absent pairs. It disables the real-data loader, then runs the actual production `execute` function twice. The second run changes only outer-fold-0 observed responses by a large finite amount.

- At all **40 scoring boundaries**, the relevant prediction archive and manifest already existed. The archived mean, ridge and ranking arrays exactly matched the arrays passed to the scorer, and the manifest hash matched the actual archive bytes.
- All **11 arrays** in the fold-0 archive remain identical after its held-out responses are poisoned. Its selected parameters, inner losses, source identities and control-map manifest also remain unchanged. Other folds are allowed to change because those poisoned lines belong to their training sets.
- An independent scalar calculation reproduced the mean and same-mask zero risks for all **8,320 retained-mask records**, then reproduced overall equal-line summaries. The observed and absent pair ledgers are disjoint and have the correct cardinalities.
- Both synthetic runs completed; their synthetic primary gates were false. Those gates are arbitrary fixture outcomes and are not biological results.
- The final fold-assignment helper preserves integer labels and rejects duplicated, missing/unknown or incorrectly sized assignments. Its three invalid synthetic cases fail explicitly. The final source-variance/support and exact-tie diagnostics match independent hand calculations, including whether a tie crosses the 75% retention boundary; they do not alter fitting or selection. Fold-0 diagnostics also remain unchanged after its held-out outcomes are poisoned.

`RUNNER_CHECK_RESULTS.json` records exact source hashes, artifact locations and passed checks. The loader was reviewed statically: it checks the external execution freeze and all four input hashes before numeric response decoding, independently maps context/feature identities, retains absent pairs as masked NaNs, and fails on invalid observed numbers. Its actual real-file decode was deliberately not exercised here. Full published-file validity remains a check for the authorized frozen run.

Passing this review does not certify a later changed implementation, complete preprocessing provenance, or actual biological performance. The external reviewed execution manifest is the authority for the frozen file hashes; no real-data execution should precede it.

To rerun the synthetic review from this folder:

```text
python check_pipeline.py
python check_runner.py
```

Requires NumPy only. The checks import adjacent production modules, create synthetic arrays in memory, and write local result JSON. The runner check also writes clearly named synthetic evidence directories. Neither check opens the actual response shard.
