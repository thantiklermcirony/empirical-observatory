"""Fixed constructed cases; no policy receives a case name or mutation oracle."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parent
EPISODES = (
    ("fresh_unchanged", 60),
    ("old_unchanged", 7200),
    ("unrelated_document", 60),
    ("source_regression", 60),
    ("new_assertion_member", 60),
    ("failed_then_restored", 60),
)
CHECK_IDS = ("00-import", "10-primary", "20-secondary")
CLAIMS = ("primary-behavior", "secondary-behavior")
PROJECTS = [
    {
        "id": "packaging", "repository": "pypa/packaging", "package": "packaging", "import_root": "src",
        "license": "Apache-2.0 OR BSD-2-Clause", "license_files": ["LICENSE", "LICENSE.APACHE", "LICENSE.BSD"],
        "source": "src/packaging/utils.py",
        "before": 'value = name.lower().replace("_", "-").replace(".", "-")',
        "after": 'value = name.upper().replace("_", "-").replace(".", "-")',
        "case": {"input": "My_Package.Name", "expected": "my-package-name"},
        "new_case": {"input": "New_Package", "expected": "new_package"},
        "primary": "PEP 503 project-name normalization", "secondary": "PEP 440 version ordering and canonical equality",
    },
    {
        "id": "itsdangerous", "repository": "pallets/itsdangerous", "package": "itsdangerous", "import_root": "src",
        "license": "BSD-3-Clause", "license_files": ["LICENSE.txt"],
        "source": "src/itsdangerous/encoding.py",
        "before": 'return base64.urlsafe_b64encode(string).rstrip(b"=")',
        "after": 'return base64.urlsafe_b64encode(string)',
        "case": {"input": "a", "expected": "YQ"},
        "new_case": {"input": "b", "expected": "Yg=="},
        "primary": "URL-safe Base64 encoding without padding", "secondary": "Integer/bytes boundary round trips",
    },
    {
        "id": "boltons", "repository": "mahmoud/boltons", "package": "boltons", "import_root": ".",
        "license": "BSD-3-Clause", "license_files": ["LICENSE"],
        "source": "boltons/strutils.py",
        "before": "return _camel2under_re.sub(r'_\\1', camel_string).lower()",
        "after": "return _camel2under_re.sub(r'_\\1', camel_string).upper()",
        "case": {"input": "BasicParseTest", "expected": "basic_parse_test"},
        "new_case": {"input": "NewValue", "expected": "newvalue"},
        "primary": "CamelCase to underscore conversion", "secondary": "Stable uniqueness and chunking",
    },
    {
        "id": "schedule", "repository": "dbader/schedule", "package": "schedule", "import_root": ".",
        "license": "MIT", "license_files": ["LICENSE.txt"],
        "source": "schedule/__init__.py", "before": "for job in self.jobs[:]:", "after": "for job in self.jobs[1:]:",
        "case": {"input": ["first", "second"], "expected": ["first", "second"]},
        "new_case": {"input": ["red", "blue"], "expected": ["blue", "red"]},
        "primary": "Explicit run_all executes registered jobs in registration order", "secondary": "Tagged job selection and removal",
    },
    {
        "id": "more_itertools", "repository": "more-itertools/more-itertools", "package": "more_itertools", "import_root": ".",
        "license": "MIT", "license_files": ["LICENSE"],
        "source": "more_itertools/more.py",
        "before": "iterator = iter(partial(take, n, iter(iterable)), [])",
        "after": "iterator = iter(partial(take, n + 1, iter(iterable)), [])",
        "case": {"input": [1, 2, 3, 4, 5], "n": 2, "expected": [[1, 2], [3, 4], [5]]},
        "new_case": {"input": [1, 2, 3], "n": 2, "expected": [[1, 2, 3]]},
        "primary": "Fixed-size chunks with a short final chunk", "secondary": "Stable uniqueness and sliding windows",
    },
]


def source_records():
    records = {}
    for filename in ("SOURCE_LOCK.json", "REPLACEMENT_SOURCE_LOCK.json"):
        for item in json.loads((ROOT / "upstream" / filename).read_text(encoding="utf-8"))["repositories"]:
            records[item["repository"]] = item
    return records


def source_path(project):
    return ROOT / "upstream" / "src" / project["repository"].replace("/", "__")


def configuration(project):
    package_path = (Path(project["import_root"]) / project["package"]).as_posix()
    common = [package_path, ".diagnostic/check.py"]
    checks = []
    for check_id, claim in zip(CHECK_IDS, ("import-provenance", *CLAIMS)):
        checks.append({
            "id": check_id, "claims": [claim],
            "argv": ["{python}", "-I", "-B", ".diagnostic/check.py", project["id"], check_id],
            "scopes": common + ([".diagnostic/cases"] if check_id == "10-primary" else []),
            "env": [], "depends_on": [] if check_id == "00-import" else ["00-import"], "cost": 1.0,
        })
    return {"schema_version": 1, "checks": checks}


def materialize(project, destination):
    """New, disposable construction only; never modifies the acquired source."""
    destination = Path(destination)
    if destination.exists():
        raise ValueError("Refusing to overwrite episode directory: " + str(destination))
    shutil.copytree(source_path(project), destination)
    diagnostic = destination / ".diagnostic"
    (diagnostic / "cases").mkdir(parents=True)
    shutil.copyfile(ROOT / "source_checker.py", diagnostic / "check.py")
    (diagnostic / "cases" / "base.json").write_text(json.dumps(project["case"], sort_keys=True) + "\n", encoding="utf-8")
    return configuration(project)


def mutate_source(project, destination):
    path = Path(destination) / project["source"]
    raw = path.read_bytes()
    before, after = project["before"].encode(), project["after"].encode()
    if raw.count(before) != 1:
        raise ValueError("Source mutation must match exactly once: " + project["id"])
    changed = raw.replace(before, after, 1)
    path.write_bytes(changed)
    return raw, {"path": project["source"], "before_sha256": hashlib.sha256(raw).hexdigest(),
                 "after_sha256": hashlib.sha256(changed).hexdigest(), "before": project["before"], "after": project["after"]}


def ordinary_mutation(project, destination, episode):
    destination = Path(destination)
    if episode in ("fresh_unchanged", "old_unchanged"):
        return {"kind": "none"}
    if episode == "unrelated_document":
        path = destination / "CONTINUATION_NOTE.md"
        path.write_text("Constructed continuation: documentation only.\n", encoding="utf-8")
        return {"kind": "created-document", "path": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    if episode == "source_regression":
        _, record = mutate_source(project, destination)
        return {"kind": "constructed-source-regression", **record}
    if episode == "new_assertion_member":
        path = destination / ".diagnostic" / "cases" / "new_requirement.json"
        path.write_text(json.dumps(project["new_case"], sort_keys=True) + "\n", encoding="utf-8")
        return {"kind": "incompatible-added-assertion", "path": path.relative_to(destination).as_posix(),
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "interpretation": "An intentionally incompatible proposed requirement, not an upstream package bug."}
    raise ValueError("History episode requires a real recorded failed attempt")


def manifest():
    records = source_records()
    sources = []
    for project in PROJECTS:
        item = {**records[project["repository"]], "id": project["id"], "license_verified_from_source": project["license"],
                "license_files": [], "primary_behavior": project["primary"], "secondary_behavior": project["secondary"]}
        for name in project["license_files"]:
            raw = (source_path(project) / name).read_bytes()
            item["license_files"].append({"path": name, "sha256": hashlib.sha256(raw).hexdigest(),
                                          "url": item["url"] + "/blob/" + item["commit"] + "/" + name})
        sources.append(item)
    return {"schema_version": 1, "sources": sources, "episodes": [
        {"id": p["id"] + "/" + name, "project": p["id"], "continuation": name, "synthetic_age_seconds": age}
        for p in PROJECTS for name, age in EPISODES],
        "exclusion": json.loads((ROOT / "upstream" / "REPLACEMENT_SOURCE_LOCK.json").read_text(encoding="utf-8"))}
