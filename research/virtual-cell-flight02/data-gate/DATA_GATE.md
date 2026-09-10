# Flight 02: input and interpretation gate

10 September 2026. **The frozen input passes the schema and identity gate for a predictive study of released response deltas.** It does not pass a gate for reconstructing absolute expression, estimating dose-response curves, or establishing a biological mechanism. No numeric column or expression statistic from the frozen plate-1 response file was decoded by this audit. The model and scoring protocol must be frozen separately before that boundary is crossed.

## What can be predicted

For cell line `c`, the exact compound/dose/unit label `t`, and publisher gene `g`, define `Y[c,t,g]` as the value in the released plate-1 `cell_eval` table. Define `X[c,j]` as the released plate-1 DMSO `ref_mean` for control feature `j`, in its supplied covariate units. The task is to predict `Y` in a cell line whose entire drug-response data are excluded from fitting, while its matched controls are available. Treatment responses from other cell lines are the training evidence.

This is a legitimate supervised prediction task without requiring identical scales for predictors and outcomes. Fit `Y_hat = f(X, t)`; **do not calculate `X + Y_hat`**, divide deltas by supplied library means, infer count changes, or relabel these values as DESeq2 log-fold changes. Scaling a predictor within a training-fitted model is a statistical operation; it does not establish a biological normalization. This audit does not specify a new IDA biological engine.

The estimand is the released measurement among the observed pairs in this one plate, on a fixed publisher panel. It is not an average over missing pairs, independent biological experiments, new drugs, other doses, tissues, or individuals. Experimental treatments support studying measured response differences; success in cross-cell-line prediction would not itself identify a causal mechanism or resolve cell-line/protocol confounding.

## Actual design, inspected without outcomes

The pinned file is 65,704,666 bytes, SHA256 `496a7727899fd16a590e535f6a3007f3ded6f120ad2aa10edc2f5a30ea924c16`. It matches the input selected at 05:29:33 UTC before plate-1 response inspection. Its schema contains 2,000 double-valued gene fields and the two string identifiers `cell_line` and `treatment`; there is one row group. The preflight decoded only those two identifiers. The SHA256 computation read file bytes without interpreting expression values.

| Design property | Verified result |
|---|---:|
| Cell lines, all assigned to the frozen folds | 50 |
| Distinct compounds and exact treatment labels | 92 |
| Dose of every treatment | 0.05 uM, equivalently 50 nM |
| Mixtures / DMSO response labels | 0 / 0 |
| Unique observed cell-line/treatment pairs | 4,443 |
| Missing pairs from a 50 by 92 grid | 157 |
| Treatments observed in every cell line | 82 |
| Other treatment support | 22, 23, 24, 28, 31, 31, 40, 47, 48, 49 lines |
| Duplicate pairs, invalid labels, treatment aliases | 0 |
| Response genes absent from control feature panel | 0 |
| Response lines lacking matched control identities | 0 |

All labels parse as a one-element list containing `(compound, concentration, unit)`. Preserve the original strings as keys; `Erdafitinib ` includes a trailing space. Do not silently trim or collapse identifiers. No case requires a mixture interpretation, and this plate has no dose variation to fit.

| Frozen outer fold | Source lines per treatment | Held-out lines per treatment | Observed test pairs |
|---|---:|---:|---:|
| 0 | 17–40 | 4–10 | 891 |
| 1 | 17–40 | 5–10 | 893 |
| 2 | 18–40 | 3–10 | 883 |
| 3 | 18–40 | 3–10 | 883 |
| 4 | 16–40 | 4–10 | 893 |

Every treatment has source support in every fold. The missing-pair map and all exact labels are retained in `DESIGN_SUMMARY.json` and `SCHEMA_PREFLIGHT.json`. Missingness can depend on upstream filtering, cell survival, or measurement quality; this schema does not identify its cause. Never fill missing outcomes with zero, and do not present observed-pair evaluation as unbiased performance over all 4,600 potential pairs.

## Scale and feature provenance

The publisher describes `cell_eval` as pseudobulk treated-minus-control differences and labels its scale linear-normalized. It separately provides plate-matched DMSO means. The release declares CC0-1.0; credit Tahoe Bio and Jesse Zhang, Airol A. Ubas, Richard de Borja, Valentine Svensson and colleagues. The original screen is chemical perturbation, distinct from the earlier Nadig CRISPRi work. [Publisher dataset card](https://huggingface.co/datasets/tahoebio/tahoe-de-rhaister/blob/c7963cf334bec0683225d41c9586d900ca6303a2/README.md)

The current official preparation code applies `log1p` to its HVG matrix before averaging; its full-feature branch normalizes each cell to a configured total and then applies `log1p`. It subtracts the within-group control mean, omits control rows, and skips groups missing controls. This contradicts a simple linear-scale reading of the card. Its final arrays are float32 whereas this released shard has double-valued fields; casting elsewhere could explain that, so dtype alone does not settle provenance. The code is evidence of the documented preparation path, not proof of the exact uploaded artifact's generating revision. [Official preparation code](https://huggingface.co/tahoebio/Rhaister/blob/5a72781ae3313e21c9a549e0f04047a841091ff0/scripts/data_prep/compute_celleval_deltas.py)

The preparation README explicitly separates the approximately 2K HVG outcome panel from the approximately 62K DE panel and specifies within-plate controls. Consequently, these 2,000 genes must be called the fixed publisher outcome panel. Their selection independently of the eventual test responses has not been established. This is distinct from fitting input feature selection, centering, scaling or dimensionality reduction using source controls alone. [Official preparation README](https://huggingface.co/tahoebio/Rhaister/blob/5a72781ae3313e21c9a549e0f04047a841091ff0/scripts/data_prep/README.md)

## Conditions for the next permitted run

1. Freeze the exact model equations, baselines, hyperparameters or source-only tuning procedure, rejection score, tie handling and scoring aggregation. The existing local input freeze is not external preregistration and does not substitute for this protocol.
2. Retain all 4,443 observed pairs in the primary design. Train on whole source cell lines only; fit all feature transforms and thresholds in source data. Do not fit PCA on all 50 controls if claiming a strictly training-fitted representation. Test controls may be transformed by the frozen source-fitted map.
3. Use the same test pairs and 2,000 genes for every prediction baseline. A plain source treatment mean and zero-delta baseline are meaningful checks. Explain any gene-standardized secondary score as a different metric. Weighting and uncertainty units must be specified: millions of gene entries are not millions of independent experiments.
4. Once outcome access is authorized by the frozen protocol, check finite values and expected shapes before fitting. Fail explicitly on unexpected numeric validity rather than select a favorable subset or improvise imputation. The current schema-only pass makes no assertion about finite numeric contents.
5. Evaluate only observed held-out pairs, retaining the missingness limitation. Support-based restrictions or a complete-grid secondary analysis must be specified from design metadata before outcome inspection. No restriction is required here to avoid unseen treatments.
6. Keep the absolute-endpoint and mechanism gates closed. Exact source preprocessing, independent control replicates, and treatment/control uncertainty would be needed for stronger interpretations. A shared control mean in predictors and delta construction can create measurement coupling; predictive improvement would not establish that the model learned a biological interaction. Independent split controls would test this but are not available in these summary inputs.

Rhaister already provides control-conditioned zero-shot architecture; ordinary basal conditioning is prior work. The proposed study should be framed as a bounded comparison and reliability test, with its result allowed to be negative. [Official zero-shot architecture](https://huggingface.co/tahoebio/Rhaister/blob/main/docs/zeroshot_architecture.md)

## Access record and reproducibility

`schema_preflight.py` reads only Parquet schema plus `cell_line` and `treatment`. It reads control identities and feature names, not control numeric arrays. `summarize_design.py` opens only the resulting audit JSON. The original freeze SHA256 is `ece92b478467bc0fe9d4b80ea59f07928cc78b3aec6e5b565387ea2106ad0930`; it was not modified.

An attempted documentation check on the publisher's dataset landing page unexpectedly rendered its default **plate-10 PDEx preview**, including numerical statistics for a compound outside this frozen plate-1 panel. Those incidental values were not used for design, selection, model choice or analysis. The access event was immediately reported to the parent and is recorded in `ACCESS_LOG.json`. Accordingly, claim **no frozen plate-1 response values were inspected**, not that no response of any kind ever appeared. No further dataset viewer browsing is needed.

Run the metadata audit with Python, NumPy and PyArrow, substituting paths to the unchanged inputs:

```text
python schema_preflight.py --response plate_plate1.parquet --frozen ../../virtual-cell-next/FROZEN_INPUT_SELECTION.json --controls ../../virtual-cell-next/controls-plate1.npz
python summarize_design.py
```

The preflight writes only its own directory and does not fit or evaluate a model. Do not redistribute the 65-MB response file as part of a compact evidence report; its pinned source and checksum suffice for reproducible acquisition.
