"""Optional bounded public download of two CC BY4.0 author-published inputs.

The analysis and verifier do not download anything. This separate command fetches
exactly 175,117,500 source bytes with default TLS verification and no credentials.
"""
import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from paired_paths import resolve_paths

HERE = Path(__file__).resolve().parent


def hashes(path):
    md5, sha = hashlib.md5(), hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            md5.update(block)
            sha.update(block)
    return {"md5": md5.hexdigest(), "sha256": sha.hexdigest()}


def verified(path, record):
    return path.stat().st_size == record["bytes"] and hashes(path) == {"md5": record["md5"], "sha256": record["sha256"]}


def main(argv=None):
    args = resolve_paths(argv, description=__doc__)
    sources = json.loads((HERE / "sources.json").read_text(encoding="utf-8"))
    if sources["license"]["name"] != "CC BY 4.0" or sum(f["bytes"] for f in sources["files"]) > 250_000_000:
        raise ValueError("Source terms or total selected size changed; inspect the manifest")
    args.data_dir.mkdir(parents=True, exist_ok=True)
    for record in sources["files"]:
        filename = record["filename"]
        if Path(filename).name != filename:
            raise ValueError("Unsafe source filename")
        path = args.data_dir / filename
        if path.exists():
            if not verified(path, record):
                raise ValueError(f"Existing input differs from manifest; preserving {path}")
            print(f"Already verified: {filename}")
            continue
        partial = path.with_name(path.name + ".part")
        if partial.exists():
            raise ValueError(f"Incomplete download exists; inspect before retrying: {partial}")
        request = urllib.request.Request(record["url"], headers={"User-Agent": "Empirical-Architecture-public-reproduction/0.1"})
        total = 0
        with urllib.request.urlopen(request, timeout=45) as response:
            if response.status != 200:
                raise ValueError(f"Unexpected HTTP status {response.status}")
            declared = response.headers.get("Content-Length")
            if declared and int(declared) != record["bytes"]:
                raise ValueError("Publisher declared size changed")
            with partial.open("xb") as stream:
                while block := response.read(1024 * 1024):
                    total += len(block)
                    if total > record["bytes"]:
                        raise ValueError("Download exceeds the declared byte budget")
                    stream.write(block)
        if not verified(partial, record):
            raise ValueError(f"Downloaded input failed checksum verification: {partial}")
        partial.rename(path)
        evidence = {**record, "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
                    "license": sources["license"], "metadata_url": sources["metadata_url"]}
        path.with_name(path.name + ".manifest.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        print(f"Downloaded and verified: {filename} ({total} bytes)")


if __name__ == "__main__":
    main()
