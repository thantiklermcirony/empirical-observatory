"""Run the frozen four-context response-transfer benchmark on prepared matrices."""
from __future__ import annotations
from datetime import datetime,timezone
from pathlib import Path
import csv
import hashlib
import json
import math
import time
import os
import numpy as np
from transfer import predict,score,macro,risk_orders,shrinkage
from ingest import sha

HERE=Path(__file__).resolve().parent;ROOT=Path(os.environ.get('VIRTUAL_CELL_WORKSPACE',str(HERE)))
MODELS=['zero','global_template','target_mean','global_shrink','heterogeneity_shrink','permuted_target_mean']

def clean(value):
    if isinstance(value,dict):return {str(k):clean(v) for k,v in value.items()}
    if isinstance(value,(list,tuple)):return [clean(v) for v in value]
    if isinstance(value,np.ndarray):return clean(value.tolist())
    if isinstance(value,(float,np.floating)):return float(value) if np.isfinite(value) else None
    if isinstance(value,np.integer):return int(value)
    return value

def save(path:Path,value)->None:
    path.write_text(json.dumps(clean(value),indent=2,allow_nan=False)+'\n',encoding='utf-8')

def main()->None:
    started=time.monotonic();output=Path(os.environ.get('VIRTUAL_CELL_OUTPUT',str(ROOT/'results')));output.mkdir(exist_ok=True)
    manifest=json.loads((ROOT/'prepared/manifest.json').read_text())
    protocol=sha(HERE/'protocol.json')
    if protocol!=manifest['protocol_sha256']:raise ValueError('Protocol changed after data preparation')
    contexts=list(manifest['contexts']);targets=manifest['targets']
    matrices={}
    for context in contexts:
        path=ROOT/'prepared'/f'{context}.npy'
        if sha(path)!=manifest['contexts'][context]['matrix_sha256']:raise ValueError('Prepared matrix changed')
        matrices[context]=np.load(path,mmap_mode='r')
    summary={'protocol_sha256':protocol,'shape':manifest['shape'],'contexts':{},'claim':'Conditional published-estimate transfer pilot, not a raw-count challenge score'}
    all_curves={};all_rows=[];checks=[]
    for fold,held in enumerate(contexts):
        tick=time.monotonic()
        training=[c for c in contexts if c!=held]
        predictions,stats,configuration=predict([matrices[c] for c in training],seed=20260910+fold)
        # Commit immutable prediction artifacts before the scorer receives truth.
        prediction_path=output/f'{held}-predictions.npz'
        np.savez_compressed(prediction_path,**predictions)
        prediction_hash=sha(prediction_path)
        save(output/f'{held}-prediction-manifest.json',{'context':held,'training_contexts':training,'protocol_sha256':protocol,'prediction_sha256':prediction_hash,'configuration':configuration,'target_permutation_seed':20260910+fold,'risk_random_seed':20260911+fold,'target_ids':targets,'gene_ids':manifest['genes'],'unsupported_coordinates':int((stats.count==0).sum()),'variance_eligible_genes':stats.eligible_genes,'weights':shrinkage(stats,configuration['heterogeneity_penalty'])})
        truth=matrices[held]
        scores={name:score(pred,truth) for name,pred in predictions.items()}
        n_scored=scores['zero']['truth_genes']
        unsupported_truth=int(((stats.count==0)&np.isfinite(truth)).sum())
        fold_summary={'configuration':configuration,'models':{},'scorable_targets':int((n_scored>0).sum()),'unscorable_targets':int((n_scored==0).sum()),'finite_truth_unsupported_in_training':unsupported_truth,'prediction_sha256':prediction_hash}
        for name,value in scores.items():
            valid=np.isfinite(value['cosine'])
            fold_summary['models'][name]={'macro_mse':macro(value['mse']),'mean_cosine_over_defined':float(value['cosine'][valid].mean()) if valid.any() else None,'undefined_cosine':int((~valid).sum())}
        for i,target in enumerate(targets):
            row={'context':held,'target':target,'truth_genes':int(n_scored[i]),'training_magnitude':float(stats.magnitude[i]),'training_disagreement':float(stats.variance[i]),'variance_eligible_genes':int(stats.eligible_genes[i])}
            for name in MODELS:row[name+'_mse']=float(scores[name]['mse'][i]);row[name+'_cosine']=float(scores[name]['cosine'][i])
            all_rows.append(row)
        # Independent scalar arithmetic on a fixed non-score-selected sample.
        for i in [0,len(targets)//2,len(targets)-1]:
            for name in ['zero','target_mean','heterogeneity_shrink']:
                pairs=[(float(p),float(y)) for p,y in zip(predictions[name][i],truth[i]) if math.isfinite(float(y))]
                if not pairs:
                    checks.append({'context':held,'target':targets[i],'model':name,'status':'unscorable','passed':True})
                    continue
                oracle=math.fsum((p-y)**2 for p,y in pairs)/len(pairs)
                error=abs(oracle-float(scores[name]['mse'][i]))
                checks.append({'context':held,'target':targets[i],'model':name,'absolute_difference':error,'passed':error<1e-10*max(1,abs(oracle))})
        orders=risk_orders(stats,targets);curves={}
        for ranking,order in orders.items():
            points=[]
            for fraction in np.arange(1,11)/10:
                selected=order[:max(1,int(np.ceil(len(targets)*fraction)))]
                points.append({'fraction':float(fraction),'targets':[targets[i] for i in selected],'mse':{name:macro(value['mse'][selected]) for name,value in scores.items()}})
            curves[ranking]=points
        rng=np.random.default_rng(20260911+fold)
        random_orders=[rng.permutation(len(targets)) for _ in range(50)]
        save(output/f'{held}-random-orders.json',{'seed':20260911+fold,'target_orders':[[targets[i] for i in order] for order in random_orders]})
        random_curve=[]
        for fraction in np.arange(1,11)/10:
            size=max(1,int(np.ceil(len(targets)*fraction)))
            losses={}
            for name,value in scores.items():
                repeat_losses=[macro(value['mse'][order[:size]]) for order in random_orders]
                losses[name]=float(np.mean(repeat_losses))
            random_curve.append({'fraction':float(fraction),'mse':losses})
        curves['random_mean_of_50']=random_curve
        all_curves[held]=curves
        fold_summary['elapsed_seconds']=time.monotonic()-tick
        summary['contexts'][held]=fold_summary
        print(held,{name:round(value['macro_mse'],6) for name,value in fold_summary['models'].items()},'seconds',round(fold_summary['elapsed_seconds'],2),flush=True)
        del predictions,stats,scores
    summary['overall_macro_mse']={name:float(np.mean([d['models'][name]['macro_mse'] for d in summary['contexts'].values()])) for name in MODELS}
    comparators=['zero','global_template','target_mean','global_shrink']
    ratios={}
    for context,fold_result in summary['contexts'].items():
        best=min(fold_result['models'][name]['macro_mse'] for name in comparators)
        ratios[context]=fold_result['models']['heterogeneity_shrink']['macro_mse']/best if best>0 else None
    summary['candidate_ratio_to_strongest_conventional_by_context']=ratios
    summary['prospective_advantage_gate_passed']=sum(r is not None and r<=0.9 for r in ratios.values())>=3 and summary['overall_macro_mse']['heterogeneity_shrink']<=min(summary['overall_macro_mse'][name] for name in comparators)
    summary['elapsed_seconds']=time.monotonic()-started
    save(output/'summary.json',summary);save(output/'risk-curves.json',all_curves);save(output/'independent-arithmetic.json',{'checks':checks,'passed':all(c['passed'] for c in checks)})
    with (output/'per-target.csv').open('w',newline='',encoding='utf-8') as stream:
        writer=csv.DictWriter(stream,fieldnames=list(all_rows[0]));writer.writeheader();writer.writerows(all_rows)
    save(output/'run-provenance.json',{'created_at':datetime.now(timezone.utc).isoformat(),'protocol_sha256':protocol,'implementation_sha256':sha(HERE/'transfer.py'),'runner_sha256':sha(Path(__file__)),'data_manifest_sha256':sha(ROOT/'prepared/manifest.json'),'numpy':np.__version__,'outputs':{p.name:sha(p) for p in output.iterdir() if p.is_file() and p.name!='run-provenance.json'}})
    print(json.dumps(clean(summary['overall_macro_mse']),indent=2));print('Advantage gate:',summary['prospective_advantage_gate_passed'],flush=True)
    if not all(c['passed'] for c in checks):raise AssertionError('Independent arithmetic failed')

if __name__=='__main__':main()
