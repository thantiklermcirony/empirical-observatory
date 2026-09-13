"""Independently check campaign-selected hypotheses, including longer horizons."""
from pathlib import Path
import json
from reference import reference
ROOT=Path(__file__).resolve().parent

def pulse(period,hours):
    edges=[(i*period*30,(i+1)*period*30,1-i%2) for i in range(round(hours*2/period))]
    return [{'start':a,'end':b,'light':l} for a,b,l in edges]

def main():
    sweep=json.loads((ROOT/'CAMPAIGN_RESULTS.json').read_text())
    best=sweep['confirmedContrasts'][0]
    witness=json.loads((ROOT/'CONNECTOR_TESTS.json').read_text())['best']
    cases=[]
    for hours in [48,96]:
        for label,c in [('A',best['aConfig']),('B',best['bConfig'])]:
            v=c['volume']
            cases.append({'name':f'Light-pattern {label}, {hours} h','parameters':c['parameters'],
                'initial':[v,v,0,2.6*v,v,8.6*v,0,0],'schedule':pulse(c['period'],hours)})
    for label,state in [('original',witness['base']),('redistributed',witness['changed'])]:
        cases.append({'name':'Hidden-state '+label,'initial':state,
                      'schedule':[{'start':0,'end':720,'light':0}]})
    results=[]
    for c in cases:
        r=reference(c)
        r['name']=c['name'];r['config']=c;r['descendants']=2**len(r['events'])
        r['totalVolume']=r['descendants']*r['final'][0]
        print(c['name'],r['descendants'],r['events'],flush=True)
        results.append(r)
    (ROOT/'INDEPENDENT_FINDING_CHECKS.json').write_text(json.dumps(results,indent=2))

if __name__=='__main__':main()
