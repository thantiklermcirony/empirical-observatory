"""Independent conventional baselines; no Active Context imports here.

The baseline intentionally uses declared coverage, not discovered imports. Its
fingerprint implementation and latest-attempt/dependency decisions are separate
from the candidate. The execution/receipt recorder is common instrumentation.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys

METHODS = ("rerun_all", "content_dependency", "fixed_freshness", "active_context")
DEFAULT_ENV = ("PATH", "PYTHONPATH", "PYTHONHOME", "VIRTUAL_ENV", "LANG", "LC_ALL", "TZ")
TTL_SECONDS = 3600


def file_sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def fingerprint(check, repo):
    repo = Path(repo).resolve()
    members = {}
    for declared in check["scopes"]:
        scope = repo / declared
        pending = [scope]
        while pending:
            path = pending.pop()
            rel = path.relative_to(repo)
            if any(p in (".git", "__pycache__") for p in rel.parts):
                continue
            if path.is_symlink() or getattr(path, "is_junction", lambda: False)() or not path.resolve().is_relative_to(repo):
                raise ValueError("Unusable declared scope")
            if path.is_file():
                members[rel.as_posix()] = ["file", file_sha(path), path.stat().st_mode & 0o111]
            elif path.is_dir():
                members[rel.as_posix()] = ["directory"]
                pending.extend(sorted(path.iterdir(), reverse=True))
            elif not path.exists():
                members[rel.as_posix()] = ["missing"]
            else:
                raise ValueError("Unsupported scope type")
    argv = [sys.executable if item == "{python}" else item for item in check["argv"]]
    executable = Path(argv[0])
    if not executable.is_absolute():
        executable = (repo / executable) if len(executable.parts) > 1 else Path(shutil.which(argv[0]) or "")
    executable = executable.resolve()
    names = sorted(set(DEFAULT_ENV) | set(check.get("env", [])))
    environment = {name: [name in os.environ, hashlib.sha256(os.environ[name].encode()).hexdigest() if name in os.environ else None]
                   for name in names}
    facts = {"repo": str(repo), "files": members, "check": {k: v for k, v in check.items() if k != "cost"},
             "environment": environment, "executable": str(executable), "executable_sha256": file_sha(executable),
             "python": sys.version, "platform": sys.platform}
    return hashlib.sha256(json.dumps(facts, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def states(config, repo, history, method, age_seconds):
    """TTL and content baselines see the same latest attempts and dependencies."""
    checks = {item["id"]: item for item in config["checks"]}
    result = {}
    def visit(key):
        if key in result:
            return result[key]
        check = checks[key]
        parents = {p: visit(p) for p in check.get("depends_on", [])}
        record = history.get(key)
        reusable = bool(record and record["success"])
        reasons = []
        if not reusable:
            reasons.append("Latest attempt absent or unsuccessful")
        if record:
            if method == "content_dependency":
                if fingerprint(check, repo) != record["signature"]:
                    reusable = False
                    reasons.append("Declared content, definition, environment or runtime changed")
            elif method == "fixed_freshness":
                # New attempts during this continuation have age zero. Prior
                # receipts retain authentic clocks; only this explicit age is synthetic.
                effective_age = 0 if record.get("current_continuation") else age_seconds
                if effective_age > TTL_SECONDS:
                    reusable = False
                    reasons.append("Older than fixed freshness threshold")
            elif method != "rerun_all":
                raise ValueError("Unknown conventional method")
            for parent in parents:
                if not parents[parent]["reusable"] or record["dependencies"].get(parent) != history.get(parent, {}).get("event_hash"):
                    reusable = False
                    reasons.append("Prerequisite unavailable or changed")
        result[key] = {"reusable": reusable, "reasons": reasons}
        return result[key]
    for key in checks:
        visit(key)
    return result


def select(config, current_states, claims, always=False):
    """All required stale claim checks plus prerequisite closure, unique claims."""
    checks = {item["id"]: item for item in config["checks"]}
    claim_set = set(claims)
    selected = set()
    def include(key):
        if key in selected:
            return
        if always or not current_states[key]["reusable"]:
            selected.add(key)
            for parent in checks[key].get("depends_on", []):
                include(parent)
    for key, check in checks.items():
        if claim_set.intersection(check["claims"]):
            include(key)
    ordered = []
    def order(key):
        for parent in checks[key].get("depends_on", []):
            if parent in selected:
                order(parent)
        if key not in ordered:
            ordered.append(key)
    for key in sorted(selected):
        order(key)
    return ordered


def outcome(receipt):
    if receipt.get("timed_out") or receipt.get("execution_error") or receipt.get("snapshot_error") or not receipt.get("stable"):
        return "unresolved"
    if receipt.get("exit_code") == 0:
        return "pass"
    if receipt.get("exit_code") == 10:
        return "assertion_failure"
    return "unresolved"


def classify(config, current_states, executed):
    """Only declared ordinary assertion failures count as negative decisions."""
    if any(outcome(record) == "unresolved" for record in executed.values()):
        return "unresolved"
    if any(outcome(record) == "assertion_failure" for record in executed.values()):
        return "reject"
    if all(current_states[check["id"]]["reusable"] for check in config["checks"]):
        return "accept"
    return "unresolved"
