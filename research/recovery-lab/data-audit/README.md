# Recovery Lab data adapter

This adapter prepares the original mouse archive without fitting or evaluating a predictive model. **Aggregate data eligibility, score completeness and threshold recrossings were inspected before protocol design.** This disclosure must accompany later claims of a frozen evaluation.

Run with Python 3.10+; no external packages are required:

```sh
python adapter.py --source /path/to/frailty-data.zip --output derived
python -m unittest -v test_adapter.py
```

The CLI requires the exact pinned archive MD5. Outputs are deterministic CSV and JSON; the provenance file records source/member/adapter and output hashes. The source comes from Luciano et al., [Supporting Information for Fragility Longitudinal Study, version1](https://doi.org/10.6084/m9.figshare.25125587.v1), **CC BY4.0**. Credit Alison Luciano, Laura Robinson, Gaven Garland, Bonnie Lyons, Ron Korstanje, Andrea Di Francesco and Gary Churchill. This is a new Python implementation based on the deposited codebook, `fragility_vecs.R`, `fragility_funs.R` and `04_fragility_fig4.R`, not an endorsed author release. [Paper](https://doi.org/10.1007/s11357-024-01226-9).

## Exports and interpretation

- `animals.csv`: all289 source animals, canonical and original IDs, birth/exit dates, separate exit reason/class, demographics, observation bounds and chronology flags. Whole-record clinical status and total visits are audit metadata, **not forecasting features**.
- `visits.csv`: all6317 dated assessments, preserving the original slot number, real collection date, due date, assessor and measurements. It adds only transparent score summaries and past-only age/history counters. Empty measurements remain empty CSV cells.
- `undated_measurements.csv`: a separate quarantine for measured slots lacking dates; empty for this release.
- `AUDIT.json`: raw and chronology-valid eligibility summaries, with the pre-design disclosure.
- `PROVENANCE.json`: exact source and derived hashes.

The author's documented ID correction maps `DO-AL-0097` to `DO-AL-0105`; `source_id` remains unchanged. A collision fails loudly. Numeric suffixes are chronological assessment slots; **78 possible slots does not mean78 observations per mouse**. No unknown date is interpolated.

The deposited scoring script uses **30 ordinal items**, excluding physical body weight and temperature. It maps dermatitis0.25/0.75 to0.5 and otherwise retains deposited scores, including conditional analgesic-response coding. The published mean averages observed ordinal items; the severe sum counts values equal to1, ignoring missing entries. The published first-crossing healthspan definition uses a severe count of at least4. These rules are reproduced, but missing items also produce lower/upper bounds and a complete-case state. A low observed sum with enough missing items to cross4 has an unknown state. There is no claim that every original conditional item is an independent measure of poor health.

`ge4_state_complete` labels only assessments with all30 items; `ge4_state_certain` also labels incomplete assessments when the missing-item bounds agree. Labels `below_threshold`/`impaired` mean below/at-or-above the published measured threshold, not a diagnosis or proof of rejuvenation. The raw ordinal fields remain unchanged, so `dermatitis` can still contain0.25/0.75 even though score calculations use the author's collapse.

## Observed eligibility and quality

The adapter reproduces the authors'270 retained animals and5957 assessments by selecting FD/ES/RE exits. That selection includes euthanasia and must not be described as270 natural deaths. Full archive exits: FD226, ES38, RE6, MSG10, FTR5, DC1, unknown3. Preserve these classes for any competing-event/censoring design.

There are6018 complete30-item assessments;299 lack the two later-added items. Consecutive visits are typically weekly: median7days, IQR7–8, range5–43. In the raw archive5309 landmarks have an observation5–9days later,3449 exactly7days later, and4084 have such a window plus at least30days of prior observation. These are availability counts, not final model eligibility or latent day7 labels. Raw complete consecutive assessments contain745 high-to-low threshold recrossings among205 animals; noise, assessor changes and treatment can contribute.

Two animals have observations after their recorded exit: `AgedB6-0689` (11assessments) and `DO-40-2062` (2assessments). Both exits are MSG. Preserve all data but quarantine both whole animals for an endpoint requiring coherent exit chronology:20visits removed, leaving287animals/6297visits. Six assessments share an exit date, so within-day order is unknown. No duplicate observation date, pre-birth visit, undated measurement or nonpositive physical value was found. No source date was repaired.

The archive has DO246 females across five diets and B643 animals (28male/15female), all AL. No cage ID is released. The study enrolled old survivors; age at observation must account for delayed entry and outcomes cannot be generalized to an unselected birth cohort. Diet and survival to enrollment are jointly selective; a predictive comparison is not a causal intervention-effect estimate. Cross-strain transfer is also confounded by age, sex and diet.

## Viable first endpoint and split

A narrow next-week *observed burden* endpoint is more defensible than a latent healthspan claim. Freeze a visit window and exit precedence, retain unresolved/missing follow-up explicitly, and distinguish FD from euthanasia in reporting. An observation within a window is a proxy measured at its own date; do not call it an exact day7 state. Forecasting features must exclude future visit dates, exit date/reason, total lifetime observations, whole-record clinical flags, future percent-life-lived, and any history inferred from the entire trajectory.

Use whole-animal outer/inner folds, stratified by diet in DO as primary, with equal total contribution per animal. Keep B6 as a separately labelled domain-transfer audit, not an interchangeable extra fold. At a landmark with a30-day history requirement, compute the requirement and every history feature using observations at or before that date. Include current-state, ordinary published30-day history, duration-based and nonlinear baselines before adding richer history. The original study already used30-day changes; history itself is not new.

The audit's horizon summaries are intentionally descriptive and are not a frozen endpoint implementation. The predictive team's Scientific_Contract.md defines the final target and stricter eligibility. Reconcile its mask counts before unblinding any performance.

## Validation

13 synthetic behavioral tests passed on Python3.12.14. They check missing versus healthy, partial-observation bounds, published scoring, exclusion of physical values from the ordinal score, raw-value preservation, ID correction/collision, undated slots, separate exits, temporal contradictions, duplicate dates and pinned-input rejection. The actual archive run independently reproduces the published270/5957 included dimensions. No predictive model was trained or scored.
