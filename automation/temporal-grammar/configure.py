"""Operator-only configuration of local, explicitly reviewed dependency copies."""
import argparse
from pathlib import Path
import sys

from io_utils import check_sources, file_hash, read_json, write_json


ENGINE_PINS = {
    'inputs/engine/engine.py': '2d0324723a97cb5ac40ecd9dfbd6bf7c45505b8d532642ea9e4499b2d4cacb62',
    'inputs/engine/algebra.py': 'ded785815328fb8b8e133364568918037bbc3b327c2daf0d7845bf87e02c0378',
}
GEOMETRY_PINS = {'inputs/companion/vendor/geometry.py': '04ff1dff72e2f4c0b4f094a1a988e60ba74712e92959d661a070eae9f65e3407'}


def port(meaning, role, units, shape='scalar', contextual=False):
    return dict(meaning=meaning, role=role, units=units, shape=shape, contextual=contextual)


def output(meaning, role, unit, shape='scalar'):
    return dict(meaning=meaning, role=role, unit=unit, shape=shape)


def catalogue():
    caps = []
    for name, verb, premise in [('projective', 'align', 'DECLARED-PROJECTIVE'), ('contraction', 'contract', 'DECLARED-CONTRACTION')]:
        caps.append(dict(id=f'math.{name}.action', verb=verb, kind='action',
            jurisdictions=['bounded_scalar_model'], owner='mathematics', enabled=True,
            inputs={'state': port('bounded_scalar_state', 'state', ['1']),
                    'parameter': port('action_parameter' if name == 'projective' else 'contraction_factor', 'parameter', ['1'])},
            output=output('bounded_scalar_state', 'state', '1'),
            premises=[premise, 'FIXED-CALIBRATION'], clock={'kind': 'action_index', 'unit': '1'},
            scope='Exact action at a supplied point in a declared bounded scalar model; no physical dynamics inferred.',
            result_kind='formal_under_premises', source_groups=['engine']))
    caps.append(dict(id='biology.resource.ceiling', verb='bound_resource', kind='derive',
        jurisdictions=['synthetic_redox_resource_model'], owner='biology+mathematics', enabled=True,
        inputs={'fraction': port('reduced_fraction_q', 'observable', ['1'], contextual=True),
                'total_pool': port('glutathione_total_pool', 'resource', ['mM'], 'interval', True),
                'nadph': port('nadph_reserve', 'resource', ['mM', 'uM'], 'interval', True),
                'target': port('gpx_extent_target', 'parameter', ['mM'])},
        output=output('gpx_necessary_resource_ceiling', 'bound', 'mM', 'object'),
        premises=['BIO-VOLUME', 'BIO-LEDGER', 'BIO-NONNEG', 'BIO-SUPPLY', 'BIO-UNIT-MAP', 'BIO-MATCHED-UNIT', 'BIO-ASSAY-CALIBRATION'],
        clock={'kind': 'physical', 'unit': 'min'}, observation_time={'value': '0', 'unit': 'min'},
        scope='Stipulated time-zero stocks, fixed volume and source ceiling0.003mM/min over20min; possible necessary ceilings, not achieved extent.',
        result_kind='formal_under_premises', source_groups=['geometry']))
    caps.append(dict(id='quantum.reference.evolve', verb='predict_yields', kind='derive',
        jurisdictions=['quantum_reference_model'], owner='quantum', enabled=True,
        allow_observation_time=False,
        inputs={'protocol': port('four_level_reference_protocol', 'mechanism', ['model_time'], 'object')},
        output=output('reference_product_yields', 'prediction', '1', 'object'),
        premises=['P-H', 'P-E', 'P-R', 'P-I'], clock={'kind': 'model', 'unit': 'model_time'},
        scope='Declared dimensionless four-level reference ensembles, no intermediate measurement or physical calibration.',
        result_kind='model_prediction', source_groups=['quantum', 'reference']))
    return caps


def configure(math_root, quantum_root, reference_root):
    math_root, quantum_root, reference_root = map(lambda p: Path(p).resolve(), (math_root, quantum_root, reference_root))
    here = Path(__file__).resolve().parent
    pins = read_json(quantum_root / 'pins.json')
    if pins['reference']['archive_sha256'] != '832f3eac93799ba6ec27677f2fd13e7264880180226af273f773b6c2a17d10d9':
        raise ValueError('Expected independently reviewed quantum reference0.1.1')
    config = {'version': 'temporal-grammar-local-config/0.1', 'capabilities': catalogue(),
        'authority': 'Operator-owned local configuration; not public authentication or new scientific admission.',
        'python_sha256': file_hash(sys.executable),
        'source_roots': {'engine': str(math_root), 'geometry': str(math_root),
                         'quantum': str(quantum_root), 'reference': str(reference_root), 'runtime': str(here)},
        'source_files': {'engine': ENGINE_PINS, 'geometry': GEOMETRY_PINS,
            'reference': pins['reference']['files'],
            'quantum': {name: file_hash(quantum_root / name) for name in ['bridge.py', 'feature_worker.py', 'pins.json', 'capabilities.json', 'fixtures/reference.json']},
            'runtime': {name: file_hash(here / name) for name in ['grammar.py', 'io_utils.py', 'worker.py', 'run.py', 'configure.py']}}}
    check_sources(config)
    return config


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--math-root', required=True)
    parser.add_argument('--quantum-root', required=True)
    parser.add_argument('--reference-root', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    write_json(args.out, configure(args.math_root, args.quantum_root, args.reference_root))
