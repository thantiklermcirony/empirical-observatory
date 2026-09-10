"""Run the independent suite and bind its result to exact local source bytes."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
REVIEW = Path(__file__).resolve().parent


def hashes():
    paths = [ROOT / "active_context/core.py", ROOT / "active_context/__main__.py", REVIEW / "test_adversarial.py"]
    return {path.relative_to(ROOT).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}


def main():
    before = hashes()
    start = time.perf_counter()
    command = [sys.executable, "-m", "unittest", "discover", "-s", "review", "-p", "test_adversarial.py", "-v"]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
    (REVIEW / "unittest.log").write_text(result.stdout + result.stderr, encoding="utf-8")
    after = hashes()
    report = {
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "command": command,
        "python": sys.version,
        "platform": sys.platform,
        "exit_code": result.returncode,
        "runtime_seconds": time.perf_counter() - start,
        "source_unchanged_during_validation": before == after,
        "before_sha256": before,
        "after_sha256": after,
        "passed": result.returncode == 0 and before == after,
        "scope": "Independent same-team AI review; disposable local subprocesses and hand-derived/exhaustive planning oracles. No external benchmark or LLM advantage tested.",
    }
    (REVIEW / "VALIDATION.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
