import unittest
from memory_benchmark import episode, evaluate, fit, run, METHODS


class MemoryDiagnostic(unittest.TestCase):
    def test_upstream_reward_and_public_observation_alignment(self):
        for k in (1, 4, 16):
            a = episode(45, k)
            b = episode(45, k)
            self.assertEqual(a, b)
            self.assertEqual(len(a["rows"]), 52-k)
            if k == 1:
                self.assertAlmostEqual(a["return"], 1)

    def test_current_observation_negative_control_needs_no_memory(self):
        model = fit(range(10, 14), 1)
        self.assertEqual(model["selectedLag"], 0)
        for method in METHODS[:2]:
            self.assertAlmostEqual(evaluate(100000, 1, model, method)["accuracy"], 1)

    def test_selected_causal_history_solves_held_out_lags(self):
        for k in (4, 16):
            model = fit(range(10, 14), k)
            self.assertEqual(model["selectedLag"], k-1)
            self.assertAlmostEqual(evaluate(100000, k, model, METHODS[1])["accuracy"], 1)
            self.assertLess(evaluate(100000, k, model, METHODS[2])["accuracy"], .5)

    def test_reproducible_evidence_and_split(self):
        a, b = run(4, 4), run(4, 4)
        self.assertEqual(a["evidenceSha256"], b["evidenceSha256"])
        self.assertFalse(set(a["developmentSeeds"]) & set(a["testSeeds"]))
        for case in a["cases"]:
            self.assertEqual(len(case["episodes"]), 4*3)
            self.assertEqual(len(case["model"]["lagCandidates"]), 5)


if __name__ == "__main__":
    unittest.main(verbosity=2)
