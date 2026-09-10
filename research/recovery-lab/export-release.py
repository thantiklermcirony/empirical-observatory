"""Export completed frozen results; this file never fits or selects a model."""
from pathlib import Path
import csv, json, hashlib
from datetime import date, datetime, timezone
ROOT=Path(__file__).resolve().parent
SITE=ROOT.parent/'empirical-observatory' if (ROOT.parent/'empirical-observatory').is_dir() else ROOT.parents[1]
OUT=ROOT.parents[1]/'outputs'
OUT.mkdir(parents=True,exist_ok=True)
NAMES={'transition':'Transition frequencies','current':'Current condition','history':'Recent history','duration':'History + duration','duration_hgb':'Nonlinear history + duration','candidate':'Added recovery history'}
def read(path): return json.loads(path.read_text(encoding='utf-8'))
summaries={mode:read(ROOT/'experiment/results'/mode/'summary.json') for mode in ('primary','complete_items','exclude_analgesic')}
primary=summaries['primary']
with (ROOT/'experiment/results/primary/predictions.csv').open(newline='',encoding='utf-8') as f: predictions=list(csv.DictReader(f))
with (ROOT/'data-audit/derived/visits.csv').open(newline='',encoding='utf-8') as f: visits=list(csv.DictReader(f))
by_animal={}
for row in predictions: by_animal.setdefault(row['animal_id'],[]).append(row)
cases=[]
for aid, rows in sorted(by_animal.items()):
    # One median intended landmark per animal, determined without outcome/score selection.
    row=sorted(rows,key=lambda r:r['landmark_date'])[len(rows)//2]
    seq=sorted([v for v in visits if v['animal_id']==aid],key=lambda v:v['collection_date'])
    origin=date.fromisoformat(seq[0]['collection_date'])
    cutoff=(date.fromisoformat(row['landmark_date'])-origin).days
    history=[]
    for v in seq:
        day=(date.fromisoformat(v['collection_date'])-origin).days
        if cutoff-60 <= day <= cutoff+9:
            history.append({'day':day,'severe':int(v['severe_lower_bound']),'assessed':int(v['ordinal_observed'])})
    label=int(row['label'])
    observed={-1:'Unresolved: '+row['label_reason'].replace('_',' '),0:'Observed below four severe-coded items',1:'Observed at least four severe-coded items',2:'Recorded death or euthanasia'}[label]
    observed_day=(datetime.fromisoformat(row['outcome_date']).date()-origin).days if row['outcome_date'] else None
    cases.append({'id':aid,'cohort':row['diet']+' / held-out fold '+str(int(row['fold'])+1),'cutoffDay':cutoff,'targetDay':cutoff+7,'observedDay':observed_day,'observed':observed,'visits':history,
                  'probabilities':[{'model':name,'values':[float(row[model+'_p_'+c]) for c in ('low','high','death_or_euthanasia')]} for model,name in NAMES.items()]})
gain=primary['relative_improvement']*100
best=primary['best_conventional']
numeric=primary['gate']['numeric_gate_pass']
verdict=('Added history met the descriptive score criteria; the primary test still failed its coverage gate.' if numeric else 'Added recovery history did not pass the declared test.')
detail=f"Only 3,445 of 4,104 intended outcomes (83.94%) were resolvable, below the 90% prerequisite. Relative error improvement was {gain:.2f}% against {NAMES[best].lower()}, with {primary['fold_wins_against_each_folds_best_conventional']}/5 fold wins. All results remain descriptive."
evidence={'status':'COMPLETED / DESCRIPTIVE','updatedAt':datetime.now(timezone.utc).isoformat(),'question':'What does recovery history tell us about the next week?',
          'verdict':verdict,'scope':'Measured histories from older female DO mice. Hold out entire animals, compare six descriptions, and reveal the next observation. No human longevity result is established.',
          'gate':{'passed':False,'detail':detail},'counts':[{'label':'Held-out animals','value':214},{'label':'Intended forecasts per model','value':'4,104'},{'label':'Resolvable outcomes','value':'83.94%'},{'label':'Declared threshold','value':'90%'}],
          'classes':['Below four severe-coded items','Four or more','Death / euthanasia'],
          'methods':[{'name':name,'score':primary['models'][model]['brier'],'role':'Added-history candidate' if model=='candidate' else 'Conventional comparison'} for model,name in NAMES.items()],
          'metric':'Animal-averaged multiclass Brier score · lower is better · resolved outcomes only','cases':cases,
          'limitations':['Final coverage is 3,445/4,104. The earlier pre-design audit counted 3,451; six records were removed from resolution after stricter survival-evidence review.',
                         'Every model predicts all intended landmarks. Scores use the same resolved subset, which may be selectively observed.',
                         'One median intended landmark per animal is displayed, chosen without outcome or model-score selection. All predictions are downloadable.',
                         'Plotted counts show known severe-coded items; missing items are explicit in the measurement table. Lines connect visits for display, not continuous health measurements.',
                         'Observed lower burden is not proof of rejuvenation. Recorded terminal outcomes include euthanasia.',
                         'Models and sensitivities were frozen before fitting, after eligibility inspection. No B6 transport, full survival model or causal intervention test was run.'],
          'links':[{'label':'Full report','href':'/research/Recovery_Lab_Report.md'},{'label':'Download reproduction','href':'/research/Recovery_Lab.zip'},
                   {'label':'Frozen source','href':read(ROOT/'experiment/FROZEN_PUBLICATION.json')['url']},{'label':'Admission record','href':'/research/Recovery_Admission.json'},
                   {'label':'Operating plan','href':'/research/Observatory_Operating_Plan.md'},{'label':'Original data','href':'https://doi.org/10.6084/m9.figshare.25125587.v1'}],
          'steps':[{'name':'Observe','status':'Original records retained','detail':'Dates, source rows, score missingness and exit reasons remain recoverable. Independent checks reconcile the intended and resolved populations.'},
                   {'name':'Describe','status':'Published before fitting','detail':'Six descriptions and three sensitivity modes were fixed. Current state, recent change and duration receive conventional comparisons.'},
                   {'name':'Predict','status':'Whole animals withheld','detail':'Five outer folds hold out animals. Settings are selected within three inner animal folds. Predictions include unresolved intended cases.'},
                   {'name':'Challenge','status':'Admission blocked','detail':detail},
                   {'name':'Revise','status':'New evidence required','detail':'The research queue calls for better observation coverage and a new frozen protocol. No score can silently rescue this failed prerequisite.'}]}
(SITE/'lib/data/recovery-lab.json').write_text(json.dumps(evidence,indent=2,allow_nan=False)+'\n',encoding='utf-8')
lines=['# Recovery Lab / Flight 01','',verdict,'',detail,'','This is a descriptive comparison on a small, survivor-selected mouse cohort. It is not evidence of longer human lifespan, causal rejuvenation, or a universal biological mechanism.','','## Frozen comparisons','', '| Mode | Best conventional | Candidate Brier | Relative improvement | Fold wins | Coverage | Overall pass |','|---|---|---:|---:|---:|---:|---|']
for mode,s in summaries.items():
    lines.append(f"| {mode} | {NAMES[s['best_conventional']]} | {s['models']['candidate']['brier']:.6f} | {s['relative_improvement']*100:.3f}% | {s['fold_wins_against_each_folds_best_conventional']}/5 | {s['coverage']['overall']['resolved']}/4104 | No |")
lines+=['','The fold-win count compares against each fold’s best conventional score, a descriptive comparison bound. It is not a selector that could have been chosen before seeing held-out performance.','', '| Primary model | Animal-macro Brier |','|---|---:|']
for model,name in NAMES.items():lines.append(f"| {name} | {primary['models'][model]['brier']:.6f} |")
lines+=['','Bootstrap: '+json.dumps(primary['paired_animal_bootstrap']), '', '## What the experiment does and does not show','',
        'Original data: 289 animals and 6,317 dated visits. The published FD/ES/RE subset has 270 animals and 5,957 visits; it does not mean 270 natural deaths. Two animals with post-exit chronology conflicts were quarantined. Primary eligibility retains 214 older DO females and 4,104 landmarks.',
        '', 'The original 5–9-day window resolved 3,451 landmarks in the pre-design availability inspection. Six depended on an unknown or other-exit date as survival evidence; final conservative adjudication leaves 3,445 resolved and 659 unresolved. The original audit remains unchanged. A later actual attendance or trusted later terminal event can establish survival through day 9; an unsupported exit date cannot.',
        '', 'The endpoint uses an identifiable visit closest to day 7 inside days 5–9, with earlier ties and recorded death/euthanasia precedence through day 9. It is an observed-window proxy, not latent health at exactly day 7. The 30 published ordinal items exclude weight and temperature; missing scores do not become healthy scores.',
        '', 'Six models use the same intended and resolved masks. Preprocessing and settings are learned only within training animals. Candidate additions are observed high-to-low recrossings, time since the last, and a fixed past burden integral with gaps and incomplete intervals omitted explicitly. Complete-item and analgesic-exclusion sensitivities are all reported.',
        '', 'The declared gate required 90% resolution overall and within each fold, 5% lower Brier error, at least four fold wins, and a positive paired animal-bootstrap lower limit. Coverage was already known to fail before fitting. Every overall gate remains false regardless of descriptive scores.',
        '', 'No complete semi-Markov likelihood, joint longitudinal-survival model, B6 transport test, durable recovery confirmation or causal dietary analysis was fitted. Cage IDs were unavailable. The bootstrap conditions on fitted models and the selected comparator; it does not include the full training/selection uncertainty.',
        '', '## Reproduction and evidence','', '[Exact source published before fitting]('+read(ROOT/'experiment/FROZEN_PUBLICATION.json')['url']+'). Eligibility and six aggregate window alternatives were inspected before design; this is not an external preregistration before any outcome inspection.',
        '', 'Use experiment/README.md and the pinned requirements in the downloadable archive. FROZEN_PUBLICATION.json binds code and derived input hashes. Source and independent synthetic checks, all intended predictions, animal losses, inner/outer fit records, preflight counts and the source audit are included.',
        '', '[Original data, Luciano et al.](https://doi.org/10.6084/m9.figshare.25125587.v1), CC BY 4.0; [original study](https://doi.org/10.1007/s11357-024-01226-9). Retain attribution when reusing source measurements.',
        '', 'The shared ledger records the real final preflight as a retrospective evidence-admission check. It creates no fictitious forecast clock and blocks admission on the failed prerequisite. The GB collector is a separate prospective record of an official forecast; it has no new candidate predictor.',
        '', '## Next scientific step','', 'Obtain follow-up with a coherent, sufficiently observed endpoint and additional independent animals. Specify a new comparison before fitting, retain conventional methods, and test whether history distinguishes future outcomes beyond present condition. The present result does not justify widening the window after seeing performance.','']
(OUT/'Recovery_Lab_Report.md').write_text('\n'.join(lines),encoding='utf-8')
(SITE/'public/research/Recovery_Lab_Report.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'cases':len(cases),'verdict':verdict,'detail':detail}))
