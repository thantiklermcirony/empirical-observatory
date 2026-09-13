# Research Case Engine, revision 1

The Observatory now has a registered case adapter that searches for missing predictive information around an executable model. Its first system is the preserved Heldt–Tyson–Cross–Novak eight-state Chlamydomonas model. The existing paired-damage case remains separate and available.

## Working loop

1. A versioned case declares quantities, units, state, forcing, observation, outcome and source.
2. The worker validates a bounded configuration and checks evidence-file hashes.
3. A finite search enumerates preparation histories, then applies a common future environment.
4. An equivalence rule matches checkpoint volume, generation and integrated light before inspecting divergence.
5. Candidate predictors compete with both an observation-only baseline and a simple input-history baseline. Feature and threshold selection use only the development partition.
6. The selected witness is recomputed with finer steps, and compared with a registered independent original-ODE reference where one exists.
7. A report retains successful gates, failed claims, unresolved checks, every searched history, full run inputs, sampled trajectories, source identities and a canonical-JSON SHA-256 receipt.

The protocol is `public/research-cases/runtime/case-core.mjs`. The numerical adapter is `chlamydomonas-runner.mjs`; its worker runs locally with no AI request. Biology and the archive each link to it by stable device identity. `/api/cases`, `/api/cases/BIO-CHLAM-001`, the encyclopedia, visitor source briefs and `/api/ledger` reference the same case contract. It is a separate adapter, not a fifth operation in the central four-operation runtime.

## What actually runs

- **State recovery:** all 20 binary six-slot histories with three light slots, or the exploratory 70 eight-slot histories with four light slots. Preparation lasts 24 hours, with 12 hours lit. All are followed by 24 hours darkness. Initial volume is 0.75 AV, mu is 0.00145 per minute, other parameters retain source defaults. The search step is 0.125 min. Checkpoint equivalence requires identical generation, relative volume difference below 1e-8, and light-dose difference below 1e-6 min. The binary outcome is any subsequent division within the horizon; absent event times stay null. The first qualifying pair in ascending mask order is refined at 0.0625 and 0.03125 min, including recomputation of the preparation. The 20-history selected pair has a new independent BDF reference. The 70-history extension has no independently registered reference and stays exploratory.
- **Predictor screen:** every third ordered history is held out. Each candidate is a one-threshold stump with at least two development rows per leaf and Laplace-smoothed training prevalence. The internal variable is selected by development Brier score only. Held-out scores compare volume, elapsed darkness, and that chosen internal variable. These are small deterministic synthetic partitions, not independent biological experiments. No unique minimum state or causal intervention is identified.
- **Timing contrast:** 15 minutes light/15 minutes dark versus 12 hours light/12 hours dark at 48 or 96 hours. Both fine trajectories and a coarser comparison execute. Full-state agreement with preserved original-eight-ODE BDF requires equal event count, event-time errors below 1.5 min and componentwise scaled final-state error below 0.05.
- **Rejected hidden-state lead:** the exact recovered witness is run at three resolutions. The coarse first-event difference is about 72.680 minutes; the fine difference is about 0.000002 minutes. The source claim remains rejected for this witness.
- **Empirical score replay:** all 3,679 frozen held-out records are rescored. No new fitting occurs. Source pixel area is not silently converted to AV, and observational classifier performance is not ODE validation.

## Results and what failed

The 20-history search yields 100 qualifying pairs from the same 20 trajectories, not 100 independent replications. `111000` and `110001` are the first witness: both have checkpoint volume about 2.130417 AV and generation zero, but one divides during the shared dark future and one does not. The selected hidden predictor is IN/V. Its held-out Brier score is about 0.014220, exactly tied with elapsed darkness; volume alone scores about 0.255873. Thus this experiment demonstrates insufficiency of the chosen visible summary but does **not** establish that hidden chemistry improves on a simple timing measurement.

The 48-hour timing comparison reproduces 1 versus 8 descendants with about 6.051571 AV of total lineage volume and passes its numerical gates. At 96 hours counts still match 8 versus 64, but the fast-flash final S-state scaled disagreement is approximately 0.051572, above the fixed 0.05 admission gate. Reducing the step to 0.025 min does not remove it. The reference/implementation disagreement is unresolved; the engine correctly withholds full-trajectory numerical admission rather than changing the tolerance. Investigation of this numerical boundary is an immediate engineering follow-up.

Adding area-growth history worsens the frozen pooled Brier score from 0.1008425131 to 0.1041718228, about 3.30%. Source cohorts are not extra independent experiments merely because there are thousands of cell rows.

## Source preservation and licence

The original downloadable ZIP and all 46 manifest-listed files are preserved unchanged in `public/research-cases/chlamydomonas`. Upstream commit: `ab87e1314e27239d763e9cab188291e01b153574`. Its original equations, data and GPL licence are included. The recovered engine says GPL-3.0-only, while its README describes GPL-3.0-or-later; these original notices are retained. New numerical adapter and reproduction script use GPL-3.0-only and are delivered as unminified source in an isolated static worker capsule. The generic receipt utility uses MIT. There is no relicensing of the recovered implementation.

`STATE_RECOVERY_BDF.json` and `source-provenance.json` are new integration records, outside the preserved original manifest. `runtime/reproduce-state.py` reproduces the added independent reference using the original `reference.py`. Python bytecode is not published. The original sandbox remains independently accessible with all 27 parameter controls and timeline playback; its unrestricted explorations do not inherit this adapter’s gates.

## Reproduction and future adapters

Run `node --test tests/case-engine.test.mjs`, then the normal repository tests, typecheck and lint. The integration test verifies original hashes, input bounds, numerical outcomes, receipt tampering, negative empirical scores and the known unresolved 96-hour state discrepancy. It emits a compact verification record in `research/case-engine/verification.json`.

No live biological data, AI credential or AI quota is involved in these executions. Existing hosted AI and the 200-attempt UTC-day cap remain unchanged. Runs stay in page memory unless the visitor explicitly downloads a configuration or report. Load accepts configurations only and forces fresh calculation. Cancellation terminates the worker; changed controls invalidate prior output.

Energy, redox, radiation and quantum adapters must supply named species/state, dimensions, preparation and time mappings, a baseline, a justified transformation and falsifying checks before connection. Equal labels or bounded ranges do not grant that mapping. A full lifecycle and universal theorem format remain unfinished.

The next biological protocol compares calibrated size plus light recency with the same predictor plus a measured regulator proxy, on independent experiments. Freeze observation time, 24h horizon, censoring, formula, fitting budget and partition before new fitting. Proposed gates: at least 5% lower held-out Brier, experiment-cluster 95% improvement interval above zero, and calibration slope 0.8–1.2. These are prospective gates, not an executed or externally preregistered result.
