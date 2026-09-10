# Stable local interface, schema observatory-ledger/1

Import `Ledger` from `observatory_ledger`; use it as a context manager. Every mutation returns the original event on an identical retry. JSON must contain finite numbers. All timestamps must include an offset; generated schedule and recorder timestamps are normalized to UTC. Fixed operation identities are generated internally.

## Experiment and schedule

`freeze_contract(contract)` accepts the exact JSON shape in `examples/synthetic-contract.json`. Models require `id`, `version`, `code_sha256`, `artifact_sha256`, and `role` (`baseline` or `candidate`). An unfitted fixed rule still hashes its fixed configuration as an artifact. Required contract keys are:

```text
experiment_id, domain, mode, target, units, horizon_seconds,
outcome_delay_seconds, metric, models, allowed_source_ids,
outcome_source_id, schedule, eligibility_rule, revision_rule, gate_rule
```

Modes: `synthetic`, `replay`, `prospective`. Optional `labels` is required only for categorical metrics. The only implemented revision rule is `first_eligible_observation`. Contract freezing must precede the first cutoff, including in an explicitly simulated replay clock.

`schedule` has `start_at` (inclusive), `end_at` (exclusive), `cadence_seconds`, `issue_grace_seconds`, and `entities`. The horizon is measured from cutoff. Every target is `cutoff + horizon_seconds`; every issue deadline is `cutoff + issue_grace_seconds`. Grace must be less than horizon. Maximum 100,000 expected slots per contract. Use `expected_slots(experiment_id)` rather than recreating the SHA-based slot IDs.

Optional `required_checks` is a list of:

```json
{"id":"coverage","metric":"resolved_label_fraction","comparison":"ge","threshold":0.90,"evidence_source_id":"recovery-feasibility-audit"}
```

`comparison` supports `ge` and `le`. `record_check(experiment_id, check_id, observed_value, evidence_snapshot_ids)` binds the number to captured evidence from the declared source and computes its immutable threshold verdict. The domain adapter remains responsible for extracting that number correctly. Missing/failed checks block a candidate gate.

## Capturing, predicting, resolving

```text
capture_snapshot(snapshot_id, raw: bytes,
  source_id=..., entity=..., event_at=..., received_at=..., published_at=None,
  source_version=..., license=..., quality=[], content_type=..., kind=...)
read_snapshot(snapshot_id) -> (verified metadata, raw bytes)
issue_prediction(slot_id, model_id, value, input_snapshot_ids, feature_sha256, compute_ms=0)
record_failure(slot_id, model_id, reason)
record_overdue_failures(experiment_id)
resolve_outcome(slot_id, snapshot_id, value)
score(slot_id, model_id)
```

Snapshot kinds: `observation`, `forecast`, `outcome`. `entity="*"` is an explicitly shared input; outcome entities must match exactly. `raw_sha256` is computed by the library. Inputs must be captured before the slot cutoff. Snapshot `received_at` is a caller declaration; the independent recorder time is also enforced. Outcome snapshots received before the maturity rule cannot later be relabeled eligible merely by waiting; capture the eligible later vintage separately. A record marked `outcome` is treated as eligible when source/entity/time/delay match; domain quality screening must happen before applying that kind.

`value` is a finite scalar for MAE/MSE, a probability for binary Brier, or a mapping from every frozen label to a probability for categorical Brier/log loss. An outcome is a finite scalar, binary 0/1, or a single declared categorical label. Source identity, receipt and hash establish traceability; they do not establish faithful parsing of arbitrary raw data.

`SnapshotInput`, `ForecastContext`, `PredictionInput`, `OutcomeInput` dataclasses and `SourceAdapter`, `PredictorAdapter`, `OutcomeAdapter` Protocols provide the integration seam. The core never invokes network clients, model fitting or code generation.

## Candidate transitions

```text
propose_candidate({candidate_id, experiment_id, candidate_model_id,
  baseline_model_id, description, test_plan})
test_candidate(candidate_id)
review_candidate(candidate_id, decision, reviewer, reason)
promote_candidate(candidate_id, operator, approval)
```

`test_plan` requires `start_at`, `end_at`, `minimum_pairs`, `minimum_relative_improvement`, `maximum_unpaired_fraction`. Freeze the proposal before its evaluation start, within the contract schedule. All selected expected slots enter the denominator; score pairs use the same resolved slot outcome. A baseline mean of zero yields no relative-improvement pass. Testing waits until the period end plus horizon and outcome delay; it is deliberately conservative about the final slot. The test result is immutable; late evidence cannot silently change it. A new proposal/version is required for a new test.

Approve is allowed only after a passed test. Reject remains a recorded review. Promotion requires an approved review plus the literal token `PROMOTE <candidate_id>`. It records an admission, with no deployment side effect. No transition is automatic.

## Export and CLI

`verify(expected_head=None)` returns count, head digest and local-only integrity status. `export()` returns JSON-ready values under:

```text
schema, generated_at, public_time_attestation=false, time_claim,
integrity {event_count, head_sha256}, contracts, expected_issues,
snapshots, predictions, failures, outcomes, scores, checks, candidates, events
```

Expected issue statuses are `scheduled`, `overdue`, `failed`, `awaiting_outcome_or_score`, `scored`; each is linked to slot/model and target metadata. Prediction rows explicitly carry experiment/entity/cutoff/target/horizon/model version and hashes. `recorded_at` is the local issue time. Every event has sequence, kind, canonical payload, predecessor hash and event hash. Derived exports can always be rebuilt from the verified ledger. This version emits exact individual records, not claims of statistical significance or an unweighted cross-experiment aggregate.

CLI: `python -m observatory_ledger --db <path> <command>`. `freeze` and `propose` take a JSON file containing their object. `issue`, `fail`, `resolve`, `score`, `check`, `review`, `promote` take JSON files containing the corresponding method keyword arguments. `snapshot` takes a metadata JSON file (including `snapshot_id`, excluding raw hash) and a raw file. `expire` takes experiment ID; `test-candidate` takes candidate ID. `verify --expected-head <hash>` optionally checks an independently preserved head. `export --output <path>` writes local JSON. Errors return exit code 2.

The SQLite file is single-host storage. Use one long-lived worker or bounded cooperating local workers; transactional append handles concurrent writes. Preserve the database and a trusted checkpoint between scheduled runs. An ephemeral runner with an empty database on every run is not a persistent ledger.

## Retrospective evidence admission, with no forecast schedule

Use `kind="evidence_admission"` for a completed audit being admitted today. Its exact fields are `kind`, `experiment_id`, `domain`, `mode` (`retrospective` or `synthetic`), `target`, `scope`, `protocol_sha256`, and nonempty `required_checks`. There is no schedule, horizon, model specification, issued prediction or claimed predictive test. Do not create a fake clock to record old work as prospective evidence.

`propose_admission({candidate_id, experiment_id, description, proposal_sha256, evidence_snapshot_ids, evidence_timing:"already_observed"})` records the proposal now and binds its protocol hash. `assess_admission(candidate_id)` records an immutable prerequisite verdict: `blocked` when any check failed, `pending` when checks are missing, otherwise `eligible_for_review`. These states are distinct from a tested predictor. The check-only path cannot use `test_candidate`, `review_candidate` or `promote_candidate`; a future model experiment needs its own predictive contract. CLI equivalents are `propose-admission proposal.json` and `assess-admission candidate_id`.

Every assessed check's evidence IDs must be included in the proposal's declared evidence set; unrelated audits cannot be inherited. An assessment, including `pending`, is immutable. If missing evidence subsequently arrives, record a new proposal identity referencing the complete evidence and assess that proposal; preserve the original pending assessment.

Recovery integration, using the actual system clock and an independently reviewed final audit hash:

```python
from observatory_ledger import Ledger
from observatory_ledger.recovery import admission_contract, record_preflight

with Ledger("recovery-evidence.sqlite") as ledger:
    contract = admission_contract("recovery-admission-v1", reviewed_protocol_sha256)
    ledger.freeze_contract(contract)
    evidence = record_preflight(ledger, contract["experiment_id"], final_preflight_path,
                               expected_sha256=reviewed_preflight_sha256)
    ledger.propose_admission({
        "candidate_id": "recovery-proposal-v1",
        "experiment_id": contract["experiment_id"],
        "description": "Retrospective feasibility review; any model result remains descriptive.",
        "proposal_sha256": reviewed_protocol_sha256,
        "evidence_snapshot_ids": [evidence["snapshot_id"]],
        "evidence_timing": "already_observed",
    })
    ledger.assess_admission("recovery-proposal-v1")
    website_record = ledger.export()
```

The adapter reads raw `PREFLIGHT.json` itself, matches the reviewed SHA, checks exactly 4,104 primary landmarks and five folds, reconciles resolved counts against labels/reasons and animal/diet/fold partitions, and calculates the fractions. It records the exact raw bytes with today's receipt time and six immutable 90% checks. It accepts no supplied coverage value. Final 3,445/4,104 and historical 3,451/4,104 are different audits; this adapter reads the final file rather than substituting the earlier numerator. Invalid raw fractions, weakened gates or changed hashes fail before capture. Repeated identical ingestion preserves the first receipt and checks.

This validates extraction and arithmetic from the reviewed audit; it does not independently prove the upstream eligibility/label algorithm. Keep the original eligibility audit, final preflight and source review together. Generic `record_check` and `resolve_outcome` remain explicitly caller-parsed APIs; use a tested domain extractor when claiming that values are mechanically tied to raw source bytes.
