"""Transactional local records with replayable scientific bookkeeping.

Hashes and local timestamps do not establish public time attestation. SQLite is
not tamper-proof: a trusted checkpoint is necessary to detect complete rewrites
or deletion of a valid suffix. This module deliberately contains no network code.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

SCHEMA = "observatory-ledger/1"
ZERO = "0" * 64
LIMIT_SLOTS = 100_000


class LedgerError(ValueError):
    """An operation violates the frozen contract or record chronology."""


class IntegrityError(LedgerError):
    """Stored bytes, their links, or their meaning fail verification."""


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def utc_now() -> str:
    return stamp(datetime.now(timezone.utc))


def instant(value: str) -> datetime:
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError, TypeError) as exc:
        raise LedgerError("Timestamp must be an ISO 8601 string with timezone.") from exc
    if result.tzinfo is None:
        raise LedgerError("Naive timestamps are forbidden.")
    return result.astimezone(timezone.utc)


def stamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def exact(value: dict, required: set[str], optional: set[str] = frozenset()) -> None:
    if not isinstance(value, dict) or set(value) - required - optional or required - set(value):
        raise LedgerError(f"Expected fields {sorted(required)}; optional {sorted(optional)}.")


def name(value: Any) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 2000:
        raise LedgerError("Expected a nonempty string of at most 2000 characters.")
    return value


def sha(value: Any) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
        raise LedgerError("Expected a lowercase SHA-256 hex digest.")
    return value


def number(value: Any, minimum: float | None = None) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise LedgerError("Expected a finite number.")
    if minimum is not None and value < minimum:
        raise LedgerError(f"Expected a number >= {minimum}.")
    return float(value)


def positive_int(value: Any, minimum: int = 1) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise LedgerError(f"Expected an integer >= {minimum}.")
    return value


def unique_names(values: Any) -> None:
    if not isinstance(values, list) or not values:
        raise LedgerError("Expected a nonempty list.")
    for value in values:
        name(value)
    if len(set(values)) != len(values):
        raise LedgerError("Duplicate list entries.")


def model_spec(model: dict) -> None:
    exact(model, {"id", "version", "code_sha256", "artifact_sha256", "role"})
    name(model["id"])
    name(model["version"])
    sha(model["code_sha256"])
    sha(model["artifact_sha256"])
    if model["role"] not in {"baseline", "candidate"}:
        raise LedgerError("Model role must be baseline or candidate.")


def slots(contract: dict) -> list[dict]:
    schedule = contract["schedule"]
    start, end = instant(schedule["start_at"]), instant(schedule["end_at"])
    count = math.ceil((end - start).total_seconds() / schedule["cadence_seconds"])
    if count <= 0 or count * len(schedule["entities"]) > LIMIT_SLOTS:
        raise LedgerError("Schedule must contain 1..100000 issue slots.")
    result = []
    for i in range(count):
        cutoff = start + timedelta(seconds=i * schedule["cadence_seconds"])
        for entity in schedule["entities"]:
            slot_id = digest([contract["experiment_id"], entity, stamp(cutoff)])
            result.append({
                "slot_id": slot_id, "experiment_id": contract["experiment_id"],
                "entity": entity, "cutoff_at": stamp(cutoff),
                "issue_deadline": stamp(cutoff + timedelta(seconds=schedule["issue_grace_seconds"])),
                "target_at": stamp(cutoff + timedelta(seconds=contract["horizon_seconds"])),
            })
    return result


def validate_contract(contract: dict, recorded_at: str) -> None:
    if contract.get("kind") == "evidence_admission":
        exact(contract, {"kind", "experiment_id", "domain", "mode", "target", "scope", "protocol_sha256", "required_checks"})
        for key in ("experiment_id", "domain", "target", "scope"):
            name(contract[key])
        sha(contract["protocol_sha256"])
        if contract["mode"] not in {"retrospective", "synthetic"}:
            raise LedgerError("Evidence admission is retrospective or synthetic, never a prospective forecast.")
        validate_checks(contract["required_checks"])
        if not contract["required_checks"]:
            raise LedgerError("Evidence admission requires at least one frozen check.")
        return
    exact(contract, {"experiment_id", "domain", "mode", "target", "units", "horizon_seconds",
                     "outcome_delay_seconds", "metric", "models", "allowed_source_ids",
                     "outcome_source_id", "schedule", "eligibility_rule", "revision_rule", "gate_rule"},
          {"labels", "required_checks"})
    for key in ("experiment_id", "domain", "target", "units", "outcome_source_id", "eligibility_rule", "gate_rule"):
        name(contract[key])
    if contract["mode"] not in {"synthetic", "replay", "prospective"}:
        raise LedgerError("Unsupported experiment mode.")
    if contract["revision_rule"] != "first_eligible_observation":
        raise LedgerError("Only first_eligible_observation scoring is implemented; revisions remain snapshots.")
    positive_int(contract["horizon_seconds"])
    positive_int(contract["outcome_delay_seconds"], 0)
    if contract["metric"] not in {"mse", "mae", "brier", "multiclass_brier", "log_loss"}:
        raise LedgerError("Unsupported scoring rule.")
    if contract["metric"] in {"multiclass_brier", "log_loss"}:
        unique_names(contract.get("labels"))
        if len(contract["labels"]) < 2:
            raise LedgerError("Categorical targets need at least two labels.")
    elif "labels" in contract:
        raise LedgerError("Labels are only valid for categorical metrics.")
    unique_names(contract["allowed_source_ids"])
    validate_checks(contract.get("required_checks", []))
    if not isinstance(contract["models"], list) or not contract["models"]:
        raise LedgerError("At least one frozen model is required.")
    for model in contract["models"]:
        model_spec(model)
    if len({m["id"] for m in contract["models"]}) != len(contract["models"]):
        raise LedgerError("Model IDs must be unique.")
    schedule = contract["schedule"]
    exact(schedule, {"start_at", "end_at", "cadence_seconds", "issue_grace_seconds", "entities"})
    positive_int(schedule["cadence_seconds"])
    positive_int(schedule["issue_grace_seconds"], 0)
    if schedule["issue_grace_seconds"] >= contract["horizon_seconds"]:
        raise LedgerError("Issuance must close before the target time.")
    unique_names(schedule["entities"])
    if instant(recorded_at) > instant(schedule["start_at"]):
        raise LedgerError("Freeze the contract before its first issue cutoff; replay must use an explicit replay clock.")
    slots(contract)


def validate_checks(checks: list) -> None:
    if not isinstance(checks, list):
        raise LedgerError("Required checks must be a list.")
    for check in checks:
        exact(check, {"id", "metric", "comparison", "threshold", "evidence_source_id"})
        for key in ("id", "metric", "evidence_source_id"):
            name(check[key])
        if check["comparison"] not in {"ge", "le"}:
            raise LedgerError("Check comparison must be ge or le.")
        number(check["threshold"])
    if len({c["id"] for c in checks}) != len(checks):
        raise LedgerError("Required check IDs must be unique.")


def prediction_value(contract: dict, value: Any) -> None:
    if contract["metric"] in {"multiclass_brier", "log_loss"}:
        if not isinstance(value, dict) or set(value) != set(contract["labels"]):
            raise LedgerError("Prediction must contain exactly the frozen categorical labels.")
        for p in value.values():
            if not 0 <= number(p) <= 1:
                raise LedgerError("Probabilities must be in [0, 1].")
        if abs(sum(value.values()) - 1) > 1e-10:
            raise LedgerError("Probabilities must sum to one.")
        if contract["metric"] == "log_loss" and any(p <= 0 for p in value.values()):
            raise LedgerError("Log-loss predictions need strictly positive probabilities; no implicit clipping.")
    else:
        value = number(value)
        if contract["metric"] == "brier" and not 0 <= value <= 1:
            raise LedgerError("Brier predictions must be probabilities.")


def outcome_value(contract: dict, value: Any) -> None:
    if contract["metric"] in {"multiclass_brier", "log_loss"}:
        if not isinstance(value, str) or value not in contract["labels"]:
            raise LedgerError("Unknown outcome label.")
    else:
        number(value)
        if contract["metric"] == "brier" and value not in (0, 1):
            raise LedgerError("Binary outcomes must be 0 or 1.")


def loss(contract: dict, prediction: Any, truth: Any) -> float:
    metric = contract["metric"]
    if metric == "mae":
        result = abs(prediction - truth)
    elif metric in {"mse", "brier"}:
        result = (prediction - truth) ** 2
    elif metric == "multiclass_brier":
        result = sum((p - int(label == truth)) ** 2 for label, p in prediction.items())
    else:
        result = -math.log(prediction[truth])
    return number(result, 0)


def empty_state() -> dict:
    return {k: {} for k in ("contracts", "slots", "snapshots", "predictions", "failures", "outcomes", "scores", "checks", "candidates")}


def pair(slot_id: str, model_id: str) -> str:
    return digest([slot_id, model_id])


def find_slot(state: dict, slot_id: str) -> tuple[dict, dict]:
    if slot_id not in state["slots"]:
        raise LedgerError("Unknown expected issue slot.")
    slot = state["slots"][slot_id]
    return slot, state["contracts"][slot["experiment_id"]]


def find_model(contract: dict, model_id: str) -> dict:
    for model in contract["models"]:
        if model["id"] == model_id:
            return model
    raise LedgerError("Model is not in the frozen experiment.")


def candidate_summary(state: dict, candidate: dict, recorded_at: str) -> dict:
    plan = candidate["test_plan"]
    contract = state["contracts"][candidate["experiment_id"]]
    deadline = instant(plan["end_at"]) + timedelta(seconds=contract["horizon_seconds"] + contract["outcome_delay_seconds"])
    if instant(recorded_at) < deadline:
        raise LedgerError("Candidate evaluation period and outcome delay have not elapsed.")
    selected = [s for s in state["slots"].values() if s["experiment_id"] == candidate["experiment_id"]
                and instant(plan["start_at"]) <= instant(s["cutoff_at"]) < instant(plan["end_at"])]
    paired = []
    for slot in selected:
        a = state["scores"].get(pair(slot["slot_id"], candidate["candidate_model_id"]))
        b = state["scores"].get(pair(slot["slot_id"], candidate["baseline_model_id"]))
        if a is not None and b is not None:
            paired.append({"slot_id": slot["slot_id"], "candidate_loss": a["loss"], "baseline_loss": b["loss"]})
    failure_fraction = 1 - len(paired) / len(selected)
    a_mean = sum(p["candidate_loss"] for p in paired) / len(paired) if paired else None
    b_mean = sum(p["baseline_loss"] for p in paired) / len(paired) if paired else None
    improvement = (b_mean - a_mean) / b_mean if b_mean is not None and b_mean > 0 else None
    admission = []
    for check in contract.get("required_checks", []):
        observed = state["checks"].get(pair(contract["experiment_id"], check["id"]))
        admission.append({"check_id": check["id"], "status": "missing" if observed is None else "passed" if observed["passed"] else "failed"})
    return {"expected_pairs": len(selected), "resolved_pairs": len(paired),
            "unpaired_fraction": failure_fraction, "candidate_mean_loss": a_mean,
            "baseline_mean_loss": b_mean, "relative_improvement": improvement,
            "paired_scores_sha256": digest(paired), "admission_checks": admission,
            "passed": len(paired) >= plan["minimum_pairs"] and failure_fraction <= plan["maximum_unpaired_fraction"]
            and improvement is not None and improvement >= plan["minimum_relative_improvement"]
            and all(c["status"] == "passed" for c in admission)}


def apply_event(state: dict, kind: str, p: dict, recorded_at: str) -> None:
    """Replay the same validation rules used before every append."""
    now = instant(recorded_at)
    if kind == "contract_frozen":
        validate_contract(p, recorded_at)
        if p["experiment_id"] in state["contracts"]:
            raise LedgerError("Experiment contract is already frozen.")
        state["contracts"][p["experiment_id"]] = p
        if p.get("kind") != "evidence_admission":
            state["slots"].update({s["slot_id"]: s for s in slots(p)})
    elif kind == "snapshot_captured":
        exact(p, {"snapshot_id", "source_id", "entity", "event_at", "received_at", "published_at",
                  "source_version", "license", "quality", "raw_sha256", "content_type", "kind"})
        for key in ("snapshot_id", "source_id", "entity", "source_version", "license", "content_type"):
            name(p[key])
        sha(p["raw_sha256"])
        instant(p["event_at"])
        if instant(p["received_at"]) > now:
            raise LedgerError("Receipt cannot be in the recorder's future.")
        if p["published_at"] is not None and instant(p["published_at"]) > instant(p["received_at"]):
            raise LedgerError("Publication cannot be later than receipt.")
        if p["kind"] not in {"observation", "forecast", "outcome"}:
            raise LedgerError("Unknown snapshot kind.")
        if not isinstance(p["quality"], list) or any(not isinstance(x, str) for x in p["quality"]):
            raise LedgerError("Quality flags must be a list of strings.")
        if p["snapshot_id"] in state["snapshots"]:
            raise LedgerError("Snapshot identity is immutable.")
        state["snapshots"][p["snapshot_id"]] = {**p, "recorded_at": recorded_at}
    elif kind in {"prediction_issued", "issue_failed"}:
        required = {"slot_id", "model_id", "reason"} if kind == "issue_failed" else {
            "slot_id", "model_id", "model_version", "model_code_sha256", "model_artifact_sha256",
            "input_snapshot_ids", "feature_sha256", "value", "compute_ms", "experiment_id",
            "entity", "cutoff_at", "target_at", "horizon_seconds"}
        exact(p, required)
        slot, contract = find_slot(state, p["slot_id"])
        model = find_model(contract, p["model_id"])
        key = pair(p["slot_id"], p["model_id"])
        if key in state["predictions"] or key in state["failures"]:
            raise LedgerError("Expected model/slot already has a result.")
        if now < instant(slot["cutoff_at"]):
            raise LedgerError("Cannot issue or fail a slot before its cutoff.")
        if kind == "issue_failed":
            name(p["reason"])
            state["failures"][key] = {**p, "recorded_at": recorded_at}
            return
        if now > instant(slot["issue_deadline"]):
            raise LedgerError("Prediction missed its frozen issue deadline; record a failure.")
        if any(p[field] != slot[field] for field in ("experiment_id", "entity", "cutoff_at", "target_at")) or p["horizon_seconds"] != contract["horizon_seconds"]:
            raise LedgerError("Prediction target and cutoff differ from the frozen slot.")
        if (p["model_version"], p["model_code_sha256"], p["model_artifact_sha256"]) != (
                model["version"], model["code_sha256"], model["artifact_sha256"]):
            raise LedgerError("Prediction model differs from the frozen model.")
        sha(p["feature_sha256"])
        number(p["compute_ms"], 0)
        prediction_value(contract, p["value"])
        unique_names(p["input_snapshot_ids"])
        for snapshot_id in p["input_snapshot_ids"]:
            source = state["snapshots"].get(snapshot_id)
            if source is None or source["source_id"] not in contract["allowed_source_ids"]:
                raise LedgerError("Prediction input source is absent or not allowed.")
            if source["entity"] not in {slot["entity"], "*"}:
                raise LedgerError("Prediction input belongs to another entity.")
            if max(instant(source["received_at"]), instant(source["recorded_at"])) > instant(slot["cutoff_at"]):
                raise LedgerError("Prediction input was unavailable at cutoff (receipt AND ingestion are checked).")
            if source["kind"] != "forecast" and instant(source["event_at"]) > instant(slot["cutoff_at"]):
                raise LedgerError("A future observation is not an available predictor input.")
        state["predictions"][key] = {**p, "recorded_at": recorded_at}
    elif kind == "outcome_resolved":
        exact(p, {"slot_id", "snapshot_id", "value"})
        slot, contract = find_slot(state, p["slot_id"])
        if p["slot_id"] in state["outcomes"]:
            raise LedgerError("The first eligible outcome is already frozen.")
        source = state["snapshots"].get(p["snapshot_id"])
        if source is None or source["source_id"] != contract["outcome_source_id"] or source["kind"] != "outcome":
            raise LedgerError("Outcome needs a captured snapshot from its declared outcome source.")
        if source["entity"] != slot["entity"] or instant(source["event_at"]) != instant(slot["target_at"]):
            raise LedgerError("Outcome entity and event time must match the declared target.")
        mature = instant(slot["target_at"]) + timedelta(seconds=contract["outcome_delay_seconds"])
        if now < mature or instant(source["received_at"]) < mature:
            raise LedgerError("Delayed truth is not eligible before target plus outcome delay.")
        eligible = [s for s in state["snapshots"].values()
                    if s["source_id"] == contract["outcome_source_id"] and s["kind"] == "outcome"
                    and s["entity"] == slot["entity"] and instant(s["event_at"]) == instant(slot["target_at"])
                    and instant(s["received_at"]) >= mature]
        # Dict order is replay/insertion order, breaking equal receipt-time ties.
        first = min(eligible, key=lambda s: (instant(s["received_at"]), instant(s["recorded_at"])))
        if first["snapshot_id"] != p["snapshot_id"]:
            raise LedgerError("Outcome must use the first eligible captured vintage, not a later revision.")
        outcome_value(contract, p["value"])
        state["outcomes"][p["slot_id"]] = {**p, "recorded_at": recorded_at}
    elif kind == "score_computed":
        exact(p, {"slot_id", "model_id", "metric", "loss"})
        _, contract = find_slot(state, p["slot_id"])
        key = pair(p["slot_id"], p["model_id"])
        prediction, truth = state["predictions"].get(key), state["outcomes"].get(p["slot_id"])
        if prediction is None or truth is None or key in state["scores"]:
            raise LedgerError("Score needs an unscored prediction and a resolved outcome.")
        expected = loss(contract, prediction["value"], truth["value"])
        if p["metric"] != contract["metric"] or number(p["loss"], 0) != expected:
            raise LedgerError("Score disagrees with the frozen metric and records.")
        state["scores"][key] = {**p, "recorded_at": recorded_at}
    elif kind == "prerequisite_checked":
        exact(p, {"experiment_id", "check_id", "observed_value", "evidence_snapshot_ids", "passed"})
        contract = state["contracts"].get(p["experiment_id"])
        if contract is None:
            raise LedgerError("Unknown prerequisite experiment.")
        check = next((c for c in contract.get("required_checks", []) if c["id"] == p["check_id"]), None)
        key = pair(p["experiment_id"], p["check_id"])
        if check is None or key in state["checks"]:
            raise LedgerError("Prerequisite is undeclared or already assessed.")
        number(p["observed_value"])
        unique_names(p["evidence_snapshot_ids"])
        for snapshot_id in p["evidence_snapshot_ids"]:
            evidence = state["snapshots"].get(snapshot_id)
            if evidence is None or evidence["source_id"] != check["evidence_source_id"]:
                raise LedgerError("Prerequisite evidence is absent or from an undeclared source.")
        expected = p["observed_value"] >= check["threshold"] if check["comparison"] == "ge" else p["observed_value"] <= check["threshold"]
        if not isinstance(p["passed"], bool) or p["passed"] != expected:
            raise LedgerError("Prerequisite verdict disagrees with the frozen threshold.")
        state["checks"][key] = {**p, "recorded_at": recorded_at}
    elif kind == "admission_proposed":
        exact(p, {"candidate_id", "experiment_id", "description", "proposal_sha256", "evidence_snapshot_ids", "evidence_timing"})
        name(p["candidate_id"])
        name(p["description"])
        sha(p["proposal_sha256"])
        contract = state["contracts"].get(p["experiment_id"])
        if contract is None or contract.get("kind") != "evidence_admission" or p["candidate_id"] in state["candidates"]:
            raise LedgerError("Admission proposal needs its own check-only contract and a new identity.")
        if p["proposal_sha256"] != contract["protocol_sha256"] or p["evidence_timing"] != "already_observed":
            raise LedgerError("Admission must bind its frozen protocol and disclose already observed evidence.")
        unique_names(p["evidence_snapshot_ids"])
        if any(s not in state["snapshots"] for s in p["evidence_snapshot_ids"]):
            raise LedgerError("Admission proposal references absent evidence.")
        state["candidates"][p["candidate_id"]] = {**p, "state": "proposed", "admission_only": True, "proposed_at": recorded_at}
    elif kind == "admission_assessed":
        exact(p, {"candidate_id", "checks", "status"})
        candidate = state["candidates"].get(p["candidate_id"])
        if candidate is None or not candidate.get("admission_only") or candidate["state"] != "proposed":
            raise LedgerError("Admission assessment needs an unassessed check-only proposal.")
        expected = admission_summary(state, candidate)
        if p != {"candidate_id": p["candidate_id"], **expected}:
            raise LedgerError("Admission assessment disagrees with frozen prerequisite evidence.")
        candidate.update(state=p["status"], assessment=p, assessed_at=recorded_at)
    elif kind == "candidate_proposed":
        exact(p, {"candidate_id", "experiment_id", "candidate_model_id", "baseline_model_id", "description", "test_plan"})
        name(p["candidate_id"])
        name(p["description"])
        if p["candidate_id"] in state["candidates"] or p["experiment_id"] not in state["contracts"]:
            raise LedgerError("Candidate exists or experiment is unknown.")
        contract = state["contracts"][p["experiment_id"]]
        if contract.get("kind") == "evidence_admission":
            raise LedgerError("Use propose_admission for check-only evidence; no forecast model is claimed.")
        if find_model(contract, p["candidate_model_id"])["role"] != "candidate" or find_model(contract, p["baseline_model_id"])["role"] != "baseline":
            raise LedgerError("Candidate and baseline roles must match the frozen models.")
        plan = p["test_plan"]
        exact(plan, {"start_at", "end_at", "minimum_pairs", "minimum_relative_improvement", "maximum_unpaired_fraction"})
        start, end = instant(plan["start_at"]), instant(plan["end_at"])
        if not now <= start < end or start < instant(contract["schedule"]["start_at"]) or end > instant(contract["schedule"]["end_at"]):
            raise LedgerError("Candidate test must be frozen before an eligible future evaluation period.")
        positive_int(plan["minimum_pairs"])
        number(plan["minimum_relative_improvement"], 0)
        if not 0 <= number(plan["maximum_unpaired_fraction"]) <= 1:
            raise LedgerError("Unpaired fraction must be in [0, 1].")
        if not any(start <= instant(s["cutoff_at"]) < end for s in slots(contract)):
            raise LedgerError("Candidate test contains no expected slots.")
        state["candidates"][p["candidate_id"]] = {**p, "state": "proposed", "proposed_at": recorded_at}
    elif kind in {"candidate_tested", "candidate_reviewed", "candidate_promoted"}:
        candidate = state["candidates"].get(p.get("candidate_id"))
        if candidate is None:
            raise LedgerError("Unknown candidate.")
        if candidate.get("admission_only"):
            raise LedgerError("Check-only admission cannot be predictively tested, reviewed for model promotion, or promoted.")
        if kind == "candidate_tested":
            exact(p, {"candidate_id", "summary"})
            if candidate["state"] != "proposed" or p["summary"] != candidate_summary(state, candidate, recorded_at):
                raise LedgerError("Test summary must match ledger evidence and a proposed candidate.")
            candidate.update(state="tested", test_summary=p["summary"], tested_at=recorded_at)
        elif kind == "candidate_reviewed":
            exact(p, {"candidate_id", "decision", "reviewer", "reason"})
            name(p["reviewer"])
            name(p["reason"])
            if candidate["state"] != "tested" or p["decision"] not in {"approve", "reject"}:
                raise LedgerError("Review needs a tested candidate and explicit approve/reject decision.")
            if p["decision"] == "approve" and not candidate["test_summary"]["passed"]:
                raise LedgerError("A failed frozen gate cannot be approved for promotion.")
            candidate.update(state="reviewed", review=p, reviewed_at=recorded_at)
        else:
            exact(p, {"candidate_id", "operator", "approval"})
            name(p["operator"])
            if candidate["state"] != "reviewed" or candidate["review"]["decision"] != "approve" or p["approval"] != f"PROMOTE {p['candidate_id']}":
                raise LedgerError("Promotion needs an approved review and explicit operator approval token.")
            candidate.update(state="promoted", promotion=p, promoted_at=recorded_at)
    else:
        raise LedgerError(f"Unknown event kind: {kind}")


def admission_summary(state: dict, candidate: dict) -> dict:
    contract = state["contracts"][candidate["experiment_id"]]
    checks = []
    for spec in contract["required_checks"]:
        observed = state["checks"].get(pair(contract["experiment_id"], spec["id"]))
        if observed is not None and not set(observed["evidence_snapshot_ids"]) <= set(candidate["evidence_snapshot_ids"]):
            raise LedgerError("Admission check evidence is not declared by this proposal.")
        checks.append({"check_id": spec["id"], "status": "missing" if observed is None else "passed" if observed["passed"] else "failed"})
    status = "blocked" if any(c["status"] == "failed" for c in checks) else "pending" if any(c["status"] == "missing" for c in checks) else "eligible_for_review"
    return {"checks": checks, "status": status}


class Ledger:
    """One local SQLite file; every write is validated under a transaction lock."""

    def __init__(self, path: str | Path, clock: Callable[[], str] = utc_now):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.clock = clock
        self.db = sqlite3.connect(str(self.path), timeout=30, isolation_level=None)
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS events (
                seq INTEGER PRIMARY KEY, event_id TEXT UNIQUE NOT NULL,
                kind TEXT NOT NULL, payload_json TEXT NOT NULL,
                recorded_at TEXT NOT NULL, prev_hash TEXT NOT NULL, event_hash TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS blobs (sha256 TEXT PRIMARY KEY, body BLOB NOT NULL);
        """)

    def close(self) -> None:
        self.db.close()

    def __enter__(self) -> Ledger:
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    def _read(self) -> tuple[dict, list[dict]]:
        state, records, previous, previous_time = empty_state(), [], ZERO, None
        try:
            for seq, event_id, kind, body, recorded_at, prev_hash, event_hash in self.db.execute(
                    "SELECT seq,event_id,kind,payload_json,recorded_at,prev_hash,event_hash FROM events ORDER BY seq"):
                payload = json.loads(body)
                row = {"seq": seq, "event_id": event_id, "kind": kind, "payload": payload,
                       "recorded_at": recorded_at, "prev_hash": prev_hash}
                if seq != len(records) + 1 or prev_hash != previous or digest(row) != event_hash or body != canonical(payload):
                    raise IntegrityError("Event chain, canonical bytes or sequence is corrupt.")
                if previous_time is not None and instant(recorded_at) < previous_time:
                    raise IntegrityError("Recorder time moved backwards.")
                if kind == "snapshot_captured":
                    blob = self.db.execute("SELECT body FROM blobs WHERE sha256=?", (payload["raw_sha256"],)).fetchone()
                    if blob is None or hashlib.sha256(blob[0]).hexdigest() != payload["raw_sha256"]:
                        raise IntegrityError("Snapshot raw payload is missing or corrupt.")
                apply_event(state, kind, payload, recorded_at)
                records.append({**row, "event_hash": event_hash})
                previous, previous_time = event_hash, instant(recorded_at)
        except (ValueError, KeyError, TypeError, OverflowError, sqlite3.DatabaseError) as exc:
            if isinstance(exc, IntegrityError):
                raise
            raise IntegrityError(f"Ledger replay failed: {exc}") from exc
        return state, records

    def verify(self, expected_head: str | None = None) -> dict:
        _, events = self._read()
        head = events[-1]["event_hash"] if events else ZERO
        if expected_head is not None and head != sha(expected_head):
            raise IntegrityError("Head differs from the caller's trusted checkpoint.")
        return {"schema": SCHEMA, "event_count": len(events), "head_sha256": head,
                "integrity": "verified_local_chain", "public_time_attestation": False}

    def _append(self, event_id: str, kind: str, payload: dict, raw: bytes | None = None) -> dict:
        name(event_id)
        # Detach caller-owned structures and reject nonfinite JSON before mutation.
        payload = json.loads(canonical(payload))
        self.db.execute("BEGIN IMMEDIATE")
        try:
            state, events = self._read()
            existing = next((e for e in events if e["event_id"] == event_id), None)
            if existing is not None:
                if existing["kind"] != kind or existing["payload"] != payload:
                    raise LedgerError("Idempotency identity reused with different content.")
                self.db.execute("COMMIT")
                return existing
            recorded_at = stamp(instant(self.clock()))
            if events and instant(recorded_at) < instant(events[-1]["recorded_at"]):
                raise LedgerError("Recorder clock moved backwards.")
            apply_event(state, kind, payload, recorded_at)
            if raw is not None:
                if hashlib.sha256(raw).hexdigest() != payload["raw_sha256"]:
                    raise LedgerError("Raw payload hash mismatch.")
                self.db.execute("INSERT OR IGNORE INTO blobs VALUES (?,?)", (payload["raw_sha256"], raw))
            row = {"seq": len(events) + 1, "event_id": event_id, "kind": kind, "payload": payload,
                   "recorded_at": recorded_at, "prev_hash": events[-1]["event_hash"] if events else ZERO}
            row["event_hash"] = digest(row)
            self.db.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?)", (
                row["seq"], event_id, kind, canonical(payload), recorded_at, row["prev_hash"], row["event_hash"]))
            self.db.execute("COMMIT")
            return row
        except BaseException:
            if self.db.in_transaction:
                self.db.execute("ROLLBACK")
            raise

    def freeze_contract(self, contract: dict) -> dict:
        return self._append("contract:" + name(contract.get("experiment_id")), "contract_frozen", contract)

    def capture_snapshot(self, snapshot_id: str, raw: bytes, **metadata: Any) -> dict:
        if not isinstance(raw, bytes):
            raise LedgerError("Raw payload must be bytes.")
        return self._append("snapshot:" + name(snapshot_id), "snapshot_captured", {
            **metadata, "snapshot_id": snapshot_id, "raw_sha256": hashlib.sha256(raw).hexdigest()}, raw)

    def expected_slots(self, experiment_id: str) -> list[dict]:
        state, _ = self._read()
        if experiment_id not in state["contracts"]:
            raise LedgerError("Unknown experiment.")
        return [s for s in state["slots"].values() if s["experiment_id"] == experiment_id]

    def read_snapshot(self, snapshot_id: str) -> tuple[dict, bytes]:
        state, _ = self._read()
        if snapshot_id not in state["snapshots"]:
            raise LedgerError("Unknown snapshot.")
        metadata = state["snapshots"][snapshot_id]
        raw = self.db.execute("SELECT body FROM blobs WHERE sha256=?", (metadata["raw_sha256"],)).fetchone()[0]
        return metadata, raw

    def issue_prediction(self, slot_id: str, model_id: str, value: Any,
                         input_snapshot_ids: list[str], feature_sha256: str, compute_ms: float = 0) -> dict:
        state, _ = self._read()
        slot, contract = find_slot(state, slot_id)
        model = find_model(contract, model_id)
        return self._append("prediction:" + pair(slot_id, model_id), "prediction_issued", {
            "slot_id": slot_id, "model_id": model_id, "model_version": model["version"],
            "experiment_id": contract["experiment_id"], "entity": slot["entity"],
            "cutoff_at": slot["cutoff_at"], "target_at": slot["target_at"], "horizon_seconds": contract["horizon_seconds"],
            "model_code_sha256": model["code_sha256"], "model_artifact_sha256": model["artifact_sha256"],
            "value": value, "input_snapshot_ids": input_snapshot_ids, "feature_sha256": feature_sha256, "compute_ms": compute_ms})

    def record_failure(self, slot_id: str, model_id: str, reason: str) -> dict:
        return self._append("failure:" + pair(slot_id, model_id), "issue_failed", {
            "slot_id": slot_id, "model_id": model_id, "reason": reason})

    def record_overdue_failures(self, experiment_id: str) -> list[dict]:
        state, _ = self._read()
        now, result = instant(self.clock()), []
        if experiment_id not in state["contracts"]:
            raise LedgerError("Unknown experiment.")
        for slot in self.expected_slots(experiment_id):
            if now <= instant(slot["issue_deadline"]):
                continue
            for model in state["contracts"][experiment_id]["models"]:
                key = pair(slot["slot_id"], model["id"])
                if key not in state["predictions"] and key not in state["failures"]:
                    result.append(self.record_failure(slot["slot_id"], model["id"], "issue_deadline_missed"))
        return result

    def resolve_outcome(self, slot_id: str, snapshot_id: str, value: Any) -> dict:
        return self._append("outcome:" + slot_id, "outcome_resolved", {"slot_id": slot_id, "snapshot_id": snapshot_id, "value": value})

    def score(self, slot_id: str, model_id: str) -> dict:
        state, _ = self._read()
        _, contract = find_slot(state, slot_id)
        key = pair(slot_id, model_id)
        if key not in state["predictions"] or slot_id not in state["outcomes"]:
            raise LedgerError("Cannot score before prediction and delayed truth exist.")
        return self._append("score:" + key, "score_computed", {"slot_id": slot_id, "model_id": model_id,
            "metric": contract["metric"], "loss": loss(contract, state["predictions"][key]["value"], state["outcomes"][slot_id]["value"])})

    def propose_candidate(self, proposal: dict) -> dict:
        return self._append("proposal:" + name(proposal.get("candidate_id")), "candidate_proposed", proposal)

    def propose_admission(self, proposal: dict) -> dict:
        return self._append("admission-proposal:" + name(proposal.get("candidate_id")), "admission_proposed", proposal)

    def assess_admission(self, candidate_id: str) -> dict:
        state, events = self._read()
        existing = next((e for e in events if e["event_id"] == "admission-assessment:" + candidate_id), None)
        if existing:
            return existing
        candidate = state["candidates"].get(candidate_id)
        if candidate is None or not candidate.get("admission_only"):
            raise LedgerError("Unknown check-only admission proposal.")
        return self._append("admission-assessment:" + candidate_id, "admission_assessed", {
            "candidate_id": candidate_id, **admission_summary(state, candidate)})

    def record_check(self, experiment_id: str, check_id: str, observed_value: float, evidence_snapshot_ids: list[str]) -> dict:
        state, _ = self._read()
        contract = state["contracts"].get(experiment_id)
        check = next((c for c in contract.get("required_checks", []) if c["id"] == check_id), None) if contract else None
        if check is None:
            raise LedgerError("Unknown frozen prerequisite check.")
        number(observed_value)
        passed = observed_value >= check["threshold"] if check["comparison"] == "ge" else observed_value <= check["threshold"]
        return self._append("check:" + pair(experiment_id, check_id), "prerequisite_checked", {
            "experiment_id": experiment_id, "check_id": check_id, "observed_value": observed_value,
            "evidence_snapshot_ids": evidence_snapshot_ids, "passed": passed})

    def test_candidate(self, candidate_id: str) -> dict:
        state, events = self._read()
        existing = next((e for e in events if e["event_id"] == "test:" + candidate_id), None)
        if existing:
            return existing
        if candidate_id not in state["candidates"]:
            raise LedgerError("Unknown candidate.")
        if state["candidates"][candidate_id].get("admission_only"):
            raise LedgerError("Check-only admission cannot claim a completed predictive test.")
        return self._append("test:" + candidate_id, "candidate_tested", {"candidate_id": candidate_id,
            "summary": candidate_summary(state, state["candidates"][candidate_id], self.clock())})

    def review_candidate(self, candidate_id: str, decision: str, reviewer: str, reason: str) -> dict:
        return self._append("review:" + candidate_id, "candidate_reviewed", {
            "candidate_id": candidate_id, "decision": decision, "reviewer": reviewer, "reason": reason})

    def promote_candidate(self, candidate_id: str, operator: str, approval: str) -> dict:
        return self._append("promotion:" + candidate_id, "candidate_promoted", {
            "candidate_id": candidate_id, "operator": operator, "approval": approval})

    def export(self) -> dict:
        state, events = self._read()
        now = instant(self.clock())
        expected = []
        for slot in state["slots"].values():
            contract = state["contracts"][slot["experiment_id"]]
            for model in contract["models"]:
                key = pair(slot["slot_id"], model["id"])
                status = ("scored" if key in state["scores"] else "awaiting_outcome_or_score" if key in state["predictions"]
                          else "failed" if key in state["failures"] else "overdue" if now > instant(slot["issue_deadline"]) else "scheduled")
                expected.append({**slot, "model_id": model["id"], "status": status})
        return {"schema": SCHEMA, "generated_at": stamp(now), "public_time_attestation": False,
                "time_claim": "Local recorder timestamps only; synthetic/replay modes are not prospective evidence.",
                "integrity": {"event_count": len(events), "head_sha256": events[-1]["event_hash"] if events else ZERO},
                "contracts": list(state["contracts"].values()), "expected_issues": expected,
                "snapshots": list(state["snapshots"].values()), "predictions": list(state["predictions"].values()),
                "failures": list(state["failures"].values()), "outcomes": list(state["outcomes"].values()),
                "scores": list(state["scores"].values()), "checks": list(state["checks"].values()),
                "candidates": list(state["candidates"].values()), "events": events}
