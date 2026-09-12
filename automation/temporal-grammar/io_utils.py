"""Bounded JSON and local source identity, not authentication or a sandbox."""
import hashlib
import json
from pathlib import Path


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path, limit=131072):
    with Path(path).open('rb') as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError('JSON byte budget exceeded')
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('Duplicate JSON key: ' + key)
            result[key] = value
        return result
    def bad(value):
        raise ValueError('Nonfinite JSON number: ' + value)
    return json.loads(data, object_pairs_hook=pairs, parse_constant=bad)


def write_json(path, value):
    Path(path).write_bytes(canonical(value) + b'\n')


def check_sources(config, groups=None):
    changed = []
    for root_name in (config['source_files'] if groups is None else groups):
        entries = config['source_files'][root_name]
        root = Path(config['source_roots'][root_name]).resolve()
        for relative, expected in entries.items():
            source = (root / relative).resolve()
            if not source.is_relative_to(root) or not source.is_file() or file_hash(source) != expected:
                changed.append(root_name + ':' + relative)
    if changed:
        raise ValueError('Changed or missing configured source: ' + ', '.join(changed))
