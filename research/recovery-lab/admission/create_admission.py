"""Record the completed Recovery feasibility audit using today's real clock.

No measurement parsing, prediction, fitting, network, publication or deployment.
This admission remains blocked independently of any later descriptive model score.
"""

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
RECOVERY = HERE.parent
WORK = RECOVERY.parent
CORE_CANDIDATES = (WORK / "observatory-automation", RECOVERY.parent.parent / "automation" / "ledger")
CORE = next((path for path in CORE_CANDIDATES if (path / "observatory_ledger" / "__init__.py").is_file()), None)
if CORE is None:
    raise SystemExit("Ledger package not found. Keep workspace work/observatory-automation or repository automation/ledger beside research/recovery-lab.")
sys.path.insert(0, str(CORE))

from observatory_ledger import IntegrityError, Ledger, LedgerError
from observatory_ledger.ledger import utc_now
from observatory_ledger.recovery import admission_contract, record_preflight

COMMIT = "7ed5f4113e3c4d0cb8ccc256627efbb8d40c7269"
PROTOCOL_SHA = "3903f4f60182008fe15a864f3660526296d484013ecf84001cb8a5dbb7803325"
PREFLIGHT_SHA = "bdec6c15eb5b60152b4dc041f6937f134f4a6ef6f5a5efb3d959ec8a08574eef"
EXPERIMENT_ID = "recovery-lab-v1-feasibility-admission"
CANDIDATE_ID = "recovery-lab-v1-retrospective-proposal"


def write_json(name, value):
    (HERE / name).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def capture_document(ledger, path, source_id):
    raw = path.read_bytes()
    received = utc_now()
    digest = hashlib.sha256(raw).hexdigest()
    snapshot_id = source_id + "-" + digest
    try:
        metadata, old_raw = ledger.read_snapshot(snapshot_id)
        if old_raw != raw or metadata["source_id"] != source_id:
            raise LedgerError("Document snapshot identity conflict.")
    except LedgerError as exc:
        if isinstance(exc, IntegrityError) or str(exc) != "Unknown snapshot.":
            raise
        ledger.capture_snapshot(snapshot_id, raw, source_id=source_id, entity="recovery-lab-v1",
            event_at=received, received_at=received, published_at=None, source_version="sha256:" + digest,
            license="Project-generated research metadata; see attached source attribution.",
            quality=["already-observed-evidence", "local-receipt-only"],
            content_type="application/json" if path.suffix == ".json" else "text/markdown", kind="observation")
    return snapshot_id


def main():
    experiment = RECOVERY / "experiment"
    protocol = experiment / "protocol.json"
    publication_path = experiment / "FROZEN_PUBLICATION.json"
    publication = json.loads(publication_path.read_text(encoding="utf-8-sig"))
    if publication["commit"] != COMMIT or publication["url"] != "https://github.com/thantiklermcirony/empirical-observatory/commit/" + COMMIT:
        raise LedgerError("Unexpected reviewed public source pin.")
    for filename, expected in publication["source_sha256"].items():
        if Path(filename).name != filename or hashlib.sha256((experiment / filename).read_bytes()).hexdigest() != expected:
            raise LedgerError("Published source bytes differ: " + filename)
    if hashlib.sha256(protocol.read_bytes()).hexdigest() != PROTOCOL_SHA:
        raise LedgerError("Protocol differs from the independently reviewed freeze.")
    prior_path = RECOVERY / "data-audit" / "WINDOW_FEASIBILITY.json"
    historical = json.loads(prior_path.read_text(encoding="utf-8"))
    previous = next(w for w in historical["windows_examined"] if w["target_day"] == 7 and w["window"] == [5, 9])
    if previous["resolved"] != 3451 or historical["eligible_landmarks"] != 4104:
        raise LedgerError("Historical availability evidence differs from the disclosed inspection.")
    with Ledger(HERE / "ledger.sqlite") as ledger:
        contract = admission_contract(EXPERIMENT_ID, PROTOCOL_SHA)
        ledger.freeze_contract(contract)
        final = record_preflight(ledger, EXPERIMENT_ID, experiment / "preflight" / "PREFLIGHT.json", PREFLIGHT_SHA)
        if final["overall"]["resolved"] != 3445 or final["overall"]["landmarks"] != 4104:
            raise LedgerError("Final count differs from the independent reconciliation.")
        documents = [(protocol, "recovery-frozen-protocol"), (publication_path, "recovery-publication-record"),
                     (prior_path, "recovery-historical-availability"),
                     (RECOVERY / "independent-review" / "pipeline_checks" / "checks.json", "recovery-independent-synthetic-checks"),
                     (RECOVERY / "independent-review" / "pipeline_checks" / "count-reconciliation.json", "recovery-independent-count-checks"),
                     (RECOVERY / "independent-review" / "pipeline_checks" / "REVIEW.md", "recovery-independent-source-review")]
        evidence_ids = [final["snapshot_id"]] + [capture_document(ledger, path, source_id) for path, source_id in documents]
        ledger.propose_admission({"candidate_id": CANDIDATE_ID, "experiment_id": EXPERIMENT_ID,
            "description": "Retrospective feasibility admission of the publicly frozen Recovery Lab comparison. The endpoint resolution gate failed before fitting; subsequent numerical model results are descriptive and cannot override this failure.",
            "proposal_sha256": PROTOCOL_SHA, "evidence_snapshot_ids": evidence_ids, "evidence_timing": "already_observed"})
        assessed = ledger.assess_admission(CANDIDATE_ID)
        if assessed["payload"]["status"] != "blocked":
            raise LedgerError("Expected the known-failed admission to remain blocked.")
        export = ledger.export()
        for key in ("expected_issues", "predictions", "outcomes", "scores"):
            if export[key]:
                raise LedgerError("Evidence admission must not fabricate prediction or scoring rows.")
        verification = ledger.verify(export["integrity"]["head_sha256"])
        write_json("admission.json", export)
        write_json("integrity-check.json", verification)
        write_json("summary.json", {
            "schema": "observatory-recovery-admission/1", "kind": "evidence_admission", "mode": "retrospective",
            "status": "blocked", "public_time_attestation": False,
            "recorded_at": export["candidates"][0]["assessed_at"], "public_source_commit": COMMIT,
            "public_source_url": publication["url"], "protocol_sha256": PROTOCOL_SHA,
            "final_preflight_sha256": PREFLIGHT_SHA, "final_resolved": 3445, "eligible_landmarks": 4104,
            "final_fraction": 3445 / 4104, "historical_resolved": 3451, "historical_fraction": 3451 / 4104,
            "required_fraction": 0.90, "checks": export["checks"], "assessment": assessed["payload"],
            "forecast_rows": 0, "score_rows": 0, "head_sha256": verification["head_sha256"],
            "statement": "Current-time admission of already observed audit evidence. All six coverage gates failed; no prospective forecast, predictive success, model promotion or public time attestation is claimed."})
    files = [HERE / name for name in ("ledger.sqlite", "admission.json", "summary.json", "integrity-check.json", "create_admission.py")]
    write_json("manifest.json", {"created_at": datetime.now(timezone.utc).isoformat(),
        "files": [{"path": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in files],
        "core_files": [{"path": "observatory_ledger/" + path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
                       for path in sorted((CORE / "observatory_ledger").glob("*.py"))]})
    print(json.dumps({"status": "blocked", "final_fraction": 3445 / 4104, "forecast_rows": 0, "score_rows": 0,
                      "output": str(HERE / "summary.json")}, indent=2))


if __name__ == "__main__":
    main()
