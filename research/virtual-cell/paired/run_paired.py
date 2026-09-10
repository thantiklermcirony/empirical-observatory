"""Fixed, offline, two-context construct response-transfer audit. See PROTOCOL.json."""
import csv
import hashlib
import importlib.metadata
import json
import math
import platform
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import anndata as ad
import numpy as np
from paired_paths import resolve_paths

HERE = Path(__file__).resolve().parent
FILES = {
    "K562": ("K562_essential_raw_bulk_01.h5ad", 79766954, "8321d5d3ffc99db2a5c71edca4189735"),
    "RPE1": ("rpe1_raw_bulk_01.h5ad", 95350546, "74765fa87635467a869ea972356ae0e7"),
}


def digest(path, algorithm="sha256"):
    h = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n", encoding="utf-8")


def control_pool(data, columns):
    mask = np.asarray(data.obs.core_control, dtype=bool)
    if not all("non-targeting" in str(label) for label in data.obs_names[mask]):
        raise ValueError("Publisher core-control set includes a targeted construct")
    weights = np.asarray(data.obs.num_cells_filtered, dtype=float)[mask]
    if not (np.isfinite(weights).all() and (weights > 0).all()):
        raise ValueError("Invalid control cell weights")
    matrix = np.asarray(data.X[mask][:, columns], dtype=float)
    pooled = np.average(matrix, axis=0, weights=weights)
    return pooled, {"constructs": int(mask.sum()), "filtered_cells": int(weights.sum()),
                    "labels": list(map(str, data.obs_names[mask]))}


def transform(raw):
    if not (np.isfinite(raw).all() and (raw >= 0).all()):
        raise ValueError("Invalid nonnegative finite pseudobulk mean")
    sums = raw.sum(axis=-1, keepdims=True)
    if (sums <= 0).any():
        raise ValueError("Empty pseudobulk library")
    return np.log1p(raw / sums * 10000)


def make_predictions(source_effects, permutation):
    """No target outcomes or outcome-based preprocessing enter this function."""
    return {"control": np.zeros_like(source_effects),
            "same_construct_transfer": source_effects.copy(),
            "permuted_construct_transfer": source_effects[permutation].copy()}


def pearson(x, y):
    u, v = x - x.mean(), y - y.mean()
    denominator = np.linalg.norm(u) * np.linalg.norm(v)
    return None if denominator == 0 else float(np.dot(u, v) / denominator)


def main(argv=None):
    args = resolve_paths(argv, description=__doc__)
    started = time.perf_counter()
    contexts, input_records = {}, {}
    for context, (name, expected_size, md5) in FILES.items():
        path = args.data_dir / name
        if path.stat().st_size != expected_size or digest(path, "md5") != md5:
            raise ValueError(f"Publisher checksum mismatch for {name}")
        contexts[context] = ad.read_h5ad(path)
        input_records[context] = {"filename": name, "bytes": expected_size, "md5": md5, "sha256": digest(path)}
    common_features = sorted(set(contexts["K562"].var_names) & set(contexts["RPE1"].var_names))
    common_labels = sorted(set(contexts["K562"].obs_names) & set(contexts["RPE1"].obs_names))
    construct_labels = [str(label) for label in common_labels if re.fullmatch(r"ENSG\d+", str(label).rsplit("_", 1)[-1])
                        and all(float(data.obs.loc[label, "num_cells_filtered"]) >= 20 for data in contexts.values())]
    target_genes = np.asarray([label.rsplit("_", 1)[-1] for label in construct_labels])
    columns = {c: data.var_names.get_indexer(common_features) for c, data in contexts.items()}
    control_raw, control_metadata = {}, {}
    for c, data in contexts.items():
        control_raw[c], control_metadata[c] = control_pool(data, columns[c])
    rng = np.random.default_rng(20260910)
    for attempts in range(10000):
        permutation = rng.permutation(len(construct_labels))
        if np.all(target_genes != target_genes[permutation]):
            break
    else:
        raise ValueError("No deterministic different-gene permutation found")
    rows, directional, oracle_checks, integrity_checks = [], {}, [], []
    feature_views = {}
    for source, target in (("K562", "RPE1"), ("RPE1", "K562")):
        source_data, target_data = contexts[source], contexts[target]
        source_rows = source_data.obs_names.get_indexer(construct_labels)
        source_raw = np.asarray(source_data.X[source_rows][:, columns[source]], dtype=float)
        source_control = transform(control_raw[source])
        source_effects = transform(source_raw) - source_control
        source_rank = sorted(range(len(common_features)), key=lambda i: (-control_raw[source][i], common_features[i]))
        views = {"primary_all_shared": np.arange(len(common_features)), "secondary_source_control_top1000": np.asarray(source_rank[:1000])}
        direction = f"{source}_to_{target}"
        feature_views[direction] = {view: [common_features[i] for i in indices] for view, indices in views.items()}
        predictions = make_predictions(source_effects, permutation)
        prediction_digest = hashlib.sha256(b"".join(predictions[m].astype("<f8").tobytes() for m in sorted(predictions))).hexdigest()
        # Predictions and source-only rankings are now frozen; only now access target responses.
        target_rows = target_data.obs_names.get_indexer(construct_labels)
        target_raw = np.asarray(target_data.X[target_rows][:, columns[target]], dtype=float)
        truth = transform(target_raw) - transform(control_raw[target])
        # Poison truth locally and verify the predictor has no dependent input.
        poisoned_truth = truth + 1000.0
        again = make_predictions(source_effects, permutation)
        integrity_checks.append({"direction": direction, "poison_truth_does_not_change_predictions": all(np.array_equal(predictions[m], again[m]) for m in predictions),
                                 "poison_changes_error": bool(np.mean((again["control"] - poisoned_truth) ** 2) > np.mean(truth ** 2)),
                                 "prediction_sha256": prediction_digest})
        for view, indices in views.items():
            for i, label in enumerate(construct_labels):
                active = indices[np.asarray([common_features[j] != target_genes[i] for j in indices])]
                observed = truth[i, active]
                for model, matrix in predictions.items():
                    predicted = matrix[i, active]
                    error = float(np.mean((predicted - observed) ** 2))
                    corr = pearson(predicted, observed)
                    rows.append({"direction": direction, "feature_view": view, "construct": label,
                                 "target_gene": str(target_genes[i]), "model": model,
                                 "response_mse": error, "response_pearson": corr,
                                 "pearson_status": "undefined_constant" if corr is None else "ok", "n_features": len(active)})
                    # Independent arithmetic on first 8 declared labels, every model and view.
                    if i < 8:
                        oracle = math.fsum((float(p) - float(t)) ** 2 for p, t in zip(predicted, observed)) / len(active)
                        oracle_checks.append({"direction": direction, "view": view, "construct": label, "model": model,
                                              "absolute_difference": abs(error - oracle), "passed": math.isclose(error, oracle, rel_tol=1e-12, abs_tol=1e-12)})
        directional[direction] = {"source_control": source_control.tolist(), "target_control": transform(control_raw[target]).tolist(),
                                  "source_control_weighting": control_metadata[source], "target_control_weighting": control_metadata[target]}
    summaries = []
    for direction in directional:
        for view in feature_views[direction]:
            subset = [r for r in rows if r["direction"] == direction and r["feature_view"] == view]
            macro = {}
            for model in ("control", "same_construct_transfer", "permuted_construct_transfer"):
                selected = [r for r in subset if r["model"] == model]
                by_gene = {}
                for row in selected:
                    by_gene.setdefault(row["target_gene"], []).append(row["response_mse"])
                per_gene = {gene: math.fsum(values) / len(values) for gene, values in by_gene.items()}
                macro[model] = math.fsum(per_gene.values()) / len(per_gene)
                correlations = [r["response_pearson"] for r in selected if r["response_pearson"] is not None]
                summaries.append({"direction": direction, "feature_view": view, "model": model,
                                  "macro_gene_mse": macro[model], "n_constructs": len(selected), "n_target_genes": len(per_gene),
                                  "mean_construct_pearson_over_defined": math.fsum(correlations) / len(correlations) if correlations else None,
                                  "undefined_correlations": len(selected) - len(correlations)})
            for summary in summaries:
                if summary["direction"] == direction and summary["feature_view"] == view:
                    summary["macro_mse_ratio_to_control"] = summary["macro_gene_mse"] / macro["control"] if macro["control"] else None
    if not all(row["passed"] for row in oracle_checks):
        raise AssertionError("Independent arithmetic mismatch")
    for check in integrity_checks:
        if not (check["poison_truth_does_not_change_predictions"] and check["poison_changes_error"]):
            raise AssertionError("Boundary check failed")
    output = args.results_dir
    output.mkdir(parents=True, exist_ok=True)
    save_json(output / "summary.json", {"claim_level": "paired experimental-context pattern audit; fixed conventional baselines only", "rows": summaries})
    save_json(output / "selectors.json", {"shared_feature_ids": common_features, "constructs": construct_labels,
                                          "feature_views": feature_views, "permutation": permutation.tolist(), "permutation_rejections": attempts})
    save_json(output / "control-vectors.json", {"feature_ids": common_features, "directions": directional})
    save_json(output / "validation.json", {"arithmetic_checks": oracle_checks, "boundary_checks": integrity_checks,
                                           "arithmetic_max_absolute_difference": max(c["absolute_difference"] for c in oracle_checks)})
    with (output / "scores.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)
    save_json(output / "provenance.json", {
        "run_at_utc": datetime.now(timezone.utc).isoformat(), "runtime_seconds": time.perf_counter() - started,
        "input_files": input_records, "protocol_sha256": digest(HERE / "PROTOCOL.json"), "script_sha256": digest(Path(__file__)),
        "python": sys.version, "platform": platform.platform(),
        "packages": {name: importlib.metadata.version(name) for name in ("anndata", "numpy", "scipy", "h5py")},
        "operator": "CRISPRi", "contexts": {"K562": {"days": 6, "effector": "dCas9-KRAB"}, "RPE1": {"days": 7, "effector": "ZIM3 KRAB-dCas9"}},
        "network_used_by_this_script": False, "tunable_parameters": 0, "single_cell_counts_generated": False,
        "four_context_protocol_executed": False, "ida_biology_engine": False, "challenge_score": False,
        "result_sha256": {path.name: digest(path) for path in sorted(output.iterdir()) if path.is_file() and path.name != "provenance.json"},
    })
    print(json.dumps(summaries, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
