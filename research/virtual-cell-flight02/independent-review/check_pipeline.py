"""Synthetic-only independent checks of Flight 02. No real input files are opened."""
import hashlib
import importlib.util
import json
import sys
import traceback
from pathlib import Path

import numpy as np

from reference_oracles import equal_line_risk, record_source_summary, scalar_kernel_risk

DIRECTORY = Path(__file__).resolve().parent
MODULE_PATH = DIRECTORY.parent / "experiment" / "pipeline.py"
spec = importlib.util.spec_from_file_location("flight02_under_review", MODULE_PATH)
p = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = p
spec.loader.exec_module(p)
RESULTS = []


def check(name):
    def decorator(fn):
        try:
            detail = fn()
            RESULTS.append({"name": name, "passed": True, "detail": detail})
        except Exception as exc:
            RESULTS.append({"name": name, "passed": False, "error": str(exc),
                            "traceback": traceback.format_exc()})
        return fn
    return decorator


def fingerprint(value):
    if isinstance(value, np.ndarray):
        return (str(value.dtype), value.shape, hashlib.sha256(value.tobytes()).hexdigest())
    if isinstance(value, dict):
        return {key: fingerprint(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [fingerprint(item) for item in value]
    return value


def raises(fn):
    try:
        fn()
    except ValueError:
        return
    raise AssertionError("Expected an explicit ValueError")


def synthetic_fixture():
    rng = np.random.default_rng(20260910)
    cells = np.asarray([f"synthetic-{n:02d}" for n in range(12)])
    treatments = np.asarray(["[('A', 0.05, 'uM')]", "[('A', 0.5, 'uM')]", "B ", "B", "C"])
    features = np.asarray([f"feature-{n}" for n in range(6)])
    controls = rng.uniform(0, 5, (12, 6))
    y = rng.normal(0, 2, (12, 5, 3))
    observed = np.ones((12, 5), bool)
    observed[[0, 2, 7], 1] = False
    observed[[1, 4], 3] = False
    groups = np.arange(12) // 3
    destination_controls = rng.uniform(0, 5, (2, 6))
    return y, observed, controls, features, cells, groups, treatments, destination_controls


@check("mean_and_leave_one_out_match_independent_record_oracle")
def mean_oracle():
    y, observed, _, _, cells, _, treatments, _ = synthetic_fixture()
    records = [(str(cells[c]), str(treatments[d]), y[c, d])
               for c, d in zip(*np.nonzero(observed))]
    reference = record_source_summary(records, set(cells))
    model = p.fit_mean(y, observed)
    for d, treatment in enumerate(treatments):
        expected = reference[treatment]
        np.testing.assert_allclose(model.mean[d], expected["prediction"], rtol=1e-13)
        assert model.support[d] == expected["count"]
        for c in np.flatnonzero(observed[:, d]):
            np.testing.assert_allclose(model.loo_error[c, d], expected["residuals"][cells[c]], rtol=1e-13)
        np.testing.assert_allclose(model.treatment_risk[d], expected["mean_risk"], rtol=1e-13)
        np.testing.assert_allclose(model.treatment_risk[d], model.support[d] / (model.support[d] - 1) * model.variance[d], rtol=1e-13)
    # Unobserved values, including NaN, are not measurements.
    for sentinel in (1e100, np.nan):
        poisoned = y.copy()
        poisoned[~observed] = sentinel
        other = p.fit_mean(poisoned, observed)
        for field in ("mean", "support", "variance", "loo_error", "treatment_risk"):
            np.testing.assert_allclose(getattr(model, field), getattr(other, field), equal_nan=True, rtol=0, atol=0)
    return {"source_pairs": len(records), "missing_pairs": int((~observed).sum()), "treatments": treatments.tolist()}


@check("two_three_four_line_support_and_no_zero_fill")
def unequal_support():
    y = np.full((4, 3, 1), 9e99)
    observed = np.zeros((4, 3), bool)
    for d, values in enumerate(([2, 4], [1, 4, 10], [0, 0, 0, 12])):
        y[:len(values), d, 0] = values
        observed[:len(values), d] = True
    model = p.fit_mean(y, observed)
    np.testing.assert_allclose(model.mean[:, 0], [3, 5, 3])
    np.testing.assert_allclose(model.support, [2, 3, 4])
    np.testing.assert_allclose(model.loo_error[:2, 0], [4, 4])
    np.testing.assert_allclose(model.loo_error[:, 2], [16, 16, 16, 144])
    assert np.isnan(model.loo_error[2:, 0]).all()
    return {"means": model.mean[:, 0].tolist(), "support": model.support.tolist()}


@check("context_risk_reversal_matches_independent_kernel_oracle")
def kernel_oracle():
    y = np.asarray([[0, 0], [0, 12], [0, 12], [12, 12]], float)[:, :, None]
    observed = np.ones((4, 2), bool)
    source = np.arange(4, dtype=float)[:, None]
    dest = np.asarray([[0], [3]], float)
    model = p.fit_mean(y, observed)
    setting = p.Setting(.5, 4.)
    result = p.risk_scores(model, source, dest, setting)
    bandwidth = .5 * np.median([1, 2, 3, 1, 2, 1])
    for c in range(2):
        for d in range(2):
            reference = scalar_kernel_risk({str(s): source[s] for s in range(4)}, dest[c],
                                          {str(s): model.loo_error[s, d] for s in range(4)}, bandwidth, 4)
            np.testing.assert_allclose(result["scores"][c, d], reference["risk"], rtol=1e-14)
            np.testing.assert_allclose(result["effective_support"][c, d], reference["n_eff"], rtol=1e-14)
    assert result["scores"][0, 0] < result["scores"][0, 1]
    assert result["scores"][1, 0] > result["scores"][1, 1]
    return {"risk_matrix": result["scores"].tolist(), "effective_support": result["effective_support"].tolist()}


@check("degenerate_controls_and_distant_kernel_are_defined")
def degenerate_and_stable():
    model = p.fit_mean(np.arange(24, dtype=float).reshape(4, 2, 3), np.ones((4, 2), bool))
    mapping = p.fit_control_map(np.zeros((4, 3)), ["g1", "g2", "g3"])
    z = mapping.transform(np.zeros((4, 3)))
    for setting in p.SETTINGS:
        result = p.risk_scores(model, z, mapping.transform(np.ones((2, 3))), setting)
        np.testing.assert_allclose(result["scores"], np.broadcast_to(model.treatment_risk, (2, 2)), rtol=1e-14)
    source = np.asarray([[0], [1], [2], [3]], float)
    far = p.risk_scores(model, source, [[1e7]], p.Setting(.5, 0))
    assert np.isfinite(far["scores"]).all()
    assert ((far["effective_support"] >= 1) & (far["effective_support"] <= 4)).all()
    raises(lambda: p.risk_scores(model, source, [[np.inf]], p.Setting(.5, 0)))
    return {"degenerate_components": z.shape[1], "distant_effective_support": far["effective_support"].tolist()}


@check("nested_inner_models_and_transforms_rebuilt_without_validation_lines")
def nested_sources():
    y, observed, controls, features, cells, groups, treatments, _ = synthetic_fixture()
    mean_calls, map_calls = [], []
    original_mean, original_map = p.fit_mean, p.fit_control_map

    def record_mean(ys, os):
        mean_calls.append((np.asarray(ys).copy(), np.asarray(os).copy()))
        return original_mean(ys, os)

    def record_map(xs, fs, context_ids=None, **kwargs):
        map_calls.append((np.asarray(xs).copy(), np.asarray(context_ids).copy()))
        return original_map(xs, fs, context_ids, **kwargs)

    p.fit_mean, p.fit_control_map = record_mean, record_map
    try:
        _, records = p.calibrate(y, observed, controls, features, cells, groups, treatments)
    finally:
        p.fit_mean, p.fit_control_map = original_mean, original_map
    assert len(mean_calls) == len(map_calls) == 4
    for group, (mean_call, map_call) in enumerate(zip(mean_calls, map_calls)):
        selected = np.flatnonzero(groups != group)
        np.testing.assert_array_equal(mean_call[0], y[selected])
        np.testing.assert_array_equal(mean_call[1], observed[selected])
        np.testing.assert_array_equal(map_call[0], controls[selected])
        np.testing.assert_array_equal(map_call[1], cells[selected])
    for row in records["lines"]:
        index = np.flatnonzero(cells == row["validation_context"])[0]
        assert set(row["source_contexts"]) == set(cells[groups != groups[index]])
    return {"inner_mean_fits": len(mean_calls), "inner_control_fits": len(map_calls), "source_lines_per_fit": 9}


@check("inner_validation_poison_cannot_change_its_prescoring_candidate_ranks")
def inner_poison():
    y, observed, controls, features, cells, groups, treatments, _ = synthetic_fixture()
    original = p.risk_scores

    def capture(input_y):
        calls = []

        def spy(*args, **kwargs):
            result = original(*args, **kwargs)
            calls.append(fingerprint(result))
            return result

        p.risk_scores = spy
        try:
            chosen, _ = p.calibrate(input_y, observed, controls, features, cells, groups, treatments)
        finally:
            p.risk_scores = original
        return calls, chosen.label

    baseline, chosen = capture(y)
    poisoned = y.copy()
    poisoned[groups == 0] += 1e6
    changed, chosen_poison = capture(poisoned)
    assert baseline[:len(p.SETTINGS)] == changed[:len(p.SETTINGS)]
    assert any(a != b for a, b in zip(baseline[len(p.SETTINGS):], changed[len(p.SETTINGS):]))
    return {"first_inner_group_rank_calls_unchanged": len(p.SETTINGS),
            "original_selection": chosen, "poisoned_selection": chosen_poison,
            "selection_allowed_to_change": True}


@check("outer_predictions_have_no_destination_outcome_argument_and_are_order_invariant")
def outer_and_order():
    y, observed, controls, features, cells, groups, treatments, test_controls = synthetic_fixture()
    base = p.fit_predict_outer(y, observed, controls, features, cells, groups, treatments, test_controls)
    order = np.asarray([9, 0, 7, 3, 4, 2, 1, 6, 5, 10, 11, 8])
    other = p.fit_predict_outer(y[order], observed[order], controls[order], features, cells[order],
                                groups[order], treatments, test_controls)
    assert fingerprint(base) == fingerprint(other)
    # Scoring with arbitrary destination outcomes cannot mutate the fitted artifacts.
    before = fingerprint(base)
    scores = {name: array[0] for name, array in base["rank_scores"].items()}
    for value in (0.0, 1e6):
        truth = np.full(base["mean_prediction"].shape, value)
        p.line_curves(base["mean_prediction"], base["ridge_prediction"][0], truth,
                      np.ones(len(treatments), bool), scores, treatments, "synthetic-destination")
    assert before == fingerprint(base)
    gene_order = np.asarray([2, 0, 1])
    treatment_order = np.asarray([3, 1, 4, 0, 2])
    reordered = p.fit_predict_outer(y[:, treatment_order][:, :, gene_order], observed[:, treatment_order],
                                    controls, features, cells, groups, treatments[treatment_order], test_controls)
    np.testing.assert_allclose(reordered["mean_prediction"], base["mean_prediction"][treatment_order][:, gene_order], rtol=1e-14)
    assert reordered["tuning"]["selected"] == base["tuning"]["selected"]
    for name in base["rank_scores"]:
        np.testing.assert_allclose(reordered["rank_scores"][name], base["rank_scores"][name][:, treatment_order], rtol=1e-13)
    return {"source_row_order": "byte-identical", "treatment_gene_order": "numerically invariant", "destination_outcomes": "scoring only"}


@check("control_feature_storage_permutation_preserves_geometry")
def control_order():
    _, _, controls, features, cells, _, _, destination = synthetic_fixture()
    perm = np.asarray([4, 2, 5, 1, 0, 3])
    a = p.fit_control_map(controls, features, cells, max_features=4, components=3)
    b = p.fit_control_map(controls[:, perm], features[perm], cells, max_features=4, components=3)
    da = np.linalg.norm(a.transform(controls)[:, None] - a.transform(destination)[None], axis=2)
    db = np.linalg.norm(b.transform(controls[:, perm])[:, None] - b.transform(destination[:, perm])[None], axis=2)
    np.testing.assert_allclose(da, db, rtol=1e-13, atol=1e-14)
    assert a.manifest()["selected_feature_ids"] == b.manifest()["selected_feature_ids"]
    return {"selected_feature_ids": a.manifest()["selected_feature_ids"]}


@check("ties_exact_treatment_identity_and_ceiling_coverage")
def identity_and_coverage():
    treatments = np.asarray(["[('A', 0.05, 'uM')]", "[('A', 0.5, 'uM')]", "B ", "B", "C"])
    scores = np.zeros(5)
    selected = p.retained_indices(scores, treatments, .75)
    perm = np.asarray([3, 2, 0, 4, 1])
    other = p.retained_indices(scores[perm], treatments[perm], .75)
    assert treatments[selected].tolist() == treatments[perm][other].tolist()
    assert len(selected) == 4
    mask = np.asarray([True, True, True, False, False])
    assert len(p.retained_indices(scores, treatments, .75, mask)) == 3
    raises(lambda: p.retained_indices(scores, ["dup"] * 5, .75))
    raises(lambda: p.retained_indices(scores, treatments, .75, np.zeros(5, bool)))
    return {"exact_labels_retained": treatments[selected].tolist(), "75_percent_of_3": 3, "75_percent_of_5": 4}


@check("shared_predictions_conditional_zero_and_equal_line_macro_weighting")
def scoring():
    treatments = np.asarray([f"t{n}" for n in range(9)])
    records = []
    for name, n, loss in (("short", 1, 100.0), ("long", 9, 0.0)):
        pred = np.full((9, 1), np.sqrt(loss))
        truth = np.zeros((9, 1))
        observed = np.arange(9) < n
        # Missing numeric truth may be undefined without being scored.
        truth[~observed] = np.nan
        scores = {method: np.arange(9, dtype=float) for method in p.RANKINGS if method != "random"}
        _, rows = p.line_curves(pred, pred, truth, observed, scores, treatments, name)
        assert all(row["mean_over_zero"] is None for row in rows)
        records.extend(rows)
    result = p.summarize_curves(records, {"short": 0, "long": 1})
    reference = equal_line_risk({"short": [100.0], "long": [0.0] * 9})
    assert reference == 50.0
    for strategy in p.RANKINGS:
        for risk in result["overall_equal_line_mean_risk"][strategy].values():
            assert risk == reference
    # Different retained masks require different zero references, using the same predictions.
    truth = np.asarray([[1.], [2.], [3.], [4.]])
    pred = np.asarray([[2.], [2.], [2.], [2.]])
    scores = {method: np.arange(4, dtype=float) for method in p.RANKINGS if method != "random"}
    scores["disagreement"] = scores["disagreement"][::-1]
    _, rows = p.line_curves(pred, pred, truth, np.ones(4, bool), scores, treatments[:4], "target")
    half = {r["strategy"]: r for r in rows if r["coverage"] == .5 and r["repeat"] == 0}
    assert half["candidate"]["risk"]["zero"] == 2.5
    assert half["disagreement"]["risk"]["zero"] == 12.5
    assert len({r["risk"]["mean"] for r in rows if r["coverage"] == 1}) == 1
    return {"equal_line_macro_risk": reference, "pooled_row_value_correctly_avoided": 10.0,
            "zero_risk_on_different_masks": [2.5, 12.5]}


@check("invalid_observed_values_and_insufficient_support_fail_explicitly")
def invalid_cases():
    y, observed, controls, features, cells, groups, treatments, _ = synthetic_fixture()
    for sentinel in (np.nan, np.inf):
        invalid = y.copy()
        invalid[0, 0, 0] = sentinel
        raises(lambda: p.fit_mean(invalid, observed))
    sparse = observed.copy()
    sparse[:, 0] = False
    sparse[0, 0] = True
    raises(lambda: p.calibrate(y, sparse, controls, features, cells, groups, treatments))
    raises(lambda: p.fit_control_map(controls, ["same"] * len(features), cells))
    raises(lambda: p.score_line(np.zeros((2, 1)), np.zeros((2, 1)), np.zeros(2, bool)))
    return {"observed_nan_inf": "rejected", "inner_source_support_below_two": "rejected",
            "duplicate_feature_identity": "rejected", "empty_target_line": "rejected"}


if __name__ == "__main__":
    report = {"module": "../experiment/pipeline.py", "module_sha256": hashlib.sha256(MODULE_PATH.read_bytes()).hexdigest(),
              "test_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "real_response_values_read": False, "checks": RESULTS,
              "passed": sum(row["passed"] for row in RESULTS), "failed": sum(not row["passed"] for row in RESULTS)}
    (DIRECTORY / "CHECK_RESULTS.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    sys.exit(bool(report["failed"]))
