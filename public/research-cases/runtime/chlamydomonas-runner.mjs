// SPDX-License-Identifier: GPL-3.0-only
// Bounded case adapter for the preserved Heldt-model implementation; see ../chlamydomonas/upstream/LICENSE.
import {gate, readVerified, seal} from './case-core.mjs';
export const CASE_VERSION = 'chlamydomonas-case-engine/1';
export function validateRequest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('A case configuration is required.');
  if (Object.keys(raw).some(k => !['experiment', 'hours', 'slots'].includes(k))) throw Error('Unknown configuration field. Import configurations, not past result claims.');
  if (!['timing', 'artifact', 'empirical', 'state'].includes(raw.experiment)) throw Error('Unknown experiment.');
  const hours = raw.hours ?? 48, slots = raw.slots ?? 6;
  if (![48,96].includes(hours) || ![6,8].includes(slots)) throw Error('Choose 48/96 hours and 6/8 history slots.');
  if (raw.experiment !== 'timing' && hours !== 48) throw Error('Only the light-timing case uses a variable endpoint.');
  if (raw.experiment !== 'state' && slots !== 6) throw Error('Only state recovery uses a variable history grid.');
  return {experiment: raw.experiment, hours, slots};
}
const fine = .03125, coarse = .125;
const count = r => r.final.descendants;
const total = r => r.final.y[0] * count(r);
const first = r => r.events[0]?.t ?? null;
const summary = (label,r,dt) => ({label,dtMinutes:dt,initial:r.initial,parameters:r.parameters,schedule:r.schedule,lightMinutes:r.final.dose,descendants:count(r),totalVolume:total(r),firstDivisionMinutes:first(r),state:r.final.y,events:r.events.map(e=>e.t),diagnostics:r.diagnostics,trace:r.trace.map(s=>({minutes:s.t,volume:s.y[0],totalVolume:s.y[0]*s.descendants,descendants:s.descendants,regulator:s.y[1]/s.y[0]}))});
function stable(a,b) { return count(a)===count(b) && a.events.length===b.events.length && a.events.every((e,i)=>Math.abs(e.t-b.events[i].t)<1.5); }
function agrees(a,b) { return a.events.length===b.events.length && a.events.every((e,i)=>Math.abs(e.t-b.events[i])<1.5) && a.final.y.every((v,i)=>Math.abs(v-b.final[i])/(1+Math.abs(b.final[i]))<.05); }
function referenceDetail(a,b) {return `Event counts ${a.events.length}/${b.events.length}; maximum event-time difference ${a.events.length===b.events.length?Math.max(0,...a.events.map((e,i)=>Math.abs(e.t-b.events[i]))).toFixed(6):'undefined'} min; maximum scaled final-state error ${Math.max(...a.final.y.map((v,i)=>Math.abs(v-b.final[i])/(1+Math.abs(b.final[i])))).toFixed(6)}. Required: event difference < 1.5 min and scaled state error < 0.05. Preserved independent BDF reference; not executed by the browser.`;}
function identities(r) {return r.diagnostics.maxVolumeIdentityRelativeError<1e-8 && r.diagnostics.maxDivisionBalanceError<1e-9;}
const limitations = [
  'These ODE runs are predictions of the published eight-state model, not measurements of an organism or evidence for a new law.',
  'Volume is in arbitrary model units (AV); regulators are generic amounts (AU). Light is binary, not measured energy. Time is minutes.',
  'Lineage volume = initial volume × exp(mu × light minutes) follows the stipulated growth law and symmetric partition; it is not a physical mass or energy conservation theorem.',
  'Synchronous identical daughters and a threshold event are assumptions. Nutrients, ATP, membrane voltage, motility, repair, death and evolution have no working connectors here.',
  'Pixel area cannot be passed into a model-volume port without a calibrated observation model. A bounded variable does not select UHL or justify cross-domain transfer.',
];
export async function runCase(raw,{model,read,provenance,onProgress=()=>{}}) {
  const request=validateRequest(raw), assetsUsed={};
  const get=async path=>{const hash=provenance.assets[path];if(!hash)throw Error('Unregistered source '+path);const result=await readVerified(path,hash,read);assetsUsed[path]=hash;return result;};
  const simulate=(config,dt=fine)=>model.simulate({...config,dt,sampleEvery:5});
  const gates=[],runs=[];let finding='',classification='',details={};
  onProgress('Checking source records');
  if(request.experiment==='timing') {
    const configs=[.5,24].map(period=>({mode:'pulse',period,duty:.5,hours:request.hours,volume:.75,parameters:{mu:.00145,kDeSkLi:.038}}));
    const refs=await get('INDEPENDENT_FINDING_CHECKS.json');
    const results=[];
    for(let i=0;i<2;i++){onProgress('Integrating light schedule '+(i+1)+' / 2');const a=simulate(configs[i],.0625),b=simulate(configs[i]);results.push(b);runs.push(summary(i===0?'15-minute light / 15-minute dark':'12-hour light / 12-hour dark',b,fine));gates.push(gate('resolution-'+i,'Step refinement · schedule '+(i+1),stable(a,b),'dt 0.0625 → 0.03125 min; same event count and every event within 1.5 min.'));const reference=refs[(request.hours===48?0:2)+i];gates.push(gate('reference-'+i,'Independent BDF reference · schedule '+(i+1),agrees(b,reference),referenceDetail(b,reference)));}
    const [a,b]=results;
    gates.push(gate('equal-input','Equal accumulated light and lineage volume',Math.abs(a.final.dose-b.final.dose)<1e-6&&Math.abs(total(a)/total(b)-1)<1e-8,`${a.final.dose/60} light hours in each schedule; no energy calibration.`));
    gates.push(gate('identity','Growth and division identities',results.every(identities),'Maximum relative volume error < 1e-8; absolute partition error < 1e-9.'));
    classification=gates.every(g=>g.status==='pass')?'supported-model-pattern':'numerically-unresolved';
    finding=`At ${request.hours} hours, the two schedules give ${count(a)} and ${count(b)} represented descendants, with the same accumulated light and approximately ${total(a).toFixed(6)} AV of lineage volume. Timing changes division in this model. The 96-hour extension checks delay rather than permanent arrest.`;
    if(classification==='numerically-unresolved')finding+=' A numerical gate failed: retain this run as provisional, including the disagreement, rather than admitting the whole state trajectory.';
    details={configs};
  } else if(request.experiment==='artifact') {
    const witness=(await get('CONNECTOR_TESTS.json')).best,refs=await get('INDEPENDENT_FINDING_CHECKS.json');
    const configurations=[witness.base,witness.changed].map(initial=>({initial,mode:'dark',hours:12}));
    const levels=[];
    for(const dt of [coarse,.0625,fine]){onProgress('Rechecking hidden-state claim at dt '+dt+' min');const pair=configurations.map(c=>simulate(c,dt));if(dt===fine)pair.forEach((r,i)=>runs.push(summary(i?'Redistributed hidden state':'Original hidden state',r,dt)));levels.push({dtMinutes:dt,first:pair.map(first),differenceMinutes:Math.abs(first(pair[0])-first(pair[1])),counts:pair.map(count)});if(dt===fine){gates.push(gate('reference','Both trajectories match independent BDF',pair.every((r,i)=>agrees(r,refs[4+i])),'Same event count; every event within 1.5 min and scaled state error < 0.05.'));gates.push(gate('identity','Declared identities preserved',pair.every(identities),'Growth and symmetric division checks.'));}}
    const vanished=levels.at(-1).differenceMinutes<.01;
    gates.push(gate('artifact','Coarse apparent effect is absent at fine resolution',vanished,'The difference must be below 0.01 min at dt 0.03125 min.'));
    classification=vanished&&gates.every(g=>g.status==='pass')?'rejected-numerical-artifact':'numerically-unresolved';
    finding=`The first-division difference changes from ${levels[0].differenceMinutes.toFixed(3)} minutes at the coarse step to ${levels.at(-1).differenceMinutes.toFixed(6)} minutes at the fine step. This witness does not support the original hidden-state claim. It does not show that hidden state is generally irrelevant.`;
    details={levels,configurations,independentDifferenceMinutes:Math.abs(refs[4].events[0]-refs[5].events[0])};
  } else if(request.experiment==='empirical') {
    const rows=await get('HELD_OUT_PREDICTIONS.json'),expected=await get('EMPIRICAL_RESULTS.json');
    if(rows.length!==3679||rows.some(r=>![12,18,24,30].includes(r.experiment_hours)||!Number.isInteger(r.divisions)||r.divisions<0||['prediction_size','prediction_history'].some(k=>!Number.isFinite(r[k])||r[k]<0||r[k]>1)))throw Error('Invalid held-out prediction record.');
    const score=rs=>({n:rs.length,baseline:rs.reduce((s,r)=>s+(+(r.divisions>0)-r.prediction_size)**2,0)/rs.length,candidate:rs.reduce((s,r)=>s+(+(r.divisions>0)-r.prediction_history)**2,0)/rs.length});
    const overall=score(rows),folds=[12,18,24,30].map(h=>({hours:h,...score(rows.filter(r=>r.experiment_hours===h))}));
    const improvement=overall.baseline-overall.candidate;
    gates.push(gate('reproduction','Reproduces the frozen held-out scores',Math.abs(overall.baseline-expected.overall.size_time.brier)<1e-12&&Math.abs(overall.candidate-expected.overall.size_time_history.brier)<1e-12,'All 3,679 rows; numerical score tolerance 1e-12.'));
    gates.push(gate('benefit','Added history improves pooled Brier score',improvement>0,'Lower Brier score is better. This is a descriptive replay of an already explored dataset, not a fresh confirmatory test.'));
    classification=gates[0].status!=='pass'?'unresolved':'candidate-prediction-failed';
    finding=`Adding the four-hour area-growth history makes pooled Brier score ${((overall.candidate/overall.baseline-1)*100).toFixed(2)}% worse: ${overall.baseline.toFixed(6)} → ${overall.candidate.toFixed(6)}. The extra dial does not earn predictive value overall in these frozen predictions.`;
    details={overall,folds,improvement,method:'Re-score frozen leave-one-experiment-out predictions; no refitting. Baseline: log(area after four hours light) and elapsed darkness; candidate adds log area growth per hour. Training-only standardization, degree-2 logistic model, C=1.',uncertainty:'Four experimental cohorts. A cell-level interval is not experiment-cluster uncertainty; no new generalization claim or calibrated ODE transfer.',dataUnit:'pixel area; division occurrence within source observation protocol'};
  } else {
    const {gates:gs,runs:rs,...result}=await recoverState(request,{simulate,model,get,onProgress});gates.push(...gs);runs.push(...rs);({finding,classification,...details}=result);
  }
  const result={schema:'observatory-case-run/1',engineVersion:CASE_VERSION,caseId:'BIO-CHLAM-001',createdAt:new Date().toISOString(),request,evidenceClass:request.experiment==='empirical'?'replay-of-published-data-predictions':'conditional-model-computation',classification,finding,gates,runs,details,limitations,provenance:{...provenance,assetsUsed},ai:{calls:0,role:'No AI calculated or validated these results. The explanation is a deterministic template from executed numbers.'}};
  return seal(result);
}

function fitStump(rows,feature){
  const values=[...new Set(rows.map(r=>r.features[feature]))].sort((a,b)=>a-b),cuts=values.slice(1).map((v,i)=>(v+values[i])/2);
  let best={threshold:null,left:(rows.reduce((s,r)=>s+r.target,0)+1)/(rows.length+2),right:0,trainingBrier:Infinity};best.right=best.left;
  const score=m=>rows.reduce((s,r)=>s+(r.target-(m.threshold===null?m.left:r.features[feature]<=m.threshold?m.left:m.right))**2,0)/rows.length;
  best.trainingBrier=score(best);
  for(const threshold of cuts){const left=rows.filter(r=>r.features[feature]<=threshold),right=rows.filter(r=>r.features[feature]>threshold);if(left.length<2||right.length<2)continue;const m={threshold,left:(left.reduce((s,r)=>s+r.target,0)+1)/(left.length+2),right:(right.reduce((s,r)=>s+r.target,0)+1)/(right.length+2)};const b=score(m);if(b<best.trainingBrier-1e-12)best={...m,trainingBrier:b};}
  return {feature,...best};
}
const testStump=(fit,rows)=>({...fit,testN:rows.length,testBrier:rows.reduce((s,r)=>s+(r.target-(fit.threshold===null?fit.left:r.features[fit.feature]<=fit.threshold?fit.left:fit.right))**2,0)/rows.length});
async function recoverState(request,{simulate,model,get,onProgress}) {
  const histories=[];for(let mask=0;mask<2**request.slots;mask++){const bits=Array.from({length:request.slots},(_,i)=>(mask>>i)&1);if(bits.reduce((a,b)=>a+b,0)===request.slots/2)histories.push(bits);}
  const prepare=(bits,dt)=>{const schedule=bits.map((light,i)=>({start:i*1440/bits.length,end:(i+1)*1440/bits.length,light}));const config={volume:.75,parameters:{mu:.00145},schedule};const past=simulate(config,dt),future=simulate({initial:past.final.y,parameters:config.parameters,mode:'dark',hours:24},dt);return{past,future,config};};
  const rows=[];let minError=0;
  for(let i=0;i<histories.length;i++){onProgress('History '+(i+1)+' / '+histories.length+' · common dark future');const bits=histories[i],{past,future}=prepare(bits,coarse);minError=Math.max(minError,past.diagnostics.maxVolumeIdentityRelativeError,future.diagnostics.maxVolumeIdentityRelativeError);
    const features={volume:past.final.y[0],elapsedDarkHours:(bits.length-1-bits.lastIndexOf(1))*24/bits.length};model.names.slice(1).forEach((name,k)=>features[name+'/V']=past.final.y[k+1]/past.final.y[0]);
    rows.push({history:bits.join(''),split:i%3===0?'test':'development',lightMinutes:past.final.dose,checkpointGeneration:past.final.generation,checkpointState:past.final.y,descendantsDuringFuture:count(future),firstDivisionMinutes:first(future),target:+(future.events.length>0),features});
  }
  // Equivalence must hold BEFORE the forecast; neither future labels nor null event times are imputed into inputs.
  const pairs=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];if(a.checkpointGeneration===b.checkpointGeneration&&Math.abs(a.features.volume/b.features.volume-1)<1e-8&&Math.abs(a.lightMinutes-b.lightMinutes)<1e-6&&a.target!==b.target)pairs.push([i,j]);}
  const pair=pairs[0],gates=[gate('identity','Declared volume identity across the search',minError<1e-8,'Maximum relative error '+minError.toExponential(3)),gate('witness','Equal visible measurements; different future outcomes',!!pair,`${pairs.length} qualifying history pairs in ${rows.length} histories. Same volume, generation and integrated light; identical 24-hour dark future.`)];
  const runs=[];let witness=null;
  if(pair){const chosen=pair.map(i=>rows[i]);const levels=[];const finePairs=[];
    for(const dt of [.0625,fine]){onProgress('Refining the first qualifying witness · dt '+dt);const both=chosen.map(r=>prepare(r.history.split('').map(Number),dt));levels.push(both);if(dt===fine)finePairs.push(...both);}
    const preserves=levels.every(p=>p[0].past.final.generation===p[1].past.final.generation&&Math.abs(p[0].past.final.y[0]/p[1].past.final.y[0]-1)<1e-8&&+(p[0].future.events.length>0)!==+(p[1].future.events.length>0));
    gates.push(gate('refinement','The selected future split survives refinement',preserves&&levels[0].every((p,i)=>stable(p.future,levels[1][i].future)),'Recompute preparation AND future at dt 0.0625 and 0.03125 min. No substitution of coarse checkpoint states.'));
    finePairs.forEach((r,i)=>runs.push(summary('Dark future after '+chosen[i].history,r.future,fine)));
    witness={histories:chosen.map(r=>r.history),checkpointStates:finePairs.map(r=>r.past.final.y),futureCounts:finePairs.map(r=>count(r.future)),firstDivisionMinutes:finePairs.map(r=>first(r.future)),selection:'First qualifying pair in ascending bit-mask order, not largest observed effect.'};
    if(request.slots===6){const reference=await get('STATE_RECOVERY_BDF.json');const supported=reference.witness.histories.join(',')===witness.histories.join(',')&&finePairs.every((r,i)=>agrees(r.past,reference.witness.results[i].preparation)&&agrees(r.future,reference.witness.results[i].future));gates.push(gate('independent','Selected pair matches independent BDF rerun',supported,'Original eight ODEs independently integrated in Python; preserved reference, not browser BDF execution.'));}else gates.push(gate('independent','Independent solver for the extended grid witness',null,'The 70-history grid has no independent BDF reference registered yet. Refinement alone is not independent confirmation.'));
  }
  const train=rows.filter(r=>r.split==='development'),test=rows.filter(r=>r.split==='test');
  const ranked=model.names.slice(1).map(name=>fitStump(train,name+'/V')).sort((a,b)=>a.trainingBrier-b.trainingBrier||a.feature.localeCompare(b.feature));
  const candidates=[testStump(fitStump(train,'volume'),test),testStump(fitStump(train,'elapsedDarkHours'),test),testStump(ranked[0],test)];
  const selected=candidates[2],baseline=candidates[0],recency=candidates[1];
  gates.push(gate('predictive','Selected hidden dial improves over volume on untouched histories',selected.testBrier<baseline.testBrier,'Feature and threshold chosen on development histories only; every third ordered history held out. Small deterministic synthetic set, not biological validation.'));
  gates.push(gate('recency','Hidden dial adds value beyond elapsed-darkness baseline',selected.testBrier<recency.testBrier-1e-12,'A tie or worse score does not establish a need to measure hidden chemistry. Qualifying pairs share trajectories and are not independent replications.'));
  const numerical=gates.filter(g=>['identity','witness','refinement','independent'].includes(g.id)).every(g=>g.status==='pass');
  return{classification:numerical?'model-state-insufficiency-witness':'exploratory-state-candidate',finding:pair?`The search found ${pairs.length} pairs whose checkpoint volume, generation and accumulated light match but whose division occurrence differs under the same next 24 hours of darkness. The selected hidden predictor is ${selected.feature}. An explicit time-since-light baseline scores ${recency.testBrier.toFixed(4)} Brier versus ${selected.testBrier.toFixed(4)} for that hidden dial; lower is better. This tests missing information, not a unique minimum state or a new biological mechanism.`:'No qualifying future split was found in this finite history grid. That does not establish that volume is sufficient.',gates,runs,witness,rows,candidates,trainingRanking:ranked,search:{slots:request.slots,histories:rows.length,preparationHours:24,lightHours:12,future:'24 hours identical darkness',searchDtMinutes:coarse,refinementDtMinutes:[.0625,fine],equivalence:{volumeRelativeTolerance:1e-8,lightMinutesTolerance:1e-6,generation:'exact'},outcome:'Any division in the next 24h. No-event times remain censored/null.',split:'Ascending masks; index modulo 3 = 0 is held out. Select hidden variable and threshold using development scores only.',predictor:'One-threshold stump; at least two training rows per leaf; Laplace-smoothed training prevalence. Competes against volume and elapsed-darkness baselines.',limits:'Finite binary histories, one preparation and one future protocol. A winning predictor is not a causal intervention, universal sufficiency proof, minimum-state identification or a confidence estimate over biology.'}};
}
