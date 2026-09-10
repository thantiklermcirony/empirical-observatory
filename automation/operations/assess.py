"""Deterministic research queue from recorded evidence; never edits models or gates."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False).encode()

def assess(recovery, grid, *, now=None):
    """The caller supplies documented data-quality evidence and collector state."""
    now = now or datetime.now(timezone.utc).isoformat()
    if recovery.get('further_window_search') is not False:
        raise ValueError('Recovery feasibility inspection must be closed before queue assessment')
    original = next(w for w in recovery['windows_examined'] if w['target_day']==7 and w['window']==[5,9])
    total=recovery['eligible_landmarks']; resolved=original['resolved']
    if not isinstance(total,int) or not isinstance(resolved,int) or total<=0 or not 0<=resolved<=total:
        raise ValueError('Invalid coverage counts')
    coverage=resolved/total
    checks=[{'id':'recovery-observation-coverage','passed':coverage>=.9,'observed':coverage,'required':.9,'promotion_blocking':True,'scope':'DO next-week assessment-window proxy'}]
    actions=[]
    if coverage<.9:
        actions.append({'id':'recovery-better-followup','state':'proposal','title':'Find more complete recovery follow-up','reason':f'{resolved} of {total} eligible landmarks resolve; the fixed 90% observation requirement failed.','acceptance':'Audit a separately sourced longitudinal dataset or prospectively collected measurements, including missing visits and exit reasons; freeze a new protocol before fitting.','automatic_action':'Preserve the failed gate and descriptive results. Do not broaden the window or promote a model.'})
    records=grid.get('records',[])
    if not isinstance(records,list): raise ValueError('Invalid collector records')
    resolved_grid=grid.get('resolved',0)
    if not isinstance(resolved_grid,int) or resolved_grid<0: raise ValueError('Invalid resolved count')
    actions.append({'id':'grid-prospective-evidence','state':'collecting' if grid.get('capturedAt') else 'not_started','title':'Accumulate prospective forecast evidence','reason':f'{resolved_grid} mature national outcomes recorded.','acceptance':'Qualify acquisition, missed-slot accounting and outcome revisions; then specify an independent model comparison before fitting a candidate.','automatic_action':'Collect official forecasts, verify archive integrity and resolve mature estimated actuals. No predictor promotion.'})
    if grid.get('missed',0):
        actions.append({'id':'grid-availability','state':'review','title':'Inspect missed collection slots','reason':f"{grid['missed']} scheduled slots are recorded as missed.",'acceptance':'Determine scheduling/source failure from the archived run records. Keep misses in the denominator.','automatic_action':'Report the failure; never reconstruct an earlier forecast from later historical data.'})
    return {'schema_version':1,'rules_version':'1.0.0','generated_at':now,'mode':'deterministic evidence triage','inputs_sha256':hashlib.sha256(canonical({'recovery':recovery,'grid':grid})).hexdigest(),'checks':checks,'next_actions':actions,'autonomous_model_promotion':False,'claims':'Rules identify follow-up work. They do not establish scientific novelty, causal mechanisms or self-improving predictive performance.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--recovery',type=Path,required=True);p.add_argument('--grid',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    result=assess(json.loads(a.recovery.read_text()),json.loads(a.grid.read_text()))
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'checks':result['checks'],'next_actions':len(result['next_actions'])}))
if __name__=='__main__':main()
