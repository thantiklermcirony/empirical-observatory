# GitHub Contribution Opportunities for the Empirical Architecture

The strongest first campaign is an **AI memory state audit**, beginning with Graphiti's reported failure to retire an assignment after a release. The larger scientific campaign is a **biological prediction evaluator in Pertpy**, followed by controlled comparisons of experiment-selection strategies. A small, explicitly welcomed python-control enhancement offers the clearest early route to an accepted engineering contribution. These projects give the programme a way to demonstrate useful consequences of its ideas through other people's software and acceptance tests.[^1][^2][^3]

The unifying research question is precise: **does the information a system retains support the predictions and actions it is asked to make?** The programme can turn that question into executable tests of state, time, measurement, uncertainty and action. This is a credible contribution strategy. The present evidence does not establish a superior general AI architecture, a biological mechanism, a universal scientific reduction or a quantified compute saving.

All issue-status observations below refer to 9 September 2026. An open issue is a lead; it may describe an intended convention, already have a fix, or refer to an older release. The ranked opportunities distinguish new implementation, independent validation and research that needs a first reproduction. Proposed metrics and work estimates are planning judgments, not measured results.

## Scope and coverage

The automated inventory targeted **42 repositories** and returned **2,058 distinct open issues from 41 of them**. POPGym's separate query returned zero. The inventory combines 1,146 unique grouped-search results, targeted queries to fill repository gaps, and a systems-library inventory of 742 issue rows. Overlap was removed; 219 pull-request rows in the systems inventory were excluded from the issue count and used to check existing work. The main priority map contains 12 opportunities, with nine further candidates or comparison points in the accompanying 21-entry catalog.

This is a broad, bounded scan, not an exhaustive census. Several grouped responses explicitly reported incomplete results, and large repositories were capped by pagination. Targeted follow-ups recovered repositories absent from grouped results; one moved repository, CellRank, was resolved to its current scverse location. Coverage records preserve these limitations and original timestamps. Additional manual sources informed the shortlist but are not added to the 2,058-issue count.

The inventory spans AI memory and evaluation, neuroscience tasks, single-cell analysis, genomics, quantum software, EEG, control, differential equations and Earth-data applications. The detailed assessment concentrates on exact issue threads, current comments, existing pull requests, reference inputs and acceptance criteria. It does not treat every returned title as a reviewed scientific opportunity.

The included scanner makes GET requests to GitHub's issue-search API, records retrieval times and response hashes, removes pull requests, and retains source links rather than entire issue bodies. It keeps partial results on rate limits and records incomplete searches. GitHub search caps and indexing limits mean that a repeatable bounded scan is more defensible than a claim to have searched all of GitHub.[^4]

Detailed candidate records cover AI, biology/EEG and numerical systems, including prior work, proposed tests and stopping rules. The consolidated inventory is machine-readable; the shortlist is a scientific and engineering judgment rather than an external validation of the framework.

## Selection criteria

Priority depends on six questions: does a real project need the result; would a failure matter downstream; is the programme connection operational; can the result be independently checked; is the first experiment affordable; and is there still room to contribute? A useful fix in an established numerical library can be more consequential than a prominent dashboard feature. Stars indicate audience size, not scientific significance.

Every candidate must pass an initial gate: reproduce the relevant behavior on a pinned revision, read its latest discussion and linked work, and identify the expected behavior. A contribution may correctly become documentation, a regression test, a review of someone else's patch, or a negative result. The proposed framework interpretation must survive that gate too.

The scientific distinction is between a **useful application of the programme's discipline** and **evidence that its theory produces an advantage**. Explicit timestamps, missingness masks, calibrated comparisons and conventional estimators can improve software without being new theoretical inventions. A stronger claim needs a new prediction or method that beats suitable alternatives under equal information and resource budgets.

## Priority map

The order below is a portfolio judgment, not a numerical estimate of impact or merge probability. Run one main campaign and one small contribution at a time.

| Priority | Project and exact opening | Contribution worth attempting | First decision gate |
|---|---|---|---|
| 1 | [Graphiti #1841](https://github.com/getzep/graphiti/issues/1841) | Reproduce a temporal memory transition; isolate extraction, invalidation and retrieval failures | Confirm expected relation semantics and a failure on pinned current code |
| 2 | [Pertpy #1035](https://github.com/scverse/pertpy/issues/1035) | A baseline-aware perturbation evaluator with explicit split and measurement contracts | Reuse existing primitives; implement one small evaluator path |
| 3 | [python-control #1173](https://github.com/python-control/python-control/issues/1173) | Expose filter-form gain without inverting a possibly singular transition matrix | Preserve predictor defaults and settle return-value semantics |
| 4 | [NeuroGym #279](https://github.com/neurogym/neurogym/issues/279) | Audit observation, go-cue and reward timing with matched traces | Determine whether timing is actually required by the reward protocol |
| 5 | [LongMemEval #50](https://github.com/xiaowu0162/LongMemEval/issues/50) | Version-bound evidence and temporal-annotation audit | Check the current cleaned artifact and full histories |
| 6 | [AlphaGenome #48](https://github.com/google-deepmind/alphagenome/issues/48) | Independent coordinate and slice-composition tests | Test existing [PR #46](https://github.com/google-deepmind/alphagenome/pull/46), which already proposes the fix |
| 7 | [Qiskit #13730](https://github.com/Qiskit/qiskit/issues/13730) | Batch-sampling dependence and reproducibility tests | Agree integer-seed semantics and reproduce on the target release |
| 8 | [OrdinaryDiffEq #4388](https://github.com/SciML/OrdinaryDiffEq.jl/issues/4388) | Analytic event-value and derivative regressions | Review the already proposed root-finding correction |
| 9 | [scvi-tools #3834](https://github.com/scverse/scvi-tools/issues/3834) | Preserve missing-modality meaning through data registration | Distinguish structural unpairing from supported aligned representations |
| 10 | [Diffrax #766](https://github.com/patrick-kidger/diffrax/issues/766) | Held-input boundary, dense-output and gradient conformance tests | Reproduce the existing September 9 ControlTerm approach first |
| 11 | [do-mpc #531](https://github.com/do-mpc/do-mpc/issues/531) | A traceable physical-time and availability-time export or documentation correction | Establish the intended simulator/estimator logging convention |
| 12 | [Pertpy #1037](https://github.com/scverse/pertpy/issues/1037) | Calibrated design/power tooling, then an IDA comparison | Establish replication, null calibration and the evaluator before adaptation |

Second-wave candidates are Pertpy's explicit multimodal readout request #1039, a narrow slice of CasADi's assigned event-sensitivity roadmap #4303, SciPy distribution-fit constraints #23515 and MOABB's conditional splitter-interface opportunity #1104. These are useful only if their current interfaces and existing work leave a demonstrated gap.[^13][^14][^15][^16]

## Campaign one: memory that can revise itself correctly

Graphiti's issue reports an assignment/release example in which an earlier assignment remains active. It is a focused entry point because the desired result can be examined at several stages. Graphiti already has temporal relationships and provenance; introducing those concepts is not the contribution.[^1]

The first deliverable should be a small fixture containing the two episodes, the extraction configuration, the resulting edges and the answers to current and historical queries. Use a fresh graph. First supply fixed extracted edges and freeze or mock any remaining model judgments to isolate bookkeeping and query behavior; then run the same cases through the full model-assisted pipeline under a call cap. Preserve event time separately from ingestion time. If extraction yields incompatible relation types, correcting a later storage stage may address the wrong cause.

Controls must include simultaneous project assignments, a statement about another person, a negated release, a future release and an out-of-order correction. Multiple assignments may be legitimate: forcing every relation into an exclusive slot would create false corrections. The acceptance criterion is correct current and historical answers across the finite control set, without suppressing legitimate concurrent facts, alongside measured call and latency overhead.

This can grow into a portable memory-revision benchmark. Each adapter receives the same observations and queries. Compare the unchanged library, the proposed change, a simple typed state store and established retrieval approaches. Separate the development cases from a sealed evaluation set. Report stale answers, false invalidations, preserved history, justified abstention, total cost and latency together, with uncertainty across held-out cases and model runs. A lower stale-answer count achieved by deleting correct information is a failure.

LongMemEval provides a complementary evidence audit. Issue #50 questions particular annotations in cleaned data. The useful contribution is a checksum-bound record of question time, utterance time, mentioned event times and the full relevant history; inconsistent date arithmetic can flag a case, but cannot settle every interpretation. Corrections need independent review and must be frozen before method comparison. The older #12 report may already be superseded by cleaned histories.[^5]

LongMemEval-V2 is a later evaluation target, with existing dynamic-state and memory-backend facilities. It is not an empty space waiting for a temporal benchmark. Its scale makes an initial bounded subset and an explicit compute budget necessary.[^6]

NeuroGym tests a different part of the same question: whether the observations support the requested action. Its ContextDecisionMaking issue questions a missing go cue under variable delay. Generate paired traces with matched stimuli and different delays, then compare a persistent remembered-choice policy with variants that have explicit cues. Keep internal phase labels available only to the auditor. If premature responses are unpenalized and the same choice succeeds when the hidden scoring window opens, absence of a cue does not prove the task unlearnable. Report choice accuracy and response timing separately.[^7]

**What would be a significant result?** A failure family reproduced across independently maintained memory systems, corrected by an explicit representation change, with fewer stale answers and no increase in false merges at matched cost. That would support a focused empirical paper about state revision. It would not yet establish a new general intelligence architecture.

**First work package:** one Graphiti reproduction and its controls; four disputed LongMemEval histories; 100 paired NeuroGym traces. Start with CPU fixtures and no training. Treat later model calls as a separately priced experiment. Stop or narrow a branch if current behavior already satisfies its contract.

## Campaign two: biological predictions that survive simple baselines

Pertpy's evaluator request is unusually valuable because the maintainer explicitly wants standard splits, simple baselines and comparable prediction metrics. It already has relevant distance and comparison tools. A programme contribution should fit that ecosystem rather than impose a new application around it.[^2]

Begin with one evaluator accepting measured and predicted AnnData objects. Its manifest must identify the measurement layer, feature IDs/order, normalization, training controls, held-out interventions and context. Align by identifiers, never merely matrix position. Compute reference baselines only from permitted training information. Make missing combinations explicit, and include a negative-control fixture where a mean predictor is optimal.

The first acceptance tests are ordinary but essential: independent NumPy metric agreement, deterministic splits, feature-alignment invariance, rejection of leakage and a scorecard containing the declared simple baselines. Use the public Norman perturbation resource through the existing loader after pinning the exact file and preprocessing. That dataset alone does not validate generalization to arbitrary cell types. The dataset's redistribution terms require a separate check; a manifest and downloader avoid assuming the repository's software license applies to data.[^17]

This provides a credible route to test the biological programme. Specify the proposed state representation before seeing held-out outcomes. Compare it with control mean, additive/linear and established nonlinear alternatives under the same split. Ask where it improves generalization to unseen interventions or combinations and where it fails. A useful result is the resulting map of predictive capability, including domains where added state does not help.

Pertpy #1039 and scvi-tools #3834 expose a prerequisite: measurement type and absence must retain their meaning. A protein readout is not an RNA matrix with another label. An unmeasured modality is not necessarily an observed zero. For scvi-tools, first test tiny RNA-only, ATAC-only and paired fixtures; preserve the union of cell identifiers and the model's existing missingness semantics. Disabling validation globally would not be a sound fix.[^13][^9]

Only after the evaluator works should IDA enter Pertpy's design request. Begin with null/effect simulations and pilot resampling that respect independent biological replicates. Cells from one preparation do not automatically provide independent replication. Compare random, fixed and conventional uncertainty/information-based allocation with the proposed selector at equal assay cost. Prespecify decision loss, false-positive rate and coverage. If calibrated conventional selection matches IDA, retain that result.[^12]

AlphaGenome supplies a concrete, smaller genomic reliability opportunity. Its coordinate-slicing issue has an open, unmerged proposed fix in PR #46. Independent property tests can examine alignment, repeated slicing and the relationship between bins and returned intervals. This needs no live model query; no live Atlas retrieval was executed. It is a useful precursor to genomic comparisons, not evidence that the programme improves variant-effect prediction. Client-code licensing also does not establish reuse rights for provider outputs.[^8]

The AlphaGenome paper already includes TERT/CAGI5 benchmark material. A later genomic evaluation must audit that overlap before describing such examples as a new independent holdout.[^28]

**What would be a significant result?** A representation or experiment-selection method that retains its advantage across prespecified held-out perturbations, strong baselines and more than one appropriate biological context. The evaluator could be adopted even if the proposed scientific method loses. That makes it a productive first investment.

## Campaign three: numerical experiments whose clocks and derivatives mean what they claim

The easiest maintainer-supported contribution is python-control #1173. Its current predictor gain and requested filter gain describe different times. Recovering filter gain by multiplying by an inverse transition matrix fails when that matrix is singular. A maintainer supports an option or companion function, although the interface is not settled.[^3]

A scalar reference is enough to expose the distinction: with transition A=0 and unit observation/process/measurement terms, prior covariance P=1 gives filter gain 0.5 and predictor gain 0. The proposed implementation should use the covariance directly, preserve existing defaults and explain the meaning of any returned poles. Classical Kalman filtering already supplies the mathematics. The programme's value here is making a measurement/state contract explicit and testable.

Diffrax's held-input issue and do-mpc's logging report extend that discipline to time. For Diffrax, compare the existing ControlTerm proposal with an exact interval solution of y'=-y+u under piecewise constant input. Test boundary alignment, dense output, events and gradients separately. The latest comment already reports a successful approach; reproduce it before designing another wrapper. For do-mpc, distinguish pre-step state, next-step measurement, physical sample time and when information becomes available to the controller. An intended logging convention may require clearer export or documentation rather than a core change.[^10][^11]

OrdinaryDiffEq's reported event-gradient problem shows why a correct trajectory is not enough. For u'=1, u(0)=0 and a first threshold crossing u=q with q>0, the event time is T=q and dT/dq=1. The report describes accurate event values with inaccurate automatic derivatives. Current comments already diagnose the root-finding issue and discuss a correction. The useful independent contribution is a parameterized suite that preserves root-side semantics and separates well-conditioned crossings from tangencies.[^18]

CasADi's event-sensitivity roadmap is larger and assigned to a maintainer. A small reference system, x'=p with x(0)=0, p>0 and first threshold q>0, supplies T=q/p and analytic derivatives. Confirm event firing in the supported plugin before testing sensitivities. Choose one missing adjoint or sparsity slice rather than promising the entire engine.[^14]

These tests could become a shared measurement-and-event library used by TAO and IDA. They would establish the reliability of experiment interfaces. They would not by themselves establish better control performance; the Observatory's current TAO comparison must retain its measured result, including the stronger PI tracking baseline.[^19]

## An executed quantum diagnostic

Qiskit issues #13730 and #13047 describe the same seed-reuse family and are counted as one opportunity. A local reproduction used Qiskit 2.1.2, ten identical one-qubit Hadamard circuits and 64 shots per circuit. An integer seed produced one unique 64-shot string across all ten batches. A shared NumPy generator produced ten unique strings, and fresh generators initialized identically reproduced the same collection. The script and result record are included.[^20]

This is evidence for the reported behavior on the installed version, not a latest-release execution or a statistical proof of independence. Source inspection separately pinned current main at `a58029e2343ccc5cc99489524a9bfc7fd7838c30`; it still stores the supplied seed and passes it to each final Statevector. The source hash and exact URL are recorded. Current-main runtime compatibility was not tested.[^21]

A contribution should first settle whether common random numbers or independent streams are intended for each API use. If independent batches are intended, add regression tests covering repeated circuits, parameter sweeps and reproducibility across fresh instances, then evaluate compatibility implications. This is ordinary random-number and API work, with clear relevance to empirical reliability. It is not evidence of quantum advantage or a new quantum algorithm.

## Attractive ideas that should not lead the queue

**Inspect:** the claim-support issue is open, but an August comment reports an external package after an in-tree PR was closed as a poor fit. Use the package as a comparison or extension point after checking it; do not announce a missing scorer.[^22]

**Mem0:** contributors describe ADD-only behavior as a deliberate design choice and the requested current-state behavior as a feature decision. The open conflict-resolution PR and issue comments already contain current/history separation, typed keys, validity windows and false-merge cases. The narrow opening is independent validation of ordinary retrieval, especially when superseded information has multiple stored copies. It is not an unclaimed architecture idea.[^23]

**PySINDy and BoTorch:** open PRs already supply the obvious fixes and tests for the trapping-objective and fantasy-sampler leads. Only missing validation or useful review remains. BoTorch's maintenance announcement also argues against assuming rapid review.[^24][^25]

**PyMC topological checks:** issue #880 already proposes topological posterior predictive checks. It is an interesting collaboration point and a strong example of geometric diagnostics, but the idea belongs to an existing proposal. A programme contribution would need a genuinely additional benchmark or method comparison.[^26]

**MOABB/EEG:** current documentation already includes transfer/calibration facilities and a more specific event-window convention than an older raw source snapshot. The remaining splitter-interface lead requires current-source reproduction. No screened EEG issue establishes a consciousness result.[^16]

**God's Eye View, World Monitor and Cesium:** these remain potential presentation or observation surfaces. Their popularity does not demonstrate a gap that the framework uniquely addresses. A persuasive Earth demonstration would forecast a declared quantity prospectively, timestamp the available data, compare calibrated baselines and score later observations. A striking globe would then explain a result, rather than supply the scientific evidence itself.[^27]

## Capability map for the programme

| Programme component | Capability presently supported | Next capability to test | Evidence that would change the assessment |
|---|---|---|---|
| Predictive state / closure | Formulate distinctions between observed information, retained state and requested outputs | A representation improves held-out predictions with the same available information | Independent benchmark gain against sufficient-history, recurrent, retrieval and state-space baselines |
| AI evidence and revision | Build auditable fixtures and explicit current/history contracts | Reduce stale answers without extra false merges or excessive abstention | Sealed multi-system evaluation with cost, coverage and latency |
| IDA / biological state | Specify measurements, interventions, missingness and experiment budgets | Choose more informative assays or predict interventions better | Calibrated equal-budget comparison with genuine replication and external-context validation |
| TAO / temporal action | Supply exact small-system flows and schedule/measurement tests | A controller improves a prespecified task under declared constraints | Performance over strong control baselines, including failure regimes |
| UHL / geometry | Motivate local coordinate and composition questions | Geometry yields a useful new method or prediction in a defined domain | A theorem with explicit assumptions plus an independent discriminating experiment |
| Quantum and Earth adapters | Make source, time and randomness auditable | Improve a declared inference or forecast task | Real held-out results; simulation and visualization alone do not qualify |

This map is narrower than the programme's ultimate ambition and more useful for deciding what to build. It identifies reusable work without treating every domain as the same mathematical object. Noncommuting actions can occur on an adequate scalar state; order dependence alone does not prove hidden dimensions or a particular curvature. A shared stationary distribution can conceal different dynamics without identifying a unique mechanism. These distinctions belong in public explanations as well as technical tests.[^19]

The most promising future experiment is **transfer of a diagnostic**, not merely reuse of a label. Freeze a state/time/evidence test specification developed in one domain. Apply it to another project before examining the result, document what must change, and test whether it predicts a failure that ordinary checks miss. If the proposed diagnostic requires a new interpretation for every case, the claimed unification is weaker. If it transfers with explicit assumptions and helps produce accepted fixes, the programme gains substantive evidence.

## Public demonstration and contribution strategy

Build a compact **Counterexample Observatory** inside the existing project. Each exhibit should show the available observation, the retained state, the requested answer/action and the result of a controlled intervention. A timeline or geometric view can reveal where two apparently identical situations diverge. Include the exact source revision, an oracle or scoring rule, a baseline and a one-command reproduction.

The visual experience can use the existing restrained 1980s science-fiction style. The core interaction should let a visitor change the missing cue, timestamp, relation scope or measurement modality and see the actual measured consequence. Distinguish stored traces from live computation, and simulated systems from empirical datasets. This makes perspective changes tangible without asking the audience to accept the entire framework first.

Public attention is most plausibly earned through a contribution someone else can use: a regression test accepted upstream, a benchmark adopted by maintainers, a corrected result that survives independent replication, or a method improvement on a demanding held-out task. Link the programme through the technical explanation and attribution where appropriate. Avoid mass issue creation, repetitive pitches, benchmark claims without reproduction and duplicate PRs.

The first upstream package should be deliberately small: the reported behavior on a named version; its minimal reproduction; expected semantics with references; the patch or tests; before/after results; limitations; and credit for existing work. Repository-specific contribution guidance determines format and review expectations. No upstream comments or proposals have been sent as part of this research.

## Recommended execution sequence

**Stage 1 — bounded reproductions.** Start Graphiti #1841 and python-control #1173. Produce a current-code fixture and a small control matrix for each. Run the LongMemEval and NeuroGym audits as independent CPU work. A reasonable first allocation is two focused engineering days per main reproduction, with a decision at the end; these are effort budgets, not delivery promises.

**Stage 2 — one contribution that can be reviewed.** Select the smallest surviving implementation or regression gap. Preserve compatibility, run the existing suite and present the result in the project's own terms. An already resolved issue becomes a documented negative result or a missing-test contribution.

**Stage 3 — the biological evaluator.** Build the narrow Pertpy evaluator with synthetic reference cases, then one pinned public dataset. Establish leakage controls and baseline equivalence before introducing a programme-specific representation. Budget one focused engineering week for an initial candidate, subject to data and interface findings.

**Stage 4 — a shared public challenge.** Publish the reproducible cases in the Observatory, with conventional baselines and at least one case where the programme's approach does not help. Freeze a new evaluation set before comparing methods. Only then formulate a cross-project paper or a larger architecture claim.

**Stage 5 — measured expansion.** Add IDA experiment selection, temporal learned state or a solver contribution only where the earlier result justifies it. No market-size or cost-reduction estimate should be inferred from a toy memory register. Measure training, inference, retrieval, checking, tools, correction and hardware costs at matched quality and coverage before making an economic claim.

## Sources

Primary GitHub sources and official documentation were accessed on 9 September 2026. Detailed records carry exact API retrieval and update times where available. Findings based on comments are attributed to those comments; package availability and claimed results were not silently promoted to independent executions.

[^1]: Graphiti contributors, [issue #1841](https://github.com/getzep/graphiti/issues/1841), opened 6 September 2026; [Graphiti repository](https://github.com/getzep/graphiti) and existing [temporal benchmark request #1515](https://github.com/getzep/graphiti/issues/1515).
[^2]: Pertpy maintainers, [baseline-aware evaluator request #1035](https://github.com/scverse/pertpy/issues/1035), 7 July 2026.
[^3]: python-control contributors, [filter/predictor gain issue #1173](https://github.com/python-control/python-control/issues/1173), 23 July 2025; [maintainer response](https://github.com/python-control/python-control/issues/1173#issuecomment-3507426464), 9 November 2025.
[^4]: GitHub, [REST search API](https://docs.github.com/en/rest/search/search#search-issues-and-pull-requests) and [REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).
[^5]: LongMemEval contributors, [cleaned-data annotation issue #50](https://github.com/xiaowu0162/LongMemEval/issues/50), 15 July 2026; [older issue #12](https://github.com/xiaowu0162/LongMemEval/issues/12); [official cleaned data](https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned).
[^6]: LongMemEval authors, [LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2), official repository.
[^7]: NeuroGym contributors, [ContextDecisionMaking issue #279](https://github.com/neurogym/neurogym/issues/279), 16 December 2025; [official example](https://neurogym.github.io/neurogym/latest/examples/contextdecisionmaking/).
[^8]: Google DeepMind AlphaGenome contributors, [coordinate slicing issue #48](https://github.com/google-deepmind/alphagenome/issues/48), 8 September 2026; [existing PR #46](https://github.com/google-deepmind/alphagenome/pull/46).
[^9]: scvi-tools contributors, [MultiVI registration issue #3834](https://github.com/scverse/scvi-tools/issues/3834), 7 June 2026; [MultiVI tutorial](https://docs.scvi-tools.org/en/stable/tutorials/notebooks/multimodal/MultiVI_tutorial.html).
[^10]: Diffrax contributors, [held-input issue #766](https://github.com/patrick-kidger/diffrax/issues/766), 13 August 2026; [ControlTerm attempt](https://github.com/patrick-kidger/diffrax/issues/766#issuecomment-5600883636), 9 September 2026.
[^11]: do-mpc contributors, [simulator time-alignment issue #531](https://github.com/do-mpc/do-mpc/issues/531), 28 December 2025.
[^12]: Pertpy maintainers, [experimental design request #1037](https://github.com/scverse/pertpy/issues/1037), 7 July 2026.
[^13]: Pertpy maintainers, [multimodal readout request #1039](https://github.com/scverse/pertpy/issues/1039), 7 July 2026.
[^14]: CasADi maintainers, [event sensitivity roadmap #4303](https://github.com/casadi/casadi/issues/4303), 3 March 2026; [event integration predecessor #3682](https://github.com/casadi/casadi/issues/3682).
[^15]: SciPy contributors, [distribution-fit constraints #23515](https://github.com/scipy/scipy/issues/23515), 27 August 2025.
[^16]: MOABB contributors, [splitter-interface issue #1104](https://github.com/NeuroTechX/moabb/issues/1104); [CrossSubjectEvaluation documentation](https://moabb.neurotechx.com/docs/generated/moabb.evaluations.CrossSubjectEvaluation.html); [BNCI2022_001 documentation](https://moabb.neurotechx.com/docs/generated/moabb.datasets.BNCI2022_001.html). See the EEG assessment for version conflicts and related work.
[^17]: scPerturb authors, [versioned data record](https://zenodo.org/records/13350497); Pertpy, [official dataset loaders](https://github.com/scverse/pertpy/blob/main/src/pertpy/data/_datasets.py).
[^18]: SciML contributors, [event derivative issue #4388](https://github.com/SciML/OrdinaryDiffEq.jl/issues/4388), 26 August 2026; [maintainer diagnosis](https://github.com/SciML/OrdinaryDiffEq.jl/issues/4388#issuecomment-5560724256); [existing local correction](https://github.com/SciML/OrdinaryDiffEq.jl/issues/4388#issuecomment-5562281443).
[^19]: Empirical Architecture, [programme repository](https://github.com/thantiklermcirony/empirical-architecture); Empirical Observatory, [release methods and results](https://github.com/thantiklermcirony/empirical-observatory/blob/main/research/Release_0.2.md). These are programme descriptions and existing project evidence, not independent confirmation of its broad claims.
[^20]: Qiskit contributors, [seed reuse issue #13730](https://github.com/Qiskit/qiskit/issues/13730), 24 January 2025; [related issue #13047](https://github.com/Qiskit/qiskit/issues/13047), 27 August 2024. Executed result: `reproduction/qiskit-reproduction.json` in this evidence package.
[^21]: Qiskit, [StatevectorSampler at pinned commit a58029e](https://github.com/Qiskit/qiskit/blob/a58029e2343ccc5cc99489524a9bfc7fd7838c30/qiskit/primitives/statevector_sampler.py), source retrieved 9 September 2026.
[^22]: Inspect contributors, [claim-support issue #4143](https://github.com/UKGovernmentBEIS/inspect_ai/issues/4143); [implementation and external-package follow-up](https://github.com/UKGovernmentBEIS/inspect_ai/issues/4143#issuecomment-5455377194), 28 August 2026.
[^23]: Mem0 contributors, [conflict-memory issue #5867](https://github.com/mem0ai/mem0/issues/5867); [design/feature classification](https://github.com/mem0ai/mem0/issues/5867#issuecomment-5003008273); [existing PR #6017](https://github.com/mem0ai/mem0/pull/6017); [typed-state design and counterexamples](https://github.com/mem0ai/mem0/issues/5867#issuecomment-5084114511); [multiple-copy discussion](https://github.com/mem0ai/mem0/issues/5867#issuecomment-5525489824).
[^24]: PySINDy contributors, [trapping objective issue #661](https://github.com/dynamicslab/pysindy/issues/661) and [existing fix/tests PR #692](https://github.com/dynamicslab/pysindy/pull/692).
[^25]: BoTorch contributors, [fantasy sampler issue #3303](https://github.com/meta-pytorch/botorch/issues/3303), [existing PR #3359](https://github.com/meta-pytorch/botorch/pull/3359), and [maintenance notice #3308](https://github.com/meta-pytorch/botorch/issues/3308).
[^26]: PyMC contributors, [topological posterior predictive checks proposal #880](https://github.com/pymc-devs/pymc-examples/issues/880), 20 May 2026.
[^27]: [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), [World Monitor](https://github.com/koala73/worldmonitor), and [Cesium](https://github.com/CesiumGS/cesium), official project repositories.
[^28]: AlphaGenome authors, [AlphaGenome primary paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC12851941/), benchmark and methods material. TERT/CAGI5 overlap is detailed in the accompanying biology candidate record.
