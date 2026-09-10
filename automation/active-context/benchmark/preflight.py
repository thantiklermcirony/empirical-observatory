"""Permitted pristine-source assertion preflight, not a policy comparison."""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import time

from specs import PROJECTS, ROOT, CHECK_IDS, materialize, manifest


def main():
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    output = ROOT / "preflight" / stamp
    output.mkdir(parents=True)
    rows = []
    for project in PROJECTS:
        repo = output / "sources" / project["id"]
        config = materialize(project, repo)
        for check in config["checks"]:
            argv = [sys.executable if arg == "{python}" else arg for arg in check["argv"]]
            start = time.perf_counter()
            try:
                process = subprocess.run(argv, cwd=repo, capture_output=True, timeout=10)
                row = {"project": project["id"], "check": check["id"], "exit_code": process.returncode,
                       "stdout": process.stdout.decode(errors="replace"), "stderr": process.stderr.decode(errors="replace"), "timed_out": False}
            except subprocess.TimeoutExpired as exc:
                row = {"project": project["id"], "check": check["id"], "exit_code": None, "timed_out": True,
                       "stdout": (exc.stdout or b"").decode(errors="replace"), "stderr": (exc.stderr or b"").decode(errors="replace")}
            row["seconds"] = time.perf_counter() - start
            rows.append(row)
    record = {"status": "pristine source preflight only; no policies evaluated", "python": sys.version,
              "created_at": datetime.now(timezone.utc).isoformat(), "sources": manifest(), "checks": rows,
              "passed": sum(row["exit_code"] == 0 for row in rows), "expected": len(PROJECTS) * len(CHECK_IDS)}
    path = output / "PREFLIGHT.json"
    path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(str(path))
    print(json.dumps({"passed": record["passed"], "expected": record["expected"]}))
    return 0 if record["passed"] == record["expected"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
