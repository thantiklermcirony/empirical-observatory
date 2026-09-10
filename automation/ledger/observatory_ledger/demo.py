"""A deterministic synthetic bookkeeping example, not a fitted predictor."""

from datetime import timedelta
from pathlib import Path

from .adapters import SnapshotInput
from .ledger import Ledger, LedgerError, digest, instant, stamp


class DemoClock:
    def __init__(self, value="2030-01-01T09:59:00Z"):
        self.value = value

    def __call__(self):
        return self.value


def demo_contract():
    return {
        "experiment_id": "synthetic-bookkeeping-v1", "domain": "synthetic",
        "mode": "synthetic", "target": "invented value one minute later", "units": "synthetic units",
        "horizon_seconds": 60, "outcome_delay_seconds": 30, "metric": "mse",
        "models": [{"id": label, "version": "1", "code_sha256": digest(["demo", label]),
                    "artifact_sha256": digest(["invented constants", label]), "role": role}
                   for label, role in (("persistence", "baseline"), ("illustration", "candidate"))],
        "allowed_source_ids": ["synthetic-input"], "outcome_source_id": "synthetic-truth",
        "schedule": {"start_at": "2030-01-01T10:00:00Z", "end_at": "2030-01-01T10:04:00Z",
                     "cadence_seconds": 60, "issue_grace_seconds": 5, "entities": ["invented-system"]},
        "eligibility_rule": "Invented scalar observations only; no real system is represented.",
        "revision_rule": "first_eligible_observation",
        "gate_rule": "Demonstrate numeric gate bookkeeping only; no scientific benefit claim.",
    }


def run_demo(path: str | Path) -> dict:
    if Path(path).exists():
        raise LedgerError("Demo needs a new database path; existing evidence is not overwritten.")
    clock = DemoClock()
    with Ledger(path, clock=clock) as ledger:
        contract = demo_contract()
        ledger.freeze_contract(contract)
        ledger.propose_candidate({"candidate_id": "illustration-v1", "experiment_id": contract["experiment_id"],
            "candidate_model_id": "illustration", "baseline_model_id": "persistence",
            "description": "Synthetic fixed values exercise the gate; this is not model learning.",
            "test_plan": {"start_at": contract["schedule"]["start_at"], "end_at": contract["schedule"]["end_at"],
                          "minimum_pairs": 3, "minimum_relative_improvement": 0.1, "maximum_unpaired_fraction": 0.25}})
        SnapshotInput("synthetic-input-1", b'{"value": 0, "synthetic": true}', "synthetic-input",
                      "invented-system", clock.value, clock.value, "1", "CC0 synthetic demo",
                      "application/json").capture(ledger)
        expected = ledger.expected_slots(contract["experiment_id"])
        # Issue all forecasts chronologically before adding any synthetic outcomes.
        for index, slot in enumerate(expected):
            clock.value = slot["cutoff_at"]
            ledger.issue_prediction(slot["slot_id"], "persistence", 0, ["synthetic-input-1"], digest("value"))
            if index < 3:
                ledger.issue_prediction(slot["slot_id"], "illustration", 0.5, ["synthetic-input-1"], digest("value"))
            else:
                ledger.record_failure(slot["slot_id"], "illustration", "synthetic worker failure")
        clock.value = "2030-01-01T10:06:00Z"
        for index, slot in enumerate(expected):
            receipt = stamp(instant(slot["target_at"]) + timedelta(seconds=30))
            SnapshotInput(f"synthetic-truth-{index}", b'{"value": 1, "synthetic": true}', "synthetic-truth",
                          "invented-system", slot["target_at"], receipt, "1", "CC0 synthetic demo",
                          "application/json", kind="outcome").capture(ledger)
            ledger.resolve_outcome(slot["slot_id"], f"synthetic-truth-{index}", 1)
            ledger.score(slot["slot_id"], "persistence")
            if index < 3:
                ledger.score(slot["slot_id"], "illustration")
        ledger.test_candidate("illustration-v1")
        # Deliberately do not review or promote even when this invented gate passes.
        return ledger.export()
