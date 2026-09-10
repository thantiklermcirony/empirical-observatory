# A usable next control dataset

10 September 2026. **A public, no-cost alternative control route has been downloaded and verified: Tahoe's own DMSO expression summaries.** This is a fresh chemical-perturbation study across 50 cancer cell lines. It does not fill the missing matched HepG2/Jurkat controls for the completed Nadig CRISPRi benchmark.

## Acquired and checked

The [publisher's dataset card](https://huggingface.co/datasets/tahoebio/tahoe-de-rhaister) explicitly lists separate control-state tables and declares **CC0-1.0**. The [original Tahoe-100M release](https://huggingface.co/datasets/tahoebio/Tahoe-100M) also declares CC0-1.0. Credit Tahoe Bio and the source authors, Jesse Zhang, Airol A. Ubas, Richard de Borja, Valentine Svensson and colleagues, and cite the source publication. The code license of Rhaister is separate from these data terms.

| Item | Verified value |
|---|---|
| Repository revision | `c7963cf334bec0683225d41c9586d900ca6303a2` |
| Publisher file | `zeroshot/control_expression.parquet` |
| Bytes | 186,370,730 |
| SHA256, publisher LFS and independently recomputed | `d88779096d3f5ff1b6421047302e918bf33afe84ded02f3e3af053271b26706a` |
| Download | [Pinned public file](https://huggingface.co/datasets/tahoebio/tahoe-de-rhaister/resolve/c7963cf334bec0683225d41c9586d900ca6303a2/zeroshot/control_expression.parquet) |
| Authentication/payment | None |
| TLS | Normal verification; no bypass |

`tahoe-drug-tree.json`, its fetch record, the saved publisher README and `tahoe-controls-download.json` retain the metadata evidence. Parent/root executed the downloader because the subagent shell's socket access was denied (WinError10013). The download succeeded through the parent's ordinary permitted connection; this is not an access restriction workaround.

The full control-table audit completed in **56.69 seconds**, examining all **43,897,000 rows** in 140 Parquet row groups:

- Exactly **50 cell lines × 14 plates × 62,710 features**, a complete grid.
- Identical feature identities in every context/plate, unique within each context/plate. No repeated context/plate groups across row groups.
- **Zero** duplicate context/plate/feature keys, nonfinite means or negative means; 25,840,329 means are zero.
- Columns: `feature`, `ref_mean`, `plate`, `cell_line`, `ref_lib_mean`, `ref_lib_median`, `ref_n_cells`.
- Supplied control counts range from **13 to 15,253 cells** per context/plate. The metadata fields are constant across each profile's feature rows.

The local `controls-plate1.npz` preserves all 62,710 features for the 50 plate-1 contexts, plus control-cell counts and supplied library means. It is **3,945,881 bytes**, SHA256 `a10416c60c62108da21e236935eb223c1f2eb8d7d9a1c563068934d059657efc`. No feature selection or model fitting occurred. Seven independent checks passed, including exact source comparisons across all features in three predetermined context positions. This extract is a computational summary, not individual control cells.

## What remains scientifically unresolved

The released `ref_mean` must be preserved as supplied. Across all profiles its sum is only **0.6531–0.7253 times `ref_lib_mean`**; treating these as raw mean counts or dividing by that library mean would be unjustified. The exact control-table generation script was not located in the checked release. Neither a raw-count interpretation nor a CP10K normalization has been verified.

There is also a public documentation discrepancy: the dataset card calls response deltas linear-normalized, but the current [official response preparation code](https://huggingface.co/tahoebio/Rhaister/blob/main/scripts/data_prep/compute_celleval_deltas.py) applies `log1p` to the supplied HVG matrix; its full-feature mode normalizes each cell to a target total and then applies `log1p`. The [preparation README](https://huggingface.co/tahoebio/Rhaister/blob/main/scripts/data_prep/README.md) distinguishes the small HVG outcome panel from approximately 62K-feature DE tables. These sources do not prove which exact code revision produced the uploaded shard.

A predictive pilot can use the released control means as named covariates and score released response deltas without converting their units. It must say so. **Do not add control means to response deltas as absolute endpoints, infer count changes, or claim independently selected full-transcriptome outcomes until scale and feature provenance are resolved.** Control summaries cannot recover within-cell covariance, cell-level PCA, individual counterfactuals or recovery trajectories. Cell-line differences do not isolate cell identity from protocol or ancestry.

## Frozen next input and scope

Before any perturbation response values were read, `FROZEN_INPUT_SELECTION.json` was written at **2026-09-10 05:29:33 UTC**. It assigns all 50 entire cell lines to five ten-line outer folds, by a fixed hash rule, and selects **plate 1** by its identifier. Its SHA256 is `ece92b478467bc0fe9d4b80ea59f07928cc78b3aec6e5b565387ea2106ad0930`. This is a local selection record, not external preregistration. The exact model/rejection equation is still a draft; freeze that separately before opening response values.

The [pinned plate-1 response shard](https://huggingface.co/datasets/tahoebio/tahoe-de-rhaister/resolve/c7963cf334bec0683225d41c9586d900ca6303a2/cell_eval/plate_plate1.parquet) is verified in publisher metadata as **65,704,666 bytes**, SHA256 `496a7727899fd16a590e535f6a3007f3ded6f120ad2aa10edc2f5a30ea924c16`. It has **not been downloaded or read by this agent**. Its next permitted inspection should concern schema, measurement IDs and treatment/dose design only. No performance-based plate or target selection.

`NEXT_EXPERIMENT_DRAFT.md` proposes predicting **when transfer will fail**, with source-only fitting/calibration and matched risk-versus-coverage comparisons. All drug-response observations from an outer-test cell line must be excluded from training. That cell line's known plate-matched controls remain valid inputs. Published composition-holdout splits that keep other responses from the same test line are a different task.

## Why the original HepG2/Jurkat route is still open

The [Nadig Figshare record](https://doi.org/10.6084/m9.figshare.29498366.v1) has LFC, error and p-value matrices, not absolute basal means. The known original GEO single-cell H5ADs remain above the 250-MB/file acquisition bound; the earlier direct metadata requests failed TLS validation. No verified small matched extract emerged in this follow-up.

The [Replogle-Nadig Rhaister release](https://huggingface.co/datasets/tahoebio/replogle-nadig-de-rhaister) is CC BY 4.0 and has batch-level control `ref_mean` inside its DE table, but the checked [file listing](https://huggingface.co/datasets/tahoebio/replogle-nadig-de-rhaister/tree/main/pdex) contains one approximately 29.8-GB Parquet file. A complete bounded projection route was not verified or attempted. Its feature indices also require the supplied name map. The public filter API can have partial indexing on large datasets; a small returned page would not demonstrate complete matched controls.

The [decomposition repository](https://github.com/xinyizhanglab/perturbation-decomposition) advertises small processed files, but the actual complete tree at `a15214780619736d393f40240e56ba992fd416a3` contains only preparation scripts under `data/`. No processed directory or LICENSE file is present; the LICENSE URL returned 404. The [export script](https://github.com/xinyizhanglab/perturbation-decomposition/blob/a15214780619736d393f40240e56ba992fd416a3/data/prepare_release.py) would save a control mean on an inherited HVG axis, not full-feature individual controls. A README claim alone is not a downloadable input.

## Prior work and claim boundaries

[Rhaister-O](https://huggingface.co/tahoebio/Rhaister/blob/main/docs/zeroshot_architecture.md) already uses basal-expression modulation, response subspaces and shrinkage. Its [loader](https://huggingface.co/tahoebio/Rhaister/blob/main/rhaister/prepare_combined.py) explicitly builds control-only references and removes held-out cell-line responses. Those are baselines to credit and reproduce, not inventions of this programme.

The [2026 TFM study](https://www.biorxiv.org/content/10.64898/2026.06.28.735106v3.full) already studies geometry changes and training-support diversity; the [decomposition study](https://www.biorxiv.org/content/10.64898/2026.07.24.740459v1.full) already compares control/perturbation/random subspaces and context interactions. This audit establishes usable inputs and a narrower testable direction. It supplies no new superiority, causal-identification or IDA biology result.

## Local commands

With Python, NumPy, pandas and PyArrow installed, from this directory:

```text
python acquire_tahoe_controls.py
python audit_tahoe_controls.py
python verify_control_extract.py
```

The first command needs the saved small publisher metadata and uses no credentials. The latter commands are offline. Avoid rerunning the audit after response inspection and presenting its regenerated selection timestamp as the original freeze; preserve the original selection record and hashes. `CONTROL_AUDIT.json` and `CONTROL_EXTRACT_VERIFICATION.json` record the completed run. Do not upload the 186-MB original file as part of a compact report.
