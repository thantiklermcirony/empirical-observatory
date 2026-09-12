"""Run the portable routing demonstration using bundled, pinned source copies."""
import argparse
from pathlib import Path, PurePosixPath
import stat
import zipfile

from configure import configure
from examples import actions, resource, quantum, write_examples
from io_utils import digest, file_hash, read_json, write_json
from run import execute


def prepare_vendor(here):
    """Extract only the bounded manifest-listed source tree; never overwrite it."""
    here = Path(here).resolve()
    manifest = read_json(here/'DEPENDENCIES.json')
    archive = here/'dependencies.zip'
    if file_hash(archive) != manifest['archive_sha256']:
        raise ValueError('Bundled dependency archive changed')
    expected = manifest['files']
    target = here/'vendor'
    with zipfile.ZipFile(archive) as bundle:
        entries = bundle.infolist()
        if (len(entries) != len(expected) or len(entries) > 100
                or {i.filename for i in entries} != set(expected)
                or sum(i.file_size for i in entries) > 2000000):
            raise ValueError('Unexpected dependency archive inventory or size')
        for entry in entries:
            path = PurePosixPath(entry.filename)
            if (path.is_absolute() or '..' in path.parts or '\\' in entry.filename
                    or ':' in entry.filename or entry.is_dir()
                    or stat.S_ISLNK(entry.external_attr >> 16)
                    or not (target/entry.filename).resolve().is_relative_to(target.resolve())):
                raise ValueError('Invalid dependency archive path')
        if not target.exists():
            # Verify all bytes before writing the first file.
            import hashlib
            contents = {e.filename: bundle.read(e) for e in entries}
            if any(hashlib.sha256(data).hexdigest() != expected[name] for name,data in contents.items()):
                raise ValueError('Dependency member hash differs from manifest')
            target.mkdir()
            for name,data in contents.items():
                destination = target/name
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
    for name,sha in expected.items():
        source = (target/name).resolve()
        if not source.is_relative_to(target.resolve()) or file_hash(source) != sha:
            raise ValueError('Changed extracted dependency: '+name)
    return target


def demo(outdir):
    here = Path(__file__).resolve().parent
    vendor = prepare_vendor(here)
    config = configure(vendor/'math', vendor/'quantum', vendor/'reference')
    out = Path(outdir).resolve()
    out.mkdir(parents=True, exist_ok=False)
    write_json(out/'config.json', config)
    write_examples(out/'examples', vendor/'quantum')
    reports = {}
    for name, inquiry in [('actions-ab',actions()), ('actions-ba',actions(True)),
                           ('resource',resource()), ('quantum',quantum(vendor/'quantum'))]:
        reports[name] = execute(inquiry, config, out/name)
    reports['resource-corrected'] = execute(resource(True), config, out/'resource-corrected', reports['resource'])
    withdrawn = resource(True)
    withdrawn['identity']['revision'] = 3
    withdrawn['provenance'].pop('correction')
    next(p for p in withdrawn['premises'] if p['id']=='BIO-VOLUME')['status']='missing'
    reports['resource-withdrawn'] = execute(withdrawn, config, out/'resource-withdrawn', reports['resource-corrected'])
    gap = resource()
    gap['operations'].append({'id':'quantum-link','verb':'infer_quantum_redox','kind':'derive','inputs':{}})
    gap['mechanism'] = {}  # Catalogue defaults; the missing link has no registered model.
    reports['unresolved-link'] = execute(gap, config, out/'unresolved-link')
    summary = {'scope':'Synthetic and declared-model integration checks, not new empirical findings.',
        'configuration_sha256':digest(config),
        'runs':{name:{'status':r['execution']['status'], 'receipt_sha256':r['execution']['receipt_sha256'],
                     'results':[{'id':s['id'],'status':s['status'],'value':s['value']} for s in r['results']]}
                for name,r in reports.items()}}
    write_json(out/'summary.json',summary)
    for name, entry in summary['runs'].items():
        print(name+': '+entry['status'])
    print('Saved evidence: '+str(out/'summary.json'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',required=True,help='New output directory, never overwritten')
    args=parser.parse_args()
    demo(args.out)
