import unittest
import numpy as np
from transfer import moments,shrinkage,weighted_mean,score,macro,tune,predict,risk_orders

class TransferTests(unittest.TestCase):
    def test_missing_aware_moments_match_hand_calculation(self):
        stats=moments([np.array([[1,np.nan,np.nan]]),np.array([[3,4,np.nan]]),np.array([[5,8,6]])])
        np.testing.assert_array_equal(stats.count,[[3,2,1]])
        np.testing.assert_allclose(stats.mean,[[3,6,6]])
        self.assertAlmostEqual(stats.magnitude[0],22.5)
        self.assertAlmostEqual(stats.variance[0],6)
        self.assertAlmostEqual(stats.mean_variance[0],8/3)
        self.assertAlmostEqual(shrinkage(stats,1)[0],1-(8/3)/22.5)

    def test_unsupported_prediction_is_zero_but_its_finite_truth_is_scored(self):
        stats=moments([np.array([[np.nan,2]]),np.array([[np.nan,2]])])
        np.testing.assert_array_equal(stats.mean,[[0,2]])
        scored=score(stats.mean,np.array([[4,2]]))
        self.assertEqual(scored['mse'][0],8)
        self.assertEqual(scored['truth_genes'][0],2)

    def test_missing_truth_is_not_zero_imputed(self):
        result=score(np.array([[1,100,0]]),np.array([[2,np.nan,3]]))
        self.assertEqual(result['mse'][0],5)
        self.assertEqual(result['truth_genes'][0],2)

    def test_no_disagreement_estimate_is_flagged_and_ranked_last(self):
        stats=moments([np.array([[2,3],[1,1]]),np.array([[np.nan,np.nan],[2,2]])])
        self.assertTrue(np.isnan(stats.variance[0]))
        self.assertEqual(shrinkage(stats,2)[0],1)
        self.assertEqual(risk_orders(stats,['a','b'])['relative_disagreement'][-1],0)

    def test_zero_response_has_undefined_direction(self):
        result=score(np.zeros((1,2)),np.ones((1,2)))
        self.assertTrue(np.isnan(result['cosine'][0]))
        self.assertEqual(result['mse'][0],1)

    def test_zero_penalty_is_exact_mean_even_when_eligible_signal_is_zero(self):
        stats=moments([np.array([[0,5]]),np.array([[0,np.nan]]),np.array([[0,np.nan]])])
        np.testing.assert_array_equal(weighted_mean(stats,shrinkage(stats,0)),[[0,5]])
        np.testing.assert_array_equal(weighted_mean(stats,shrinkage(stats,1)),[[0,0]])

    def test_template_gives_equal_weight_to_contexts_with_unequal_missingness(self):
        stats=moments([np.array([[2],[4]]),np.array([[10],[np.nan]])])
        self.assertEqual(stats.template[0],6.5)

    def test_invalid_shapes_and_infinity_are_rejected(self):
        with self.assertRaises(ValueError):moments([])
        with self.assertRaises(ValueError):moments([np.ones((2,3)),np.ones((3,2))])
        with self.assertRaises(ValueError):moments([np.array([[np.inf]])])
        with self.assertRaises(ValueError):score(np.zeros((1,1)),np.array([[np.inf]]))
        with self.assertRaises(ValueError):score(np.array([[np.nan]]),np.ones((1,1)))

    def test_zero_training_ties_follow_frozen_rules(self):
        config=tune([np.zeros((3,4)) for _ in range(3)])
        self.assertEqual(config['global_alpha'],0)
        self.assertEqual(config['heterogeneity_penalty'],2)

    def test_outer_truth_poisoning_cannot_change_predictions_or_tuning(self):
        rng=np.random.default_rng(8)
        sources=[rng.normal(size=(8,5)) for _ in range(3)]
        for source in sources:source.setflags(write=False)
        predictions,_,config=predict(sources)
        before={k:v.copy() for k,v in predictions.items()}
        score(predictions['heterogeneity_shrink'],np.full((8,5),1000000))
        again,_,other=predict(sources)
        self.assertEqual(config,other)
        for key in before:np.testing.assert_array_equal(before[key],again[key])

    def test_aligned_gene_permutation_preserves_scores(self):
        rng=np.random.default_rng(3);sources=[rng.normal(size=(6,7)) for _ in range(3)]
        truth=rng.normal(size=(6,7));order=[6,1,3,2,5,0,4]
        first=moments(sources);second=moments([x[:,order] for x in sources])
        np.testing.assert_allclose(score(first.mean,truth)['mse'],score(second.mean,truth[:,order])['mse'])
        np.testing.assert_allclose(shrinkage(first,1),shrinkage(second,1))

    def test_identical_contexts_preserve_target_identity_and_unshrunk_mean(self):
        truth=np.eye(8,dtype=np.float32)
        predictions,stats,_=predict([truth,truth,truth])
        np.testing.assert_array_equal(predictions['target_mean'],truth)
        np.testing.assert_array_equal(weighted_mean(stats,shrinkage(stats,1)),truth)
        self.assertGreater(macro(score(predictions['permuted_target_mean'],truth)['mse']),0)

if __name__=='__main__':unittest.main(verbosity=2)
