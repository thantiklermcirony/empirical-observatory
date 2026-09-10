"""Only synthetic observations/labels are used; no real-data model fitting."""
import unittest
from unittest.mock import patch
import hashlib
import json
from pathlib import Path
import tempfile

import numpy as np
import pandas as pd
from pandas.testing import assert_frame_equal

import pipeline as p
import run


def visits(days=(0, 7, 14, 21, 28, 35, 42), burdens=None, animal="a"):
    records = []
    if burdens is None:
        burdens = [2] * len(days)
    for day, burden in zip(days, burdens):
        row = {f: float(i < burden) for i, f in enumerate(p.ORDINAL)}
        row.update(animal_id=animal, source_id=animal, collection_date=pd.Timestamp("2020-01-01") + pd.Timedelta(days=day),
                   age_days=1000 + day, sex="f", strain="J:DO", diet="AL", assessor_id="A", body_weight=30., temperature=37.)
        records.append(row)
    return pd.DataFrame(records)


def animal(aid="a", exit_day=100, reason="FD"):
    return pd.Series({"animal_id": aid, "source_id": aid, "strain": "J:DO", "diet": "AL", "sex": "f",
                      "date_exit": pd.Timestamp("2020-01-01") + pd.Timedelta(days=exit_day),
                      "exit_reason_raw": reason, "endpoint_chronology_valid": True})


class EndpointTests(unittest.TestCase):
    def test_infinite_score_rejected(self):
        row = visits(days=(0,)).iloc[0].copy()
        for invalid in (np.inf, -np.inf):
            row["activity"] = invalid
            with self.assertRaisesRegex(ValueError, "Infinite"):
                p.normalized_items(row)

    def test_severe_bounds_and_physical_exclusion(self):
        row = visits(days=(0,), burdens=(3,)).iloc[0].copy()
        row["thoracic_mass"] = np.nan
        row["body_weight"] = 10000
        self.assertEqual(p.normalized_items(row)[4], -1)
        row[p.ORDINAL[3]] = 1
        self.assertEqual(p.normalized_items(row)[4], 1)
        row[p.ORDINAL[2]] = 0
        row[p.ORDINAL[3]] = 0
        self.assertEqual(p.normalized_items(row)[4], 0)

    def test_terminal_by9_overrides_low_day6(self):
        seq = visits(days=(0, 6), burdens=(5, 1))
        result = p.adjudicate(seq, 0, animal(exit_day=8, reason="ES"))
        self.assertEqual(result["label"], 2)
        self.assertEqual(result["label_reason"], "terminal_ES")

    def test_unknown_exit_not_death(self):
        seq = visits(days=(0, 6), burdens=(5, 1))
        for reason in ("MSG", "DC", "FTR", ""):
            self.assertEqual(p.adjudicate(seq, 0, animal(exit_day=8, reason=reason))["label"], -1)

    def test_nearest_target_tie_earlier(self):
        seq = visits(days=(0, 6, 8, 20), burdens=(5, 1, 5, 1))
        result = p.adjudicate(seq, 0, animal())
        self.assertEqual(result["outcome_gap_days"], 6)
        self.assertEqual(result["label"], 0)

    def test_window_boundaries(self):
        for day, expected in ((4, -1), (5, 0), (9, 0), (10, -1)):
            self.assertEqual(p.adjudicate(visits(days=(0, day)), 0, animal())["label"], expected)

    def test_survival_must_be_established(self):
        a = animal()
        a.date_exit = pd.NaT
        self.assertEqual(p.adjudicate(visits(days=(0, 7)), 0, a)["label_reason"], "survival_through_day9_unestablished")
        self.assertEqual(p.adjudicate(visits(days=(0, 7, 14)), 0, a)["label"], 0)

    def test_later_unknown_exit_does_not_establish_survival(self):
        for reason in ("MSG", "FTR", "DC", ""):
            self.assertEqual(p.adjudicate(visits(days=(0, 7)), 0, animal(exit_day=30, reason=reason))["label"], -1)
            self.assertEqual(p.adjudicate(visits(days=(0, 7, 14)), 0, animal(exit_day=30, reason=reason))["label"], 0)

    def test_same_day_exit_not_a_landmark(self):
        seq = visits(days=(0, 7, 14, 21, 28, 35))
        result = p.build_dataset(pd.DataFrame([animal(exit_day=35)]), seq)
        self.assertEqual(len(result.metadata), 0)

    def test_complete_sensitivity_does_not_fill_missing(self):
        seq = visits(days=(0, 7, 14))
        seq.loc[1, "thoracic_mass"] = np.nan
        self.assertEqual(p.adjudicate(seq, 0, animal(), "primary")["label"], 0)
        self.assertEqual(p.adjudicate(seq, 0, animal(), "complete_items")["label"], -1)
        result = p.adjudicate(seq, 0, animal(), "complete_items")
        self.assertEqual(result["label_reason"], "unidentifiable_burden")
        self.assertEqual(result["window_assessment_count"], 1)
        self.assertEqual(result["window_complete_count"], 0)


class HistoryTests(unittest.TestCase):
    def test_future_changes_cannot_change_features(self):
        seq = visits()
        first = p.build_dataset(pd.DataFrame([animal()]), seq)
        changed = seq.copy()
        changed.loc[changed.collection_date > pd.Timestamp("2020-02-05"), list(p.ORDINAL)] = 1.
        changed.loc[changed.collection_date > pd.Timestamp("2020-02-05"), "body_weight"] = 800.
        second = p.build_dataset(pd.DataFrame([animal()]), changed)
        for name in p.MODEL_NAMES:
            assert_frame_equal(first.features[name].iloc[:1], second.features[name].iloc[:1])
        self.assertNotEqual(first.metadata.iloc[0].label, second.metadata.iloc[0].label)

    def test_initial_high_run_left_censored(self):
        row = p.feature_row(visits(days=(0, 7, 14), burdens=(5, 5, 5)))["duration"]
        self.assertEqual(row["observed_run_days"], 14)
        self.assertEqual(row["run_left_censored"], 1)

    def test_missing_state_interrupts_recovery(self):
        seq = visits(days=(0, 7, 14), burdens=(5, 3, 1))
        seq.loc[1, "thoracic_mass"] = np.nan
        row = p.feature_row(seq)["candidate"]
        self.assertEqual(row["prior_observed_recovery_count"], 0)
        self.assertEqual(row["run_left_censored"], 1)

    def test_long_gap_has_no_imputed_burden(self):
        row = p.feature_row(visits(days=(0, 7, 35), burdens=(2, 2, 2)))["candidate"]
        self.assertEqual(row["burden_represented_days60"], 7)
        self.assertEqual(row["severe_item_days60"], 14)
        self.assertEqual(row["burden_unrepresented_days60"], 53)

    def test_real_elapsed_time_not_visit_number(self):
        a = p.feature_row(visits(days=(0, 7, 14), burdens=(5, 5, 5)))["duration"]
        b = p.feature_row(visits(days=(0, 5, 10), burdens=(5, 5, 5)))["duration"]
        self.assertNotEqual(a["observed_run_days"], b["observed_run_days"])


class TrainingTests(unittest.TestCase):
    def test_freeze_hash_guard(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            hashes = {}
            for name in ("pipeline.py", "run.py", "protocol.json"):
                (root / name).write_text(name)
                hashes[name] = hashlib.sha256((root / name).read_bytes()).hexdigest()
            record = {"commit": "a" * 40, "url": "https://github.com/example/repo/commit/" + "a" * 40,
                      "source_sha256": hashes, "input_sha256": p.EXPECTED_INPUTS}
            path = root / "frozen.json"
            path.write_text(json.dumps(record))
            self.assertEqual(run.validate_publication(path, root)["commit"], "a" * 40)
            (root / "pipeline.py").write_text("mutated")
            with self.assertRaisesRegex(ValueError, "Frozen source hash"):
                run.validate_publication(path, root)

    def test_animal_weights(self):
        ids = np.array(["a", "a", "b"])
        w = p.animal_weights(ids)
        self.assertAlmostEqual(w[:2].sum(), w[2])
        self.assertAlmostEqual(p.macro_mean([0., 0., 1.], ids), .5)

    def test_fold_assignment_independent_of_rows_and_labels(self):
        metadata = pd.DataFrame({"animal_id": [f"a{i}" for i in range(15)], "diet": ["AL"] * 15})
        first = dict(zip(metadata.animal_id, p.assign_folds(metadata)))
        duplicate = pd.concat([metadata.iloc[::-1], metadata.iloc[:4]], ignore_index=True)
        second = dict(zip(duplicate.animal_id, p.assign_folds(duplicate)))
        self.assertEqual(first, second)
        self.assertEqual(set(first.values()), set(range(5)))

    def test_inner_training_and_validation_disjoint(self):
        metadata = pd.DataFrame({"animal_id": [f"a{i}" for i in range(12)], "diet": ["AL"] * 12})
        x = pd.DataFrame({"tag": np.arange(12)})
        y = np.arange(12) % 3
        seen = []
        class Fake:
            absent_classes = []
            def __init__(self, train): self.train = set(train)
            def predict_proba(self, test):
                assert not self.train.intersection(test.tag)
                seen.append(len(test))
                return np.tile([.3, .4, .3], (len(test), 1))
        with patch.object(p, "fit_model", side_effect=lambda name, setting, train, labels, ids: Fake(train.tag)):
            p.select_setting("history", x, y, metadata, "synthetic")
        self.assertEqual(len(seen), 9)

    def test_unknown_category_uses_training_encoder(self):
        x = pd.DataFrame({"value": [-1., 0., 1., 2., 3., 4.], "diet": ["AL"] * 6})
        model = p.Predictor().fit(x, np.array([0, 1, 2, 0, 1, 2]), np.array(list("abcdef")))
        encoder = model.pipeline.named_steps["preprocess"].named_transformers_["categorical"]
        before = [v.copy() for v in encoder.categories_]
        result = model.predict_proba(pd.DataFrame({"value": [999.], "diet": ["NEW"]}))
        self.assertEqual(result.shape, (1, 3))
        np.testing.assert_array_equal(before[0], encoder.categories_[0])

    def test_absent_class_and_constant_fallback_disclosed(self):
        model = p.Predictor().fit(pd.DataFrame({"value": [1., 2.]}), np.array([1, 1]), ["a", "b"])
        self.assertEqual(model.absent_classes, [0, 2])
        result = model.predict_proba(pd.DataFrame({"value": [999.]}))
        self.assertAlmostEqual(result.sum(), 1)

    def test_proper_brier_contract(self):
        np.testing.assert_array_equal(p.brier_losses([0, 2], np.array([[1., 0., 0.], [0., 0., 1.]])), [0., 0.])
        self.assertEqual(p.brier_losses([0], np.array([[0., 1., 0.]]))[0], 2.)
        with self.assertRaises(ValueError):
            p.brier_losses([0], np.array([[.1, .2, .3]]))


if __name__ == "__main__":
    unittest.main()
