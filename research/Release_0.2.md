# Expedition 002 — Evidence beyond the station

The Observatory now connects the programme to real observation infrastructure and established research software. The first release is a working instrument and reproducible test suite, not a demonstrated universal theory or a new AI architecture.

| Line | Delivered in 0.2 | Next scientific acceptance gate |
|---|---|---|
| TAO | Five numerically stable flows; bounded reactor; equal-budget PI/linear/sigmoid/TAO comparison; replay | Reproduce the manuscript fixture separately, then freeze new stress families and compare with model-predictive/barrier methods. PI currently has lower tracking error than TAO. |
| Earth | Actual Oslo GBFS capture, fixed 24-station subset, provenance, live capture endpoint, observation replay, optional God's Eye module | Collect a prospective station-status dataset; freeze held-out stations/days and score persistence, seasonal and history baselines at matched observation budgets. |
| Genome | Real AlphaGenome SDK adapter, bounded metadata-driven queries, reference-allele validation, request planner and assay-pairing preflight | Permitted live retrieval; audited TERT assay/context join; reproduce published CAGI5 comparison before an independent locus/assay test. |
| AI | Executed POPGym delayed-memory diagnostic with current-cue and unrelated-history controls | Implement the proposed learned state-revision model; compare recurrent, state-space and Transformer baselines with matched information, quality and measured compute. |
| Signal / EEG | Local behaviour task and tested synthetic BrainFlow acquisition | Calibrate visual onset; synchronize device/browser clocks with measured uncertainty; verify a physical device before closed-loop claims. |
| Quantum | Corrected seeded sampling; 18 analytical/Qiskit reference cases; Bayesian measurement game | Run optional cloud hardware only after a bounded experiment is configured. No quantum advantage is claimed. |

## What changed after independent review

Three research agents audited biology, Earth integration, and scientific/code validity. A follow-up agent audit checked the corrected source. Root integrated the findings and reran the tests. This is independent code review within the build, not independent external replication of the scientific programme.

- State selection and the first quantum shot no longer reuse one random draw. A 60,000-seed conditional-frequency regression checks all six states. New records declare engine 0.2.0. Old 0.1.0 quantum records replay through the legacy path with an explicit bias warning; exclude them from statistical evidence.
- Exact primitive flows preserve tiny interior states at zero duration. Alignment uses unclipped interior log odds; growth uses stable algebra and threat uses `expm1`. Numerical chart clipping remains a separate controller/diagnostic choice.
- Quantum imports enforce configuration, eight-shot batches, noise, budget and completion. Instrument receipt rejects malformed metadata and duplicate or out-of-order clocks so valid captures round-trip.
- TAO's dwell constrains **mode transitions**. Its feedback actuator may change direction during a dwell interval. Plant [0,1] invariance belongs to the shared exact plant update, not a TAO superiority result.
- God's Eye View already includes live bikeshare. Our contribution is provenance, measurement meaning and replay. The optional module passes lifecycle tests, but has not passed full upstream-host/browser acceptance.
- Oslo historical trips omit staff rebalancing and cannot reconstruct station occupancy. Available-bike fraction is available bikes / reported capacity, not all physically occupied docks.
- AlphaGenome already benchmarks the Kircher TERT contexts. This first biology task is a reproduction and context audit, not an untouched superiority test. No live Atlas output or biological measurement is bundled.

## What the AI result actually says

The real POPGym 1.0.7 environment was used, with 100 development and 200 held-out episodes per task. Observation-only accuracy was 25.92% at lag 3 and 24.63% at lag 15; the selected history register reached 100%. In the current-cue control both reached 100%; unrelated history stayed near chance. This is established sufficient-history behavior, not a novel learned architecture. No model-size reduction, LLM advantage or market cost estimate follows from it. Full seeds, per-episode results and bootstrap intervals accompany the source.

## Projects and paper updates

1. **TAO: exact flows, composition and control contracts.** Separate the kinematic derivation, numerical implementation, plant assumptions and controller guarantees. Publish the current baseline losses. A second empirical control paper needs sealed new tasks and stronger conventional methods.
2. **UHL: conditions and scope of the geometry.** Distinguish coordinate representations, transformation composition, identifiable state and additional dynamical assumptions. Preserve earlier papers as citable historical sources; mark supersession only when a concrete replacement is ready. This audit is not a line-by-line review of all 41 manuscripts.
3. **IDA: measurement selection with an explicit loss and cost.** Represent candidate explanations, observations, measurement operators, known context and leakage boundaries. Require a decision advantage over fixed, random and standard adaptive schedules.
4. **Genome Observatory: reproduction before extension.** Pair original measured assay rows by exact variant and allele; audit reference/assembly/context compatibility and prior training/benchmark overlap. Then test a new measurement-selection prediction on independently licensed data.
5. **Scientific AI: a precisely specified state-revision model.** Replace blanket claims that current AI ignores context with falsifiable comparisons against actual memory/context baselines. Publish all model calls, training, checking, inference latency and failures before economic extrapolation.
6. **Earth Observatory: a public observation-budget challenge.** Release a prospective dataset, frozen evaluation and replayable outcomes. Use availability and trip demand as separate tasks. Offer an upstream God's Eye module only after running the pinned host and share-state checks.

## How to earn outside attention

The first public unit should be a result another person can rerun: one command, a small dataset, an explicit question, baseline scores and a failure case. The station supplies the interactive explanation; GitHub supplies the evidence. Publish reproducibility issues, adapters and counterexamples. Prepare focused upstream contributions when their host acceptance gates pass. No upstream messages or pull requests have been sent as part of this release.

Priority: run the **AI state-revision comparison** and the **prospective Earth observation pilot** as separate bounded studies. The Genome adapter is ready for configured access and a measured assay join. Physical EEG and quantum hardware are later validation campaigns. These are acceptance gates, not promised breakthrough dates.

## Source and evidence

- [God's Eye integration and license notes](../integrations/earth/README.md)
- [Oslo capture manifest](../integrations/earth/oslo-snapshot.manifest.json)
- [Genome interface, terms and assay research](../adapters/genome/RESEARCH.md)
- [POPGym protocol](../integrations/memory/Memory_Protocol.md)
- [Original scientific audit](../integrations/memory/Scientific_Audit.md)
- [Original 17-repository audit](integration-sources.json)
- [Release validation](Validation.json)
