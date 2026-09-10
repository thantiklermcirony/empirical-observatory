import unittest
from assess import assess
class AssessmentTests(unittest.TestCase):
    def setUp(self):
        self.r={'further_window_search':False,'eligible_landmarks':100,'windows_examined':[{'target_day':7,'window':[5,9],'resolved':84}]}
        self.g={'records':[],'capturedAt':None,'resolved':0,'missed':0}
    def test_better_model_score_cannot_erase_failed_observation_gate(self):
        for score in [0,.99]:
            self.r['model_improvement']=score
            d=assess(self.r,self.g,now='fixed')
            self.assertFalse(d['checks'][0]['passed']);self.assertFalse(d['autonomous_model_promotion'])
            self.assertEqual(d['next_actions'][0]['id'],'recovery-better-followup')
    def test_missing_slots_produce_review_without_disappearing(self):
        self.g['missed']=5
        d=assess(self.r,self.g,now='fixed')
        self.assertEqual(d['next_actions'][-1]['id'],'grid-availability')
        self.assertEqual(self.g['missed'],5)
    def test_same_evidence_same_hash_and_closed_window_selection_required(self):
        self.assertEqual(assess(self.r,self.g,now='a')['inputs_sha256'],assess(self.r,self.g,now='b')['inputs_sha256'])
        self.r['further_window_search']=True
        with self.assertRaises(ValueError): assess(self.r,self.g)
    def test_impossible_counts_rejected(self):
        self.r['windows_examined'][0]['resolved']=101
        with self.assertRaises(ValueError): assess(self.r,self.g)
if __name__=='__main__':unittest.main()
