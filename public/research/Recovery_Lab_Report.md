# Recovery Lab / Flight 01

Added recovery history did not pass the declared test.

Only 3,445 of 4,104 intended outcomes (83.94%) were resolvable, below the 90% prerequisite. Relative error improvement was 0.84% against nonlinear history + duration, with 3/5 fold wins. All results remain descriptive.

This is a descriptive comparison on a small, survivor-selected mouse cohort. It is not evidence of longer human lifespan, causal rejuvenation, or a universal biological mechanism.

## Frozen comparisons

| Mode | Best conventional | Candidate Brier | Relative improvement | Fold wins | Coverage | Overall pass |
|---|---|---:|---:|---:|---:|---|
| primary | Nonlinear history + duration | 0.405336 | 0.841% | 3/5 | 3445/4104 | No |
| complete_items | Nonlinear history + duration | 0.414948 | -2.079% | 2/5 | 3410/4104 | No |
| exclude_analgesic | Nonlinear history + duration | 0.408551 | -0.206% | 3/5 | 3445/4104 | No |

The fold-win count compares against each fold’s best conventional score, a descriptive comparison bound. It is not a selector that could have been chosen before seeing held-out performance.

| Primary model | Animal-macro Brier |
|---|---:|
| Transition frequencies | 0.474561 |
| Current condition | 0.433820 |
| Recent history | 0.439777 |
| History + duration | 0.439618 |
| Nonlinear history + duration | 0.408775 |
| Added recovery history | 0.405336 |

Bootstrap: {"animals": 214, "mean_absolute_improvement": 0.0034389267216413293, "ci95": [-0.011599223299859004, 0.01832327434197591], "draws": 2000, "seed": 9102026, "conditioning": "Resamples saved out-of-fold animal losses conditional on fitted models and selected comparator; does not refit overlapping folds or include full training/selection uncertainty"}

## What the experiment does and does not show

Original data: 289 animals and 6,317 dated visits. The published FD/ES/RE subset has 270 animals and 5,957 visits; it does not mean 270 natural deaths. Two animals with post-exit chronology conflicts were quarantined. Primary eligibility retains 214 older DO females and 4,104 landmarks.

The original 5–9-day window resolved 3,451 landmarks in the pre-design availability inspection. Six depended on an unknown or other-exit date as survival evidence; final conservative adjudication leaves 3,445 resolved and 659 unresolved. The original audit remains unchanged. A later actual attendance or trusted later terminal event can establish survival through day 9; an unsupported exit date cannot.

The endpoint uses an identifiable visit closest to day 7 inside days 5–9, with earlier ties and recorded death/euthanasia precedence through day 9. It is an observed-window proxy, not latent health at exactly day 7. The 30 published ordinal items exclude weight and temperature; missing scores do not become healthy scores.

Six models use the same intended and resolved masks. Preprocessing and settings are learned only within training animals. Candidate additions are observed high-to-low recrossings, time since the last, and a fixed past burden integral with gaps and incomplete intervals omitted explicitly. Complete-item and analgesic-exclusion sensitivities are all reported.

The declared gate required 90% resolution overall and within each fold, 5% lower Brier error, at least four fold wins, and a positive paired animal-bootstrap lower limit. Coverage was already known to fail before fitting. Every overall gate remains false regardless of descriptive scores.

No complete semi-Markov likelihood, joint longitudinal-survival model, B6 transport test, durable recovery confirmation or causal dietary analysis was fitted. Cage IDs were unavailable. The bootstrap conditions on fitted models and the selected comparator; it does not include the full training/selection uncertainty.

## Reproduction and evidence

[Exact source published before fitting](https://github.com/thantiklermcirony/empirical-observatory/commit/7ed5f4113e3c4d0cb8ccc256627efbb8d40c7269). Eligibility and six aggregate window alternatives were inspected before design; this is not an external preregistration before any outcome inspection.

Use experiment/README.md and the pinned requirements in the downloadable archive. FROZEN_PUBLICATION.json binds code and derived input hashes. Source and independent synthetic checks, all intended predictions, animal losses, inner/outer fit records, preflight counts and the source audit are included.

[Original data, Luciano et al.](https://doi.org/10.6084/m9.figshare.25125587.v1), CC BY 4.0; [original study](https://doi.org/10.1007/s11357-024-01226-9). Retain attribution when reusing source measurements.

The shared ledger records the real final preflight as a retrospective evidence-admission check. It creates no fictitious forecast clock and blocks admission on the failed prerequisite. The GB collector is a separate prospective record of an official forecast; it has no new candidate predictor.

## Next scientific step

Obtain follow-up with a coherent, sufficiently observed endpoint and additional independent animals. Specify a new comparison before fitting, retain conventional methods, and test whether history distinguishes future outcomes beyond present condition. The present result does not justify widening the window after seeing performance.
