# Flight 02: independent results audit

10 September 2026. **The saved results are arithmetically consistent, and the predeclared practical advantage gate failed.** At nominal 75% coverage, context-local risk ranking reduced equal-line mean-squared error by **0.1333417%** relative to the globally strongest conventional ranking. The required reduction was **10%**, together with wins against each fold's best conventional ranking in at least four folds. Only **one of five folds** passed that comparison.

The candidate MSE was `0.0006687143300411206`; source-disagreement ranking achieved `0.0006696071958788379`. The absolute reduction was `0.000000892865837717337`. This is a small descriptive difference, not a statistical-significance finding. No significance test or new model fit was performed by this audit. The result supplies no evidence of a major improvement or a new biological mechanism.

## What was independently verified

The audit used the pinned response table and the saved prediction arrays, without importing the production pipeline, refitting, retuning or changing thresholds.

- Rechecked **15 output hashes**, all **four input hashes**, production hashes against the execution/publication records, and **six frozen prior-review hashes**.
- Confirmed 50 cell lines, 92 exact drug/dose identities and 2,000 genes; **4,443 observed pairs** and **157 absent pairs**, with disjoint observed/missing ledgers. No absent value was invented or scored.
- Verified all **8,886,000 observed expression values** and all numeric prediction-archive entries are finite.
- Recomputed every per-pair mean/zero/ridge prediction loss from raw outcomes and saved predictions. All **4,443 rows matched exactly**.
- Reconstructed every deterministic/hash-random retained ordering and independently recomputed all **20,800 mask records**, including same-mask zero and descriptive-ridge comparisons. Largest numerical difference was approximately `5.2e-18`.
- Reaggregated every line, fold and overall score, averaging random repeats within line and weighting lines equally. All match the published run files. At 100% coverage, all ranking strategies have the same base-prediction loss.
- Verified source/test identities are disjoint for each outer fold, inner manifests exclude their whole validation groups, and source support matches observed input identities. Prediction-record timestamps fall after publication and before run completion; their save-before-scoring flags match the previously tested runner's behavior. These record checks complement the earlier synthetic influence tests; they are not a new randomized biological validation.

`AUDIT.json` retains the checks, precise comparisons and exploratory patterns. `line-comparisons.json` contains independent line-level aggregates. `audit_actual.py` reproduces this audit in the existing input/output layout.

## Mean, zero and ridge on identical retained cases

The table uses **MSE multiplied by 1,000** for readability. Within each row, all three predictors use exactly the same observations. The ridge predictor is the fixed conventional descriptive comparison specified before the run; its apparent benefit is not the primary ranking result.

| Retention rule | Mean predictor | Zero response | Descriptive ridge | Mean reduction vs zero |
|---|---:|---:|---:|---:|
| Full coverage, all rules | 1.823771 | 1.900330 | 1.810551 | 4.0287% |
| Candidate, nominal 75% | 0.668714 | 0.750053 | 0.637351 | 10.8444% |
| Disagreement, nominal 75% | 0.669607 | 0.751725 | 0.637851 | 10.9239% |
| Treatment-only LOO risk, nominal 75% | 0.669607 | 0.751725 | 0.637851 | 10.9239% |
| Magnitude, nominal 75% | 0.679363 | 0.757494 | 0.648351 | 10.3144% |
| Random, nominal 75% | 1.824315 | 1.901334 | 1.810981 | 4.0508% |

At full coverage the source mean reduces error by **4.0287%** against zero; ridge reduces it by **4.7244%** against zero, or **0.7249%** against the mean. On the candidate's selected mask, ridge reduces error by **15.0259%** against zero, or **4.6901%** against the mean. These are descriptive comparisons from the declared secondary predictor, not evidence of a new IDA model.

Both candidate and ordinary disagreement selection remove many difficult predictions: their nominal-75% risks are respectively **63.3444%** and **63.2954%** below hash-random selection. The large reduction against random therefore comes almost entirely from a benefit that the conventional ranking already captures. Selecting low-error cases also lowers the error of predicting zero. Indeed, the candidate's mean-versus-zero percentage improvement is slightly smaller than disagreement's on their respective masks. Do not present raw selected-risk reduction alone as improved biological prediction skill.

## Frozen fold comparison

The overall comparison uses one globally strongest conventional strategy. The fold gate deliberately uses each fold's own strongest conventional score as a conservative descriptive envelope.

| Fold | Best conventional rule | Candidate reduction vs that fold's best |
|---|---|---:|
| 0 | Disagreement | -0.2137% |
| 1 | Magnitude | -0.4265% |
| 2 | Magnitude | -0.0171% |
| 3 | Disagreement | +0.0077% |
| 4 | Magnitude | -0.4333% |

Negative values mean the candidate was worse. The one fold win is small. These five fits share training lines, and the 50 cancer lines need not be independent biological contexts. The engineering gate is not a p-value; millions of gene entries do not supply millions of independent replications.

## Exploratory patterns, with no change to the experiment

At nominal 75% coverage, the candidate and disagreement retain identical treatment sets in **19 of 50 lines**. Among the 31 changed masks, candidate risk improves in 20 lines and worsens in 11. At 90% coverage they agree in 45 lines; at 50% they agree in 10. None of the exact score ties crosses a 75% retention boundary, so that primary difference is not an arbitrary tie-breaking artifact.

Disagreement and treatment-only leave-one-out risk produce identical retained sets at every checked line and coverage. This is consistent with their known algebraic relationship, and they should not be counted as independent baseline ideas. Inner tuning selects the uniform treatment-only candidate for fold 2, while other folds select different local/shrinkage settings. That heterogeneity does not establish a stable context effect.

Each line has 83–92 observed treatments. The ceiling rule makes mean actual coverage **75.4237%**, despite the nominal label of 75%; all methods share the same retained count within a line. Missingness remains unexplained, and no inference is made for the 157 unobserved pairs. These observations are descriptive follow-up checks, not grounds for selecting a new favorable subset or changing the failed gate.

## Provenance and limits

The execution freeze is timestamped **06:37:09 UTC**, the publication verification **06:38:36 UTC**, and run completion **06:39:27 UTC**. The publication record identifies [GitHub commit ee0a2ab](https://github.com/thantiklermcirony/empirical-observatory/tree/ee0a2ab0ce697e2ced11e57564cc23bd95b696af/research/virtual-cell-flight02/experiment). This audit checked local file hashes against that record; it did not repeat the owner's remote publication retrieval. Protocol version/status changed to frozen before execution; the reviewed model code hashes remained unchanged.

**Disclosure correction:** the frozen manifest mentions a count of five rows in an incidental external preview. That count was not established. The accurate description is **a default plate-10 PDEx preview**, outside this plate-1 study and unused for its design. The frozen manifest is preserved; this correction is appended rather than rewriting history.

The study concerns released deltas at one drug dose in one chemical-screen plate, using supplied DMSO summaries as covariates. Exact normalization and upstream selection of the 2,000-gene outcome panel remain unresolved; controls and deltas may share measurement noise. Predictions are not counts or absolute expression, and the data do not identify a causal mechanism. Preserve the complete negative primary result and the modest conventional-baseline results together.
