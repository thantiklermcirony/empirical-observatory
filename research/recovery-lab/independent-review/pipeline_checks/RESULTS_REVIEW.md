# Recovery Lab: independent saved-result audit

10 September 2026. All three completed modes pass the independent arithmetic and mask audit. The reviewer read saved predictions and eligibility metadata, without refitting, retuning or changing a hypothesis or threshold.

| Mode | Resolved / intended landmarks | Best conventional model | Candidate error reduction versus that model | Fold wins | Overall gate |
|---|---:|---|---:|---:|---|
| Primary | 3,445 / 4,104 | Duration features with HGB | 0.8412764% | 3 / 5 | Failed |
| Complete items | 3,410 / 4,104 | Duration features with HGB | -2.0785692% | 2 / 5 | Failed |
| Exclude analgesic | 3,445 / 4,104 | Duration features with HGB | -0.2063324% | 3 / 5 | Failed |

Negative reduction means the candidate had higher error. Every mode also missed the declared numerical success gate. Independently, the original feasibility failure permanently blocks a confirmatory primary claim: numerical improvement could not repair missing outcome selection. The small primary gain did not survive the two sensitivities.

The audit checked all 12,312 intended landmark rows, all six model probability vectors per row, identical within-mode scoring masks, correspondence to the preflight labels/folds, equal-animal aggregation, every saved per-animal Brier/log loss, all fold scores, the current-high low-outcome Brier, the declared best conventional comparison, fold-win counts, and the fixed paired-animal bootstrap calculation. Ninety outer fit records agree with their permitted resolved training animals and held-out animals. Recorded hyperparameters agree with the declared minimum-inner-score selection. Published source hashes remained unchanged. The audit does not reproduce inner model fitting or establish raw-measurement validity from saved labels.

This supports a useful negative result and a reproducible benchmark. It does not demonstrate a superior recovery-history mechanism, latent resilience measure, life-extension intervention or human longevity predictor. The baseline already contains ordinary history, observed duration and a nonlinear estimator; these are substantive competitors.

`results-reconciliation.json` records exact input artifact hashes and the independent calculations. Run `audit_results.py` with the pinned numerical dependencies to reproduce this audit. `--mode primary` or either sensitivity audits one completed mode without requiring others.
