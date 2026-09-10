"""Summarize saved frozen results without fitting or changing any experiment file."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    here = Path(__file__).resolve().parent
    experiment = here.parent / "experiment"
    execution = read(here / "EXECUTION.json")
    if execution["exit_code"] != 0:
        raise RuntimeError("Do not summarize a failed run as completed")
    freeze = read(experiment / "FROZEN_PUBLICATION.json")
    checked = {}
    for name, expected in freeze["source_sha256"].items():
        actual = hashlib.sha256((experiment / name).read_bytes()).hexdigest()
        if actual != expected:
            raise RuntimeError(f"Frozen source changed: {name}")
        checked[name] = actual
    checked_inputs = {}
    for name, expected in freeze["input_sha256"].items():
        actual = hashlib.sha256((here.parent / "data-audit" / "derived" / name).read_bytes()).hexdigest()
        if actual != expected:
            raise RuntimeError(f"Frozen input changed: {name}")
        checked_inputs[name] = actual
    log = (here / "evaluate.log").read_text(encoding="utf-8", errors="replace")
    completed = [line for line in log.splitlines() if line.startswith("Completed ")]
    modes = {}
    for mode in ("primary", "complete_items", "exclude_analgesic"):
        result = read(experiment / "results" / mode / "summary.json")
        fits = read(experiment / "results" / mode / "fit_records.json")
        cov = result["coverage"]["overall"]
        best = result["best_conventional"]
        candidate = result["models"]["candidate"]
        modes[mode] = {
            "intended_landmarks": cov["landmarks"],
            "resolved_landmarks": cov["resolved"],
            "animals": cov["animals"],
            "resolution_fraction": cov["fraction"],
            "best_conventional": best,
            "brier_by_model": {n: r["brier"] for n, r in result["models"].items()},
            "log_loss_by_model": {n: r["log_loss"] for n, r in result["models"].items()},
            "candidate_relative_improvement": result["relative_improvement"],
            "candidate_fold_wins": result["fold_wins_against_each_folds_best_conventional"],
            "paired_animal_bootstrap": result["paired_animal_bootstrap"],
            "gate": result["gate"],
            "candidate_settings_by_fold": {str(r["fold"]): r["setting"] for r in fits if r["model"] == "candidate"},
            "outer_fits_with_absent_classes": [
                {"fold": r["fold"], "model": r["model"], "absent_classes": r["training_absent_classes"]}
                for r in fits if r["training_absent_classes"]
            ],
            "candidate_recovery_subset": candidate["recovery_subset"],
            "baseline_recovery_subset": result["models"][best]["recovery_subset"],
        }
    if len(completed) != 15:
        raise RuntimeError(f"Expected 15 completed outer-fold log messages, saw {len(completed)}")
    report = {
        "purpose": "Saved-result report only; no model fitting, retuning, or source modification",
        "public_freeze_url": freeze["url"],
        "post_run_source_hashes_verified": checked,
        "post_run_input_hashes_verified": checked_inputs,
        "execution": execution,
        "completed_outer_fold_messages": len(completed),
        "log_non_progress_lines": [line for line in log.splitlines() if line and not line.startswith("Completed ")],
        "modes": modes,
        "interpretation": [
            "All three modes are descriptive because the primary observation-resolution gate failed before fitting.",
            "The endpoint is recorded death/euthanasia by day9 or an observed burden assessment near day7 with survival established through day9; it is not exact latent day7 health.",
            "Unresolved outcomes are retained in the prediction tables and excluded from the shared within-mode scoring mask, never assigned healthy or zero-valued outcomes.",
            "The paired bootstrap resamples saved out-of-fold animal losses conditional on fitted models and selected comparator; it does not cover full training or selection uncertainty.",
            "High-to-low observed deficit recrossing is not durable biological recovery, a causal intervention effect, or a longevity improvement.",
        ],
    }
    (here / "RESULTS.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    lines = [
        "# Recovery Lab: frozen descriptive execution",
        "",
        "The single authorized run completed all three modes and all 15 outer folds. No settings or source files were changed after inspecting performance.",
        "",
        f"Runtime: {execution['runtime_seconds']:.2f} seconds; exit code {execution['exit_code']}. Numerical-library thread limits were set to one and are recorded in EXECUTION.json. Frozen source and input hashes were rechecked after completion.",
        "",
        f"Public source freeze: {freeze['url']}",
        "",
        "| Mode | Resolved / intended | Candidate Brier | Best conventional Brier | Relative reduction | Fold wins | Numeric gate |",
        "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for mode, row in modes.items():
        best = row["best_conventional"]
        scores = row["brier_by_model"]
        lines.append(f"| {mode} | {row['resolved_landmarks']} / {row['intended_landmarks']} | {scores['candidate']:.9f} | {scores[best]:.9f} ({best}) | {100 * row['candidate_relative_improvement']:.4f}% | {row['candidate_fold_wins']} / 5 | {row['gate']['numeric_gate_pass']} |")
    lines += ["", "Every mode remains an overall failed gate. The primary resolution fraction was known to be below 90% before any fitting; these scores therefore support a descriptive comparison only.", "", "All losses weight animals equally, averaging each animal's resolved landmark losses first. Brier loss is the sum over three probability classes, with range zero to two. The selected conventional benchmark is a descriptive evaluation envelope.", ""]
    for mode, row in modes.items():
        interval = row["paired_animal_bootstrap"]["ci95"]
        best = row["best_conventional"]
        ll = row["log_loss_by_model"]
        lines.append(f"- {mode}: paired-animal 95% interval for absolute Brier improvement [{interval[0]:.9f}, {interval[1]:.9f}]. Candidate log loss {ll['candidate']:.9f}; {best} log loss {ll[best]:.9f}.")
    lines += ["", "The paired bootstrap is conditional on the saved fitted models and selected comparator; it does not retrain the overlapping outer folds. The observed high-to-low subset is not a demonstration of durable recovery, causal efficacy, healthspan extension, or human longevity.", "", "Execution details, thread limits, exit code, runtime, and every result file's size/SHA256 are retained in EXECUTION.json. Raw stdout/stderr is retained in evaluate.log. RESULTS.json holds all six models in every mode, selected candidate families, class-availability diagnostics, and post-run frozen-source verification. The independent reviewer reconciles predictions and losses separately.", ""]
    (here / "RESULTS.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
