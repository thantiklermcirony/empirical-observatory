"""Read-only independent arithmetic audit; no model fit or production import."""
import csv
import gzip
import hashlib
import json
import math
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
import time

import numpy as np
import pyarrow.parquet as pq

HERE = Path(__file__).resolve().parent
FLIGHT = HERE.parent.parent
RESULTS = FLIGHT / "results"
EXPERIMENT = FLIGHT / "experiment"
RANKINGS = ("candidate", "disagreement", "treatment_risk", "magnitude", "random")
COVERAGES = (1.0, .9, .75, .5)
PREDICTORS = ("mean", "zero", "ridge_descriptive")


def read_json(path):
    return json.loads(path.read_text())


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def close(actual, expected, label, tolerance=1e-12):
    if not np.allclose(actual, expected, rtol=tolerance, atol=1e-16, equal_nan=False):
        raise AssertionError(f"Arithmetic mismatch: {label}")


def main():
    started = time.perf_counter()
    summary = read_json(RESULTS / "summary.json")
    run = read_json(RESULTS / "run-manifest.json")
    provenance = read_json(RESULTS / "input-provenance.json")
    freeze = read_json(EXPERIMENT / "FROZEN_EXECUTION.json")
    publication = read_json(FLIGHT / "FROZEN_PUBLICATION.json")
    selection = read_json(FLIGHT.parent / "virtual-cell-next" / "FROZEN_INPUT_SELECTION.json")
    assert run["status"] == "completed" and run["failure_count"] == 0
    checked_hashes = {}
    for name, expected in run["output_sha256"].items():
        actual = digest(RESULTS / name)
        assert actual == expected, f"Changed output: {name}"
        checked_hashes[name] = actual
    for name, expected in run["source_sha256"].items():
        assert digest(EXPERIMENT / name) == expected == freeze["source_sha256"][name] == publication["files"][name]
    for name, expected in freeze["independent_review_sha256"].items():
        assert digest(HERE.parent / name) == expected, f"Frozen review changed: {name}"
    assert provenance["freeze"] == freeze
    assert publication["exact_byte_match"] and not publication["plate1_numeric_response_evaluation_started"]
    assert freeze["frozen_at_utc"] < publication["verified_at_utc"] < run["created_at_utc"]
    input_paths = {"response": FLIGHT / "data-gate" / "plate_plate1.parquet",
                   "controls": FLIGHT.parent / "virtual-cell-next" / "controls-plate1.npz",
                   "selection": FLIGHT.parent / "virtual-cell-next" / "FROZEN_INPUT_SELECTION.json",
                   "preflight": FLIGHT / "data-gate" / "SCHEMA_PREFLIGHT.json"}
    for key, path in input_paths.items():
        assert digest(path) == provenance["input_hashes"][key], f"Input hash differs: {key}"
    # Actual outcomes are now authorized for audit. No fitting/tuning is called.
    frame = pq.read_table(input_paths["response"]).to_pandas()
    genes = sorted(c for c in frame.columns if c not in ("cell_line", "treatment"))
    matrix = frame.loc[:, genes].to_numpy(dtype=np.float64)
    assert np.isfinite(matrix).all()
    keys = list(frame[["cell_line", "treatment"]].itertuples(index=False, name=None))
    assert len(keys) == len(set(keys)) == 4443
    raw = {key: matrix[i] for i, key in enumerate(keys)}
    contexts = sorted(frame.cell_line.unique())
    treatments = sorted(frame.treatment.unique())
    assert (len(contexts), len(treatments), len(genes)) == (50, 92, 2000)
    folds = {c: int(fold) for fold, lines in selection["cell_folds"].items() for c in lines}
    observed = {c: {t for cell, t in keys if cell == c} for c in contexts}
    missing = read_json(RESULTS / "missing-pairs.json")
    missing_keys = {(r["context"], r["treatment"]) for r in missing}
    assert len(missing_keys) == len(missing) == 157
    assert missing_keys == {(c, t) for c in contexts for t in treatments} - set(keys)
    with (RESULTS / "per-pair.csv").open(newline="", encoding="utf-8") as stream:
        rows = list(csv.DictReader(stream))
    pair_table = {(r["context"], r["treatment"]): r for r in rows}
    assert len(pair_table) == len(rows) == 4443 and set(pair_table) == set(keys)
    numeric_names = [k for k in rows[0] if k not in ("context", "treatment")]
    assert all(math.isfinite(float(r[k])) for r in rows for k in numeric_names)
    losses, risk_scores, diagnostics, tuning = {}, {}, {}, {}
    max_pair_error = 0.0
    finite_prediction_values = 0
    for fold in range(5):
        manifest = read_json(RESULTS / f"fold-{fold}-prediction-manifest.json")
        expected_test = sorted(c for c in contexts if folds[c] == fold)
        expected_source = sorted(set(contexts) - set(expected_test))
        assert sorted(manifest["test_contexts"]) == expected_test
        assert sorted(manifest["source_contexts"]) == expected_source
        assert manifest["control_map"]["source_ids"] == expected_source
        assert manifest["prediction_saved_before_outer_scoring"]
        assert publication["verified_at_utc"] < manifest["prediction_saved_at_utc"] < run["created_at_utc"]
        assert manifest["prediction_sha256"] == checked_hashes[f"fold-{fold}-predictions.npz"]
        for inner in manifest["tuning"]["lines"]:
            validation = inner["validation_context"]
            expected_inner = sorted(c for c in expected_source if folds[c] != folds[validation])
            assert sorted(inner["source_contexts"]) == expected_inner
        diagnostics[str(fold)] = manifest["fit_diagnostics"]
        tuning[str(fold)] = manifest["tuning"]["selected"]
        with np.load(RESULTS / f"fold-{fold}-predictions.npz", allow_pickle=False) as archive:
            assert archive["context_ids"].tolist() == expected_test
            assert archive["treatment_ids"].tolist() == treatments
            assert archive["gene_ids"].tolist() == genes
            source_mean = archive["source_mean"]
            ridge = archive["ridge_descriptive"]
            assert source_mean.shape == (92, 2000) and ridge.shape == (10, 92, 2000)
            for name in archive.files:
                if archive[name].dtype.kind in "fiu":
                    assert np.isfinite(archive[name]).all(), f"Nonfinite archive value: {fold}/{name}"
                    finite_prediction_values += archive[name].size
            for d, treatment in enumerate(treatments):
                expected_support = sum((c, treatment) in raw for c in expected_source)
                assert int(archive["source_support"][d]) == expected_support
            for j, context in enumerate(expected_test):
                for d, treatment in enumerate(treatments):
                    if (context, treatment) not in raw:
                        continue
                    truth = raw[(context, treatment)]
                    actual = {"mean": float(np.mean(np.square(source_mean[d] - truth))),
                              "zero": float(np.mean(np.square(truth))),
                              "ridge_descriptive": float(np.mean(np.square(ridge[j, d] - truth)))}
                    losses[(context, treatment)] = actual
                    row = pair_table[(context, treatment)]
                    for predictor, value in actual.items():
                        close(float(row[predictor + "_mse"]), value, "per-pair " + predictor)
                        max_pair_error = max(max_pair_error, abs(float(row[predictor + "_mse"]) - value))
                    assert int(row["fold"]) == fold
                    assert int(row["source_lines"]) == int(archive["source_support"][d])
                    neff = float(archive["effective_support"][j, d])
                    close(float(row["effective_source_lines"]), neff, "effective support")
                    assert 1 - 1e-12 <= neff <= int(row["source_lines"]) + 1e-12
                    for strategy in RANKINGS[:-1]:
                        score = float(archive[strategy][j, d])
                        close(float(row[strategy + "_risk_score"]), score, "rank score")
                        risk_scores[(context, treatment, strategy)] = score
    # Reconstruct all retained identities independently from raw saved scores/hash rules.
    accum = defaultdict(list)
    retained_sets = {}
    unique_mask_keys = set()
    max_mask_error = 0.0
    checked_masks = 0
    with gzip.open(RESULTS / "retained-masks.jsonl.gz", "rt", encoding="utf-8") as stream:
        for row in map(json.loads, stream):
            context, strategy, coverage, repeat = row["context"], row["strategy"], row["coverage"], row["repeat"]
            key = (context, strategy, coverage, repeat)
            assert key not in unique_mask_keys
            unique_mask_keys.add(key)
            assert strategy in RANKINGS and coverage in COVERAGES
            assert 0 <= repeat < (100 if strategy == "random" else 1)
            available = observed[context]
            selected = row["treatments"]
            assert len(selected) == len(set(selected)) == math.ceil(coverage * len(available))
            assert set(selected) <= available
            assert row["eligible_count"] == len(available) and row["retained_count"] == len(selected)
            assert row["actual_coverage"] == len(selected) / len(available)
            if strategy == "random":
                def ordering(t):
                    return hashlib.sha256(f"EA-VC-Tahoe-v1|random20260910|{context}|{repeat}|{t}".encode()).hexdigest()
            else:
                def ordering(t):
                    return (risk_scores[(context, t, strategy)], hashlib.sha256(("EA-VC-Tahoe-v1|rank-tie|" + t).encode()).hexdigest())
            expected_selected = sorted(available, key=ordering)[:len(selected)]
            assert selected == expected_selected, "Retained identities/order differ from frozen ranking"
            actual = {p: math.fsum(losses[(context, t)][p] for t in selected) / len(selected) for p in PREDICTORS}
            for predictor, value in actual.items():
                close(row["risk"][predictor], value, "mask " + predictor)
                max_mask_error = max(max_mask_error, abs(row["risk"][predictor] - value))
            close(row["mean_minus_zero"], actual["mean"] - actual["zero"], "mask zero difference")
            if actual["zero"]:
                close(row["mean_over_zero"], actual["mean"] / actual["zero"], "mask zero ratio")
            else:
                assert row["mean_over_zero"] is None
            accum[(context, strategy, coverage)].append(actual)
            if repeat == 0:
                retained_sets[(context, strategy, coverage)] = set(selected)
            checked_masks += 1
    assert checked_masks == 50 * 4 * (4 + 100) == 20800
    line_risks = {key: {p: math.fsum(r[p] for r in values) / len(values) for p in PREDICTORS}
                  for key, values in accum.items()}
    expected_lines = {(c, s, q) for c in contexts for s in RANKINGS for q in COVERAGES}
    assert set(line_risks) == expected_lines
    for row in summary["line_risk"]:
        close(row["risk"], line_risks[(row["context"], row["strategy"], row["coverage"])]["mean"], "saved line summary")
    assert len(summary["line_risk"]) == len(expected_lines)
    overall = {s: {str(q): {p: math.fsum(line_risks[(c, s, q)][p] for c in contexts) / len(contexts)
                            for p in PREDICTORS} for q in COVERAGES} for s in RANKINGS}
    per_fold = {str(f): {s: {p: math.fsum(line_risks[(c, s, .75)][p] for c in contexts if folds[c] == f) / 10
                               for p in PREDICTORS} for s in RANKINGS} for f in range(5)}
    for strategy in RANKINGS:
        for coverage in COVERAGES:
            close(summary["overall_equal_line_mean_risk"][strategy][str(coverage)], overall[strategy][str(coverage)]["mean"], "overall")
        for fold in range(5):
            close(summary["fold_risk_at_75"][str(fold)][strategy], per_fold[str(fold)][strategy]["mean"], "fold")
    for c in contexts:
        for predictor in PREDICTORS:
            values = [line_risks[(c, s, 1.)][predictor] for s in RANKINGS]
            close(values, [values[0]] * len(values), "full coverage equality")
    candidate = overall["candidate"]["0.75"]["mean"]
    best = min(RANKINGS[1:], key=lambda s: overall[s]["0.75"]["mean"])
    conventional = overall[best]["0.75"]["mean"]
    fold_wins = sum(per_fold[str(f)]["candidate"]["mean"] < min(per_fold[str(f)][s]["mean"] for s in RANKINGS[1:]) for f in range(5))
    gate = candidate <= .9 * conventional and conventional > 0 and fold_wins >= 4
    assert gate == summary["primary_gate_passed"] is False
    assert fold_wins == summary["candidate_fold_wins_vs_best_conventional"]
    close(1 - candidate / conventional, summary["relative_improvement_at_75"], "primary gain")
    same_masks = {str(q): sum(retained_sets[(c, "candidate", q)] == retained_sets[(c, best, q)] for c in contexts) for q in COVERAGES}
    disagreement_loo_same = all(retained_sets[(c, "disagreement", q)] == retained_sets[(c, "treatment_risk", q)]
                                for c in contexts for q in COVERAGES)
    mask_changes = [{"context": c, "fold": folds[c],
                     "candidate_only": sorted(retained_sets[(c, "candidate", .75)] - retained_sets[(c, best, .75)]),
                     "conventional_only": sorted(retained_sets[(c, best, .75)] - retained_sets[(c, "candidate", .75)]),
                     "candidate_minus_conventional_mean_risk": line_risks[(c, "candidate", .75)]["mean"] - line_risks[(c, best, .75)]["mean"]}
                    for c in contexts if retained_sets[(c, "candidate", .75)] != retained_sets[(c, best, .75)]]
    comparisons = {}
    for strategy in RANKINGS:
        comparisons[strategy] = {}
        for coverage in COVERAGES:
            risk = overall[strategy][str(coverage)]
            comparisons[strategy][str(coverage)] = {**risk,
                "mean_improvement_over_zero_pct": 100 * (1 - risk["mean"] / risk["zero"]),
                "ridge_improvement_over_zero_pct": 100 * (1 - risk["ridge_descriptive"] / risk["zero"]),
                "ridge_improvement_over_mean_pct": 100 * (1 - risk["ridge_descriptive"] / risk["mean"])}
    line_differences = [line_risks[(c, "candidate", .75)]["mean"] - line_risks[(c, best, .75)]["mean"] for c in contexts]
    report = {
        "audited_at_utc": datetime.now(timezone.utc).isoformat(), "status": "PASS_ARITHMETIC_AND_PROVENANCE_AUDIT",
        "no_refit_or_retuning": True, "actual_numeric_outcomes_read_under_parent_authorization": True,
        "production_module_imported": False, "github_frozen_commit": publication["github_commit"],
        "frozen_at_utc": freeze["frozen_at_utc"], "publication_verified_at_utc": publication["verified_at_utc"],
        "run_completed_at_utc": run["created_at_utc"], "source_sha256": run["source_sha256"],
        "all_output_hashes_checked": len(checked_hashes), "all_input_hashes_checked": len(input_paths),
        "frozen_review_hashes_checked": len(freeze["independent_review_sha256"]),
        "raw_observed_pairs": len(keys), "missing_pairs": len(missing), "raw_expression_values_checked_finite": matrix.size,
        "archive_numeric_values_checked_finite": finite_prediction_values, "per_pair_rows_verified": len(rows),
        "retained_mask_records_recomputed": checked_masks, "all_retained_id_orderings_reconstructed": True,
        "all_line_fold_overall_summaries_recomputed": True, "same_mask_zero_and_ridge_verified": True,
        "full_coverage_equality_all_predictors_all_rankers": True,
        "max_absolute_pair_loss_difference": max_pair_error, "max_absolute_mask_loss_difference": max_mask_error,
        "primary": {"candidate_75_mean_mse": candidate, "best_conventional": best,
                    "best_conventional_75_mean_mse": conventional, "absolute_mse_reduction": conventional - candidate,
                    "relative_improvement_pct": 100 * (1 - candidate / conventional), "required_improvement_pct": 10,
                    "wins_against_each_fold_best": fold_wins, "required_fold_wins": 4,
                    "gate_passed": gate, "statistical_significance_test_performed": False},
        "same_mask_prediction_comparisons": comparisons, "per_fold_75_predictor_risks": per_fold,
        "exploratory_descriptive_patterns": {
            "selected_setting_by_fold": tuning,
            "candidate_and_best_conventional_identical_masks_lines_by_coverage": same_masks,
            "disagreement_and_treatment_loo_masks_identical_for_all_lines_coverages": disagreement_loo_same,
            "candidate_75_line_wins_ties_losses_vs_global_best": {"wins": sum(x < -1e-16 for x in line_differences),
                 "ties_within_1e_minus16": sum(abs(x) <= 1e-16 for x in line_differences), "losses": sum(x > 1e-16 for x in line_differences)},
            "changed_75_masks": mask_changes,
            "observed_treatments_per_line": {"min": min(map(len, observed.values())), "max": max(map(len, observed.values()))},
            "mean_actual_coverage_at_75": math.fsum(math.ceil(.75 * len(observed[c])) / len(observed[c]) for c in contexts) / 50,
            "tie_boundary_75_counts_by_strategy": {s: sum(row["tie_crosses_75_percent_boundary"] for d in diagnostics.values()
                 for row in d["exact_score_ties"] if row["strategy"] == s) for s in RANKINGS[:-1]},
            "no_model_or_threshold_changes_from_patterns": True},
        "disclosure_correction": "The frozen manifest's incidental plate-10 preview row count was not established. Use 'a default plate-10 PDEx preview'; the frozen file is preserved. It was outside the plate-1 data and not used to design/select the experiment.",
        "interpretation": "The predeclared practical improvement gate failed. A 0.1333% aggregate improvement is not a significance finding. Conventional source disagreement already captures almost all observed selective-risk reduction; model, measurement and single-plate limitations remain.",
        "elapsed_seconds": time.perf_counter() - started,
    }
    (HERE / "AUDIT.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    with (HERE / "line-comparisons.json").open("w") as stream:
        json.dump([{"context": c, "fold": folds[c], "strategy": s, "coverage": q, **risk}
                   for (c, s, q), risk in sorted(line_risks.items())], stream, indent=2)
        stream.write("\n")
    print(json.dumps({k: report[k] for k in ("status", "raw_observed_pairs", "retained_mask_records_recomputed", "primary", "exploratory_descriptive_patterns", "elapsed_seconds")}, indent=2))


if __name__ == "__main__":
    main()
