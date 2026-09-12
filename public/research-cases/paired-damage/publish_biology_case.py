"""Build an auditable, descriptive case; never interpret a source figure as a forecast."""
from pathlib import Path
import csv, hashlib, json, shutil

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'work/observatory-publish'
DEST = SITE / 'public/research-cases/paired-damage'
REP = Path(__file__).parent / 'replication'
DEST.mkdir(parents=True, exist_ok=True)

def norm(s):
    return '-'.join(str(int(x)) if x.isdigit() else x.upper() for x in s.strip().split('-'))

def read(name):
    return list(csv.DictReader((REP/name).open(encoding='utf-8-sig', newline='')))

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

cell_file = 'Cell info wt (Figure 1e).csv'
damage_file = 'Figure 3g time-to-die.csv'
cells = {norm(r['cell name']): {'end':float(r['mortality']), 'status':int(r['status'])} for r in read(cell_file)}
damage = {}
for r in read(damage_file):
    key=(norm(r['name']),float(r['age']))
    assert key not in damage, 'Duplicate source row'
    damage[key]={'value':float(r['X']), 'sourceMortality':float(r['mortality'])}

pairs=[]
for h, hc in sorted(cells.items()):
    if not h.endswith('H') or h[:-1]+'T' not in cells:
        continue
    t=h[:-1]+'T'; tc=cells[t]
    if hc['status'] != 1 or tc['status'] != 1:
        continue
    pairs.append({'pair':h[:-1], 'h':h, 't':t, 'endH':hc['end'], 'endT':tc['end']})
rows=[]
for age in sorted({age for _,age in damage}):
    for p in pairs:
        a,b=damage.get((p['h'],age)),damage.get((p['t'],age))
        if a is None or b is None:
            continue
        assert a['sourceMortality']==p['endH'] and b['sourceMortality']==p['endT'], 'Source endpoint mismatch'
        rows.append({**p,'age':age,'damageH':a['value'],'damageT':b['value']})

def aggregate(lead):
    out=[]
    for age in sorted({r['age'] for r in rows}):
        rr=[r for r in rows if r['age']==age]
        ties=[r for r in rr if r['damageH']==r['damageT'] or r['endH']==r['endT']]
        usable=[r for r in rr if r not in ties and min(r['endH'],r['endT'])>age+lead]
        k=sum((r['damageH']-r['damageT'])*(r['endH']-r['endT'])<0 for r in usable)
        out.append({'age':age,'joined':len(rr),'ties':len(ties),'excludedByLead':sum(min(r['endH'],r['endT'])<=age+lead for r in rr if r not in ties),'n':len(usable),'k':k,'fraction':k/len(usable) if usable else None})
    return out

sources=[]
for name in [cell_file,damage_file,'readme.txt']:
    shutil.copyfile(REP/name,DEST/name)
    sources.append({'file':name,'sha256':sha(REP/name),'bytes':(REP/name).stat().st_size,'href':'/research-cases/paired-damage/'+name})
output={'schema':'observatory-paired-damage-data/2','caseId':'BIO-PD-001','revision':2,'sourceFiles':sources,'sourceCellCount':len(cells),'candidatePairsWithBothDeaths':len(pairs),'pairDefinition':'Exact filename prefix with terminal H/T; biological daughter-role meaning is not verified.','rows':rows,'referenceSummaries':{str(lead):aggregate(lead) for lead in [0,3.5,7]},'audit':{'sourceFigureRows':len(damage),'sourceRowsAtOrAfterEndpoint':sum(age>=r['sourceMortality'] for (_,age),r in damage.items()),'inference':'Retrospective description restricted to filename-matched pairs with both deaths observed. Not a prospectively validated predictor.','excludedCensoredCells':sum(c['status']==2 for c in cells.values()),'window':'Source PI uptake uses 7-hour windows. A 3.5h margin is a sensitivity convention, not verification of exact window alignment or causal smoothing.'}}
path=DEST/'data.json'; path.write_text(json.dumps(output,indent=2)+'\n',encoding='utf8')
manifest={'caseId':'BIO-PD-001','revision':2,'dataSha256':sha(path),'dataHref':'/research-cases/paired-damage/data.json','sourceFiles':sources,'sourceArticle':'https://www.nature.com/articles/s41467-023-37930-x','sourceRepository':'https://github.com/y1fanyang/coliDamageDynamics','builderSha256':sha(Path(__file__))}
(DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
shutil.copyfile(Path(__file__),DEST/'publish_biology_case.py')
print(json.dumps({'manifest':manifest,'rows':len(rows),'summaries':output['referenceSummaries']},indent=2))
