# Chlamydomonas Observatory: results, not a completion claim

The working prototype connects binary illumination, growth, a regulatory switch,
cell-cycle oscillations and symmetric division. It uses the published Heldt,
Tyson, Cross and Novak model, not a newly invented universal biology theorem.
Open **Chlamydomonas_Observatory.html** for local controls, visual playback,
paired experiments, equation nodes, evidence, export/import and missing modules.

## The strongest computed pattern

The same 24 hours of illumination over 48 hours yields **one undivided cell or
eight descendants**, depending on pulse timing, for the parameter set in F01.
Both lineages have total volume **6.051571 arbitrary volume units**.
This survives independent integration of the original eight equations with
SciPy BDF. Extending to 96 hours gives **8 versus 64 descendants**: the earlier
nondivision is not a claim of permanent arrest.

In plain language: two cells can receive the same total “daylight allowance,”
yet spend it on different schedules. In this model the schedule also talks to
the division switch. Counting illumination alone loses that conversation.

This is a model prediction from existing mechanisms. We have not established
that this exact parameter/schedule contrast is new to the literature, physically
realizable as configured, or correct in living cells.

## Five ledger entries

### F01 — Equal light time, different division outcome

Status: simulation-only; independently integrated.

At 48 h, 1 versus 8 descendants; both lineage volumes are 6.051571 AV.

Limit: Finite 48 h endpoint, not permanent arrest. At 96 h the independent model predicts 8 versus 64 descendants. Light is binary, not an energy accounting system.

Evidence: INDEPENDENT_FINDING_CHECKS.json, CAMPAIGN_RESULTS.json, engine.js.

### F02 — Pulse schedule shifts first division

Status: published-model reproduction.

Hourly flashes: 21.4275 h; 12 h day/night: 12.0379 h to first division.

Limit: Default model parameters. The underlying light-sensitive mechanism is existing prior work, not our discovery.

Evidence: BDF_REFERENCE.json.

### F03 — Growth and light sensing are distinct controls

Status: simulation-only parameter intervention.

Halving the light-dependent starter-kinase degradation rate advances first division by 32.291 min under day/night forcing.

Limit: No calibrated genetic manipulation or nutrient-dose interpretation is supplied.

Evidence: REFERENCE_CASES.json, BDF_REFERENCE.json.

### F04 — A hidden-state discovery disappears

Status: rejected numerical artifact.

A coarse 0.125-minute integration suggested a 72.680-minute effect of redistributing a complex. Independent BDF gives a first-division difference of 1.19e-06 min.

Limit: These are synthetic initial-state preparations, not wet-lab data. The negative result concerns this outcome and protocol, not every transient or all hidden state.

Evidence: CONNECTOR_TESTS.json, INDEPENDENT_FINDING_CHECKS.json.

### F05 — Growth history does not earn admission here

Status: negative held-out observational result.

For 3679 cells, the Brier score changes from 0.100843 to 0.104172 when growth history is added (worse).

Limit: Two of four held-out experiments improve and two worsen. This is a fixed polynomial logistic model, not proof that no use of history can help. The 277-cell different-protocol test is mixed across metrics.

Evidence: EMPIRICAL_RESULTS.json, HELD_OUT_PREDICTIONS.json, empirical.py.


## Real data: can a new observation improve prediction?

Data are the original single-cell measurements for Figure 4. Every experiment
uses a four-hour light pulse, followed by darkness; the endpoint is 12, 18, 24
or 30 hours from initial plating. Predictors are area after light and elapsed
dark time. The proposed added dial is log area growth per hour during light.
The outcome is at least one division, not an exact daughter count.

One entire experiment is held out at a time. Degree-two polynomial logistic
regression with C=1 is fixed before scoring. Standardization is fitted only to
training data. End-of-experiment area, coordinates and future divisions are
excluded. Both panels have their own training-only fit.

| Held-out experiment | Cells | Area + time Brier | + history Brier |
|---|---:|---:|---:|
| 12 h | 695 | 0.01460 | 0.01378 |
| 18 h | 1157 | 0.05014 | 0.05599 |
| 24 h | 870 | 0.12035 | 0.11861 |
| 30 h | 957 | 0.20703 | 0.21494 |
| All held-out predictions | 3679 | 0.10084 | 0.10417 |

Lower is better. The history panel worsens the aggregate Brier score by
3.30%.
The conditional cell-bootstrap 95% interval for improvement is
[-0.006025, -0.000700].
This interval treats cells as resampling units within these available data;
it does not describe generalization to independent laboratories. Four cohorts
are too few for a strong experiment-level generalization claim. Both probability
calibration and ranking matter: AUC also worsens overall.

The separately held-back FigS4 protocol has 450 records, of which 277 are
eligible after excluding cells divided by the 12-hour measurement and missing
positive predictor sizes. We predict division during the following 12 dark
hours. Adding history slightly improves Brier score but worsens log loss and
AUC. This remains a mixed transfer result, not a rescued discovery. Pixel-scale
calibration between files is not independently established.

**Crucial separation:** no pixel area has been claimed to equal the ODE model's
arbitrary volume. The empirical classifier is not validation of the ODE or a
full-life-cycle digital twin. Published datasets, model parameters, simulation
outputs and assumptions keep separate evidence labels.

## Numerical verification

- 1,000 explicit parameter combinations: 5 initial volumes × 5 growth rates ×
  5 light-sensor rates × 8 pulse periods, each over 48 h at 50% duty cycle.
- All 1,000 rerun with a four-times finer step. No integration failures in these
  grids. **34 division counts change**: the coarse grid is not a certificate.
- The interface uses a still-finer 0.03125-minute step. Eight standard cases
  agree with independent BDF division counts. Maximum event-time discrepancy:
  **1.0396 min**. Maximum endpoint scaled state error:
  **0.0459**, defined as |x−reference|/(1+|reference|).
  This is not a relative-percent error or a biological confidence interval.
- Six additional BDF cases test the selected timing contrasts at 48 and 96 h,
  and expose the spurious hidden-state lead.
- Exact total-volume identity holds to about
  1.1e-12 relative numerical error in the refined grid.
  Daughter sums conserve the model's volume and amount pools at division.
- 1,000 randomized positive states check the two total-pool differential
  identities; 7,000 zero-boundary checks verify nonnegative production.
- Six typed-port admission/rejection tests check incompatible quantities,
  meanings, units and clocks. Representation compatibility alone does not
  certify a causal or empirically validated coupling.

The fast initial redistribution example shows why checking only normal
trajectories is insufficient. Arbitrary new parameters and preparations remain
exploratory even when the normal-case test suite passes. All assertions concern
this finite model and checked domains, not “every possible combination.”

## Interface verification and remaining release check

Eighteen executable regression checks pass, including fresh simulation against
the independent reference cases and recomputation of both Brier scores from
the per-cell records. Eleven interaction-logic checks pass using Node worker
threads and a small DOM/canvas stand-in: startup, paired runs, playback, node
inspection, rejected findings, real-data results, export, import, changed
controls, custom schedules and invalid rate handling.

**Full browser and visual QA was not run.** Chromium was unavailable and its
download timed out in this environment. The DOM/canvas stand-in is not a browser
and does not verify CSS layout, mobile rendering or browser-specific behaviour.
The supplied browser_test.js remains the explicit release check to run next.
The standalone HTML should be downloaded and opened in a browser; it is not a
deployed Observatory page.

## What is actually new in this delivery?

A runnable, inspectable connection between the programme's node-and-dial idea,
an existing mechanistic cell-cycle model, raw experimental measurements,
held-out observation-panel comparisons, and a ledger that retains failed leads.
The source model, total-pool reduction, numerical integration, parameter sweeps
and cross-validation are established methods. This implementation is not
evidence that their combination is historically novel. No new physical
constant, theorem of all biology or complete organism is claimed.

## What remains unsolved

Nutrient uptake and reserves; osmosis/water balance; ATP and energy; ionic and
electrical dynamics; absolute size calibration; motility/fluid mechanics;
transcription/translation beyond generic regulators; DNA replication/repair;
stress, ageing and death; mating and zygotes; stochastic variation; evolution.
The present lifecycle is asexual growth and repeated symmetric division,
starting from a stipulated initial model state, not conception-to-death.

Next decisive work is joint measurement: equal-light schedules with matched
preparations, calibrated size, division timing and experimentally identified
regulator signals. Fit on some schedules, predict genuinely withheld schedules,
compare against ordinary size/time and growth models, then decide whether any
new connector or measured dial earns admission.

## Source and provenance

[Original code and measurements](https://github.com/novakgroupoxford/2019_Heldt_et_al/tree/ab87e1314e27239d763e9cab188291e01b153574),
Heldt, Tyson, Cross and Novak, “A single light-responsive sizer can control
multiple-fission cycles in Chlamydomonas,” Current Biology (2020).
Pinned source commit: ab87e1314e27239d763e9cab188291e01b153574. The included text
copies retain content with normalized final newlines; checksums describe the
local copies. The upstream GPL-3.0 licence is included. Modified code is supplied
under GPL-3.0-or-later with original attribution.

The [Observatory temporal grammar](https://github.com/thantiklermcirony/empirical-observatory/blob/main/automation/temporal-grammar/README.md)
was inspected for its quantity/context/premise and ordered-operation requirements.
MODEL_CONTRACT.json is a candidate adapter. The hosted catalogue does not yet
register this cell-cycle engine; no hosted integration or scientific admission
is claimed.
