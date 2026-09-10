"""Run `python -m observatory_ledger --help`; all commands are local only."""

import argparse
import json
from pathlib import Path
import sys

from .demo import run_demo
from .ledger import Ledger, LedgerError


def main(argv=None):
    parser = argparse.ArgumentParser(description="Local Observatory ledger; no public time attestation.")
    parser.add_argument("--db", required=True, help="SQLite ledger path")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init")
    commands.add_parser("demo", help="Create a clearly synthetic demo in a NEW database")
    for action in ("freeze", "issue", "fail", "resolve", "score", "check", "propose", "propose-admission", "review", "promote"):
        command = commands.add_parser(action)
        command.add_argument("json_file", help="UTF-8 JSON object matching the library method")
    capture = commands.add_parser("snapshot")
    capture.add_argument("metadata_file")
    capture.add_argument("raw_file")
    expire = commands.add_parser("expire")
    expire.add_argument("experiment_id")
    test = commands.add_parser("test-candidate")
    test.add_argument("candidate_id")
    admission = commands.add_parser("assess-admission")
    admission.add_argument("candidate_id")
    verify = commands.add_parser("verify")
    verify.add_argument("--expected-head")
    export = commands.add_parser("export")
    export.add_argument("--output", help="Otherwise write JSON to stdout")
    args = parser.parse_args(argv)
    try:
        if args.command not in {"init", "demo", "freeze"} and not Path(args.db).is_file():
            raise LedgerError("Ledger file does not exist; verification must not create empty evidence.")
        if args.command == "demo":
            result = run_demo(args.db)
        else:
            with Ledger(args.db) as ledger:
                if args.command == "init":
                    result = ledger.verify()
                elif args.command == "verify":
                    result = ledger.verify(args.expected_head)
                elif args.command == "export":
                    result = ledger.export()
                elif args.command == "expire":
                    result = ledger.record_overdue_failures(args.experiment_id)
                elif args.command == "test-candidate":
                    result = ledger.test_candidate(args.candidate_id)
                elif args.command == "assess-admission":
                    result = ledger.assess_admission(args.candidate_id)
                elif args.command == "snapshot":
                    metadata = json.loads(Path(args.metadata_file).read_text(encoding="utf-8"))
                    snapshot_id = metadata.pop("snapshot_id")
                    result = ledger.capture_snapshot(snapshot_id, Path(args.raw_file).read_bytes(), **metadata)
                else:
                    payload = json.loads(Path(args.json_file).read_text(encoding="utf-8"))
                    methods = {"freeze": ledger.freeze_contract, "issue": ledger.issue_prediction,
                               "fail": ledger.record_failure, "resolve": ledger.resolve_outcome,
                               "score": ledger.score, "check": ledger.record_check, "propose": ledger.propose_candidate,
                               "propose-admission": ledger.propose_admission,
                               "review": ledger.review_candidate, "promote": ledger.promote_candidate}
                    method = methods[args.command]
                    result = method(payload) if args.command in {"freeze", "propose", "propose-admission"} else method(**payload)
        text = json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
        if getattr(args, "output", None):
            output = Path(args.output)
            if output.resolve() == Path(args.db).resolve():
                raise LedgerError("Export must not overwrite the database.")
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(text, encoding="utf-8")
        else:
            print(text, end="")
        return 0
    except (LedgerError, OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f"Ledger error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
