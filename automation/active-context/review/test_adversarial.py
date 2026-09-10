"""Independent public-API checks; only disposable local projects are executed.

Run: python -m unittest discover -s review -p test_adversarial.py -v
This file does not import implementation helpers or modify production source.
"""

from __future__ import annotations

import copy
import hashlib
import itertools
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

REVIEW = Path(__file__).resolve().parent
sys.path.insert(0, str(REVIEW.parent))
from active_context.core import inspect, plan, run_check, verify_ledger


class Adversarial(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="independent-", dir=REVIEW)
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.ledger = self.root / "receipts.jsonl"
        (self.repo / "src").mkdir()
        (self.repo / "src" / "a.txt").write_text("original", encoding="utf-8")
        self.script("check.py", "print('ok')\n")
        self.config = {"schema_version": 1, "checks": [self.check()]}

    def script(self, name, source):
        (self.repo / name).write_text(source, encoding="utf-8")

    def check(self, id="unit", claims=None, cost=1, depends_on=None, argv=None):
        return {
            "id": id,
            "claims": ["working"] if claims is None else claims,
            "argv": ["{python}", "check.py"] if argv is None else argv,
            "scopes": ["src", "check.py"],
            "env": [],
            "depends_on": [] if depends_on is None else depends_on,
            "cost": cost,
        }

    def run_one(self, id="unit", timeout=10):
        return run_check(self.config, id, self.repo, self.ledger, timeout=timeout)

    def status(self, id="unit", config=None, repo=None):
        return inspect(config or self.config, repo or self.repo, self.ledger)["checks"][id]

    def assert_not_reusable(self, **kwargs):
        self.assertFalse(self.status(**kwargs)["reusable"])

    def test_unchanged_success_is_reusable(self):
        self.run_one()
        self.assertTrue(self.status()["reusable"])
        verify_ledger(self.ledger)

    def test_directory_addition_invalidates_prior_success(self):
        self.run_one()
        (self.repo / "src" / "plugin.txt").write_text("new", encoding="utf-8")
        self.assert_not_reusable()

    def test_directory_deletion_invalidates_prior_success(self):
        self.run_one()
        (self.repo / "src" / "a.txt").unlink()
        self.assert_not_reusable()

    def test_rename_same_content_invalidates_prior_success(self):
        self.run_one()
        (self.repo / "src" / "a.txt").rename(self.repo / "src" / "b.txt")
        self.assert_not_reusable()

    def test_missing_dependency_creation_is_visible(self):
        self.config["checks"][0]["scopes"].append("optional.json")
        self.run_one()
        (self.repo / "optional.json").write_text("{}", encoding="utf-8")
        self.assert_not_reusable()

    def test_success_that_changes_its_input_is_unstable(self):
        self.script("check.py", "from pathlib import Path\nPath('src/a.txt').write_text('changed')\n")
        receipt = self.run_one()
        self.assertEqual(receipt["exit_code"], 0)
        self.assertFalse(receipt["stable"])
        self.assert_not_reusable()

    def test_latest_failure_does_not_resurrect_prior_success(self):
        self.script("check.py", "import os, sys\nsys.exit(int(os.environ.get('ACTIVE_CONTEXT_REVIEW_EXIT', '0')))\n")
        with patch.dict(os.environ, {"ACTIVE_CONTEXT_REVIEW_EXIT": "0"}):
            self.run_one()
        self.assertTrue(self.status()["reusable"])
        with patch.dict(os.environ, {"ACTIVE_CONTEXT_REVIEW_EXIT": "7"}):
            receipt = self.run_one()
        self.assertEqual(receipt["exit_code"], 7)
        self.assert_not_reusable()
        self.assertEqual(self.status()["status"], "failed")

    def test_latest_timeout_does_not_resurrect_prior_success(self):
        self.script("check.py", "import os, time\ntime.sleep(float(os.environ.get('ACTIVE_CONTEXT_REVIEW_SLEEP', '0')))\n")
        with patch.dict(os.environ, {"ACTIVE_CONTEXT_REVIEW_SLEEP": "0"}):
            self.run_one()
        with patch.dict(os.environ, {"ACTIVE_CONTEXT_REVIEW_SLEEP": "3"}):
            receipt = self.run_one(timeout=0.15)
        self.assertTrue(receipt["timed_out"])
        self.assert_not_reusable()

    def test_identical_second_checkout_does_not_inherit_receipt(self):
        self.run_one()
        other = self.root / "other-repo"
        (other / "src").mkdir(parents=True)
        (other / "src" / "a.txt").write_bytes((self.repo / "src" / "a.txt").read_bytes())
        (other / "check.py").write_bytes((self.repo / "check.py").read_bytes())
        self.assert_not_reusable(repo=other)

    def test_changed_argv_cannot_reuse_same_id(self):
        self.run_one()
        changed = copy.deepcopy(self.config)
        changed["checks"][0]["argv"] += ["--different-condition"]
        self.assert_not_reusable(config=changed)

    def test_changed_claim_contract_does_not_inherit_success(self):
        self.run_one()
        changed = copy.deepcopy(self.config)
        changed["checks"][0]["claims"] = ["stronger-unchecked-claim"]
        self.assert_not_reusable(config=changed)

    def test_declared_environment_absent_differs_from_empty(self):
        name = "ACTIVE_CONTEXT_REVIEW_EMPTY"
        self.config["checks"][0]["env"] = [name]
        with patch.dict(os.environ):
            os.environ.pop(name, None)
            self.run_one()
            os.environ[name] = ""
            self.assert_not_reusable()

    def test_inspect_and_plan_do_not_execute_commands(self):
        self.script("check.py", "from pathlib import Path\nPath('sentinel').write_text('executed')\n")
        inspect(self.config, self.repo, self.ledger)
        plan(self.config, self.repo, self.ledger, ["working"], 1)
        self.assertFalse((self.repo / "sentinel").exists())

    def test_corrupt_latest_record_fails_closed(self):
        self.run_one()
        with self.ledger.open("a", encoding="utf-8") as stream:
            stream.write('{"not a complete record": true}\n')
        with self.assertRaises(Exception):
            inspect(self.config, self.repo, self.ledger)

    def test_exact_cover_beats_naive_cheapest_first(self):
        self.config["checks"] = [
            self.check("ab", ["A", "B"], 3),
            self.check("a", ["A"], 2),
            self.check("bc", ["B", "C"], 2),
            self.check("c", ["C"], 2),
        ]
        full = plan(self.config, self.repo, self.ledger, ["A", "B", "C"], 4)
        self.assertTrue(full["complete"])
        self.assertEqual(set(full["selected_checks"]), {"a", "bc"})
        self.assertEqual(full["estimated_cost"], 4)
        partial = plan(self.config, self.repo, self.ledger, ["A", "B", "C"], 3)
        self.assertFalse(partial["complete"])
        self.assertTrue(partial["uncovered_claims"])
        self.assertLessEqual(partial["estimated_cost"], 3)

    def test_prerequisite_cost_is_not_free(self):
        self.config["checks"] = [self.check("base", ["setup"], 4), self.check("target", ["T"], 1, ["base"])]
        too_low = plan(self.config, self.repo, self.ledger, ["T"], 4)
        self.assertFalse(too_low["complete"])
        full = plan(self.config, self.repo, self.ledger, ["T"], 5)
        self.assertTrue(full["complete"])
        self.assertEqual(full["selected_checks"], ["base", "target"])
        self.assertEqual(full["estimated_cost"], 5)

    def test_nonfinite_negative_or_boolean_cost_rejected(self):
        for value in (float("nan"), float("inf"), -1, True):
            with self.subTest(cost=repr(value)):
                self.config["checks"][0]["cost"] = value
                with self.assertRaises(Exception):
                    plan(self.config, self.repo, self.ledger, ["working"], 1)

    def test_small_catalogues_match_independent_subset_oracle(self):
        rng = random.Random(48021)
        universe = {"A", "B", "C", "D"}
        for case in range(12):
            checks = []
            for i in range(7):
                covered = [x for x in sorted(universe) if rng.random() < 0.5]
                checks.append(self.check(f"c{i}", covered or ["irrelevant"], rng.randint(1, 7)))
            # A complete but deliberately expensive fallback guarantees feasibility.
            checks.append(self.check("all", sorted(universe), 29))
            self.config["checks"] = checks
            possible = []
            for n in range(len(checks) + 1):
                for subset in itertools.combinations(checks, n):
                    covered = set().union(*(set(c["claims"]) for c in subset))
                    if universe <= covered:
                        possible.append(sum(c["cost"] for c in subset))
            optimum = min(possible)
            with self.subTest(case=case, optimum=optimum):
                result = plan(self.config, self.repo, self.ledger, sorted(universe), optimum)
                self.assertTrue(result["complete"])
                self.assertEqual(result["estimated_cost"], optimum)
                self.assertFalse(plan(self.config, self.repo, self.ledger, sorted(universe), optimum - 0.5)["complete"])

    def test_late_prerequisite_success_cannot_certify_earlier_child(self):
        self.script("base.py", "print('setup checked')\n")
        base = self.check("base", ["setup"], 2, argv=["{python}", "base.py"])
        base["scopes"] = ["base.py"]
        child = self.check("child", ["working"], 1, ["base"])
        self.config["checks"] = [base, child]
        self.run_one("child")
        self.assert_not_reusable(id="child")
        self.run_one("base")
        self.assert_not_reusable(id="child")
        self.run_one("child")
        self.assertTrue(self.status("child")["reusable"])

    def test_fresh_prerequisite_receipt_requires_child_recheck(self):
        self.script("base.py", "print('setup checked')\n")
        base = self.check("base", ["setup"], 2, argv=["{python}", "base.py"])
        base["scopes"] = ["base.py"]
        child = self.check("child", ["working"], 1, ["base"])
        self.config["checks"] = [base, child]
        self.run_one("base")
        self.run_one("child")
        self.assertTrue(self.status("child")["reusable"])
        self.run_one("base")
        self.assert_not_reusable(id="child")
        result = plan(self.config, self.repo, self.ledger, ["working"], 1)
        self.assertEqual(result["selected_checks"], ["child"])
        self.assertTrue(result["complete"])

    def test_unknown_claim_remains_uncovered(self):
        self.run_one()
        result = plan(self.config, self.repo, self.ledger, ["working", "not-declared"], 20)
        self.assertFalse(result["complete"])
        self.assertEqual(result["uncovered_claims"], ["not-declared"])

    def test_unrelated_changed_inputs_do_not_invalidate_success(self):
        self.run_one()
        (self.repo / "outside-declared-scopes.txt").write_text("unrelated", encoding="utf-8")
        state = inspect(self.config, self.repo, self.ledger)
        self.assertTrue(state["checks"]["unit"]["reusable"])
        self.assertIn("Undeclared", state["boundary"])

    def rewrite_single_receipt(self, mutation):
        # Independently recompute an envelope hash: semantic validation must also
        # reject malformed data. This does not assert authenticity against a
        # malicious writer who replaces an internally valid complete history.
        event = json.loads(self.ledger.read_text(encoding="utf-8"))
        mutation(event["payload"])
        body = {key: event[key] for key in ("seq", "previous_hash", "payload")}
        encoded = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")
        event["event_hash"] = hashlib.sha256(encoded).hexdigest()
        self.ledger.write_text(json.dumps(event, ensure_ascii=False) + "\n", encoding="utf-8")

    def test_missing_output_evidence_is_not_a_valid_receipt(self):
        self.run_one()
        self.rewrite_single_receipt(lambda receipt: receipt.pop("stdout"))
        with self.assertRaises(Exception):
            verify_ledger(self.ledger)

    def test_invalid_receipt_time_is_rejected(self):
        self.run_one()
        self.rewrite_single_receipt(lambda receipt: receipt.update(started_at="not-a-time"))
        with self.assertRaises(Exception):
            verify_ledger(self.ledger)

    def test_large_output_has_full_digest_and_bounded_display(self):
        self.script("check.py", "import sys\nsys.stdout.buffer.write(b'x' * 1100000)\n")
        receipt = self.run_one()
        output = receipt["stdout"]
        self.assertEqual(output["sha256"], hashlib.sha256(b"x" * 1100000).hexdigest())
        self.assertEqual(output["bytes"], 1100000)
        self.assertTrue(output["truncated"])
        self.assertLessEqual(len(output["text"]), 32000)

    @unittest.skipUnless(os.name == "nt", "Windows junction-specific traversal check")
    def test_nested_junction_cannot_escape_declared_scope(self):
        powershell = shutil.which("powershell") or shutil.which("pwsh")
        if not powershell:
            self.skipTest("No PowerShell available to create a disposable junction")
        target = self.root / "outside"
        target.mkdir()
        (target / "not-an-input.txt").write_text("outside", encoding="utf-8")
        link = self.repo / "src" / "nested-link"
        command = f"New-Item -ItemType Junction -Path '{str(link)}' -Value '{str(target)}' -ErrorAction Stop | Out-Null"
        result = subprocess.run([powershell, "-NoProfile", "-NonInteractive", "-Command", command], capture_output=True, timeout=20)
        if result.returncode:
            self.skipTest("Junction creation unavailable on this host")
        try:
            with self.assertRaises(ValueError):
                self.run_one()
        finally:
            # Removing the junction itself does not traverse/delete its target.
            link.rmdir()
        self.assertTrue((target / "not-an-input.txt").exists())


if __name__ == "__main__":
    unittest.main()
