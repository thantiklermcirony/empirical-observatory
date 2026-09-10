# The next three contribution investigations

Research snapshot: **10 September 2026**. Recommendation: start with **Ray Serve**, follow with **Dask**, and develop **NASA/JPL F Prime** as a conditional aerospace project. These are ranked investigations, not three bugs we have reproduced or three promised fixes. No candidate repository was reproduced or patched, no hardware experiment was run, and no new upstream contact was made during this scan. A pandas-only reference check is identified below.

Three research agents and a coordinating review considered **31 public repositories**, including two dependency/context repositories. This was a bounded screen, with targeted issue bodies, current and closed PRs, comments and source checks; it was not an exhaustive code audit. Exact shortlisted histories were refreshed through the GitHub REST API. Broader web results can lag. Live PR checks displaced two initially attractive candidates before this report was published.

| Order | Project and concrete objective | Why it matters | First gate |
| --- | --- | --- | --- |
| 1 | [Ray Serve #63784](https://github.com/ray-project/ray/issues/63784): restore subscriptions after a controller is replaced | A running service can retain stale routing state even when a request returns HTTP 200 | Reproduce replacement with real actors, then verify the returned application identity |
| 2 | [Dask #12564](https://github.com/dask/dask/issues/12564): preserve merge semantics across empty partitions | Distributed data analysis should not change row identity because data were partitioned differently | Compare the reported query with pandas across controlled partition layouts |
| 3 | [NASA F Prime #5845](https://github.com/nasa/fprime/issues/5845): decode recorded communication data on the ground | Delayed telemetry needs a faithful, inspectable reconstruction | Agree the format, ownership and upstream approval before implementation |

## 1. Ray Serve: recovery that reaches the client

The reporter describes a surviving HAProxy manager holding an obsolete controller handle after replacement. Routing updates stop reaching it; a successful HTTP status can conceal a response from the wrong application. Contributor eicherseiji [proposes name-based controller re-resolution and offers review](https://github.com/ray-project/ray/issues/63784#issuecomment-4784556679). That is concrete engagement, not a promise of acceptance. Existing [PR #63785](https://github.com/ray-project/ray/pull/63785) covers legacy-checkpoint handling and diagnostics; its retrieved scope does not implement reconnection.

**Our proposed contribution:** a small recovery mechanism in the existing long-poll client, with explicit shutdown and retry behavior. Preserve existing consumers that do not opt into re-resolution. Before designing it, freeze current source and check whether the companion PR has expanded.

**Decisive experiment:** use real Ray actors, replace controller A with controller B under the same stable name, and require the original subscriber to receive B's payload. Then run two tiny constant-response Serve deployments through the actual proxy and assert the intended response body. Include delayed replacement, repeated replacement, stale callbacks, old subscription cursors and deliberate shutdown. A repair must not multiply polls or revive stopped clients.

**Resources and public result:** a disposable Linux CPU environment and HAProxy; no model weights or GPU. Show the injected failure, exact response identity and measured recovery times with sample counts. Start with baseline failure and candidate success on the same finite matrix. This could improve serving reliability; no production availability percentage or financial saving has been measured.

## 2. Dask: the answer should survive repartitioning

The open report supplies a small left-merge example with empty right-hand partitions. Matched rows retain the right index, while an unmatched row unexpectedly takes its left index. The issue remains labelled for triage. Contributor sahilmathur254 has already offered focused regression work and asked which indexing contract is intended; coordinate with that contributor. Our exact-reference PR search returned no match; a broader title search found only older closed changes. These searches do not establish that nobody is working on it. [Report and discussion](https://github.com/dask/dask/issues/12564).

**Our proposed contribution:** establish the promised pandas-compatible result first, then correct the narrow partition/merge path if current Dask still violates it. An error in reported assumptions would itself be a useful finding. Do not impose a novel indexing convention or rewrite the shuffle engine.

An independent pandas 3.0.5 reference check produced an unmatched index of NaN for the full merge, but C when that row was merged against an empty right frame. That supports investigating partition composition. It is not a current-Dask reproduction, a diagnosis of its implementation or a confirmed repair. [Recorded reference output](Dask_Partition_Oracle.json) · [Pandas-only script](Dask_Partition_Oracle.py). Run the script with Python 3.12 and pandas 3.0.5 to repeat this small reference check.

**Decisive experiment:** run the same authored records through pandas and Dask, varying empty-partition placement, known/unknown divisions, matched/unmatched keys and supported merge algorithms. Compare values, row multiplicities and index semantics after an explicitly defined order normalization. Keep the logical input constant while changing partition boundaries. Add controls with no empty partitions and without unmatched rows.

**Resources and public result:** CPU Python with real pandas, PyArrow and Dask dependencies; freeze versions and run relevant upstream merge tests. A useful demonstration lets a reader move partition boundaries and see whether the answer changes. Report a numerical/table diff, not just an attractive animation. The initial contribution is a reproduction and compatibility diagnosis; maintainer confirmation and the actual fix remain open.

## 3. NASA/JPL F Prime: reconstruct the recorded evidence

The collaborator-authored request asks for ground decoding of ComLoggerDp data products, whose variable-length raw buffers are not covered by ordinary dictionary decoding. The companion [writer PR #5844](https://github.com/nasa/fprime/pull/5844) is still a draft. Its discussion questions adding a parallel component rather than extending the existing logger. This is an active design dependency. [Decoder request](https://github.com/nasa/fprime/issues/5845).

**Our proposed contribution:** after upstream agreement, implement an offline streaming decoder using the approved format and existing ground-system tools. Reference-generated fixtures should round-trip to the original buffer sequence, retaining record identity, typed values and source timestamps. Corrupt lengths, truncation and unsupported versions must produce deterministic errors. Verify bounded memory on a declared large fixture.

**Required first step:** prepare a brief format/ownership proposal and obtain the project's required review before significant implementation. The [contribution guide](https://raw.githubusercontent.com/nasa/fprime/devel/CONTRIBUTING.md) requires CCB approval, and the [AI policy](https://raw.githubusercontent.com/nasa/fprime/devel/AI_POLICY.md) requires transparent disclosure and contributor responsibility. No approval was established in this scan.

**Resources and public result:** offline fixtures, Python ground tools and the approved C++/CMake/FPP reference build. A replay can show records captured earlier, delivered later, and reconstructed in their original order and measurement time. No mission telemetry or flight hardware is needed. This is a potentially substantial aerospace contribution, conditional on interface agreement; software tests would not establish flight readiness.

## What happened to Tesla, SpaceX, DeepMind and NVIDIA?

- **Tesla:** the official vehicle-command project has a plausible subsystem-handshake problem in [#468](https://github.com/teslamotors/vehicle-command/issues/468), but the exact implementation [#470](https://github.com/teslamotors/vehicle-command/pull/470) is already closed and unmerged. Retrieved comments do not explain the closure. We screened all 67 open issue titles and 23 open PRs at the snapshot. The right next step is to understand that prior attempt, not duplicate it. Fleet-telemetry [#545](https://github.com/teslamotors/fleet-telemetry/issues/545) also overlaps existing [#529](https://github.com/teslamotors/fleet-telemetry/pull/529).
- **SpaceX:** the popular [SpaceX-API](https://github.com/r-spacex/SpaceX-API) explicitly disclaims affiliation and is archived. No official active SpaceX flight-software contribution queue was verified. Public brand association is not access to proprietary rocket problems.
- **DeepMind MuJoCo:** [#3559](https://github.com/google-deepmind/mujoco/issues/3559) already has [fix #3560](https://github.com/google-deepmind/mujoco/pull/3560), authored by devansh0703. Miko997's oblique-inertia, repeated-compilation and round-trip audit is already incorporated at the checked head. A separate offset-centre-of-mass hinge/torque check may still help, but that is incremental validation, not our discovery or a new flagship repair.
- **NVIDIA Isaac Lab:** camera problem [#7676](https://github.com/isaac-sim/IsaacLab/issues/7676) already has [#7691](https://github.com/isaac-sim/IsaacLab/pull/7691). Extra validation would require a real supported GPU renderer. A metadata-only mock would not establish that the image moved.
- **DuckDB:** [Python #70](https://github.com/duckdb/duckdb-python/issues/70) overlaps merged [#307](https://github.com/duckdb/duckdb-python/pull/307). Current source includes stream-consumption guards. A remaining single-use reader gap has not been reproduced, so this is a reserve rather than an advertised missing fix.

Other screened projects included vLLM, SGLang, PyTorch, TensorRT-LLM, Triton Inference Server, Accelerate, lm-evaluation-harness, Megatron-LM, Dynamo, ROS 2 rclpy, robot_localization, python-control, CARLA, mujoco_warp, Tesla fixed-containers, NASA cFS/cFE/Open MCT/Astrobee and ESA NMF. IsaacLab-Arena and dkpy were dependency/context checks. Several attractive reports had active fixes or hardware requirements we could not validate. This list describes screening scope, not findings in every repository.

## What our earlier contributions taught us

**Graphiti:** follow a claim through the actual persistence path. The persuasive result is a before/after answer against a real database, with exact boundary conditions. A large parametrized test count is not a large number of discoveries. [Evidence](Graphiti.md).

**Pertpy:** use simple baselines and held-out data, and preserve failures. A high correlation can conceal poor error; a conventional baseline's success is not an IDA success. [Evidence](Pertpy_Evaluation_Report.md).

**NeuroGym:** check what information the learner really receives. Making the wait/go event observable does not prove better trained performance, and the preserved reward rules still permit premature responses. [Evidence](NeuroGym_Contribution_Report.md).

All four submitted PRs remain open and unmerged at this snapshot: two Graphiti repairs, one Pertpy evaluator and one NeuroGym correction. We have evidence of submitted work and executed tests; community adoption and broader impact are still outcomes to earn.

## Make the work easy to verify and share

For each completed investigation, publish one compact evidence page: the recognizable failure, a 30–60 second before/after demonstration, one reproducible command, a machine-readable result, the independent oracle, upstream review and explicit limits. Keep credit attached to existing authors. A useful review or regression can contribute more than another overlapping PR.

An outside-the-box extension is a **fault-injection gallery**: restart a service, change partition boundaries, or delay telemetry delivery, then watch a stated invariant pass or fail. The same viewer could compare evidence across domains while each adapter runs the real project. This is a proposed presentation tool, not a common replacement engine or an experiment already built.

Choose work by affected behavior, reproducibility, upstream demand, ownership, available resources and a clear independent check. Share results in the affected project's appropriate channel after review, with a concise demonstration and credit. No posts to these candidate projects were made during this scan. Stars and trending placement cannot be guaranteed; useful, reproducible work gives people a reason to share it.
