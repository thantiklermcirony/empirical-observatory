"""Acquire one pre-freeze replacement; retain the original source lock unchanged."""
from datetime import datetime, timezone
import hashlib
import json
from fetch_sources import DEST, fetch, save

repo = "more-itertools/more-itertools"
slug = repo.replace("/", "__")
path = DEST / "REPLACEMENT_SOURCE_LOCK.json"
if path.exists():
    raise SystemExit("Existing replacement lock retained")
metadata = fetch("https://api.github.com/repos/" + repo)
info = json.loads(metadata)
reference = fetch("https://api.github.com/repos/" + repo + "/git/ref/heads/" + info["default_branch"])
commit = json.loads(reference)["object"]["sha"]
url = "https://codeload.github.com/" + repo + "/zip/" + commit
archive = fetch(url)
archive_name = slug + "-" + commit + ".zip"
save(DEST / "metadata" / (slug + ".json"), metadata)
save(DEST / "metadata" / (slug + "-ref.json"), reference)
save(DEST / "archives" / archive_name, archive)
record = {"captured_at": datetime.now(timezone.utc).isoformat(), "scored_results_collected": False,
          "replaces": "python-humanize/humanize",
          "reason": "Humanize source archive requires generated hatch-vcs version metadata; no installed build tooling. Preserve archive but exclude before scored execution.",
          "repositories": [{"repository": repo, "url": "https://github.com/" + repo, "commit": commit,
                            "commit_url": "https://github.com/" + repo + "/commit/" + commit,
                            "default_branch_at_capture": info["default_branch"],
                            "license_metadata_unverified": (info.get("license") or {}).get("spdx_id"),
                            "archive_url": url, "archive": "archives/" + archive_name,
                            "archive_sha256": hashlib.sha256(archive).hexdigest(), "archive_bytes": len(archive),
                            "metadata_sha256": hashlib.sha256(metadata).hexdigest(),
                            "ref_sha256": hashlib.sha256(reference).hexdigest()}]}
save(path, (json.dumps(record, indent=2) + "\n").encode())
print(json.dumps(record, indent=2))
