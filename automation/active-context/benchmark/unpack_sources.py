"""Verify acquired archive hashes and extract only inside the benchmark tree."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent / "upstream"
entries = json.loads((ROOT / "SOURCE_LOCK.json").read_text())["repositories"]
replacement = ROOT / "REPLACEMENT_SOURCE_LOCK.json"
if replacement.exists():
    entries += json.loads(replacement.read_text())["repositories"]
for entry in entries:
    archive = ROOT / entry["archive"]
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == entry["archive_sha256"]
    target = (ROOT / "src" / entry["repository"].replace("/", "__")).resolve()
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as source:
        members = source.infolist()
        assert len(members) <= 10_000 and sum(m.file_size for m in members) <= 40_000_000
        for member in members:
            parts = member.filename.split("/")[1:]
            if not parts or not any(parts):
                continue
            assert not any(p in ("..", ".") or ":" in p or "\\" in p for p in parts)
            destination = target.joinpath(*parts).resolve()
            assert destination.is_relative_to(target)
            assert ((member.external_attr >> 16) & 0o170000) != 0o120000, "Symlink entry rejected"
            if member.is_dir():
                destination.mkdir(parents=True, exist_ok=True)
            else:
                raw = source.read(member)
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination.exists():
                    assert destination.read_bytes() == raw, "Existing source differs"
                else:
                    destination.write_bytes(raw)
    print(entry["repository"] + " extracted: " + str(target))
