"""Execute a typed ordered inquiry through configured existing local engines."""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
import re
import subprocess
import sys

from grammar import compile_inquiry
from io_utils import check_sources, digest, file_hash, read_json, write_json


def check_receipt(record):
    unsigned = deepcopy(record)
    expected = unsigned['execution'].pop('receipt_sha256')
    if digest(unsigned) != expected:
        raise ValueError('Changed recorded inquiry')


def validate_revision(previous, inquiry):
    """Validate local revision lineage, and explicit single-value replacements.

    An intact hash is not authenticated measurement provenance or a journal.
    """
    correction = inquiry['provenance'].get('correction')
    if previous is None:
        if correction is not None:
            raise ValueError('An explicit correction requires its previous inquiry receipt')
        return {'kind': 'initial_execution'}
    check_receipt(previous)
    if previous['identity']['id'] != inquiry['identity']['id'] or inquiry['identity']['revision'] != previous['identity']['revision'] + 1:
        raise ValueError('Revision comparison requires the same inquiry and next revision')
    comparison = {'kind': 'revision_comparison',
                  'previous_receipt_sha256': previous['execution']['receipt_sha256']}
    if correction is None:
        return comparison
    if (not isinstance(correction, dict) or set(correction) != {'replaces', 'reason'}
            or not isinstance(correction['replaces'], str)
            or not isinstance(correction['reason'], str) or not correction['reason'].strip()):
        raise ValueError('Correction requires an exact replacement reference and reason')
    match = re.fullmatch(r'revision([1-9][0-9]*):(.+)', correction['replaces'])
    if not match or int(match[1]) != previous['identity']['revision']:
        raise ValueError('Correction does not reference the previous revision')
    target = match[2]
    old = {q['id']: q for q in previous['quantities']}
    new = {q['id']: q for q in inquiry['quantities']}
    if target not in old or set(old) != set(new):
        raise ValueError('Correction references a missing quantity or changes quantity identities')
    for field in ('system', 'observer', 'operations', 'constraints', 'mechanism', 'premises'):
        if digest(previous[field]) != digest(inquiry[field]):
            raise ValueError('Quantity correction cannot also change ' + field)
    for key, before in old.items():
        after = new[key]
        if key != target:
            if digest(before) != digest(after):
                raise ValueError('Correction also changes an unnamed quantity')
            continue
        if ('value' not in before or 'value' not in after
                or before['value'] is None or after['value'] is None
                or digest(before['value']) == digest(after['value'])):
            raise ValueError('Correction must replace an existing value with a different supplied value')
        if digest({k:v for k,v in before.items() if k != 'value'}) != digest({k:v for k,v in after.items() if k != 'value'}):
            raise ValueError('Correction changes quantity meaning, units, shape or acquisition context')
    return {**comparison, 'kind': 'validated_quantity_replacement',
            'quantity_id': target, 'replaces': correction['replaces'],
            'authority': 'Local content and context check, not authenticated measurement admission'}


def changes(previous, current):
    if previous is None:
        return []
    check_receipt(previous)
    if previous['identity']['id'] != current['identity']['id'] or current['identity']['revision'] != previous['identity']['revision'] + 1:
        raise ValueError('Revision comparison requires the same inquiry and next revision')
    old = {r['id']: r for r in previous['results']}
    new = {r['id']: r for r in current['results']}
    result = []
    for key, before in old.items():
        after = new.get(key)
        withdrawn = before['status'] == 'established_in_scope' and (after is None or after['status'] != 'established_in_scope')
        revised = after is None or before.get('value') != after.get('value') or before['status'] != after['status']
        support_changed = after is None or before.get('support_sha256') != after.get('support_sha256')
        result.append({'result_id': key, 'previous_revision': previous['identity']['revision'],
                       'current_revision': current['identity']['revision'],
                       'transition': 'withdrawn' if withdrawn else 'revised' if revised else 'support_changed' if support_changed else 'unchanged',
                       'value_changed': after is None or before.get('value') != after.get('value'),
                       'support_changed': support_changed,
                       'previous_receipt_sha256': previous['execution']['receipt_sha256']})
    for key in new.keys() - old.keys():
        result.append({'result_id': key, 'transition': 'added',
                       'previous_revision': previous['identity']['revision'],
                       'current_revision': current['identity']['revision'],
                       'previous_receipt_sha256': previous['execution']['receipt_sha256']})
    return result


def execute(inquiry, config, outdir, previous=None):
    if len(__import__('io_utils').canonical(inquiry)) > 65536:
        raise ValueError('Inquiry exceeds 64 KB')
    if len(inquiry['operations']) > 32 or len(inquiry['quantities']) > 128:
        raise ValueError('Local inquiry step or quantity budget exceeded')
    compiler_catalogue = {'capabilities': [{k: v for k, v in cap.items() if k != 'source_groups'} for cap in config['capabilities']]}
    plan = compile_inquiry(inquiry, compiler_catalogue)
    revision_binding = validate_revision(previous, inquiry)
    if config['python_sha256'] != file_hash(sys.executable):
        raise ValueError('Configured Python runtime changed')
    check_sources(config, ['runtime'])
    folder = Path(outdir).resolve()
    folder.mkdir(parents=True, exist_ok=False)
    write_json(folder / 'input.json', inquiry)
    write_json(folder / 'plan.json', plan)
    # Configuration is operator-owned; it is never supplied by a question.
    write_json(folder / 'worker-config.json', config)
    quantities = {q['id']: q for q in inquiry['quantities']}
    capabilities = {c['id']: c for c in config['capabilities']}
    outputs = {}
    support_ids = {}
    premise_records = {p['id']: p for p in inquiry['premises']}
    operation_records = {op['id']: op for op in inquiry['operations']}
    report = deepcopy(inquiry)
    results = []
    jobs = []
    for index, step in enumerate(plan['steps']):
        bindings = {}
        spec = capabilities.get(step['capability_id'])
        result = {'id': step['id'], 'status': 'unresolved', 'value': None,
                  'depends_on': step['depends_on'], 'premise_ids': step['premise_ids'],
                  'issues': deepcopy(step['issues']), 'unit': (step['output_contract'] or {}).get('unit'),
                  'result_kind': 'hypothesis_or_analogy'}
        if step['status'] == 'ready' and any(dep not in outputs for dep in step['depends_on']):
            result['issues'].append({'code': 'dependency_unavailable', 'message': 'A required earlier result did not execute successfully.'})
        elif step['status'] == 'ready':
            result.update(result_kind=spec['result_kind'], scope=spec['scope'], capability_id=spec['id'])
            for port, reference in step['bindings'].items():
                bindings[port] = deepcopy(quantities[reference] if isinstance(reference, str) else outputs[reference['step']])
            job = {'inquiry_id': inquiry['identity']['id'], 'revision': inquiry['identity']['revision'],
                   'step_id': step['id'], 'capability_id': spec['id'], 'bindings': bindings,
                   'context': {'jurisdiction': inquiry['system']['jurisdiction'],
                               'preparation_id': inquiry['observer']['preparation_id'],
                               'clock': inquiry['observer']['clock'], 'time': inquiry['observer'].get('time')},
                   'premise_ids': step['premise_ids'], 'depends_on': step['depends_on']}
            job_path = folder / f'job-{index}.json'
            output_path = folder / f'worker-{index}.json'
            write_json(job_path, job)
            argv = [sys.executable, '-X', 'utf8', '-B', str(Path(__file__).with_name('worker.py')),
                    '--config', str(folder / 'worker-config.json'), '--job', str(job_path), '--out', str(output_path)]
            receipt = {'step_id': step['id'], 'capability_id': spec['id'], 'job_sha256': digest(job),
                       'input_ports': sorted(bindings), 'argv': argv, 'executed': False}
            try:
                check_sources(config, ['runtime', *spec['source_groups']])
                completed = subprocess.run(argv, shell=False, capture_output=True, text=True, encoding='utf-8', timeout=75)
                receipt.update(executed=True, exit_code=completed.returncode,
                               stderr=completed.stderr[:2000], stdout_sha256=digest(completed.stdout))
                if completed.returncode != 0:
                    raise ValueError('Capability worker rejected or failed the request: ' + completed.stderr[:500])
                native = read_json(output_path, limit=2000000)
                if native['job_sha256'] != digest(job) or native['capability_id'] != spec['id']:
                    raise ValueError('Worker returned a different job binding')
                check_sources(config, ['runtime', *spec['source_groups']])
                result.update(status='established_in_scope', value=native['value'],
                              native_artifact=output_path.name, native_sha256=file_hash(output_path),
                              interpretation=native['interpretation'])
                outputs[step['id']] = {**deepcopy(spec['output']), 'id': step['id'], 'value': native['value'],
                                       'preparation_id': inquiry['observer']['preparation_id'],
                                       'time': inquiry['observer'].get('time')}
            except (OSError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
                result.update(status='execution_error', value=None)
                result['issues'].append({'code': 'execution_or_source_failure', 'message': str(error)[:1000]})
            jobs.append(receipt)
        groups = ['runtime', *(spec['source_groups'] if spec else [])]
        result['support'] = deepcopy({
            'operation': operation_records[step['id']], 'capability': spec,
            'bindings': bindings, 'system': inquiry['system'], 'observer': inquiry['observer'],
            'premises': [premise_records.get(pid, {'id': pid, 'status': 'missing'}) for pid in step['premise_ids']],
            'sources': {group: config['source_files'][group] for group in groups},
            'python_sha256': config['python_sha256'],
            'parents': {dep: support_ids[dep] for dep in step['depends_on']},
            'output_contract': step['output_contract'], 'issues': result['issues']})
        result['support_sha256'] = digest(result['support'])
        support_ids[step['id']] = result['support_sha256']
        results.append(result)
    report['results'] = results
    report['execution'] = {**deepcopy(inquiry['execution']), 'router': 'temporal-grammar-spine/0.1',
        'mode': 'local controlled execution; no hosted service or authenticated admission',
        'input_sha256': digest(inquiry), 'configuration_sha256': digest(config),
        'scientific_word': plan['word'], 'plan': plan, 'jobs': jobs,
        'effective_models': {r['id']: r.get('capability_id') for r in results},
        'interpretation_scope': 'Only admitted structured operations and registered model bindings are computed; original prose is not independently interpreted.',
        'status': 'complete_in_declared_scope' if results and all(r['status'] == 'established_in_scope' for r in results) else 'partial_or_gap',
        'created_at': datetime.now(timezone.utc).isoformat()}
    report['contrast'] = {**deepcopy(inquiry['contrast']), 'revision_binding': revision_binding,
                          'revision_changes': changes(previous, report)}
    report['next_question'] = {'origin': 'compiler_missing_obligations', 'requests': [
        {'step_id': r['id'], 'issues': r['issues']} for r in results if r['status'] != 'established_in_scope']}
    report['execution']['receipt_sha256'] = digest(report)
    write_json(folder / 'inquiry.json', report)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input')
    parser.add_argument('--config', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--previous')
    args = parser.parse_args()
    try:
        result = execute(read_json(args.input), read_json(args.config), args.out,
                         read_json(args.previous, 2000000) if args.previous else None)
        print(result['execution']['status'])
    except (ValueError, OSError, KeyError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(2)
