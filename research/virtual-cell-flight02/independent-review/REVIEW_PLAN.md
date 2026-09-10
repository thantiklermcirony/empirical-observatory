# Independent synthetic contract review

Scope: `../experiment/pipeline.py`, once its API is stable. This folder is owned by the independent reviewer; the implementation is read-only. No real response numeric columns, Parquet statistics, or performance results may be accessed for these checks.

The following expectations were written before inspecting the implementation:

| Contract | Adversarial case | Required result |
|---|---|---|
| Missing pairs | Missing cell/treatment payload replaced by a huge finite number | Source means, residuals and eligible predictions unchanged; absent row never acts as zero truth |
| Intervention identity | Same compound at 0.05 and 0.5 uM, plus distinct whitespace-bearing identifier | All remain separate keys |
| Leave-one-out residual | Two, three and four source observations; independent scalar leave-one-line-out loop | Exact support and numerical agreement, including the support-dependent variance identity |
| Outer response holdout | Change all destination outcomes but keep controls and source data fixed | Pre-scoring artifacts and chosen hyperparameters unchanged |
| Inner leakage | Record every inner source preprocessing/mean-model fit; poison validation outcomes | Fits use only inner-training lines; candidate predictions/ranks before scoring cannot depend on validation outcomes |
| Genuine conditional ranking | Drug A source risks [16,16,16,144], drug B [144,16,16,16], source positions 0,1,2,3 | Nearby destinations reverse drug ranks, while treatment-only means are both 48 |
| Degenerate controls | All controls equal; rank-deficient controls | Defined deterministic map and treatment-only limit; no artificial geometry claim |
| Kernel stability | Extreme destination distance and narrow bandwidth | Finite risks and effective support between 1 and actual observed source count |
| Macro weighting | One line with one retained loss 100; another with nine retained losses 0 | Equal-line macro risk 50, not pooled-row risk 10 |
| Actual coverage | Three or five eligible treatments at 75% nominal coverage | Retain 3/3 or 4/5 by the declared ceiling rule |
| Ranking ties | Equal scores; permuted array order | Same retained treatment identities using the fixed identity-based tie order |
| Identical predictions | Multiple ranking rules at 100% coverage | Exactly the same target population and base-prediction loss |
| Conditional zero reference | Different ranking masks retain strong/weak effects | Zero comparator is recomputed on each identical retained mask |
| Explicit invalidity | Duplicate identity, observed NaN/inf, no eligible target | Reject or follow the fixed documented policy without silent outcome selection |

`reference_oracles.py` provides a deliberately simple record/loop implementation for independent arithmetic comparison. Its self-check is only an oracle sanity check; it is not a pass result for the forthcoming pipeline. Actual implementation checks and hashes will be reported separately.
