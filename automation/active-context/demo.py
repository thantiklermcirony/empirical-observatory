"""Run a real local demonstration in a disposable project; write a compact replay."""
from pathlib import Path
from datetime import datetime,timezone
import argparse
import json
import tempfile
from active_context.core import inspect, plan, run_check, verify_ledger


def demo():
    frames = []
    with tempfile.TemporaryDirectory(prefix='active-context-demo-') as directory:
        root = Path(directory); repo=root/'project'; repo.mkdir()
        ledger=root/'receipts.jsonl'
        (repo/'app.py').write_text('def total(values):\n    return sum(values)\n')
        (repo/'check.py').write_text('from app import total\nassert total([2, 3]) == 5\nprint("total([2, 3]) passed")\n')
        config={'schema_version':1,'checks':[{'id':'sum-check','claims':['sum-contract'],
            'argv':['{python}','check.py'],'scopes':['app.py','check.py'],'cost':1}]}
        receipts=[]
        def frame(key,title,description):
            state=inspect(config,repo,ledger)['checks']['sum-check']
            next_check=plan(config,repo,ledger,['sum-contract'])
            frames.append({'id':key,'title':title,'description':description,
                'status':state['status'],'reusable':state['reusable'],'reasons':state['reasons'],
                'receipt_hash':state['receipt_hash'],'selected_checks':next_check['selected_checks'],
                'estimated_cost':next_check['estimated_cost'],'uncovered_claims':next_check['uncovered_claims']})
        frame('new','No evidence yet','The project has a sum check, but it has not run.')
        receipts.append(run_check(config,'sum-check',repo,ledger))
        frame('passed','Check passed','The recorded command passed with these declared inputs.')
        (repo/'README.md').write_text('A documentation-only edit outside this check\'s declared inputs.\n')
        frame('docs','Documentation changed','Declared inputs are unchanged. This example explicitly excludes README from the check.')
        (repo/'app.py').write_text('def total(values):\n    return 0\n')
        frame('changed','Code changed','The old passing result no longer applies to the changed code.')
        receipts.append(run_check(config,'sum-check',repo,ledger))
        frame('failed','Recheck failed','The latest command failed. The older pass is retained, but cannot be reused.')
        (repo/'app.py').write_text('def total(values):\n    return sum(values)\n')
        receipts.append(run_check(config,'sum-check',repo,ledger))
        frame('repaired','Repair checked','The repair passed a fresh execution. Its receipt is distinct from the original pass.')
        verification=verify_ledger(ledger)
        return {'schema_version':1,'generated_at':datetime.now(timezone.utc).isoformat(),
                'kind':'recorded_local_demo','not_a_benchmark':True,'config':config,'frames':frames,
                'receipts':[{'event_hash':r['event_hash'],'exit_code':r['exit_code'],'stable':r['stable'],
                             'timed_out':r['timed_out'],'duration_seconds':r['duration_seconds'],
                             'stdout':r['stdout'],'stderr_sha256':r['stderr']['sha256']} for r in receipts],
                'verification':verification,
                'boundary':'A constructed demonstration with declared dependencies. No learned discovery or AI performance result; original transient local store is not distributed.'}


if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--output',type=Path)
    args=parser.parse_args(); result=demo(); body=json.dumps(result,indent=2)+'\n'
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True); args.output.write_text(body,encoding='utf-8')
    print(body)
