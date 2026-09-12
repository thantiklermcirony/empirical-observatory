"""Real engine tests for the local routing upgrade; no hosted claim."""
from copy import deepcopy
from pathlib import Path
import os
import tempfile
import unittest

from configure import configure
from examples import actions, resource, quantum
from grammar import compile_inquiry, digest as grammar_digest
from io_utils import canonical, digest, read_json, write_json
from run import execute, check_receipt

ROOT = Path(__file__).resolve().parent.parent
VENDOR = Path(__file__).resolve().parent/'vendor'
DEPENDENCIES = VENDOR if VENDOR.exists() else ROOT/'adapter-review'
MATH_ROOT = Path(os.environ.get('OBSERVATORY_MATH_ROOT', DEPENDENCIES/'math'))
QUANTUM_ROOT = Path(os.environ.get('OBSERVATORY_QUANTUM_ROOT', DEPENDENCIES/'quantum'))
REFERENCE_ROOT = Path(os.environ.get('OBSERVATORY_REFERENCE_ROOT', DEPENDENCIES/'reference'))


class IntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = configure(MATH_ROOT, QUANTUM_ROOT, REFERENCE_ROOT)
        cls.catalogue = {'capabilities': [{k:v for k,v in c.items() if k != 'source_groups'} for c in cls.config['capabilities']]}
        cls.tmp = tempfile.TemporaryDirectory(prefix='temporal-grammar-check-')
        cls.folder = Path(cls.tmp.name)
        cls.counter = 0

    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    def run_case(self, inquiry, config=None, previous=None):
        type(self).counter += 1
        return execute(inquiry, config or self.config, self.folder/str(self.counter), previous)

    def assert_no_calls(self, inquiry):
        report = self.run_case(inquiry)
        self.assertEqual(report['execution']['jobs'], [])
        self.assertTrue(all(r['value'] is None for r in report['results']))
        return report

    def test_real_ordered_actions(self):
        ab, ba = self.run_case(actions()), self.run_case(actions(True))
        self.assertEqual(ab['results'][-1]['value'], '7/26')
        self.assertEqual(ba['results'][-1]['value'], '11/25')
        self.assertEqual([s['verb'] for s in ab['execution']['scientific_word']], ['align','contract'])
        self.assertEqual(ab['execution']['jobs'][1]['input_ports'], ['parameter','state'])
        self.assertIn('DECLARED-PROJECTIVE', ab['results'][1]['premise_ids'])
        self.assertEqual(set(ab), set(actions()))
        check_receipt(ab)

    def test_real_resource_correction_and_withdrawal(self):
        normal = self.run_case(resource())
        corrected = self.run_case(resource(True), previous=normal)
        self.assertEqual(normal['results'][0]['value']['ceiling_interval_mM'], ['5541/10000','283/500'])
        self.assertEqual(corrected['results'][0]['value']['ceiling_interval_mM'], ['6051/10000','127/200'])
        self.assertTrue(normal['results'][0]['value']['target_excluded'])
        self.assertFalse(corrected['results'][0]['value']['target_excluded'])
        removed = resource(True); removed['identity']['revision']=3
        removed['provenance'].pop('correction')
        next(p for p in removed['premises'] if p['id']=='BIO-VOLUME')['status']='missing'
        report = self.run_case(removed, previous=corrected)
        self.assertEqual(report['execution']['jobs'], [])
        self.assertEqual(report['contrast']['revision_changes'][0]['transition'], 'withdrawn')
        self.assertIsNone(report['results'][0]['value'])
        self.assertTrue(normal['results'][0]['value']['target_excluded'])
        check_receipt(normal)

    def test_correction_target_and_single_value_context(self):
        previous = self.run_case(resource())
        mutations = [
            lambda q: q['provenance']['correction'].update(replaces='nonexistent-preparation:missing-signal'),
            lambda q: q['provenance']['correction'].update(replaces='revision1:missing'),
            lambda q: q['provenance']['correction'].update(replaces='revision2:N'),
            lambda q: q['provenance']['correction'].update(reason=''),
            lambda q: q['quantities'][2].update(unit='mM'),
            lambda q: q['quantities'][2].update(time={'value':'1','unit':'min'}),
            lambda q: q['quantities'][1].update(value=['0.99','1']),
            lambda q: q['premises'][0].update(status='derived'),
            lambda q: q['quantities'][2].update(value=['9','11']),
        ]
        for mutate in mutations:
            q = resource(True); mutate(q)
            with self.subTest(mutation=mutate), self.assertRaises(ValueError):
                self.run_case(q, previous=previous)
            self.assertFalse((self.folder/str(self.counter)).exists())
        with self.assertRaises(ValueError): self.run_case(resource(True))
        corrected = self.run_case(resource(True), previous=previous)
        self.assertEqual(corrected['contrast']['revision_binding']['kind'],'validated_quantity_replacement')

    def test_equal_numbers_keep_changed_support_and_descendants(self):
        q = actions(); q['quantities'][0]['value']='0'; q['quantities'][1]['value']='0'
        initial = self.run_case(q)
        q['identity']['revision'] = 2
        next(p for p in q['premises'] if p['id']=='DECLARED-PROJECTIVE')['status']='derived'
        revised = self.run_case(q, previous=initial)
        self.assertEqual([r['value'] for r in revised['results']],['0','0'])
        self.assertEqual([c['transition'] for c in revised['contrast']['revision_changes']],['support_changed','support_changed'])
        q['identity']['revision'] = 3
        same = self.run_case(q, previous=revised)
        self.assertEqual([c['transition'] for c in same['contrast']['revision_changes']],['unchanged','unchanged'])

    def test_equal_numbers_new_preparation_are_different_support(self):
        q=resource(); previous=self.run_case(q)
        q['identity']['revision']=2
        q['observer']['preparation_id']='new-preparation'
        for item in q['quantities'][:3]: item['preparation_id']='new-preparation'
        report=self.run_case(q, previous=previous)
        self.assertEqual(report['contrast']['revision_binding']['kind'],'revision_comparison')
        self.assertEqual(report['contrast']['revision_changes'][0]['transition'],'support_changed')
        self.assertEqual(report['results'][0]['value'],previous['results'][0]['value'])

    def test_unused_input_changes_do_not_change_scientific_support(self):
        q=resource(); q['quantities'].append({'id':'unused','meaning':'unrelated_note','role':'metadata','unit':'1','shape':'scalar','value':'one'})
        previous=self.run_case(q)
        q['identity']['revision']=2; q['quantities'][-1]['value']='two'
        report=self.run_case(q, previous=previous)
        self.assertEqual(report['contrast']['revision_changes'][0]['transition'],'unchanged')

    def test_no_observation_value_no_calls(self):
        q=resource(); q['quantities'][2].pop('value'); self.assert_no_calls(q)

    def test_wrong_units_or_role_no_calls(self):
        for field,value in [('unit','a.u.'),('unit','uM/s'),('role','trajectory'),('meaning','optical_intensity')]:
            q=resource(); q['quantities'][2][field]=value
            with self.subTest(field=field,value=value): self.assert_no_calls(q)

    def test_context_and_time_no_calls(self):
        for mutation in ['preparation','later_sample','later_parent','record_clock']:
            q=resource()
            if mutation=='preparation': q['quantities'][2]['preparation_id']='another-cell'
            if mutation=='later_sample': q['quantities'][2]['time']={'value':'5','unit':'min'}
            if mutation=='later_parent':
                q['observer']['time']={'value':'5','unit':'min'}
                for item in q['quantities'][:3]: item['time']={'value':'5','unit':'min'}
            if mutation=='record_clock': q['observer']['clock']={'kind':'recording','unit':'min'}
            with self.subTest(mutation=mutation): self.assert_no_calls(q)

    def test_bound_not_trajectory_or_intervention(self):
        q=resource(); q['operations'][0]['requested_output']={'meaning':'achieved_gpx_extent','role':'trajectory','unit':'mM','shape':'object'}
        self.assert_no_calls(q)
        q=resource(); q['operations'][0]['kind']='action'; self.assert_no_calls(q)

    def test_missing_wait_blocks_physical_descendants(self):
        q=actions(); q['operations'].insert(0,{'id':'wait0','verb':'wait','kind':'wait','inputs':{}})
        self.assert_no_calls(q)

    def test_unrelated_gap_preserves_biology(self):
        q=resource(); q['operations'].append({'id':'quantum-link','verb':'infer_quantum_redox','kind':'derive','inputs':{}})
        q['mechanism']={}
        r=self.run_case(q)
        self.assertTrue(r['results'][0]['value']['target_excluded'])
        self.assertIsNone(r['results'][1]['value'])
        self.assertEqual(len(r['execution']['jobs']),1)
        self.assertEqual(r['execution']['status'],'partial_or_gap')

    def test_unused_inputs_not_delivered(self):
        q=resource(); q['quantities'].append({'id':'unused','meaning':'unrelated_note','role':'metadata','unit':'1','shape':'scalar','value':'private-unrelated-marker'})
        r=self.run_case(q)
        self.assertEqual(r['execution']['jobs'][0]['input_ports'],['fraction','nadph','target','total_pool'])
        job=read_json(self.folder/str(self.counter)/'job-0.json')
        self.assertNotIn(b'private-unrelated-marker',canonical(job))

    def test_unrelated_source_hold_preserves_biology(self):
        config=deepcopy(self.config); config['source_files']['reference'][next(iter(config['source_files']['reference']))]='0'*64
        r=self.run_case(resource(),config)
        self.assertTrue(r['results'][0]['value']['target_excluded'])
        q=self.run_case(quantum(QUANTUM_ROOT),config)
        self.assertIsNone(q['results'][0]['value'])
        self.assertFalse(q['execution']['jobs'][0]['executed'])

    def test_relevant_source_change_stops_execution(self):
        config=deepcopy(self.config); config['source_files']['geometry'][next(iter(config['source_files']['geometry']))]='0'*64
        r=self.run_case(resource(),config)
        self.assertIsNone(r['results'][0]['value'])
        self.assertFalse(r['execution']['jobs'][0]['executed'])

    def test_actual_quantum_adapter(self):
        q=self.run_case(quantum(QUANTUM_ROOT))
        self.assertEqual(q['results'][0]['status'],'established_in_scope')
        native=q['results'][0]['value']['conclusions']
        yields=next(x for x in native if x['id']=='Q-REFERENCE-YIELDS')['value']
        self.assertAlmostEqual(yields[0]['final']['yield_s'],.75,places=12)
        self.assertAlmostEqual(yields[1]['final']['yield_s'],.25,places=12)
        self.assertEqual(next(x for x in native if x['id']=='Q-REDOX-MAP')['status'],'unresolved')

    def test_compression_is_not_proof_of_equivalence(self):
        q=actions(); q['execution']['compression']='counts'; self.assert_no_calls(q)

    def test_changed_receipt_and_stale_revision(self):
        original=self.run_case(resource())
        changed=deepcopy(original); changed['results'][0]['value']['target_excluded']=False
        with self.assertRaises(ValueError): self.run_case(resource(True),previous=changed)
        with self.assertRaises(ValueError): self.run_case(resource(),previous=original)

    def test_canonical_unicode_and_duplicate_json(self):
        self.assertEqual(grammar_digest({'word':'Δ → β'}),digest({'word':'Δ → β'}))
        f=self.folder/'duplicate.json'; f.write_text('{"id":1,"id":2}')
        with self.assertRaises(ValueError): read_json(f)


if __name__=='__main__': unittest.main()
