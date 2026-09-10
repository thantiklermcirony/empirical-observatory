import copy
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

from observatory_ledger import IntegrityError, Ledger, LedgerError, canonical, digest
from observatory_ledger.__main__ import main
from observatory_ledger.adapters import SnapshotInput
from observatory_ledger.demo import DemoClock, demo_contract, run_demo
from observatory_ledger.ledger import instant, stamp


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "ledger.sqlite"
        self.clock = DemoClock()
        self.ledger = Ledger(self.path, self.clock)
        self.contract = demo_contract()
        self.ledger.freeze_contract(self.contract)
        self.slot = self.ledger.expected_slots(self.contract["experiment_id"])[0]

    def tearDown(self):
        self.ledger.close()
        self.temp.cleanup()

    def capture(self, snapshot_id="source", *, kind="observation", received=None, event=None,
                entity="invented-system", source_id=None, raw=b'{"value":0}'):
        receipt = received or self.clock.value
        event_at = event or receipt
        return SnapshotInput(snapshot_id, raw, source_id or ("synthetic-truth" if kind == "outcome" else "synthetic-input"),
                             entity, event_at, receipt, "1", "CC0 synthetic", "application/json", kind=kind).capture(self.ledger)

    def issue(self, model="persistence", value=0, snapshot_id="source"):
        return self.ledger.issue_prediction(self.slot["slot_id"], model, value, [snapshot_id], digest("feature"))

    def prepare_prediction(self, model="persistence", value=0):
        self.capture()
        self.clock.value = self.slot["cutoff_at"]
        return self.issue(model, value)

    def mature(self, value=1):
        self.clock.value = stamp(instant(self.slot["target_at"]) + timedelta(seconds=30))
        self.capture("truth", kind="outcome", event=self.slot["target_at"])
        return self.ledger.resolve_outcome(self.slot["slot_id"], "truth", value)

    def proposal(self, candidate_id="candidate-1"):
        return {"candidate_id": candidate_id, "experiment_id": self.contract["experiment_id"],
                "candidate_model_id": "illustration", "baseline_model_id": "persistence", "description": "Synthetic test",
                "test_plan": {"start_at": self.contract["schedule"]["start_at"], "end_at": self.contract["schedule"]["end_at"],
                              "minimum_pairs": 1, "minimum_relative_improvement": 0.1, "maximum_unpaired_fraction": 0.75}}

    def finish_candidate_test(self, candidate_value=0.5):
        self.ledger.propose_candidate(self.proposal())
        self.prepare_prediction()
        self.issue("illustration", candidate_value)
        self.mature()
        self.ledger.score(self.slot["slot_id"], "persistence")
        self.ledger.score(self.slot["slot_id"], "illustration")
        self.clock.value = "2030-01-01T10:06:00Z"
        return self.ledger.test_candidate("candidate-1")

    def test_freeze_is_idempotent_but_not_editable(self):
        before = self.ledger.verify()
        self.clock.value = "2030-01-01T10:30:00Z"
        self.ledger.freeze_contract(copy.deepcopy(self.contract))
        self.assertEqual(before, self.ledger.verify())
        changed = copy.deepcopy(self.contract)
        changed["metric"] = "mae"
        with self.assertRaisesRegex(LedgerError, "different content"):
            self.ledger.freeze_contract(changed)

    def test_invalid_contract_rolls_back(self):
        before = self.ledger.verify()
        changed = copy.deepcopy(self.contract)
        changed["experiment_id"] = "other"
        changed["surprise"] = True
        with self.assertRaises(LedgerError):
            self.ledger.freeze_contract(changed)
        self.assertEqual(before, self.ledger.verify())

    def test_schedule_is_complete_without_worker_records(self):
        self.assertEqual(len(self.ledger.expected_slots(self.contract["experiment_id"])), 4)
        self.clock.value = "2030-01-01T10:00:06Z"
        exported = self.ledger.export()
        self.assertEqual(sum(x["status"] == "overdue" for x in exported["expected_issues"]), 2)
        self.assertEqual(len(exported["expected_issues"]), 8)
        self.assertEqual(len(self.ledger.record_overdue_failures(self.contract["experiment_id"])), 2)
        self.assertEqual(self.ledger.record_overdue_failures(self.contract["experiment_id"]), [])
        self.assertEqual(sum(x["status"] == "failed" for x in self.ledger.export()["expected_issues"]), 2)

    def test_issue_before_cutoff_and_after_deadline_rejected(self):
        self.capture()
        with self.assertRaisesRegex(LedgerError, "before its cutoff"):
            self.issue()
        self.clock.value = "2030-01-01T10:00:06Z"
        with self.assertRaisesRegex(LedgerError, "deadline"):
            self.issue()

    def test_receipt_later_than_cutoff_rejected(self):
        self.clock.value = "2030-01-01T10:00:01Z"
        self.capture(event="2030-01-01T09:00:00Z")
        with self.assertRaisesRegex(LedgerError, "unavailable at cutoff"):
            self.issue()

    def test_backdated_receipt_does_not_bypass_late_ingestion(self):
        self.clock.value = "2030-01-01T10:00:01Z"
        self.capture(received="2030-01-01T09:00:00Z")
        with self.assertRaisesRegex(LedgerError, "ingestion"):
            self.issue()

    def test_future_observation_rejected_but_forecast_vintage_allowed(self):
        self.capture("future-observation", event="2030-01-01T10:01:00Z")
        self.capture("future-forecast", kind="forecast", event="2030-01-01T10:01:00Z")
        self.clock.value = self.slot["cutoff_at"]
        with self.assertRaisesRegex(LedgerError, "future observation"):
            self.issue(snapshot_id="future-observation")
        self.issue(snapshot_id="future-forecast")

    def test_naive_receipt_and_future_publication_rejected(self):
        with self.assertRaisesRegex(LedgerError, "Naive"):
            self.capture(received="2030-01-01T09:00:00")
        with self.assertRaisesRegex(LedgerError, "Publication"):
            SnapshotInput("bad", b"bad", "synthetic-input", "invented-system", self.clock.value,
                          self.clock.value, "1", "CC0", "text/plain", published_at="2030-01-01T10:00:00Z").capture(self.ledger)

    def test_delayed_truth_rejected_even_if_resolver_waits_later(self):
        self.prepare_prediction()
        self.clock.value = self.slot["target_at"]
        self.capture("premature", kind="outcome", event=self.slot["target_at"])
        with self.assertRaisesRegex(LedgerError, "Delayed truth"):
            self.ledger.resolve_outcome(self.slot["slot_id"], "premature", 1)
        self.clock.value = "2030-01-01T10:02:00Z"
        with self.assertRaisesRegex(LedgerError, "Delayed truth"):
            self.ledger.resolve_outcome(self.slot["slot_id"], "premature", 1)
        self.capture("eligible", kind="outcome", event=self.slot["target_at"])
        self.ledger.resolve_outcome(self.slot["slot_id"], "eligible", 1)

    def test_wrong_outcome_entity_time_or_source_rejected(self):
        self.prepare_prediction()
        self.clock.value = "2030-01-01T10:02:00Z"
        variants = [{"entity": "other"}, {"event": "2030-01-01T10:00:00Z"}, {"source_id": "not-truth"}]
        for i, variant in enumerate(variants):
            meta = {"event": self.slot["target_at"], **variant}
            self.capture(f"bad-{i}", kind="outcome", **meta)
            with self.assertRaises(LedgerError):
                self.ledger.resolve_outcome(self.slot["slot_id"], f"bad-{i}", 1)

    def test_first_eligible_vintage_is_used_and_revisions_preserved(self):
        self.prepare_prediction()
        self.clock.value = "2030-01-01T10:02:00Z"
        self.capture("first", kind="outcome", event=self.slot["target_at"])
        self.clock.value = "2030-01-01T10:03:00Z"
        self.capture("revision", kind="outcome", event=self.slot["target_at"], raw=b'{"value":5}')
        with self.assertRaisesRegex(LedgerError, "first eligible"):
            self.ledger.resolve_outcome(self.slot["slot_id"], "revision", 5)
        self.ledger.resolve_outcome(self.slot["slot_id"], "first", 1)
        with self.assertRaises(LedgerError):
            self.ledger.resolve_outcome(self.slot["slot_id"], "revision", 5)
        self.assertEqual(len(self.ledger.export()["snapshots"]), 3)

    def test_score_requires_truth_and_recomputes_mse(self):
        self.prepare_prediction(value=0.5)
        with self.assertRaisesRegex(LedgerError, "delayed truth"):
            self.ledger.score(self.slot["slot_id"], "persistence")
        self.mature(value=2)
        result = self.ledger.score(self.slot["slot_id"], "persistence")
        self.assertEqual(result["payload"]["loss"], 2.25)
        self.assertEqual(result, self.ledger.score(self.slot["slot_id"], "persistence"))

    def test_prediction_idempotency_survives_deadline_and_rejects_conflict(self):
        original = self.prepare_prediction()
        self.clock.value = "2030-01-01T11:00:00Z"
        self.assertEqual(original, self.issue())
        with self.assertRaisesRegex(LedgerError, "different content"):
            self.issue(value=3)
        with self.assertRaisesRegex(LedgerError, "already has a result"):
            self.ledger.record_failure(self.slot["slot_id"], "persistence", "cannot replace a prediction")

    def test_failed_issue_cannot_be_later_filled(self):
        self.capture()
        self.clock.value = self.slot["cutoff_at"]
        self.ledger.record_failure(self.slot["slot_id"], "persistence", "failed")
        with self.assertRaisesRegex(LedgerError, "already has a result"):
            self.issue()

    def test_hash_corruption_detected(self):
        self.ledger.db.execute("UPDATE events SET payload_json=? WHERE seq=1", ('{"changed":true}',))
        with self.assertRaises(IntegrityError):
            self.ledger.verify()

    def test_raw_payload_corruption_detected(self):
        self.capture()
        self.ledger.db.execute("UPDATE blobs SET body=?", (b"tampered",))
        with self.assertRaisesRegex(IntegrityError, "raw payload"):
            self.ledger.verify()

    def test_semantic_replay_catches_wrong_score_even_if_rehashed(self):
        self.prepare_prediction()
        self.mature()
        event = self.ledger.score(self.slot["slot_id"], "persistence")
        event["payload"]["loss"] = 0
        supplied = {k: v for k, v in event.items() if k != "event_hash"}
        self.ledger.db.execute("UPDATE events SET payload_json=?,event_hash=? WHERE seq=?",
                               (canonical(event["payload"]), digest(supplied), event["seq"]))
        with self.assertRaisesRegex(IntegrityError, "Score disagrees"):
            self.ledger.verify()

    def test_truncation_requires_trusted_checkpoint(self):
        self.capture()
        head = self.ledger.verify()["head_sha256"]
        self.ledger.db.execute("DELETE FROM events WHERE seq=2")
        # A valid prefix is still internally consistent; do not claim otherwise.
        self.ledger.verify()
        with self.assertRaisesRegex(IntegrityError, "trusted checkpoint"):
            self.ledger.verify(head)

    def test_clock_rollback_and_invalid_write_are_atomic(self):
        self.capture()
        before = self.ledger.verify()
        self.clock.value = "2030-01-01T09:58:00Z"
        with self.assertRaisesRegex(LedgerError, "clock moved backwards"):
            self.capture("another")
        self.assertEqual(before, self.ledger.verify())
        self.assertEqual(self.ledger.db.execute("SELECT COUNT(*) FROM blobs").fetchone()[0], 1)

    def test_candidate_cannot_skip_test_or_review_or_operator_approval(self):
        self.ledger.propose_candidate(self.proposal())
        with self.assertRaises(LedgerError):
            self.ledger.review_candidate("candidate-1", "approve", "operator", "reviewed")
        with self.assertRaises(LedgerError):
            self.ledger.promote_candidate("candidate-1", "operator", "PROMOTE candidate-1")
        with self.assertRaisesRegex(LedgerError, "have not elapsed"):
            self.ledger.test_candidate("candidate-1")

    def test_promotion_requires_three_explicit_transitions(self):
        result = self.finish_candidate_test()
        self.assertTrue(result["payload"]["summary"]["passed"])
        self.assertEqual(self.ledger.export()["candidates"][0]["state"], "tested")
        self.ledger.review_candidate("candidate-1", "approve", "test operator", "Synthetic mechanics checked")
        self.assertEqual(self.ledger.export()["candidates"][0]["state"], "reviewed")
        with self.assertRaises(LedgerError):
            self.ledger.promote_candidate("candidate-1", "test operator", "yes")
        self.ledger.promote_candidate("candidate-1", "test operator", "PROMOTE candidate-1")
        exported = self.ledger.export()
        self.assertEqual(exported["candidates"][0]["state"], "promoted")
        self.assertEqual(exported["contracts"][0], self.contract)
        self.assertFalse(exported["public_time_attestation"])

    def test_failed_gate_cannot_be_approved(self):
        result = self.finish_candidate_test(candidate_value=3)
        self.assertFalse(result["payload"]["summary"]["passed"])
        with self.assertRaisesRegex(LedgerError, "failed frozen gate"):
            self.ledger.review_candidate("candidate-1", "approve", "operator", "Want to override")
        self.ledger.review_candidate("candidate-1", "reject", "operator", "Did not improve")
        with self.assertRaises(LedgerError):
            self.ledger.promote_candidate("candidate-1", "operator", "PROMOTE candidate-1")

    def test_gate_uses_matched_pairs_and_all_expected_slots(self):
        result = self.finish_candidate_test()
        summary = result["payload"]["summary"]
        self.assertEqual(summary["expected_pairs"], 4)
        self.assertEqual(summary["resolved_pairs"], 1)
        self.assertEqual(summary["unpaired_fraction"], 0.75)
        self.assertEqual(summary["relative_improvement"], 0.75)

    def test_candidate_plan_cannot_be_selected_after_evaluation_starts(self):
        self.clock.value = "2030-01-01T10:00:01Z"
        with self.assertRaisesRegex(LedgerError, "before an eligible future"):
            self.ledger.propose_candidate(self.proposal())

    def add_prerequisite_contract(self):
        self.ledger.close()
        self.ledger = Ledger(Path(self.temp.name) / "prerequisites.sqlite", self.clock)
        self.contract["required_checks"] = [{"id": "coverage", "metric": "resolved_label_fraction",
            "comparison": "ge", "threshold": 0.90, "evidence_source_id": "feasibility-audit"}]
        self.ledger.freeze_contract(self.contract)
        self.slot = self.ledger.expected_slots(self.contract["experiment_id"])[0]

    def test_failed_feasibility_blocks_descriptive_gain_and_unrelated_review(self):
        self.add_prerequisite_contract()
        self.capture("audit", source_id="feasibility-audit", raw=b'{"synthetic_fixture_fraction":0.8409}')
        check = self.ledger.record_check(self.contract["experiment_id"], "coverage", 0.8409, ["audit"])
        self.assertFalse(check["payload"]["passed"])
        result = self.finish_candidate_test()
        summary = result["payload"]["summary"]
        self.assertEqual(summary["relative_improvement"], 0.75)
        self.assertFalse(summary["passed"])
        self.assertEqual(summary["admission_checks"], [{"check_id": "coverage", "status": "failed"}])
        with self.assertRaisesRegex(LedgerError, "failed frozen gate"):
            self.ledger.review_candidate("candidate-1", "approve", "unrelated reviewer", "The code passed unit tests")
        with self.assertRaisesRegex(LedgerError, "different content"):
            self.ledger.record_check(self.contract["experiment_id"], "coverage", 1.0, ["audit"])

    def test_missing_prerequisite_is_not_silently_passed(self):
        self.add_prerequisite_contract()
        summary = self.finish_candidate_test()["payload"]["summary"]
        self.assertFalse(summary["passed"])
        self.assertEqual(summary["admission_checks"], [{"check_id": "coverage", "status": "missing"}])

    def test_passed_prerequisite_still_does_not_automatically_promote(self):
        self.add_prerequisite_contract()
        self.capture("audit", source_id="feasibility-audit", raw=b'{"synthetic_fixture_fraction":0.95}')
        self.ledger.record_check(self.contract["experiment_id"], "coverage", 0.95, ["audit"])
        self.assertTrue(self.finish_candidate_test()["payload"]["summary"]["passed"])
        self.assertEqual(self.ledger.export()["candidates"][0]["state"], "tested")

    def test_nonfinite_predictions_rejected(self):
        self.capture()
        self.clock.value = self.slot["cutoff_at"]
        for value in (float("nan"), float("inf"), True):
            with self.assertRaises(ValueError):
                self.issue(value=value)

    def test_two_writers_retry_same_snapshot_atomically(self):
        def write(_):
            with Ledger(self.path, DemoClock()) as writer:
                return SnapshotInput("duplicate", b"same", "synthetic-input", "invented-system", self.clock.value,
                                     self.clock.value, "1", "CC0", "text/plain").capture(writer)["event_hash"]
        with ThreadPoolExecutor(max_workers=2) as pool:
            hashes = list(pool.map(write, range(2)))
        self.assertEqual(hashes[0], hashes[1])
        self.assertEqual(self.ledger.verify()["event_count"], 2)

    def test_read_snapshot_returns_verified_raw_bytes(self):
        self.capture(raw=b"exact bytes")
        meta, raw = self.ledger.read_snapshot("source")
        self.assertEqual(raw, b"exact bytes")
        self.assertEqual(meta["raw_sha256"], hashlib.sha256(raw).hexdigest())


class MetricAndDemoTests(unittest.TestCase):
    def test_categorical_score_preserves_labels(self):
        with tempfile.TemporaryDirectory() as temp:
            clock = DemoClock()
            with Ledger(Path(temp) / "categorical.sqlite", clock) as ledger:
                contract = demo_contract()
                contract.update(metric="multiclass_brier", labels=["recovered", "impaired", "dead"])
                ledger.freeze_contract(contract)
                SnapshotInput("x", b"{}", "synthetic-input", "invented-system", clock.value,
                              clock.value, "1", "CC0", "application/json").capture(ledger)
                slot = ledger.expected_slots(contract["experiment_id"])[0]
                clock.value = slot["cutoff_at"]
                with self.assertRaisesRegex(LedgerError, "exactly"):
                    ledger.issue_prediction(slot["slot_id"], "persistence", {"recovered": 1}, ["x"], digest("x"))
                ledger.issue_prediction(slot["slot_id"], "persistence", {"recovered": 0.5, "impaired": 0.25, "dead": 0.25}, ["x"], digest("x"))
                clock.value = "2030-01-01T10:02:00Z"
                SnapshotInput("y", b'{"label":"recovered"}', "synthetic-truth", "invented-system", slot["target_at"],
                              clock.value, "1", "CC0", "application/json", kind="outcome").capture(ledger)
                ledger.resolve_outcome(slot["slot_id"], "y", "recovered")
                self.assertEqual(ledger.score(slot["slot_id"], "persistence")["payload"]["loss"], 0.375)

    def test_all_scalar_and_categorical_losses(self):
        from observatory_ledger.ledger import loss, outcome_value, prediction_value
        import math
        self.assertEqual(loss({"metric": "mae"}, 2, -1), 3)
        self.assertEqual(loss({"metric": "brier"}, 0.25, 1), 0.5625)
        self.assertEqual(loss({"metric": "log_loss"}, {"yes": 0.25, "no": 0.75}, "yes"), -math.log(0.25))
        with self.assertRaises(LedgerError):
            prediction_value({"metric": "log_loss", "labels": ["yes", "no"]}, {"yes": 0, "no": 1})
        with self.assertRaises(LedgerError):
            outcome_value({"metric": "brier"}, 0.5)

    def test_demo_is_labeled_synthetic_and_stops_before_review(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "demo.sqlite"
            result = run_demo(path)
            self.assertEqual(result["contracts"][0]["mode"], "synthetic")
            self.assertFalse(result["public_time_attestation"])
            self.assertEqual(result["candidates"][0]["state"], "tested")
            self.assertEqual(len(result["scores"]), 7)
            self.assertEqual(len(result["failures"]), 1)
            json.dumps(result, allow_nan=False)
            with self.assertRaisesRegex(LedgerError, "not overwritten"):
                run_demo(path)

    def test_cli_verification_does_not_create_missing_evidence(self):
        import contextlib
        import io
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "absent.sqlite"
            with contextlib.redirect_stderr(io.StringIO()):
                code = main(["--db", str(path), "verify"])
            self.assertEqual(code, 2)
            self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
