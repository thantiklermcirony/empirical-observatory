# Next experiment: predict when transfer will fail

Draft, 10 September 2026. This is a proposed experiment, not a registered protocol or a result. No response model is fitted during the input audit.

The practical fallback is a **new chemical-perturbation study using Tahoe's own plate-matched DMSO controls**. It must remain separate from the completed Nadig/Replogle CRISPRi study. A DMSO-treated cancer cell population is a different experimental context and operator from a non-targeting CRISPRi population, even if a cell-line name happens to overlap.

## Concrete question

Can a predictor trained on source contexts tell us, before viewing a new context's drug responses, which predictions are too unreliable to use? A useful result would be a prospective reduction in error among retained predictions at fixed coverage, beyond ordinary response disagreement and baseline-expression distance. A null result is equally reportable. This question does not presuppose that an IDA biology engine exists.

## Input and scope gates

1. Verify the publisher's `zeroshot/control_expression.parquet`, license, pinned revision, bytes and SHA256. Inspect control columns, feature identities, plate membership, duplicated keys, nonfinite entries, coverage and any supplied library-size/count information. Do not fit PCA or inspect perturbation response values in this audit.
2. Before acquiring response values, freeze the first pilot to the publisher's **plate 1** response shard, chosen by its numeric identifier. Record the complete published measurement axis. This is a modest single-plate pilot; the full 14-plate study is a separate expansion. File metadata may be inspected before freezing; performance may not determine the plate.
3. Check exact normalization compatibility between control `ref_mean`, `ref_lib_mean` and response deltas. Do not equate raw mean counts, mean log-normalized expression, log of pooled means and DESeq2 LFC. If the producer cannot establish the scale, stop at a data-access result.
4. Verify treatment identity including dose and units, and coverage of each treatment in training and test contexts. A compound/dose absent from all training contexts is outside this transfer experiment. Report exclusions from metadata; do not select high-effect treatments.
5. Retain all available source measurement columns for the primary score. If responses were supplied on a preselected 2,000-gene axis, call it a **fixed publisher feature panel**, not independent full-transcriptome feature selection. The broader control table can support separate training-only predictors; it cannot restore omitted outcome genes.

## Proposed frozen separation

Assign entire cell lines to five folds by sorting SHA256 of `EA-VC-Tahoe-v1|<cellosaurus-id>` and round-robin allocation. All drug responses of an outer-test cell line are hidden from training, feature selection, tuning and calibration. Its plate-matched control profile is allowed at prediction time. Publish split IDs before opening the response shard. Use the same split for every method.

Fit normalization/feature scaling and any feature selection on outer-training controls only. Inner leave-cell-line-out predictions on that training set choose hyperparameters and calibration. Plate membership and treatment/dose names are design metadata. No target response, target DEG list, response magnitude or score may decide inputs or tuning.

## Matched models and falsifier

Required comparators are zero response; per-treatment source mean; a ridge/diagonal baseline-expression interaction; and the same predictor equipped with simple source-disagreement uncertainty. Rhaister-O already implements basal-expression modulation and response-subspace shrinkage, so those ideas require credit and cannot be presented as new. Its published results are not our baseline run.

A candidate uncertainty rule may combine training-only control extrapolation distance, effective number of source contexts, and disagreement of source-context responses. Specify its exact equation and all grids before running it. Compare a fixed prediction rule with and without the new rejection rule; otherwise better retained scores may simply reflect a different predictor.

Primary evaluation: macro-average MSE across treatments within each outer-test cell line, then equally across held-out cell lines, and risk at 100%, 90%, 75% and 50% coverage. Compare retained sets against seeded random rejection and source-disagreement rejection at identical coverage. Report absolute risk, zero-baseline-relative risk, all fold results, retained treatment IDs, coverage and compute cost. Do not select a favourable coverage after seeing scores.

Proposed decision gate, to freeze before implementation: at 75% coverage, at least 10% lower macro risk than both comparison rejection rules, with improvement in at least four of five outer folds. Failure of that gate rejects the narrow usefulness claim under this assay; it is not evidence against an all-science framework. Uncertainty estimates must reflect the small number of biological contexts, not treat thousands of gene coordinates as independent experiments.

This study could establish prospective predictive utility or failure detection for measured interventions in these cell lines. It cannot identify individual-cell counterfactuals, isolate causal effects of cell identity from protocol, prove biological mechanisms, establish consciousness, or certify clinical intervention choices. Controls-only summaries lack within-cell covariance and cannot be used to claim a control-cell PCA or recovery trajectory.

## Existing work to credit

- [Rhaister-O architecture](https://huggingface.co/tahoebio/Rhaister/blob/main/docs/zeroshot_architecture.md) already uses basal centroids, per-treatment diagonal modulation, source-response subspaces and shrinkage. Its [loader](https://huggingface.co/tahoebio/Rhaister/blob/main/rhaister/prepare_combined.py) explicitly reconstructs control-only reference features and removes held-out cell-line responses. This is a required comparison, not a source of claimed new results.
- [Royer lab's TFM perturbation study, v3](https://www.biorxiv.org/content/10.64898/2026.06.28.735106v3.full) already studies training-support diversity and geometric representation changes. Novelty cannot be simply that geometry or context matters.
- [Perturbation-response decomposition preprint](https://www.biorxiv.org/content/10.64898/2026.07.24.740459v1.full) already compares control, perturbation and random subspaces, context interactions and control-expression descriptors. Its current repository does not yet deliver the processed files advertised in its README; that distribution gap does not invalidate or erase the prior work.
