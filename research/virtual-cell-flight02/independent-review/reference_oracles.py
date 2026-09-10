"""Independent scalar/record oracles. All examples are synthetic, never Tahoe data."""
from collections import defaultdict
from math import ceil

import numpy as np


def record_source_summary(records, source_lines):
    """Use only observed source records; missing pairs are absent, never zero."""
    selected = defaultdict(list)
    seen = set()
    for cell, treatment, value in records:
        key = (cell, treatment)
        if key in seen:
            raise ValueError("duplicate context/treatment")
        seen.add(key)
        if cell not in source_lines:
            continue
        array = np.asarray(value, dtype=float)
        if not np.isfinite(array).all():
            raise ValueError("nonfinite training response")
        selected[treatment].append((cell, array))
    output = {}
    for treatment, observations in selected.items():
        n = len(observations)
        if n < 2:
            continue
        prediction = np.asarray([sum(float(v[g]) for _, v in observations) / n
                                 for g in range(len(observations[0][1]))])
        residuals = {}
        for cell, value in observations:
            others = [v for other, v in observations if other != cell]
            left_out_prediction = [sum(float(v[g]) for v in others) / len(others)
                                   for g in range(len(value))]
            residuals[cell] = sum((float(value[g]) - left_out_prediction[g]) ** 2
                                  for g in range(len(value))) / len(value)
        output[treatment] = {"prediction": prediction, "count": n, "residuals": residuals,
                             "mean_risk": sum(residuals.values()) / n}
    return output


def scalar_kernel_risk(source_coordinates, query_coordinates, ledger, bandwidth, kappa):
    """A loop-based oracle in provided coordinates, independent of PCA implementation."""
    keys = list(ledger)
    squared_distances = [sum((float(a) - float(b)) ** 2
                             for a, b in zip(source_coordinates[c], query_coordinates))
                         for c in keys]
    logs = [-d / (2 * bandwidth**2) for d in squared_distances]
    weights = [float(np.exp(v - max(logs))) for v in logs]
    total = sum(weights)
    weights = [w / total for w in weights]
    effective = 1 / sum(w * w for w in weights)
    local = sum(w * ledger[c] for w, c in zip(weights, keys))
    mean = sum(ledger.values()) / len(ledger)
    shrink = effective / (effective + kappa)
    return {"risk": shrink * local + (1 - shrink) * mean, "n_eff": effective,
            "local_risk": local, "mean_risk": mean}


def equal_line_risk(selected_losses):
    """Primary aggregation is equal treatment weights within equal-weight lines."""
    if not selected_losses or any(not losses for losses in selected_losses.values()):
        raise ValueError("No eligible observations in a scored line")
    return sum(sum(values) / len(values) for values in selected_losses.values()) / len(selected_losses)


def retained_count(fraction, eligible_count):
    if not 0 < fraction <= 1 or eligible_count < 1:
        raise ValueError("Invalid coverage or eligibility")
    return ceil(fraction * eligible_count)


def run_oracle_self_checks():
    # Missing C/drugA must not dilute its source mean; doses remain independent.
    records = [
        ("A", "[('drugA', 0.05, 'uM')]", [2, 4]),
        ("B", "[('drugA', 0.05, 'uM')]", [4, 8]),
        ("A", "[('drugA', 0.5, 'uM')]", [20, 40]),
        ("B", "[('drugA', 0.5, 'uM')]", [40, 80]),
        ("C", "other ", [999, 999]),
        ("OUTER", "[('drugA', 0.05, 'uM')]", [1e9, 1e9]),
    ]
    result = record_source_summary(records, {"A", "B", "C"})
    low = result["[('drugA', 0.05, 'uM')]"]
    assert low["count"] == 2 and np.array_equal(low["prediction"], [3, 6])
    assert low["residuals"] == {"A": 10.0, "B": 10.0}
    assert len(result) == 2
    assert np.array_equal(result["[('drugA', 0.5, 'uM')]"]["prediction"], [30, 60])
    # Equal-line averaging must differ from row-weighted pooling.
    assert equal_line_risk({"short": [100.0], "long": [0.0] * 9}) == 50.0
    assert retained_count(.75, 3) == 3 and retained_count(.75, 5) == 4
    # Context-dependent risk must reverse across a hand-built pair of source ledgers.
    coords = {"A": [0], "B": [1], "C": [2], "D": [3]}
    left = {"A": 16.0, "B": 16.0, "C": 16.0, "D": 144.0}
    right = {"A": 144.0, "B": 16.0, "C": 16.0, "D": 16.0}
    l0 = scalar_kernel_risk(coords, [0], left, .5, 0)
    r0 = scalar_kernel_risk(coords, [0], right, .5, 0)
    l3 = scalar_kernel_risk(coords, [3], left, .5, 0)
    r3 = scalar_kernel_risk(coords, [3], right, .5, 0)
    assert l0["risk"] < r0["risk"] and l3["risk"] > r3["risk"]
    assert l0["mean_risk"] == r0["mean_risk"] == 48.0
    assert all(1 <= q["n_eff"] <= 4 for q in (l0, r0, l3, r3))
    return {"reference_self_checks": "PASS", "missing_pair_mean": [3, 6],
            "dose_separation_means": [[3, 6], [30, 60]], "macro_risk": 50.0,
            "left_context_risks": [l0["risk"], r0["risk"]],
            "right_context_risks": [l3["risk"], r3["risk"]],
            "real_outcome_access": False}


if __name__ == "__main__":
    import json
    print(json.dumps(run_oracle_self_checks(), indent=2))
