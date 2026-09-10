# Recovery pipeline: independent pre-run review

10 September 2026. Cleared for the explicitly descriptive, publicly frozen evaluation with the limitations below. No real mouse measurements were fitted, tuned or scored by this reviewer.

Final source inspected and tested:

- `pipeline.py`: `be2e8b750f91b0ea10181fbff46073e3038ece589292577c94ed61afe4b9af4c`
- `run.py`: `9b3818b0b01bddfd76d70fa903664e876849d827bfd4f423d246e6c4131e0fdb`
- `protocol.json`: `3903f4f60182008fe15a864f3660526296d484013ecf84001cb8a5dbb7803325`
- Final `PREFLIGHT.json`: `bdec6c15eb5b60152b4dc041f6937f134f4a6ef6f5a5efb3d959ec8a08574eef`

Seventeen independent synthetic checks passed. They cover future-visit poisoning/deletion, separation of endpoint metadata from features, missing-score bounds, infinite-value rejection, actual elapsed time and observed run censoring, a hand-computed burden integral, terminal precedence, nearest-visit selection, untrusted future exit dates, sensitivity masks, equal-animal loss, animal-isolated nested fit/predict callbacks across all six methods, and correct missing-class probability columns. Two tiny synthetic classifiers exercised actual estimator behavior; the nested runner test uses spies rather than fitting the real study. A perfect synthetic candidate still cannot turn the known-failed primary gate into a pass.

Independent arithmetic from all three exported landmark CSVs agrees with the final audit: 214 animals and exactly 4,104 intended landmarks with identical IDs/folds across modes. Primary resolves 3,445 (83.9424951%); complete-items resolves 3,410; excluding analgesic resolves 3,445. Primary consists of 3,264 observed-burden labels plus 181 recorded terminal labels, with 659 unresolved. The original 3,451/4,104 check remains a historical pre-design inspection. Six labels became unresolved when later MSG/DC/FTR/unknown exit dates ceased to count as sufficient survival evidence. No prediction performance informed that tightening.

Resolved review findings: restrict survival evidence to later actual attendance or a later FD/ES/RE recorded terminal date; reject infinite ordinal inputs; keep the primary success flag permanently false; require exact source/input hashes and the declared commit URL in the evaluation freeze record; report coverage by current state as well as diet/fold/animal; disclose the bootstrap's conditional scope. The source now includes these changes. Under the operational endpoint, a recorded found-dead date is still not continuous monitoring of true biological death time.

The candidate and comparators receive the same intended landmarks and score the same resolved labels. All supervised tuning stays inside the outer training animals. Estimator loss weights give equal total weight to each scored animal; preprocessing remains conventional training-only median imputation/scaling. Unknown categorical values are handled without fitting on held-out labels. The candidate can select logistic or the fixed nonlinear estimator inside inner folds; a nonlinear duration comparator is present. The reported best conventional and foldwise best scores are descriptive envelopes, not deployable hindsight selectors.

The primary gate remains failed regardless of any numerical gain. Selection into observed follow-up can be informative. The paired bootstrap resamples saved animal losses, conditional on fitted models and the selected comparator; it does not include retraining or all model-selection uncertainty. No durable-recovery confirmation model, B6 transport study, full semi-Markov or joint survival fit, causal effect, human longevity result or clinical decision utility is established. These omissions are explicit in the final protocol.

Evidence: `checks.json`, `unittest.log`, and `count-reconciliation.json`. The two scripts in this directory reproduce these checks without fitting real data.
