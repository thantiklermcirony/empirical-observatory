# Paired CRISPRi response-transfer reproduction

**Fixed response transfer fails the primary no-change comparison in both directions.** This package reproduces that result on two original Replogle experimental contexts. It contains portable CPU code, the protocol and compact reference results. It is a conventional baseline audit, not an IDA biology engine, a four-context admission-rule test or an Arc challenge submission.

## Run anywhere

Use Python 3.11 or later in a separate environment. The published run used Python 3.12.14; exact observed numerical-library versions appear in `reference-results/provenance.json`. `requirements.txt` gives installation ranges, not a complete lockfile or a claim that every allowed version has been tested.

From this package directory:

```sh
python -m venv .venv
# Activate .venv using the command appropriate for your shell.
python -m pip install -r requirements.txt
python download_inputs.py --workspace /path/to/local/virtual-cell-workspace
python run_paired.py --workspace /path/to/local/virtual-cell-workspace
python verify_paired.py --workspace /path/to/local/virtual-cell-workspace
```

For PowerShell, a concrete equivalent after activating the environment is:

```powershell
$env:VIRTUAL_CELL_WORKSPACE = "C:\research\virtual-cell-workspace"
python download_inputs.py
python run_paired.py
python verify_paired.py
```

On POSIX shells, `export VIRTUAL_CELL_WORKSPACE=/path/to/local/virtual-cell-workspace` works the same way. CLI `--workspace` overrides that environment variable. With neither set, the default is `./virtual-cell-workspace` relative to the current working directory. Inputs go under `data/`; generated artifacts go under `paired-results/`. `--data-dir` and `--results-dir` override those locations independently. These paths do not depend on where a containing Git repository or website is checked out.

`download_inputs.py` is optional when you already have the two input files. It retrieves exactly the two source names in `sources.json`, totaling **175,117,500 bytes**, with default TLS verification, no account and no payment. It checks expected bytes, publisher MD5 and the independently recorded SHA256. Existing matching files are verified and reused; mismatches and incomplete downloads are preserved for inspection. Network retrieval of this portable downloader was not repeated during packaging; the original download succeeded and its existing-file verification path was exercised.

Both analysis commands are offline. `verify_paired.py` needs the full locally generated results and original inputs; the compact `reference-results/` folder alone is intentionally insufficient to recalculate every metric. To verify a previous run without writing into its directory, supply `--verification-output /path/to/new-verification.json`.

## Authors, source data and licenses

Original data authors: **Joseph Replogle and Jonathan Weissman**. Cite Replogle et al., *Mapping information-rich genotype-phenotype landscapes with genome-scale Perturb-seq*, Cell (2022), [doi:10.1016/j.cell.2022.05.013](https://doi.org/10.1016/j.cell.2022.05.013), and the [versioned data deposit](https://doi.org/10.25452/figshare.plus.20029387.v1).

The publisher's [actual metadata record](https://api.figshare.com/v2/articles/20029387) assigns **CC BY 4.0** to these files. `sources.json` records original URLs, exact byte sizes and both hashes. The source matrices were analyzed and transformed as described below; attribution does not imply author endorsement. The small data-derived result files retain the source attribution requirement. The original reproduction scripts and documentation were prepared for Empirical Architecture and are provided under the included MIT license. This package incorporates no third-party model code or weights.

| Input | Bytes | Direct source |
|---|---:|---|
| `K562_essential_raw_bulk_01.h5ad` | 79,766,954 | [Figshare file35773070](https://ndownloader.figshare.com/files/35773070) |
| `rpe1_raw_bulk_01.h5ad` | 95,350,546 | [Figshare file35775581](https://ndownloader.figshare.com/files/35775581) |

## Measurement and split contract

K562 has 2,285 population rows × 8,563 measured genes; RPE1 has 2,679 × 8,749. There are **7,226 shared measured genes**. Rows are construct/promoter-specific `gene_transcript` identities, rather than individual cells. Of 2,171 common targeted construct IDs, requiring at least 20 filtered cells in each context leaves **1,977 constructs across 1,874 target genes**. The selector uses IDs and coverage metadata, with no knockdown, DE, energy-test or effect-size threshold. Identical published row IDs are matched; guide sequences were not separately checked.

Controls use the publisher's 97 K562 and 113 RPE1 `core_control` construct summaries, representing 10,691 and 11,485 filtered cells. `X` contains fractional population means. Across both complete matrices, multiplication by `num_cells_filtered` is consistent with integer count totals within float32 error. This supports the mean interpretation but does not recover individual cells.

Control means are pooled using filtered-cell counts. The declared transform is natural `log1p(10000 × pseudobulk mean / sum over shared measured genes)`. It is a transform of population means, **not mean log-expression across individual cells**, not raw integer counts, and not the DESeq2 LFC scale used in the separate four-context experiment. The shared feature universe inherits the publisher's global >0.01 UMI/cell gene filter. This source filtering was not fitted inside our folds.

K562 was measured at day6 with dCas9-KRAB; RPE1 at day7 with ZIM3 KRAB-dCas9. Cell identity, repressor and timing are confounded. Neither control constructs nor target genes count as independent biological contexts.

`PROTOCOL.json` was fixed locally before these comparisons; it was not externally preregistered. In each direction, the predictor receives source responses and target controls. The three models have no tuned parameters:

- No-change: zero response relative to target control.
- Same-construct transfer: source construct response relative to source control.
- Permuted-construct transfer: the same response after a seeded different-gene label permutation, serving as a descriptive negative control.

The primary view scores all shared genes except the perturbed gene. The secondary view selects the top1,000 genes by **source-control abundance only**, excluding the perturbed gene. MSE is averaged within each target gene across its constructs, then equally across target genes. No target perturbed expression selects the secondary features.

## Reference results: every prespecified view

Ratios below one favor transfer over no-change. All 12 model/view/direction summaries are included in `reference-results/summary.json`.

| Direction and view | No-change MSE | Transfer MSE | Transfer/no-change | Permuted/no-change |
|---|---:|---:|---:|---:|
| K562 → RPE1, primary all shared | 0.0128103 | 0.0132852 | **1.0371** | 1.2218 |
| RPE1 → K562, primary all shared | 0.00369126 | 0.0132852 | **3.5991** | 4.1890 |
| K562 → RPE1, secondary top1,000 | 0.0356304 | 0.0320243 | **0.8988** | 1.1296 |
| RPE1 → K562, secondary top1,000 | 0.00760372 | 0.0362281 | **4.7645** | 5.7474 |

Correctly matched transfer has mean construct-level response Pearson 0.1658 on the primary view, versus about 0.05 for the fixed permutation. No-change correlations are undefined, retained as such. Pattern correspondence does not make uncalibrated transfer a reliable improvement over no-change. One permutation is not a significance test. The secondary positive result must be shown alongside its reverse failure and both primary failures.

**Symmetry caveat:** primary transfer MSE is necessarily identical in both directions because squared distance between two response vectors is symmetric. Different ratios reflect the different target response magnitudes; they are not two independent validations of a directional mechanism. Neither the relative error nor the correlation demonstrates causal identification or a universal scientific principle.

## Verification and package contents

The original run took about **16.02 seconds** on the recorded CPU environment, excluding interpreter/import startup. It generated 23,724 construct-level records. All **96 independent standard-library MSE checks** passed (maximum absolute difference `1.39e-17`). All **18 independent checks** of gene-macro reduction, per-construct symmetry, undefined correlations, permutation integrity, target-gene exclusion and weighted control normalization passed.

Packaging changed only command-line/path handling in the analysis and verifier. `PORTABILITY.patch` shows the exact change. All analysis helper function syntax trees remain identical to the original run. The portable verifier was executed against the existing full artifacts and passed all 18 checks again; the large analysis was not needlessly rerun. `RELEASE_VALIDATION.json` records these limits and both source hashes. The historical `reference-results/provenance.json` describes the original script and keeps its original hash; it is not relabelled as a run of the portable script.

- `run_paired.py`, `verify_paired.py`, `paired_paths.py`: portable analysis and independent verifier.
- `download_inputs.py`, `sources.json`: optional bounded, checksum-pinned data route.
- `PROTOCOL.json`, `requirements.txt`, `LICENSE`: methods, environment ranges and code/data terms.
- `reference-results/summary.json`: complete aggregate results.
- `reference-results/input-audit.json`: compact source-scale and checksum audit.
- Other reference JSON: the original arithmetic/independent checks, historical provenance and rerun portable verification.

Large inputs, full feature vectors, selectors and construct-level score tables are generated locally and are not bundled. This leaves a small reviewable package without hiding how to reproduce the full result. Conventional amplitude calibration and multi-source models are sensible next comparators, but their tuning requires a separate declared protocol. No four-context admission result, single-cell distribution prediction or challenge score is claimed here.
