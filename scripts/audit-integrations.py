"""Read-only GitHub metadata audit. Does not install or execute third-party code."""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

REPOS = ["google-deepmind/alphagenome", "google-deepmind/alphagenome_research",
         "bilawalsidhu/gods-eye-view", "CesiumGS/cesium", "koala73/worldmonitor",
         "scverse/pertpy", "scverse/cellrank", "aristoteleo/dynamo-release",
         "snap-stanford/GEARS", "proroklab/popgym", "Farama-Foundation/Gymnasium",
         "google-deepmind/mujoco", "brainflow-dev/brainflow", "sccn/liblsl",
         "Quantum-Flytrap/quantum-tensors", "Qiskit/qiskit-aer", "micro-manager/pycro-manager"]
FILES = {"google-deepmind/alphagenome": ["src/alphagenome/atlas/atlas.py", "src/alphagenome/models/dna_client.py"],
         "bilawalsidhu/gods-eye-view": ["src/data/manager.js", "src/data/earthquakes.js", "src/data/contextStore.js"]}


def get(url):
    return urlopen(Request(url, headers={"User-Agent": "EmpiricalObservatory-integration-audit"}), timeout=30).read()


def inspect(repo):
    try:
        base = "https://api.github.com/repos/"+repo
        metadata = json.loads(get(base))
        sha = json.loads(get(base+"/commits/"+metadata["default_branch"]))["sha"]
        files = []
        for path in FILES.get(repo, []):
            url = f"https://raw.githubusercontent.com/{repo}/{sha}/{path}"
            raw = get(url)
            files.append({"path": path, "url": url, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
        return {"repository": metadata["full_name"], "url": metadata["html_url"],
                "description": metadata["description"], "commit": sha,
                "starsAtAudit": metadata["stargazers_count"], "archived": metadata["archived"],
                "licenseSpdxFromGitHub": (metadata.get("license") or {}).get("spdx_id"),
                "inspectedSourceFiles": files}
    except Exception as exc:
        return {"repository": repo, "error": str(exc)}


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        rows = list(pool.map(inspect, REPOS))
    output = {"checkedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "scope": "17 targeted repositories. Metadata audit for all; source interface audit for AlphaGenome and God's Eye View. Not an exhaustive GitHub census or a claim of runtime integration.",
              "repositories": rows}
    Path("research").mkdir(exist_ok=True)
    Path("research/integration-sources.json").write_text(json.dumps(output, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(rows, indent=2))
