"""Run the actual orchestrator on synthetic Panels only; never call load_panel."""
import csv
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from datetime import datetime, timezone

import numpy as np

DIRECTORY = Path(__file__).resolve().parent
EXPERIMENT = DIRECTORY.parent / "experiment"
sys.path.insert(0, str(EXPERIMENT))
spec = importlib.util.spec_from_file_location("flight02_runner_under_review", EXPERIMENT / "run.py")
runner = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = runner
spec.loader.exec_module(runner)
from dataio import assigned_folds


def forbidden_loader(*args, **kwargs):
    raise AssertionError("The synthetic review must never call the real input loader")


runner.load_panel = forbidden_loader


def make_panel():
    rng = np.random.default_rng(21092026)
    contexts = np.asarray([f"synthetic-line-{n:02d}" for n in range(20)])
    treatments = np.asarray(["[('A', 0.05, 'uM')]", "[('A', 0.5, 'uM')]", "B ", "B", "C"])
    genes = np.asarray(["gene0", "gene1", "gene2"])
    control_features = np.asarray([f"covariate{n}" for n in range(7)])
    controls = rng.uniform(0, 4, (20, 7))
    y = rng.normal(0, 1, (20, 5, 3))
    observed = np.ones((20, 5), bool)
    observed[[0, 3, 9, 13], 0] = False
    observed[[4, 5, 18], 2] = False
    y[~observed] = np.nan
    folds = np.arange(20) // 4
    return runner.Panel(contexts, treatments, genes, y, observed, controls, control_features, folds,
                        {"dataset": "entirely synthetic fixture", "real_data": False})


def check_final_diagnostics_and_fold_assignment():
    cells = np.asarray(["a", "b", "c", "d"])
    assignment = {"10": ["b", "c"], "20": ["a", "d"]}
    np.testing.assert_array_equal(assigned_folds(cells, assignment, 2, 2), [20, 10, 10, 20])
    invalid_assignments = [
        {"10": ["a", "b"], "20": ["b", "d"]},
        {"10": ["a"], "20": ["b", "c", "d"]},
        {"10": ["a", "b"], "20": ["c", "unknown"]},
    ]
    for invalid in invalid_assignments:
        try:
            assigned_folds(cells, invalid, 2, 2)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid fold assignment accepted")
    scores = np.asarray([[0, 1, 1, 1], [0, 1, 1, 1]], float)
    result = {"source_support": np.asarray([4, 4, 3, 2]),
              "rank_scores": {"candidate": scores, "disagreement": scores}}
    controls = np.asarray([[0., 1.], [0., 2.]])
    observed = np.asarray([[True] * 4, [True, False, True, False]])
    diagnostic = runner.fit_diagnostics(result, controls, ["alpha", "beta"], observed)
    assert diagnostic["zero_source_control_variance_features"] == 1
    assert diagnostic["zero_source_response_variance_treatments"] == 1
    assert diagnostic["source_support_histogram"] == {2: 1, 3: 1, 4: 2}
    alpha = [row for row in diagnostic["exact_score_ties"] if row["context"] == "alpha"]
    beta = [row for row in diagnostic["exact_score_ties"] if row["context"] == "beta"]
    assert all(row["tie_crosses_75_percent_boundary"] for row in alpha)
    assert all(not row["tie_crosses_75_percent_boundary"] for row in beta)
    return {"arbitrary_integer_fold_labels_preserved": True,
            "invalid_fold_assignments_rejected": len(invalid_assignments),
            "source_only_diagnostics_and_tie_boundary": "PASS"}


def execute_with_save_boundary_check(panel, output):
    real_scorer = runner.line_curves
    checked_contexts = []

    def score_spy(prediction, ridge, truth, observed, scores, treatment_ids, context_id):
        position = int(np.flatnonzero(panel.contexts == context_id)[0])
        fold = int(panel.folds[position])
        manifest_path = output / f"fold-{fold}-prediction-manifest.json"
        assert manifest_path.is_file(), "Prediction manifest was not written before outer scoring"
        manifest = json.loads(manifest_path.read_text())
        assert manifest["prediction_saved_before_outer_scoring"] is True
        archive_path = output / f"fold-{fold}-predictions.npz"
        assert hashlib.sha256(archive_path.read_bytes()).hexdigest() == manifest["prediction_sha256"]
        with np.load(archive_path, allow_pickle=False) as archive:
            np.testing.assert_array_equal(archive["source_mean"], prediction)
            j = int(np.flatnonzero(archive["context_ids"] == context_id)[0])
            np.testing.assert_array_equal(archive["ridge_descriptive"][j], ridge)
            for name, array in scores.items():
                np.testing.assert_array_equal(archive[name][j], array)
        checked_contexts.append(str(context_id))
        return real_scorer(prediction, ridge, truth, observed, scores, treatment_ids, context_id)

    runner.line_curves = score_spy
    try:
        result = runner.execute(panel, output)
    finally:
        runner.line_curves = real_scorer
    assert sorted(checked_contexts) == panel.contexts.tolist()
    return result, checked_contexts


def audit_saved_masks(panel, output, summary):
    context_index = {c: i for i, c in enumerate(panel.contexts)}
    treatment_index = {t: i for i, t in enumerate(panel.treatments)}
    predictions = {}
    for fold in range(5):
        with np.load(output / f"fold-{fold}-predictions.npz", allow_pickle=False) as archive:
            predictions[fold] = archive["source_mean"].copy()
    line_losses = {}
    checked_rows = 0
    with gzip.open(output / "retained-masks.jsonl.gz", "rt", encoding="utf-8") as stream:
        for line in stream:
            row = json.loads(line)
            c = context_index[row["context"]]
            selected = [treatment_index[t] for t in row["treatments"]]
            assert all(panel.observed[c, d] for d in selected)
            assert len(selected) == len(set(selected)) == row["retained_count"]
            assert row["eligible_count"] == int(panel.observed[c].sum())
            assert row["actual_coverage"] == len(selected) / int(panel.observed[c].sum())
            mean = predictions[int(panel.folds[c])]
            # Deliberately scalar treatment/gene arithmetic, not pipeline.score_line.
            losses = [sum((float(mean[d, g]) - float(panel.y[c, d, g])) ** 2
                          for g in range(len(panel.genes))) / len(panel.genes) for d in selected]
            zero = [sum(float(panel.y[c, d, g]) ** 2 for g in range(len(panel.genes))) / len(panel.genes)
                    for d in selected]
            mean_risk, zero_risk = sum(losses) / len(losses), sum(zero) / len(zero)
            np.testing.assert_allclose(row["risk"]["mean"], mean_risk, rtol=1e-13)
            np.testing.assert_allclose(row["risk"]["zero"], zero_risk, rtol=1e-13)
            key = (row["context"], row["strategy"], str(row["coverage"]))
            line_losses.setdefault(key, []).append(mean_risk)
            checked_rows += 1
    for strategy, coverages in summary["overall_equal_line_mean_risk"].items():
        for coverage, actual in coverages.items():
            line_averages = []
            for context in panel.contexts:
                values = line_losses[(context, strategy, coverage)]
                line_averages.append(sum(values) / len(values))
            np.testing.assert_allclose(actual, sum(line_averages) / len(line_averages), rtol=1e-13)
    with (output / "per-pair.csv").open(newline="", encoding="utf-8") as stream:
        pair_rows = list(csv.DictReader(stream))
    assert len(pair_rows) == int(panel.observed.sum())
    pairs = {(r["context"], r["treatment"]) for r in pair_rows}
    assert len(pairs) == len(pair_rows)
    missing = json.loads((output / "missing-pairs.json").read_text())
    assert len(missing) == int((~panel.observed).sum())
    assert not any((r["context"], r["treatment"]) in pairs for r in missing)
    return {"retained_mask_rows_recomputed": checked_rows, "observed_pair_rows": len(pair_rows),
            "missing_pair_rows": len(missing)}


def main():
    final_additions = check_final_diagnostics_and_fold_assignment()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    baseline_path = DIRECTORY / f"synthetic-{stamp}-baseline"
    poison_path = DIRECTORY / f"synthetic-{stamp}-poison"
    panel = make_panel()
    baseline, boundary = execute_with_save_boundary_check(panel, baseline_path)
    mask_checks = audit_saved_masks(panel, baseline_path, baseline)
    poisoned = make_panel()
    # Poison only outer-fold-0 observations, preserving the observation mask.
    target_rows = (poisoned.folds == 0)[:, None] & poisoned.observed
    poisoned.y[target_rows] += 1e6
    _, other_boundary = execute_with_save_boundary_check(poisoned, poison_path)
    compared_arrays = []
    with np.load(baseline_path / "fold-0-predictions.npz", allow_pickle=False) as left:
        with np.load(poison_path / "fold-0-predictions.npz", allow_pickle=False) as right:
            assert left.files == right.files
            for field in left.files:
                np.testing.assert_array_equal(left[field], right[field])
                compared_arrays.append(field)
    left = json.loads((baseline_path / "fold-0-prediction-manifest.json").read_text())
    right = json.loads((poison_path / "fold-0-prediction-manifest.json").read_text())
    for field in ("source_contexts", "test_contexts", "tuning", "control_map", "source_bandwidth", "fit_diagnostics"):
        assert left[field] == right[field]
    report = {"passed": True, "real_response_values_read": False, "real_loader_disabled": True,
              "source_sha256": {name: hashlib.sha256((EXPERIMENT / name).read_bytes()).hexdigest()
                                for name in runner.SOURCE_FILES},
              "baseline_output": baseline_path.name, "poisoned_output": poison_path.name,
              "prediction_write_boundary_checks": len(boundary) + len(other_boundary),
              "outer_fold0_arrays_identical_after_outcome_poison": compared_arrays,
              "outer_fold0_tuning_and_control_map_unchanged": True,
              "final_diagnostics_and_fold_validation": final_additions,
              "independent_saved_mask_audit": mask_checks}
    (DIRECTORY / "RUNNER_CHECK_RESULTS.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
