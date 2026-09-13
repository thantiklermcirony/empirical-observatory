"""Leakage-controlled observational tests, not causal or whole-cell validation."""
from pathlib import Path
import json, hashlib
import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score

ROOT = Path(__file__).resolve().parent

def read(name):
    return np.genfromtxt(ROOT / 'upstream/data' / name, delimiter=',', names=True)

def scores(y, p):
    return {'n': len(y), 'division_fraction': float(np.mean(y)),
            'brier': float(brier_score_loss(y, p)), 'log_loss': float(log_loss(y, p)),
            'auc': float(roc_auc_score(y, p)) if len(np.unique(y)) > 1 else None}

def predictor(x, y):
    # Fixed before looking at results; no tuning against evaluation labels.
    m = make_pipeline(StandardScaler(), PolynomialFeatures(2, include_bias=False),
                      StandardScaler(), LogisticRegression(C=1, max_iter=3000))
    m.fit(x, y)
    return m

def main():
    rows, audits = [], []
    for h in [12, 18, 24, 30]:
        name = f'Fig4_{"data" if h == 30 else "Data"}_LD{h}.dat'
        a = read(name)
        good = (a['Size0'] > 0) & (a['Size4'] > 0) & (a['Div'] >= 0)
        audits.append({'file':name, 'raw_rows':len(a), 'eligible_rows':int(sum(good))})
        for r in a[good]:
            rows.append([h, r['Size0'], r['Size4'], r['Div'], r['xID'], r['yID']])
    a = np.array(rows)
    y = (a[:,3] > 0).astype(int)
    # Only quantities measurable at the end of the light pulse are predictors.
    # End-of-experiment size and microscopy coordinates are excluded.
    xs = np.c_[np.log(a[:,2]), (a[:,0]-4)/24]
    xh = np.c_[xs, np.log(a[:,2]/a[:,1])/4]
    preds = {k:np.zeros(len(a)) for k in ['prevalence','size_time','size_time_history']}
    folds = []
    for h in [12,18,24,30]:
        test = a[:,0] == h
        train = ~test
        p0 = np.full(sum(test), np.mean(y[train]))
        p1 = predictor(xs[train], y[train]).predict_proba(xs[test])[:,1]
        p2 = predictor(xh[train], y[train]).predict_proba(xh[test])[:,1]
        f = {'held_out_experiment_hours':h}
        for key, p in zip(preds,[p0,p1,p2]):
            preds[key][test] = p
            f[key] = scores(y[test], p)
        f['history_brier_improvement'] = f['size_time']['brier'] - f['size_time_history']['brier']
        folds.append(f)
    overall = {k:scores(y,p) for k,p in preds.items()}
    diff = (y-preds['size_time'])**2 - (y-preds['size_time_history'])**2
    rng = np.random.default_rng(20260913)
    # Conditional on these four experiments. Not an independent-lab CI.
    bs = [float(np.mean(diff[rng.integers(0,len(diff),len(diff))])) for _ in range(2000)]
    ext = read('FigS4_Data.dat')
    good = ((ext['Div0']+ext['Div6']+ext['Div12']) == 0) & (ext['Size6']>0) & (ext['Size12']>0)
    e = ext[good]
    ey = ((e['Div18']+e['Div24']) > 0).astype(int)
    es = np.c_[np.log(e['Size12']), np.full(len(e),12/24)]
    eh = np.c_[es,np.log(e['Size12']/e['Size6'])/6]
    ep1 = predictor(xs,y).predict_proba(es)[:,1]
    ep2 = predictor(xh,y).predict_proba(eh)[:,1]
    external = {'protocol':'6 h dark, 6 h light, predict division in next 12 h dark',
                'raw_rows':len(ext),'eligible_rows':len(e),
                'size_time':scores(ey,ep1),'size_time_history':scores(ey,ep2),
                'history_brier_improvement':float(np.mean((ey-ep1)**2-(ey-ep2)**2)),
                'caveat':'Different protocol, same published study. Pixel-area calibration across files is not independently verified. Not a new laboratory validation.'}
    bins=[]
    for h in [12,18,24,30]:
        ids=np.where(a[:,0]==h)[0]
        for part in np.array_split(ids[np.argsort(a[ids,2])],8):
            bins.append({'hours':h,'n':len(part),'area4':float(np.mean(a[part,2])),
                         'observed_division_fraction':float(np.mean(y[part])),
                         'size_prediction':float(np.mean(preds['size_time'][part])),
                         'history_prediction':float(np.mean(preds['size_time_history'][part]))})
    result = {'scope':'Observational prediction of at least one division; not mechanistic parameter fitting.',
              'source_commit':'ab87e1314e27239d763e9cab188291e01b153574',
              'audit':audits, 'total_eligible':len(y),'features':{'baseline':['log area after light','dark duration'],
              'added_dial':'log area growth per hour during light'},
              'protocol':'Leave one complete Fig4 experiment out, polynomial logistic regression degree 2, C=1; fixed before scores were inspected.',
              'folds':folds,'overall':overall,'brier_improvement':float(np.mean(diff)),
              'conditional_cell_bootstrap_95':np.quantile(bs,[.025,.975]).tolist(),
              'independent_experiments':4,'external_protocol':external,'plot_bins':bins,
              'excluded_predictors':['end-of-experiment size','xID','yID','future divisions'],
              'raw_files':[{'path':str(p.relative_to(ROOT)), 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted((ROOT/'upstream/data').glob('*.dat'))]}
    (ROOT/'EMPIRICAL_RESULTS.json').write_text(json.dumps(result,indent=2))
    # Per-cell audit allows every score to be recomputed independently.
    records=[{'experiment_hours':int(r[0]),'area0_pixels':r[1],'area4_pixels':r[2],
              'divisions':int(r[3]),'prediction_size':preds['size_time'][i],
              'prediction_history':preds['size_time_history'][i]} for i,r in enumerate(a)]
    (ROOT/'HELD_OUT_PREDICTIONS.json').write_text(json.dumps(records))
    print(json.dumps({k:result[k] for k in ['total_eligible','folds','overall','brier_improvement','conditional_cell_bootstrap_95','external_protocol']},indent=2))

if __name__=='__main__':
    main()
