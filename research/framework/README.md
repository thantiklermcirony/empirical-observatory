# Living science framework

The Observatory is becoming a versioned map of systems, mechanisms, claims, observations and tests. Its public computer explains the programme. The editor workshop creates a concrete research and engineering brief for its next addition.

## Working paths

- `/question`: one-call AI visitor guide grounded in the current programme registry and instrument catalogue. It executes no scientific model.
- `/human`: preserved 2,234-structure, 15-system anatomical atlas. Selection maps to broad system-level bioelectric, mechanics, resource or quantum records. These links are not individual-organ calibrations. Empty coverage remains visible.
- `/framework`: established physics references, conditional numerical models, programme hypotheses, coverage gaps and public candidate history.
- `/framework/work`: authenticated editor workshop. One provider call seeks sources and writes a proposal. Code runs only relevant registered tests, then saves a private draft in D1. Editors may publish an explicitly unvalidated candidate or retract it; both transitions and audit events are atomic.
- `/workbenches/inquiry`: retained scientific inquiry tools. The frozen temporal and quantum engines are unchanged.
- `/api/framework`: machine-readable authored registry. `/api/framework/proposals?public=1` exposes only published/retracted candidate records.

`lib/science-registry.ts` links stable claim, source, body-system, test and device identities. A future move between rooms should change catalogue placement without changing the claim's identity. `lib/observatory-catalogue.ts` remains the room/device index. New registry revisions are reviewed source changes; candidate publication does not overwrite established records.

## Admission and execution

Evidence classes remain distinct: established within stated scope; conditional model; programme hypothesis; open question. AI is a proposal and interpretation tool, not the authority that makes a physical law true. New sources are leads until their content and applicability are reviewed. Numerical convergence checks validate a calculation under its premises, not biological transfer.

Every proposal records an observable, mechanism, competing explanation, prediction, baseline, success criterion, failure criterion, missing evidence, implementation tasks, source references and actual check receipts. A source change and deployment remain engineering operations. The workshop never executes generated code or silently promotes a candidate into an established law. Export preserves the full record and content hash; hashes detect content changes, not truth or authorship.

The current body mapping has neural, cardiac and wound-related bioelectric references; a scoped developmental patterning hypothesis; general physical accounting; a shared synthetic cellular resource ledger; and explicit tissue-level quantum gaps. It is not a complete physiological simulator. The held Biology Atlas v0.2 successor is not imported.

## Executable physics checks

1. **Bounded selector:** compare UHL with another bounded addition law obtained through `h(x)=x/(1−x²)`. At `x=u=0.5`, UHL gives `0.8`; the alternative gives approximately `0.6930004682`. Both preserve bounds. This defeats uniqueness from boundedness alone in a fixed observable coordinate; the laws are both abstractly reparameterized addition. Physical selection still needs calibration and an additional premise.
2. **Passive membrane:** compare Euler integration with `V(t)=E_L+IR(1−exp(−t/RC))`. With declared `E_L=−65 mV`, `R=20 MΩ`, `C=1 nF`, `I=0.3 nA`, the time constant is `20 ms` and asymptote `−59 mV`. Halving the step from `0.2` to `0.1 ms` reduces maximum error from approximately `0.0110826` to `0.00552972 mV`. The predeclared convergence and error criteria pass. Inputs are illustrative parameters, not measured tissue data.

## Next experiment, before substantial implementation

Build one measured passive-electrical observation adapter before adding an apparent field to the whole body. Obtain a public primary dataset with current-step protocols, calibrated voltage, sampling interval, units and cell/preparation identity. Freeze data provenance and a train/held-out split by cell before fitting. Reject data without those fields rather than synthesizing missing observations.

Baseline: analytic single-compartment passive RC, with rest level/resistance/time constant fitted only to training traces. Candidate: add one prespecified second passive time constant; use identical data and fitting budgets. Evaluate held-out voltage RMSE normalized by measured response amplitude, residual autocorrelation and physical parameter admissibility. Success: at least 15% lower median held-out normalized RMSE with a paired bootstrap 95% interval for the improvement entirely above zero, no systematic residual deterioration, and physically admissible parameters. Failure: any unmet gate, unstable parameters, or improvement confined to training data. These are proposed preregistration gates, not completed empirical results. EEG or clinical claims require a separate observation model and dataset.

## Operation and limits

All hosted provider attempts share the existing atomic 200-call UTC-day ceiling. The guide uses at most one call and the workshop at most one per new proposal. Failed provider attempts count; exact-ID retries retrieve the existing outcome. The UI retains a pending instruction through uncertain responses. A genuinely changed instruction creates a new proposal.

The production editor allowlist is the server-only `OBSERVATORY_EDITOR_IDS` value, using exact authenticated ChatGPT user IDs. Public visitors can read published candidates but cannot read drafts or mutate the ledger. Missing editor configuration fails closed. Credentials never enter client code or source.

Run `npm test` for the preserved suite plus the new framework audit. The framework audit uses actual route logic with platform I/O substituted, in-memory SQLite transactions and a mocked provider; it makes no network calls. It covers public/private boundaries, quota, idempotency and rollback on failed audit persistence. Browser and live provider checks are separate.

The anatomy source archive and build manifest alongside this document preserve the selection bridge changes. Existing geometry and license attribution are retained.
