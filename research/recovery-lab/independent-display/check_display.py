"""Read-only reconciliation of the Recovery Lab display export; no fitting."""
from __future__ import annotations

import ast
from collections import Counter, defaultdict
import csv
from datetime import date, datetime
import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT.parent / "empirical-observatory" if (ROOT.parent / "empirical-observatory").is_dir() else ROOT.parents[1]
OUT = Path(__file__).resolve().parent
NAMES = {
    "transition": "Transition frequencies", "current": "Current condition",
    "history": "Recent history", "duration": "History + duration",
    "duration_hgb": "Nonlinear history + duration", "candidate": "Added recovery history",
}
CLASSES = ("low", "high", "death_or_euthanasia")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_csv(path):
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def main():
    paths = {
        "export": SITE / "lib/data/recovery-lab.json",
        "exporter": ROOT / "export-release.py",
        "component": SITE / "components/observatory/RecoveryLab.tsx",
        "predictions": ROOT / "experiment/results/primary/predictions.csv",
        "visits": ROOT / "data-audit/derived/visits.csv",
        "summary": ROOT / "experiment/results/primary/summary.json",
    }
    evidence = read_json(paths["export"])
    predictions = read_csv(paths["predictions"])
    visits = read_csv(paths["visits"])
    summary = read_json(paths["summary"])
    # Read the published field-name tuple as data, without executing production code.
    tree = ast.parse((ROOT / "data-audit/adapter.py").read_text(encoding="utf-8"))
    ordinal = next(ast.literal_eval(node.value) for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "ORDINAL_FIELDS" for t in node.targets))
    assert len(ordinal) == 30
    by_animal, source_visits = defaultdict(list), defaultdict(list)
    for row in predictions:
        by_animal[row["animal_id"]].append(row)
    for row in visits:
        source_visits[row["animal_id"]].append(row)
    assert len(evidence["cases"]) == len(by_animal) == 214
    assert len({case["id"] for case in evidence["cases"]}) == 214
    assert evidence["classes"] == ["Below four severe-coded items", "Four or more", "Death / euthanasia"]
    labels, reasons, assessment_counts = Counter(), Counter(), Counter()
    cases_with_missing, ambiguous_low_points, unknown_cases, terminal_cases = [], [], [], []
    total_points = 0
    for case in evidence["cases"]:
        aid = case["id"]
        selected = sorted(by_animal[aid], key=lambda r: r["landmark_date"])[len(by_animal[aid]) // 2]
        seq = sorted(source_visits[aid], key=lambda r: r["collection_date"])
        origin = date.fromisoformat(seq[0]["collection_date"])
        cutoff = (date.fromisoformat(selected["landmark_date"]) - origin).days
        assert case["cutoffDay"] == cutoff
        assert case["targetDay"] == cutoff + 7
        assert case["cohort"] == selected["diet"] + " / held-out fold " + str(int(selected["fold"]) + 1)
        observed_day = (datetime.fromisoformat(selected["outcome_date"]).date() - origin).days if selected["outcome_date"] else None
        assert case["observedDay"] == observed_day
        label = int(selected["label"])
        labels[label] += 1
        reasons[selected["label_reason"]] += 1
        expected_text = {
            -1: "Unresolved: " + selected["label_reason"].replace("_", " "),
            0: "Observed below four severe-coded items",
            1: "Observed at least four severe-coded items",
            2: "Recorded death or euthanasia",
        }[label]
        assert case["observed"] == expected_text
        if label == -1:
            unknown_cases.append({"animal": aid, "reason": selected["label_reason"], "outcome_date_present": observed_day is not None})
        if label == 2:
            assert 0 < observed_day - cutoff <= 9
            terminal_cases.append(aid)
        elif label in (0, 1):
            assert 5 <= observed_day - cutoff <= 9
        expected_points = []
        incomplete = False
        for visit in seq:
            day = (date.fromisoformat(visit["collection_date"]) - origin).days
            if not cutoff - 60 <= day <= cutoff + 9:
                continue
            values = [float(visit[name]) for name in ordinal if visit[name] != ""]
            # Published dermatitis quarter-level conversion does not alter ==1 severe counts.
            severe = sum(value == 1 for value in values)
            assessed = len(values)
            assert severe == int(visit["severe_lower_bound"])
            assert assessed == int(visit["ordinal_observed"])
            expected_points.append({"day": day, "severe": severe, "assessed": assessed})
            assessment_counts[assessed] += 1
            incomplete |= assessed < 30
            if severe < 4 <= severe + 30 - assessed:
                ambiguous_low_points.append({"animal": aid, "day": day, "severe_lower_bound": severe, "missing": 30 - assessed})
        assert case["visits"] == expected_points
        assert any(point["day"] == cutoff for point in expected_points)
        total_points += len(expected_points)
        if incomplete:
            cases_with_missing.append(aid)
        assert [p["model"] for p in case["probabilities"]] == list(NAMES.values())
        for (model, name), probability in zip(NAMES.items(), case["probabilities"]):
            expected = [float(selected[model + "_p_" + cls]) for cls in CLASSES]
            assert probability["values"] == expected
            assert all(math.isfinite(value) and 0 <= value <= 1 for value in expected)
            assert math.isclose(sum(expected), 1, abs_tol=1e-12)
    for (model, name), result in zip(NAMES.items(), evidence["methods"]):
        assert result["name"] == name
        assert result["score"] == summary["models"][model]["brier"]
    assert evidence["gate"]["passed"] is False
    assert summary["coverage"]["overall"]["resolved"] == 3445
    assert summary["coverage"]["overall"]["landmarks"] == 4104
    assert "83.94%" in evidence["gate"]["detail"]
    assert "0.84%" in evidence["gate"]["detail"]
    audit = {
        "status": "PASSED exact data reconciliation; display wording findings reported separately",
        "scope": "Read-only verification against saved frozen outputs and measurements; no models run",
        "input_hashes": {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in paths.items()},
        "cases": 214, "median_selection": "Upper median chronological intended landmark, one per animal; no score/outcome filtering",
        "probability_values_verified": 214 * 6 * 3,
        "class_order": list(CLASSES), "date_origin": "First recorded assessment for each animal",
        "history_points_verified": total_points,
        "assessment_counts": dict(assessment_counts),
        "cases_with_incomplete_history_items": cases_with_missing,
        "ambiguous_low_bound_points": ambiguous_low_points,
        "displayed_label_counts": dict(labels), "displayed_label_reasons": dict(reasons),
        "unresolved_cases_retained": unknown_cases, "terminal_cases_retained": terminal_cases,
        "numeric_mismatches": 0,
    }
    (OUT / "AUDIT.json").write_text(json.dumps(audit, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({k: audit[k] for k in ("status", "cases", "probability_values_verified", "history_points_verified", "assessment_counts", "displayed_label_counts", "numeric_mismatches")}))
    print(json.dumps({"incomplete_cases": len(cases_with_missing), "ambiguous_low_bound_points": len(ambiguous_low_points), "unknown_cases": len(unknown_cases)}))


if __name__ == "__main__":
    main()
