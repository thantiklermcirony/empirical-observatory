"""Deterministically select display examples; model scores are never selectors."""
from pathlib import Path
import hashlib
import json
import os
import argparse
import numpy as np
import pandas as pd

HERE=Path(__file__).resolve().parent
ROOT=Path(os.environ.get('VIRTUAL_CELL_WORKSPACE',str(HERE)))
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=ROOT/'cell-flight01.json')
args=parser.parse_args()
manifest=json.loads((ROOT/'prepared/manifest.json').read_text())
summary=json.loads((ROOT/'results/summary.json').read_text())
curves=json.loads((ROOT/'results/risk-curves.json').read_text())
scores=pd.read_csv(ROOT/'results/per-target.csv').set_index(['context','target'])
key=lambda text:hashlib.sha256(('flight01:'+text).encode()).hexdigest()
targets=sorted(sorted(manifest['targets'],key=key)[:8])
genes=sorted(sorted(manifest['genes'],key=key)[:96])
gene_idx=[manifest['genes'].index(g) for g in genes]
models=['zero','global_template','target_mean','global_shrink','heterogeneity_shrink']
output={'version':'flight01','selection':'8 targets and96 outcome genes chosen by fixed SHA256 label ordering, independent of results. Full scores use all6642 common genes.','targets':targets,'genes':genes,'shape':manifest['shape'],'contexts':{},'summary':{c:{name:round(d['models'][name]['macro_mse'],9) for name in models} for c,d in summary['contexts'].items()},'gatePassed':summary['prospective_advantage_gate_passed']}
def numbers(values):return [float(round(float(v),5)) if np.isfinite(v) else None for v in values]
for context in manifest['contexts']:
    truth=np.load(ROOT/'prepared'/f'{context}.npy',mmap_mode='r')
    rows={}
    with np.load(ROOT/'results'/f'{context}-predictions.npz') as predictions:
        for target in targets:
            i=manifest['targets'].index(target);scored=scores.loc[(context,target)]
            rows[target]={'actual':numbers(truth[i,gene_idx]),'predictions':{},'scores':{name:float(scored[name+'_mse']) for name in models},'scoredGenes':int(scored['truth_genes'])}
        for model in models:
            prediction=predictions[model]
            for target in targets:
                i=manifest['targets'].index(target)
                rows[target]['predictions'][model]=numbers(prediction[i,gene_idx])
                if model=='target_mean':
                    actual=np.asarray(truth[i],dtype=np.float64)
                    predicted=np.asarray(prediction[i],dtype=np.float64)
                    valid=np.isfinite(actual)
                    a=float(np.mean(predicted[valid]**2));b=float(np.mean(predicted[valid]*actual[valid]));c=float(np.mean(actual[valid]**2))
                    rows[target]['geometry']={'a':a,'b':b,'c':c,'cosine':b/(a*c)**0.5 if a*c>0 else None}
                    if abs(a-2*b+c-rows[target]['scores']['target_mean'])>1e-9:raise ValueError('Geometry coefficients do not reproduce full-gene score')
    output['contexts'][context]={'examples':rows,'risk':[{'retained':p['fraction'],'mse':{name:p['mse'][name] for name in models}} for p in curves[context]['relative_disagreement']]}
path=args.output;path.write_text(json.dumps(output,separators=(',',':'),allow_nan=False)+'\n')
print(path,path.stat().st_size,targets)
