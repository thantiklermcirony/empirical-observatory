"""Read-only public source acquisition. No installs, code execution or scoring."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent
DEST = ROOT / "upstream"
REPOS = ["pypa/packaging", "pallets/itsdangerous", "mahmoud/boltons", "dbader/schedule", "python-humanize/humanize"]
CAP = 8_000_000


def save(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != raw:
            raise ValueError("Refusing to overwrite different acquired evidence: " + str(path))
        return
    path.write_bytes(raw)


def fetch(url):
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json",
                                                  "User-Agent": "EmpiricalObservatory-SourceDiagnostic/0.1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read(CAP + 1)
        if len(raw) > CAP:
            raise ValueError("Source response exceeds 8 MB cap")
        return raw


def main():
    lock = DEST / "SOURCE_LOCK.json"
    if lock.exists():
        print("Existing source lock retained: " + str(lock))
        return
    entries = []
    for repo in REPOS:
        slug = repo.replace("/", "__")
        metadata = fetch("https://api.github.com/repos/" + repo)
        info = json.loads(metadata)
        reference = fetch("https://api.github.com/repos/" + repo + "/git/ref/heads/" + info["default_branch"])
        commit = json.loads(reference)["object"]["sha"]
        archive_url = "https://codeload.github.com/" + repo + "/zip/" + commit
        archive = fetch(archive_url)
        save(DEST / "metadata" / (slug + ".json"), metadata)
        save(DEST / "metadata" / (slug + "-ref.json"), reference)
        archive_name = slug + "-" + commit + ".zip"
        save(DEST / "archives" / archive_name, archive)
        entries.append({"repository": repo, "url": "https://github.com/" + repo,
                        "commit": commit, "commit_url": "https://github.com/" + repo + "/commit/" + commit,
                        "default_branch_at_capture": info["default_branch"],
                        "license_metadata_unverified": (info.get("license") or {}).get("spdx_id"),
                        "archive_url": archive_url, "archive": "archives/" + archive_name,
                        "archive_sha256": hashlib.sha256(archive).hexdigest(), "archive_bytes": len(archive),
                        "metadata_sha256": hashlib.sha256(metadata).hexdigest(),
                        "ref_sha256": hashlib.sha256(reference).hexdigest()})
        print(repo + " " + commit + " " + str(len(archive)) + " bytes")
    record = {"captured_at": datetime.now(timezone.utc).isoformat(), "scored_results_collected": False,
              "repositories": entries}
    save(lock, (json.dumps(record, indent=2) + "\n").encode())
    print("Saved " + str(lock))


if __name__ == "__main__":
    main()
