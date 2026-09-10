"""Independent pinned-audit admission checks; no mouse measurements or fits."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

WORK = Path(__file__).resolve().parents[3]
SOURCE = WORK / "observatory-automation"
if not (SOURCE / "observatory_ledger" / "ledger.py").is_file():
    SOURCE = WORK.parent / "automation" / "ledger"
if not (SOURCE / "observatory_ledger" / "ledger.py").is_file():
    raise FileNotFoundError("Ledger source not found in either supported repository layout")
sys.path.insert(0, str(SOURCE))
from observatory_ledger import Ledger, LedgerError
from observatory_ledger.ledger import utc_now
from observatory_ledger.recovery import admission_contract, extract_preflight, record_preflight

PREFLIGHT = WORK / "recovery-lab" / "experiment" / "preflight" / "PREFLIGHT.json"
PINNED_PREFLIGHT_SHA = "bdec6c15eb5b60152b4dc041f6937f134f4a6ef6f5a5efb3d959ec8a08574eef"
PROTOCOL_SHA = "3903f4f60182008fe15a864f3660526296d484013ecf84001cb8a5dbb7803325"


def encode(value):
    return json.dumps(value, sort_keys=True, allow_nan=False).encode()


def counts(n, r, animals):
    return {"landmarks": n, "resolved": r, "animals": animals, "fraction": r / n,
            "label_counts": {"-1": n-r, "0": r},
            "reasons": {"observed_burden": r, "no_assessment_in_window": n-r}}


def synthetic_passing_audit():
    rows = [counts(n, 800, 1) for n in [824, 820, 820, 820, 820]]
    return {"modes": {"primary": {
        "overall": counts(4104, 4000, 5),
        "by_fold": {str(i): copy.deepcopy(row) for i, row in enumerate(rows)},
        "by_diet": {"synthetic": counts(4104, 4000, 5)},
        "by_animal": {"synthetic-" + str(i): copy.deepcopy(row) for i, row in enumerate(rows)},
    }}}


class EvidenceAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.ledger = Ledger(self.folder / "audit.sqlite")
        self.addCleanup(self.ledger.close)
        self.ledger.freeze_contract(admission_contract("recovery-audit", PROTOCOL_SHA))

    def propose(self, evidence):
        return self.ledger.propose_admission({"candidate_id": "recovery-plan", "experiment_id": "recovery-audit",
            "description": "Independent admission fixture, no predictive test",
            "proposal_sha256": PROTOCOL_SHA, "evidence_snapshot_ids": evidence,
            "evidence_timing": "already_observed"})

    def record_synthetic(self):
        raw = encode(synthetic_passing_audit())
        path = self.folder / "synthetic.json"
        path.write_bytes(raw)
        return record_preflight(self.ledger, "recovery-audit", path, hashlib.sha256(raw).hexdigest())

    def test_actual_pinned_counts_and_all_five_hand_oracles(self):
        raw = PREFLIGHT.read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), PINNED_PREFLIGHT_SHA)
        result = extract_preflight(raw)
        self.assertEqual(result["overall"], {"landmarks": 4104, "resolved": 3445,
                                            "animals": 214, "fraction": 3445 / 4104})
        for i, (n, r) in enumerate([(734, 619), (943, 795), (946, 813), (737, 605), (744, 613)]):
            self.assertEqual(result["observed_checks"][f"fold_{i}_resolution"], r / n)
        self.assertTrue(all(x < .90 for x in result["observed_checks"].values()))

    def test_actual_exact_bytes_capture_blocks_without_fake_forecasts(self):
        result = record_preflight(self.ledger, "recovery-audit", PREFLIGHT, PINNED_PREFLIGHT_SHA)
        metadata, raw = self.ledger.read_snapshot(result["snapshot_id"])
        self.assertEqual(raw, PREFLIGHT.read_bytes())
        self.assertEqual(metadata["raw_sha256"], PINNED_PREFLIGHT_SHA)
        self.assertIn("retrospective-audit", metadata["quality"])
        self.propose([result["snapshot_id"]])
        assessment = self.ledger.assess_admission("recovery-plan")
        self.assertEqual(assessment["payload"]["status"], "blocked")
        self.assertEqual(len(assessment["payload"]["checks"]), 6)
        self.assertTrue(all(c["status"] == "failed" for c in assessment["payload"]["checks"]))
        exported = self.ledger.export()
        for collection in ("expected_issues", "predictions", "outcomes", "scores"):
            self.assertEqual(exported[collection], [])
        self.assertFalse(exported["public_time_attestation"])
        for action in (
            lambda: self.ledger.test_candidate("recovery-plan"),
            lambda: self.ledger.review_candidate("recovery-plan", "approve", "operator", "unit tests passed"),
            lambda: self.ledger.promote_candidate("recovery-plan", "operator", "PROMOTE recovery-plan"),
        ):
            with self.assertRaises(LedgerError):
                action()
        self.ledger.verify()

    def test_wrong_pin_fails_before_capture_or_checks(self):
        before = self.ledger.verify()
        altered = self.folder / "altered.json"
        altered.write_bytes(PREFLIGHT.read_bytes() + b"\n")
        with self.assertRaises(LedgerError):
            record_preflight(self.ledger, "recovery-audit", altered, PINNED_PREFLIGHT_SHA)
        self.assertEqual(self.ledger.verify(), before)

    def test_retry_keeps_same_raw_snapshot_and_immutable_checks(self):
        first = record_preflight(self.ledger, "recovery-audit", PREFLIGHT, PINNED_PREFLIGHT_SHA)
        before = self.ledger.verify()
        second = record_preflight(self.ledger, "recovery-audit", PREFLIGHT, PINNED_PREFLIGHT_SHA)
        self.assertEqual(first, second)
        self.assertEqual(self.ledger.verify(), before)

    def test_synthetic_hand_fraction_only_reaches_eligible_for_review(self):
        result = self.record_synthetic()
        self.assertEqual(result["observed_checks"]["overall_resolution"], 4000 / 4104)
        self.propose([result["snapshot_id"]])
        self.assertEqual(self.ledger.assess_admission("recovery-plan")["payload"]["status"], "eligible_for_review")
        with self.assertRaises(LedgerError):
            self.ledger.promote_candidate("recovery-plan", "operator", "PROMOTE recovery-plan")

    def test_malformed_arithmetic_missing_fold_and_duplicate_keys_fail(self):
        original = synthetic_passing_audit()
        variants = []
        bad = copy.deepcopy(original)
        bad["modes"]["primary"]["overall"]["fraction"] = 1
        variants.append(bad)
        bad = copy.deepcopy(original)
        del bad["modes"]["primary"]["by_fold"]["4"]
        variants.append(bad)
        bad = copy.deepcopy(original)
        bad["modes"]["primary"]["by_animal"]["synthetic-0"]["animals"] = 2
        variants.append(bad)
        bad = copy.deepcopy(original)
        bad["modes"]["primary"]["overall"]["reasons"]["no_assessment_in_window"] += 1
        variants.append(bad)
        for value in variants:
            with self.assertRaises(LedgerError):
                extract_preflight(encode(value))
        for raw in (b'{"modes":{},"modes":{}}', b'{"modes":NaN}', b'{"modes":Infinity}'):
            with self.assertRaises(LedgerError):
                extract_preflight(raw)

    def test_relabeling_as_prospective_contract_is_rejected(self):
        other = admission_contract("bad-mode", PROTOCOL_SHA, mode="prospective")
        with self.assertRaises(LedgerError):
            self.ledger.freeze_contract(other)

    def test_proposal_cannot_inherit_checks_from_unlisted_evidence(self):
        self.record_synthetic()
        now = utc_now()
        self.ledger.capture_snapshot("unrelated", b'{"not":"the checked audit"}',
            source_id="unrelated", entity="synthetic", event_at=now, received_at=now,
            published_at=None, source_version="1", license="CC0 synthetic", quality=[],
            content_type="application/json", kind="observation")
        try:
            self.propose(["unrelated"])
            result = self.ledger.assess_admission("recovery-plan")
        except LedgerError:
            return
        self.assertNotEqual(result["payload"]["status"], "eligible_for_review",
                            "Proposal inherited passed checks from evidence it did not declare")


if __name__ == "__main__":
    unittest.main(verbosity=2)
