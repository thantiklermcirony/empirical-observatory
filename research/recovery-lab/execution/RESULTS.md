# Recovery Lab: frozen descriptive execution

The single authorized run completed all three modes and all 15 outer folds. No settings or source files were changed after inspecting performance.

Runtime: 440.07 seconds; exit code 0. Numerical-library thread limits were set to one and are recorded in EXECUTION.json. Frozen source and input hashes were rechecked after completion.

Public source freeze: https://github.com/thantiklermcirony/empirical-observatory/commit/7ed5f4113e3c4d0cb8ccc256627efbb8d40c7269

| Mode | Resolved / intended | Candidate Brier | Best conventional Brier | Relative reduction | Fold wins | Numeric gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| primary | 3445 / 4104 | 0.405335964 | 0.408774890 (duration_hgb) | 0.8413% | 3 / 5 | False |
| complete_items | 3410 / 4104 | 0.414948247 | 0.406498886 (duration_hgb) | -2.0786% | 2 / 5 | False |
| exclude_analgesic | 3445 / 4104 | 0.408550554 | 0.407709318 (duration_hgb) | -0.2063% | 3 / 5 | False |

Every mode remains an overall failed gate. The primary resolution fraction was known to be below 90% before any fitting; these scores therefore support a descriptive comparison only.

All losses weight animals equally, averaging each animal's resolved landmark losses first. Brier loss is the sum over three probability classes, with range zero to two. The selected conventional benchmark is a descriptive evaluation envelope.

- primary: paired-animal 95% interval for absolute Brier improvement [-0.011599223, 0.018323274]. Candidate log loss 0.710833391; duration_hgb log loss 0.706953807.
- complete_items: paired-animal 95% interval for absolute Brier improvement [-0.031009986, 0.011035499]. Candidate log loss 0.733642027; duration_hgb log loss 0.708099411.
- exclude_analgesic: paired-animal 95% interval for absolute Brier improvement [-0.015977537, 0.013341099]. Candidate log loss 0.713850162; duration_hgb log loss 0.707551796.

The paired bootstrap is conditional on the saved fitted models and selected comparator; it does not retrain the overlapping outer folds. The observed high-to-low subset is not a demonstration of durable recovery, causal efficacy, healthspan extension, or human longevity.

Execution details, thread limits, exit code, runtime, and every result file's size/SHA256 are retained in EXECUTION.json. Raw stdout/stderr is retained in evaluate.log. RESULTS.json holds all six models in every mode, selected candidate families, class-availability diagnostics, and post-run frozen-source verification. The independent reviewer reconciles predictions and losses separately.
