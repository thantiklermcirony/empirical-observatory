"""Read-only independent reconciliation; imports neither engine nor benchmark methods.

Run after the frozen experiment. No assertions are executed and no source is
modified. The only write is the requested reconciliation JSON. Stored execution
claims are checked for internal consistency, not authenticated retrospectively.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path

METHODS = ("rerun_all", "content_dependency", "fixed_freshness", "active_context")
KEYS = ("00-import", "10-primary", "20-secondary")
SCENARIOS = ("fresh_unchanged", "old_unchanged", "unrelated_document", "source_regression", "new_assertion_member", "failed_then_restored")


def insist(value, message):
    if not value:
        raise ValueError(message)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def read(path):
    def pairs(items):
        answer = {}
        for key, value in items:
            insist(key not in answer, "Duplicate JSON key")
            answer[key] = value
        return answer
    return json.loads(Path(path).read_text(encoding="utf-8"), object_pairs_hook=pairs,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError("Nonfinite JSON")))


def stamp(value):
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    insist(result.tzinfo is not None, "Naive timestamp")
    return result


def close(a, b):
    return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-9)


def result(record):
    if record.get("timed_out") or record.get("execution_error") or record.get("snapshot_error") or not record.get("stable"):
        return "unresolved"
    return {0: "pass", 10: "assertion_failure"}.get(record["exit_code"], "unresolved")


def ledger(path, run, unique):
    raw = Path(path).read_bytes()
    insist(raw.endswith(b"\n"), "Truncated ledger")
    events, prior = [], None
    for number, line in enumerate(raw.splitlines(), 1):
        item = json.loads(line)
        insist(item["seq"] == number and item["previous_hash"] == prior, "Broken ledger sequence")
        insist(digest({key: item[key] for key in ("seq", "previous_hash", "payload")}) == item["event_hash"], "Broken event hash")
        record = item["payload"]
        insist(record["schema_version"] == 1 and record["kind"] == "check_run", "Unexpected receipt schema")
        for field in ("before", "after"):
            snapshot = record[field]
            facts = {k: v for k, v in snapshot.items() if k not in ("fingerprint", "resolved_argv")}
            insist(snapshot["fingerprint"] == digest(facts), "Broken snapshot hash")
            insist(snapshot["executable_sha256"] == run["executable_sha256"], "Runtime executable mismatch")
            insist(snapshot["observer_python"] == run["python"] and snapshot["platform"] == run["platform"], "Runtime metadata mismatch")
        insist(record["definition_hash"] == digest(record["before"]["definition"]), "Definition hash mismatch")
        insist(record["stable"] == (record["before"]["fingerprint"] == record["after"]["fingerprint"]), "Stability mismatch")
        insist(stamp(record["finished_at"]) >= stamp(record["started_at"]), "Receipt chronology reversed")
        insist(math.isfinite(record["duration_seconds"]) and record["duration_seconds"] >= 0, "Bad elapsed duration")
        for channel in ("stdout", "stderr"):
            output = record[channel]
            # These actual fixtures emit small ASCII/UTF-8 logs. A truncated
            # stream could not be independently byte-verified from its prefix.
            insist(not output["truncated"], "Full log unavailable for verification")
            data = output["text"].encode("utf-8")
            insist(len(data) == output["bytes"] and hashlib.sha256(data).hexdigest() == output["sha256"], "Output hash mismatch")
        previous = unique.get(item["event_hash"])
        insist(previous is None or previous == record, "Same event ID with different record")
        unique[item["event_hash"]] = record
        events.append(item)
        prior = item["event_hash"]
    return events


def current_inputs(repo, config):
    answer = {}
    for check in config["checks"]:
        entries = {}
        pending = [repo / scope for scope in check["scopes"]]
        while pending:
            path = pending.pop()
            relative = path.relative_to(repo)
            if any(part in (".git", "__pycache__") for part in relative.parts):
                continue
            insist(not path.is_symlink() and not getattr(path, "is_junction", lambda: False)(), "Linked scope")
            insist(path.resolve().is_relative_to(repo.resolve()), "Escaped scope")
            name = relative.as_posix()
            if path.is_dir():
                entries[name] = {"kind": "directory"}
                pending.extend(path.iterdir())
            elif path.is_file():
                entries[name] = {"kind": "file", "sha256": file_hash(path), "executable_bits": path.stat().st_mode & 0o111}
            elif not path.exists():
                entries[name] = {"kind": "missing"}
            else:
                raise ValueError("Unsupported input")
        answer[check["id"]] = entries
    return answer


def reuse_states(events, config, inputs, method, age, seed_count):
    latest = {event["payload"]["check_id"]: event for event in events}
    checks = {check["id"]: check for check in config["checks"]}
    statuses = {}
    def assess(key):
        if key in statuses:
            return statuses[key]
        event = latest.get(key)
        good = event is not None
        if event:
            record = event["payload"]
            good = result(record) == "pass" and record["dependencies_ready"]
            if method in ("content_dependency", "active_context"):
                definition = {k: v for k, v in checks[key].items() if k != "cost"}
                good = good and record["after"]["inputs"] == inputs[key] and record["after"]["definition"] == definition
            if method == "fixed_freshness" and event["seq"] <= seed_count:
                good = good and age <= 3600
            for parent in checks[key]["depends_on"]:
                parent_good = assess(parent)
                good = good and parent_good and record["dependencies"].get(parent) == latest[parent]["event_hash"]
        statuses[key] = bool(good)
        return statuses[key]
    for key in KEYS:
        assess(key)
    return statuses


def expected_selection(config, usable, method):
    if method == "rerun_all":
        return list(KEYS)
    selected = set(key for key in KEYS[1:] if not usable[key])
    if selected and not usable[KEYS[0]]:
        selected.add(KEYS[0])
    return [key for key in KEYS if key in selected]


def reconcile(root, result_dir, publication_path, original_mtimes=False):
    root, result_dir = Path(root).resolve(), Path(result_dir).resolve()
    summary, rows, run = (read(result_dir / name) for name in ("SUMMARY.json", "RESULTS.json", "RUN.json"))
    freeze = read(root / "FROZEN.json")
    publication = read(publication_path)
    insist(run["freeze"]["manifest"] == freeze, "Run embeds different freeze")
    insist(run["freeze"]["sha256"] == file_hash(root / "FROZEN.json"), "Freeze bytes differ")
    verified_files = {}
    for relative, expected in freeze["files"].items():
        path = root / relative
        insist(path.resolve().is_relative_to(root), "Frozen path escape")
        actual = file_hash(path)
        insist(actual == expected, "Post-run frozen source changed: " + relative)
        verified_files[relative] = actual
    for item in publication["files"]:
        candidate = root / Path(item["path"]).name
        insist(file_hash(candidate) == item["sha256"], "Published package/manifest hash differs")
    insist(publication["exact_public_bytes"] is True, "Publication proof not byte-exact")
    verified_at = stamp(publication["verified_before_scored_run_at"])
    insist(stamp(freeze["frozen_at"]) < verified_at < stamp(run["started_at"]) < stamp(summary["completed_at"]), "Freeze/publication/execution chronology failed")
    manifest = read(root / "benchmark" / "MANIFEST.json")
    expected_episodes = {item["id"] for item in manifest["episodes"]}
    insist(len(expected_episodes) == 30 and len(rows) == 120, "Wrong episode/decision coverage")
    lookup = {(row["episode"], row["method"]): row for row in rows}
    insist(len(lookup) == 120 and set(e for e, _ in lookup) == expected_episodes, "Duplicate/missing decision")
    unique, total_records, ledger_files, mtime_checks = {}, 0, 0, 0
    totals = {method: Counter() for method in METHODS}
    scenario_totals = {name: {method: Counter() for method in METHODS} for name in SCENARIOS}
    receipts_by_stage, oracle_seconds, historical_failures = Counter(), 0.0, 0
    for episode in sorted(expected_episodes):
        folder = result_dir / "episodes" / episode
        repo = folder / "repository"
        construction, config = read(folder / "construction.json"), read(folder / "configuration.json")
        scenario = episode.split("/")[1]
        insist(construction["episode"] == episode and scenario in SCENARIOS, "Construction ID differs")
        inputs = current_inputs(repo, config)
        seed = ledger(folder / "seed.jsonl", run, unique)
        ledger_files += 1; total_records += len(seed)
        receipts_by_stage["initial_and_historical"] += len(seed)
        initial = read(folder / "initial-checks.json")
        insist([event["payload"]["check_id"] for event in seed[:3]] == list(KEYS), "Initial checks order differs")
        for event in seed[:3]:
            key = event["payload"]["check_id"]
            insist(initial[key] == {**event["payload"], "event_hash": event["event_hash"]}, "Initial receipt projection differs")
            insist(result(event["payload"]) == "pass", "Unsuccessful initial setup")
        if scenario == "failed_then_restored":
            insist(len(seed) == 4 and seed[-1]["payload"]["check_id"] == "10-primary", "Missing historical failure")
            insist(result(seed[-1]["payload"]) == "assertion_failure", "Historical attempt did not fail ordinarily")
            insist(read(folder / "historical-failed-attempt.json") == {**seed[-1]["payload"], "event_hash": seed[-1]["event_hash"]}, "Historical receipt differs")
            mutation = construction["mutation"]
            insist(file_hash(repo / mutation["path"]) == mutation["before_sha256"] == mutation["restored_sha256"], "Original source not restored")
            historical_failures += 1
        else:
            insist(len(seed) == 3, "Unexpected extra initial attempt")
        oracle_log = ledger(folder / "oracle.jsonl", run, unique)
        ledger_files += 1; total_records += len(oracle_log)
        receipts_by_stage["oracle"] += len(oracle_log)
        oracle = read(folder / "oracle.json")
        oracle_seconds += oracle["evaluation_only_seconds"]
        insist([event["payload"]["check_id"] for event in oracle_log] == list(KEYS), "Oracle coverage/order differs")
        observed = {}
        for event in oracle_log:
            key, record = event["payload"]["check_id"], event["payload"]
            insist(oracle["checks"][key] == {**record, "event_hash": event["event_hash"]}, "Oracle projection differs")
            insist(record["before"]["inputs"] == inputs[key] == record["after"]["inputs"], "Oracle did not see current declared files")
            observed[key] = result(record)
        truth = "unresolved" if "unresolved" in observed.values() else "reject" if "assertion_failure" in observed.values() else "accept"
        insist(oracle["decision"] == truth, "Oracle decision differs")
        intended = "reject" if scenario in ("source_regression", "new_assertion_member") else "accept"
        insist(truth == intended, "Constructed fixture outcome unexpected")
        insist(observed["00-import"] == observed["20-secondary"] == "pass", "Unexpected collateral assertion failure")
        first_oracle = min(stamp(event["payload"]["started_at"]) for event in oracle_log)
        local_rows = read(folder / "scored-decisions.json")
        insist(len(local_rows) == 4 and {row["method"] for row in local_rows} == set(METHODS), "Local decision coverage differs")
        common_times = set()
        for method in METHODS:
            row = lookup[episode, method]
            insist(row == next(value for value in local_rows if value["method"] == method), "Consolidated/local row differs")
            decision = read(folder / (method + "-decision.json"))
            insist(decision == {k: v for k, v in row.items() if k not in ("oracle_decision", "false_verified_claims", "unsupported_verified_claims")}, "Pre-oracle decision differs")
            if original_mtimes:
                mtime = datetime.fromtimestamp((folder / (method + "-decision.json")).stat().st_mtime, timezone.utc)
                insist(mtime <= first_oracle, "Decision file modified after oracle start")
                mtime_checks += 1
            events = ledger(folder / (method + ".jsonl"), run, unique)
            ledger_files += 1; total_records += len(events)
            insist(events[:len(seed)] == seed, "Policies received unequal initial ledgers")
            executed = events[len(seed):]
            receipts_by_stage["continuation"] += len(executed)
            before = reuse_states(seed, config, inputs, method, construction["synthetic_age_seconds"], len(seed))
            after = reuse_states(events, config, inputs, method, construction["synthetic_age_seconds"], len(seed))
            insist({k: v["reusable"] for k, v in row["before_states"].items()} == before, "Independent before-state differs")
            insist({k: v["reusable"] for k, v in row["final_states"].items()} == after, "Independent after-state differs")
            insist(row["selected_checks"] == expected_selection(config, before, method), "Independent selected checks differ")
            insist([event["payload"]["check_id"] for event in executed] == row["selected_checks"], "Executed order differs")
            insist(set(row["executed"]) == set(row["selected_checks"]), "Selected execution omitted")
            execution_results = []
            for event in executed:
                key, record = event["payload"]["check_id"], event["payload"]
                insist(row["executed"][key] == {**record, "event_hash": event["event_hash"]}, "Execution receipt differs")
                insist(record["before"]["inputs"] == inputs[key] == record["after"]["inputs"], "Continuation checked different declared files")
                insist(stamp(record["finished_at"]) < first_oracle, "Policy execution follows oracle")
                execution_results.append(result(record))
            decision_expected = "unresolved" if "unresolved" in execution_results else "reject" if "assertion_failure" in execution_results else "accept" if all(after.values()) else "unresolved"
            insist(row["decision"] == decision_expected and row["oracle_decision"] == truth, "Independent decision differs")
            false = [key for key in KEYS[1:] if after[key] and observed[key] == "assertion_failure"]
            unsupported = [key for key in KEYS[1:] if after[key] and observed[key] != "pass"]
            insist(row["false_verified_claims"] == false and row["unsupported_verified_claims"] == unsupported, "Verification error count differs")
            common_times.add(row["common_capture_seconds"])
            insist(close(row["total_seconds"], row["common_capture_seconds"] + row["continuation_seconds"]), "Cost sum differs")
            subtotal = {"episodes": 1, "correct_decisions": int(decision_expected == truth),
                        "incorrect_decisions": int(decision_expected != truth), "unresolved_decisions": int(decision_expected == "unresolved"),
                        "false_verified_claims": len(false), "unsupported_verified_claims": len(unsupported),
                        "selected_checks": len(row["selected_checks"]), "executed_checks": len(executed),
                        "recorded_timeouts": sum(event["payload"]["timed_out"] for event in executed),
                        "capture_seconds": row["common_capture_seconds"], "continuation_seconds": row["continuation_seconds"],
                        "total_seconds": row["total_seconds"]}
            totals[method].update(subtotal)
            scenario_totals[scenario][method].update(subtotal)
        insist(len(common_times) == 1, "Common capture charged unequally")
    for method, values in totals.items():
        for metric, value in values.items():
            insist(close(value, summary["methods"][method][metric]), "Aggregate differs: " + method + "/" + metric)
    safe = [method for method in METHODS if method != "active_context" and totals[method]["unsupported_verified_claims"] == 0 and
            totals[method]["incorrect_decisions"] <= totals["rerun_all"]["incorrect_decisions"] and
            totals[method]["unresolved_decisions"] <= totals["rerun_all"]["unresolved_decisions"]]
    best = min(safe, key=lambda method: totals[method]["total_seconds"])
    ratio = totals["active_context"]["total_seconds"] / totals[best]["total_seconds"]
    check_tie = all(lookup[episode, "active_context"]["selected_checks"] == lookup[episode, "content_dependency"]["selected_checks"] for episode in expected_episodes)
    insist(best == summary["gate"]["cheapest_equally_correct_conventional"] and close(ratio, summary["gate"]["candidate_total_time_ratio"]), "Gate ratio differs")
    insist(check_tie and summary["gate"]["identical_selected_checks_to_content_invalidation"] and summary["gate"]["passed"] is False, "Expected tie/fail gate differs")
    counts = Counter(result(record) for record in unique.values())
    return {"schema_version": 1, "status": "pass", "reconciled_at": datetime.now(timezone.utc).isoformat(),
            "episodes": 30, "policy_decisions": 120, "ledger_files": ledger_files, "ledger_entries_including_copied_initial_evidence": total_records,
            "unique_execution_receipts": len(unique), "unique_receipt_outcomes": dict(counts), "receipts_by_stage": dict(receipts_by_stage),
            "historical_failures_preserved": historical_failures, "untruncated_output_hashes_checked": 2 * len(unique),
            "original_decision_file_times_before_oracle_checked": mtime_checks, "all_current_declared_source_bytes_reconciled": True,
            "public_freeze": {"commit": publication["commit"], "url": publication["url"], "verified_at": publication["verified_before_scored_run_at"],
                              "run_started_at": run["started_at"], "run_completed_at": summary["completed_at"],
                              "verified_to_run_start_seconds": (stamp(run["started_at"]) - verified_at).total_seconds(),
                              "freeze_sha256": file_hash(root / "FROZEN.json")},
            "frozen_files_unchanged_after_execution": verified_files,
            "artifact_hashes": {name: file_hash(result_dir / name) for name in ("RUN.json", "RESULTS.json", "SUMMARY.json")},
            "methods": {key: dict(value) for key, value in totals.items()}, "by_construction": {k: {m: dict(v) for m, v in item.items()} for k, item in scenario_totals.items()},
            "oracle_evaluation_only_seconds": oracle_seconds,
            "candidate_comparison": {"strongest_correct_baseline": best, "total_time_ratio": ratio, "percent_slower_than_content": (ratio - 1) * 100,
                                     "percent_fewer_checks_than_rerun_all": (1 - totals["active_context"]["executed_checks"] / totals["rerun_all"]["executed_checks"]) * 100,
                                     "percent_less_total_time_than_rerun_all": (1 - totals["active_context"]["total_seconds"] / totals["rerun_all"]["total_seconds"]) * 100,
                                     "identical_check_selection": check_tie, "superiority_gate_passed": False},
            "boundary": "Independent read-only arithmetic, source-byte and receipt consistency audit. It does not prove authentic execution, causal speedup, dependency completeness or agent gains."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--results", type=Path)
    parser.add_argument("--publication", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "RECONCILIATION.json")
    parser.add_argument("--check-original-mtimes", action="store_true")
    args = parser.parse_args()
    value = reconcile(args.root, args.results or args.root / "benchmark/results/flight01",
                      args.publication or args.root / "FREEZE_PUBLICATION.json", args.check_original_mtimes)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({key: value[key] for key in ("status", "episodes", "policy_decisions", "ledger_files", "unique_execution_receipts", "unique_receipt_outcomes", "candidate_comparison")}, indent=2))
