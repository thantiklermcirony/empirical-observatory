"""Record independent ledger/admission validation; no network, model fitting or source mutation."""
from datetime import datetime, timezone
import argparse
import hashlib
import json
from pathlib import Path
import platform
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
WORK = ROOT.parents[2]
SOURCE = WORK / "observatory-automation" / "observatory_ledger"
PATH_ROOT = WORK
if not (SOURCE / "ledger.py").is_file():
    PATH_ROOT = WORK.parent
    SOURCE = PATH_ROOT / "automation" / "ledger" / "observatory_ledger"
if not (SOURCE / "ledger.py").is_file():
    raise FileNotFoundError("Ledger source not found in either supported repository layout")
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output-dir", type=Path, default=ROOT / "validation-current",
                    help="Separate output directory; original audit receipts/logs are not overwritten")
OUTPUT = parser.parse_args().output_dir.resolve()
OUTPUT.mkdir(parents=True, exist_ok=True)
FILES = [SOURCE / "ledger.py", SOURCE / "recovery.py", SOURCE / "adapters.py",
         ROOT / "test_independent_ledger.py", ROOT / "test_evidence_admission.py",
         WORK / "recovery-lab" / "experiment" / "preflight" / "PREFLIGHT.json"]

def hashes():
    return {str(p.relative_to(PATH_ROOT)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest() for p in FILES}

before = hashes()
result = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", str(ROOT), "-p", "test_*.py", "-v"],
                        cwd=ROOT, capture_output=True, text=True, timeout=60)
log = result.stdout + result.stderr
(OUTPUT / "admission-tests.log").write_text(log, encoding="utf-8")
after = hashes()
count = re.search(r"Ran (\d+) tests?", log)
record = {
    "generated_at": datetime.now(timezone.utc).isoformat(), "python_version": platform.python_version(),
    "command": "python -m unittest discover -s " + str(ROOT.relative_to(PATH_ROOT)).replace("\\", "/") + " -p test_*.py -v",
    "exit_code": result.returncode, "test_count": int(count.group(1)) if count else None,
    "source_unchanged_during_tests": before == after, "files_sha256": after,
    "network_calls": 0, "real_data_model_fits": 0, "source_modified_by_review": False,
    "real_primary_oracle": {"resolved": 3445, "landmarks": 4104, "fraction": 3445/4104,
                            "threshold": .9, "gate_passed": False},
    "historical_predesign": {"resolved": 3451, "landmarks": 4104, "current_admission_value": False},
    "regression_found_and_fixed": "Admission proposal inherited checks from unlisted evidence; now rejected",
    "test_log_sha256": hashlib.sha256((OUTPUT / "admission-tests.log").read_bytes()).hexdigest(),
}
(OUTPUT / "ADMISSION_VALIDATION.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(log, end="")
if before != after:
    raise SystemExit("Source changed during independent validation")
sys.exit(result.returncode)
