# Recovery Lab: descriptive prediction with an explicit failed coverage gate

This release asks whether prior observed recovery/burden history adds predictive information beyond present condition, ordinary recent changes and observed episode duration. It uses a small, licensed longitudinal mouse dataset. **The primary follow-up resolution gate failed before any predictive fitting. No model result from this release can be presented as a passed primary test.**

`pipeline.py` implements the observation-window endpoint, past-only features, grouped folds and estimators. `run.py preflight` produces eligibility only. `run.py evaluate` fits models and must be invoked only after the root publishes the exact source and authorizes the run. `protocol.json` specifies the choices and known limitations. Source data and score reconstruction are documented in the adjacent data-audit package.

## Reproduction

Use Python3.12 and an isolated environment with `requirements.txt`. The prepared environment is sufficient; no paid service, remote model or GPU is required. Tests use synthetic observations only:

```sh
python -m unittest -v test_pipeline.py
python run.py preflight --data ../data-audit/derived --output preflight
```

The adapter must first generate the pinned `animals.csv` and `visits.csv`. Input hashes are checked. A full evaluation deliberately requires a freeze record:

```sh
python run.py evaluate --data ../data-audit/derived --output results --frozen-publication FROZEN_PUBLICATION.json
```

The record must contain:

```json
{
  "commit": "<exact 40-character public commit>",
  "url": "https://github.com/<owner>/<repo>/commit/<same commit>",
  "source_sha256": {
    "pipeline.py": "<hash of published file>",
    "run.py": "<hash of published file>",
    "protocol.json": "<hash of published file>"
  },
  "input_sha256": {
    "animals.csv": "80bf2cfbf73c3272b45766b9e6d124998c90aec0defd70009b2f1fe9932cde73",
    "visits.csv": "4c66aff2424a9fdceeb2a08dca76d69a42c1220265591beedc91581acf009991"
  }
}
```

This guard verifies local bytes against the root's record. It does not independently fetch or authenticate the GitHub publication. The root verifies publication before starting the run. Do not substitute arbitrary hashes or a merely nonempty JSON record.

## Estimand and eligible population

The primary population is DO females that survived to old-age enrollment. Landmarks require at least30days of already-observed history and three prior assessments. All visits from a mouse stay together. Chronology-invalid animals are quarantined without correcting their source data; same-day exit/assessment landmarks are excluded because ordering is unknown.

The outcome is a **next-week observed-burden/death-or-euthanasia proxy**, not the true biological state at precisely day7. FD/ES/RE in days1–9 has priority. Otherwise, use the identifiable visit closest to day7 within days5–9, breaking ties toward the earlier visit. Survival through day9 must be supported by later actual attendance or a later recorded FD/ES/RE terminal date. Unknown/other exits, absent visits and ambiguous scores remain unresolved with reasons. Every model forecasts every intended landmark; losses use the same resolvable mask. Conditioning on observed follow-up is a limitation, not something the loss function repairs.

The measured threshold is at least4 severe-coded ordinal items. Primary labels use missing-item bounds; the two sensitivities require complete current/outcome items or exclude the conditional analgesic item while keeping the threshold4. These are separate frozen reruns, all reported. Weight and temperature do not enter the ordinal severity count. The original paper's first-crossing healthspan and95%-of-life-lived classifier are different targets.

The pre-design audit examined six observation windows. Narrow day7 and coherent day14 alternatives failed the90% resolution requirement. A wider5–15day interval around day7 was rejected despite meeting coverage; the release retained the original5–9day proxy. The initial3451/4104 count preceded a conservative survival-evidence tightening. Final resolution is3445/4104 for primary and analgesic-exclusion modes and3410/4104 for complete items. Six previously resolved landmarks no longer have adequate survival evidence. Exact counts are in `preflight/PREFLIGHT.json`. No window was chosen using model performance.

## Comparators, features and evaluation

Six models are compared: smoothed empirical transition probabilities with fixed backoff; current item-level logistic; ordinary30-day-history logistic; duration-augmented logistic; fixed nonlinear histogram gradient boosting on duration features; and the extra-history candidate. Logistic C is selected from0.1,1,10. The candidate chooses that logistic grid or the fixed HGB inside inner folds. HGB has100iterations,7leaf nodes,L2=1 and no early stopping. This prevents candidate gains from being compared only with a weak linear baseline.

All numeric imputation, scaling and category encoding fit only training data. Unknown test categories are ignored by the training encoder. Animal-balanced sample weights are normalized to mean1. Missing training classes and the explicit single-class fallback are recorded. There is no separately fitted probability calibrator; calibration plots use fixed bins.

The conventional history includes the published-style30-day item/physical changes, fixed local physical slopes/variability, and temperature×weight summary. Duration is elapsed observed run length, with a left-censored flag; this is **not a fitted semi-Markov likelihood**. Candidate additions are past adjacent high-to-low recrossings, time since the last, and a past60-day complete-item burden integral. The integral uses a left-endpoint step convention, omits entire gaps longer than14days and missing-item starting intervals, and reports represented/unrepresented days. None of this measures continuous latent burden.

Five deterministic outer animal folds are stratified by diet. Three inner animal folds select settings. The primary metric sums squared errors over three classes, averages landmarks within mouse, then mice. Secondary outputs include log loss, fixed-bin calibration and a current-high subset comparison. The displayed best conventional model and each fold's best conventional model are descriptive comparison bounds; they are not deployable selectors chosen before evaluation.

The numeric research gate requires5% improvement, wins in4/5folds and a positive paired2000-animal-bootstrap interval. This resamples saved out-of-fold animal losses conditional on the fitted models and selected comparator; it does not refit overlapping folds or represent full training/selection uncertainty. Its satisfaction cannot override the known coverage failure: `overall_pass` is always false for this release. The interval does not establish clinical significance, and visits are not treated as independent animals. Recovery-event counts are disclosed; exceeding a simple minimum count is not a formal power analysis.

## Output contract and limits

Each mode writes `predictions.csv` for all eligible landmarks, including unresolved labels and three probabilities per model; `animal_losses.csv`; `fit_records.json` with fold settings/IDs/absent classes; and `summary.json` with coverage, metrics, calibration and gate reasons. The top-level `SUMMARY.json` reports every mode and exact source/publication record. There is no result file before evaluation.

This release does not fit a full semi-Markov or joint longitudinal-survival model, validate B6 transport, estimate durable latent recovery, identify dietary causal effects, or replace lifespan observations. The data omits cage IDs and detailed clinical treatment histories, and enrollment is survivor-selected. Do not infer human longevity, safe interventions or veterinary decisions.

Data: Luciano et al., [Figshare25125587v1](https://doi.org/10.6084/m9.figshare.25125587.v1), CC BY4.0; [original study](https://doi.org/10.1007/s11357-024-01226-9). [Yang et al.](https://www.nature.com/articles/s41467-025-57807-5) motivates intermittent morbidity; [msm](https://chjackson.github.io/msm/reference/msm.html) and [Jackson's semi-Markov work](https://arxiv.org/abs/2508.20949v2) establish relevant existing methods. A recovery arrow or memory feature is not itself a new scientific theory.
