"""Independent synthetic checks. Never load or fit the real mouse data."""

from __future__ import annotations

from contextlib import redirect_stdout
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
EXPERIMENT = HERE.parents[1] / "experiment"
SOURCE_HASHES = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (EXPERIMENT / "pipeline.py", EXPERIMENT / "run.py")}
sys.path.insert(0, str(EXPERIMENT))
import pipeline as p
import run as runner


def visit(day, severe=0, missing=0, animal_id="synthetic-0", **extra):
    fields = {name: (1.0 if i < severe else 0.0) for i, name in enumerate(p.ORDINAL)}
    for field in p.ORDINAL[len(p.ORDINAL) - missing:] if missing else []:
        fields[field] = np.nan
    return {**fields, "animal_id": animal_id, "collection_date": pd.Timestamp("2020-01-01") + pd.Timedelta(days=day),
            "age_days": 700.0 + day, "diet": "AL", "assessor_id": "known-assessor",
            "body_weight": 30.0 - day / 100, "temperature": 37.0, **extra}


def animal(exit_day=200, reason="FD", animal_id="synthetic-0"):
    return pd.Series({"animal_id": animal_id, "source_id": animal_id, "date_born": pd.Timestamp("2018-01-31"),
                      "date_exit": pd.Timestamp("2020-01-01") + pd.Timedelta(days=exit_day) if exit_day is not None else pd.NaT,
                      "exit_reason_raw": reason, "endpoint_chronology_valid": True, "strain": "J:DO", "diet": "AL", "sex": "female"})


def simple_metadata(animals=50, repeats=3):
    rows = []
    for a in range(animals):
        for r in range(repeats):
            rows.append({"animal_id": f"synthetic-{a:03}", "landmark_id": f"synthetic-{a:03}|{r}", "diet": "AL", "strain": "J:DO",
                         "label": -1 if a % 6 == 0 and r == repeats - 1 else r % 3,
                         "current_state": 1, "current_complete": True, "target_complete": True,
                         "label_reason": "synthetic", "outcome_gap_days": 7.0,
                         "window_assessment_count": 1, "window_complete_count": 1,
                         "window_identifiable_count": 1})
    return pd.DataFrame(rows)


class FeaturesAndEndpoint(unittest.TestCase):
    def test_future_poisoning_and_deletion_leave_features_unchanged(self):
        seq = pd.DataFrame([visit(day, severe=(i % 3) * 2) for i, day in enumerate(range(0, 64, 7))])
        animals = pd.DataFrame([animal()])
        baseline = p.build_dataset(animals, seq)
        target = "synthetic-0|2020-02-05"
        base_ix = baseline.metadata.index[baseline.metadata.landmark_id.eq(target)][0]
        poison = seq.copy(deep=True)
        later = poison.collection_date > pd.Timestamp("2020-02-05")
        poison.loc[later, list(p.ORDINAL)] = 1.0
        poison.loc[later, "body_weight"] = 999999.0
        poison.loc[later, "temperature"] = -999999.0
        poison.loc[later, "assessor_id"] = "future-secret"
        altered = p.build_dataset(animals, poison)
        truncated = p.build_dataset(animals, seq.loc[~later].copy())
        for data in (altered, truncated):
            ix = data.metadata.index[data.metadata.landmark_id.eq(target)][0]
            for model in p.MODEL_NAMES:
                pd.testing.assert_series_equal(baseline.features[model].loc[base_ix], data.features[model].loc[ix], check_names=False)

    def test_future_animal_exit_metadata_does_not_enter_features(self):
        seq = pd.DataFrame([visit(day) for day in range(0, 57, 7)])
        a1 = pd.DataFrame([animal(100, "FD")])
        a2 = pd.DataFrame([animal(200, "MSG")])
        a2["has_clinical_record"] = "FUTURE LABEL"
        one, two = p.build_dataset(a1, seq), p.build_dataset(a2, seq)
        for model in p.MODEL_NAMES:
            pd.testing.assert_frame_equal(one.features[model], two.features[model])

    def test_missing_bounds_and_physical_values(self):
        for severe, missing, state in ((3, 1, -1), (4, 2, 1), (2, 1, 0)):
            row = pd.Series(visit(0, severe, missing, body_weight=1e9, temperature=1e9))
            self.assertEqual(p.normalized_items(row)[4], state)
        row = pd.Series(visit(0))
        row.dermatitis = 0.75
        self.assertEqual(p.normalized_items(row)[2], 0)

    def test_infinity_is_invalid_rather_than_healthy_or_missing(self):
        for value in (float("inf"), float("-inf")):
            row = pd.Series(visit(0))
            row[p.ORDINAL[0]] = value
            with self.assertRaises(ValueError):
                p.normalized_items(row)

    def test_elapsed_history_uses_dates_and_missing_breaks_recovery(self):
        seq = pd.DataFrame([visit(0, 5), visit(7, 5), visit(14, 0), visit(21, 0)])
        features = p.feature_row(seq)
        self.assertEqual(features["candidate"]["prior_observed_recovery_count"], 1)
        self.assertEqual(features["duration"]["observed_run_days"], 7)
        self.assertEqual(features["candidate"]["days_since_observed_recovery"], 7)
        stretched = seq.copy()
        stretched.loc[3, "collection_date"] += pd.Timedelta(days=3)
        self.assertEqual(p.feature_row(stretched)["duration"]["observed_run_days"], 10)
        ambiguous = pd.DataFrame([visit(0, 5), visit(7, 3, 1), visit(14, 0)])
        self.assertEqual(p.feature_row(ambiguous)["candidate"]["prior_observed_recovery_count"], 0)

    def test_integral_has_hand_computed_value_and_omits_long_gaps(self):
        seq = pd.DataFrame([visit(0, 4), visit(7, 2), visit(14, 0), visit(40, 1)])
        value = p.feature_row(seq)["candidate"]
        self.assertEqual(value["severe_item_days60"], 42.0)
        self.assertEqual(value["burden_represented_days60"], 14.0)
        self.assertEqual(value["burden_unrepresented_days60"], 46.0)

    def test_entry_high_run_is_left_censored(self):
        result = p.feature_row(pd.DataFrame([visit(0, 5), visit(7, 5)]))["duration"]
        self.assertEqual(result["observed_run_days"], 7)
        self.assertEqual(result["run_left_censored"], 1)

    def test_terminal_priority_and_day_boundaries(self):
        seq = pd.DataFrame([visit(0, 5), visit(6, 0), visit(20, 0)])
        for day in (8, 9):
            self.assertEqual(p.adjudicate(seq, 0, animal(day, "ES"))["label"], 2)
        self.assertEqual(p.adjudicate(seq, 0, animal(10, "FD"))["label"], 0)
        self.assertEqual(p.adjudicate(seq, 0, animal(8, "MSG"))["label"], -1)

    def test_nearest_day7_tie_uses_earlier_identifiable_visit(self):
        seq = pd.DataFrame([visit(0, 4), visit(6, 0), visit(8, 5), visit(15, 0)])
        result = p.adjudicate(seq, 0, animal())
        self.assertEqual((result["label"], result["outcome_gap_days"]), (0, 6))

    def test_untrusted_future_exit_alone_cannot_establish_survival(self):
        seq = pd.DataFrame([visit(0, 5), visit(7, 0)])
        for reason in ("MSG", "DC", "FTR", ""):
            result = p.adjudicate(seq, 0, animal(12, reason))
            self.assertEqual(result["label"], -1, reason)
            self.assertEqual(result["label_reason"], "survival_through_day9_unestablished")
        later = pd.concat([seq, pd.DataFrame([visit(15, 0)])], ignore_index=True)
        self.assertEqual(p.adjudicate(later, 0, animal(20, "MSG"))["label"], 0)

    def test_modes_preserve_intended_landmarks_and_declare_missingness(self):
        seq = pd.DataFrame([visit(day, severe=2, missing=1) for day in range(0, 57, 7)])
        animals = pd.DataFrame([animal()])
        primary = p.build_dataset(animals, seq, "primary")
        complete = p.build_dataset(animals, seq, "complete_items")
        self.assertEqual(primary.metadata.landmark_id.tolist(), complete.metadata.landmark_id.tolist())
        self.assertTrue((complete.metadata.label == -1).all())
        self.assertTrue((complete.metadata.label_reason == "current_items_incomplete").all())

    def test_analgesic_sensitivity_keeps_threshold_four(self):
        row = pd.Series(visit(0, 3))
        row.response_to_analgesic = 1.0
        self.assertEqual(p.normalized_items(row, "primary")[4], 1)
        self.assertEqual(p.normalized_items(row, "exclude_analgesic")[4], 0)


class FittingAndScoring(unittest.TestCase):
    def test_weighting_is_equal_by_animal_not_visit(self):
        ids = np.array(["a"] * 4 + ["b"])
        weight = p.animal_weights(ids)
        self.assertAlmostEqual(weight[:4].sum(), weight[4])
        self.assertEqual(p.macro_mean([0, 0, 0, 0, 1], ids), 0.5)
        self.assertNotEqual(np.mean([0, 0, 0, 0, 1]), 0.5)

    def test_group_splits_do_not_depend_on_outcome_or_row_order(self):
        meta = simple_metadata()
        original = dict(zip(meta.landmark_id, p.assign_folds(meta)))
        shuffled = meta.sample(frac=1, random_state=7).copy()
        shuffled["label"] = 2
        other = dict(zip(shuffled.landmark_id, p.assign_folds(shuffled)))
        self.assertEqual(original, other)
        self.assertEqual(meta.assign(fold=p.assign_folds(meta)).groupby("animal_id").fold.nunique().max(), 1)

    def test_absent_classes_map_to_correct_probability_columns(self):
        x = pd.DataFrame({"age_days": np.arange(12), "diet": ["AL"] * 12})
        ids = np.array([f"synthetic-{i}" for i in range(12)])
        one = p.Predictor().fit(x, np.full(12, 2), ids)
        probability = one.predict_proba(x)
        self.assertTrue((probability[:, 2] > probability[:, 0]).all())
        two = p.Predictor().fit(x, np.array([0] * 6 + [2] * 6), ids)
        probability = two.predict_proba(pd.DataFrame({"age_days": [1000], "diet": ["UNSEEN"]}))
        self.assertEqual(probability.shape, (1, 3))
        self.assertEqual(probability[0, 1], 0.0)
        self.assertAlmostEqual(probability.sum(), 1.0)
        self.assertEqual(two.absent_classes, [1])

    def test_nested_callbacks_are_animal_isolated_and_methods_score_same_mask(self):
        meta = simple_metadata()
        all_ids = set(meta.animal_id)
        official_folds = p.assign_folds(meta)
        feature = pd.DataFrame({"trace_animal": meta.animal_id, "numeric": np.arange(len(meta))})
        data = p.Dataset(meta, {name: feature.copy() for name in p.MODEL_NAMES})
        active = {"allowed": None}
        calls = []
        test_case = self

        class SpyModel:
            absent_classes = []
            def __init__(self, train_ids, outer=False):
                self.train_ids = set(train_ids)
                self.outer = outer
            def predict_proba(self, frame):
                test_ids = set(frame.trace_animal)
                test_case.assertFalse(self.train_ids & test_ids)
                if self.outer:
                    test_case.assertEqual(self.train_ids | test_ids, all_ids)
                else:
                    test_case.assertTrue(test_ids <= active["allowed"])
                return np.tile([0.4, 0.35, 0.25], (len(frame), 1))

        def inner_fit(name, setting, frame, labels, ids):
            self.assertTrue(set(ids) <= active["allowed"])
            self.assertTrue((np.asarray(labels) >= 0).all())
            self.assertEqual(list(ids), frame.trace_animal.tolist())
            calls.append(("inner", name, len(ids)))
            return SpyModel(ids)

        def outer_fit(name, setting, frame, labels, ids):
            self.assertTrue((np.asarray(labels) >= 0).all())
            self.assertEqual(list(ids), frame.trace_animal.tolist())
            calls.append(("outer", name, len(ids)))
            return SpyModel(ids, outer=True)

        original_select = p.select_setting
        def select(name, frame, labels, metadata, seed):
            active["allowed"] = set(metadata.animal_id)
            missing = all_ids - active["allowed"]
            self.assertIn(missing, [set(meta.animal_id[official_folds == fold]) for fold in range(5)])
            result = original_select(name, frame, labels, metadata, seed)
            active["allowed"] = None
            return result

        with tempfile.TemporaryDirectory() as temp, patch.object(p, "fit_model", inner_fit), patch.object(runner, "fit_model", outer_fit), patch.object(runner, "select_setting", select), redirect_stdout(io.StringIO()):
            summary = runner.evaluate_mode(data, Path(temp), "primary")
            output = pd.read_csv(Path(temp) / "predictions.csv")
            self.assertEqual(output.landmark_id.tolist(), meta.landmark_id.tolist())
            self.assertEqual(summary["coverage"]["overall"]["resolved"], int((meta.label >= 0).sum()))
            losses = pd.read_csv(Path(temp) / "animal_losses.csv")
            scored_ids = {name: set(losses.loc[losses.model.eq(name), "animal_id"]) for name in p.MODEL_NAMES}
            self.assertTrue(all(ids == scored_ids["candidate"] for ids in scored_ids.values()))
        self.assertEqual(sum(c[0] == "outer" for c in calls), 5 * len(p.MODEL_NAMES))
        self.assertGreater(sum(c[0] == "inner" for c in calls), 0)

    def test_known_failed_primary_gate_stays_failed_despite_perfect_candidate(self):
        metadata = simple_metadata(50, 1)
        metadata["label"] = 0
        folds = p.assign_folds(metadata)
        predictions = {name: np.tile([0.2, 0.4, 0.4], (len(metadata), 1)) for name in p.MODEL_NAMES}
        predictions["candidate"] = np.tile([1.0, 0.0, 0.0], (len(metadata), 1))
        summary, _ = runner.summarize(metadata, predictions, folds, "primary")
        self.assertTrue(summary["gate"]["numeric_gate_pass"])
        self.assertTrue(summary["gate"]["pre_design_primary_resolution_failed"])
        self.assertFalse(summary["gate"]["overall_pass"])


if __name__ == "__main__":
    stream = io.StringIO()
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    print(stream.getvalue())
    (HERE / "unittest.log").write_text(stream.getvalue(), encoding="utf-8")
    unchanged = SOURCE_HASHES == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (EXPERIMENT / "pipeline.py", EXPERIMENT / "run.py")}
    report = {"checked_at": datetime.now(timezone.utc).isoformat(), "source_sha256": SOURCE_HASHES,
              "source_unchanged_during_checks": unchanged, "tests": result.testsRun, "failures": len(result.failures),
              "errors": len(result.errors), "passed": result.wasSuccessful() and unchanged,
              "scope": "Independent synthetic fixtures and estimator spies; two tiny synthetic classifiers; no real mouse inputs loaded or fitted."}
    (HERE / "checks.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    raise SystemExit(0 if report["passed"] else 1)
