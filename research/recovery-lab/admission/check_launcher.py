"""Import-only portability check; never execute admission or alter its database."""

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
workspace_core = HERE.parent.parent / "observatory-automation"
repository_core = HERE.parent.parent.parent / "automation" / "ledger"
core = next(path for path in (workspace_core, repository_core) if (path / "observatory_ledger").is_dir())
database = HERE / "ledger.sqlite"
before = hashlib.sha256(database.read_bytes()).hexdigest() if database.exists() else None
command = "import runpy,sys; state=runpy.run_path(sys.argv[1],run_name='portability_check'); print(state['CORE'])"
checks = []
for label, launcher, expected in (("current_layout", HERE / "create_admission.py", core),):
    run = subprocess.run([sys.executable, "-c", command, str(launcher)], capture_output=True, text=True, check=True)
    assert Path(run.stdout.strip()).resolve() == expected.resolve()
    checks.append({"layout": label, "passed": True})
with tempfile.TemporaryDirectory(prefix="observatory-public-layout-") as temp:
    root = Path(temp).resolve()
    assert root.is_relative_to(Path(tempfile.gettempdir()).resolve())
    target = root / "research" / "recovery-lab" / "admission"
    target.mkdir(parents=True)
    shutil.copy2(HERE / "create_admission.py", target / "create_admission.py")
    copied_core = root / "automation" / "ledger" / "observatory_ledger"
    copied_core.mkdir(parents=True)
    for path in (core / "observatory_ledger").glob("*.py"):
        shutil.copy2(path, copied_core / path.name)
    run = subprocess.run([sys.executable, "-c", command, str(target / "create_admission.py")],
                         capture_output=True, text=True, check=True)
    assert Path(run.stdout.strip()).resolve() == copied_core.parent.resolve()
    assert not (target / "ledger.sqlite").exists()
    checks.append({"layout": "public_repository", "passed": True, "database_created": False})
after = hashlib.sha256(database.read_bytes()).hexdigest() if database.exists() else None
assert before == after
result = {"passed": True, "checks": checks, "existing_database_unchanged": True,
          "scope": "Import/path resolution only; no admission execution or event timestamp change."}
(HERE / "portability-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
