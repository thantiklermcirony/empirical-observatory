"""Artificial tables test joins and validation, not biological predictions."""
import tempfile
from pathlib import Path
import unittest

from assay_preflight import paired_audit, read_assay

HEADER = "Chromosome,Position,Ref,Alt,Tags,Value,P-Value\n"


class AssayTests(unittest.TestCase):
    def test_join_matches_alleles_and_filters_both_contexts(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b = Path(directory) / "a.csv", Path(directory) / "b.csv"
            a.write_text(HEADER + "1,100,A,C,12,0.25,0.01\n1,101,T,G,9,0.1,0.2\n1,102,C,T,20,0.0,1\n")
            b.write_text(HEADER + "chr1,100,A,C,15,0.75,0.02\nchr1,101,T,G,11,0.4,0.3\nchr1,102,C,A,20,0.1,0.4\n")
            result = paired_audit(a, b, "https://example.org/fixture", "GRCh38")
            self.assertEqual(len(result["pairs"]), 1)
            self.assertEqual(result["pairs"][0]["differenceLog2ReporterEffect"], 0.5)
            self.assertEqual(result["matchedBeforeQualityFilter"], 2)
            self.assertEqual(result["onlyInHEK293T"], 1)
            self.assertEqual(result["networkCalls"], 0)

    def test_rejects_nonfinite_missing_and_duplicate_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "table.csv"
            for rows in ("1,100,A,C,12,nan,0.01\n", "1,100,A,C,12,,0.01\n",
                         "1,100,A,C,12,0.1,0.01\n1,100,A,C,12,0.2,0.01\n"):
                path.write_text(HEADER + rows)
                with self.subTest(rows=rows), self.assertRaises(ValueError):
                    read_assay(path)

    def test_rejects_wrong_assembly_before_reading_anything(self):
        with self.assertRaises(ValueError):
            paired_audit(Path("absent"), Path("absent"), "https://example.org/fixture", "GRCh37")


if __name__ == "__main__":
    unittest.main()
