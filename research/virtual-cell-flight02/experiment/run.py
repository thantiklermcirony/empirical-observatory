"""Portable real-data runner. No data is loaded without an explicit execution flag."""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import gzip
import json
import platform
from pathlib import Path
import sys
import time
import traceback

import numpy as np

from dataio import Panel, SOURCE_FILES, load_panel, sha256
from pipeline import fit_predict_outer, line_curves, summarize_curves


def clean(value):
    if isinstance(value, dict):
        return {str(k): clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, np.ndarray):
        return clean(value.tolist())
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, (float, np.floating)):
        return float(value) if np.isfinite(value) else None
    return value


def save_json(path, value):
    Path(path).write_text(json.dumps(clean(value), indent=2, allow_nan=False) + "\n", encoding="utf-8")


def fit_diagnostics(result, controls, contexts, observed):
    """Descriptive source/support and exact-tie checks; never accepts target outcomes."""
    control_variance = np.var(np.log1p(controls), axis=0, dtype=np.float64)
    support_values, support_counts = np.unique(result["source_support"], return_counts=True)
    ties = []
    for j, context in enumerate(contexts):
        for strategy, scores in result["rank_scores"].items():
            values = scores[j, observed[j]]
            _, counts = np.unique(values, return_counts=True)
            ordered = np.sort(values)
            retained = int(np.ceil(.75 * len(values)))
            boundary = retained < len(values) and ordered[retained - 1] == ordered[retained]
            ties.append({"context": context, "strategy": strategy, "observed_treatments": len(values),
                         "unique_scores": len(counts), "exact_tie_groups": int((counts > 1).sum()),
                         "treatments_in_exact_ties": int(counts[counts > 1].sum()),
                         "tie_crosses_75_percent_boundary": bool(boundary)})
    return {"source_control_features": controls.shape[1],
            "zero_source_control_variance_features": int((control_variance == 0).sum()),
            "zero_source_response_variance_treatments": int((result["rank_scores"]["disagreement"][0] == 0).sum()),
            "source_support_histogram": dict(zip(support_values.tolist(), support_counts.tolist())),
            "exact_score_ties": ties,
            "interpretation": "Diagnostics only; no exclusion, retuning, tolerance-based tie merging or gate change"}


def execute(panel: Panel, output: Path):
    """Also callable by synthetic tests with an explicitly constructed Panel."""
    output.mkdir(parents=True, exist_ok=False)
    started = time.perf_counter()
    all_curves, pairs, fold_records = [], [], []
    save_json(output / "input-provenance.json", panel.provenance)
    missing = [{"context": panel.contexts[c], "treatment": panel.treatments[d], "status": "not_observed"}
               for c, d in zip(*np.where(~panel.observed))]
    save_json(output / "missing-pairs.json", missing)
    try:
        for fold in sorted(set(panel.folds.tolist())):
            tick = time.perf_counter()
            train = np.flatnonzero(panel.folds != fold)
            test = np.flatnonzero(panel.folds == fold)
            result = fit_predict_outer(panel.y[train], panel.observed[train], panel.controls[train],
                                       panel.control_features, panel.contexts[train], panel.folds[train],
                                       panel.treatments, panel.controls[test])
            if ((result["source_support"] < 2)[None, :] & panel.observed[test]).any():
                raise ValueError("Outer observed pair lacks required source support; no row exclusion")
            prediction_path = output / f"fold-{fold}-predictions.npz"
            np.savez_compressed(prediction_path, context_ids=panel.contexts[test], treatment_ids=panel.treatments,
                                gene_ids=panel.genes, source_mean=result["mean_prediction"],
                                ridge_descriptive=result["ridge_prediction"], source_support=result["source_support"],
                                effective_support=result["effective_support"], **result["rank_scores"])
            record = {"fold": int(fold), "source_contexts": result["source_ids"],
                      "test_contexts": panel.contexts[test].tolist(), "tuning": result["tuning"],
                      "control_map": result["control_map"], "source_bandwidth": result["source_bandwidth"],
                      "fit_diagnostics": fit_diagnostics(result, panel.controls[train], panel.contexts[test], panel.observed[test]),
                      "prediction_sha256": sha256(prediction_path),
                      "prediction_saved_before_outer_scoring": True,
                      "prediction_saved_at_utc": datetime.now(timezone.utc).isoformat()}
            save_json(output / f"fold-{fold}-prediction-manifest.json", record)
            # Outer truth is passed to the scorer only after the immutable prediction write.
            for j, c in enumerate(test):
                scores = {name: value[j] for name, value in result["rank_scores"].items()}
                losses, records = line_curves(result["mean_prediction"], result["ridge_prediction"][j],
                                             panel.y[c], panel.observed[c], scores,
                                             panel.treatments, panel.contexts[c])
                all_curves.extend(records)
                for d in np.flatnonzero(panel.observed[c]):
                    pairs.append({"context": panel.contexts[c], "fold": int(fold),
                                  "treatment": panel.treatments[d], "source_lines": int(result["source_support"][d]),
                                  "effective_source_lines": float(result["effective_support"][j, d]),
                                  **{name + "_risk_score": float(value[d]) for name, value in scores.items()},
                                  **{name + "_mse": float(value[d]) for name, value in losses.items()}})
            record["elapsed_seconds"] = time.perf_counter() - tick
            fold_records.append(record)
            print(f"Completed fold {fold}: {len(test)} lines, {record['elapsed_seconds']:.2f}s", flush=True)
        summary = summarize_curves(all_curves, dict(zip(panel.contexts.tolist(), panel.folds.tolist())))
        summary.update({"status": "completed", "contexts": len(panel.contexts), "treatments": len(panel.treatments),
                        "genes": len(panel.genes), "observed_pairs": int(panel.observed.sum()),
                        "missing_pairs": int((~panel.observed).sum()), "folds": fold_records,
                        "elapsed_seconds": time.perf_counter() - started,
                        "claim": "Selection risk for fixed mean predictions, not full-coverage model superiority"})
        save_json(output / "summary.json", summary)
        with gzip.open(output / "retained-masks.jsonl.gz", "wt", encoding="utf-8") as stream:
            for row in all_curves:
                stream.write(json.dumps(clean(row), allow_nan=False) + "\n")
        with (output / "per-pair.csv").open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=list(pairs[0]))
            writer.writeheader()
            writer.writerows(pairs)
        source = Path(__file__).resolve().parent
        save_json(output / "run-manifest.json", {"status": "completed", "created_at_utc": datetime.now(timezone.utc).isoformat(),
                  "python": sys.version, "platform": platform.platform(), "numpy": np.__version__,
                  "source_sha256": {name: sha256(source / name) for name in SOURCE_FILES},
                  "output_sha256": {p.name: sha256(p) for p in output.iterdir() if p.is_file()},
                  "failure_count": 0})
        print("Primary gate:", summary["primary_gate_passed"], flush=True)
        return summary
    except Exception as error:
        save_json(output / "failure.json", {"status": "failed", "error_type": type(error).__name__,
                  "message": str(error), "traceback": traceback.format_exc(),
                  "completed_folds": [r["fold"] for r in fold_records],
                  "elapsed_seconds": time.perf_counter() - started})
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute-real-data", action="store_true")
    parser.add_argument("--freeze-manifest", type=Path)
    parser.add_argument("--response", type=Path)
    parser.add_argument("--controls", type=Path)
    parser.add_argument("--selection", type=Path)
    parser.add_argument("--preflight", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    required = [args.freeze_manifest, args.response, args.controls, args.selection, args.preflight, args.output]
    if not args.execute_real_data or any(value is None for value in required):
        parser.error("Real evaluation requires --execute-real-data and every input/output argument after protocol review/freeze")
    if args.output.exists():
        parser.error("Output path already exists; existing results will not be overwritten")
    try:
        panel = load_panel(args.response, args.controls, args.selection, args.preflight, args.freeze_manifest)
    except Exception as error:
        args.output.mkdir(parents=True, exist_ok=False)
        save_json(args.output / "failure.json", {"stage": "input_contract", "status": "failed",
                  "error_type": type(error).__name__, "message": str(error)})
        raise
    execute(panel, args.output)


if __name__ == "__main__":
    main()
