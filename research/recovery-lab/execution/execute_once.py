"""One authorized execution of the publicly frozen descriptive experiment.

This wrapper does not change estimators, features, labels, tuning or scoring.
"""
from pathlib import Path
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import time


root = Path(__file__).resolve().parents[1]
execution = Path(__file__).resolve().parent
experiment = root / "experiment"
output = experiment / "results"
command = [sys.executable, "-u", str(experiment / "run.py"), "evaluate",
           "--data", str(root / "data-audit" / "derived"),
           "--output", str(output),
           "--frozen-publication", str(experiment / "FROZEN_PUBLICATION.json")]
limits = {name: "1" for name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "NUMEXPR_NUM_THREADS", "BLIS_NUM_THREADS")}
start = {"started_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
         "command": command, "thread_limits": limits,
         "frozen_public_commit": "7ed5f4113e3c4d0cb8ccc256627efbb8d40c7269",
         "purpose": "One root-authorized real descriptive evaluation; no retuning after outcomes"}
if output.exists():
    raise RuntimeError("Output already exists; refusing to rerun")
with (execution / "START.json").open("x", encoding="utf-8") as handle:
    json.dump(start, handle, indent=2)
    handle.write("\n")
environment = dict(os.environ)
environment.update(limits)
timer = time.perf_counter()
print("Starting the single frozen evaluation. Full log: " + str(execution / "evaluate.log"), flush=True)
with (execution / "evaluate.log").open("xb") as log:
    process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, env=environment,
                             creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0), check=False)
result = {**start, "finished_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
          "runtime_seconds": time.perf_counter() - timer, "exit_code": process.returncode,
          "outputs": {str(p.relative_to(output)): {"bytes": p.stat().st_size,
                      "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                      for p in sorted(output.rglob("*")) if p.is_file()} if output.exists() else {}}
(execution / "EXECUTION.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: result[k] for k in ("finished_at_utc", "runtime_seconds", "exit_code")}), flush=True)
sys.exit(process.returncode)
