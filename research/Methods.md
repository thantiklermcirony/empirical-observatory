# Methods and evidence — Expedition 001

Engine 0.2.0. All three rooms share a versioned record format but have different physical interpretations and sources. No cross-domain equivalence is inferred from their shared interface.

## TAO fixture

The observable is a normalized synthetic reserve x. A second bounded variable carries actuator history. Each 0.05-second step updates memory exponentially, then uses the exact solution of a scalar linear flow with rates frozen for that step. This is a convex combination of the current reserve and an interior equilibrium, so the plant remains in [0,1] for every permitted action. This invariance belongs to the plant integration and is shared by all controllers; it is not an empirical advantage of TAO.

Four disturbance families cover reserve loss, repeated loss, stale/low-confidence sensors and changing targets. The controller has access only to the noisy reserve, target and quality metadata. Manual, clipped-linear, anti-windup PI, sigmoid-drive and TAO actions share the same [-1,1] actuator limits. TAO additionally uses logit coordinates, a hysteretic mode, minimum mode-transition dwell (actuator direction may reverse within the dwell) and suppression of outward action at declared margins. Sensor fallback uses zero actuation for every controller.

Six candidate gains per automatic controller are evaluated on four development seeds. A fixed objective—MAE + 2*boundary risk/30 + 0.002*actuator effort—selects each gain. Twelve separate test seeds are then used once for the report. The fixture is small and its families are known during development; this is not broad out-of-distribution validation. The test seeds are public for reproducibility and should not be reused to tune a claimed next result.

| Controller | Selected gain | Mean absolute tracking error | Integrated absolute actuation | Mean initial recovery (s) |
|---|---:|---:|---:|---:|
| Clipped linear | 12 | 0.013324 | 2.421691 | 0.6125 |
| Anti-windup PI | 12 | 0.012432 | 2.493981 | 0.6083 |
| Sigmoid drive | 12 | 0.013550 | 2.415488 | 0.6500 |
| TAO contract | 18 | 0.013116 | 2.503905 | 0.6083 |

All twelve runs per controller recovered after the first perturbation. Recovery means the start of the first full second within ±0.04 of target after the event. The corridor score uses ±0.08 after five seconds. Boundary exposure refers to x outside [.05,.95], while boundary risk integrates excursion magnitude. Chart travel depends on the chosen logit chart and is not an invariant measure of physical work. These descriptive means have no associated claim of statistical significance or hardware superiority. Exact per-run data are in `public/research/benchmark.json`.

The five flow primitives follow the manuscript-inspired closed forms implemented in `lib/engine/tao.ts`. Numerical tests verify composition, boundedness, reversible interior alignment, quality fallback, dwell behavior, deterministic replay and single application of discrete disturbances. Prior manuscript benchmark tables are not copied into this report. [TAO paper](https://ssrn.com/abstract=6779487).

## Signal Bay

Twenty-four trials use a seed-balanced assignment to fixed and adaptive response windows. Targets and foreperiods are seeded; the responses are actual browser events. Timing uses `performance.now` relative to the session start. Foreperiods vary from 650 to 1,349 ms. Fixed trials allow 1,400 ms. The adaptive rule uses completed response history, a smoothed success estimate and a bounded logistic window.

Two forecasts are frozen before the stimulus: a last-outcome rule and a recent-six smoothed rule. They are scored with Brier loss. These are illustrative rules, not trained models. Different response windows change task difficulty, so greater accuracy does not establish better learning. React rendering, display refresh, device input and browser scheduling add uncalibrated latency. Pausing or leaving the visible task discards the ongoing incomplete trial and repeats its index. No synchronized EEG is used.

For research: preregister timing/quality exclusions, use calibrated stimulus timestamps, independent participants and held-out sessions, account for practice/fatigue and condition order, and compare frozen strong models. Human completion has not been fabricated to test the UI.

## Quantum Lab

The hidden state belongs to six Pauli eigenstates. Each observation uses fresh prepared copies measured in X, Y or Z; successive batches do not collapse and remeasure one persistent qubit. Quantum Tensors calculates Born probabilities. The default mixes in 0.12 depolarising noise. The game samples batches of eight shots, up to 96. A discrete Bayesian posterior updates the six candidates; the adviser computes expected entropy reduction for the next batch. The displayed Bloch vector is a posterior mixture, not a peek at the simulator's hidden state.

All 18 noiseless state/basis probabilities match analytical values and an independent Qiskit Statevector implementation. The depolarised probabilities are also reconciled across the references. Aer eigenstate and seeded-sampling checks pass. This demonstrates compatible circuit semantics, not quantum advantage or a new physical law. The optional IBM submission path has not been run.

## Instrument data

The bridge acquires actual BrainFlow SDK data from a synthetic board in automated tests. It requires a bearer token and allowed browser origin, binds only to loopback, rejects invalid timestamps, and returns explicit source metadata. Physical EEG, recorded-device replay and cloud hardware need separate validation. Device timestamps and browser stimulus timestamps are not synchronized. The next integration should use LSL or a measured clock-correction protocol and retain jitter/error estimates.

## Validation boundaries

Core numerical and record-validation tests and Python SDK tests are automated. TypeScript and production compilation are checked. Focused browser acceptance covers navigation, live Earth capture, AI result selection, Genome form validation and quantum replay. WebMCP valid and invalid inputs are exercised. These usability checks do not calibrate human timing or validate physical hardware. The generated shadcn components are retained from the scaffold; project-specific lint scope and any exclusions are documented in the validation record.

The source exports its method and evidence so failed hypotheses can be retained alongside successful ones. Scientific scope expands only with new experiments.

## Sampling correction and new integrations

Version 0.1 reused the first seeded RNG draw for both hidden-state choice and the first shot. Version 0.2 domain-separates state selection from measurement seeds, while keeping legacy replay explicitly labelled biased. The 60,000-seed conditional-frequency regression complements circuit-probability tests. New quantum records enforce the complete game protocol.

The exact primitive formulas now avoid cancellation for tiny states, including at zero duration. These implementation corrections do not change the published controller benchmark, which uses the separately specified plant update.

Earth observations retain station event time, provider clock, retrieval time, missingness, reported denominator and original-byte hashes. The public endpoint retrieves only two fixed Oslo feeds, bounds body sizes and caches for 60 seconds. Browser replay compares actual captures; it does not invent intermediate states. The optional God's Eye module is source-compatible with the pinned integration contracts and mock-host tested, not fully accepted in that host.

POPGym results use actual upstream environments with development/held-out episodes and negative controls. This establishes an integration and expected memory diagnostic, not a new neural model. AlphaGenome uses the installed SDK with stubbed transport in tests, but no real provider query or measured assay is included. See [the release plan](Release_0.2.md) for remaining scientific gates.
