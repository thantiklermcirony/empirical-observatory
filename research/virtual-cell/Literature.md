# What can transfer to an unseen cell context?

Research assessment, 10 September 2026. Primary papers and author code were inspected; no model, evaluator, CLI submission, or biological experiment was run in this research task. No large data or model downloads were made. Links to `main` are current observations, not immutable experiment dependencies.

The strongest first question is **whether disagreement among source contexts predicts the failure of response transfer to a new context**. This fits the frozen `EXPERIMENT_01.md` and the available author-published log2-fold-change matrices. It is a conventional, falsifiable prediction/reliability study. It does not yet test a controls-conditioned virtual cell, recover cell dynamics, or establish a new biological theory.

The binding first-study specification is [protocol.json](protocol.json), version 0.4 (the missing-aware response-transfer pilot; earlier versions are retained). Additional mechanisms and controls below are future or explicitly exploratory analyses; this literature note does not amend that frozen protocol.

The major opportunity is a careful decomposition of **what transfers, when it fails, and which extra observations would repair that failure**. The decomposition itself is established prior work. A July 2026 preprint and its [author repository](https://github.com/xinyizhanglab/perturbation-decomposition) already separate shared response, context, perturbation and interaction terms. Their cross-context code also distinguishes transferable components from target-context calibration. A positive result must therefore be attributed to a particular validated predictor or acquisition rule, not to inventing response geometry.

## Evidence that should shape the programme

| Primary source | What it supports | Limit on the inference |
|---|---|---|
| [Ahlmann-Eltze, Huber and Anders, Nature Methods 2025](https://www.nature.com/articles/s41592-025-02772-6); [author code](https://github.com/const-ae/linear_perturbation_prediction-Paper) | Strong linear and mean baselines belong in the comparison. Gene/perturbation embeddings can be assessed inside a matched linear predictor. | Their evaluated tasks do not prove that every later foundation model fails in unseen cell contexts. |
| [Wong, Hill and Moccia, Bioinformatics 2025](https://academic.oup.com/bioinformatics/article/41/6/btaf317/8142305) | Mean and intervention-informed controls can expose what a metric rewards. | Improvements driven by the directly targeted gene do not transfer unchanged to Arc's target-excluding metrics. |
| [Perturbation response decomposition, July 2026 preprint](https://www.biorxiv.org/content/10.64898/2026.07.24.740459v1.full) | Shared responses, including stress/growth effects, can dominate similarity; residual response prediction is a harder question. | Preprint findings in a restricted set of contexts/perturbations are not an impossibility theorem for control-only inference. Full text was available through search indexing; direct full-text access returned an error. |
| [TxPert author publication](https://www.valencelabs.com/publications/txpert-leveraging-biochemicalrelationships-for-out-of-distributiontranscriptomic-perturbation-prediction/); [code](https://github.com/valence-labs/TxPert) | Explicit basal-plus-perturbation prediction and biochemical perturbation priors are established comparators. | Public code does not reproduce every model using proprietary graphs. A comparison must name the available variant. |
| [State](https://github.com/ArcInstitute/state), [Stack](https://github.com/ArcInstitute/stack) | Context conditioning and information from collections of cells already have substantial prior work. | Code/checkpoint terms and training exposure need review before use. Stack's documented high-end GPU setup is not evidence that we have that hardware. |
| [Mao et al., in-the-wild benchmark, arXiv:2604.27646](https://arxiv.org/abs/2604.27646) | Context/perturbation/dataset shifts and metric disagreement require explicit evaluation. | Abstract-level assessment here; no independent reproduction of its results. |
| [Pre-registered external representation evaluation, arXiv:2608.26170](https://arxiv.org/abs/2608.26170) | Matched-capacity predictors, expression baselines and shuffled/random features are useful controls. | Its weak response-magnitude labels are a different endpoint from predicting complete cell-expression distributions. |
| [PertEMA author software](https://github.com/OfficialBishal/PertEMA) | Out-of-fold error prediction and selective reliability already exist. The authors explicitly report that a frozen reliability estimator fails across screens. | This is author-reported software evidence, not our replication or an unseen-context coverage guarantee. |

## Shared experimental contract

Let `c` be context, `p` perturbation, and `g` output gene. On a declared measurement scale, define a population response `d[c,p] = mean_perturbed[c,p] - mean_control[c]`. This is not a paired before/after trajectory of a cell. Published log2 fold changes can be used directly as response vectors in the present LFC study; they must not be silently treated as this difference on another scale.

For an unseen context, its permitted unperturbed controls may provide `z[c]`. Its perturbed outcomes cannot select features, fit a centroid, choose a hyperparameter, set an abstention threshold or normalize predictions. Outer folds hold out whole contexts; inner folds must do the same within the source contexts. A random cell split of the same condition tests a different problem.

Use equal condition/context weights for the primary comparison; also report cell-weighted sensitivity if cell counts are available. Fix output gene IDs and the rule for missing perturbations before outcome inspection. A same-target transfer model requires that target in source contexts. An unseen-target model requires a separately declared feature-based predictor and fallback; it cannot silently omit targets without embeddings.

The four-context result is descriptive evidence over four contexts. Cell or gene resampling does not create additional independent contexts. Differences in intervention technology, time, dose and processing remain alternative explanations. Our existing Norman development fixture is already exposed and is not an independent confirmatory test.

## Five falsifiable hypotheses

### H1. Source disagreement can guide shrinkage better than effect magnitude alone

**Runnable first on the frozen LFC study.** For a target with `m` observed source responses, use the equal-context mean `dbar[p]` and disagreement

```text
V[p] = mean_g sample_variance_c(d[c,p,g])
M[p] = mean_g dbar[p,g]^2
alpha[p] = max(1 - lambda * (V[p]/m) / M[p], 0)
dhat[p] = alpha[p] * dbar[p]
```

The frozen heuristic uses the positive-part formula above, zero prediction when `M=0`, and inner-fold selection of `lambda` from its fixed grid. It is not a calibrated Bayesian probability. Independently inner-tuned constant `alpha` is the global-shrinkage comparator. With only three source contexts, estimates of `V` are inherently coarse.

**Comparators:** zero effect; unshrunk same-target mean; inner-tuned global shrinkage. The frozen reliability analysis includes absolute/relative disagreement, source mean-effect magnitude and random rankings. A magnitude-only shrinkage predictor with the same tuning budget would be a useful separately labeled extension, not a frozen primary comparator.

**Separate mechanisms:** report variability of source norms and directional dispersion of nonzero unit responses independently. Raw disagreement can be high merely because responses are stronger. A positive scalar changes magnitude, but cannot improve cosine direction or cosine-based PDS except through zero/tie behavior.

**Falsifier:** disagreement does not improve held-out MSE beyond global shrinkage, or fails to rank risk beyond magnitude. A win only against zero does not establish context-aware reliability. The frozen gate requires at least 10% MSE improvement over the strongest eligible conventional comparator in at least three of four contexts without overall degradation. This is an engineering decision rule, not statistical evidence of universal transfer.

**Prior art:** statistical shrinkage is conventional; generic/context response separation is close prior art above. Do not label this an IDA-specific mathematical invention.

### H2. Separating a shared response from a predicted residual improves generalization

**Requires suitable perturbation features; control conditioning additionally requires raw controls.** Fit a source-only shared vector `T`, and a source residual matrix `R` whose rows are `d[c,p]-T`. Let `U_r` be its leading right singular vectors. Form bounded features `h[c,p]` from available perturbation features `e[p]`, control features `z[c]`, and explicitly limited interactions.

```text
B = (H.T H + lambda I)^(-1) H.T R U_r
dhat[c,p] = T + h[c,p] B U_r.T
```

This is ordinary ridge regression into a low-rank response basis. PCA centering and reduced-rank regression are established methods. Choose feature dimensions, rank and regularization in inner context folds only.

**Comparators:** source mean; full-output ridge with the same features; PCA/ridge on responses with its usual centering; no-context perturbation-feature ridge; a modest MLP with identical information and tuning budget. Include the authors' [factorized linear predictor](https://raw.githubusercontent.com/const-ae/linear_perturbation_prediction-Paper/main/benchmark/src/run_linear_pretrained_model.R) when its embeddings are available. The July decomposition repository's [ridge implementation](https://raw.githubusercontent.com/xinyizhanglab/perturbation-decomposition/main/models/ridge.py) is another exact conventional comparator.

**Falsifier:** gains disappear at matched rank/capacity, require a held-out response centroid, or improve residual correlation without improving full-response accuracy. Report both full response and the projection orthogonal to source `T`; never replace the official endpoint with the more favorable one. A low-rank fit need not represent a low-dimensional causal mechanism.

### H3. Basal cell heterogeneity adds transferable information beyond the control mean

**Not executable from the current LFC matrices alone.** Derive a fixed latent basis from source controls. Compare a control-mean feature vector with mean plus variances, selected quantiles and predeclared cell-state proportions in that basis. Keep cell count, predictor capacity and perturbation features matched.

```text
z_mean[c] = mean_i (x_control[c,i] U)
z_dist[c] = [z_mean[c], var_i(x_control[c,i] U), fixed quantiles]
```

Use the same source-fitted normalization/basis for target controls. A sensitivity study at fixed control-cell budgets distinguishes extra information from extra measurement depth. Pathway scores must use a predeclared external gene set or source-only selection; held-out responses cannot choose a useful stress signature.

**Comparators:** the same ridge/MLP with mean features; a TxPert-style raw-basal additive variant; control-nearest-context transfer; shuffled context-feature labels; technical/batch-only features when available. State or Stack is an additional comparator only after an actual reproducible, licensed inference path and training exposure are documented.

**Falsifier:** higher moments add no held-out gain, fail under cell subsampling, or are matched by batch features. This would constrain the proposed representation in these data, not show that controls can never identify response. Stack already uses multi-cell context: using a distribution is not novel by itself.

### H4. Apparent transfer skill contains a measurable generic stress/growth component

**Partly executable in LFC data; interpretation requires external annotations.** Fit a generic source response `T` and compare a model that only predicts its strength, `dhat[c,p]=a[c,p]T`, with target-specific predictions. Use a training-derived projection

```text
P_res = I - T T.T / (T.T T)       # defined only when T is nonzero
residual_response = P_res d
```

The generic-only baseline is an explicit alternative explanation, not a claim that stress is nonbiological. Add perturbation-label permutations within source-effect-strength bins to test target identity while approximately preserving the strength distribution. Freeze bins using sources; target response magnitude may only be a post-hoc reporting stratum.

**Comparators:** zero; generic-only; same-target mean; residual predictor. Report full and residual errors, external essentiality strata if legitimately available, and per-target coverage. Distinguish CRISPRi/a and differing efficiencies; do not pool them as interchangeable interventions.

**Falsifier of target-specific skill:** matched-strength target permutations retain the apparent improvement, or all improvement vanishes in the residual analysis. Conversely, loss under permutation plus residual gains supports specificity within the tested panel, not mechanism discovery. The July decomposition paper makes this a replication/extension question rather than new conceptual territory.

### H5. Source-only reliability estimates can identify failure in unseen contexts

**Begin with the simple risk ranking in H1.** If richer models are later justified, create error labels from out-of-context predictions within training data. Candidate prediction-time features are source disagreement, predicted-effect norm, distance from training perturbation/context features, model disagreement and control-resampling variability. Fit an error-ranker only on these out-of-fold predictions and their source outcomes.

**Comparators:** random ranking; predicted magnitude; nearest-training similarity; ensemble variance; a PertEMA-style gradient-boosting/isotonic model with the same information. In each outer fold there are very few independent training contexts; complex reliability models can simply overfit them.

**Acceptance endpoint:** risk-versus-coverage at prespecified coverages, with all-context/per-context curves and retained perturbation composition. Improving risk at equal coverage must beat the simple rankings. Report calibration error separately from ranking. Do not choose a favorable coverage after seeing the external result.

**Falsifier:** gains vanish in a whole-context holdout, improve only by rejecting an easy-to-recognize target class, or nominal confidence systematically fails. [Conformal prediction under covariate shift](https://arxiv.org/abs/1904.06019) requires additional assumptions/information; arbitrary new cellular contexts do not inherit a 90% coverage guarantee. Challenge predictions still require every perturbation: abstention is a user-facing reliability flag or triggers a frozen fallback, not row removal.

## What to build first

Keep the present LFC experiment bounded: the already-frozen H1 family, generic template/identity controls and descriptive risk ranking. It can answer whether three measured contexts provide useful warnings about a fourth. Direction-only disagreement, matched-strength permutations and richer confidence models are exploratory or future analyses unless independently frozen before their results are inspected.

If that signal survives, obtain appropriate raw controls and counts, then test H2/H3 without target-response access. Separately develop and validate a count-emission model. A pseudobulk point predictor cannot claim single-cell distribution accuracy merely because its vector has been repeated 400 times. Count generation, variability and biological prediction need separate ablations.

The eventual public demonstration should show the withheld context, the prediction committed before reveal, every comparator, and where the prediction failed. Neither a positive first study nor a higher challenge score alone establishes general causal reconstruction across biology.
