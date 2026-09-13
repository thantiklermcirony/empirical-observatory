"""Independent integration of the original eight ODEs with SciPy BDF.
SPDX-License-Identifier: GPL-3.0-only
Original model: Heldt, Tyson, Cross and Novak; see upstream/.
"""
from pathlib import Path
import json, re, subprocess
import numpy as np
from scipy.integrate import solve_ivp

ROOT=Path(__file__).resolve().parent

def source_parameters():
    text=(ROOT/'upstream/models/Heldt2019_ChlamydomonasMultipleFission.txt').read_text()
    block=text.split('********** MODEL PARAMETERS')[1].split('********** MODEL VARIABLES')[0]
    return {m[0]:float(m[1]) for m in re.findall(r'(?m)^(\w+)\s*=\s*([\d.]+)',block) if m[0]!='Light'}

def derivative(t,y,L,p):
    V,SK,TF,IN,C,IP,S,M=y
    r=(p['kPhInSk']*SK+p['kPhInFk']*TF)/V
    b=p['kAsTfIn']/V*IN*TF
    A=p['At']*V*p['kDpA']/(p['kDpA']+p['kPhAS']*(S/V)**p['nPhA']+p['kPhAM']*(M/V)**p['nPhA'])
    return [p['mu']*V*L,p['kSySk']*V-(p['kDeSk']+p['kDeSkLi']*L)*SK,
      p['kSyTf']*V-b+(p['kDsTfIn']+r+p['kDeIn'])*C-p['kDeTf']*TF,
      p['kSyIn']-b+(p['kDsTfIn']+p['kDeTf'])*C-(r+p['kDeIn'])*IN+p['kDpIn']*IP,
      b-(p['kDsTfIn']+r+p['kDeIn']+p['kDeTf'])*C,
      r*(IN+C)-(p['kDpIn']+p['kDeIn'])*IP,
      p['kSySTf']*TF*p['jInSM']**p['nInSM']/(p['jInSM']**p['nInSM']+(M/V)**p['nInSM'])-p['kDeS']*S,
      p['kSyMS']*S+p['kSyMM']*M-(p['kDeM']+p['kDeMA']*A/V)*M]

def reference(config,rtol=1e-9):
    p=source_parameters()|config.get('parameters',{})
    y=np.array(config.get('initial',[1,1,0,2.6,1,8.6,0,0]),dtype=float)
    t=0.;last_event=-1.;events=[];pieces=[]
    for seg in config['schedule']:
        def event(t,y):
            if t-last_event < 1e-7:return -1e-12
            return y[7]/y[0]-p['CdTh']
        event.direction=-1
        event.terminal=True
        while t<seg['end']-1e-8:
            sol=solve_ivp(lambda t,y:derivative(t,y,seg['light'],p),[t,seg['end']],y,
                          method='BDF',rtol=rtol,atol=rtol*.01,max_step=2,events=event,dense_output=True)
            if not sol.success:raise RuntimeError(sol.message)
            pieces.append((t,sol.t[-1],sol.sol))
            t=sol.t[-1];y=sol.y[:,-1]
            if len(sol.t_events[0]):
                events.append(float(t));last_event=t;y=y/2
                if len(events)>50:raise RuntimeError('Too many events')
    return {'events':events,'final':y.tolist()}

def main():
    cases=json.loads((ROOT/'REFERENCE_CASES.json').read_text())
    results=[]
    for case in cases:
        r=reference(case)
        print(case['name'],[round(t/60,5) for t in r['events']],flush=True)
        results.append({'name':case['name'],**r})
    (ROOT/'BDF_REFERENCE.json').write_text(json.dumps(results,indent=2))

if __name__=='__main__':main()
