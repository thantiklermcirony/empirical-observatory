"""Fixed local capability worker. All code paths come from coordinator configuration."""
import argparse
from copy import deepcopy
from fractions import Fraction as F
import importlib.util
from pathlib import Path
import re
import sys
import tempfile

from io_utils import check_sources, digest, read_json, write_json


def number(value):
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        raise ValueError('Use exact integer/fraction/decimal strings')
    if len(str(value)) > 160 or not re.fullmatch(r'[+-]?(?:\d+(?:/[+-]?\d+)?|\d*\.\d+)', str(value)):
        raise ValueError('Exact numeric syntax or size limit')
    result = F(value)
    if max(abs(result.numerator).bit_length(), result.denominator.bit_length()) > 512:
        raise ValueError('Exact numeric bit budget')
    return result


def interval(value):
    if not isinstance(value, list) or len(value) != 2:
        raise ValueError('An interval needs two exact endpoints')
    lo, hi = map(number, value)
    if lo > hi:
        raise ValueError('Reversed interval')
    return lo, hi


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    sys.modules[name] = result
    spec.loader.exec_module(result)
    return result


def rational_action(capability, bindings, config):
    x = number(bindings['state']['value'])
    parameter = number(bindings['parameter']['value'])
    if not -1 < x < 1:
        raise ValueError('Declared state must be in the open unit interval')
    if capability == 'math.projective.action':
        if not -1 < parameter < 1:
            raise ValueError('Projective parameter must be in the open unit interval')
        expression = '(x+p)/(1+x*p)'
    else:
        if not 0 <= parameter <= 1:
            raise ValueError('Contraction factor must be between zero and one')
        expression = 'p*x'
    root = Path(config['source_roots']['engine']) / 'inputs/engine'
    sys.path.insert(0, str(root))
    engine = module(root / 'engine.py', 'routed_exact_engine')
    manifest = {
        'version': 1, 'id': capability, 'question': 'Evaluate this declared action at the supplied point.',
        'symbols': {k: {'interval': [str(v), str(v)], 'units': {}} for k, v in [('x', x), ('p', parameter)]},
        'premises': {'action': {'status': 'assumed', 'statement': 'The action has the declared formula in this model.', 'question': 'What establishes this action model?'}},
        'steps': [{'id': 'point', 'operation': 'evaluate', 'expression': expression,
                   'values': {'x': str(x), 'p': str(parameter)}, 'premises': ['action']}],
    }
    native = engine.execute(manifest)
    step = native['steps'][0]
    if step['status'] != 'verified':
        raise ValueError('Exact point evaluation did not verify')
    return {'value': step['value'], 'native': native,
            'interpretation': 'Exact point in the declared bounded scalar model; no empirical state identification.'}


def resource(bindings, config):
    q = number(bindings['fraction']['value'])
    total = interval(bindings['total_pool']['value'])
    reserve = interval(bindings['nadph']['value'])
    target_extent = number(bindings['target']['value'])
    if not 0 <= q <= 1 or not 0 <= target_extent <= 10:
        raise ValueError('Fraction or target outside the supported model range')
    if bindings['nadph']['unit'] == 'uM':
        reserve = tuple(v / 1000 for v in reserve)
    if total[0] < F(1, 5) or total[1] > 1 or reserve[0] < 0 or reserve[1] > F(2, 25):
        raise ValueError('Resource observation outside the admitted rectangle')
    root = Path(config['source_roots']['geometry']) / 'inputs/companion/vendor'
    geometry = module(root / 'geometry.py', 'routed_resource_geometry')
    poly, target, offset = geometry.resource_fibre(q)
    poly = poly.intersect((1, 0), *total).intersect((0, 1), *reserve)
    if not poly.vertices():
        raise ValueError('No compatible resource state')
    bounds = poly.bounds(target, offset)
    value = {'ceiling_interval_mM': [str(bounds['lower']), str(bounds['upper'])],
             'width_mM': str(bounds['width']), 'target_mM': str(target_extent),
             'target_excluded': target_extent > bounds['upper']}
    return {'value': value, 'native': geometry.serialize(bounds) if hasattr(geometry, 'serialize') else serial(bounds),
            'interpretation': 'Possible necessary ceilings under the declared fixed-volume resource ledger; not achieved extent or survival.'}


def serial(value):
    if isinstance(value, F): return str(value)
    if isinstance(value, dict): return {k: serial(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)): return [serial(v) for v in value]
    return value


def quantum(bindings, config):
    root = Path(config['source_roots']['quantum'])
    protocol = deepcopy(bindings['protocol']['value'])
    if not isinstance(protocol, dict):
        raise ValueError('Quantum protocol must be a structured object')
    clock = protocol.get('clock', {})
    if clock.get('units') != 'model_time' or not isinstance(clock.get('points'), int) or not 2 <= clock['points'] <= 201:
        raise ValueError('Unsupported quantum clock or grid budget')
    if len(protocol.get('preparations', [])) > 4:
        raise ValueError('Preparation budget exceeded')
    request = read_json(root / 'fixtures/reference.json')
    request['operations']['input'] = protocol
    # These are conditional model hypotheses, not inferred physical facts.
    for premise in ['P-H', 'P-E', 'P-R', 'P-I']:
        if protocol.get('premises', {}).get(premise) not in {'assumed', 'derived'}:
            raise ValueError('Required native quantum premise is unavailable: ' + premise)
    sys.path.insert(0, str(root))
    bridge = module(root / 'bridge.py', 'routed_quantum_bridge')
    with tempfile.TemporaryDirectory(prefix='observatory-quantum-') as folder:
        target = Path(folder) / 'native'
        native = bridge.execute(request, target, reference_root=config['source_roots']['reference'])
        checks = bridge.verify(request, target, reference_root=config['source_roots']['reference'])
        if not all(checks.values()):
            raise ValueError('Quantum native receipt did not verify')
    return {'value': {'conclusions': native['results']['conclusions']}, 'native': native,
            'interpretation': 'Conditional dimensionless four-level model prediction; no quantum-to-redox or physical-time calibration.'}


def run(job, config):
    capability = job['capability_id']
    spec = next(c for c in config['capabilities'] if c['id'] == capability and c['enabled'])
    groups = ['runtime', *spec['source_groups']]
    check_sources(config, groups)
    if capability in {'math.projective.action', 'math.contraction.action'}:
        result = rational_action(capability, job['bindings'], config)
    elif capability == 'biology.resource.ceiling':
        result = resource(job['bindings'], config)
    elif capability == 'quantum.reference.evolve':
        result = quantum(job['bindings'], config)
    else:
        raise ValueError('No fixed worker handler for capability')
    check_sources(config, groups)
    result.update(capability_id=capability, job_sha256=digest(job), source_files={k: config['source_files'][k] for k in groups})
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    parser.add_argument('--job', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    try:
        output = Path(args.out)
        if output.exists(): raise ValueError('Output already exists')
        write_json(output, run(read_json(args.job), read_json(args.config)))
    except (ValueError, KeyError, TypeError, ArithmeticError, OSError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(2)
