"""Independent synthetic public-API checks; no source edits or real data."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

EVIDENCE_ROOT = Path(__file__).resolve().parents[3]
SOURCE = EVIDENCE_ROOT / "observatory-automation"
if not (SOURCE / "observatory_ledger" / "ledger.py").is_file():
    SOURCE = EVIDENCE_ROOT.parent / "automation" / "ledger"
if not (SOURCE / "observatory_ledger" / "ledger.py").is_file():
    raise FileNotFoundError("Ledger source not found in either supported repository layout")
sys.path.insert(0, str(SOURCE))
from observatory_ledger import Ledger, LedgerError

HASH = hashlib.sha256(b"independent synthetic fixed configuration").hexdigest()


class Clock:
    value = "2030-01-01T09:59:00Z"
    def __call__(self): return self.value


class IndependentLedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.addCleanup(self.temp.cleanup)
        self.clock = Clock()
        self.ledger = Ledger(Path(self.temp.name) / "audit.sqlite", self.clock)
        self.addCleanup(self.ledger.close)
        self.contract = {
            "experiment_id": "independent-fixture", "domain": "synthetic", "mode": "synthetic",
            "target": "invented scalar", "units": "synthetic", "horizon_seconds": 60,
            "outcome_delay_seconds": 30, "metric": "mse",
            "models": [{"id": name, "version": "1", "code_sha256": HASH, "artifact_sha256": HASH, "role": role}
                       for name, role in (("b", "baseline"), ("c", "candidate"))],
            "allowed_source_ids": ["inputs"], "outcome_source_id": "truth",
            "schedule": {"start_at": "2030-01-01T10:00:00Z", "end_at": "2030-01-01T10:01:00Z",
                         "cadence_seconds": 60, "issue_grace_seconds": 5, "entities": ["synthetic-entity"]},
            "eligibility_rule": "Synthetic eligible rows only", "revision_rule": "first_eligible_observation",
            "gate_rule": "Synthetic mechanism, no scientific result",
            "required_checks": [{"id": "coverage", "metric": "fraction", "comparison": "ge",
                                 "threshold": 0.90, "evidence_source_id": "audit"}],
        }
        self.ledger.freeze_contract(self.contract)
        self.slot = self.ledger.expected_slots("independent-fixture")[0]

    def snapshot(self, identity, source, kind="observation", event=None, receipt=None, raw=b"{}"):
        return self.ledger.capture_snapshot(identity, raw, source_id=source, entity="synthetic-entity",
            event_at=event or self.clock.value, received_at=receipt or self.clock.value,
            published_at=None, source_version="independent-test", license="CC0 synthetic",
            quality=[], content_type="application/json", kind=kind)

    def favorable_test(self):
        self.ledger.propose_candidate({"candidate_id": "c1", "experiment_id": "independent-fixture",
            "candidate_model_id": "c", "baseline_model_id": "b", "description": "Synthetic perfect candidate",
            "test_plan": {"start_at": "2030-01-01T10:00:00Z", "end_at": "2030-01-01T10:01:00Z",
                          "minimum_pairs": 1, "minimum_relative_improvement": 0.05, "maximum_unpaired_fraction": 0}})
        self.snapshot("input", "inputs")
        self.clock.value = "2030-01-01T10:00:00Z"
        self.ledger.issue_prediction(self.slot["slot_id"], "b", 1, ["input"], HASH)
        self.ledger.issue_prediction(self.slot["slot_id"], "c", 0, ["input"], HASH)
        self.clock.value = "2030-01-01T10:02:00Z"
        self.snapshot("outcome", "truth", "outcome", self.slot["target_at"], raw=b'{"value":0}')
        self.ledger.resolve_outcome(self.slot["slot_id"], "outcome", 0)
        self.ledger.score(self.slot["slot_id"], "b")
        self.ledger.score(self.slot["slot_id"], "c")
        self.clock.value = "2030-01-01T10:03:00Z"
        return self.ledger.test_candidate("c1")["payload"]["summary"]

    def test_failed_admission_blocks_even_perfect_candidate_and_cannot_be_revised(self):
        self.snapshot("audit", "audit", raw=b'{"fraction":0.8409}')
        self.ledger.record_check("independent-fixture", "coverage", 0.8409, ["audit"])
        summary = self.favorable_test()
        self.assertEqual(summary["relative_improvement"], 1.0)
        self.assertEqual(summary["expected_pairs"], 1)
        self.assertFalse(summary["passed"])
        with self.assertRaises(LedgerError):
            self.ledger.review_candidate("c1", "approve", "other reviewer", "Unrelated engineering passed")
        with self.assertRaises(LedgerError):
            self.ledger.record_check("independent-fixture", "coverage", 1.0, ["audit"])
        with self.assertRaises(LedgerError):
            self.ledger.promote_candidate("c1", "operator", "PROMOTE c1")

    def test_missing_admission_does_not_default_to_pass(self):
        summary = self.favorable_test()
        self.assertFalse(summary["passed"])
        self.assertEqual(summary["admission_checks"], [{"check_id": "coverage", "status": "missing"}])

    def test_backdated_receipt_cannot_hide_late_ingestion(self):
        self.clock.value = "2030-01-01T10:00:01Z"
        self.snapshot("late", "inputs", event="2030-01-01T09:59:00Z", receipt="2030-01-01T09:59:00Z")
        with self.assertRaisesRegex(LedgerError, "ingestion"):
            self.ledger.issue_prediction(self.slot["slot_id"], "b", 1, ["late"], HASH)

    def test_waiting_does_not_mature_an_early_snapshot(self):
        self.clock.value = "2030-01-01T10:01:00Z"
        self.snapshot("early", "truth", "outcome", self.slot["target_at"], raw=b'{"value":0}')
        self.clock.value = "2030-01-01T10:04:00Z"
        with self.assertRaisesRegex(LedgerError, "Delayed truth"):
            self.ledger.resolve_outcome(self.slot["slot_id"], "early", 0)

    def test_documented_boundary_audit_extraction_is_supplied_not_recomputed(self):
        # This PASS records a deliberate limitation, not desirable adapter behavior.
        self.snapshot("audit", "audit", raw=b'{"fraction":0.8409}')
        event = self.ledger.record_check("independent-fixture", "coverage", 1.0, ["audit"])
        self.assertTrue(event["payload"]["passed"])
        self.assertFalse(self.ledger.verify()["public_time_attestation"])

    def test_documented_boundary_outcome_extraction_is_supplied_not_recomputed(self):
        # A domain adapter needs its own raw-to-value oracle; the ledger links bytes.
        self.clock.value = "2030-01-01T10:02:00Z"
        self.snapshot("truth", "truth", "outcome", self.slot["target_at"], raw=b'{"value":0}')
        event = self.ledger.resolve_outcome(self.slot["slot_id"], "truth", 999)
        self.assertEqual(event["payload"]["value"], 999)
        self.ledger.verify()


if __name__ == "__main__":
    unittest.main(verbosity=2)
