"""Build the offline interface and evidence-linked report from computed results."""
from pathlib import Path
import json, hashlib, zipfile, re
ROOT=Path(__file__).resolve().parent

def load(name):return json.loads((ROOT/name).read_text())

def main():
    em=load('EMPIRICAL_RESULTS.json'); campaign=load('CAMPAIGN_RESULTS.json')
    refinement=load('REFINEMENT_RESULTS.json'); numerical=load('NUMERICAL_VALIDATION.json')
    connectors=load('CONNECTOR_TESTS.json'); independent=load('INDEPENDENT_FINDING_CHECKS.json')
    params=[]
    block=(ROOT/'upstream/models/Heldt2019_ChlamydomonasMultipleFission.txt').read_text().split('********** MODEL PARAMETERS')[1].split('********** MODEL VARIABLES')[0]
    for line in block.splitlines():
        m=re.match(r'^(\w+)\s*=\s*([\d.]+)\s*%(\S+)\s*(.*)',line)
        if m and m[1]!='Light':params.append({'name':m[1],'value':float(m[2]),'unit':m[3],
           'meaning':m[4],'status':'published model parameter, not a calibrated organism-wide constant',
           'structural_dial':m[1] in ['nInSM','nPhA']})
    (ROOT/'PARAMETER_LEDGER.json').write_text(json.dumps(params,indent=2))
    def ref(name):return next(r for r in load('BDF_REFERENCE.json') if r['name']==name)
    total=independent[0]['totalVolume']
    firstA=ref('Hourly flashes')['events'][0]/60;firstB=ref('12 h day, 12 h night')['events'][0]/60
    sensor=(ref('12 h day, 12 h night')['events'][0]-ref('Weaker light sensing')['events'][0])
    hidden_diff=abs(independent[4]['events'][0]-independent[5]['events'][0])
    ledger=[
      {'id':'F01','title':'Equal light time, different division outcome','status':'simulation-only; independently integrated',
       'result':f"At 48 h, 1 versus 8 descendants; both lineage volumes are {total:.6f} AV.",
       'intervention':'Initial volume 0.75 AV, growth rate 0.00145 /min; 15 min light/15 min dark versus 12 h light/12 h dark.',
       'mechanism':'Light is used by both the growth equation and starter-kinase degradation. Equal light duration fixes total lineage volume here, but not the regulatory path.',
       'limit':'Finite 48 h endpoint, not permanent arrest. At 96 h the independent model predicts 8 versus 64 descendants. Light is binary, not an energy accounting system.',
       'evidence':['INDEPENDENT_FINDING_CHECKS.json','CAMPAIGN_RESULTS.json','engine.js']},
      {'id':'F02','title':'Pulse schedule shifts first division','status':'published-model reproduction',
       'result':f'Hourly flashes: {firstA:.4f} h; 12 h day/night: {firstB:.4f} h to first division.',
       'limit':'Default model parameters. The underlying light-sensitive mechanism is existing prior work, not our discovery.',
       'evidence':['BDF_REFERENCE.json']},
      {'id':'F03','title':'Growth and light sensing are distinct controls','status':'simulation-only parameter intervention',
       'result':f'Halving the light-dependent starter-kinase degradation rate advances first division by {sensor:.3f} min under day/night forcing.',
       'limit':'No calibrated genetic manipulation or nutrient-dose interpretation is supplied.',
       'evidence':['REFERENCE_CASES.json','BDF_REFERENCE.json']},
      {'id':'F04','title':'A hidden-state discovery disappears','status':'rejected numerical artifact',
       'result':f"A coarse 0.125-minute integration suggested a {connectors['best']['timeDifference']:.3f}-minute effect of redistributing a complex. Independent BDF gives a first-division difference of {hidden_diff:.3g} min.",
       'limit':'These are synthetic initial-state preparations, not wet-lab data. The negative result concerns this outcome and protocol, not every transient or all hidden state.',
       'evidence':['CONNECTOR_TESTS.json','INDEPENDENT_FINDING_CHECKS.json']},
      {'id':'F05','title':'Growth history does not earn admission here','status':'negative held-out observational result',
       'result':f"For {em['total_eligible']} cells, the Brier score changes from {em['overall']['size_time']['brier']:.6f} to {em['overall']['size_time_history']['brier']:.6f} when growth history is added (worse).",
       'limit':'Two of four held-out experiments improve and two worsen. This is a fixed polynomial logistic model, not proof that no use of history can help. The 277-cell different-protocol test is mixed across metrics.',
       'evidence':['EMPIRICAL_RESULTS.json','HELD_OUT_PREDICTIONS.json','empirical.py']}
    ]
    (ROOT/'EVIDENCE_LEDGER.json').write_text(json.dumps(ledger,indent=2))
    max_event=max(r['fine']['maxEventTimeErrorMinutes'] for r in numerical['results'])
    max_state=max(r['fine']['endpointMaxScaledStateError'] for r in numerical['results'])
    rows='\n'.join(f"| {f['held_out_experiment_hours']} h | {f['size_time']['n']} | {f['size_time']['brier']:.5f} | {f['size_time_history']['brier']:.5f} |" for f in em['folds'])
    findings=f'''# Chlamydomonas Observatory: results, not a completion claim

The working prototype connects binary illumination, growth, a regulatory switch,
cell-cycle oscillations and symmetric division. It uses the published Heldt,
Tyson, Cross and Novak model, not a newly invented universal biology theorem.
Open **Chlamydomonas_Observatory.html** for local controls, visual playback,
paired experiments, equation nodes, evidence, export/import and missing modules.

## The strongest computed pattern

The same 24 hours of illumination over 48 hours yields **one undivided cell or
eight descendants**, depending on pulse timing, for the parameter set in F01.
Both lineages have total volume **{total:.6f} arbitrary volume units**.
This survives independent integration of the original eight equations with
SciPy BDF. Extending to 96 hours gives **8 versus 64 descendants**: the earlier
nondivision is not a claim of permanent arrest.

In plain language: two cells can receive the same total “daylight allowance,”
yet spend it on different schedules. In this model the schedule also talks to
the division switch. Counting illumination alone loses that conversation.

This is a model prediction from existing mechanisms. We have not established
that this exact parameter/schedule contrast is new to the literature, physically
realizable as configured, or correct in living cells.

## Five ledger entries

'''+''.join(f"### {r['id']} — {r['title']}\n\nStatus: {r['status']}.\n\n{r['result']}\n\nLimit: {r['limit']}\n\nEvidence: {', '.join(r['evidence'])}.\n\n" for r in ledger)+f'''
## Real data: can a new observation improve prediction?

Data are the original single-cell measurements for Figure 4. Every experiment
uses a four-hour light pulse, followed by darkness; the endpoint is 12, 18, 24
or 30 hours from initial plating. Predictors are area after light and elapsed
dark time. The proposed added dial is log area growth per hour during light.
The outcome is at least one division, not an exact daughter count.

One entire experiment is held out at a time. Degree-two polynomial logistic
regression with C=1 is fixed before scoring. Standardization is fitted only to
training data. End-of-experiment area, coordinates and future divisions are
excluded. Both panels have their own training-only fit.

| Held-out experiment | Cells | Area + time Brier | + history Brier |
|---|---:|---:|---:|
{rows}
| All held-out predictions | {em['total_eligible']} | {em['overall']['size_time']['brier']:.5f} | {em['overall']['size_time_history']['brier']:.5f} |

Lower is better. The history panel worsens the aggregate Brier score by
{-em['brier_improvement']/em['overall']['size_time']['brier']*100:.2f}%.
The conditional cell-bootstrap 95% interval for improvement is
[{em['conditional_cell_bootstrap_95'][0]:.6f}, {em['conditional_cell_bootstrap_95'][1]:.6f}].
This interval treats cells as resampling units within these available data;
it does not describe generalization to independent laboratories. Four cohorts
are too few for a strong experiment-level generalization claim. Both probability
calibration and ranking matter: AUC also worsens overall.

The separately held-back FigS4 protocol has 450 records, of which 277 are
eligible after excluding cells divided by the 12-hour measurement and missing
positive predictor sizes. We predict division during the following 12 dark
hours. Adding history slightly improves Brier score but worsens log loss and
AUC. This remains a mixed transfer result, not a rescued discovery. Pixel-scale
calibration between files is not independently established.

**Crucial separation:** no pixel area has been claimed to equal the ODE model's
arbitrary volume. The empirical classifier is not validation of the ODE or a
full-life-cycle digital twin. Published datasets, model parameters, simulation
outputs and assumptions keep separate evidence labels.

## Numerical verification

- 1,000 explicit parameter combinations: 5 initial volumes × 5 growth rates ×
  5 light-sensor rates × 8 pulse periods, each over 48 h at 50% duty cycle.
- All 1,000 rerun with a four-times finer step. No integration failures in these
  grids. **{refinement['divisionCountChanged']} division counts change**: the coarse grid is not a certificate.
- The interface uses a still-finer 0.03125-minute step. Eight standard cases
  agree with independent BDF division counts. Maximum event-time discrepancy:
  **{max_event:.4f} min**. Maximum endpoint scaled state error:
  **{max_state:.4f}**, defined as |x−reference|/(1+|reference|).
  This is not a relative-percent error or a biological confidence interval.
- Six additional BDF cases test the selected timing contrasts at 48 and 96 h,
  and expose the spurious hidden-state lead.
- Exact total-volume identity holds to about
  {refinement['maxVolumeError']:.2g} relative numerical error in the refined grid.
  Daughter sums conserve the model's volume and amount pools at division.
- 1,000 randomized positive states check the two total-pool differential
  identities; 7,000 zero-boundary checks verify nonnegative production.
- Six typed-port admission/rejection tests check incompatible quantities,
  meanings, units and clocks. Representation compatibility alone does not
  certify a causal or empirically validated coupling.

The fast initial redistribution example shows why checking only normal
trajectories is insufficient. Arbitrary new parameters and preparations remain
exploratory even when the normal-case test suite passes. All assertions concern
this finite model and checked domains, not “every possible combination.”

## Interface verification and remaining release check

Eighteen executable regression checks pass, including fresh simulation against
the independent reference cases and recomputation of both Brier scores from
the per-cell records. Eleven interaction-logic checks pass using Node worker
threads and a small DOM/canvas stand-in: startup, paired runs, playback, node
inspection, rejected findings, real-data results, export, import, changed
controls, custom schedules and invalid rate handling.

**Full browser and visual QA was not run.** Chromium was unavailable and its
download timed out in this environment. The DOM/canvas stand-in is not a browser
and does not verify CSS layout, mobile rendering or browser-specific behaviour.
The supplied browser_test.js remains the explicit release check to run next.
The standalone HTML should be downloaded and opened in a browser; it is not a
deployed Observatory page.

## What is actually new in this delivery?

A runnable, inspectable connection between the programme's node-and-dial idea,
an existing mechanistic cell-cycle model, raw experimental measurements,
held-out observation-panel comparisons, and a ledger that retains failed leads.
The source model, total-pool reduction, numerical integration, parameter sweeps
and cross-validation are established methods. This implementation is not
evidence that their combination is historically novel. No new physical
constant, theorem of all biology or complete organism is claimed.

## What remains unsolved

Nutrient uptake and reserves; osmosis/water balance; ATP and energy; ionic and
electrical dynamics; absolute size calibration; motility/fluid mechanics;
transcription/translation beyond generic regulators; DNA replication/repair;
stress, ageing and death; mating and zygotes; stochastic variation; evolution.
The present lifecycle is asexual growth and repeated symmetric division,
starting from a stipulated initial model state, not conception-to-death.

Next decisive work is joint measurement: equal-light schedules with matched
preparations, calibrated size, division timing and experimentally identified
regulator signals. Fit on some schedules, predict genuinely withheld schedules,
compare against ordinary size/time and growth models, then decide whether any
new connector or measured dial earns admission.

## Source and provenance

[Original code and measurements](https://github.com/novakgroupoxford/2019_Heldt_et_al/tree/ab87e1314e27239d763e9cab188291e01b153574),
Heldt, Tyson, Cross and Novak, “A single light-responsive sizer can control
multiple-fission cycles in Chlamydomonas,” Current Biology (2020).
Pinned source commit: ab87e1314e27239d763e9cab188291e01b153574. The included text
copies retain content with normalized final newlines; checksums describe the
local copies. The upstream GPL-3.0 licence is included. Modified code is supplied
under GPL-3.0-or-later with original attribution.

The [Observatory temporal grammar](https://github.com/thantiklermcirony/empirical-observatory/blob/main/automation/temporal-grammar/README.md)
was inspected for its quantity/context/premise and ordered-operation requirements.
MODEL_CONTRACT.json is a candidate adapter. The hosted catalogue does not yet
register this cell-cycle engine; no hosted integration or scientific admission
is claimed.
'''
    (ROOT/'FINDINGS.md').write_text(findings)
    small_campaign={k:v for k,v in campaign.items() if k!='rows'}
    small_refine={k:v for k,v in refinement.items() if k!='rows'}
    data={'empirical':em,'campaign':small_campaign,'refinement':small_refine,
          'numerical':numerical,'connectors':connectors,'independent':independent,'ledger':ledger,'parameters':params}
    html=(ROOT/'lab.template.html').read_text()
    html=html.replace('/* ENGINE */',(ROOT/'engine.js').read_text()).replace('/* CONNECTORS */',(ROOT/'connectors.js').read_text())
    html=html.replace('/* DATA */',json.dumps(data).replace('</','<\\/')).replace('/* APP */',(ROOT/'app.js').read_text())
    html=html.replace('04 / HIDDEN STATE','04 / NUMERICAL TRAP').replace('Same totals, different future.</strong>','A false discovery, caught.</strong>').replace('Redistribute a bound pool without adding total material.</small>','Watch a dramatic effect disappear under accurate integration.</small>')
    html=html.replace('</body>', '<script id="gpl-license" type="text/plain">'+(ROOT/'upstream/LICENSE').read_text()+'</script></body>')
    (ROOT/'Chlamydomonas_Observatory.html').write_text(html)
    readme='''# Chlamydomonas Observatory v0.1

Open `Chlamydomonas_Observatory.html` in a modern desktop browser. It is self-contained,
works offline, and sends no experiment data to a server. Select a quick-play pair,
press Play or drag the timeline, switch observables, inspect equation nodes, or
change controls and press Run. Export/import saves configurations and recalculates
them locally. The 27 advanced parameters are source-model rates, not calibrated
nutrient, gene or physical-constant interventions.

This is a published eight-state cell-cycle model plus a separate real-data
prediction test. It is NOT a complete digital organism. Read FINDINGS.md and
EVIDENCE_LEDGER.json, including the negative results and numerical false lead.

## Reproduce

Node 22+ for the simulator and sweep. Python 3.12+ with NumPy, SciPy and
scikit-learn for the independent solver and observational analysis. No network
is required after downloading this bundle. Commands below intentionally regenerate
the named result files in this project directory; copy the project first if you
want to preserve the current run. Full sweeps take a few minutes on a typical CPU.

```sh
python empirical.py
node campaign.js prepare
python reference.py
node campaign.js compare
node campaign.js sweep
node refine.js
node connector_tests.js
python confirm_findings.py
python build.py
```

`tests.js` runs fast input, source-parameter, equation and numerical regression
checks. `browser_test.js` runs actual browser interactions when Playwright and
Chromium are installed; those tools are not required to open the lab.
The present build passes the 18 regression checks and 11 interaction-logic
checks, but full browser/visual QA is unverified because the Chromium download
timed out. `UI_LOGIC_TESTS.json` and `BROWSER_TESTS.json` preserve that distinction.

## Files that matter

- engine.js: published dynamics, exact total-pool updates, numerical solver,
  event handling and explicit schedule segments. Same engine in browser and tests.
- connectors.js / MODEL_CONTRACT.json: typed, evidence-labelled proposed adapter.
- upstream/: pinned original equations, experimental data, readmes and GPL licence.
- empirical.py / HELD_OUT_PREDICTIONS.json: auditable, leakage-controlled data test.
- campaign.js / refine.js: enumerated parameter grid and stability audit.
- reference.py / confirm_findings.py: independently integrated original eight ODEs.
- EVIDENCE_LEDGER.json / FINDINGS.md: computed outcomes, uses, limits and failures.
- THEOREM_PORTS.md: mathematical identities, conditions and failed connections.
- AUDIT.md: earlier claims that must not be inherited as scientific evidence.

The source data's pixel area is not calibrated to model volume. Light is binary.
Drawn cells use a common volume-to-radius display scale and illustrative organelles.
Synchronous identical daughters are a model assumption. Motility, water, nutrients,
energy, ageing, death, sex and evolution are unsupported, not secretly approximated.

## Licence

Original model and data: Heldt, Tyson, Cross and Novak, repository commit
ab87e1314e27239d763e9cab188291e01b153574. The repository supplies GPL-3.0.
Modified implementation is provided under GPL-3.0-or-later, without warranty.
See upstream/LICENSE. No originality claim is made for the published model.
'''
    (ROOT/'README.md').write_text(readme)
    paths=sorted(p for p in ROOT.rglob('*') if p.is_file() and p.suffix not in ['.zip','.png','.pyc'] and p.name!='MANIFEST.json')
    manifest={'version':'0.1','source_commit':em['source_commit'],
      'files':[{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in paths]}
    (ROOT/'MANIFEST.json').write_text(json.dumps(manifest,indent=2))
    with zipfile.ZipFile(ROOT/'Chlamydomonas_Observatory_Source.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in paths+[ROOT/'MANIFEST.json']:z.write(p,'Chlamydomonas_Observatory/'+str(p.relative_to(ROOT)))
    print(json.dumps({'html_bytes':(ROOT/'Chlamydomonas_Observatory.html').stat().st_size,
                      'zip_bytes':(ROOT/'Chlamydomonas_Observatory_Source.zip').stat().st_size,
                      'findings':len(ledger),'maximum_reference_event_error_min':max_event},indent=2))

if __name__=='__main__':main()
