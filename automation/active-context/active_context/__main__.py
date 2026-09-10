"""Machine-readable CLI; configured commands execute only through explicit run."""
import argparse
import json
from pathlib import Path
import sys
from .core import inspect, plan, read_json, run_check, verify_ledger


def main():
    parser = argparse.ArgumentParser(description='Inspect evidence and propose relevant rechecks within declared inputs.')
    sub = parser.add_subparsers(dest='action', required=True)
    for action in ('run','inspect','plan','verify'):
        child = sub.add_parser(action)
        child.add_argument('--ledger', type=Path, required=True)
        if action != 'verify':
            child.add_argument('--repo', type=Path, required=True)
            child.add_argument('--config', type=Path, required=True)
        if action == 'run':
            child.add_argument('--check', required=True)
            child.add_argument('--timeout', type=float, default=60)
        if action == 'plan':
            child.add_argument('--claim', action='append', required=True)
            child.add_argument('--budget', type=float)
    args = parser.parse_args()
    try:
        if args.action == 'verify':
            result = verify_ledger(args.ledger)
        else:
            config = read_json(args.config.read_text(encoding='utf-8'))
            if args.action == 'run':
                result = run_check(config,args.check,args.repo,args.ledger,args.timeout)
            elif args.action == 'inspect':
                result = inspect(config,args.repo,args.ledger)
            else:
                result = plan(config,args.repo,args.ledger,args.claim,args.budget)
        print(json.dumps(result,indent=2,allow_nan=False))
        if args.action == 'run' and (result['exit_code'] != 0 or result['timed_out'] or not result['stable'] or not result['dependencies_ready']):
            return 1
        return 0
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(json.dumps({'error': str(exc), 'usable': False}), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
