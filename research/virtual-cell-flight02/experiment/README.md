# Flight 02 — experimental implementation for review

**Implementation-stage record:** no frozen plate-1 response values were inspected or evaluated while this code was written and synthetically tested. See `protocol.json`, the owner-provided `FROZEN_EXECUTION.json`, and any subsequent result manifest for the current frozen/executed status. Do not run the real-data command until the owner has reviewed the implementation and created the timestamped freeze manifest.

This CPU pipeline asks whether control-near source errors identify which predictions of a **fixed source-treatment mean** will fail in a new whole cell line. Every rejection rule uses the identical base predictions. It does not claim a new IDA model, new risk-estimation mathematics, calibrated confidence, or biological mechanism.

## Input contract

The frozen source is publisher revision `c7963cf334bec0683225d41c9586d900ca6303a2`, plate1 of `tahoebio/tahoe-de-rhaister`. The schema/identity audit found 50 lines, 92 exact compound/dose labels at 0.05 uM, 2,000 publisher-selected outcome genes, 4,443 observed pairs and 157 absent pairs. No missing outcome is filled with zero. Exact labels—including trailing whitespace—are retained. This plate contains no dose variation to fit. The measured outcome is the released response delta, whose precise biological normalization remains unresolved. Credit Tahoe Bio, Jesse Zhang, Airol A. Ubas, Richard de Borja, Valentine Svensson and colleagues; the release declares CC0-1.0. [Pinned publisher dataset card](https://huggingface.co/datasets/tahoebio/tahoe-de-rhaister/blob/c7963cf334bec0683225d41c9586d900ca6303a2/README.md).

Controls are the independently checked `controls-plate1.npz` of released DMSO `ref_mean`. They are covariates on their supplied scale. Never add them to predicted deltas or relabel predictions as counts, absolute expression, DESeq2 LFC or individual-cell trajectories. Shared control/delta measurement noise and upstream outcome-panel selection remain limitations. See the owner's `data-gate/DATA_GATE.md`.

`dataio.py` verifies the exact response, control-extract, input-selection and schema-preflight hashes from `protocol.json`. It verifies schema and identities before decoding numeric outcomes, and fails on nonfinite observed values. All 4,443 observed rows remain in the intended primary evaluation; a source-support violation fails instead of silently excluding an inconvenient treatment.

## Exact method

For treatment `d`, fit `mu[d]` as the equal-source-line mean. Its source leave-one-line-out residual risk is the mean-gene squared error of each observed source row against the mean of other source rows. Ordinary source sample variance and mean LOO risk obey `rbar = n/(n-1)*variance`; they are redundant rankings when support matches.

Transform only source controls with `log1p`, choose up to 2,048 positive-variance features by source variance (feature-ID tie break), center and fit up to 8 PCA components without whitening. This is PCA across cell-line summary profiles, not within-cell covariance. Transform destination controls using the fitted map.

Use Gaussian weights from destination-to-source PCA distances, normalized separately over the sources available for each treatment. Bandwidth is multiplier times the median positive source-pair distance. Shrink weighted LOO error toward treatment-only LOO error with fraction `neff/(neff+kappa)`, where `neff=1/sum(weights**2)` counts weighted source lines. Ten fixed candidates: bandwidth multipliers 0.5/1/2 crossed with kappa 0/4/16, plus uniform treatment-only risk.

Each of the five frozen outer folds withholds ten complete lines. The four remaining frozen groups are inner validation blocks. **Every inner split rebuilds both control preprocessing and the LOO residual ledger using only inner-training lines.** This prevents indirect leakage through other lines' residual predictors. Select the setting with lowest equal-line retained risk at 75%; exact ties prefer uniform, then larger kappa, then larger bandwidth.

Refit using all 40 outer-training lines. Save predictions, risks, selected parameters, source/test IDs, source support/zero-variance diagnostics, exact score-tie counts, and a prediction manifest **before** passing outer outcomes to the scorer. `fit_predict_outer` has no destination-response argument.

## Comparisons and gate

Primary rules: candidate; source disagreement; treatment-only LOO difficulty; predicted squared-effect magnitude; 100 reproducible hash-random permutations. Ties use a fixed SHA256 order of exact treatment labels, independent of data storage order. Retain `ceil(fraction*n_observed_treatments)` at 100%, 90%, 75%, 50%. Actual retained counts/IDs are exported.

Every strategy scores the **same mean predictor**. Zero and a descriptive ridge predictor are also scored on each exact retained mask. Ridge is fixed alpha 1 under a mean-squared objective, using source-standardized control PCA coordinates and a per-treatment unpenalized intercept. It is a separate prediction comparison, never substituted as a primary ranker's predictor. It has no tuned hyperparameter in this study.

Average genes within pair, retained treatments within line, random repeats within line, then lines equally. At100% all primary ranking losses must agree. The primary 75% gate requires at least 10% lower equal-line risk than the globally best conventional strategy, and lower risk than **each fold's own best conventional strategy** in at least 4/5 outer folds. That fold-specific best is a conservative descriptive envelope, not a deployable selector or per-line oracle. A zero best conventional risk cannot pass a positive-improvement gate.

This is an engineering threshold, not a significance test. Fifty cancer lines and five overlapping-training fits do not become millions of independent samples through their genes. One plate, observed-pair selection, related cell lines and noisy measurements limit generalization. The implementation makes no probability-calibration or conformal-coverage claim.

## Install and run synthetic checks

Use Python 3.12+ and a normal CPU environment. Dependencies are intentionally limited; the executed environment's exact versions are captured in result provenance. The broad requirements are compatibility bounds, not a claim of validation on every combination.

```text
python -m pip install -r requirements.txt
python -m unittest discover -s . -p "test_*.py" -v
```

Independent tests live outside this implementation directory under the owner's `independent-review/`. They should be run before a source freeze. No command above reads a real response file. Synthetic end-to-end output uses a verified temporary directory inside this folder and cleans only its own synthetic artifacts.

For bounded CPU use, set BLAS thread limits before starting Python (`OPENBLAS_NUM_THREADS=1`, `OMP_NUM_THREADS=1`, and an equivalent setting for the installed BLAS implementation if applicable). No GPU, model download, credential, paid API, registration or network call is used by the runner.

## Freeze and real-data execution — release owner only, after review

The runner does not create a freeze manifest. The owner records a JSON object with `status: "frozen"`, `frozen_at_utc`, and `source_sha256` mapping each of `pipeline.py`, `dataio.py`, `run.py`, `protocol.json` to its SHA256 after review. This preserves the final reviewed draft as the executed protocol; a timestamp is a local record, not external preregistration. Save any corrections and superseded drafts rather than backdating them.

Once that review/freeze is complete, from this directory:

```text
python run.py --execute-real-data --freeze-manifest ./FROZEN_EXECUTION.json --response ../data-gate/plate_plate1.parquet --controls ../../virtual-cell-next/controls-plate1.npz --selection ../../virtual-cell-next/FROZEN_INPUT_SELECTION.json --preflight ../data-gate/SCHEMA_PREFLIGHT.json --output ../results
```

This command is supplied for later execution; **it was not run during implementation**. Existing output directories are refused. Failures are exported with their stage; no model is retuned after outer scoring. A rerun after modification requires a new reviewed source manifest and a new result directory.

## Outputs

- One prediction NPZ and pre-scoring manifest per outer fold, containing the shared base, separate ridge outputs, risk arrays, support and identifiers.
- `per-pair.csv`: every observed pair's losses/risk scores and source support.
- `retained-masks.jsonl.gz`: every strategy/coverage/repeat's exact treatment IDs, base/zero/ridge risks, actual coverage and zero-relative values. Gzip reduces repeated identifier storage; it changes no evidence.
- `summary.json`: all line risks, all fold risks, globally best conventional method, selected settings/inner losses, gate and elapsed time.
- `missing-pairs.json`, `input-provenance.json`, `run-manifest.json`: unobserved pairs and input/source/output hashes and runtime versions.
- `failure.json` on an exception, preserving the failed run instead of silently excluding it.

Expected resources are bounded by the 50 × 92 × 2,000 response grid plus small per-fold linear algebra and exports. No performance/resource number is claimed until the implementation is actually measured.

Existing basal-modulation/response-subspace work in [Rhaister-O](https://huggingface.co/tahoebio/Rhaister/blob/main/docs/zeroshot_architecture.md), source-conditioned decomposition and conventional local residual regression are prior art. A positive outcome here would establish a specific inexpensive ranking improvement under the frozen test, not ownership of those concepts.
