# Flight 02: a bounded test of context-aware risk ranking

Independent design proposal, 10 September 2026. No response values, response matrices or response summaries were inspected; no model or evaluation was run. Read inputs: `work/virtual-cell-next/FROZEN_INPUT_SELECTION.json`, `NEXT_EXPERIMENT_DRAFT.md`, and `DATA_ROUTE.md`. Parent reports schema-only preflight: 4,443 treatment/context rows and a fixed publisher panel of 2,000 double-valued outcome columns. This document proposes the analysis to freeze before those values are opened; it is not itself an executed result or external preregistration.

## Decision

Use **one fixed per-treatment source-mean predictor** for the primary rejection experiment. Every ranking strategy receives precisely the same saved prediction arrays. Test whether **context-local cross-fitted residual risk** ranks its failures better than conventional rules. A ridge/expression-interaction predictor is a separately declared descriptive comparison, not a second moving primary endpoint.

The actual new information being tested is narrow: **do errors measured in source cell lines with similar control profiles help rank drugs in a new cell line?** Context distance alone is constant within a destination line and cannot rank that line's drugs. The candidate gets treatment variation from treatment-specific source errors and support. This is a conventional local risk estimator, not a newly established biological state law.

## 1. Contract and eligibility

- Retain plate 1, the already frozen five whole-cell-line outer folds, and the complete publisher outcome panel. A feature-selection operation on controls must not select outcome genes for scoring.
- Keep the released response values in their supplied scale and control `ref_mean` as a named covariate. Do not add them together or label the result raw counts, absolute expression or log2 fold change. The producer's exact scale discrepancy remains visible.
- A treatment identity must preserve the publisher's compound/dose encoding. Audit schema/identity metadata before values; do not merge different doses merely because a drug name matches. Require unique `(cell_line, treatment)` rows. An unexpected duplicate is a data-contract failure, not permission to average arbitrary rows.
- Primary transfer/risk eligibility: a test treatment must occur in **at least two distinct source cell lines** of that fitting split, so its source-only leave-one-line-out error exists. Freeze this metadata rule before fitting. Publish every excluded treatment/line and its reason, and coverage relative to all published rows. A treatment with no source observations is a different cold-start problem. The rule applies identically to all methods, including random ranking.
- Require finite numeric outcomes for the initial protocol. Abort and report any nonfinite values rather than dropping genes/rows or imputing truth. If the publisher intentionally supplies missing estimates, a separately recorded missing-aware protocol amendment is necessary; preserve its timing and reason. Never call an amendment after value inspection “unchanged preregistration.”
- Score all eligible treatments in each test line with equal treatment weight, then all test lines with equal line weight. A test line with no eligible treatments cannot silently vanish: report it and mark the complete primary gate unevaluable.

## 2. Fixed base predictor and source error ledger

Let `S` be the source lines available to one fitting call, `d` a treatment, `g=1,...,G` the fixed output genes, `S_d` its observed source lines, and `n_d=|S_d|`. The prediction for every destination line is

```text
mu[S,d,g] = (1/n_d) sum_{s in S_d} y[s,d,g]
yhat[c,d,g] = mu[S,d,g]
```

No destination responses are an argument to this predictor. Controls affect ranking only in the primary experiment, making the information contribution identifiable.

Build a source-only residual ledger by leaving out an entire source line:

```text
mu_minus_s[d,g] = mean_{u in S_d, u != s} y[u,d,g]
e[S,s,d] = mean_g (y[s,d,g] - mu_minus_s[d,g])^2
rbar[S,d] = mean_{s in S_d} e[S,s,d]
```

For this fixed mean predictor, the ledger can be calculated directly from source sums; no neural training is needed. Accumulate in float64. It must never use a source mean that includes the line whose residual is being measured.

**Algebraic baseline redundancy:** with complete gene rows,

```text
rbar[S,d] = n_d/(n_d-1) * mean_g sample_variance_{s in S_d}(y[s,d,g])
```

Thus treatment-only cross-fitted difficulty and ordinary source disagreement are identical rankings when treatment support counts match. Include both for transparency, but do not claim that beating them amounts to beating two independent ideas. Different support counts can make their ranks differ.

## 3. Control representation, fixed before response inspection

A modest, deterministic default is sufficient:

1. Use each line's plate-matched supplied `ref_mean` vector. Apply `log1p` as an explicit feature transform; it is not a claim about the original normalization.
2. On **source controls only**, choose up to 2,048 genes with greatest across-source variance, with exact ties broken by feature ID. Retain zero-variance/degenerate counts in the report.
3. Center with source means and fit PCA, retaining `min(8, |S|-1, positive-rank)` components. Do not whiten. Apply those fitted operations to destination controls without refitting. These are PCA features of **line-level summary profiles**, not individual-cell PCA or within-cell covariance.
4. Let `z[s]` and `z[c]` be the resulting coordinates. Define `h0` as the median strictly positive pairwise Euclidean distance between source profiles. If no positive distance exists, use uniform weights and report that context supplied no distinction.

This is a pragmatic low-dimensional covariate representation. Its basis must be fitted afresh inside every nested source split. Controls have different sampling precision and unresolved preprocessing; interpreting a successful distance as biological mechanism would require more work.

## 4. Candidate risk equation and fixed grid

For finite bandwidth multiplier `b`, set `h=b*h0`. For the destination/treatment pair, weights run only over source lines that actually have that treatment:

```text
raw_w[c,s,d] = exp(-||z[c]-z[s]||^2 / (2*h^2)),  s in S_d
w[c,s,d] = raw_w[c,s,d] / sum_{u in S_d} raw_w[c,u,d]
n_eff[c,d] = 1 / sum_{s in S_d} w[c,s,d]^2
r_local[c,d] = sum_{s in S_d} w[c,s,d] * e[S,s,d]
lambda[c,d] = n_eff[c,d] / (n_eff[c,d] + kappa)
q[c,d] = lambda[c,d]*r_local[c,d] + (1-lambda[c,d])*rbar[S,d]
```

Compute the softmax stably by subtracting the largest log weight before exponentiation. `n_eff` counts weighted **source lines**, never cells, genes or repeated rows; it lies in `[1,n_d]`. It is a support diagnostic, not an independent sample count for a confidence interval. Both local risk and its shrinkage target are nonnegative.

Freeze **ten distinct candidates**: `(b,kappa)` in `{0.5,1,2} × {0,4,16}`, plus a single uniform/treatment-only candidate. The uniform candidate ignores context and returns `rbar`; do not count redundant uniform settings as additional searches. If the best inner choice is uniform, the result is explicitly evidence that the tested context information did not earn use.

For equal control profiles/distances and complete support, uniform weights reduce exactly to the treatment-only rule. Global distance from the destination to training may multiply every score in a line without changing its ranking; it cannot be credited as within-line drug discrimination.

## 5. Strict nested choice without indirect response leakage

Each outer fold holds out ten entire lines `T` and has forty source lines `S`. Use the **four remaining frozen outer groups** as four inner validation blocks (ten lines each). For each inner validation block `V`:

1. Set `A=S\V`. Fit control preprocessing and the base predictor using `A` only.
2. Rebuild `e[A,s,d]` by leave-one-line-out inside `A`; source residual labels must contain no response from `V`.
3. Predict each line in `V` with `mu[A,d]`; construct its candidate ranks from `A`'s controls/residual ledger and its allowed control covariates.
4. At 75% coverage, score every candidate on the same base predictions against `V` outcomes. Average treatments within line, then equally over all inner validation lines.

Select the lowest inner macro risk. For exact numeric ties prefer the uniform candidate; otherwise prefer larger `kappa`, then larger bandwidth. Freeze this ordering rather than using a fuzzy tolerance chosen after the result.

Finally refit preprocessing, `mu[S,d]` and the residual ledger on all `S`, apply the chosen setting to outer lines `T`, and save predictions, ranking scores/IDs, chosen parameters and manifests **before outer scoring**.

**Important leakage trap:** do not compute one error ledger on all forty outer-training lines, then use it unchanged to validate a ranker on an inner-held-out line. Other lines' residual predictors can contain that validation line's responses. Rebuilding the ledger inside `A` avoids this indirect path. There is no expensive third model-fitting loop here: the base predictor is a mean and the leave-one-out residual has a closed form.

The raw `q` is a risk estimate, not a calibrated probability or coverage guarantee. No isotonic/conformal layer is needed to test ranking; a monotone calibration cannot improve the ordering. Any later calibration must use inner held-out predictions only and receive a separate empirical calibration assessment.

## 6. Comparators and common retained sets

Primary ranking strategies, all scoring the saved `mu[S,d]` predictions:

| Rule | Exact ranking score; smallest retained first |
|---|---|
| Random | Mean over 100 seeded treatment permutations per test line; publish seeds and sampled memberships or a deterministic reconstruction specification. |
| Source disagreement | `mean_g sample_variance_s y[s,d,g]`. |
| Treatment-only residual risk | `rbar[S,d]`; note its relation to disagreement above. |
| Predicted-effect magnitude | `mean_g mu[S,d,g]^2`; an essential weak-effect-selection control. |
| Candidate | The selected context-local/shrunk `q[c,d]`. |

Use `ceil(fraction * eligible_treatment_count)` at coverages **100%, 90%, 75%, 50%**. Tie-break scores with a fixed SHA256 ordering of treatment identity, shared across methods; do not let an accidental input row order decide retained treatments. Equal-score treatment-only or context-only strategies should visibly report ties.

For each strategy's exact retained mask, also score zero response and the source mean's own full-coverage risk. Zero must be scored **on that mask**, not compared with a full-population error. Publish absolute MSE, zero-relative difference/ratio (undefined if zero risk is zero), actual coverage and IDs. Low raw risk from selecting weak effects does not demonstrate additional skill.

A conventional control-expression ridge/diagonal predictor may be evaluated as a **separate descriptive prediction study** with its own inner hyperparameter selection. Do not substitute its predictions for one ranking method in the primary table. Applying all rankers to that second predictor would be a separate predeclared secondary analysis requiring its own cross-fitted residual ledger; the mean predictor's errors are not uncertainty labels for a different model.

Optional exploratory negative controls, explicitly outside the primary gate: shuffled control identities with the same bookkeeping, and a technical-metadata-only kernel built from supplied control cell/library summaries. If these match the biological-profile kernel, avoid attributing any gain to biological state geometry.

## 7. Proposed primary gate and effective sample size

At **75% coverage**, require candidate equal-line macro risk to be at least **10% lower than the strongest conventional ranking** among random, disagreement, treatment-only residual risk and magnitude. Also require lower risk than the strongest conventional ranking in at least **four of five outer folds**. Compare whole-study conventional strategies; do not pretend a hindsight per-line winner is a deployable strategy. Publish per-line results and all four coverages regardless of the decision. This strengthens the draft's random/disagreement-only comparison and should be accepted or changed before opening response values.

The gate is a practical engineering threshold, not a significance test. There are fifty held-out cell lines scored by five overlapping-training fits, not five cell lines and not millions of independent gene observations. Cancer-line ancestry, one-plate conditions and overlapping training produce dependencies. Report all five fold means and all fifty line-level paired losses. A bootstrap of fixed line-level predictions is at most a descriptive conditional uncertainty analysis; it does not quantify the full procedure's training variability. Do not present ordinary gene- or treatment-row bootstraps as fifty-line generalization certainty.

At 100% coverage all primary ranking strategies must have **identical prediction loss**. Any difference is a pipeline error. It is legitimate for ranking to reduce conditional error while leaving the base predictor unchanged; it is not legitimate to call it a better full-coverage biological model.

## 8. Failure tests required before real outcomes

Use synthetic arrays and metadata only; do not tune on real response outcomes.

1. Poison or permute outer-test responses: fitted preprocessing, predictor, ranking scores and selected parameters must be byte-identical before scoring.
2. Poison inner validation outcomes: each candidate's inner predictions/scores before validation must remain unchanged; selection may change only when the inner scorer consumes those outcomes.
3. Verify leave-one-out residuals against a simple scalar loop, including the `n/(n-1)` variance identity and support counts 2, 3 and unequal drug coverage.
4. With identical control profiles, candidate equals treatment-only risk. With informative context/treatment error interactions, a hand-built case must produce the independently expected rank; it must not be a constant distance score.
5. Check stable kernel weights at tiny bandwidth/large distances, `n_eff` bounds, zero-error data, PCA rank deficiency and deterministic ties.
6. Every ranking uses exactly the same prediction hash; at 100% coverage scores match. Reaggregate each saved mask independently, including zero on the same targets.
7. Permute gene, treatment and cell-line storage order: aligned predictions and retained IDs must be invariant. Distinguish genuine intervention identity from a display name.
8. Missing/duplicate identities, NaNs, infinities, no eligible treatments and insufficient source support fail or follow the predeclared policy visibly; never silently improve coverage by dropping difficult records.

## Interpretation and prior art

A success would show that the tested control-neighborhood weighting improves **selection among predictions of a fixed mean-transfer model** in this single-plate chemical dataset. Failure would reject that narrow usefulness claim under the declared comparison. Neither outcome establishes individual-cell dynamics, mechanism, calibrated confidence or universal state sufficiency.

Credit existing basal-expression modulation, response-subspace/shrinkage work and error-ranking methods. The supplied input audit cites [Rhaister-O architecture](https://huggingface.co/tahoebio/Rhaister/blob/main/docs/zeroshot_architecture.md), the [TFM perturbation study](https://www.biorxiv.org/content/10.64898/2026.06.28.735106v3.full) and [response decomposition](https://www.biorxiv.org/content/10.64898/2026.07.24.740459v1.full). Local kernel regression, shrinkage and cross-fitted residual scoring are conventional ingredients. The prospective question is whether their specific, inexpensive combination helps here under genuinely held-out cell contexts.
