"""Recovery Lab frozen-candidate machinery. Importing never fits a model.

Features use past observed data only; endpoint adjudication is separate.
No continuous latent health or biological recovery is asserted.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ORDINAL = (
    "breathing_rate_depth", "coat_condition", "piloerection", "dermatitis",
    "pallor_and_or_cyanosis", "kyphosis", "hunched", "body_condition",
    "eye_discharge_eyelid_inflammation", "changes_to_the_globe",
    "response_to_analgesic", "peri_retro_orbital_swelling", "nasal_discharge",
    "rectal_prolapse", "vaginal_uterine_prolapse", "diarrhea", "tail_stiffening",
    "vestibular_disturbance", "gait_disorders", "tremor", "activity",
    "response_to_external_stimuli", "paralysis", "tumors", "distended_abdomen",
    "urine", "dehydration_reduced_skin_turgor", "malocclusions",
    "head_piloerection", "thoracic_mass",
)
CLASSES = (0, 1, 2)  # below threshold, high severe-coded burden, FD/ES/RE
CLASS_NAMES = ("low", "high", "death_or_euthanasia")
MODES = ("primary", "complete_items", "exclude_analgesic")
MODEL_NAMES = ("transition", "current", "history", "duration", "duration_hgb", "candidate")
C_GRID = (.1, 1., 10.)
SEED = "recovery-lab-2026-09-10-v1"
EXPECTED_INPUTS = {
    "animals.csv": "80bf2cfbf73c3272b45766b9e6d124998c90aec0defd70009b2f1fe9932cde73",
    "visits.csv": "4c66aff2424a9fdceeb2a08dca76d69a42c1220265591beedc91581acf009991",
}


def load_inputs(directory):
    directory = Path(directory)
    for name, digest in EXPECTED_INPUTS.items():
        if hashlib.sha256((directory / name).read_bytes()).hexdigest() != digest:
            raise ValueError(f"Pinned input hash mismatch: {name}")
    animals = pd.read_csv(directory / "animals.csv", keep_default_na=False)
    visits = pd.read_csv(directory / "visits.csv")
    animals["date_exit"] = pd.to_datetime(animals["date_exit"], errors="raise")
    animals["date_born"] = pd.to_datetime(animals["date_born"], errors="raise")
    animals["endpoint_chronology_valid"] = animals["endpoint_chronology_valid"].astype(str).str.lower().eq("true")
    visits["collection_date"] = pd.to_datetime(visits["collection_date"], errors="raise")
    if animals.animal_id.duplicated().any() or visits.duplicated(["animal_id", "collection_date"]).any():
        raise ValueError("Duplicate animal identity or observation date")
    return animals, visits


def normalized_items(visit, mode="primary"):
    fields = [f for f in ORDINAL if not (mode == "exclude_analgesic" and f == "response_to_analgesic")]
    values = np.array([visit.get(f, np.nan) for f in fields], dtype=float)
    if np.isinf(values).any():
        raise ValueError("Infinite ordinal score")
    if "dermatitis" in fields:
        ix = fields.index("dermatitis")
        if values[ix] in (.25, .75):
            values[ix] = .5
    if np.any(np.isfinite(values) & ~np.isin(values, [0., .5, 1.])):
        raise ValueError("Invalid normalized ordinal score")
    missing = int(np.isnan(values).sum())
    severe = int((values == 1).sum())
    state = 1 if severe >= 4 else 0 if severe + missing < 4 else -1
    if mode == "complete_items" and missing:
        state = -1
    return fields, values, severe, missing, state


def feature_row(history, mode="primary"):
    """history must end at landmark. Later observations are neither required nor used."""
    if len(history) == 0:
        raise ValueError("Empty history")
    history = history.sort_values("collection_date", kind="stable")
    current = history.iloc[-1]
    t = current.collection_date
    fields, values, severe, missing, state = normalized_items(current, mode)
    current_features = {
        "age_days": float(current.age_days), "diet": str(current.diet),
        "assessor_id": str(current.assessor_id) if pd.notna(current.assessor_id) else "MISSING",
        "current_state": float(state), "current_severe_lower": float(severe),
        "current_missing_items": float(missing), "body_weight": float(current.body_weight),
        "temperature": float(current.temperature),
    }
    for field, value in zip(fields, values):
        current_features[field] = value
        current_features[field + "_missing"] = float(np.isnan(value))
    recent = history.loc[history.collection_date >= t - pd.Timedelta(days=30)]
    history_features = dict(current_features)
    history_features["past30_observed_days"] = float((t - recent.iloc[0].collection_date).days)
    history_features["past30_assessment_count"] = float(len(recent))
    older = recent.iloc[0]
    _, older_values, _, _, _ = normalized_items(older, mode)
    for field, now, old in zip(fields, values, older_values):
        history_features["delta30_" + field] = now - old
    x = np.array([(v - t).days for v in recent.collection_date], dtype=float)
    for field in ("body_weight", "temperature"):
        yy = recent[field].to_numpy(dtype=float)
        valid = np.isfinite(yy)
        history_features[field + "_delta30"] = float(current[field] - older[field])
        history_features[field + "_pctdelta30"] = float(100 * (current[field] - older[field]) / older[field]) if pd.notna(older[field]) and older[field] != 0 else np.nan
        history_features[field + "_std30"] = float(np.std(yy[valid])) if valid.sum() >= 2 else np.nan
        history_features[field + "_slope30"] = float(np.dot(x[valid] - x[valid].mean(), yy[valid] - yy[valid].mean()) / np.square(x[valid] - x[valid].mean()).sum()) if valid.sum() >= 2 and np.ptp(x[valid]) > 0 else np.nan
    txw = recent.body_weight.to_numpy(dtype=float) * recent.temperature.to_numpy(dtype=float)
    history_features["txw_mean30"] = float(np.nanmean(txw)) if np.isfinite(txw).any() else np.nan
    history_features["txw_available30"] = float(np.isfinite(txw).sum())
    states = [normalized_items(row, mode)[4] for _, row in history.iterrows()]
    dates = list(history.collection_date)
    start = len(states) - 1
    if state >= 0:
        while start > 0 and states[start - 1] == state and (dates[start] - dates[start - 1]).days <= 14:
            start -= 1
    left_censored = state < 0 or start == 0 or states[start - 1] < 0 or (dates[start] - dates[start - 1]).days > 14
    duration_features = dict(history_features)
    duration_features["observed_run_days"] = float((t - dates[start]).days) if state >= 0 else np.nan
    duration_features["run_left_censored"] = float(left_censored)
    candidate_features = dict(duration_features)
    recovery_dates = [dates[i] for i in range(1, len(states)) if states[i - 1] == 1 and states[i] == 0 and (dates[i] - dates[i - 1]).days <= 14]
    candidate_features["prior_observed_recovery_count"] = float(len(recovery_dates))
    candidate_features["days_since_observed_recovery"] = float((t - recovery_dates[-1]).days) if recovery_dates else np.nan
    candidate_features["prior_recovery_available"] = float(bool(recovery_dates))
    # Complete-item left endpoint step integral; omit entire gaps>14days.
    # Earlier-than-enrollment and missing/gapped time is explicitly unrepresented.
    integral, represented = 0., 0.
    cutoff = t - pd.Timedelta(days=60)
    for i in range(len(history) - 1):
        left, right = dates[i], dates[i + 1]
        _, _, burden, absent, _ = normalized_items(history.iloc[i], mode)
        if absent or (right - left).days > 14:
            continue
        duration = max(0., float((min(right, t) - max(left, cutoff)).days))
        integral += burden * duration
        represented += duration
    candidate_features["severe_item_days60"] = integral
    candidate_features["burden_represented_days60"] = represented
    candidate_features["burden_unrepresented_days60"] = 60. - represented
    return {
        "current": current_features, "history": history_features,
        "duration": duration_features, "duration_hgb": duration_features,
        "candidate": candidate_features,
        "transition": {"current_state": state, "diet": str(current.diet), "age_bin": int(float(current.age_days) // 90)},
    }


def adjudicate(history_all, index, animal, mode="primary"):
    """Fixed assessment-window proxy. Future information is used ONLY for label."""
    current = history_all.iloc[index]
    t = current.collection_date
    end = t + pd.Timedelta(days=9)
    exit_date = animal.date_exit
    reason = str(animal.exit_reason_raw)
    future = history_all.iloc[index + 1:]
    candidates = []
    window_count, complete_count = 0, 0
    for _, row in future.iterrows():
        gap = int((row.collection_date - t).days)
        if 5 <= gap <= 9:
            window_count += 1
            _, _, _, missing, state = normalized_items(row, mode)
            complete_count += missing == 0
            if state >= 0:
                candidates.append((abs(gap - 7), gap, row, missing, state))
    result = {"label": -1, "label_reason": "no_assessment_in_window" if window_count == 0 else "unidentifiable_burden", "outcome_date": None, "outcome_gap_days": None, "target_complete": False,
              "window_assessment_count": window_count, "window_complete_count": complete_count, "window_identifiable_count": len(candidates)}
    if pd.notna(exit_date) and t < exit_date <= end:
        result["label"] = 2 if reason in ("FD", "ES", "RE") else -1
        result["label_reason"] = "terminal_" + reason if result["label"] == 2 else "other_exit_" + (reason or "unknown")
        result["outcome_date"] = exit_date.isoformat()
        return result
    established_alive = (reason in ("FD", "ES", "RE") and pd.notna(exit_date) and exit_date > end) or bool((future.collection_date > end).any())
    if not candidates:
        return result
    _, gap, row, missing, state = min(candidates, key=lambda v: (v[0], v[1]))
    result["target_complete"] = missing == 0
    if not established_alive:
        result["label_reason"] = "survival_through_day9_unestablished"
        return result
    result.update(label=int(state), label_reason="observed_burden", outcome_date=row.collection_date.isoformat(), outcome_gap_days=gap, target_complete=missing == 0)
    return result


@dataclass
class Dataset:
    metadata: pd.DataFrame
    features: dict[str, pd.DataFrame]


def build_dataset(animals, visits, mode="primary", include_features=True):
    if mode not in MODES:
        raise ValueError(mode)
    rows, features = [], {name: [] for name in MODEL_NAMES}
    animals = animals.set_index("animal_id", drop=False)
    for animal_id, seq in visits.groupby("animal_id", sort=True):
        animal = animals.loc[animal_id]
        if not bool(animal.endpoint_chronology_valid):
            continue
        seq = seq.sort_values("collection_date", kind="stable").reset_index(drop=True)
        for i, visit in seq.iterrows():
            t = visit.collection_date
            if (t - seq.iloc[0].collection_date).days < 30 or i < 3 or t == animal.date_exit:
                continue
            _, _, _, missing, state = normalized_items(visit, mode)
            # Retain intended landmarks in every mode; unusable current items are
            # explicit unresolved sensitivity labels, not silently removed rows.
            outcome = adjudicate(seq, i, animal, mode)
            if mode == "complete_items" and missing:
                outcome.update(label=-1, label_reason="current_items_incomplete")
            row = {
                "landmark_id": animal_id + "|" + t.date().isoformat(),
                "animal_id": animal_id, "source_id": animal.source_id,
                "strain": animal.strain, "diet": animal.diet, "sex": animal.sex,
                "landmark_date": t.date().isoformat(), "current_state": state,
                "current_missing_items": missing, "current_complete": missing == 0,
                **outcome,
            }
            rows.append(row)
            if include_features:
                computed = feature_row(seq.iloc[:i + 1], mode)
                for name in MODEL_NAMES:
                    features[name].append(computed[name])
    return Dataset(pd.DataFrame(rows), {name: pd.DataFrame(data) for name, data in features.items()})


def assign_folds(metadata, nfolds=5, seed=SEED):
    animals = metadata[["animal_id", "diet"]].drop_duplicates()
    if animals.animal_id.duplicated().any():
        raise ValueError("Animal has inconsistent diet")
    mapping = {}
    for _, group in animals.groupby("diet", sort=True):
        ordered = sorted(group.animal_id, key=lambda aid: (hashlib.sha256((seed + "|" + aid).encode()).hexdigest(), aid))
        mapping.update({aid: i % nfolds for i, aid in enumerate(ordered)})
    return np.array([mapping[aid] for aid in metadata.animal_id], dtype=int)


def animal_weights(ids):
    ids = np.asarray(ids)
    _, inverse, counts = np.unique(ids, return_inverse=True, return_counts=True)
    weights = 1. / counts[inverse]
    return weights / weights.mean()


def brier_losses(labels, probabilities):
    labels = np.asarray(labels, dtype=int)
    probabilities = np.asarray(probabilities, dtype=float)
    if np.any(~np.isin(labels, CLASSES)) or probabilities.shape != (len(labels), 3):
        raise ValueError("Invalid labels/probability shape")
    if not np.isfinite(probabilities).all() or np.any(probabilities < 0) or not np.allclose(probabilities.sum(axis=1), 1):
        raise ValueError("Invalid probabilities")
    return np.square(probabilities - np.eye(3)[labels]).sum(axis=1)


def macro_mean(values, ids):
    frame = pd.DataFrame({"value": values, "animal": ids})
    return float(frame.groupby("animal", sort=True).value.mean().mean())


class Transition:
    """Smoothed training-only conditional class frequencies, with fixed backoff."""
    def fit(self, x, y, ids):
        weight = animal_weights(ids)
        self.global_counts = np.bincount(y, weights=weight, minlength=3) + 1.
        self.table = {}
        for key in ("state", "state_diet", "state_diet_age"):
            self.table[key] = {}
        for i, row in x.reset_index(drop=True).iterrows():
            for kind, key in self.keys(row):
                self.table[kind].setdefault(key, np.ones(3))[int(y[i])] += weight[i]
        self.absent_classes = sorted(set(CLASSES) - set(y))
        return self

    @staticmethod
    def keys(row):
        s = int(row.current_state)
        return (("state", (s,)), ("state_diet", (s, str(row.diet))), ("state_diet_age", (s, str(row.diet), int(row.age_bin))))

    def predict_proba(self, x):
        result = []
        for _, row in x.iterrows():
            counts = self.global_counts
            for kind, key in self.keys(row):
                counts = self.table[kind].get(key, counts)
            result.append(counts / counts.sum())
        return np.array(result)


class Predictor:
    def __init__(self, family="logistic", c=1.):
        self.family, self.c = family, c

    def fit(self, x, y, ids):
        y = np.asarray(y, dtype=int)
        if not len(y) or np.any(~np.isin(y, CLASSES)):
            raise ValueError("Training requires resolved labels")
        self.absent_classes = sorted(set(CLASSES) - set(y))
        self.constant = None
        if len(np.unique(y)) < 2:
            counts = np.bincount(y, weights=animal_weights(ids), minlength=3) + 1.
            self.constant = counts / counts.sum()
            return self
        cats = [c for c in x.columns if c in ("diet", "assessor_id")]
        nums = [c for c in x.columns if c not in cats]
        numeric = Pipeline([("impute", SimpleImputer(strategy="median", keep_empty_features=True)), ("scale", StandardScaler())])
        preprocessing = ColumnTransformer([
            ("numeric", numeric, nums),
            ("categorical", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cats),
        ])
        if self.family == "logistic":
            estimator = LogisticRegression(C=self.c, solver="lbfgs", max_iter=2000, random_state=1701)
        elif self.family == "hgb":
            estimator = HistGradientBoostingClassifier(max_iter=100, max_leaf_nodes=7, l2_regularization=1., early_stopping=False, random_state=1701)
        else:
            raise ValueError(self.family)
        self.pipeline = Pipeline([("preprocess", preprocessing), ("model", estimator)])
        self.pipeline.fit(x, y, model__sample_weight=animal_weights(ids))
        return self

    def predict_proba(self, x):
        if self.constant is not None:
            return np.tile(self.constant, (len(x), 1))
        partial = self.pipeline.predict_proba(x)
        full = np.zeros((len(x), 3))
        full[:, self.pipeline.named_steps["model"].classes_.astype(int)] = partial
        return full


def settings(name):
    if name == "transition":
        return [("transition", 0.)]
    if name == "duration_hgb":
        return [("hgb", 0.)]
    result = [("logistic", c) for c in C_GRID]
    return result + [("hgb", 0.)] if name == "candidate" else result


def fit_model(name, setting, x, y, ids):
    if name == "transition":
        return Transition().fit(x, np.asarray(y), np.asarray(ids))
    return Predictor(*setting).fit(x, y, ids)


def select_setting(name, x, labels, metadata, seed):
    """Metadata supplied here must contain ONLY outer training animals."""
    folds = assign_folds(metadata, 3, seed)
    choices = settings(name)
    if len(choices) == 1:
        return choices[0], []
    records = []
    for setting in choices:
        prediction = np.full((len(labels), 3), np.nan)
        absent = []
        for fold in range(3):
            train = (folds != fold) & (labels >= 0)
            test = (folds == fold) & (labels >= 0)
            if not train.any() or not test.any():
                raise ValueError("Empty inner training/validation fold")
            model = fit_model(name, setting, x.loc[train], labels[train], metadata.animal_id.to_numpy()[train])
            prediction[test] = model.predict_proba(x.loc[test])
            absent.append({"fold": fold, "classes": model.absent_classes})
        valid = labels >= 0
        value = macro_mean(brier_losses(labels[valid], prediction[valid]), metadata.animal_id.to_numpy()[valid])
        records.append({"family": setting[0], "c": setting[1], "inner_brier": value, "absent_classes": absent})
    best = min(range(len(records)), key=lambda i: (records[i]["inner_brier"], i))
    return choices[best], records
