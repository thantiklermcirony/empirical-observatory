"""Declared model inquiries, not interpretations extracted from arbitrary prose."""
from copy import deepcopy
import argparse
from pathlib import Path
from io_utils import read_json, write_json
from configure import catalogue


def base(identity, jurisdiction, clock, premises):
    return {'identity': {'id': identity, 'revision': 1},
            'question': {'original': 'Run the explicitly declared scientific question.', 'scope': 'Structured model inquiry'},
            'system': {'jurisdiction': jurisdiction},
            'observer': {'preparation_id': 'synthetic-preparation-1', 'clock': clock},
            'quantities': [], 'operations': [], 'constraints': {}, 'mechanism': {},
            'premises': [{'id': name, 'status': 'assumed'} for name in premises],
            'execution': {'compression': 'ordered'}, 'results': [], 'contrast': {}, 'next_question': {},
            'provenance': {'evidence_kind': 'synthetic', 'interpretation_origin': 'authored structured model'}}


def quantity(identity, meaning, role, unit, value, shape='scalar', **context):
    return dict(id=identity, meaning=meaning, role=role, unit=unit, shape=shape, value=value, **context)


def actions(reverse=False):
    q = base('bounded-word', 'bounded_scalar_model', {'kind': 'action_index', 'unit': '1'},
             ['DECLARED-PROJECTIVE', 'DECLARED-CONTRACTION', 'FIXED-CALIBRATION'])
    q['question']['original'] = 'Does the order of declared alignment and contraction affect the final bounded state?'
    q['quantities'] = [quantity('x', 'bounded_scalar_state', 'state', '1', '1/4'),
                       quantity('u', 'action_parameter', 'parameter', '1', '1/3'),
                       quantity('c', 'contraction_factor', 'parameter', '1', '1/2')]
    verbs = [('align', 'u'), ('contract', 'c')]
    if reverse: verbs.reverse()
    q['operations'] = [{'id': f'step{i}', 'verb': verb, 'kind': 'action',
                        'inputs': {'state': 'x' if i == 0 else {'step': f'step{i-1}'}, 'parameter': param}}
                       for i, (verb, param) in enumerate(verbs)]
    models = {'align': 'math.projective.action', 'contract': 'math.contraction.action'}
    q['mechanism'] = {'models': {op['id']: models[op['verb']] for op in q['operations']}}
    q['question']['scope'] = 'Declared abstract maps: align=(x+u)/(1+x*u), contract=c*x. These are not inferred physical interventions.'
    return q


def resource(corrected=False):
    cap = next(c for c in catalogue() if c['id'] == 'biology.resource.ceiling')
    q = base('resource-observation', 'synthetic_redox_resource_model', cap['clock'], cap['premises'])
    time = {'value': '0', 'unit': 'min'}
    q['observer']['time'] = time
    context = {'time': time, 'preparation_id': q['observer']['preparation_id']}
    q['question']['original'] = 'Can a0.60mM GPx target be excluded by the stipulated necessary resource ceiling?'
    q['quantities'] = [quantity('q', 'reduced_fraction_q', 'observable', '1', '0.99', **context),
        quantity('T', 'glutathione_total_pool', 'resource', 'mM', ['0.98', '1'], 'interval', **context),
        quantity('N', 'nadph_reserve', 'resource', 'uM', ['60', '80'] if corrected else ['9', '11'], 'interval', **context),
        quantity('target', 'gpx_extent_target', 'parameter', 'mM', '0.60')]
    q['operations'] = [{'id': 'ceiling', 'verb': 'bound_resource', 'kind': 'derive',
        'inputs': {'fraction': 'q', 'total_pool': 'T', 'nadph': 'N', 'target': 'target'}}]
    q['mechanism'] = {'models': {'ceiling': cap['id']}}
    q['question']['scope'] = 'Stipulated ceiling q*T/2+N+0.06mM. ' + cap['scope']
    if corrected:
        q['identity']['revision'] = 2
        q['provenance']['correction'] = {'replaces': 'revision1:N', 'reason': 'Synthetic corrected observation of the same preparation at the same physical time.'}
    return q


def quantum(quantum_root):
    original = read_json(Path(quantum_root) / 'fixtures/reference.json')
    q = base('quantum-model-prediction', 'quantum_reference_model', {'kind': 'model', 'unit': 'model_time'}, ['P-H', 'P-E', 'P-R', 'P-I'])
    q['question']['original'] = 'Predict yields for the supplied dimensionless reference ensembles.'
    q['quantities'] = [quantity('protocol', 'four_level_reference_protocol', 'mechanism', 'model_time', original['operations']['input'], 'object')]
    q['operations'] = [{'id': 'yields', 'verb': 'predict_yields', 'kind': 'derive', 'inputs': {'protocol': 'protocol'}}]
    return q


def write_examples(folder, quantum_root):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    for name, q in [('actions-ab', actions()), ('actions-ba', actions(True)), ('resource', resource()),
                    ('resource-corrected', resource(True)), ('quantum', quantum(quantum_root))]:
        write_json(folder / (name + '.json'), q)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    parser.add_argument('--quantum-root', required=True)
    args = parser.parse_args()
    write_examples(args.out, args.quantum_root)
