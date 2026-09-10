"""Executable assertions over pinned real sources, copied into each construction.

The added fixture deliberately proposes an incompatible assertion. None of these
mutations are alleged upstream bugs. Exit 10 is an ordinary assertion failure;
other nonzero exits are execution errors, never silently counted as a rejection.
"""
import importlib
import json
from pathlib import Path
import sys

PROJECT = sys.argv[1]
CHECK = sys.argv[2]
ROOT = Path(__file__).resolve().parents[1]
PACKAGE, IMPORT_ROOT = {
    "packaging": ("packaging", "src"),
    "itsdangerous": ("itsdangerous", "src"),
    "boltons": ("boltons", "."),
    "schedule": ("schedule", "."),
    "more_itertools": ("more_itertools", "."),
}[PROJECT]
sys.path.insert(0, str(ROOT / IMPORT_ROOT))


def provenance():
    package = importlib.import_module(PACKAGE)
    expected = (ROOT / IMPORT_ROOT / PACKAGE).resolve()
    origin = Path(package.__file__).resolve()
    assert origin.is_relative_to(expected), (origin, expected)
    for name, module in tuple(sys.modules.items()):
        if name == PACKAGE or name.startswith(PACKAGE + "."):
            path = getattr(module, "__file__", None)
            assert path and Path(path).resolve().is_relative_to(expected), (name, path)
    return origin.relative_to(ROOT).as_posix()


def primary(case):
    if PROJECT == "packaging":
        from packaging.utils import canonicalize_name
        actual = canonicalize_name(case["input"])
    elif PROJECT == "itsdangerous":
        from itsdangerous import base64_encode, base64_decode
        actual = base64_encode(case["input"]).decode("ascii")
        assert base64_decode(actual).decode("utf-8") == case["input"]
    elif PROJECT == "boltons":
        from boltons.strutils import camel2under
        actual = camel2under(case["input"])
    elif PROJECT == "schedule":
        from schedule import Scheduler
        scheduler, actual = Scheduler(), []
        for label in case["input"]:
            scheduler.every().seconds.do(actual.append, label)
        scheduler.run_all(delay_seconds=0)
    else:
        from more_itertools import chunked
        actual = list(chunked(case["input"], case["n"]))
    assert actual == case["expected"], {"input": case["input"], "actual": actual, "expected": case["expected"]}
    return actual


def secondary():
    if PROJECT == "packaging":
        from packaging.version import Version
        assert Version("1.0rc1") < Version("1.0") < Version("1.0.post1")
        assert Version("1.0.0") == Version("1.0")
    elif PROJECT == "itsdangerous":
        from itsdangerous.encoding import int_to_bytes, bytes_to_int
        assert int_to_bytes(0) == b""
        for value in (0, 1, 255, 256, 65535, 2**64 - 1):
            assert bytes_to_int(int_to_bytes(value)) == value
    elif PROJECT == "boltons":
        from boltons.iterutils import chunked, unique
        assert unique([3, 1, 3, 2, 1]) == [3, 1, 2]
        assert chunked([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]
    elif PROJECT == "schedule":
        from schedule import Scheduler
        scheduler = Scheduler()
        one = scheduler.every().seconds.do(lambda: None).tag("one")
        two = scheduler.every().seconds.do(lambda: None).tag("two")
        assert scheduler.get_jobs("one") == [one]
        scheduler.clear("one")
        assert scheduler.get_jobs() == [two]
    else:
        from more_itertools import unique_everseen, windowed
        assert list(unique_everseen([3, 1, 3, 2, 1])) == [3, 1, 2]
        assert list(windowed([1, 2, 3, 4], 3)) == [(1, 2, 3), (2, 3, 4)]
    return "secondary assertions passed"


def main():
    origin = provenance()
    if CHECK == "00-import":
        values = [origin]
    elif CHECK == "10-primary":
        files = sorted((ROOT / ".diagnostic" / "cases").glob("*.json"))
        assert files, "No assertion fixtures"
        values = [primary(json.loads(path.read_text(encoding="utf-8"))) for path in files]
    elif CHECK == "20-secondary":
        values = [secondary()]
    else:
        raise ValueError("Unknown check ID")
    provenance()
    print(json.dumps({"project": PROJECT, "check": CHECK, "origin": origin, "values": values}, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except AssertionError as exc:
        print(json.dumps({"kind": "assertion_failure", "detail": str(exc)}, sort_keys=True), file=sys.stderr)
        raise SystemExit(10)
