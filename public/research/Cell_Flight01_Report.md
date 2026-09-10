# Virtual Cell / Flight 01

10 September 2026 · The Empirical Architecture · Daniel J. Murray

**We built and ran a reproducible test of gene-response transfer. The first proposed adjustment failed its success threshold.** The useful product is an inspectable experiment, a public learning tool and a precise next research question. There is no demonstrated IDA biological advantage or official Virtual Cell Challenge result.

[Explore the recorded experiment](https://empirical-observatory.madmanmuzza.chatgpt.site/cell) · [Code and complete results](https://github.com/thantiklermcirony/empirical-observatory/tree/main/research/virtual-cell) · [Reproduction package](https://empirical-observatory.madmanmuzza.chatgpt.site/research/Virtual_Cell_Flight01.zip)

## What was tested

Four author-published log2-fold-change matrices—K562, RPE1, HepG2 and Jurkat—were aligned on **2,052 target genes and 6,642 measured genes**. Each whole context was held out in turn. Parameters were selected only inside the three remaining contexts. The experiment compares no change, a generic shared response, same-target mean transfer, global amplitude shrinkage and an adjustment based on source disagreement. A fixed label permutation supplies a negative control.

The protocol, including failure criteria and missingness rules, was frozen before fitting. Historical ingestion corrections are retained. Predictions were saved and hashed before outer scoring. This is a procedural audit trail, not an external preregistration or tamper-proof commitment.

## Complete primary result

Mean squared error on the authors' log2-fold-change scale; lower is better. Every method uses the same finite-truth mask. Each of the 2,052 targets receives equal weight within a context.

| Held-out context | No change | Shared response | Mean transfer | Global shrinkage | Disagreement adjustment |
|---|---:|---:|---:|---:|---:|
| K562 | 0.093918 | 0.116175 | 0.164247 | **0.089983** | 0.097091 |
| RPE1 | 0.342593 | **0.305206** | 0.311487 | 0.322190 | 0.312956 |
| HepG2 | 0.235112 | **0.211724** | 0.223184 | 0.216921 | 0.212912 |
| Jurkat | 0.144101 | 0.157189 | 0.198440 | **0.137818** | 0.143115 |
| Equal-context mean | 0.203931 | 0.197574 | 0.224340 | 0.191728 | 0.191518 |

The adjustment's overall gain over global shrinkage is about **0.11%**. It loses to the best conventional method in every individual context. The prespecified requirement—at least 10% improvement in at least three contexts—fails. No post-result retuning was used to replace this outcome.

## Patterns worth pursuing

**Direction and size are different claims.** For a positive scalar, `cos(alpha * p, y) = cos(p, y)`. Shrinking a prediction changes its size but cannot rotate it. The adjustment's zero predictions made cosine undefined for 16, 30, 70 and 23 targets; those targets left the average. On identical defined targets, direction similarities agree within 7e-9. An apparently better mean direction score therefore did not show better directions. The explorer makes this standard geometric fact visible on real data.

**Correct identity helps, but is insufficient.** Same-target transfer beats the shuffled-label control in all four contexts. It still loses to no change in two contexts and a generic response in the other two. A deliberately damaged comparator is a useful diagnostic, not the strongest bar for success.

**Low selected error can mean weak effects.** Restricting evaluation to apparently safe targets lowers errors for simple baselines too. All models must be scored on the same retained targets. Relative disagreement separates the contexts differently, but the nested slices are correlated diagnostics, not dozens of independent replications.

**The destination is missing information.** The current predictors see source response matrices but no basal measurement of the held-out cell context. Whether correctly matched destination measurements can explain when transfer should be preserved or reduced is the next test. Context conditioning and response decomposition have substantial prior work; they are not claimed as new inventions here.

## A separate paired check

Two Replogle pseudobulk datasets yield 1,977 shared constructs across 1,874 target genes and 7,226 measured genes. On the primary shared-gene view, copying responses has 1.0371 times the no-change error from K562 to RPE1, and 3.5991 times in reverse. The transfer error itself is symmetric; the ratios differ because target response magnitudes differ. A secondary source-control top-1,000 view improves one direction but fails badly in reverse. All four views are retained in the paired package.

## What the checks establish

Twelve behavioral tests cover data boundaries, missingness, identity and numerical edge cases. Independent audits verify scalar arithmetic, model comparisons and shared selection masks. A complete run of the portable release reproduces **all 8,208 target-level result rows exactly**. The core CPU model runs took approximately 105 and 107 seconds after preparation; network and data preparation are additional. These are internal software and numerical checks, not independent biological replication.

Four main input files total 696,580,762 bytes. Publisher MD5 checks and recorded SHA256 hashes identify the inputs. Large data and prediction matrices are downloaded/generated locally; they are not bundled into the small public package.

## Limits and next gate

The outcomes are noisy author-published population estimates, not recovered cellular ground truth. Missing truth is not imputed as zero. Unsupported source coordinates receive a flagged no-change prediction that remains scored. Author preprocessing and label intersections limit the assessed population. Four selected contexts confound cell identity, assay and protocol differences; context is not a separately identified biological cause.

The service contract for the 2026 Virtual Cell Challenge requires raw-count cell predictions and provider access. This LFC study does not satisfy that submission contract and has no challenge score. Basal-control extracts for HepG2/Jurkat were not verified through the checked archives; failed metadata access is recorded. No paid compute, challenge signup or submission was performed.

The next release must acquire properly licensed destination measurements, preserve assay and estimation-noise controls, compare matched conventional methods and reserve fresh independent validation. These four contexts are now development data. Useful outside contributions include independent reproduction, measurement counterexamples, licensed adapters and stronger comparators under the same information budget.

## Sources and licenses

Nadig and colleagues, [author LFC archive](https://doi.org/10.6084/m9.figshare.29498366), CC BY 4.0; [original publication](https://doi.org/10.1038/s41588-025-02169-3). Replogle and colleagues, [paired author archive](https://doi.org/10.25452/figshare.plus.20029387), CC BY 4.0; [original publication](https://doi.org/10.1016/j.cell.2022.05.013). Author estimates are aligned, transformed and evaluated here; no author endorsement is implied. Original software uses the repository MIT license. Full literature and contract audits are in the source package.
