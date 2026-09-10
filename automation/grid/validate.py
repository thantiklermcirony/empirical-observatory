"""Run the offline contract suite and record exact tested source hashes."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
result = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", str(ROOT),
                         "-p", "test_collector.py", "-v"], cwd=ROOT, text=True, capture_output=True,
                        timeout=60)
log = result.stdout + result.stderr
(ROOT / "tests.log").write_text(log, encoding="utf-8")
match = re.search(r"Ran (\d+) tests?", log)
record = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "python_version": platform.python_version(), "platform": platform.platform(),
    "test_count": int(match.group(1)) if match else None, "exit_code": result.returncode,
    "network_calls": 0, "model_fits": 0,
    "files": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
              for name in ("collector.py", "test_collector.py", "README.md", "PROTOCOL.json", "validate.py")},
    "test_log_sha256": hashlib.sha256((ROOT / "tests.log").read_bytes()).hexdigest(),
}
(ROOT / "VALIDATION.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(log, end="")
sys.exit(result.returncode)
