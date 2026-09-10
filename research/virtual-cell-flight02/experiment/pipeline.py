"""Source-only mean transfer and nested context-local residual-risk ranking.

All arrays are ordinary NumPy arrays. No file access, downloads, target-outcome
lookup, or mutable global model state occurs in this module.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import math
from typing import NamedTuple

import numpy as np

COVERAGES = (1.0, 0.9, 0.75, 0.5)
RANKINGS = ("candidate", "disagreement", "treatment_risk", "magnitude", "random")
CONVENTIONAL = RANKINGS[1:]
RANDOM_REPEATS = 100
TIE_PREFIX = "EA-VC-Tahoe-v1|rank-tie|"


class Setting(NamedTuple):
    bandwidth: float | None
    kappa: float

    @property
    def label(self) -> str:
        return "uniform" if self.bandwidth is None else f"b{self.bandwidth:g}_k{self.kappa:g}"


# Order also defines exact-loss tie preference: uniform, larger kappa, larger b.
SETTINGS = (Setting(None, 0.0),) + tuple(
    Setting(b, k) for k in (16.0, 4.0, 0.0) for b in (2.0, 1.0, 0.5)
)


def unique_strings(values, name: str) -> np.ndarray:
    result = np.asarray(values)
    if result.ndim != 1 or any(not isinstance(x, (str, np.str_)) for x in result):
        raise ValueError(f"{name} must contain exact string identifiers")
    if len(set(result.tolist())) != len(result) or any(x == "" for x in result):
        raise ValueError(f"{name} must be nonempty unique identifiers")
    return result.astype(str)


def checked_source(y, observed):
    y = np.asarray(y, dtype=np.float64)
    observed = np.asarray(observed)
    if y.ndim != 3 or not all(y.shape) or observed.shape != y.shape[:2]:
        raise ValueError("Expected nonempty source[context,treatment,gene] and matching mask")
    if observed.dtype != np.bool_:
        raise ValueError("Observed-pair mask must be boolean")
    if not np.isfinite(y[observed]).all():
        raise ValueError("Nonfinite observed source response")
    return y, observed


@dataclass
class ControlMap:
    feature_ids: np.ndarray
    selected_indices: np.ndarray
    center: np.ndarray
    components: np.ndarray
    source_ids: tuple[str, ...]

    def transform(self, x, feature_ids=None) -> np.ndarray:
        x = np.asarray(x, dtype=np.float64)
        if x.ndim != 2 or x.shape[1] != len(self.feature_ids):
            raise ValueError("Control feature dimensions differ")
        if feature_ids is not None and not np.array_equal(np.asarray(feature_ids), self.feature_ids):
            raise ValueError("Control feature IDs/order differ")
        if not np.isfinite(x).all() or (x < 0).any():
            raise ValueError("Control covariates must be finite nonnegative released means")
        return (np.log1p(x[:, self.selected_indices]) - self.center) @ self.components.T

    def manifest(self):
        return {"source_ids": list(self.source_ids),
                "selected_feature_ids": self.feature_ids[self.selected_indices].tolist(),
                "components": len(self.components),
                "transform": "log1p(ref_mean); source variance selection; centered PCA, no whitening"}


def fit_control_map(x, feature_ids, context_ids=None, max_features=2048, components=8) -> ControlMap:
    x = np.asarray(x, dtype=np.float64)
    features = unique_strings(feature_ids, "Control features")
    if x.ndim != 2 or x.shape[1] != len(features) or x.shape[0] < 2:
        raise ValueError("At least two control profiles and aligned features required")
    if not np.isfinite(x).all() or (x < 0).any():
        raise ValueError("Invalid control covariate")
    if max_features < 1 or components < 1:
        raise ValueError("Positive feature/component limits required")
    ids = unique_strings(context_ids if context_ids is not None else [str(i) for i in range(len(x))], "Source contexts")
    if len(ids) != len(x):
        raise ValueError("Control context IDs differ")
    # Canonical source order makes sums/SVD independent of incoming row storage.
    x = x[np.argsort(ids, kind="stable")]
    logx = np.log1p(x)
    variance = np.var(logx, axis=0, dtype=np.float64)
    order = sorted(range(len(features)), key=lambda i: (-float(variance[i]), features[i]))
    selected = np.asarray([i for i in order if variance[i] > 0][:max_features], dtype=int)
    if not len(selected):
        return ControlMap(features, selected, np.zeros(0), np.zeros((0, 0)), tuple(sorted(ids)))
    chosen = logx[:, selected]
    center = chosen.mean(axis=0)
    centered = chosen - center
    _, singular, vt = np.linalg.svd(centered, full_matrices=False)
    tolerance = max(centered.shape) * np.finfo(float).eps * singular[0]
    rank = min(components, len(x) - 1, int(np.sum(singular > tolerance)))
    return ControlMap(features, selected, center, vt[:rank], tuple(sorted(ids)))


@dataclass
class MeanModel:
    mean: np.ndarray
    support: np.ndarray
    variance: np.ndarray
    loo_error: np.ndarray
    treatment_risk: np.ndarray
    observed: np.ndarray
    magnitude: np.ndarray


def fit_mean(y, observed) -> MeanModel:
    y, observed = checked_source(y, observed)
    support = observed.sum(axis=0)
    clean = np.where(observed[:, :, None], y, 0.0)
    total = clean.sum(axis=0, dtype=np.float64)
    mu = np.divide(total, support[:, None], out=np.zeros_like(total), where=support[:, None] > 0)
    centered = np.where(observed[:, :, None], clean - mu, 0.0)
    ss = np.mean(centered ** 2, axis=2).sum(axis=0)
    variance = np.divide(ss, support - 1, out=np.full(len(support), np.nan), where=support >= 2)
    # Leave-one-out residual = n/(n-1) times centered source response.
    multiplier = np.divide(support, support - 1, out=np.zeros(len(support), float), where=support >= 2)
    loo = np.mean(centered ** 2, axis=2) * multiplier[None, :] ** 2
    loo[~observed | (support[None, :] < 2)] = np.nan
    risk = np.divide(np.where(np.isfinite(loo), loo, 0).sum(axis=0), support,
                     out=np.full(len(support), np.nan), where=support >= 2)
    magnitude = np.mean(mu ** 2, axis=1)
    if not np.isfinite(mu).all() or not np.isfinite(magnitude).all():
        raise ValueError("Overflow in source response reduction")
    if not np.isfinite(variance[support >= 2]).all() or not np.isfinite(risk[support >= 2]).all():
        raise ValueError("Overflow in residual-risk ledger")
    return MeanModel(mu, support, variance, loo, risk, observed.copy(), magnitude)


def source_bandwidth(z_source):
    z = np.asarray(z_source, dtype=np.float64)
    if z.ndim != 2 or not np.isfinite(z).all():
        raise ValueError("Invalid source coordinates")
    distances = np.linalg.norm(z[:, None, :] - z[None, :, :], axis=2)
    positive = distances[np.triu_indices(len(z), 1)]
    positive = positive[positive > 0]
    return float(np.median(positive)) if len(positive) else None


def risk_scores(model: MeanModel, z_source, z_dest, setting: Setting):
    source, dest = np.asarray(z_source, float), np.asarray(z_dest, float)
    if source.ndim != 2 or dest.ndim != 2 or source.shape[1] != dest.shape[1] or len(source) != len(model.observed):
        raise ValueError("Risk coordinate axes differ")
    if not np.isfinite(source).all() or not np.isfinite(dest).all():
        raise ValueError("Nonfinite risk coordinates")
    if setting not in SETTINGS:
        raise ValueError("Setting is outside the frozen grid")
    h0 = source_bandwidth(source)
    output = np.full((len(dest), len(model.support)), np.nan)
    effective = output.copy()
    for c, point in enumerate(dest):
        distance2 = np.sum((source - point) ** 2, axis=1)
        if not np.isfinite(distance2).all():
            raise ValueError("Overflow in control distances")
        for d in np.flatnonzero(model.support >= 2):
            selected = model.observed[:, d]
            if setting.bandwidth is None or h0 is None:
                weights = np.ones(int(selected.sum()), dtype=float)
            else:
                scaled = distance2[selected] / (2 * (setting.bandwidth * h0) ** 2)
                if not np.isfinite(scaled).all():
                    raise ValueError("Nonfinite kernel scale")
                weights = np.exp(-(scaled - scaled.min()))
            weights /= weights.sum()
            neff = 1.0 / float(weights @ weights)
            local = float(weights @ model.loo_error[selected, d])
            fraction = neff / (neff + setting.kappa)
            output[c, d] = fraction * local + (1 - fraction) * model.treatment_risk[d]
            effective[c, d] = neff
    return {"scores": output, "effective_support": effective, "source_bandwidth": h0}


def retained_indices(scores, treatment_ids, fraction, observed=None):
    score = np.asarray(scores, dtype=float)
    treatments = unique_strings(treatment_ids, "Treatments")
    mask = np.ones(len(treatments), bool) if observed is None else np.asarray(observed)
    if score.shape != (len(treatments),) or mask.shape != score.shape or mask.dtype != np.bool_:
        raise ValueError("Ranking axes/mask differ")
    if not 0 < fraction <= 1 or not mask.any():
        raise ValueError("Nonempty ranking and coverage in (0,1] required")
    if not np.isfinite(score[mask]).all():
        raise ValueError("Undefined risk for an observed target; no silent exclusion")
    tie = lambda i: hashlib.sha256((TIE_PREFIX + treatments[i]).encode()).hexdigest()
    ordered = sorted(np.flatnonzero(mask).tolist(), key=lambda i: (float(score[i]), tie(i)))
    return np.asarray(ordered[:math.ceil(fraction * len(ordered))], dtype=int)


def score_line(pred, truth, observed):
    pred, truth, observed = np.asarray(pred, float), np.asarray(truth, float), np.asarray(observed)
    if pred.ndim != 2 or pred.shape != truth.shape or observed.shape != pred.shape[:1] or observed.dtype != np.bool_:
        raise ValueError("Score axes/mask differ")
    if not observed.any() or not np.isfinite(pred[observed]).all() or not np.isfinite(truth[observed]).all():
        raise ValueError("Unscorable line or nonfinite scored values")
    result = np.full(len(pred), np.nan)
    result[observed] = np.mean((pred[observed] - truth[observed]) ** 2, axis=1)
    if not np.isfinite(result[observed]).all():
        raise ValueError("Nonfinite squared-error result")
    return result


def calibrate(y, observed, controls, feature_ids, context_ids, inner_group_ids, treatment_ids):
    """Nested tuning: rebuild base/LOO labels/transforms inside each inner source."""
    y, observed = checked_source(y, observed)
    ids = unique_strings(context_ids, "Context IDs")
    groups = np.asarray(inner_group_ids)
    controls = np.asarray(controls, float)
    if len(ids) != len(y) or groups.shape != (len(y),) or controls.shape[0] != len(y):
        raise ValueError("Calibration context axes differ")
    if len(set(groups.tolist())) < 2:
        raise ValueError("At least two whole-context groups required")
    losses = {s.label: [] for s in SETTINGS}
    records = []
    for group in sorted(set(groups.tolist())):
        train = np.flatnonzero(groups != group)
        valid = np.flatnonzero(groups == group)
        train = np.asarray(sorted(train, key=lambda i: ids[i]))
        valid = np.asarray(sorted(valid, key=lambda i: ids[i]))
        model = fit_mean(y[train], observed[train])
        if ((model.support < 2)[None, :] & observed[valid]).any():
            raise ValueError("Inner validation treatment has fewer than two source lines")
        transform = fit_control_map(controls[train], feature_ids, ids[train])
        zs, zv = transform.transform(controls[train]), transform.transform(controls[valid])
        candidate_risks = {s.label: risk_scores(model, zs, zv, s)["scores"] for s in SETTINGS}
        for j, index in enumerate(valid):
            actual_loss = score_line(model.mean, y[index], observed[index])
            line_record = {"validation_context": ids[index], "inner_group": str(group),
                           "source_contexts": ids[train].tolist(), "setting_losses": {}}
            for setting in SETTINGS:
                retained = retained_indices(candidate_risks[setting.label][j], treatment_ids, 0.75, observed[index])
                loss = float(np.mean(actual_loss[retained]))
                losses[setting.label].append(loss)
                line_record["setting_losses"][setting.label] = loss
            records.append(line_record)
    averages = {name: float(np.mean(value)) for name, value in losses.items()}
    chosen = min(SETTINGS, key=lambda s: (averages[s.label], SETTINGS.index(s)))
    return chosen, {"selected": chosen.label, "mean_inner_line_risk": averages, "lines": records}


def descriptive_ridge(y, observed, z_source, z_dest, alpha=1.0):
    """Fixed-alpha ridge on source-standardized PCA scores, with unpenalized intercept."""
    y, observed = checked_source(y, observed)
    source, dest = np.asarray(z_source, float), np.asarray(z_dest, float)
    if source.ndim != 2 or dest.ndim != 2 or len(source) != len(y) or source.shape[1] != dest.shape[1]:
        raise ValueError("Ridge coordinate axes differ")
    if not np.isfinite(source).all() or not np.isfinite(dest).all() or alpha <= 0 or not np.isfinite(alpha):
        raise ValueError("Invalid ridge input")
    scale = source.std(axis=0)
    scale[scale == 0] = 1
    source, dest = source / scale, dest / scale
    prediction = np.zeros((len(dest), y.shape[1], y.shape[2]))
    for d in range(y.shape[1]):
        mask = observed[:, d]
        if not mask.any():
            raise ValueError("Descriptive ridge has no treatment support")
        x, target = source[mask], y[mask, d]
        center, intercept = x.mean(axis=0), target.mean(axis=0)
        x = x - center
        beta = np.linalg.solve(x.T @ x / len(x) + alpha * np.eye(x.shape[1]),
                               x.T @ (target - intercept) / len(x))
        prediction[:, d] = intercept + (dest - center) @ beta
    if not np.isfinite(prediction).all():
        raise ValueError("Nonfinite descriptive ridge prediction")
    return prediction


def fit_predict_outer(y, observed, controls, feature_ids, context_ids, inner_group_ids,
                      treatment_ids, test_controls):
    """Only source responses and destination controls enter this function."""
    context_ids = unique_strings(context_ids, "Contexts")
    order = np.argsort(context_ids, kind="stable")
    y, observed = np.asarray(y)[order], np.asarray(observed)[order]
    controls = np.asarray(controls)[order]
    ids, groups = context_ids[order], np.asarray(inner_group_ids)[order]
    selected, tuning = calibrate(y, observed, controls, feature_ids, ids, groups, treatment_ids)
    model = fit_mean(y, observed)
    transform = fit_control_map(controls, feature_ids, ids)
    source_z, dest_z = transform.transform(controls), transform.transform(test_controls)
    candidate = risk_scores(model, source_z, dest_z, selected)
    return {
        "mean_prediction": model.mean,
        "ridge_prediction": descriptive_ridge(y, observed, source_z, dest_z),
        "rank_scores": {
            "candidate": candidate["scores"],
            "disagreement": np.broadcast_to(model.variance, candidate["scores"].shape),
            "treatment_risk": np.broadcast_to(model.treatment_risk, candidate["scores"].shape),
            "magnitude": np.broadcast_to(model.magnitude, candidate["scores"].shape),
        },
        "effective_support": candidate["effective_support"],
        "source_support": model.support,
        "tuning": tuning,
        "control_map": transform.manifest(),
        "source_bandwidth": candidate["source_bandwidth"],
        "source_ids": ids.tolist(),
    }


def random_order(treatment_ids, context_id, repeat, observed):
    """Hash permutation independent of NumPy RNG version and input row ordering."""
    ids = unique_strings(treatment_ids, "Treatments")
    mask = np.asarray(observed)
    if mask.dtype != np.bool_ or mask.shape != ids.shape:
        raise ValueError("Random-order mask differs")
    def key(i):
        value = f"EA-VC-Tahoe-v1|random20260910|{context_id}|{repeat}|{ids[i]}"
        return hashlib.sha256(value.encode()).hexdigest()
    return np.asarray(sorted(np.flatnonzero(mask).tolist(), key=key), dtype=int)


def line_curves(prediction, ridge, truth, observed, scores, treatment_ids, context_id):
    """All selection rules share prediction; supplemental models use each same mask."""
    losses = {"mean": score_line(prediction, truth, observed),
              "zero": score_line(np.zeros_like(prediction), truth, observed),
              "ridge_descriptive": score_line(ridge, truth, observed)}
    records = []
    n = int(np.asarray(observed).sum())
    for strategy in RANKINGS:
        for coverage in COVERAGES:
            repeats = range(RANDOM_REPEATS) if strategy == "random" else range(1)
            for repeat in repeats:
                if strategy == "random":
                    selected = random_order(treatment_ids, context_id, repeat, observed)[:math.ceil(coverage * n)]
                else:
                    selected = retained_indices(scores[strategy], treatment_ids, coverage, observed)
                risk = {name: float(np.mean(value[selected])) for name, value in losses.items()}
                records.append({"context": context_id, "strategy": strategy, "coverage": coverage,
                                "actual_coverage": len(selected) / n, "retained_count": len(selected),
                                "eligible_count": n, "repeat": repeat,
                                "treatments": np.asarray(treatment_ids)[selected].tolist(), "risk": risk,
                                "mean_minus_zero": risk["mean"] - risk["zero"],
                                "mean_over_zero": risk["mean"] / risk["zero"] if risk["zero"] > 0 else None})
    return losses, records


def summarize_curves(records, context_folds):
    """Average random repeats, then lines, never pool unequal treatment counts."""
    by_line = {}
    for row in records:
        key = (row["context"], row["strategy"], row["coverage"])
        by_line.setdefault(key, []).append(row["risk"]["mean"])
    line_risk = {k: float(np.mean(v)) for k, v in by_line.items()}
    for context in context_folds:
        at_full = [line_risk[(context, strategy, 1.0)] for strategy in RANKINGS]
        if not np.allclose(at_full, at_full[0], rtol=1e-13, atol=1e-15):
            raise ValueError("Ranking changed the 100%-coverage base loss")
    overall = {s: {str(q): float(np.mean([line_risk[(c, s, q)] for c in context_folds]))
                   for q in COVERAGES} for s in RANKINGS}
    folds = {}
    for fold in sorted(set(context_folds.values())):
        selected = [c for c, f in context_folds.items() if f == fold]
        folds[str(fold)] = {s: float(np.mean([line_risk[(c, s, 0.75)] for c in selected])) for s in RANKINGS}
    candidate = overall["candidate"]["0.75"]
    strongest = min(overall[s]["0.75"] for s in CONVENTIONAL)
    wins = sum(f["candidate"] < min(f[s] for s in CONVENTIONAL) for f in folds.values())
    passed = strongest > 0 and candidate <= 0.9 * strongest and wins >= 4
    return {"overall_equal_line_mean_risk": overall, "fold_risk_at_75": folds,
            "candidate_fold_wins_vs_best_conventional": wins,
            "strongest_conventional_at_75": min(CONVENTIONAL, key=lambda s: overall[s]["0.75"]),
            "relative_improvement_at_75": 1 - candidate / strongest if strongest > 0 else None,
            "primary_gate_passed": bool(passed),
            "line_risk": [{"context": c, "strategy": s, "coverage": q, "risk": value}
                          for (c, s, q), value in sorted(line_risk.items())]}
