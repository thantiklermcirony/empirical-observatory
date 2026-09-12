"""Download this script, data.json, manifest.json and the three source files to one folder.
Run: python reproduce.py. Standard library only. Fails on any byte, row or count mismatch.
Source: Yang et al. (2023), doi:10.1038/s41467-023-37930-x.
This reproduces the Observatory's retrospective screen, not the original full observation pipeline.
"""
import csv, hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parent
manifest=json.loads((root/'manifest.json').read_text())
data=json.loads((root/'data.json').read_text())
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
assert sha(root/'data.json')==manifest['dataSha256']
for source in manifest['sourceFiles']:
    assert sha(root/source['file'])==source['sha256'],source['file']
def norm(name):return '-'.join(str(int(x)) if x.isdigit() else x.upper() for x in name.strip().split('-'))
def read(name):return list(csv.DictReader((root/name).open(encoding='utf-8-sig',newline='')))
cells={norm(r['cell name']):r for r in read('Cell info wt (Figure 1e).csv')}
damage={(norm(r['name']),float(r['age'])):r for r in read('Figure 3g time-to-die.csv')}
rows=[]
for age in sorted({age for _,age in damage}):
    for h,ch in sorted(cells.items()):
        if not h.endswith('H'):continue
        t=h[:-1]+'T';ct=cells.get(t)
        if ct is None or ch['status']!='1' or ct['status']!='1':continue
        dh,dt=damage.get((h,age)),damage.get((t,age))
        if dh is None or dt is None:continue
        assert float(dh['mortality'])==float(ch['mortality'])
        assert float(dt['mortality'])==float(ct['mortality'])
        rows.append(dict(pair=h[:-1],h=h,t=t,endH=float(ch['mortality']),endT=float(ct['mortality']),age=age,damageH=float(dh['X']),damageT=float(dt['X'])))
assert rows==data['rows'],'Source-derived rows differ'
for lead in (0,3.5,7):
    for expected in data['referenceSummaries'][str(lead)]:
        age=expected['age'];joined=[r for r in rows if r['age']==age]
        no_ties=[r for r in joined if r['endH']!=r['endT'] and r['damageH']!=r['damageT']]
        eligible=[r for r in no_ties if min(r['endH'],r['endT'])>age+lead]
        k=sum((r['damageH']<r['damageT'])!=(r['endH']<r['endT']) for r in eligible)
        assert expected==dict(age=age,joined=len(joined),ties=len(joined)-len(no_ties),excludedByLead=len(no_ties)-len(eligible),n=len(eligible),k=k,fraction=k/len(eligible) if eligible else None)
print(json.dumps({'status':'passed','caseId':data['caseId'],'revision':data['revision'],'sourceDerivedRows':len(rows),'ageMarginChecks':24,'dataSha256':manifest['dataSha256'],'interpretation':'Integrity and arithmetic verified; empirical validation remains open.'},indent=2))
