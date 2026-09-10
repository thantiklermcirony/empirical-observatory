"""Behavioral adapter tests use synthetic rows, never train a predictor."""
import tempfile
from pathlib import Path
import unittest

import adapter as a


def fixture(animal_id="m1", slots=3):
    row = {"id": animal_id, "sex": "f", "strain": "J:DO", "diet": "AL",
           "date_born": "2020-01-01", "date_exit": "2020-02-01",
           "exit_reason": "ES", "has_clinical_record": "1"}
    for n in range(1, slots + 1):
        for f in a.VISIT_FIELDS:
            row[f"{f}_{n}"] = ""
    for n, date in ((1, "2020-01-10"), (2, "2020-01-17")):
        if n <= slots:
            row[f"collection_date_{n}"] = date
            row[f"date_due_{n}"] = date
            row[f"collected_by_anon_{n}"] = "A"
            for f in a.ORDINAL_FIELDS:
                row[f"{f}_{n}"] = "0"
            row[f"body_weight_{n}"] = "30"
            row[f"temperature_{n}"] = "37"
    return row


class ScoreTests(unittest.TestCase):
    def test_missing_is_not_healthy(self):
        values = dict.fromkeys(a.ORDINAL_FIELDS, 0.)
        for f in a.ORDINAL_FIELDS[:3]:
            values[f] = 1.
        values["head_piloerection"] = None
        values["thoracic_mass"] = None
        result = a.scores(values)
        self.assertEqual(result["published_severe_sum_na_removed"], 3)
        self.assertEqual(result["severe_upper_bound"], 5)
        self.assertIsNone(result["ge4_state_certain"])
        self.assertIsNone(result["severe_count_complete"])

    def test_partial_observation_can_establish_impairment(self):
        values = dict.fromkeys(a.ORDINAL_FIELDS, None)
        for f in a.ORDINAL_FIELDS[:4]:
            values[f] = 1.
        self.assertEqual(a.scores(values)["ge4_state_certain"], "impaired")
        self.assertIsNone(a.scores(values)["ge4_state_complete"])

    def test_no_measurements_is_unknown(self):
        result = a.scores({})
        self.assertIsNone(result["published_fgi_mean_observed"])
        self.assertEqual(result["published_severe_sum_na_removed"], 0)
        self.assertIsNone(result["ge4_state_certain"])

    def test_author_transform_and_physical_exclusion(self):
        values = dict.fromkeys(a.ORDINAL_FIELDS, 0.)
        values.update(dermatitis=.75, response_to_analgesic=1, body_weight=40, temperature=37)
        result = a.scores(values)
        self.assertEqual(result["published_severe_sum_na_removed"], 1)
        self.assertAlmostEqual(result["published_fgi_mean_observed"], 1.5 / 30)
        self.assertEqual(values["dermatitis"], .75)  # no mutation

    def test_invalid_ordinal_rejected(self):
        with self.assertRaisesRegex(ValueError, "Out-of-range"):
            a.scores({"activity": 3})


class IdentityDateTests(unittest.TestCase):
    def test_author_identity_correction_and_exit_preservation(self):
        row = fixture("DO-AL-0097")
        animals, visits, undated, quality = a.adapt_rows([row], list(row))
        self.assertEqual(animals[0]["animal_id"], "DO-AL-0105")
        self.assertEqual(animals[0]["source_id"], "DO-AL-0097")
        self.assertEqual(animals[0]["exit_class"], "euthanized_sick")
        self.assertEqual(len(visits), 2)
        self.assertEqual(quality["empty_slots"], 1)
        self.assertEqual(undated, [])
        self.assertEqual(visits[1]["history_days_observed"], 7)
        self.assertNotIn("date_exit", visits[0])
        self.assertNotIn("has_clinical_record_whole_record", visits[0])

    def test_canonical_identity_collision_rejected(self):
        rows = [fixture("DO-AL-0097"), fixture("DO-AL-0105")]
        with self.assertRaisesRegex(ValueError, "collision"):
            a.adapt_rows(rows, list(rows[0]))

    def test_undated_data_preserved_not_assigned_fake_visit(self):
        row = fixture()
        row["activity_3"] = "1"
        _, visits, undated, _ = a.adapt_rows([row], list(row))
        self.assertEqual(len(visits), 2)
        self.assertEqual(len(undated), 1)
        self.assertEqual(undated[0]["activity"], 1)
        self.assertIsNone(undated[0]["collection_date"])

    def test_post_exit_animal_flagged_without_date_repair(self):
        row = fixture()
        row["date_exit"] = "2020-01-12"
        animals, visits, _, quality = a.adapt_rows([row], list(row))
        self.assertFalse(animals[0]["endpoint_chronology_valid"])
        self.assertEqual(animals[0]["date_exit"], "2020-01-12")
        self.assertEqual(len(visits), 2)
        self.assertEqual(len(quality["assessments_after_exit"]), 1)

    def test_unknown_exit_does_not_become_death(self):
        row = fixture()
        row["exit_reason"] = ""
        animals, _, _, _ = a.adapt_rows([row], list(row))
        self.assertEqual(animals[0]["exit_class"], "unknown")
        self.assertFalse(animals[0]["published_exit_inclusion"])

    def test_duplicate_day_quarantined(self):
        row = fixture()
        row["collection_date_2"] = row["collection_date_1"]
        animals, visits, _, quality = a.adapt_rows([row], list(row))
        self.assertFalse(animals[0]["endpoint_chronology_valid"])
        self.assertEqual(len(visits), 2)
        self.assertEqual(len(quality["duplicate_dates"]), 1)

    def test_nonfinite_measurement_rejected(self):
        with self.assertRaisesRegex(ValueError, "Nonfinite"):
            a.parse_number("inf")

    def test_wrong_input_hash_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "wrong.zip"
            source.write_bytes(b"not the licensed pinned archive")
            with self.assertRaisesRegex(ValueError, "pinned"):
                a.run(source, root / "out")
            self.assertFalse((root / "out").exists())


if __name__ == "__main__":
    unittest.main()
