"""Dependency-free validation and reproducible synthetic artifact generation."""

import ast
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import platform
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from observatory_ledger.demo import demo_contract


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")


def main():
    evidence = ROOT / "evidence"
    evidence.mkdir(exist_ok=True)
    python_files = sorted(ROOT.glob("observatory_ledger/*.py")) + sorted(ROOT.glob("tests/*.py")) + [Path(__file__).resolve()]
    for path in python_files:
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    log = io.StringIO()
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"))
    result = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    (evidence / "unittest.log").write_text(log.getvalue(), encoding="utf-8")
    smoke = []
    with tempfile.TemporaryDirectory(prefix="observatory-ledger-") as temp:
        database = str(Path(temp) / "demo.sqlite")
        def cli(*arguments, expected_code=0):
            run = subprocess.run([sys.executable, "-m", "observatory_ledger", "--db", database, *arguments],
                                 cwd=ROOT, capture_output=True, text=True, encoding="utf-8", timeout=30)
            smoke.append({"command": list(arguments), "exit_code": run.returncode,
                          "expected_exit_code": expected_code, "stderr": run.stderr})
            if run.returncode != expected_code:
                raise RuntimeError(f"CLI validation failed: {arguments}: {run.stderr}")
            return json.loads(run.stdout) if expected_code == 0 else None
        synthetic = cli("demo")
        cli("verify", "--expected-head", synthetic["integrity"]["head_sha256"])
        exported = cli("export")
        if exported["events"] != synthetic["events"] or exported["public_time_attestation"] is not False:
            raise RuntimeError("CLI export changed the event history or attestation status.")
        cli("demo", expected_code=2)
    write_json(ROOT / "examples" / "synthetic-contract.json", demo_contract())
    write_json(ROOT / "examples" / "synthetic-export.json", synthetic)
    report = {"validated_at": datetime.now(timezone.utc).isoformat(), "python": sys.version,
              "platform": platform.platform(), "syntax_files_checked": len(python_files),
              "unit_tests_run": result.testsRun, "unit_failures": len(result.failures),
              "unit_errors": len(result.errors), "unit_skipped": len(result.skipped),
              "cli_checks": smoke, "passed": result.wasSuccessful(),
              "scope": "Local stdlib synthetic/unit and CLI checks; no live data, fitting, Linux execution claim or scientific efficacy claim."}
    write_json(evidence / "test-report.json", report)
    paths = python_files + [ROOT / "README.md", ROOT / "INTERFACE.md", ROOT / "examples" / "synthetic-contract.json", ROOT / "examples" / "synthetic-export.json"]
    write_json(evidence / "manifest.json", {"files": [{"path": p.relative_to(ROOT).as_posix(),
               "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]})
    print(json.dumps({"passed": report["passed"], "tests": result.testsRun, "cli_checks": len(smoke),
                      "report": str(evidence / "test-report.json")}, indent=2))
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
