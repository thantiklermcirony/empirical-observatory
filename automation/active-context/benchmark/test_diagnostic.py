"""Synthetic contract tests; these are not the 30-episode scored diagnostic."""
from copy import deepcopy
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from policies import classify, fingerprint, outcome, select, states
from run_diagnostic import aggregate, verify_sources
from specs import CHECK_IDS, CLAIMS, EPISODES, PROJECTS, configuration, manifest, source_path


def receipt(exit_code=0, **kwargs):
    return {"exit_code": exit_code, "timed_out": False, "stable": True,
            "execution_error": None, "snapshot_error": None, **kwargs}


class PolicyContracts(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        (self.repo / "source").mkdir()
        (self.repo / "source" / "a.py").write_text("value = 1\n")
        (self.repo / "cases").mkdir()
        self.config = {"schema_version": 1, "checks": [
            {"id": "import", "claims": ["origin"], "argv": ["{python}", "-c", "pass"],
             "scopes": ["source"], "env": ["ACTIVE_CONTEXT_TEST_ENV"], "depends_on": [], "cost": 1.0},
            {"id": "behavior", "claims": ["behavior"], "argv": ["{python}", "-c", "pass"],
             "scopes": ["source", "cases", "missing.json"], "env": [], "depends_on": ["import"], "cost": 1.0},
        ]}
        self.history = {}
        for check in self.config["checks"]:
            key = check["id"]
            self.history[key] = {"signature": fingerprint(check, self.repo), "event_hash": key + "-old",
                                 "dependencies": {p: p + "-old" for p in check["depends_on"]}, "success": True,
                                 "current_continuation": False}

    def current(self, method="content_dependency", age=60):
        return states(self.config, self.repo, self.history, method, age)

    def test_unchanged_content_reuses_old_evidence_but_fixed_freshness_expires(self):
        self.assertTrue(self.current(age=7200)["behavior"]["reusable"])
        self.assertFalse(self.current("fixed_freshness", 7200)["behavior"]["reusable"])
        self.assertTrue(self.current("fixed_freshness", 3600)["behavior"]["reusable"])

    def test_document_outside_declared_scope_does_not_invalidate(self):
        (self.repo / "README.md").write_text("new document")
        self.assertTrue(self.current()["behavior"]["reusable"])

    def test_added_directory_member_invalidates_only_declared_consumer(self):
        (self.repo / "cases" / "new.json").write_text("{}")
        result = self.current()
        self.assertTrue(result["import"]["reusable"])
        self.assertFalse(result["behavior"]["reusable"])
        self.assertEqual(select(self.config, result, ["behavior"]), ["behavior"])

    def test_previously_missing_file_creation_invalidates(self):
        (self.repo / "missing.json").write_text("{}")
        self.assertFalse(self.current()["behavior"]["reusable"])

    def test_same_size_content_change_invalidates_and_closes_prerequisites(self):
        (self.repo / "source" / "a.py").write_text("value = 2\n")
        self.assertEqual(select(self.config, self.current(), ["behavior"]), ["import", "behavior"])

    def test_fixed_freshness_does_not_look_at_changed_content(self):
        (self.repo / "source" / "a.py").write_text("raise ValueError()")
        self.assertTrue(self.current("fixed_freshness")["behavior"]["reusable"])

    def test_missing_environment_distinct_from_empty(self):
        name = "ACTIVE_CONTEXT_TEST_ENV"
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop(name, None)
            missing = fingerprint(self.config["checks"][0], self.repo)
            os.environ[name] = ""
            self.assertNotEqual(missing, fingerprint(self.config["checks"][0], self.repo))

    def test_changed_prerequisite_receipt_invalidates_child_even_with_same_content(self):
        self.history["import"]["event_hash"] = "new-import"
        result = self.current()
        self.assertTrue(result["import"]["reusable"])
        self.assertFalse(result["behavior"]["reusable"])

    def test_latest_failed_attempt_cannot_revive_an_older_success_after_revert(self):
        original = (self.repo / "source" / "a.py").read_bytes()
        (self.repo / "source" / "a.py").write_text("value = 2\n")
        self.history["behavior"] = {"signature": fingerprint(self.config["checks"][1], self.repo),
                                    "success": False, "event_hash": "failed", "dependencies": {"import": "import-old"}}
        (self.repo / "source" / "a.py").write_bytes(original)
        for method in ("content_dependency", "fixed_freshness"):
            self.assertFalse(self.current(method)["behavior"]["reusable"])
            self.assertEqual(select(self.config, self.current(method), ["behavior"]), ["behavior"])

    def test_failed_parent_blocks_unchanged_child(self):
        self.history["import"]["success"] = False
        self.assertFalse(self.current()["behavior"]["reusable"])

    def test_definition_change_invalidates_content_baseline(self):
        self.config["checks"][1]["argv"][-1] = "print('new command')"
        self.assertFalse(self.current()["behavior"]["reusable"])

    def test_timeout_and_launch_error_are_unresolved_not_negative_results(self):
        self.assertEqual(outcome(receipt(10)), "assertion_failure")
        for value in (receipt(None, timed_out=True), receipt(None, execution_error="missing"), receipt(1), receipt(0, stable=False)):
            self.assertEqual(outcome(value), "unresolved")
            self.assertEqual(classify(self.config, self.current(), {"behavior": value}), "unresolved")

    def test_no_execution_with_valid_evidence_is_accept_and_failure_is_reject(self):
        self.assertEqual(classify(self.config, self.current(), {}), "accept")
        self.assertEqual(classify(self.config, self.current(), {"behavior": receipt(10)}), "reject")


class ConstructionContracts(unittest.TestCase):
    def test_exactly_thirty_unique_episodes_five_pinned_projects(self):
        value = manifest()
        self.assertEqual(len(value["sources"]), 5)
        self.assertEqual(len(value["episodes"]), 30)
        self.assertEqual(len({item["id"] for item in value["episodes"]}), 30)
        self.assertTrue(all(len(item["commit"]) == 40 for item in value["sources"]))
        verify_sources()

    def test_every_mutation_matches_exactly_once_in_pinned_source(self):
        for project in PROJECTS:
            with self.subTest(project=project["id"]):
                data = (source_path(project) / project["source"]).read_bytes()
                self.assertEqual(data.count(project["before"].encode()), 1)
                self.assertNotEqual(project["before"], project["after"])

    def test_no_policy_receives_mutation_name_or_assertion_outcomes(self):
        for project in PROJECTS:
            config = configuration(project)
            self.assertEqual(tuple(check["id"] for check in config["checks"]), CHECK_IDS)
            self.assertEqual(set(CLAIMS), {claim for check in config["checks"][1:] for claim in check["claims"]})
            self.assertEqual(config["checks"][1]["depends_on"], ["00-import"])
            self.assertEqual(config["checks"][2]["depends_on"], ["00-import"])
            self.assertNotIn("mutation", str(config))

    def test_check_set_tie_fails_gate_even_if_clock_appears_twice_as_fast(self):
        rows = []
        for index in range(30):
            for method in ("rerun_all", "content_dependency", "fixed_freshness", "active_context"):
                rows.append({"episode": str(index), "method": method, "decision": "accept", "oracle_decision": "accept",
                             "false_verified_claims": [], "unsupported_verified_claims": [],
                             "selected_checks": ["a"], "executed": {"a": receipt()},
                             "common_capture_seconds": 0.1, "continuation_seconds": 0.1 if method == "active_context" else 0.9,
                             "total_seconds": 0.2 if method == "active_context" else 1.0})
        result = aggregate(rows)
        self.assertTrue(result["gate"]["complete_resolved_diagnostic"])
        self.assertTrue(result["gate"]["identical_selected_checks_to_content_invalidation"])
        self.assertLess(result["gate"]["candidate_total_time_ratio"], 0.8)
        self.assertFalse(result["gate"]["passed"])

    def test_timeouts_are_retained_and_block_complete_gate(self):
        rows = []
        for method in ("rerun_all", "content_dependency", "fixed_freshness", "active_context"):
            rows.append({"episode": "0", "method": method, "decision": "unresolved", "oracle_decision": "unresolved",
                         "false_verified_claims": [], "unsupported_verified_claims": [], "selected_checks": ["a"],
                         "executed": {"a": receipt(None, timed_out=True)}, "common_capture_seconds": 1,
                         "continuation_seconds": 1, "total_seconds": 2})
        result = aggregate(rows)
        self.assertEqual(result["methods"]["active_context"]["recorded_timeouts"], 1)
        self.assertFalse(result["gate"]["complete_resolved_diagnostic"])
        self.assertFalse(result["gate"]["passed"])


if __name__ == "__main__":
    unittest.main()
