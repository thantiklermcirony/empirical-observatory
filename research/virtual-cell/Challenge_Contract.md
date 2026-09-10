# Arc 2026: submission contract and score interpretation

Inspected 10 September 2026. This is documentation/source review, not executed evaluator validation and not a confirmed bug report. Pin source commits, package versions, preset, backend, panel and anchor identities before experiments. Mutable links below describe the inspected current sources.

## Service submission is stricter than the standalone evaluator

The current [official CLI guide](https://vcc-cli-wiki.virtualcellchallenge.org/) requires exactly **400 predicted cells per perturbation per context**, all 300 perturbations in all three contexts, all 18,533 genes, and **no submitted controls**. Values must be finite nonnegative integral counts. Validation contexts A/B/C and final D/E/F are different cell lines/panels. A complete prediction has 360,000 cells; caps include 400,000 cells, one million counts per cell and 4.75 billion stored entries. A fully dense matrix exceeds the stored-entry cap; sparse matrices must not retain explicit zeros. The guide explains that fixed sample counts and reference controls keep DE comparisons consistent.

Therefore the standalone [metrics brief](https://github.com/ArcInstitute/cell-eval2/blob/main/docs/vcc2026_metrics/vcc2026-metrics-brief.md), which describes a more permissive prediction-input arrangement, is **not authority to vary cell counts or submit controls to the service**. Record which interface was exercised. A local metric calculation is not a submission-validity test or an official score.

Our inference: format advice to round continuous predictions cannot justify treating log-normalized expression as raw counts. The measurement model must establish what continuous quantity is being rounded. Do not reconstruct missing count biology by relabeling an LFC matrix.

## Checks that prevent misleading wins

| Edge | Meaning and required check |
|---|---|
| Oracle anchor versus deployable baseline | [Baseline code](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/src/cell_eval2/baseline.py) explicitly uses evaluated real perturbations for its generic-response anchor. It is an evaluation oracle, not information available to the submitted model. Keep zero-effect, source-trained generic response and oracle anchor separately labeled. |
| Score units and comparability | The [scaling documentation](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/src/cell_eval2/scales.py) and brief distinguish raw metrics from anchor-scaled scores. Scores are not percentages; a replicate anchor is not a noiseless ceiling. Save raw components as well as scaled results and the exact panel/anchor stamp. |
| Direction versus strength | Cosine PDS is a within-panel rank statistic. Positive rescaling of a nonzero delta does not change its direction. A good PDS does not verify effect amplitude; report magnitude-sensitive error too. Identical profiles produce ties, not evidence of perturbation identity. [Full metric definition](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/docs/vcc2026_metrics/vcc2026-metrics.md) |
| Two normalization paths | PDS/MSE use a normalized group-sum log profile; DE uses arithmetic CPM means and its own tests. Mean of cell log expression is a different quantity from log of a normalized group sum. Reproduce the declared transform rather than naming both 'pseudobulk'. [Metric brief](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/docs/vcc2026_metrics/vcc2026-metrics-brief.md) |
| Target exclusion | The [preset](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/src/cell_eval2/configs/vcc2026.yaml) masks the panel's targeted genes for PDS. Other metrics have their own target exclusions. Direct target suppression is therefore not a general substitute for predicting downstream effects. Validate every perturbation-to-gene mapping. |
| Partial mapping | [DE code](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/src/cell_eval2/metrics/de.py) rejects zero resolved targets but can proceed with partial resolution while reporting it. Our fixed-panel adapter should require complete intended mapping, not merely a nonzero match count. This is a wrapper requirement, not a verified challenge defect. |
| Different DE cohorts | The control-expression threshold excludes control-silent genes from DE scoring. Empty-set and minimum-reference-DEG conventions differ between overlap, fidelity and LFC metrics. Publish denominators and exclusions; a single aggregate can conceal a different assessed population. [Full definitions](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/docs/vcc2026_metrics/vcc2026-metrics.md) |
| Panel MSE aggregation | Official MSE aggregates numerator/denominator sums across the panel and includes variance corrections. The mean of individually normalized perturbation errors is not that score. Preserve the evaluator's aggregation and label any ordinary MSE diagnostic separately. [Metric brief](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/docs/vcc2026_metrics/vcc2026-metrics-brief.md) |
| Predicted variability | The current specification limits prediction-side variance credit. It has already addressed earlier variance and target-spike failure modes. Do not advertise these as newly discovered exploitable bugs. Still compare count-emission schemes at identical 400-cell budgets and with fixed seeds: a distributional metric can reward properties a point forecast does not establish. [Full definitions](https://raw.githubusercontent.com/ArcInstitute/cell-eval2/main/docs/vcc2026_metrics/vcc2026-metrics.md) |
| Backend and provenance | The [README](https://github.com/ArcInstitute/cell-eval2) documents multiple DE execution paths. Pin the chosen backend and dependencies; do not assume all CPU/GPU paths give identical results. Preserve reference/control hashes and strict cache configuration. |

A second source-code caution applies to replication of the July decomposition study: [cross-context code](https://raw.githubusercontent.com/xinyizhanglab/perturbation-decomposition/main/benchmarks/cross_cl.py) derives a centroid from target outcomes for an evaluation residual score after making predictions. That is an **oracle diagnostic**, not evidence of prediction leakage by itself. Its saved field name should not tempt our pipeline into treating it as a train-only centroid. Also report targets omitted for missing embeddings. The repository says reproduction tooling is being developed; inspect and test the exact functions used instead of treating the existence of code as successful independent reproduction.

## Necessary negative controls before any headline

1. Same predictions with a permuted context-label mapping: the manifest must catch this before scoring, since the model itself cannot.
2. Zero/generic effects and repeated prediction profiles: report identity rank, amplitude error and undefined direction counts independently.
3. Matched-strength permutation of perturbation labels: test whether a result requires correct target identity.
4. Fixed mean with alternative explicitly defined count-emission distributions: quantify sensitivity without changing the service's cell count.
5. Source-only centroids/bases versus explicitly labeled target-oracle diagnostics: make the information boundary executable.

No score here has been calculated. The current four-context author-LFC experiment cannot produce these raw-count distribution metrics and should continue to say so.
