import {DEFAULTS,METHODS,validateConfig,extractPowers,chart,Reference,Recovery} from './core.js';
let config={...DEFAULTS},buffer=[],count=0,lastCount=0,calibrating=false,cal={},refs={},engines={},wasValid=false,lastTime=null;
function gap(reason){buffer=[];for(const e of Object.values(engines))e.gap();wasValid=false;lastTime=null;postMessage({type:'quality',valid:false,reason,metrics:{}})}
self.onmessage=({data})=>{
 try{
  if(data.type==='configure'){config=validateConfig(data.config);buffer=[];count=0;lastCount=0;calibrating=false;cal={};refs={};engines={};lastTime=null;wasValid=false;postMessage({type:'configured',config});return}
  if(data.type==='gap'){gap(data.reason);return}
  if(data.type==='calibrate'){if(Object.keys(refs).length)throw Error('Reference already frozen');calibrating=true;cal=Object.fromEntries(Object.keys(METHODS).map(k=>[k,[]]));return}
  if(data.type!=='samples')return;
  for(const row of data.rows){
   if(lastTime!==null&&(row.t<=lastTime||row.t-lastTime>.1))gap('Sample timing discontinuity');
   lastTime=row.t;buffer.push(row);count++;
  }
  const size=config.fs*config.window_s;buffer=buffer.slice(-size);
  if(count-lastCount<config.fs*config.hop_s)return;lastCount=count;
  const result=extractPowers(buffer.map(x=>x.values),config);
  if(!result.valid){if(wasValid)for(const e of Object.values(engines))e.gap();wasValid=false;postMessage({type:'quality',valid:false,reason:result.reason,metrics:{}});return}
  wasValid=true;const t=buffer.at(-1).t,values=Object.fromEntries(Object.keys(METHODS).map(k=>[k,chart(result.powers,k,config)]));
  if(calibrating){
   for(const k of Object.keys(METHODS))cal[k].push(values[k]);
   const n=cal.ilr.length;postMessage({type:'calibration',frames:n,total:Math.ceil(config.calibration_s/config.hop_s)});
   if(n>=Math.max(20,Math.ceil(config.calibration_s/config.hop_s))){
    refs=Object.fromEntries(Object.keys(METHODS).map(k=>[k,new Reference(cal[k],k,config)]));
    engines=Object.fromEntries(Object.keys(METHODS).map(k=>[k,new Recovery(config,refs[k])]));
    calibrating=false;postMessage({type:'reference',references:Object.fromEntries(Object.entries(refs).map(([k,v])=>[k,v.serialize()]))});
   }
  }
  const metrics=Object.fromEntries(Object.entries(engines).map(([k,e])=>[k,e.update(t,values[k])]));
  postMessage({type:'frame',t,valid:true,reason:result.reason,powers:result.powers,metrics,
    raw_preview:buffer.slice(-128).map(row=>row.values),reference_ready:Object.keys(refs).length>0});
 }catch(error){postMessage({type:'error',message:error.message})}
};
