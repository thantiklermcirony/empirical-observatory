# Virtual Cell / Flight 02: does starting-state information help us choose predictions?

**The added context rule did not meet its success gate.** At 75% nominal retention, its error was 0.1333% lower than the strongest conventional ranking, against a frozen target of at least 10%. It beat each fold's strongest conventional comparison in one of five folds; four were required. No model or threshold was changed after this result.

## What was tested

We asked whether errors seen in source cell lines with similar control profiles help identify the safer drug-response predictions in a new cell line. Every primary ranking rule used the **identical source-treatment-mean predictions**. The candidate changed which predictions were retained; it did not change those predictions.

The released Tahoe plate contains 50 cancer cell lines, 92 exact compound/dose identities at 50 nM, 4,443 observed pairs, and 2,000 publisher-selected genes. The 157 absent pairs remained absent. Five frozen outer folds withheld ten whole cell lines each. Four inner blocks chose among ten declared local-risk settings; the source error ledger and control representation were rebuilt inside each inner split.

The [exact code and protocol were published](https://github.com/thantiklermcirony/empirical-observatory/tree/ee0a2ab0ce697e2ced11e57564cc23bd95b696af/research/virtual-cell-flight02/experiment) before decoding plate-1 numeric responses. Local freeze: 06:37:09 UTC, 10 September 2026. Public-source byte verification: 06:38:36 UTC. Evaluation completed: 06:39:27 UTC. This is a timestamped public protocol record, not an external preregistration.

## The complete primary comparison

Equal-cell-line mean squared error on the publisher's released response scale; lower is better. Nominal retention rounds up separately within each line.

| Ranking rule | 100% | 90% | 75% primary | 50% |
|---|---:|---:|---:|---:|
| Context-informed candidate | 0.001823771 | 0.000730213 | 0.000668714 | 0.000641806 |
| Source disagreement | 0.001823771 | 0.000732439 | 0.000669607 | 0.000646291 |
| Treatment-only residual risk | 0.001823771 | 0.000732439 | 0.000669607 | 0.000646291 |
| Predicted magnitude | 0.001823771 | 0.000768811 | 0.000679363 | 0.000654968 |
| Random retention, 100 permutations | 0.001823771 | 0.001825996 | 0.001824315 | 0.001817149 |

Most of the advantage over random selection is already available from conventional treatment difficulty. The two residual/disagreement baselines give identical rankings here; their algebraic relationship was declared before evaluation. They are not two independent discoveries. At 100% retention all ranking losses agree, as they must when the predictions are unchanged.

One fold selected uniform weighting, discarding context. Candidate and disagreement retained different sets in 31 of 50 lines: 20 improved, 11 worsened and 19 were identical. These line counts are descriptive, not a substitute for the frozen equal-line gate.

The base prediction contains some information: at full coverage, mean transfer had 4.03% lower error than zero response. On the candidate's exact 75% retained sets, its mean prediction had 10.84% lower error than zero response. A separately declared, fixed-alpha ridge predictor had 0.72% lower full-coverage error than mean transfer, and 4.69% lower error on those candidate masks. Ridge is a descriptive comparison, not the successful primary candidate and not a tuned model championship.

## Verification and limits

Nineteen implementation tests and eleven independent synthetic pipeline checks passed. The independent runner review checked held-out-response poisoning, prediction writes before scoring, and 8,320 synthetic retained sets. After execution, a separate arithmetic audit checked all four input hashes, fifteen output hashes, all 4,443 per-pair losses and all 20,800 retained sets against pinned responses and saved predictions. The largest mask-level rounding difference was approximately 5.2e-18. No refitting was needed for that audit.

This is one chemical plate, one dose, related cancer lines, and five overlapping-training fits. Genes are not independent replications. The control means and released response deltas have unresolved normalization provenance and may share measurement noise; they were never added together. The outcome panel was selected upstream, not independently inside our training folds. Retention fractions are not calibrated confidence levels. These results establish neither individual-cell dynamics, causal mechanism, IDA superiority nor a Virtual Cell Challenge score.

Disclosure correction: the frozen manifest describes an incidental default plate-10 PDEx landing-page preview as containing five rows. That row count was not established; the access record supports only that a default plate-10 preview was visible. It was not plate 1 and was not used to choose the method. The frozen file is preserved; this correction is additive.

## What this changes

The tested starting-state representation did not add enough ranking value over simple treatment difficulty. The next study should separate genuine context information from shared control noise and technical effects, using independent measurements and a newly frozen hypothesis. Neither this failed gate nor the previous one supports a broad claim that our framework already outperforms biological models.

The useful contribution is an inspectable test and a tighter next question: the same predictions, source-only fitting, explicit missingness, conventional comparators, and public negative results. Kernel residual regression, shrinkage, ridge prediction and related basal-expression methods are existing ideas; the implementation does not claim their invention.

[Pinned publisher data](https://huggingface.co/datasets/tahoebio/tahoe-de-rhaister/tree/c7963cf334bec0683225d41c9586d900ca6303a2) (publisher CC0) · [Research code and audit](https://github.com/thantiklermcirony/empirical-observatory/tree/main/research/virtual-cell-flight02) · [Interactive comparison](https://empirical-observatory.madmanmuzza.chatgpt.site/cell#flight02).
