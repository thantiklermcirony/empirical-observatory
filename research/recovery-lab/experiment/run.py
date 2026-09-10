"""CLI: preflight inspects eligibility only; evaluate fits ONLY when authorized.

The root must publish/freeze exact source before invoking evaluate on real data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re

import numpy as np
import pandas as pd

from pipeline import (
    CLASS_NAMES, MODES, MODEL_NAMES, SEED, EXPECTED_INPUTS, assign_folds, brier_losses,
    build_dataset, fit_model, load_inputs, macro_mean, select_setting,
)


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def validate_publication(path, source_directory=None):
    """Verify local bytes match the root's exact public-freeze record.

    This is a local integrity check; it does not independently fetch GitHub.
    """
    source_directory = Path(source_directory or Path(__file__).parent)
    record = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    commit = record.get("commit", "")
    url = record.get("url", "")
    if not re.fullmatch(r"[0-9a-f]{40}", commit) or not re.fullmatch(r"https://github\.com/[^/]+/[^/]+/commit/" + commit, url):
        raise ValueError("Freeze record needs an exact GitHub commit URL and40hex commit")
    for name in ("pipeline.py", "run.py", "protocol.json"):
        actual = hashlib.sha256((source_directory / name).read_bytes()).hexdigest()
        if record.get("source_sha256", {}).get(name) != actual:
            raise ValueError(f"Frozen source hash mismatch: {name}")
    if record.get("input_sha256") != EXPECTED_INPUTS:
        raise ValueError("Frozen input hash map mismatch")
    return record


def coverage(metadata, folds):
    data = metadata.copy()
    data["fold"] = folds
    data["resolved"] = data.label >= 0
    def summarize(part):
        return {"landmarks": len(part), "animals": int(part.animal_id.nunique()),
                "resolved": int(part.resolved.sum()), "fraction": float(part.resolved.mean()),
                "current_complete": int(part.current_complete.sum()),
                "observed_outcome_complete": int(part.target_complete.sum()),
                "raw_window_with_assessment": int((part.window_assessment_count > 0).sum()),
                "raw_window_with_complete_assessment": int((part.window_complete_count > 0).sum()),
                "raw_window_with_identifiable_assessment": int((part.window_identifiable_count > 0).sum()),
                "label_counts": {str(k): int(v) for k, v in part.label.value_counts().sort_index().items()},
                "reasons": {str(k): int(v) for k, v in part.label_reason.value_counts().items()}}
    return {"overall": summarize(data),
            "by_fold": {str(k): summarize(v) for k, v in data.groupby("fold")},
            "by_diet": {str(k): summarize(v) for k, v in data.groupby("diet")},
            "by_current_state": {str(k): summarize(v) for k, v in data.groupby("current_state")},
            "by_animal": {str(k): summarize(v) for k, v in data.groupby("animal_id")},
            "observed_gap_counts": {str(int(k)): int(v) for k, v in data.outcome_gap_days.dropna().value_counts().sort_index().items()}}


def paired_bootstrap(improvement, seed=9102026, draws=2000):
    improvement = np.asarray(improvement, dtype=float)
    if not len(improvement):
        return None
    rng = np.random.default_rng(seed)
    sampled = np.array([improvement[rng.integers(0, len(improvement), len(improvement))].mean() for _ in range(draws)])
    return {"animals": len(improvement), "mean_absolute_improvement": float(improvement.mean()),
            "ci95": [float(v) for v in np.quantile(sampled, [.025, .975])],
            "draws": draws, "seed": seed,
            "conditioning": "Resamples saved out-of-fold animal losses conditional on fitted models and selected comparator; does not refit overlapping folds or include full training/selection uncertainty"}


def summarize(metadata, predictions, folds, mode):
    valid = metadata.label.to_numpy() >= 0
    labels = metadata.label.to_numpy()[valid]
    ids = metadata.animal_id.to_numpy()[valid]
    rows, models = [], {}
    for name, probability in predictions.items():
        loss = brier_losses(labels, probability[valid])
        logloss = -np.log(np.maximum(probability[valid, labels], 1e-12))
        animal = pd.DataFrame({"animal_id": ids, "brier": loss, "log_loss": logloss}).groupby("animal_id", sort=True).mean()
        for aid, value in animal.iterrows():
            rows.append({"model": name, "animal_id": aid, "brier": float(value.brier), "log_loss": float(value.log_loss)})
        per_fold = {}
        for fold in range(5):
            keep = folds[valid] == fold
            per_fold[str(fold)] = macro_mean(loss[keep], ids[keep])
        calibration = {}
        # Every calibration bin is weighted equally by animal, then by that
        # animal's number of scored landmarks (not by observations per bin).
        counts = pd.Series(ids).value_counts()
        weights = np.array([1. / counts[aid] for aid in ids])
        for cls, label_name in enumerate(CLASS_NAMES):
            bins = []
            for b in range(10):
                p = probability[valid, cls]
                keep = (p >= b / 10) & (p < (b + 1) / 10 if b < 9 else p <= 1)
                if keep.any():
                    bins.append({"left": b / 10, "right": (b + 1) / 10, "n": int(keep.sum()),
                                 "mean_probability": float(np.average(p[keep], weights=weights[keep])),
                                 "observed_fraction": float(np.average((labels[keep] == cls).astype(float), weights=weights[keep]))})
            calibration[label_name] = bins
        high = metadata.current_state.to_numpy()[valid] == 1
        recovery = None
        if high.any():
            binary_loss = np.square(probability[valid][high, 0] - (labels[high] == 0))
            recovery = {"animals": int(len(np.unique(ids[high]))), "landmarks": int(high.sum()),
                        "low_observed_outcomes": int((labels[high] == 0).sum()),
                        "animals_with_low_observed_outcome": int(len(np.unique(ids[high & (labels == 0)]))),
                        "binary_low_outcome_brier": macro_mean(binary_loss, ids[high]),
                        "multiclass_brier": macro_mean(loss[high], ids[high])}
            recovery["minimum_30_event_animals_met"] = recovery["animals_with_low_observed_outcome"] >= 30
            recovery["interpretation"] = "Descriptive observed-recrossing subset; event count alone is not a formal power analysis or durable-recovery evidence"
        models[name] = {"brier": float(animal.brier.mean()), "log_loss": float(animal.log_loss.mean()),
                        "per_fold_brier": per_fold, "calibration": calibration,
                        "recovery_subset": recovery}
    conventional = [n for n in MODEL_NAMES if n != "candidate"]
    best = min(conventional, key=lambda n: (models[n]["brier"], conventional.index(n)))
    best_score, candidate_score = models[best]["brier"], models["candidate"]["brier"]
    relative = (best_score - candidate_score) / best_score if best_score > 0 else 0.
    wins = sum(models["candidate"]["per_fold_brier"][str(f)] < min(models[n]["per_fold_brier"][str(f)] for n in conventional) for f in range(5))
    animal_rows = pd.DataFrame(rows)
    pivot = animal_rows.pivot(index="animal_id", columns="model", values="brier")
    bootstrap = paired_bootstrap((pivot[best] - pivot.candidate).to_numpy())
    cov = coverage(metadata, folds)
    resolution_pass = cov["overall"]["fraction"] >= .9 and all(v["fraction"] >= .9 for v in cov["by_fold"].values())
    numeric_pass = relative >= .05 and wins >= 4 and bootstrap["ci95"][0] > 0
    return {
        "mode": mode, "scope": "Descriptive complete-outcome comparison; primary resolution gate was known to fail before fitting",
        "coverage": cov, "models": models, "best_conventional": best,
        "relative_improvement": relative, "fold_wins_against_each_folds_best_conventional": wins,
        "paired_animal_bootstrap": bootstrap,
        "gate": {"resolution_pass": resolution_pass, "numeric_gate_pass": numeric_pass,
                 "overall_pass": False,
                 "pre_design_primary_resolution_failed": True,
                 "interpretation": "No confirmatory primary success can be claimed; selection/observation process remains unresolved"},
        "comparison_warning": "Best conventional and foldwise best are descriptive evaluation envelopes, not deployable hindsight selectors; model tuning used inner folds only",
    }, animal_rows


def evaluate_mode(dataset, output, mode):
    # Called only by evaluate CLI after public-freeze authorization.
    selected = dataset.metadata.strain.eq("J:DO").to_numpy()
    metadata = dataset.metadata.loc[selected].reset_index(drop=True)
    x = {n: f.loc[selected].reset_index(drop=True) for n, f in dataset.features.items()}
    labels = metadata.label.to_numpy(dtype=int)
    folds = assign_folds(metadata)
    predictions = {n: np.full((len(metadata), 3), np.nan) for n in MODEL_NAMES}
    fit_records = []
    for fold in range(5):
        train, test = folds != fold, folds == fold
        if set(metadata.animal_id[train]) & set(metadata.animal_id[test]):
            raise AssertionError("Outer animal leakage")
        for name in MODEL_NAMES:
            setting, tuning = select_setting(name, x[name].loc[train].reset_index(drop=True), labels[train], metadata.loc[train].reset_index(drop=True), SEED + f"|inner|{fold}")
            fit = train & (labels >= 0)
            model = fit_model(name, setting, x[name].loc[fit], labels[fit], metadata.animal_id.to_numpy()[fit])
            predictions[name][test] = model.predict_proba(x[name].loc[test])
            fit_records.append({"fold": fold, "model": name, "setting": list(setting), "inner_selection": tuning,
                                "training_animals": sorted(metadata.animal_id[fit].unique().tolist()),
                                "heldout_animals": sorted(metadata.animal_id[test].unique().tolist()),
                                "training_absent_classes": model.absent_classes,
                                "training_rows": int(fit.sum()), "predicted_rows": int(test.sum())})
        print(f"Completed {mode} outer fold {fold}", flush=True)
    for probability in predictions.values():
        if not np.isfinite(probability).all() or not np.allclose(probability.sum(axis=1), 1):
            raise AssertionError("Missing or invalid outer prediction")
    output.mkdir(parents=True, exist_ok=True)
    export = metadata.copy()
    export["fold"] = folds
    for name, probability in predictions.items():
        for cls, label in enumerate(CLASS_NAMES):
            export[name + "_p_" + label] = probability[:, cls]
    export.to_csv(output / "predictions.csv", index=False, lineterminator="\n")
    summary, animal_rows = summarize(metadata, predictions, folds, mode)
    write_json(output / "summary.json", summary)
    write_json(output / "fit_records.json", fit_records)
    animal_rows.to_csv(output / "animal_losses.csv", index=False, lineterminator="\n")
    return summary


def preflight(animals, visits, output):
    output.mkdir(parents=True, exist_ok=True)
    results = {}
    for mode in MODES:
        dataset = build_dataset(animals, visits, mode, include_features=False)
        do = dataset.metadata.loc[dataset.metadata.strain.eq("J:DO")].reset_index(drop=True)
        folds = assign_folds(do)
        results[mode] = coverage(do, folds)
        export = do.copy()
        export["fold"] = folds
        export.to_csv(output / (mode + "_landmarks.csv"), index=False, lineterminator="\n")
        print(f"Eligibility {mode}: {len(do)} landmarks, {(do.label >= 0).sum()} resolved", flush=True)
    write_json(output / "PREFLIGHT.json", {
        "disclosure": "Pre-design eligibility inspection only; no estimator fitted or performance metric computed",
        "modes": results, "source_scope": "DO primary; all original exits preserved; chronology-invalid animals quarantined",
    })


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("preflight", "evaluate"))
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frozen-publication", type=Path)
    args = parser.parse_args()
    animals, visits = load_inputs(args.data)
    if args.command == "preflight":
        preflight(animals, visits, args.output)
        return
    if args.frozen_publication is None or not args.frozen_publication.is_file():
        parser.error("Real evaluation requires the root's public freeze record via --frozen-publication")
    publication = validate_publication(args.frozen_publication)
    args.output.mkdir(parents=True, exist_ok=True)
    summaries = {}
    for mode in MODES:
        dataset = build_dataset(animals, visits, mode)
        summaries[mode] = evaluate_mode(dataset, args.output / mode, mode)
    write_json(args.output / "SUMMARY.json", {
        "all_modes": {m: {k: s[k] for k in ("best_conventional", "relative_improvement", "fold_wins_against_each_folds_best_conventional", "gate")} for m, s in summaries.items()},
        "frozen_publication": publication,
        "source_hashes": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(Path(__file__).parent.glob("*.py"))},
        "research_limits": ["Primary coverage gate failed before fitting", "No causal or human longevity inference", "No fitted full semi-Markov or joint-survival model", "No B6 transport result in this release"],
    })


if __name__ == "__main__":
    main()
