"""Package only adapter source and the independent browser reference fixture."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
target=root/'public/downloads/observatory-adapters.zip'
target.parent.mkdir(parents=True,exist_ok=True)
paths=sorted((root/'adapters').glob('*.py'))+sorted((root/'adapters').glob('*.md'))+[root/'adapters/requirements.txt',root/'public/research/quantum-reference.json',root/'LICENSE',root/'THIRD_PARTY.md']
paths += sorted(f for base in [root/'adapters/genome', root/'integrations'] for f in base.rglob('*') if f.is_file() and not any(part in {'.venv','__pycache__','private-results'} for part in f.parts) and f.suffix != '.pyc')
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in paths:
        info=zipfile.ZipInfo(str(path.relative_to(root)).replace('\\','/'),date_time=(2026,9,9,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        archive.writestr(info,path.read_bytes())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
print(f'Adapter archive: {len(paths)} files, {target.stat().st_size} bytes')
