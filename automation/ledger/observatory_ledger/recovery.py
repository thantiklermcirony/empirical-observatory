"""Strict extraction of the frozen Recovery Lab feasibility audit.

This does not load mouse measurements, fit models, or create forecast rows.
The caller supplies a reviewed raw-file SHA, not a feasibility value. Extraction
checks arithmetic and partitions; truth of the upstream audit still needs review.
"""

import hashlib
import json
import math
from pathlib import Path

from .ledger import IntegrityError, Ledger, LedgerError, digest, number, positive_int, sha, utc_now

SOURCE_ID = "recovery-final-preflight"
EXPECTED_LANDMARKS = 4104


def required_checks() -> list[dict]:
    return [{"id": group + "_resolution", "metric": "resolved_label_fraction",
             "comparison": "ge", "threshold": 0.90, "evidence_source_id": SOURCE_ID}
            for group in ["overall", *[f"fold_{i}" for i in range(5)]]]


def admission_contract(experiment_id: str, protocol_sha256: str, mode: str = "retrospective") -> dict:
    return {"kind": "evidence_admission", "experiment_id": experiment_id, "domain": "recovery-lab",
            "mode": mode, "target": "Feasibility of the frozen nearest-day-7 observed-burden endpoint",
            "scope": "Retrospective evidence admission only; no forecast rows, completed model comparison, prospective timing or promotion claim.",
            "protocol_sha256": sha(protocol_sha256), "required_checks": required_checks()}


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise LedgerError(f"Duplicate audit JSON key: {key}")
        result[key] = value
    return result


def _bad_constant(value):
    raise LedgerError(f"Nonfinite audit JSON number: {value}")


def _counts(row: dict, name: str) -> dict:
    if not isinstance(row, dict):
        raise LedgerError(f"Missing audit count record: {name}")
    try:
        total = positive_int(row["landmarks"])
        resolved = positive_int(row["resolved"], 0)
        animals = positive_int(row["animals"])
        fraction = number(row["fraction"])
        if resolved > total or animals > total or not math.isclose(fraction, resolved / total, rel_tol=0, abs_tol=1e-12):
            raise LedgerError(f"Audit count/fraction disagreement: {name}")
        labels = row["label_counts"]
        if not isinstance(labels, dict) or set(labels) - {"-1", "0", "1", "2"}:
            raise LedgerError(f"Invalid audit labels: {name}")
        for value in labels.values():
            positive_int(value, 0)
        if sum(labels.values()) != total or sum(labels.get(str(k), 0) for k in range(3)) != resolved:
            raise LedgerError(f"Audit labels do not reconcile: {name}")
        reasons = row["reasons"]
        if not isinstance(reasons, dict) or not reasons:
            raise LedgerError(f"Missing audit reasons: {name}")
        for value in reasons.values():
            positive_int(value, 0)
        if sum(reasons.values()) != total:
            raise LedgerError(f"Audit reasons do not reconcile: {name}")
        return {"landmarks": total, "resolved": resolved, "animals": animals, "fraction": resolved / total}
    except KeyError as exc:
        raise LedgerError(f"Missing audit field in {name}: {exc}") from exc


def extract_preflight(raw: bytes) -> dict:
    """Read counts from exact audit bytes; no caller-supplied metric override."""
    try:
        audit = json.loads(raw.decode("utf-8-sig"), object_pairs_hook=_unique_object, parse_constant=_bad_constant)
        primary = audit["modes"]["primary"]
        overall = _counts(primary["overall"], "overall")
        if overall["landmarks"] != EXPECTED_LANDMARKS:
            raise LedgerError("This adapter is frozen to the 4104-landmark Recovery eligibility population.")
        if set(primary["by_fold"]) != {str(i) for i in range(5)}:
            raise LedgerError("Recovery admission requires all five declared folds.")
        groups = {}
        for partition in ("by_fold", "by_diet", "by_animal"):
            if not isinstance(primary[partition], dict) or not primary[partition]:
                raise LedgerError(f"Missing audit partition: {partition}")
            group = {key: _counts(row, partition + "/" + key) for key, row in primary[partition].items()}
            for field in ("landmarks", "resolved", "animals"):
                if sum(row[field] for row in group.values()) != overall[field]:
                    raise LedgerError(f"Audit partition does not reconcile {field}: {partition}")
            if partition == "by_animal" and any(row["animals"] != 1 for row in group.values()):
                raise LedgerError("Animal partition entries must describe one animal each.")
            groups[partition] = group
        observed = {"overall_resolution": overall["fraction"],
                    **{f"fold_{i}_resolution": groups["by_fold"][str(i)]["fraction"] for i in range(5)}}
        return {"overall": overall, "by_fold": groups["by_fold"], "observed_checks": observed,
                "scope": "Audit admission only; no predictions or model performance are inferred."}
    except (KeyError, TypeError, UnicodeError, json.JSONDecodeError) as exc:
        raise LedgerError(f"Unsupported Recovery preflight audit: {exc}") from exc


def record_preflight(ledger: Ledger, experiment_id: str, path: str | Path, expected_sha256: str) -> dict:
    """Capture pinned raw bytes, extract and record all six frozen coverage checks."""
    raw = Path(path).read_bytes()
    received_at = utc_now()
    raw_sha = hashlib.sha256(raw).hexdigest()
    if raw_sha != sha(expected_sha256):
        raise LedgerError("Recovery preflight raw hash differs from the reviewed artifact.")
    extracted = extract_preflight(raw)
    contract = next((c for c in ledger.export()["contracts"] if c["experiment_id"] == experiment_id), None)
    if contract is None or contract.get("kind") != "evidence_admission" or contract.get("domain") != "recovery-lab" or contract["required_checks"] != required_checks():
        raise LedgerError("Recovery adapter requires the exact frozen check-only contract and 90% gates.")
    snapshot_id = "recovery-preflight-" + raw_sha
    try:
        metadata, stored_raw = ledger.read_snapshot(snapshot_id)
        if stored_raw != raw or metadata["source_id"] != SOURCE_ID:
            raise LedgerError("Existing Recovery snapshot identity conflicts with pinned bytes/source.")
    except LedgerError as exc:
        if isinstance(exc, IntegrityError) or str(exc) != "Unknown snapshot.":
            raise
        ledger.capture_snapshot(snapshot_id, raw, source_id=SOURCE_ID, entity="DO-history-available-population",
                                event_at=received_at, received_at=received_at, published_at=None,
                                source_version="sha256:" + raw_sha,
                                license="Project-generated audit metadata; source attribution is retained in the audit release.",
                                quality=["retrospective-audit", "not-a-forecast"], content_type="application/json", kind="observation")
    for check_id, value in extracted["observed_checks"].items():
        ledger.record_check(experiment_id, check_id, value, [snapshot_id])
    return {"snapshot_id": snapshot_id, "raw_sha256": raw_sha, **extracted,
            "all_admission_checks_passed": all(v >= 0.90 for v in extracted["observed_checks"].values()),
            "public_time_attestation": False}
