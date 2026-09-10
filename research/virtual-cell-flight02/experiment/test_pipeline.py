"""Synthetic-only checks. This file never opens real plate-1 response data."""
from pathlib import Path
import json
import math
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

from dataio import Panel, assigned_folds, verify_freeze
import pipeline as p
import run


class NumericalContracts(unittest.TestCase):
    def test_loo_arithmetic_and_variance_identity(self):
        y = np.array([[[0., 0.]], [[2., 4.]], [[4., 8.]]])
        model = p.fit_mean(y, np.ones((3, 1), bool))
        np.testing.assert_allclose(model.mean, [[2., 4.]])
        np.testing.assert_allclose(model.loo_error[:, 0], [22.5, 0., 22.5])
        np.testing.assert_allclose(model.variance, [10.])
        np.testing.assert_allclose(model.treatment_risk, [15.])

    def test_missing_pairs_do_not_become_zero_truth(self):
        y = np.array([[[2.]], [[6.]], [[1e100]]])
        mask = np.array([[True], [True], [False]])
        model = p.fit_mean(y, mask)
        self.assertEqual(model.mean.item(), 4.)
        np.testing.assert_array_equal(model.support, [2])
        np.testing.assert_allclose(model.loo_error[:2], [[16.], [16.]])
        self.assertTrue(np.isnan(model.loo_error[2, 0]))

    def test_nonfinite_observed_data_fails(self):
        for invalid in [np.nan, np.inf, -np.inf]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                p.fit_mean(np.array([[[invalid]], [[1.]]]), np.ones((2, 1), bool))

    def test_unsupported_scored_drug_fails_not_dropped(self):
        model = p.fit_mean(np.array([[[1.]], [[np.nan]]]), np.array([[True], [False]]))
        risk = p.risk_scores(model, np.array([[0.], [1.]]), np.array([[0.]]), p.SETTINGS[0])
        with self.assertRaises(ValueError):
            p.retained_indices(risk["scores"][0], ["drug"], 0.75)

    def test_uniform_and_identical_controls_return_treatment_risk(self):
        y = np.arange(24.).reshape(4, 3, 2)
        model = p.fit_mean(y, np.ones((4, 3), bool))
        for setting in p.SETTINGS:
            actual = p.risk_scores(model, np.zeros((4, 0)), np.zeros((2, 0)), setting)
            np.testing.assert_allclose(actual["scores"], np.broadcast_to(model.treatment_risk, (2, 3)))
            np.testing.assert_allclose(actual["effective_support"], 4.)

    def test_far_destination_kernel_remains_finite(self):
        model = p.fit_mean(np.arange(8.).reshape(4, 2, 1), np.ones((4, 2), bool))
        result = p.risk_scores(model, np.array([[0.], [1.], [2.], [3.]]),
                               np.array([[1e6]]), p.Setting(0.5, 4.))
        self.assertTrue(np.isfinite(result["scores"]).all())
        self.assertTrue((result["effective_support"] >= 1 - 1e-12).all())
        self.assertTrue((result["effective_support"] <= 4 + 1e-12).all())

    def test_constant_controls_zero_rank_and_ridge_intercept(self):
        x = np.ones((4, 5))
        transform = p.fit_control_map(x, list("abcde"))
        self.assertEqual(transform.transform(x).shape, (4, 0))
        y = np.arange(8.).reshape(4, 2, 1)
        prediction = p.descriptive_ridge(y, np.ones((4, 2), bool), np.zeros((4, 0)), np.zeros((2, 0)))
        np.testing.assert_allclose(prediction, np.broadcast_to(y.mean(axis=0), (2, 2, 1)))

    def test_feature_identity_guard(self):
        transform = p.fit_control_map(np.array([[0., 2.], [1., 4.], [3., 6.]]), ["a", "b"])
        with self.assertRaises(ValueError):
            transform.transform(np.ones((1, 2)), ["b", "a"])

    def test_ties_rounding_and_exact_identity(self):
        treatments = ["drug", "drug ", "drug@0.05", "drug@1", "other"]
        indices = p.retained_indices(np.zeros(5), treatments, 0.75)
        self.assertEqual(len(indices), 4)
        perm = np.array([4, 1, 0, 3, 2])
        reverse = p.retained_indices(np.zeros(5), np.asarray(treatments)[perm], 0.75)
        self.assertEqual(np.asarray(treatments)[indices].tolist(), np.asarray(treatments)[perm][reverse].tolist())

    def test_random_permutation_storage_invariant(self):
        ids = np.array(["x", "y", "z", "z "])
        mask = np.array([True, False, True, True])
        a = p.random_order(ids, "line", 37, mask)
        perm = [2, 1, 3, 0]
        b = p.random_order(ids[perm], "line", 37, mask[perm])
        self.assertEqual(ids[a].tolist(), ids[perm][b].tolist())
        self.assertEqual(len(a), 3)

    def test_same_mask_zero_and_full_coverage(self):
        prediction = np.array([[1.], [8.], [100.]])
        truth = np.array([[0.], [10.], [np.nan]])
        observed = np.array([True, True, False])
        scores = {name: np.array([0., 1., np.nan]) for name in p.RANKINGS if name != "random"}
        _, curves = p.line_curves(prediction, prediction, truth, observed, scores, ["a", "b", "c"], "L")
        half = next(r for r in curves if r["strategy"] == "candidate" and r["coverage"] == .5)
        self.assertEqual(half["risk"]["mean"], 1.)
        self.assertEqual(half["risk"]["zero"], 0.)
        self.assertIsNone(half["mean_over_zero"])
        summary = p.summarize_curves(curves, {"L": 0})
        self.assertEqual(summary["overall_equal_line_mean_risk"]["candidate"]["1.0"], 2.5)


class ProcedureContracts(unittest.TestCase):
    def test_fold_labels_preserved_without_contiguity_assumption(self):
        contexts = np.asarray([f"line-{i:02d}" for i in range(50)])
        for labels in ([0, 1, 2, 3, 4], [1, 2, 3, 4, 5], [-7, 10, 30, 60, 90]):
            mapping = {str(label): contexts[i * 10:(i + 1) * 10].tolist() for i, label in enumerate(labels)}
            actual = assigned_folds(contexts, mapping)
            np.testing.assert_array_equal(actual, np.repeat(labels, 10))
        with self.assertRaises(ValueError):
            assigned_folds(contexts, {"0": contexts[:20].tolist(), "1": contexts[20:].tolist()})

    def test_fit_diagnostics_reports_exact_ties_without_changing_arrays(self):
        scores = np.array([[0., 0., 2., 2.]])
        result = {"source_support": np.array([3, 3, 4, 4]),
                  "rank_scores": {s: scores.copy() for s in p.RANKINGS if s != "random"}}
        actual = run.fit_diagnostics(result, np.array([[1., 0.], [1., 3.]]), ["L"], np.ones((1, 4), bool))
        self.assertEqual(actual["zero_source_control_variance_features"], 1)
        self.assertEqual(actual["zero_source_response_variance_treatments"], 2)
        self.assertEqual(actual["source_support_histogram"], {3: 2, 4: 2})
        self.assertTrue(all(r["tie_crosses_75_percent_boundary"] for r in actual["exact_score_ties"]))
        self.assertTrue(all(r["treatments_in_exact_ties"] == 4 for r in actual["exact_score_ties"]))
        for value in result["rank_scores"].values():
            np.testing.assert_array_equal(value, scores)

    @staticmethod
    def synthetic():
        rng = np.random.default_rng(846)
        contexts = np.asarray([f"line-{i:02d}" for i in range(10)])
        treatments = np.asarray(["A@0.05uM", "A@1uM", "B ", "C"])
        controls = rng.uniform(0, 2, size=(10, 7))
        y = rng.normal(size=(10, 4, 3))
        observed = np.ones((10, 4), bool)
        observed[0, 0] = False
        y[0, 0] = np.nan
        return Panel(contexts, treatments, np.asarray(["g0", "g1", "g2"]), y, observed,
                     controls, np.asarray([f"f{i}" for i in range(7)]), np.arange(10) % 5,
                     {"synthetic": True, "no_real_response_values": True})

    def test_exact_ties_prefer_uniform(self):
        panel = self.synthetic()
        panel.y[:] = 1
        selected, _ = p.calibrate(panel.y, panel.observed, panel.controls, panel.control_features,
                                  panel.contexts, panel.folds, panel.treatments)
        self.assertEqual(selected.label, "uniform")

    def test_source_count_and_validation_blocks(self):
        panel = self.synthetic()
        selected, record = p.calibrate(panel.y, panel.observed, panel.controls, panel.control_features,
                                       panel.contexts, panel.folds, panel.treatments)
        self.assertIn(selected, p.SETTINGS)
        self.assertEqual(len(record["lines"]), 10)
        for row in record["lines"]:
            self.assertNotIn(row["validation_context"], row["source_contexts"])
            self.assertEqual(len(row["source_contexts"]), 8)

    def test_gate_counts_fold_envelope_explicitly(self):
        def records(candidate):
            result = []
            for i in range(5):
                for strategy in p.RANKINGS:
                    for q in p.COVERAGES:
                        loss = candidate[i] if strategy == "candidate" and q != 1 else 1.
                        result.append({"context": f"c{i}", "strategy": strategy, "coverage": q,
                                       "risk": {"mean": loss}})
            return result
        folds = {f"c{i}": i for i in range(5)}
        self.assertTrue(p.summarize_curves(records([.7, .7, .7, .7, 1.1]), folds)["primary_gate_passed"])
        self.assertFalse(p.summarize_curves(records([.7, .7, .7, 1.1, 1.1]), folds)["primary_gate_passed"])

    def test_synthetic_end_to_end_preserves_artifact_boundary(self):
        # Temporary output is confined to this experiment folder and only synthetic.
        base = Path(__file__).resolve().parent / "_synthetic_test_work"
        base.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base) as folder:
            output = Path(folder).resolve() / "result"
            self.assertTrue(output.is_relative_to(base.resolve()))
            original = run.line_curves
            calls = []
            def guard(*args, **kwargs):
                context = args[-1]
                fold = int(context.rsplit("-", 1)[1]) % 5
                manifest = output / f"fold-{fold}-prediction-manifest.json"
                self.assertTrue(manifest.exists(), "Outer scoring preceded prediction manifest")
                calls.append(context)
                return original(*args, **kwargs)
            with patch.object(run, "line_curves", side_effect=guard):
                result = run.execute(self.synthetic(), output)
            self.assertEqual(len(calls), 10)
            self.assertEqual(result["observed_pairs"], 39)
            self.assertEqual(result["missing_pairs"], 1)
            self.assertTrue((output / "retained-masks.jsonl.gz").exists())
            self.assertEqual(len(list(output.glob("fold-*-predictions.npz"))), 5)
            self.assertEqual(json.loads((output / "run-manifest.json").read_text())["failure_count"], 0)

    def test_runner_no_flag_cannot_load_data(self):
        with patch.object(run, "load_panel") as load, patch("sys.argv", ["run.py"]):
            with self.assertRaises(SystemExit):
                run.main()
            load.assert_not_called()

    def test_unreviewed_freeze_rejected(self):
        base = Path(__file__).resolve().parent / "_synthetic_test_work"
        base.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base) as folder:
            path = Path(folder) / "not-frozen.json"
            path.write_text('{"status":"draft"}')
            with self.assertRaises(ValueError):
                verify_freeze(path)


if __name__ == "__main__":
    unittest.main()
