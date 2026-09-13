/* SPDX-License-Identifier: GPL-3.0-only */
const assert=require('assert'),fs=require('fs'),path=require('path');
const O=require('./engine.js'),C=require('./connectors.js');
const same={kind:'model_amount',unit:'AU',meaning:'free-TF',scale:'Heldt2019',timeUnit:'min'};
const checks=[['same representation',C.validatePort(same,{...same}).accepted],
 ['area is not volume',!C.validatePort({...same,kind:'area',unit:'pixel^2'},{...same,kind:'volume',unit:'AV'}).accepted],
 ['bound is not free',!C.validatePort(same,{...same,meaning:'total-TF'}).accepted],
 ['AU is not moles',!C.validatePort(same,{...same,unit:'mol'}).accepted],
 ['different clocks',!C.validatePort(same,{...same,timeUnit:'h'}).accepted],
 ['missing semantics',!C.validatePort({},{}).accepted]];
checks.forEach(([name,pass])=>assert(pass,name));
// Map a data-driven witness inside the published model. Change the free/bound
// distribution while preserving volume and total TF and inhibitor exactly.
// This is a synthetic state preparation, not an experimentally realized one.
const base=O.simulate({mode:'light',hours:12,dt:.125,sampleEvery:30});
const candidates=[];
for(const point of base.trace.filter(x=>x.t>=180&&x.t<=690)){
 const y=point.y,capacity=Math.min(y[2]+y[4],y[3]+y[4]);
 for(const frac of [.05,.25,.5,.75,.95]){
  const z=y.slice(),nc=capacity*frac,delta=nc-y[4];z[4]=nc;z[2]-=delta;z[3]-=delta;
  if(z.some(v=>v<0))continue;
  const a=O.simulate({initial:y,mode:'dark',hours:12,dt:.125}),b=O.simulate({initial:z,mode:'dark',hours:12,dt:.125});
  const ta=a.events[0]?.t??720,tb=b.events[0]?.t??720;
  candidates.push({preparationTime:point.t,base:y,changed:z,hiddenComplexFraction:frac,
   sameVolume:Math.abs(y[0]-z[0])<1e-10,sameTotalTF:Math.abs(y[2]+y[4]-z[2]-z[4])<1e-10,
   sameTotalInhibitor:Math.abs(y[3]+y[4]+y[5]-z[3]-z[4]-z[5])<1e-10,
   timeDifference:Math.abs(ta-tb),aEvents:a.events.map(e=>e.t),bEvents:b.events.map(e=>e.t)});
 }
}
candidates.sort((a,b)=>b.timeDifference-a.timeDifference);
const out={portTests:checks,witnessesTested:candidates.length,best:candidates[0],
 scope:'Synthetic preparations in a published model; no empirical proof that these states can be prepared in a cell.'};
fs.writeFileSync(path.join(__dirname,'CONNECTOR_TESTS.json'),JSON.stringify(out,null,2));
fs.writeFileSync(path.join(__dirname,'MODEL_CONTRACT.json'),JSON.stringify(C.contract,null,2));
console.log(JSON.stringify(out,null,2));
