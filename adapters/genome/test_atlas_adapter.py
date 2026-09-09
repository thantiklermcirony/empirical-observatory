"""Contract and failure-path tests; no network or real biology is involved."""
import contextlib
from copy import deepcopy
import io
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import atlas_adapter as adapter


class Frame:
    def __init__(self, rows):
        self.rows = rows
        self.columns = list(rows[0]) if rows else []

    def to_dict(self, orient=None):
        assert orient == "records"
        return self.rows


class Matrix:
    def __init__(self, rows):
        self.rows = rows

    def tolist(self):
        return self.rows


def request():
    value = adapter.read_json(adapter.ROOT / "request-template.json")
    value.update(requestedScorers=["FIXTURE_SIGNED_SCORER"], ontologyTerms=["FIXTURE:CELL_A"])
    return value


def metadata():
    return {"FIXTURE_SIGNED_SCORER": SimpleNamespace(name="FIXTURE_SIGNED_SCORER", is_signed=True,
            track_metadata=Frame([{"ontology_curie": "FIXTURE:CELL_A"}]))}


class Client:
    def __init__(self):
        self.calls = []
        self.result = {"FIXTURE_SIGNED_SCORER": SimpleNamespace(shape=(1, 1), X=Matrix([[0.5]]),
                       obs=Frame([{"variant": {"chromosome": "chr5", "position": 1295046}}]),
                       var=Frame([{"ontology_curie": "FIXTURE:CELL_A"}]),
                       layers={"quantiles": Matrix([[0.8]])})}

    def scorer_metadata(self):
        self.calls.append("metadata")
        return metadata()

    def query_variant(self, variant, **kwargs):
        self.calls.append((variant, kwargs))
        return self.result


class AtlasTests(unittest.TestCase):
    def test_plan_never_imports_sdk_or_calls_client_even_with_key(self):
        with patch.dict(os.environ, {"ALPHAGENOME_API_KEY": "test-key"}), patch.object(adapter, "make_client") as mocked:
            result = adapter.plan(request())
        mocked.assert_not_called()
        self.assertEqual(result["networkCalls"], 0)
        self.assertEqual(result["predictions"], [])

    def test_manifest_rejects_wrong_assembly_coordinate_indels_duplicates_and_limits(self):
        changes = [dict(assembly="GRCh37"), dict(coordinateSystem="0-based"), dict(organism="mouse"),
                   dict(variants=[]), dict(variants=request()["variants"] * 9),
                   dict(variants=request()["variants"] * 2), dict(requestedScorers=["a", "b", "c"]),
                   dict(api_key="never-allowed-in-manifest"), dict(geneIds=['ENSG00000164362" OR true'])]
        for change in changes:
            value = request()
            value.update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                adapter.validate_manifest(value)
        for field, invalid in (("position", True), ("position", 0), ("chromosome", "chrM"),
                               ("reference_bases", "AA"), ("alternate_bases", "T")):
            value = request()
            value["variants"][0][field] = invalid
            with self.subTest(field=field), self.assertRaises(ValueError):
                adapter.validate_manifest(value)

    def test_scorer_selection_uses_actual_metadata_and_context(self):
        self.assertEqual(adapter.select_scorers(request(), metadata()), ["FIXTURE_SIGNED_SCORER"])
        for patch_value in (dict(requestedScorers=[]), dict(requestedScorers=["invented"]),
                            dict(ontologyTerms=["FIXTURE:UNKNOWN"])):
            value = request()
            value.update(patch_value)
            with self.subTest(patch_value=patch_value), self.assertRaises(ValueError):
                adapter.select_scorers(value, metadata())

    def test_reference_window_uses_one_based_inclusive_coordinates_and_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "window.fasta"
            path.write_text(">GRCh38|chr5:1295045-1295047\nATA\n")
            checked = adapter.reference_check(request(), path)
            self.assertEqual(checked["checkedVariants"], 1)
            self.assertEqual(len(checked["sha256"]), 64)
            for bad in (">GRCh38|chr5:1295045-1295047\nAAA\n", ">GRCh37|chr5:1295045-1295047\nATA\n",
                        ">GRCh38|chr5:1295045-1295048\nATA\n", ">GRCh38|chr5:1295047-1295049\nATA\n"):
                path.write_text(bad)
                with self.assertRaises(ValueError):
                    adapter.reference_check(request(), path)

    def test_transport_filters_and_prediction_provenance(self):
        client = Client()
        result = adapter.query(request(), client, lambda **kwargs: kwargs,
                               {"status": "alleles-match-supplied-reference", "checkedVariants": 1})
        self.assertEqual(len(client.calls), 2)
        variant, options = client.calls[1]
        self.assertEqual(variant["position"], 1295046)
        self.assertEqual(options["requested_scorers"], ["FIXTURE_SIGNED_SCORER"])
        self.assertEqual(options["ontology_terms"], ["FIXTURE:CELL_A"])
        self.assertIsNone(options["gene_ids"])
        self.assertEqual(result["source"], "model-prediction")
        score = result["variants"][0]["scores"][0]
        self.assertEqual(score["providerQuantiles"], [[0.8]])
        self.assertNotIn("confidence", score)
        self.assertNotIn("test-key", json.dumps(result))

    def test_absent_scores_are_explicitly_missing(self):
        client = Client()
        client.result = {}
        result = adapter.query(request(), client, lambda **kwargs: kwargs,
                               {"status": "alleles-match-supplied-reference", "checkedVariants": 1})
        self.assertEqual(result["variants"][0]["status"], "no-scores-returned")
        self.assertEqual(result["variants"][0]["missingScorers"], ["FIXTURE_SIGNED_SCORER"])

    def test_fixture_and_unverified_requests_cannot_touch_client(self):
        for value, checked in ((dict(request(), fixtureOnly=True), {"status": "alleles-match-supplied-reference", "checkedVariants": 1}),
                               (request(), {})):
            client = Client()
            with self.assertRaises(ValueError):
                adapter.query(value, client, lambda **kwargs: kwargs, checked)
            self.assertEqual(client.calls, [])

    def test_unrequested_and_oversize_responses_fail(self):
        for kind in ("unexpected", "oversize"):
            client = Client()
            if kind == "unexpected":
                client.result["UNREQUESTED"] = client.result["FIXTURE_SIGNED_SCORER"]
            else:
                client.result["FIXTURE_SIGNED_SCORER"].shape = (20001, 1)
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                adapter.query(request(), client, lambda **kwargs: kwargs,
                              {"status": "alleles-match-supplied-reference", "checkedVariants": 1})

    def test_nonfinite_values_are_null_not_zero(self):
        value = adapter.json_safe([float("nan"), float("inf"), -1.0, None])
        self.assertEqual(value, [None, None, -1.0, None])
        json.dumps(value, allow_nan=False)

    def test_key_is_environment_only_and_absence_fails_before_sdk_import(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaisesRegex(ValueError, "no network request"):
            adapter.make_client()

    def test_cli_fixture_is_clearly_synthetic_and_default_is_offline(self):
        for arguments, expected in (([], "plan-only"), (["fixture"], "synthetic-fixture")):
            output = io.StringIO()
            with contextlib.redirect_stdout(output), patch.object(adapter, "make_client") as mocked:
                self.assertEqual(adapter.main(arguments), 0)
            mocked.assert_not_called()
            self.assertEqual(json.loads(output.getvalue())["mode"], expected)

    def test_existing_output_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "record.json"
            path.write_text("original")
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(adapter.main(["fixture", "--out", str(path)]), 2)
            self.assertEqual(path.read_text(), "original")


if __name__ == "__main__":
    unittest.main()
