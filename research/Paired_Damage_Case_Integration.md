# BIO-PD-001: a shared Biology case

Biology owns a stable specimen dossier at `/cases/paired-damage` and device `paired-damage`. The room hotspot and quick control open the dossier. Other participating rooms expose the same case, not copies of its conclusions. Moving a room changes its placement, not its case identity.

`lib/research-cases.ts` is the shared contract. It carries revision, evidence class, admission status, nouns, operations, sources, corrections, branch questions and prerequisites. `GET /api/cases` discovers records; `GET /api/cases/BIO-PD-001` returns the contract. The guide consumes its source brief; the workshop can cite its framework source and open research question. The encyclopedia displays it separately from preserved specialist entries.

`POST /api/cases/BIO-PD-001/replay` accepts only `{"leadHours":0}`, `{"leadHours":3.5}` or `{"leadHours":7}`. It recomputes counts from 836 source-derived age/pair rows, preserves exclusions and returns a content receipt, with zero provider calls. This is a descriptive replay, not a new experiment, model fit, or automatic theorem invocation. The interface supports printing and exporting the exact replay JSON.

## Scientific correction before integration

The previous sweep omitted an explicit requirement that both cells be alive at measurement. Revision 2 applies strict endpoint eligibility. With a seven-hour margin, the lower-uptake cell has the later death in 45/90 pairs at 24.5h and 63/88 at 66.5h. With a zero-hour margin the latter is 79/104. The raw figure contains some rows at/after listed endpoints; its inclusion in a published source table is not evidence of a mistake in the paper. Each endpoint is reconciled against the independent cell-info table before joining.

Counts are retrospective, restricted to both observed deaths; 103 censored source cells are excluded. Cohorts change with age and pairs recur. The seven-hour source window, future-informed processing and ceiling calibration remain unresolved. Filename H/T semantics are not independently certified. No confirmatory p-values are admitted. No validated transition age, repair capacity, new force, or universal law is inferred.

The old model overlay used 20 as a threshold on `exp[X]`. The supplementary twilight example's `Xc=20` does not license that threshold on the exported coordinate. Its previous model-agreement claim is held pending source reconciliation. All original local outputs remain historical records, superseded by this integration audit.

## Division of work

- Biology: source observation, pair identity, endpoint and censoring audit.
- Temporal grammar: window start/end and past-only information availability.
- Mathematics: calibrated observation ceilings, coordinate conventions and invariance assumptions. Boundedness does not select UHL.
- Dynamics: same-observation model comparison after threshold reconciliation.
- Adaptation: independent forecast comparison at equal information and fitting cost.
- Quantum: no transfer without molecular, preparation, instrument and physical-clock evidence.
- Encyclopedia: retain candidate status, revisions and conditions for future admission.

## Next action and gates

Recover and reproduce the exact fluorescence-to-uptake pipeline first. Compare constant permeability and the published damage model under the same sampling/noise/preprocessing. An independent forecast extension is proposed only after measurement and experiment identity gates pass: at least 5% pair-weighted Brier improvement, positive experiment-cluster 95% improvement interval, calibration intercept within ±0.1 and slope within 0.8–1.2. Freeze outcome horizon, models, tuning, sample size/power and censoring rules before fitting. An evaluable gate miss rejects predictive advantage; missing prerequisites is inconclusive. These are authored future gates, not external preregistration or results.

Reproduction: download the source CSVs, README, manifest, data and `reproduce.py` into one folder and run Python. The standard-library script independently rebuilds all 836 rows and 24 age/margin counts. The JavaScript replay is tested against those results and synthetic strict-boundary/tie cases. Integrity checks establish bytes and arithmetic, not empirical truth.

Source: [Yang et al. (2023), Damage dynamics and the role of chance in the timing of E. coli cell death](https://www.nature.com/articles/s41467-023-37930-x); [original repository](https://github.com/y1fanyang/coliDamageDynamics). No source author endorses this exploratory reanalysis by virtue of these links.
