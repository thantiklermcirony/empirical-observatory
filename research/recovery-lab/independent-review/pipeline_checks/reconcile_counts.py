"""Read only exported eligibility metadata; never fit a model or read predictors."""

import csv
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPERIMENT = ROOT / "experiment"
PREFLIGHT = EXPERIMENT / "preflight"
summary_path = PREFLIGHT / "PREFLIGHT.json"
summary = json.loads(summary_path.read_text(encoding="utf-8"))
old = json.loads((ROOT / "data-audit" / "WINDOW_FEASIBILITY.json").read_text(encoding="utf-8"))
checks = {}
identities = None
rows_by_mode = {}
for mode, expected in summary["modes"].items():
    path = PREFLIGHT / (mode + "_landmarks.csv")
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    rows_by_mode[mode] = rows
    ids = [(r["landmark_id"], r["fold"]) for r in rows]
    if identities is None:
        identities = ids
    assert identities == ids, "Sensitivities changed intended landmarks or folds"
    labels = Counter(r["label"] for r in rows)
    reasons = Counter(r["label_reason"] for r in rows)
    resolved = sum(int(r["label"]) >= 0 for r in rows)
    assert len(rows) == expected["overall"]["landmarks"] == 4104
    assert resolved == expected["overall"]["resolved"]
    assert dict(labels) == expected["overall"]["label_counts"]
    assert dict(reasons) == expected["overall"]["reasons"]
    assert len(set(r["animal_id"] for r in rows)) == expected["overall"]["animals"] == 214
    for fold in range(5):
        part = [r for r in rows if r["fold"] == str(fold)]
        assert len(part) == expected["by_fold"][str(fold)]["landmarks"]
        assert sum(int(r["label"]) >= 0 for r in part) == expected["by_fold"][str(fold)]["resolved"]
    checks[mode] = {"landmarks": len(rows), "animals": 214, "resolved": resolved,
                    "fraction": resolved / len(rows), "labels": dict(labels), "reasons": dict(reasons),
                    "csv_sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
historical = next(w for w in old["windows_examined"] if w["target_day"] == 7 and w["window"] == [5, 9])
assert historical["resolved"] == 3451
assert checks["primary"]["resolved"] == 3445
assert checks["primary"]["reasons"]["survival_through_day9_unestablished"] == 6
assert checks["primary"]["reasons"]["observed_burden"] + sum(v for k, v in checks["primary"]["reasons"].items() if k.startswith("terminal_")) == 3445
assert checks["primary"]["labels"]["-1"] == 659
result = {"passed": True, "scope": "Independent arithmetic from exported eligibility rows only; no models or prediction scores.",
          "preflight_sha256": hashlib.sha256(summary_path.read_bytes()).hexdigest(), "modes": checks,
          "historical_primary_resolved": 3451, "final_primary_resolved": 3445,
          "conservative_survival_delta": 6, "primary_gate_failed": True,
          "all_modes_same_intended_landmarks_and_folds": True}
target = Path(__file__).with_name("count-reconciliation.json")
target.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"passed": True, "primary": "3445/4104", "historical": "3451/4104", "modes": {k:v["resolved"] for k,v in checks.items()}}, indent=2))
