"""Read-only reconciliation of saved Flight 01 records; never runs a check.

No imports from the candidate or benchmark implementation. Writes only an audit
JSON beside this script. Filesystem modification times are secondary evidence.
"""
from __future__ import annotations

import ast
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "benchmark/results/flight01"
REVIEW = Path(__file__).resolve().parent


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1048576), b""):
            h.update(block)
    return h.hexdigest()


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def timestamp(value):
    stamp = datetime.fromisoformat(value)
    assert stamp.utcoffset() is not None
    return stamp


def outcome(receipt):
    if receipt["timed_out"] or receipt["execution_error"] or receipt["snapshot_error"] or not receipt["stable"]:
        return "unresolved"
    if receipt["exit_code"] == 0:
        return "pass"
    if receipt["exit_code"] == 10:
        # Dedicated assertion failures should have the declared structured trace.
        stderr = receipt["stderr"]["text"]
        assert any(read_line.get("kind") == "assertion_failure" for line in stderr.splitlines() if line.strip() for read_line in [json.loads(line)])
        return "negative"
    return "unresolved"


def ledger(path):
    previous = None
    indexed = {}
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        event = json.loads(line)
        assert event["seq"] == number and event["previous_hash"] == previous
        assert event["event_hash"] == digest({k: event[k] for k in ("seq", "previous_hash", "payload")})
        indexed[event["event_hash"]] = event["payload"]
        previous = event["event_hash"]
    return indexed


def same_receipt(receipt, indexed):
    assert indexed[receipt["event_hash"]] == {k: v for k, v in receipt.items() if k != "event_hash"}


def main():
    summary = read(RESULTS / "SUMMARY.json")
    rows = read(RESULTS / "RESULTS.json")
    run = read(RESULTS / "RUN.json")
    protocol = read(ROOT / "benchmark/protocol.json")
    freeze = read(ROOT / "FROZEN.json")
    publication = read(ROOT / "FREEZE_PUBLICATION.json")
    assert summary["status"] == "completed"
    assert freeze == run["freeze"]["manifest"]
    assert sha(ROOT / "FROZEN.json") == run["freeze"]["sha256"]
    frozen_hashes = {name: sha(ROOT / name) for name in freeze["files"]}
    assert frozen_hashes == freeze["files"]
    for item in publication["files"]:
        assert sha(ROOT / Path(item["path"]).name) == item["sha256"]
    assert timestamp(freeze["frozen_at"]) < timestamp(publication["verified_before_scored_run_at"]) < timestamp(run["started_at"]) < timestamp(summary["completed_at"])
    methods = protocol["methods"]
    episodes = sorted({row["episode"] for row in rows})
    assert len(episodes) == protocol["episode_count"] == 30
    assert len({episode.split('/')[0] for episode in episodes}) == protocol["projects"] == 5
    assert len(rows) == 120
    indexed_rows = {(row["episode"], row["method"]): row for row in rows}
    assert len(indexed_rows) == len(rows)
    assert set(indexed_rows) == {(ep, method) for ep in episodes for method in methods}
    totals = {method: Counter() for method in methods}
    classifications = []
    chronological = []
    secondary_mtimes = []
    exact_ties = []
    histories = Counter()
    all_hashes = {str(path.relative_to(ROOT)): sha(path) for path in (RESULTS / "RESULTS.json", RESULTS / "SUMMARY.json", RESULTS / "RUN.json")}

    for episode in episodes:
        folder = RESULTS / "episodes" / episode
        config = read(folder / "configuration.json")
        checks = {check["id"]: check for check in config["checks"]}
        relevant = {key for key, check in checks.items() if set(check["claims"]) & set(protocol["requested_claims"])}
        assert len(relevant) == 2 and len(checks) == 3
        oracle = read(folder / "oracle.json")
        assert set(oracle["checks"]) == set(checks)
        truth_outcomes = {key: outcome(receipt) for key, receipt in oracle["checks"].items()}
        truth = "unresolved" if "unresolved" in truth_outcomes.values() else "reject" if "negative" in truth_outcomes.values() else "accept"
        assert truth == oracle["decision"]
        first_oracle = min(timestamp(receipt["started_at"]) for receipt in oracle["checks"].values())
        oracle_ledger = ledger(folder / "oracle.jsonl")
        for receipt in oracle["checks"].values():
            same_receipt(receipt, oracle_ledger)
        initial = read(folder / "initial-checks.json")
        assert len(initial) == 3 and all(outcome(receipt) == "pass" for receipt in initial.values())
        if (folder / "historical-failed-attempt.json").exists():
            assert outcome(read(folder / "historical-failed-attempt.json")) == "negative"
            histories["failed_then_restored"] += 1
        scored = read(folder / "scored-decisions.json")
        assert len(scored) == 4
        assert {row["method"] for row in scored} == set(methods)
        for row in scored:
            assert row == indexed_rows[(episode, row["method"])]
        for method in methods:
            row = indexed_rows[(episode, method)]
            decision_path = folder / (method + "-decision.json")
            pre_oracle = read(decision_path)
            after_keys = {"oracle_decision", "false_verified_claims", "unsupported_verified_claims"}
            assert not (set(pre_oracle) & after_keys)
            assert pre_oracle == {key: value for key, value in row.items() if key not in after_keys}
            assert len(row["selected_checks"]) == len(set(row["selected_checks"]))
            assert set(row["selected_checks"]) == set(row["executed"])
            event_index = ledger(folder / (method + ".jsonl"))
            for receipt in row["executed"].values():
                same_receipt(receipt, event_index)
                assert timestamp(receipt["finished_at"]) <= first_oracle
            execution_outcomes = [outcome(receipt) for receipt in row["executed"].values()]
            derived_decision = "unresolved" if "unresolved" in execution_outcomes else "reject" if "negative" in execution_outcomes else "accept" if all(s["reusable"] for s in row["final_states"].values()) else "unresolved"
            assert row["decision"] == derived_decision
            assert row["oracle_decision"] == truth
            false = sorted(key for key in relevant if row["final_states"][key]["reusable"] and truth_outcomes[key] == "negative")
            unsupported = sorted(key for key in relevant if row["final_states"][key]["reusable"] and truth_outcomes[key] != "pass")
            assert false == row["false_verified_claims"]
            assert unsupported == row["unsupported_verified_claims"]
            counter = totals[method]
            counter.update({"episodes": 1, "correct_decisions": int(derived_decision == truth), "incorrect_decisions": int(derived_decision != truth), "unresolved_decisions": int(derived_decision == "unresolved"), "false_verified_claims": len(false), "unsupported_verified_claims": len(unsupported), "selected_checks": len(row["selected_checks"]), "executed_checks": len(row["executed"]), "recorded_timeouts": sum(receipt["timed_out"] for receipt in row["executed"].values())})
            for recorded, accumulated in (("common_capture_seconds", "capture_seconds"), ("continuation_seconds", "continuation_seconds"), ("total_seconds", "total_seconds")):
                value = row[recorded]
                assert type(value) in (int, float) and math.isfinite(value) and value >= 0
                counter[accumulated] += value
            assert math.isclose(row["total_seconds"], row["common_capture_seconds"] + row["continuation_seconds"], abs_tol=1e-9)
            classifications.append({"episode": episode, "method": method, "decision": derived_decision, "oracle": truth, "false_verified_claims": false, "unsupported_verified_claims": unsupported})
            chronological.append({"episode": episode, "method": method, "pre_oracle_document_separate_and_unscored": True, "all_recorded_executions_finish_before_oracle": True})
            secondary_mtimes.append(decision_path.stat().st_mtime_ns <= int(first_oracle.timestamp() * 1_000_000_000))
            all_hashes[str(decision_path.relative_to(ROOT))] = sha(decision_path)
        exact_ties.append(indexed_rows[(episode, "active_context")]["selected_checks"] == indexed_rows[(episode, "content_dependency")]["selected_checks"])
        assert len({indexed_rows[(episode, method)]["common_capture_seconds"] for method in methods}) == 1
    for method in methods:
        for key, expected in summary["methods"][method].items():
            actual = totals[method][key]
            if isinstance(expected, float):
                assert math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-9), (method, key, actual, expected)
            else:
                assert actual == expected, (method, key, actual, expected)
    assert histories["failed_then_restored"] == 5
    assert len(exact_ties) == 30 and all(exact_ties)
    candidates = [method for method in methods if method != "active_context" and totals[method]["unsupported_verified_claims"] == 0 and totals[method]["incorrect_decisions"] <= totals["rerun_all"]["incorrect_decisions"] and totals[method]["unresolved_decisions"] <= totals["rerun_all"]["unresolved_decisions"]]
    best = min(candidates, key=lambda method: totals[method]["total_seconds"])
    assert best == summary["gate"]["cheapest_equally_correct_conventional"] == "content_dependency"
    ratio = totals["active_context"]["total_seconds"] / totals[best]["total_seconds"]
    assert math.isclose(ratio, summary["gate"]["candidate_total_time_ratio"], rel_tol=1e-12)
    assert summary["gate"]["identical_selected_checks_to_content_invalidation"] is True
    assert summary["gate"]["passed"] is False
    assert ratio > 0.8
    source = ROOT / "benchmark/run_diagnostic.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call)]
    decision_writes = [node.lineno for node in calls if isinstance(node.func, ast.Name) and node.func.id == "write_json" and node.args and any(isinstance(x, ast.Constant) and x.value == "-decision.json" for x in ast.walk(node.args[0]))]
    oracle_executions = [node.lineno for node in calls if isinstance(node.func, ast.Name) and node.func.id == "capture" and any(isinstance(x, ast.Constant) and x.value == "oracle.jsonl" for x in ast.walk(node))]
    assert len(decision_writes) == len(oracle_executions) == 1 and decision_writes[0] < oracle_executions[0]
    assert {name: sha(ROOT / name) for name in freeze["files"]} == frozen_hashes
    result = {"passed": True, "reviewed_at": datetime.now(timezone.utc).isoformat(), "episode_count": 30, "policy_rows": 120, "methods": {key: dict(value) for key, value in totals.items()}, "exact_candidate_content_check_sequence_ties": sum(exact_ties), "candidate_total_time_ratio": ratio, "gate_passed": False, "frozen_source_files_verified": len(frozen_hashes), "frozen_source_sha256": frozen_hashes, "freeze_sha256": run["freeze"]["sha256"], "publication_record_commit": publication["commit"], "decision_write_source_line": decision_writes[0], "oracle_capture_source_line": oracle_executions[0], "secondary_filesystem_decision_mtimes_before_oracle_start": sum(secondary_mtimes), "chronology_records": chronological, "classifications": classifications, "input_record_sha256": all_hashes, "boundary": "Saved-record arithmetic/source audit only; no rerun or refit. Frozen source order and local timestamp separation are not cryptographic execution attestation. Filesystem timestamps are secondary and may change when artifacts are copied."}
    (REVIEW / "benchmark-result-proof.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: result[k] for k in ("passed", "episode_count", "policy_rows", "exact_candidate_content_check_sequence_ties", "candidate_total_time_ratio", "gate_passed", "frozen_source_files_verified", "secondary_filesystem_decision_mtimes_before_oracle_start", "methods")}, indent=2))


if __name__ == "__main__":
    main()
