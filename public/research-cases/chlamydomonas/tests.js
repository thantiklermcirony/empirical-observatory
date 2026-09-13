/* SPDX-License-Identifier: GPL-3.0-only */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const O=require('./engine.js'),C=require('./connectors.js');const results=[];
function test(name,f){try{f();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
test('All 27 defaults match source text exactly',()=>{
 const text=fs.readFileSync(path.join(__dirname,'upstream/models/Heldt2019_ChlamydomonasMultipleFission.txt'),'utf8');
 const block=text.split('********** MODEL PARAMETERS')[1].split('********** MODEL VARIABLES')[0];
 const source={};for(const m of block.matchAll(/^(\w+)\s*=\s*([\d.]+)/gm))if(m[1]!=='Light')source[m[1]]=+m[2];
 assert.deepStrictEqual(O.defaults,source);assert.equal(Object.keys(source).length,27);
});
test('Zero volume is rejected, not silently reset',()=>assert.throws(()=>O.simulate({volume:0})));
test('Negative initial amount rejected',()=>assert.throws(()=>O.simulate({initial:[1,1,0,-1,1,8,0,0]})));
test('Zero step rejected',()=>assert.throws(()=>O.simulate({dt:0})));
test('Unknown and prototype-name parameters rejected',()=>{assert.throws(()=>O.parameters({unknown:2}));assert.throws(()=>O.parameters({toString:2}));});
test('Nonfinite schedule rejected',()=>assert.throws(()=>O.makeSchedule({period:Infinity})));
test('Overlong experiment rejected',()=>assert.throws(()=>O.simulate({hours:1000})));
test('Gapped forcing rejected',()=>assert.throws(()=>O.simulate({schedule:[{start:1,end:2,light:1}]})));
test('Subminute pulses rejected',()=>assert.throws(()=>O.makeSchedule({period:1e-9})));
test('Zero and full-duty schedules become darkness and light',()=>{
 for(const duty of [0,1])assert(O.makeSchedule({mode:'pulse',duty}).every(s=>s.light===duty));
});
test('Default day/night forcing has exactly 24 h of light',()=>assert.equal(O.makeSchedule({mode:'daynight',hours:48}).reduce((a,s)=>a+s.light*(s.end-s.start),0),1440));
test('Four exact total-pool updates match closed forms',()=>{
 const y=O.initial(),h=.1,z=O.step(y,1,O.defaults,h),p=O.defaults,g=p.mu;
 assert(Math.abs(z[0]-Math.exp(g*h))<1e-12);
 const expectedT=(y[2]+y[4])*Math.exp(-p.kDeTf*h)+p.kSyTf*(Math.exp(g*h)-Math.exp(-p.kDeTf*h))/(g+p.kDeTf);
 const expectedI=(y[3]+y[4]+y[5])*Math.exp(-p.kDeIn*h)+p.kSyIn/p.kDeIn*(1-Math.exp(-p.kDeIn*h));
 assert(Math.abs(z[2]+z[4]-expectedT)<1e-11);assert(Math.abs(z[3]+z[4]+z[5]-expectedI)<1e-11);
});
test('Current engine recomputed against all independent reference cases',()=>{
 const cases=JSON.parse(fs.readFileSync(path.join(__dirname,'REFERENCE_CASES.json'))),refs=JSON.parse(fs.readFileSync(path.join(__dirname,'BDF_REFERENCE.json')));
 for(let i=0;i<cases.length;i++){const r=O.simulate({...cases[i],dt:.03125}),b=refs[i];assert.equal(r.events.length,b.events.length);
  assert(Math.max(0,...r.events.map((e,j)=>Math.abs(e.t-b.events[j])))<1.5);
  assert(Math.max(...r.final.y.map((v,j)=>Math.abs(v-b.final[j])/(1+Math.abs(b.final[j]))))<.05);}
});
test('Recomputed fine light timing contrast is 1 versus 8',()=>{
 const c=JSON.parse(fs.readFileSync(path.join(__dirname,'CAMPAIGN_RESULTS.json'))).confirmedContrasts[0];
 const a=O.simulate({...c.aConfig,dt:.03125}),b=O.simulate({...c.bConfig,dt:.03125});
 assert.equal(a.final.descendants,1);assert.equal(b.final.descendants,8);
 assert(Math.abs(a.final.y[0]*a.final.descendants/(b.final.y[0]*b.final.descendants)-1)<1e-9);
 for(const r of [a,b])for(const e of r.events){for(let i=0;i<8;i++){assert(Math.abs(e.parent[i]-2*e.daughter[i])<1e-12);if(i)assert(Math.abs(e.parent[i]/e.parent[0]-e.daughter[i]/e.daughter[0])<1e-12);}}
});
test('Previously spurious hidden-state result is absent at display resolution',()=>{
 const w=JSON.parse(fs.readFileSync(path.join(__dirname,'CONNECTOR_TESTS.json'))).best;
 const a=O.simulate({initial:w.base,mode:'dark',hours:3,dt:.03125}),b=O.simulate({initial:w.changed,mode:'dark',hours:3,dt:.03125});
 assert.equal(a.events.length,b.events.length);assert(Math.abs(a.events[0].t-b.events[0].t)<.01);
});
test('Measured area is not admitted as modeled volume',()=>assert(!C.validatePort({kind:'area',unit:'pixels'},{kind:'volume',unit:'AV'}).accepted));
test('Brier results recompute independently from every held-out record',()=>{
 const a=JSON.parse(fs.readFileSync(path.join(__dirname,'HELD_OUT_PREDICTIONS.json'))),r=JSON.parse(fs.readFileSync(path.join(__dirname,'EMPIRICAL_RESULTS.json')));
 for(const key of ['size','history']){const score=a.reduce((v,row)=>v+((row.divisions>0?1:0)-row['prediction_'+key])**2,0)/a.length;
 assert(Math.abs(score-r.overall[key==='size'?'size_time':'size_time_history'].brier)<1e-12);}
});
test('Full coarse and refined grids contain the same 1000 cases',()=>{
 const a=JSON.parse(fs.readFileSync(path.join(__dirname,'CAMPAIGN_RESULTS.json'))),b=JSON.parse(fs.readFileSync(path.join(__dirname,'REFINEMENT_RESULTS.json')));
 assert.equal(a.rows.length,1000);assert.equal(b.rows.length,1000);assert.equal(b.divisionCountChanged,b.rows.filter(r=>r.divisions!==r.coarseDivisions).length);
});
const out={passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
fs.writeFileSync(path.join(__dirname,'REGRESSION_TESTS.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));if(out.failed)process.exitCode=1;
