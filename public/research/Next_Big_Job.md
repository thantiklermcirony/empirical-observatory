# Next expedition — updated after the 0.2 integration audit

The executable release and prioritized acceptance gates are now in [the current release plan](https://github.com/thantiklermcirony/empirical-observatory/blob/main/research/Release_0.2.md). The original planning audit below is retained for provenance. Where its proposals conflict with the release findings, the release findings take precedence: God's Eye already has live bikes; Oslo trip history cannot reconstruct availability; TERT is already an AlphaGenome benchmark; there is no demonstrated AI cost reduction.

# Next big job: make the programme useful inside other people's tools

Decision record · 9 September 2026 · follows Observatory 0.1

Build a common experiment layer that can travel between a research game, a living globe, biological datasets and AI benchmarks. Its job is to make a specific proposition testable: **does the state representation contain enough information for the prediction or decision being made, and what is the cheapest useful next observation?** The programme's broader claims remain hypotheses until those tests distinguish them from existing approaches.

The public-facing next release should be **Earth Observatory: The Missing Measurement**. Alongside it, run the harder AI benchmark and prepare the first biological audit. This gives the programme both a striking demonstration and a result people can independently check.

## What we actually inspected

This is a targeted audit of 17 repositories, not an exhaustive census of GitHub. Repository metadata, current commits and available license identifiers are recorded in `integration-sources.json`. Source interfaces were inspected in AlphaGenome and God's Eye View; the remaining candidates were screened using repository descriptions and primary documentation. No AlphaGenome requests were sent, no upstream repository was modified, and no new biological or environmental result is claimed.

The likely requested globe is [Bilawal Sidhu's God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), formerly WorldView. Its README reports No. 1 daily and weekly Trending in August 2026. The API audit returned 19,927 stars; [World Monitor](https://github.com/koala73/worldmonitor) had 85,876. These are dated popularity signals, not evidence that either is GitHub's most popular repository overall. The proposed integration targets God's Eye View; World Monitor is a separate candidate.

## 1. Earth Observatory — the first integration to ship

**Experience:** fly from the station to Earth. Select a public bikeshare station. See available bikes, empty docks and missing observations. Freeze the timeline. Two apparently identical present states can carry different recent histories. Predict what happens next, spend a limited observation budget, then reveal the recorded outcome. Switch between raw occupancy, a bounded coordinate and uncertainty. Every view refers to the same underlying record.

This is a proposal to test history and measurement selection on bounded systems. It is not a claim that dock availability follows the TAO reactor equations.

**Why this route:** a bounded count with a known capacity provides a relatively clear observable, compared with an ill-defined universal 'world state'. Public station telemetry gives the game an immediate real-world connection. A replay can be deterministic even when a live service is unavailable. Start with one provider whose archival and redistribution terms permit the experiment; do not label a live-only snapshot an historical dataset.

**Actual integration seam:** God's Eye View's `src/data/manager.js` exports `DataLayerManager`; `register(layerModule)` must run before registrations are finalized. A new module must own a stable ID and its lifecycle. The inspected earthquake layer demonstrates `init`, `enable`, `disable`, `update`, `destroy`, `getStats` and `getAnalystRecords`. Its plain records provide a useful export pattern. The context store has selection events and entity metadata, but is not itself an experiment archive. [Manager source](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/src/data/manager.js), [example layer](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/src/data/earthquakes.js).

Add `observatory-experiments` through normal bootstrap registration in a small integration branch. Keep the science engine in a separate package; import its compiled results into the globe. Do not splice the entire globe into the station bundle. The fork is a test bench for an optional upstream contribution, not a wholesale replacement of either app.

**Proposed modules:** `stationFeedAdapter`, `observationLedger`, `historyTask`, `probeBudget`, `experimentLayer`, `replayExport`. Record source URL, license, retrieval time, event time, station identity, units, capacity changes, measurement availability and quality. Distinguish observed, interpolated and forecast values visibly. A rendered trajectory is not automatically measured data.

**Comparison:** predict availability 15 and 30 minutes ahead. Compare persistence, seasonal station averages, an exponentially weighted history model, and a compact learned history model against the proposed state construction. Freeze the development period, leave out complete later days and complete stations, and score separately on normal operation, missing packets and capacity changes. Give all methods the same usable information, sampling budget and forecast deadlines. A second experiment ranks which station to refresh next under a fixed request budget; compare round-robin, oldest-record-first and estimated uncertainty reduction.

**Success:** lower held-out error or better calibrated uncertainty at the same request/compute budget; publish per-station distributions and failure cases. If ordinary history models match us, the result is a reusable observation experiment, not proof of a new predictive architecture. No forecasting of earthquakes or emergency decision support is implied by the globe.

**What maintainers get:** a reusable experiment/replay layer, source-age handling, an environmental mission and tests. They should be able to accept the contribution without endorsing the whole theory.

**License:** God's Eye View's source is MIT, but its [license file](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/LICENSE) explicitly separates provider data and third-party assets. Preserve attribution and select only feeds/assets whose terms suit this release. The first demo can use a simple Cesium globe and eligible data; photorealistic tiles remain an optional provider feature.

## 2. Genome Observatory — a scientific project of its own

AlphaGenome Atlas supplies precomputed regulatory variant-effect predictions, AVI scores and related feature information. AlphaGenome already predicts multiple modalities and tissue/cell contexts. We must not position it as a naive context-free sequence model. [Official client](https://github.com/google-deepmind/alphagenome).

**Experience:** a locus becomes an explorable instrument panel. Move between sequence, predicted regulatory tracks, experimental measurements and context labels. Selecting a candidate observation shows which competing explanation it might discriminate. The same score must not be visually promoted from prediction to experimental truth.

**Actual integration seam:** `alphagenome.atlas.atlas.create(api_key)` creates an `AtlasClient`. Its `query_variant`, `query_variants` and `query_interval` methods filter by requested scorer, ontology and gene; results are mappings to AnnData objects. `scorer_metadata()` identifies the available scorers and signedness. Use this metadata, rather than hard-coded invented scorer names. [Pinned Atlas source](https://github.com/google-deepmind/alphagenome/blob/aa6fc8f6faadcb8c910fa2b85b57386fbd5c7b5d/src/alphagenome/atlas/atlas.py).

**First experiment:** select one independent variant assay with compatible tissue context and explicit reuse permission. Lock genome assembly, coordinate convention, reference/alternate alleles, assay normalization and join rules. Begin with a small named locus set. Retrieve only required scores, cache when permitted, and compare their calibration and residuals across experimentally recorded conditions. Do not fit a new model on restricted outputs. Context is useful only if it is available at prediction time and adds information on held-out loci or independent experiments.

**Second, separate experiment:** use perturbation measurements through Pertpy/GEARS and dynamics baselines through CellRank or dynamo. Test whether an observed pre-intervention state or known treatment history improves a held-out response prediction. Gene knockouts and single-nucleotide variants are different interventions: a gene-name join is not a validated bridge between their effects. Build and evaluate this tier separately before attempting cross-scale inference.

**Data we still need to establish:** an assay with a permitted license, enough independent loci/conditions, actual pre-intervention metadata, and a split that prevents donor/locus/batch leakage. Snapshot pseudotime is an inferred ordering, not directly observed cellular history. Choosing a dataset that lacks the claimed variable would make this test invalid.

**Baselines and falsifiers:** tissue-stratified AlphaGenome score evaluation; ordinary statistical context adjustment where licensed; existing perturbation/dynamics methods in their appropriate tasks. Predeclare endpoints, compare within matched context and use donor/locus/experiment holdouts. Shuffled history, batch-only and state-free ablations must accompany any lift. If the effect vanishes under these controls, reject the claimed advantage for that task.

**Material data constraint:** the client is Apache-2.0, but the official README says API/Atlas outputs are generally non-commercial and cannot train other ML models, except expressly permitted downloadable artifacts. The linked full terms route required sign-in during this audit, so the artifact exceptions have not been cleared. Treat training, redistribution and commercial use as unavailable until the exact chosen artifact terms are verified. This affects implementation, not the ability to prepare the research protocol. [Terms summary](https://github.com/google-deepmind/alphagenome#terms), [provider terms](https://deepmind.google.com/science/alphagenome/terms).

**Resource choice:** start with filtered API/Atlas retrieval after the user configures a key. Do not attempt a bulk mirror or local full-model deployment for the initial demonstration. The research repository lists substantial accelerator requirements. [Research implementation](https://github.com/google-deepmind/alphagenome_research).

## 3. AI — earn the largest claim with a small decisive benchmark

Use [POPGym](https://github.com/proroklab/popgym) and [Gymnasium](https://github.com/Farama-Foundation/Gymnasium) before inventing a leaderboard. Existing partially observable tasks already expose the difference between an instantaneous observation and a sufficient history representation. That difference alone is established prior art, not a discovery of this programme.

Freeze three tasks: one diagnostic memory task, one noisy control task, and one negative control where the present observation is sufficient. Compare an observation-only model, frame stacking, a tuned recurrent model, a state-space/filter baseline appropriate to the task, and the proposed minimal-state method. Match observations, interaction counts, training budget and hyperparameter-search budget. Report learning curves, inference latency, memory, energy if measured, and total tuning cost; use multiple independent runs and interval estimates. A theorem-derived guarantee must specify assumptions and be linked to a testable implementation property.

The economic claim must come from matched-quality measurements. Define speedup as baseline total cost / proposed total cost at the same prespecified quality threshold, with training/tuning and inference reported separately. A smaller parameter count is not a cost measurement. Do not extrapolate a toy memory result to the entire AI market. If the strongest history baseline removes the advantage, revise the claim before expanding the experiment.

## Ranked integration map

All rows are proposals unless marked implemented. Primary repository links describe upstream capabilities; the experiment contribution is our design.

| Repository | What it contributes | Our concrete addition | Status / decision |
|---|---|---|---|
| [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) | Globe, layers and selection | Observation-budget mission and reproducible history replay | Source interfaces inspected; first visible extension |
| [CesiumJS](https://github.com/CesiumGS/cesium) | Geographic rendering | Scientific uncertainty and trajectory layers | Use through globe; do not build another globe engine |
| [World Monitor](https://github.com/koala73/worldmonitor) | Aggregated monitoring interface | Possible later evidence-provenance export | Lower priority; AGPL and feed terms need architecture review |
| [AlphaGenome](https://github.com/google-deepmind/alphagenome) | Variant scores and tracks | Independent context/calibration audit | Source interfaces inspected; credentials/data terms pending |
| [AlphaGenome research](https://github.com/google-deepmind/alphagenome_research) | Model implementation | Reproduction only if API audit warrants it | Defer compute-heavy fork |
| [Pertpy](https://github.com/scverse/pertpy) | Perturbation analysis | Dataset adapter, held-out intervention evaluation | High scientific fit; first biology ingestion candidate |
| [CellRank](https://github.com/scverse/cellrank) | Fate probabilities, multi-view dynamics | State/history sensitivity and uncertainty comparison | Strong baseline; do not claim to invent fate geometry |
| [dynamo](https://github.com/aristoteleo/dynamo-release) | Vector fields and expression dynamics | Compare coordinate-dependent and invariant quantities | Strong baseline; geometry alone is not novelty |
| [GEARS](https://github.com/snap-stanford/GEARS) | Gene-perturbation prediction | State-conditioned evaluation with leakage controls | Separate intervention tier; respect its documented domain limits |
| [POPGym](https://github.com/proroklab/popgym) | Established memory tasks | Matched-budget minimal-state challenge | First AI benchmark |
| [Gymnasium](https://github.com/Farama-Foundation/Gymnasium) | Standard environment interface | TAO environment with observation/action contracts | Build export so others can test their agents |
| [MuJoCo](https://github.com/google-deepmind/mujoco) | Physical dynamics | Actuator-history and recovery tasks | After simulator-only benchmark; no robot claim yet |
| [BrainFlow](https://github.com/brainflow-dev/brainflow) | Biosensor acquisition | Local authenticated stream, explicit source labels | Implemented; synthetic SDK acquisition tested |
| [liblsl](https://github.com/sccn/liblsl) | Multimodal clock synchronization | Stimulus/EEG marker alignment with measured jitter | Next instrument requirement, not yet integrated |
| [Quantum Tensors](https://github.com/Quantum-Flytrap/quantum-tensors) | Browser quantum calculations | Measurement-budget beacon game | Implemented and numerically tested |
| [Qiskit Aer](https://github.com/Qiskit/qiskit-aer) | Independent quantum simulator | Cross-library reference and circuit adapter | Implemented; local simulator tested |
| [Pycro-Manager](https://github.com/micro-manager/pycro-manager) | Microscope acquisition control | IDA selects the next permitted image measurement | Later lab collaboration; hardware integration not tested |

## The next bounded build

Planning estimate: roughly 15 builder-days plus independent review and any time needed to obtain suitable data. This is an effort estimate, not a delivery promise or scheduled automation.

| Work item | Output | Acceptance condition | Effort |
|---|---|---|---:|
| INT-01: freeze the observation protocol | Versioned schema for observed/derived/predicted values, units, clocks, missingness, provenance and cost | Round-trip fixtures; reject mixed units and future information | 2 days |
| INT-02: Earth data pilot | One licensed station-feed adapter and a reproducible archive manifest | Measured history exists; timestamps and capacity changes audited | 2 days plus collection |
| INT-03: globe integration | Optional experiment layer and replay controls | Works through normal layer lifecycle; export reruns outside the globe; no key required for packaged eligible replay | 3 days |
| INT-04: AI challenge | Three frozen tasks and strong baseline runner | Held-out results, search-budget accounting and negative controls | 4 days plus runs |
| INT-05: Genome feasibility notebook | Schema-checked minimal Atlas retrieval and independent assay join | Exact artifact terms cleared; genuine independent target; zero private keys in export | 2 days plus access |
| INT-06: release evidence | Reproduction guide, short demo, contribution branch and benchmark table | A fresh user reproduces one result; all claims map to evidence | 2 days |

If INT-05 lacks suitable terms/data, ship the Earth/AI work and leave biology explicitly pending. If Earth archival terms fail, choose a different licensed public bounded feed; do not fabricate historical measurements. Keep these as separate adapters so one blocked provider does not block the programme.

## How this reaches other communities

Publish one compelling, specific challenge: **"Can your model tell these identical-looking states apart—and choose the next measurement for less?"** The demo should show a prediction made before the reveal and let another person reproduce the result. Build a 60–90 second tour from actual runs, an installable package, a small data fixture and a one-command baseline comparison.

Offer narrow upstream contributions that solve the host project's problems: a reusable layer and reliable replay for the globe; a careful assay-evaluation notebook for biology; an environment and cost ledger for AI. Draft a separate explanation for each community using their vocabulary and metrics. Submit upstream messages/PRs only when authorized; none have been sent in this audit.

Measure external reproductions, independent baseline submissions, repeat use and accepted improvements. Stars and video views indicate reach, not scientific confirmation. A public challenge, with negative results retained, makes the programme easier to examine and harder to dismiss.

## Further possibilities worth preserving

- **Observability lens:** show which apparently distinct latent explanations remain indistinguishable under the selected instruments. Mark simulated ground truth separately from real-data uncertainty.
- **Counterexample missions:** reward players for breaking a proposed invariant or finding a case where the framework loses. Contributions become regression fixtures.
- **Instrument exchange:** replay one experiment through different measurement operators; spend a finite budget on a discriminating probe. This links IDA, the quantum room and future microscopy without asserting identical physics.
- **Multi-scale expedition:** travel from planet to ecosystem to cell to circuit through a common evidence ledger. The transition is a comparison of modelling commitments, not a proof that all levels share one causal law.
- **A theorem-to-experiment map:** every formal result gets its assumptions, observable consequence, executable example and known failure conditions. This is the route from the UHL corpus to useful software and later replacement papers.

The ambition can be broad: a public laboratory for discovering what our measurements leave out. The claim at each station must stay as precise as its evidence.
