import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from observatory_ledger import Ledger, LedgerError, digest
from observatory_ledger.recovery import admission_contract, extract_preflight, record_preflight


def audit_fixture():
    """Invented partition records with final-count-shaped arithmetic, not mouse data."""
    def row(total, resolved, animals=1):
        return {"landmarks": total, "resolved": resolved, "animals": animals,
                "fraction": resolved / total, "label_counts": {"-1": total - resolved, "0": resolved},
                "reasons": {"synthetic_observed": resolved, "synthetic_unresolved": total - resolved}}
    folds = {str(i): row(821 if i < 4 else 820, 689) for i in range(5)}
    overall = row(4104, 3445, 5)
    return {"disclosure": "SYNTHETIC arithmetic fixture; no real animals.", "modes": {"primary": {
        "overall": overall, "by_fold": folds, "by_animal": {"synthetic-" + k: v for k, v in folds.items()},
        "by_diet": {"synthetic-diet": overall}}}}


class AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.ledger = Ledger(Path(self.temp.name) / "audit.sqlite")
        self.contract = admission_contract("synthetic-admission", digest("synthetic protocol"), mode="synthetic")
        self.ledger.freeze_contract(self.contract)
        self.raw_path = Path(self.temp.name) / "PREFLIGHT.json"
        self.raw = json.dumps(audit_fixture()).encode()
        self.raw_path.write_bytes(self.raw)
        self.raw_sha = hashlib.sha256(self.raw).hexdigest()

    def tearDown(self):
        self.ledger.close()
        self.temp.cleanup()

    def propose(self, snapshot_id):
        return self.ledger.propose_admission({"candidate_id": "synthetic-proposal", "experiment_id": self.contract["experiment_id"],
            "description": "An evidence admission recorded after the synthetic audit; no predictive experiment.",
            "proposal_sha256": self.contract["protocol_sha256"], "evidence_snapshot_ids": [snapshot_id],
            "evidence_timing": "already_observed"})

    def test_actual_raw_fraction_is_extracted_and_blocks_admission(self):
        result = record_preflight(self.ledger, self.contract["experiment_id"], self.raw_path, self.raw_sha)
        self.assertEqual(result["overall"]["fraction"], 3445 / 4104)
        self.assertNotEqual(result["overall"]["fraction"], 3451 / 4104)
        metadata, stored = self.ledger.read_snapshot(result["snapshot_id"])
        self.assertEqual(stored, self.raw)
        self.assertEqual(metadata["raw_sha256"], self.raw_sha)
        self.propose(result["snapshot_id"])
        verdict = self.ledger.assess_admission("synthetic-proposal")
        self.assertEqual(verdict["payload"]["status"], "blocked")
        exported = self.ledger.export()
        for field in ("expected_issues", "predictions", "outcomes", "scores"):
            self.assertEqual(exported[field], [])
        self.assertEqual(len(exported["checks"]), 6)
        self.assertFalse(exported["public_time_attestation"])
        with self.assertRaises(LedgerError):
            self.ledger.test_candidate("synthetic-proposal")
        with self.assertRaises(LedgerError):
            self.ledger.review_candidate("synthetic-proposal", "approve", "reviewer", "Unrelated good score")
        with self.assertRaises(LedgerError):
            self.ledger.promote_candidate("synthetic-proposal", "reviewer", "PROMOTE synthetic-proposal")

    def test_no_caller_supplied_fraction_argument_exists(self):
        with self.assertRaises(TypeError):
            record_preflight(self.ledger, self.contract["experiment_id"], self.raw_path, self.raw_sha, observed_value=1.0)
        self.assertEqual(len(self.ledger.export()["checks"]), 0)

    def test_mismatched_fraction_or_partition_rejected_before_write(self):
        for alteration in ("fraction", "fold_count", "fold_missing", "duplicate_animal_count"):
            fixture = audit_fixture()
            primary = fixture["modes"]["primary"]
            if alteration == "fraction":
                primary["overall"]["fraction"] = 1.0
            elif alteration == "fold_count":
                primary["by_fold"]["0"]["resolved"] += 1
            elif alteration == "fold_missing":
                del primary["by_fold"]["4"]
            else:
                primary["by_animal"]["synthetic-0"]["animals"] = 2
            raw = json.dumps(fixture).encode()
            self.raw_path.write_bytes(raw)
            with self.assertRaises(LedgerError):
                record_preflight(self.ledger, self.contract["experiment_id"], self.raw_path, hashlib.sha256(raw).hexdigest())
            self.assertEqual(self.ledger.verify()["event_count"], 1)

    def test_wrong_reviewed_hash_rejected(self):
        with self.assertRaisesRegex(LedgerError, "reviewed artifact"):
            record_preflight(self.ledger, self.contract["experiment_id"], self.raw_path, "0" * 64)
        self.assertEqual(self.ledger.verify()["event_count"], 1)

    def test_raw_nonfinite_and_duplicate_keys_rejected(self):
        for raw in (b'{"modes":NaN}', b'{"modes":{},"modes":{}}'):
            with self.assertRaises(LedgerError):
                extract_preflight(raw)

    def test_retries_preserve_first_receipt_and_checks(self):
        one = record_preflight(self.ledger, self.contract["experiment_id"], self.raw_path, self.raw_sha)
        before = self.ledger.verify()
        two = record_preflight(self.ledger, self.contract["experiment_id"], self.raw_path, self.raw_sha)
        self.assertEqual(one, two)
        self.assertEqual(before, self.ledger.verify())

    def test_missing_checks_produce_pending_not_passed(self):
        self.ledger.capture_snapshot("explanation", b"synthetic proposed protocol", source_id="proposal", entity="*",
            event_at="2020-01-01T00:00:00Z", received_at="2020-01-01T00:00:00Z", published_at=None,
            source_version="1", license="Synthetic test", quality=[], content_type="text/plain", kind="observation")
        self.propose("explanation")
        result = self.ledger.assess_admission("synthetic-proposal")
        self.assertEqual(result["payload"]["status"], "pending")

    def test_unlisted_check_evidence_cannot_be_inherited(self):
        record_preflight(self.ledger, self.contract["experiment_id"], self.raw_path, self.raw_sha)
        self.ledger.capture_snapshot("unrelated", b"unrelated", source_id="proposal", entity="*",
            event_at="2020-01-01T00:00:00Z", received_at="2020-01-01T00:00:00Z", published_at=None,
            source_version="1", license="Synthetic", quality=[], content_type="text/plain", kind="observation")
        self.propose("unrelated")
        with self.assertRaisesRegex(LedgerError, "not declared"):
            self.ledger.assess_admission("synthetic-proposal")

    def test_evidence_admission_cannot_add_a_fake_schedule(self):
        changed = copy.deepcopy(self.contract)
        changed["experiment_id"] = "other"
        changed["schedule"] = {"invented": True}
        with self.assertRaises(LedgerError):
            self.ledger.freeze_contract(changed)

    def test_weakened_frozen_threshold_rejected_by_domain_adapter(self):
        changed = copy.deepcopy(self.contract)
        changed["experiment_id"] = "weakened"
        changed["required_checks"][0]["threshold"] = 0.8
        self.ledger.freeze_contract(changed)
        with self.assertRaisesRegex(LedgerError, "exact frozen"):
            record_preflight(self.ledger, changed["experiment_id"], self.raw_path, self.raw_sha)


if __name__ == "__main__":
    unittest.main()
