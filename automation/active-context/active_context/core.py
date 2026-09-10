"""Local check receipts and explicit dependency refresh; no model calls."""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import base64
import hashlib
import itertools
import json
import math
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time

DEFAULT_ENV = ('PATH', 'PYTHONPATH', 'PYTHONHOME', 'VIRTUAL_ENV', 'LANG', 'LC_ALL', 'TZ')
IGNORED = {'.git', '__pycache__'}
LIMIT_FILES = 50000
LIMIT_BYTES = 250_000_000
OUTPUT_LIMIT = 32000
BOUNDARY = ('Reuse concerns successful checks within declared inputs only. Undeclared '
            'files, installed dependencies, environment and external services may change. '
            'Before/after snapshots cannot detect a transient change followed by a revert. '
            'Local hashes and clocks do not authenticate execution or public issuance.')


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key: ' + key)
        result[key] = value
    return result


def read_json(text):
    return json.loads(text, object_pairs_hook=_unique_object,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Non-finite JSON: ' + value)))


def _strings(value, name, nonempty=False):
    if not isinstance(value, list) or any(not isinstance(v, str) or not v or '\x00' in v for v in value):
        raise ValueError(name + ' must be a list of nonempty strings')
    if nonempty and not value:
        raise ValueError(name + ' must not be empty')
    if len(set(value)) != len(value):
        raise ValueError(name + ' must not contain duplicates')
    return value


def validate_config(config):
    if not isinstance(config, dict) or config.get('schema_version') != 1:
        raise ValueError('Expected configuration schema_version 1')
    raw = config.get('checks')
    if not isinstance(raw, list) or not 1 <= len(raw) <= 20:
        raise ValueError('Configuration requires between 1 and 20 checks')
    checks = {}
    for item in raw:
        if not isinstance(item, dict) or set(item) - {'id', 'claims', 'argv', 'scopes', 'env', 'depends_on', 'cost'}:
            raise ValueError('Unknown check field or malformed check')
        check = dict(item)
        check_id = check.get('id')
        if not isinstance(check_id, str) or not check_id or check_id in checks:
            raise ValueError('Check IDs must be unique nonempty strings')
        for field in ('claims', 'scopes'):
            check[field] = _strings(check.get(field), field, True)
        # Repeated argv entries (e.g. two equal numeric arguments) are meaningful.
        argv = check.get('argv')
        if not isinstance(argv, list) or not argv or any(not isinstance(v, str) or '\x00' in v for v in argv) or not argv[0]:
            raise ValueError('argv must be a nonempty argument array with a command')
        check['env'] = _strings(check.get('env', []), 'env')
        check['depends_on'] = _strings(check.get('depends_on', []), 'depends_on')
        cost = check.get('cost', 1.0)
        if isinstance(cost, bool) or not isinstance(cost, (int, float)) or not math.isfinite(cost) or cost < 0:
            raise ValueError('cost must be finite and nonnegative')
        check['cost'] = float(cost)
        for scope in check['scopes']:
            p = Path(scope)
            if p.is_absolute() or p.drive or '..' in p.parts or any(part in IGNORED for part in p.parts):
                raise ValueError('Scopes must be relative, in-repository paths outside ignored caches')
        checks[check_id] = check
    visiting, visited = set(), set()
    def visit(check_id):
        if check_id not in checks:
            raise ValueError('Unknown prerequisite: ' + check_id)
        if check_id in visiting:
            raise ValueError('Prerequisite cycle')
        if check_id in visited:
            return
        visiting.add(check_id)
        for parent in checks[check_id]['depends_on']:
            visit(parent)
        visiting.remove(check_id)
        visited.add(check_id)
    for key in checks:
        visit(key)
    return checks


def _definition(check):
    return {key: value for key, value in check.items() if key != 'cost'}


def _file_hash(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def _root(repo):
    repo = Path(repo).absolute()
    if repo.is_symlink() or getattr(repo, 'is_junction', lambda: False)() or not repo.is_dir():
        raise ValueError('Repository must be an existing directory, not a symlink')
    return repo.resolve()


def _snapshot(check, repo, ledger):
    repo = _root(repo)
    ledger = Path(ledger).resolve()
    entries, total = {}, 0
    def add(path):
        nonlocal total
        relative = path.relative_to(repo).as_posix()
        if any(part in IGNORED for part in path.relative_to(repo).parts):
            return
        if path.is_symlink() or getattr(path, 'is_junction', lambda: False)() or not path.resolve().is_relative_to(repo):
            raise ValueError('Symlink, junction or escaped path in declared inputs: ' + relative)
        if not path.exists():
            entries[relative] = {'kind': 'missing'}
        elif path.is_dir():
            entries[relative] = {'kind': 'directory'}
            for child in sorted(path.iterdir()):
                add(child)
        elif path.is_file():
            size = path.stat().st_size
            total += size
            if total > LIMIT_BYTES:
                raise ValueError('Declared input bytes exceed 250 MB; choose narrower scopes')
            entries[relative] = {'kind': 'file', 'sha256': _file_hash(path),
                                 'executable_bits': path.stat().st_mode & 0o111}
        else:
            raise ValueError('Unsupported input file type: ' + relative)
        if len(entries) > LIMIT_FILES:
            raise ValueError('Declared inputs exceed 50000 entries')
    for scope in check['scopes']:
        path = repo / scope
        if not path.resolve().is_relative_to(repo):
            raise ValueError('Declared input escapes repository')
        if ledger == path.resolve() or ledger.is_relative_to(path.resolve()):
            raise ValueError('Ledger must be outside declared scopes')
        # A symlink in an intermediate path is unsafe even if its final target is in repo.
        walk = path
        while walk != repo:
            if walk.is_symlink() or getattr(walk, 'is_junction', lambda: False)():
                raise ValueError('Symlink in declared input path')
            walk = walk.parent
        add(path)
    argv = [sys.executable if arg == '{python}' else arg for arg in check['argv']]
    command = Path(argv[0])
    if command.is_absolute() or len(command.parts) > 1:
        executable = command if command.is_absolute() else repo / command
    else:
        found = shutil.which(argv[0])
        if not found:
            raise ValueError('Executable unavailable: ' + argv[0])
        executable = Path(found)
    executable = executable.resolve()
    if not executable.is_file():
        raise ValueError('Executable is not a file')
    env = {}
    for name in sorted(set(DEFAULT_ENV) | set(check['env'])):
        value = os.environ.get(name)
        env[name] = {'present': value is not None,
                     'sha256': None if value is None else hashlib.sha256(value.encode()).hexdigest()}
    state = {'repo': str(repo), 'definition': _definition(check), 'inputs': entries,
             'environment': env, 'executable': str(executable), 'executable_sha256': _file_hash(executable),
             'observer_python': sys.version, 'platform': sys.platform}
    state['fingerprint'] = digest(state)
    state['resolved_argv'] = [str(executable), *argv[1:]]
    return state


def _read_ledger(ledger):
    ledger = Path(ledger)
    if not ledger.exists():
        return []
    if ledger.stat().st_size > 100_000_000:
        raise ValueError('Ledger exceeds 100 MB limit')
    raw = ledger.read_text(encoding='utf-8')
    if raw and not raw.endswith('\n'):
        raise ValueError('Truncated ledger')
    events, previous = [], None
    for number, line in enumerate(raw.splitlines(), 1):
        event = read_json(line)
        if not isinstance(event, dict) or set(event) != {'seq', 'previous_hash', 'payload', 'event_hash'}:
            raise ValueError('Invalid ledger envelope')
        if event['seq'] != number or event['previous_hash'] != previous:
            raise ValueError('Broken ledger sequence')
        expected = digest({key: event[key] for key in ('seq', 'previous_hash', 'payload')})
        if expected != event['event_hash']:
            raise ValueError('Ledger hash mismatch')
        payload = event['payload']
        if not isinstance(payload, dict) or payload.get('schema_version') != 1 or payload.get('kind') != 'check_run':
            raise ValueError('Unsupported ledger record')
        required = {'check_id', 'definition_hash', 'before', 'after', 'dependencies', 'dependencies_ready',
                    'exit_code', 'timed_out', 'stable', 'duration_seconds', 'started_at', 'finished_at',
                    'stdout', 'stderr', 'execution_error', 'snapshot_error'}
        if not required.issubset(payload) or not isinstance(payload['check_id'], str):
            raise ValueError('Incomplete check receipt')
        for field in ('before', 'after'):
            snap = payload[field]
            if not isinstance(snap, dict) or snap.get('fingerprint') != digest({k:v for k,v in snap.items() if k not in ('fingerprint','resolved_argv')}):
                raise ValueError('Snapshot fingerprint mismatch')
        if any(type(payload[k]) is not bool for k in ('timed_out', 'stable', 'dependencies_ready')):
            raise ValueError('Invalid receipt flags')
        if payload['stable'] != (payload['before']['fingerprint'] == payload['after']['fingerprint']):
            raise ValueError('Inconsistent stability flag')
        if not isinstance(payload['dependencies'], dict) or any(not isinstance(k,str) or not (v is None or isinstance(v,str)) for k,v in payload['dependencies'].items()):
            raise ValueError('Invalid prerequisite receipt map')
        if payload['exit_code'] is not None and type(payload['exit_code']) is not int:
            raise ValueError('Invalid exit code')
        if type(payload['duration_seconds']) not in (float,int) or not math.isfinite(payload['duration_seconds']) or payload['duration_seconds'] < 0:
            raise ValueError('Invalid duration')
        stamps = []
        for field in ('started_at', 'finished_at'):
            if not isinstance(payload[field], str):
                raise ValueError('Invalid receipt timestamp')
            parsed = datetime.fromisoformat(payload[field])
            if parsed.tzinfo is None or parsed.utcoffset() is None:
                raise ValueError('Receipt timestamp needs a timezone')
            stamps.append(parsed)
        if stamps[1] < stamps[0]:
            raise ValueError('Receipt completion precedes start')
        if payload['definition_hash'] != digest(payload['before'].get('definition')):
            raise ValueError('Receipt definition mismatch')
        for field in ('stdout', 'stderr'):
            output = payload[field]
            if not isinstance(output,dict) or set(output) != {'sha256','bytes','text','truncated','prefix_base64'}:
                raise ValueError('Incomplete output evidence')
            if not isinstance(output['sha256'],str) or not re.fullmatch('[0-9a-f]{64}',output['sha256']):
                raise ValueError('Invalid output digest')
            if type(output['bytes']) is not int or output['bytes'] < 0 or type(output['truncated']) is not bool:
                raise ValueError('Invalid output size')
            if not isinstance(output['text'],str) or not isinstance(output['prefix_base64'],str):
                raise ValueError('Invalid output prefix')
            prefix = base64.b64decode(output['prefix_base64'],validate=True)
            if len(prefix) != min(output['bytes'],OUTPUT_LIMIT) or output['text'] != prefix.decode('utf-8',errors='replace'):
                raise ValueError('Output prefix mismatch')
            if output['truncated'] != (output['bytes'] > OUTPUT_LIMIT):
                raise ValueError('Output truncation mismatch')
            if not output['truncated'] and hashlib.sha256(prefix).hexdigest() != output['sha256']:
                raise ValueError('Output hash mismatch')
        events.append(event)
        previous = event['event_hash']
    return events


def verify_ledger(ledger):
    events = _read_ledger(ledger)
    return {'valid': True, 'records': len(events), 'head': events[-1]['event_hash'] if events else None, 'boundary': BOUNDARY}


@contextmanager
def _lock(ledger):
    ledger = Path(ledger)
    ledger.parent.mkdir(parents=True, exist_ok=True)
    lock = ledger.with_name(ledger.name + '.lock')
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise ValueError('Ledger is busy or has a stale lock; inspect the owning process before removing it') from exc
    try:
        os.close(fd)
        yield
    finally:
        lock.unlink()


def inspect(config, repo, ledger):
    checks = validate_config(config)
    events = _read_ledger(ledger)
    latest = {event['payload']['check_id']: event for event in events}
    result = {}
    def assess(key):
        if key in result:
            return result[key]
        check = checks[key]
        parents = {p: assess(p) for p in check['depends_on']}
        event = latest.get(key)
        reasons, status = [], 'missing'
        if event:
            record = event['payload']
            status = 'reusable_within_declared_scope'
            if record['definition_hash'] != digest(_definition(check)):
                status = 'changed'; reasons.append('Check definition changed')
            try:
                snapshot = _snapshot(check, repo, ledger)
                if snapshot['fingerprint'] != record['after']['fingerprint']:
                    status = 'changed'; reasons.append('Declared inputs, environment, repository or runtime changed')
            except (ValueError, OSError) as exc:
                status = 'blocked'; reasons.append(str(exc))
            if not record['stable']:
                status = 'unstable'; reasons.append('Inputs changed during the recorded check')
            if record['timed_out'] or record['exit_code'] != 0:
                status = 'failed'; reasons.append('Latest attempt timed out or did not pass')
            for parent, parent_state in parents.items():
                if not parent_state['reusable'] or record['dependencies'].get(parent) != parent_state['receipt_hash']:
                    status = 'blocked'; reasons.append('Prerequisite changed or requires a check: ' + parent)
            if not record['dependencies_ready']:
                status = 'blocked'; reasons.append('Prerequisites were not usable when the check ran')
        else:
            reasons.append('No recorded attempt')
        value = {'status': status, 'reusable': status == 'reusable_within_declared_scope', 'reasons': reasons,
                 'receipt_hash': event['event_hash'] if event else None,
                 'claims': check['claims'],
                 'duration_seconds': event['payload']['duration_seconds'] if event else None}
        result[key] = value
        return value
    for key in checks:
        assess(key)
    return {'schema_version': 1, 'checks': result, 'boundary': BOUNDARY,
            'ledger_head': events[-1]['event_hash'] if events else None}


def _output(path):
    h, size, prefix = hashlib.sha256(), 0, b''
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
            size += len(chunk)
            prefix += chunk[:max(0, OUTPUT_LIMIT-len(prefix))]
    return {'sha256': h.hexdigest(), 'bytes': size, 'prefix_base64': base64.b64encode(prefix).decode('ascii'),
            'text': prefix.decode('utf-8', errors='replace'), 'truncated': size > OUTPUT_LIMIT}


def run_check(config, check_id, repo, ledger, timeout=60):
    checks = validate_config(config)
    if check_id not in checks:
        raise ValueError('Unknown check: ' + check_id)
    if isinstance(timeout,bool) or not math.isfinite(timeout) or timeout <= 0:
        raise ValueError('timeout must be finite and positive')
    repo, ledger = _root(repo), Path(ledger).resolve()
    check = checks[check_id]
    with _lock(ledger):
        events = _read_ledger(ledger)
        states = inspect(config, repo, ledger)['checks']
        before = _snapshot(check, repo, ledger)
        dependencies = {p: states[p]['receipt_hash'] for p in check['depends_on']}
        ready = all(states[p]['reusable'] for p in check['depends_on'])
        started_at = datetime.now(timezone.utc).isoformat()
        start = time.perf_counter()
        timed_out, exit_code, execution_error = False, None, None
        with tempfile.TemporaryDirectory(prefix='active-context-output-') as output_dir:
            out, err = Path(output_dir)/'stdout', Path(output_dir)/'stderr'
            with out.open('wb') as stdout, err.open('wb') as stderr:
                try:
                    process = subprocess.run(before['resolved_argv'], cwd=repo, shell=False, timeout=timeout,
                                             stdout=stdout, stderr=stderr, stdin=subprocess.DEVNULL)
                    exit_code = process.returncode
                except subprocess.TimeoutExpired:
                    timed_out = True
                except OSError as exc:
                    execution_error = str(exc)
            duration = time.perf_counter() - start
            after_error = None
            try:
                after = _snapshot(check, repo, ledger)
            except (ValueError, OSError) as exc:
                after_error = str(exc)
                after = dict(before)
                after['snapshot_error'] = after_error
                after['fingerprint'] = digest({k:v for k,v in after.items() if k not in ('fingerprint','resolved_argv')})
            record = {'schema_version': 1, 'kind': 'check_run', 'check_id': check_id,
                      'definition_hash': digest(_definition(check)), 'before': before, 'after': after,
                      'dependencies': dependencies, 'dependencies_ready': ready,
                      'started_at': started_at, 'finished_at': datetime.now(timezone.utc).isoformat(),
                      'duration_seconds': duration, 'exit_code': exit_code, 'timed_out': timed_out,
                      'execution_error': execution_error, 'snapshot_error': after_error,
                      'stable': before['fingerprint'] == after['fingerprint'],
                      'stdout': _output(out), 'stderr': _output(err)}
        event = {'seq': len(events)+1, 'previous_hash': events[-1]['event_hash'] if events else None, 'payload': record}
        event['event_hash'] = digest(event)
        with ledger.open('ab') as stream:
            stream.write(canonical(event) + b'\n')
            stream.flush()
            os.fsync(stream.fileno())
    return {**record, 'event_hash': event['event_hash']}


def plan(config, repo, ledger, claims, budget=None):
    checks = validate_config(config)
    claims = set(_strings(list(claims), 'claims', True))
    if budget is not None and (isinstance(budget,bool) or not isinstance(budget,(int,float)) or not math.isfinite(budget) or budget < 0):
        raise ValueError('budget must be finite and nonnegative')
    states = inspect(config, repo, ledger)['checks']
    reused = {c for key, state in states.items() if state['reusable'] for c in checks[key]['claims']} & claims
    missing = claims - reused
    keys = sorted(key for key in checks if not states[key]['reusable'])
    def closure(selected):
        selected = set(selected)
        pending = list(selected)
        while pending:
            for parent in checks[pending.pop()]['depends_on']:
                if not states[parent]['reusable'] and parent not in selected:
                    selected.add(parent); pending.append(parent)
        return selected
    best = (len(missing), 0.0, 0, ())
    chosen = set()
    for size in range(1,len(keys)+1):
        for subset in itertools.combinations(keys,size):
            selected = closure(subset)
            cost = sum(checks[k]['cost'] for k in selected)
            if budget is not None and cost > budget:
                continue
            covered = {c for k in selected for c in checks[k]['claims']} & missing
            objective = (len(missing-covered), cost, len(selected), tuple(sorted(selected)))
            if objective < best:
                best, chosen = objective, selected
    ordered = []
    def visit(key):
        if key in ordered or key not in chosen:
            return
        for parent in checks[key]['depends_on']:
            visit(parent)
        ordered.append(key)
    for key in sorted(chosen):
        visit(key)
    covered = reused | {c for k in chosen for c in checks[k]['claims']}
    return {'schema_version': 1, 'selected_checks': ordered, 'estimated_cost': best[1],
            'cost_units': 'caller-declared check cost, excluding inspection overhead',
            'uncovered_claims': sorted(claims-covered), 'reused_claims': sorted(reused),
            'complete': claims <= covered, 'execution_required': bool(ordered),
            'basis': 'Exact finite minimum declared-cost coverage after maximizing requested claim coverage within budget; assumes check-declared coverage. No learned information-value estimate.',
            'checks': states, 'boundary': BOUNDARY}
