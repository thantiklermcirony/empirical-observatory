"""Frozen, constructed continuation diagnostic. No LLM, API or network use."""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import sys
import time
import traceback
import zipfile

from policies import METHODS, classify, file_sha, fingerprint, outcome, select, states
from specs import CHECK_IDS, CLAIMS, EPISODES, PROJECTS, ROOT, configuration, manifest, materialize, mutate_source, ordinary_mutation, source_path, source_records

PACKAGE_ROOT = ROOT.parent


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def required_frozen_files():
    names = ["specs.py", "source_checker.py", "policies.py", "run_diagnostic.py", "protocol.json", "MANIFEST.json"]
    paths = [ROOT / name for name in names]
    paths.extend(ROOT / "upstream" / name for name in ("SOURCE_LOCK.json", "REPLACEMENT_SOURCE_LOCK.json"))
    paths.extend(sorted((PACKAGE_ROOT / "active_context").rglob("*.py")))
    return paths


def verify_freeze(path):
    freeze = json.loads(Path(path).read_text(encoding="utf-8"))
    if freeze.get("schema_version") != 1 or freeze.get("status") != "frozen":
        raise ValueError("A version 1 frozen manifest is required")
    files = freeze.get("files", {})
    for required in required_frozen_files():
        relative = required.relative_to(PACKAGE_ROOT).as_posix()
        if files.get(relative) != file_sha(required):
            raise ValueError("Unfrozen or changed source: " + relative)
    if json.loads((ROOT / "protocol.json").read_text(encoding="utf-8"))["episode_count"] != 30:
        raise ValueError("Protocol episode count changed")
    return {"path": str(Path(path).resolve()), "sha256": file_sha(path), "manifest": freeze}


def verify_sources():
    """Each original extracted file must match the pinned archive bytes."""
    records = source_records()
    for project in PROJECTS:
        record = records[project["repository"]]
        archive = ROOT / "upstream" / record["archive"]
        if file_sha(archive) != record["archive_sha256"]:
            raise ValueError("Pinned archive hash mismatch")
        root = source_path(project)
        wanted = set()
        with zipfile.ZipFile(archive) as source:
            for info in source.infolist():
                if info.is_dir():
                    continue
                parts = Path(*info.filename.split("/")[1:])
                destination = root / parts
                if not destination.resolve().is_relative_to(root.resolve()) or destination.is_symlink():
                    raise ValueError("Unsafe source archive path")
                wanted.add(parts.as_posix())
                if destination.read_bytes() != source.read(info):
                    raise ValueError("Extracted upstream source changed: " + str(parts))
        actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file() and "__pycache__" not in p.parts}
        if actual != wanted:
            raise ValueError("Unexpected extracted source membership")
    if manifest() != json.loads((ROOT / "MANIFEST.json").read_text(encoding="utf-8")):
        raise ValueError("Current source/case manifest differs from frozen manifest")


def capture(core, config, check_id, repo, ledger, history, timeout, current=False):
    """Common execution instrument; both independent and core evidence retained."""
    check = next(check for check in config["checks"] if check["id"] == check_id)
    before = fingerprint(check, repo)
    dependencies = {parent: history.get(parent, {}).get("event_hash") for parent in check["depends_on"]}
    receipt = core.run_check(config, check_id, repo, ledger, timeout=timeout)
    after = fingerprint(check, repo)
    history[check_id] = {"signature": after, "event_hash": receipt["event_hash"],
                         "dependencies": dependencies, "current_continuation": current,
                         "success": outcome(receipt) == "pass" and before == after and receipt["dependencies_ready"]}
    return receipt


def oracle_decision(receipts):
    values = [outcome(record) for record in receipts.values()]
    if "unresolved" in values:
        return "unresolved"
    return "reject" if "assertion_failure" in values else "accept"


def aggregate(rows):
    totals = {}
    for method in METHODS:
        values = [row for row in rows if row["method"] == method]
        totals[method] = {
            "episodes": len(values), "correct_decisions": sum(row["decision"] == row["oracle_decision"] for row in values),
            "incorrect_decisions": sum(row["decision"] != row["oracle_decision"] for row in values),
            "unresolved_decisions": sum(row["decision"] == "unresolved" for row in values),
            "false_verified_claims": sum(len(row["false_verified_claims"]) for row in values),
            "unsupported_verified_claims": sum(len(row["unsupported_verified_claims"]) for row in values),
            "selected_checks": sum(len(row["selected_checks"]) for row in values),
            "executed_checks": sum(len(row["executed"]) for row in values),
            "recorded_timeouts": sum(record.get("timed_out", False) for row in values for record in row["executed"].values()),
            "capture_seconds": sum(row["common_capture_seconds"] for row in values),
            "continuation_seconds": sum(row["continuation_seconds"] for row in values),
            "total_seconds": sum(row["total_seconds"] for row in values),
        }
    reference = totals["rerun_all"]
    eligible = [method for method in METHODS if method != "active_context" and
                totals[method]["unsupported_verified_claims"] == 0 and
                totals[method]["incorrect_decisions"] <= reference["incorrect_decisions"] and
                totals[method]["unresolved_decisions"] <= reference["unresolved_decisions"]]
    best = min(eligible, key=lambda method: totals[method]["total_seconds"]) if eligible else None
    candidate = totals["active_context"]
    candidate_rows = {row["episode"]: row for row in rows if row["method"] == "active_context"}
    content_rows = {row["episode"]: row for row in rows if row["method"] == "content_dependency"}
    tie = bool(candidate_rows) and candidate_rows.keys() == content_rows.keys() and all(
        candidate_rows[key]["selected_checks"] == content_rows[key]["selected_checks"] for key in candidate_rows)
    complete = len(rows) == 120 and all(row["oracle_decision"] != "unresolved" for row in rows)
    ratio = candidate["total_seconds"] / totals[best]["total_seconds"] if best and totals[best]["total_seconds"] > 0 else None
    passed = (complete and not tie and candidate["unsupported_verified_claims"] == 0 and
              candidate["incorrect_decisions"] <= reference["incorrect_decisions"] and
              candidate["unresolved_decisions"] <= reference["unresolved_decisions"] and ratio is not None and ratio <= 0.8)
    return {"methods": totals, "gate": {"passed": passed, "complete_resolved_diagnostic": complete,
            "cheapest_equally_correct_conventional": best, "candidate_total_time_ratio": ratio,
            "identical_selected_checks_to_content_invalidation": tie,
            "rule": "Zero unsupported verification; correctness/coverage at least rerun-all; 20% total measured cost improvement; a check-set tie fails regardless of timing noise."}}


def run(output, freeze_path, timeout=10):
    freeze = verify_freeze(freeze_path)
    verify_sources()
    output = Path(output).resolve()
    if not output.is_relative_to(ROOT.resolve()) or output.exists():
        raise ValueError("Choose a new result directory inside benchmark/")
    output.mkdir(parents=True)
    sys.path.insert(0, str(PACKAGE_ROOT))
    from active_context import core
    if Path(core.__file__).resolve() != (PACKAGE_ROOT / "active_context" / "core.py").resolve():
        raise ValueError("Unexpected Active Context import origin")
    write_json(output / "RUN.json", {"started_at": datetime.now(timezone.utc).isoformat(), "freeze": freeze,
                                    "python": sys.version, "executable_sha256": file_sha(sys.executable),
                                    "platform": sys.platform, "core_origin": str(Path(core.__file__).resolve()),
                                    "timeout_seconds": timeout, "status": "running"})
    rows, episode_index = [], 0
    for project in PROJECTS:
        for episode, age in EPISODES:
            identifier = project["id"] + "/" + episode
            folder = output / "episodes" / project["id"] / episode
            folder.mkdir(parents=True)
            repo = folder / "repository"
            config = materialize(project, repo)
            write_json(folder / "configuration.json", config)
            seed_ledger, history, seeds = folder / "seed.jsonl", {}, {}
            start = time.perf_counter()
            for key in CHECK_IDS:
                seeds[key] = capture(core, config, key, repo, seed_ledger, history, timeout)
            common_capture_seconds = time.perf_counter() - start
            write_json(folder / "initial-checks.json", seeds)
            if any(outcome(record) != "pass" for record in seeds.values()):
                # No successful starting evidence: keep the entire failed setup;
                # do not silently omit the episode and report a complete result.
                write_json(folder / "SETUP_FAILURE.json", {"reason": "Pristine checks did not all pass", "checks": seeds})
                write_json(output / "SUMMARY.json", {"status": "incomplete", "failed_episode": identifier, "completed_rows": rows})
                return 2
            if episode == "failed_then_restored":
                original, mutation = mutate_source(project, repo)
                start = time.perf_counter()
                failed = capture(core, config, "10-primary", repo, seed_ledger, history, timeout)
                common_capture_seconds += time.perf_counter() - start
                write_json(folder / "historical-failed-attempt.json", failed)
                (repo / project["source"]).write_bytes(original)
                mutation = {"kind": "failed-then-restored", **mutation, "restored_sha256": hashlib.sha256(original).hexdigest()}
                if outcome(failed) != "assertion_failure":
                    write_json(folder / "SETUP_FAILURE.json", {"reason": "Expected ordinary failure did not reproduce", "attempt": failed})
                    write_json(output / "SUMMARY.json", {"status": "incomplete", "failed_episode": identifier, "completed_rows": rows})
                    return 2
            else:
                mutation = ordinary_mutation(project, repo, episode)
            write_json(folder / "construction.json", {"episode": identifier, "synthetic_age_seconds": age, "mutation": mutation})
            pending = []
            # Rotation is frozen and independent of observed runtimes/results.
            offset = episode_index % len(METHODS)
            method_order = METHODS[offset:] + METHODS[:offset]
            for method in method_order:
                ledger = folder / (method + ".jsonl")
                shutil.copyfile(seed_ledger, ledger)
                method_history = deepcopy(history)
                started = time.perf_counter()
                if method == "active_context":
                    proposed = core.plan(config, repo, ledger, list(CLAIMS))
                    selected = proposed["selected_checks"]
                    before_states = proposed["checks"]
                else:
                    before_states = states(config, repo, method_history, method, age)
                    selected = select(config, before_states, CLAIMS, always=method == "rerun_all")
                    proposed = {"selected_checks": selected, "checks": before_states}
                executed = {}
                for key in selected:
                    executed[key] = capture(core, config, key, repo, ledger, method_history, timeout, current=True)
                if method == "active_context":
                    final_states = core.inspect(config, repo, ledger)["checks"]
                else:
                    final_states = states(config, repo, method_history, method, age)
                decision = classify(config, final_states, executed)
                continuation_seconds = time.perf_counter() - started
                row = {"episode": identifier, "project": project["id"], "method": method,
                       "selected_checks": selected, "before_states": before_states, "final_states": final_states,
                       "executed": executed, "decision": decision, "common_capture_seconds": common_capture_seconds,
                       "continuation_seconds": continuation_seconds, "total_seconds": common_capture_seconds + continuation_seconds}
                # Persist decisions before the held-back current full-rerun oracle.
                write_json(folder / (method + "-decision.json"), row)
                pending.append(row)
            oracle, oracle_history = {}, {}
            start = time.perf_counter()
            for key in CHECK_IDS:
                oracle[key] = capture(core, config, key, repo, folder / "oracle.jsonl", oracle_history, timeout, current=True)
            oracle_seconds = time.perf_counter() - start
            truth = oracle_decision(oracle)
            write_json(folder / "oracle.json", {"checks": oracle, "decision": truth, "evaluation_only_seconds": oracle_seconds})
            for row in pending:
                row["oracle_decision"] = truth
                row["false_verified_claims"] = [key for key in CHECK_IDS[1:] if row["final_states"][key]["reusable"] and outcome(oracle[key]) == "assertion_failure"]
                row["unsupported_verified_claims"] = [key for key in CHECK_IDS[1:] if row["final_states"][key]["reusable"] and outcome(oracle[key]) != "pass"]
                rows.append(row)
            write_json(folder / "scored-decisions.json", pending)
            write_json(output / "PROGRESS.json", {"completed_episodes": episode_index + 1, "expected_episodes": 30})
            print(identifier + ": recorded 4 policy decisions and independent full rerun", flush=True)
            episode_index += 1
    # A core or protocol edit during execution invalidates the run; retain all
    # collected records and fail instead of reporting a mixed-version result.
    verify_freeze(freeze_path)
    summary = {"schema_version": 1, "status": "completed", "completed_at": datetime.now(timezone.utc).isoformat(),
               "diagnostic": "30 constructed source continuations; no LLM; not an official upstream benchmark",
               **aggregate(rows), "limitations": json.loads((ROOT / "protocol.json").read_text(encoding="utf-8"))["limitations"]}
    write_json(output / "RESULTS.json", rows)
    write_json(output / "SUMMARY.json", summary)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--freeze", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--authorize-frozen-run", action="store_true", required=True)
    args = parser.parse_args()
    output_was_absent = not args.output.exists()
    try:
        raise SystemExit(run(args.output, args.freeze))
    except Exception as exc:
        if output_was_absent and args.output.resolve().is_relative_to(ROOT.resolve()) and args.output.is_dir():
            write_json(args.output / "RUN_ERROR.json", {"status": "incomplete", "type": type(exc).__name__,
                                                       "error": str(exc), "traceback": traceback.format_exc()})
        raise
