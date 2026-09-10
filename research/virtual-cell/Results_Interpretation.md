# The first transfer study failed its advantage gate

Independent read-only interpretation, 10 September 2026. Binding analysis: frozen protocol **v0.4**, SHA256 `d039550f4c31b4825a3361a710c859265f8ad1ca054e3c386d11032905020716`. This supersedes the v0.2 protocol reference in the earlier literature proposal. No fitting, hyperparameter changes, or new target subgroup searches were performed in this audit. New interpretations below are exploratory explanations of the frozen results.

The disagreement-based shrinkage candidate **did not beat the strongest conventional comparator in any of the four contexts**. Its equal-context average MSE is only **0.109% lower than global shrinkage**, reflecting gains in two contexts and losses in two. This does not satisfy the frozen requirement of at least 10% improvement in at least three contexts. It is a negative result for broad predictive advantage, with useful evidence about why the problem is difficult.

## All contexts, all main comparators

MSE is on author-published log2-fold-change estimates; lower is better. Every model uses the same finite-truth gene mask for each target. Each context includes all 2,052 common targets; the common gene-label panel contains 6,642 genes, with some author estimates missing.

| Held-out context | Zero | Generic template | Same-target mean | Global shrinkage | Candidate | Candidate versus best conventional |
|---|---:|---:|---:|---:|---:|---:|
| K562 | 0.093918 | 0.116175 | 0.164247 | **0.089983** | 0.097091 | 7.90% worse |
| RPE1 | 0.342593 | **0.305206** | 0.311487 | 0.322190 | 0.312956 | 2.54% worse |
| HepG2 | 0.235112 | **0.211724** | 0.223184 | 0.216921 | 0.212912 | 0.56% worse |
| Jurkat | 0.144101 | 0.157189 | 0.198440 | **0.137818** | 0.143115 | 3.84% worse |
| Equal-context mean | 0.203931 | 0.197574 | 0.224340 | 0.191728 | **0.191518** | Advantage gate failed |

All outer folds selected global amplitude 0.25 and heterogeneity penalty 1.0 using their source-only inner folds. The generic template wins in RPE1/HepG2 and loses even to zero in K562/Jurkat. This is consistent with important context dependence in shared response magnitude/pattern. It does **not** establish that the generic vector is specifically stress, proliferation or any particular mechanism; no pathway attribution was tested.

Correct target identity still contains information: the unshrunk same-target mean has lower MSE than its target-permuted control in **all four contexts**. Yet unshrunk transfer is worse than zero in K562/Jurkat and worse than the generic template in RPE1/HepG2. Beating a destructive permutation is weaker evidence than outperforming a useful predictor.

## Low retained error does not automatically mean reliable biological prediction

The frozen curves score **every model on the identical retained targets**. This is essential because choosing weak effects can lower error even for a model that always predicts zero.

- Absolute disagreement selects lower-error targets across all contexts. But zero and global shrinkage also have much lower errors on those masks; low source-effect magnitude gives similarly low retained errors. The curve cannot by itself establish additional biological skill.
- Relative disagreement has a different pattern. Across all ten frozen coverage levels, the candidate beats both zero and global shrinkage on the retained sets in RPE1/HepG2, and at none in K562/Jurkat. These nested masks are correlated observations, not forty independent experiments.
- Candidate advantage over those two baselines is still not advantage over **every** comparator. For example, in the lowest-relative-disagreement 10% of RPE1 targets, unshrunk mean MSE is 0.430960, better than candidate 0.456409. Do not present a two-baseline comparison as overall superiority.

The following is a fixed-endpoint illustration, not selection of an optimal coverage. Each row retains the first 10% (206 targets) of its frozen ranking; all displayed methods use that exact row's mask.

| Context | Ranking | Zero | Global shrinkage | Candidate |
|---|---|---:|---:|---:|
| K562 | Absolute disagreement | 0.045755 | 0.044881 | 0.044672 |
| K562 | Effect magnitude | 0.044080 | 0.043989 | 0.043646 |
| K562 | Relative disagreement | 0.141349 | 0.119443 | 0.153467 |
| RPE1 | Absolute disagreement | 0.100552 | 0.097262 | 0.095720 |
| RPE1 | Effect magnitude | 0.079513 | 0.078134 | 0.077920 |
| RPE1 | Relative disagreement | 0.582643 | 0.519351 | 0.456409 |
| HepG2 | Absolute disagreement | 0.080990 | 0.079649 | 0.079311 |
| HepG2 | Effect magnitude | 0.084549 | 0.083986 | 0.083927 |
| HepG2 | Relative disagreement | 0.330455 | 0.278588 | 0.239204 |
| Jurkat | Absolute disagreement | 0.043590 | 0.042696 | 0.042568 |
| Jurkat | Effect magnitude | 0.042144 | 0.041811 | 0.041488 |
| Jurkat | Relative disagreement | 0.208246 | 0.183185 | 0.212542 |

The relative-disagreement masks have larger zero-baseline errors: they select different response strengths, not merely a more accurate version of the absolute-risk mask. Show both absolute loss and improvement against zero/global shrinkage on the same mask. Do not name relative disagreement “confidence” or assign probabilities to it.

## Shrinkage did not repair response direction

Both shrinkage models multiply each target's mean response by a nonnegative scalar. On the same nonzero targets their direction is therefore unchanged. The independent per-target check finds a maximum candidate-versus-mean cosine difference below **7e-9**, consistent with floating-point arithmetic.

The candidate's slightly higher published mean cosine is explained by a changed evaluated set: zero shrinkage makes cosine undefined for 16 K562, 30 RPE1, 70 HepG2 and 23 Jurkat targets. Those targets are still included in MSE. Displaying only the average of defined cosines would invite a false claim of improved direction.

Mean-transfer cosine is only about 0.175, 0.262, 0.269 and 0.181 in K562/RPE1/HepG2/Jurkat. This describes limited alignment with the measured effect vectors; it does not independently identify whether errors come from biology, noisy estimates or protocol differences. Most target vectors have positive cosine, so calling this simply “predicting the opposite direction” would also be wrong.

## Meaning for a public cell explorer

Recommended lead: **“Our first four-context test did not establish an advantage over strong simple baselines. It shows that agreement among known contexts can still fail to predict another.”**

Show all four contexts, every baseline and the failed gate by default. Keep coverage, retained target count, baseline loss and undefined-direction count visible together. A scalar amplitude slider can usefully demonstrate why shrinking a response changes MSE while preserving its direction. A target explorer should be labeled retrospective inspection of recorded results; interesting examples selected after seeing outcomes are not new validation cases.

Avoid “the model knows when it is wrong,” “context-independent biology,” “better AI,” or “official challenge score.” This study uses published estimated population responses, has no held-out basal features, does not generate cells, and does not estimate calibrated uncertainty. The [original study](https://doi.org/10.1038/s41588-025-02169-3) explicitly models sampling error; treating source disagreement as pure biological variation would discard that distinction.

## Strongest next hypothesis

**Can an unperturbed control profile tell us when to preserve or suppress a transferred shared response?** The current study has no features of the destination context, so source agreement alone cannot determine whether that destination shares the same response regime. This is a plausible explanation to test, not an established cause of the observed split.

A successor should add source-fitted control features to a capacity-matched predictor, comparing against the same global shrinkage and generic-template baselines, with whole-context nested splits and a newly withheld external context. It should test full-response error and perturbation-specific residual error separately. The present four contexts are now development evidence for that new design; do not retune on them and call the result a new untouched test. Companion standard errors can support a separately declared noise-sensitivity analysis before attributing any gain to biological geometry.

## Independent audit boundary

`audit_results.py` uses only Python's standard library and saved results. It independently reconstructed **120 deterministic retained masks**, their order and sizes, and **744 scalar aggregates** from `per-target.csv`; all matched, with maximum absolute difference **1.11e-16**. The protocol hash matched the summary. This checks bookkeeping and aggregation, not a fresh reconstruction of model predictions from raw data.

The 50-repeat random mean curves were retained as reported; their individual sampled target memberships are not saved, and were not reconstructed in this audit. All exact paired curves and result hashes are in `Actual_Results_Audit.json`. The four contexts remain four contexts regardless of the number of targets or genes scored.
