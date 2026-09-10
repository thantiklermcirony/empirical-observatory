"""Independently recompute saved-result arithmetic; never fit or retune a model."""

from collections import defaultdict
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
EXPERIMENT = HERE.parents[1] / "experiment"
MODELS = ("transition", "current", "history", "duration", "duration_hgb", "candidate")
CLASSES = ("low", "high", "death_or_euthanasia")
MODES = ("primary", "complete_items", "exclude_analgesic")


def near(one, two, tolerance=1e-11):
    assert np.isfinite(one) and np.isfinite(two)
    assert abs(float(one) - float(two)) <= tolerance, (one, two)


def animal_means(values, ids):
    # An explicit loop supplies an independent aggregation path.
    grouped = defaultdict(list)
    for value, animal in zip(values, ids):
        grouped[animal].append(float(value))
    return {animal: sum(group) / len(group) for animal, group in sorted(grouped.items())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=MODES)
    args = parser.parse_args()
    publication = json.loads((EXPERIMENT / "FROZEN_PUBLICATION.json").read_text(encoding="utf-8-sig"))
    for name, expected in publication["source_sha256"].items():
        assert hashlib.sha256((EXPERIMENT / name).read_bytes()).hexdigest() == expected, name
    report = {"checked_at": datetime.now(timezone.utc).isoformat(), "passed": False,
              "scope": "Saved predictions, eligibility masks and arithmetic only; no refitting, retuning, new threshold or new hypothesis.",
              "public_source_commit": publication["commit"], "modes": {}, "input_artifacts": []}
    previous_ids = None
    for mode in (args.mode,) if args.mode else MODES:
        folder = EXPERIMENT / "results" / mode
        paths = [folder / "predictions.csv", folder / "summary.json", folder / "animal_losses.csv", folder / "fit_records.json",
                 EXPERIMENT / "preflight" / (mode + "_landmarks.csv")]
        for path in paths:
            report["input_artifacts"].append({"path": str(path.relative_to(EXPERIMENT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
        frame = pd.read_csv(paths[0])
        summary = json.loads(paths[1].read_text(encoding="utf-8"))
        exported_losses = pd.read_csv(paths[2])
        fits = json.loads(paths[3].read_text(encoding="utf-8"))
        preflight = pd.read_csv(paths[4])
        assert len(frame) == len(preflight) == 4104
        assert frame.animal_id.nunique() == 214
        assert frame.landmark_id.tolist() == preflight.landmark_id.tolist()
        assert frame.label.tolist() == preflight.label.tolist()
        assert frame.fold.tolist() == preflight.fold.tolist()
        if previous_ids is not None:
            assert frame.landmark_id.tolist() == previous_ids
        previous_ids = frame.landmark_id.tolist()
        valid = frame.label.to_numpy() >= 0
        labels = frame.label.to_numpy(dtype=int)[valid]
        ids = frame.animal_id.to_numpy()[valid]
        folds = frame.fold.to_numpy()[valid]
        current = frame.current_state.to_numpy()[valid]
        losses, per_animal, fold_scores = {}, {}, {}
        for name in MODELS:
            probability = frame[[name + "_p_" + cls for cls in CLASSES]].to_numpy()
            assert probability.shape == (4104, 3)
            assert np.isfinite(probability).all() and (probability >= 0).all()
            assert np.allclose(probability.sum(axis=1), 1, rtol=0, atol=1e-10)
            pred = probability[valid]
            loss = np.array([sum((row[k] - int(label == k)) ** 2 for k in range(3)) for row, label in zip(pred, labels)])
            logs = np.array([-np.log(max(row[label], 1e-12)) for row, label in zip(pred, labels)])
            animal_loss = animal_means(loss, ids)
            per_animal[name] = animal_loss
            losses[name] = sum(animal_loss.values()) / len(animal_loss)
            near(losses[name], summary["models"][name]["brier"])
            log_by_animal = animal_means(logs, ids)
            near(sum(log_by_animal.values()) / len(log_by_animal), summary["models"][name]["log_loss"])
            saved = exported_losses.loc[exported_losses.model.eq(name)].set_index("animal_id")
            assert set(saved.index) == set(animal_loss)
            for animal, value in animal_loss.items():
                near(value, saved.loc[animal, "brier"])
                near(log_by_animal[animal], saved.loc[animal, "log_loss"])
            fold_scores[name] = {}
            for fold in range(5):
                keep = folds == fold
                aa = animal_means(loss[keep], ids[keep])
                value = sum(aa.values()) / len(aa)
                near(value, summary["models"][name]["per_fold_brier"][str(fold)])
                fold_scores[name][fold] = value
            high = current == 1
            if high.any():
                subgroup = animal_means((pred[high, 0] - (labels[high] == 0)) ** 2, ids[high])
                near(sum(subgroup.values()) / len(subgroup), summary["models"][name]["recovery_subset"]["binary_low_outcome_brier"])
                assert len(set(ids[high & (labels == 0)])) == summary["models"][name]["recovery_subset"]["animals_with_low_observed_outcome"]
        conventional = MODELS[:-1]
        best = min(conventional, key=lambda name: (losses[name], conventional.index(name)))
        assert summary["best_conventional"] == best
        relative = (losses[best] - losses["candidate"]) / losses[best] if losses[best] > 0 else 0
        near(relative, summary["relative_improvement"])
        wins = sum(fold_scores["candidate"][fold] < min(fold_scores[name][fold] for name in conventional) for fold in range(5))
        assert wins == summary["fold_wins_against_each_folds_best_conventional"]
        improvement = np.array([per_animal[best][animal] - per_animal["candidate"][animal] for animal in sorted(per_animal[best])])
        rng = np.random.default_rng(9102026)
        draws = improvement[rng.integers(0, len(improvement), size=(2000, len(improvement)))].mean(axis=1)
        interval = np.quantile(draws, [.025, .975])
        near(interval[0], summary["paired_animal_bootstrap"]["ci95"][0])
        near(interval[1], summary["paired_animal_bootstrap"]["ci95"][1])
        assert bool(relative >= .05 and wins >= 4 and interval[0] > 0) == summary["gate"]["numeric_gate_pass"]
        assert summary["gate"]["overall_pass"] is False
        assert summary["gate"]["pre_design_primary_resolution_failed"] is True
        assert len(fits) == 5 * len(MODELS)
        for fit in fits:
            train = frame.fold.ne(fit["fold"]) & frame.label.ge(0)
            test = frame.fold.eq(fit["fold"])
            assert set(fit["training_animals"]) == set(frame.animal_id[train])
            assert set(fit["heldout_animals"]) == set(frame.animal_id[test])
            assert not set(fit["training_animals"]) & set(fit["heldout_animals"])
            assert fit["training_rows"] == int(train.sum())
            assert fit["predicted_rows"] == int(test.sum())
            tuning = fit["inner_selection"]
            if tuning:
                selected = min(range(len(tuning)), key=lambda ix: (tuning[ix]["inner_brier"], ix))
                assert fit["setting"] == [tuning[selected]["family"], tuning[selected]["c"]]
        report["modes"][mode] = {"intended_landmarks": len(frame), "resolved_landmarks": int(valid.sum()),
            "all_methods_identical_mask": True, "all_fits_animal_isolated": True,
            "recomputed_brier": losses, "best_conventional": best, "relative_improvement": relative,
            "fold_wins": wins, "conditional_bootstrap_ci95": interval.tolist(), "overall_gate": False}
    report["passed"] = True
    filename = "results-reconciliation-" + args.mode + ".json" if args.mode else "results-reconciliation.json"
    (HERE / filename).write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"passed": True, "modes": {m: {k: v[k] for k in ("resolved_landmarks", "best_conventional", "relative_improvement", "fold_wins", "overall_gate")} for m, v in report["modes"].items()}}, indent=2))


if __name__ == "__main__":
    main()
