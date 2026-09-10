"""Download the pinned public CC0 input; preserve published provenance records."""
from pathlib import Path
import hashlib, json, urllib.request

base = Path(__file__).resolve().parent
record = json.loads((base/'data-gate/ACQUISITION.json').read_text())
target = base/'data-gate/plate_plate1.parquet'
if not target.exists():
    partial = target.with_suffix('.part')
    if partial.exists():
        raise SystemExit('An existing partial download is preserved; inspect it before retrying.')
    request = urllib.request.Request(record['url'], headers={'User-Agent':'EmpiricalObservatoryReproduction/1'})
    with urllib.request.urlopen(request, timeout=60) as response, partial.open('xb') as out:
        count = 0
        while block := response.read(1024 * 1024):
            count += len(block)
            if count > record['bytes']:
                raise ValueError('Input exceeds the declared size')
            out.write(block)
    with partial.open('rb') as stream:
        actual = hashlib.file_digest(stream,'sha256').hexdigest()
    if count != record['bytes'] or actual != record['sha256']:
        raise ValueError('Pinned response input failed verification; partial file preserved')
    partial.rename(target)
with target.open('rb') as stream:
    actual = hashlib.file_digest(stream,'sha256').hexdigest()
assert target.stat().st_size == record['bytes'] and actual == record['sha256']
print('Pinned response verified:', actual)
