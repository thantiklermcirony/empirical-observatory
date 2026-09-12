import test from 'node:test';
import assert from 'node:assert/strict';
test('streaming worker calibrates all charts, matures histories and invalidates a gap',async()=>{
 const messages=[];globalThis.self={};globalThis.postMessage=data=>messages.push(data);
 await import('../../public/ida/workbench/engine.worker.js');
 const send=data=>self.onmessage({data});send({type:'configure',config:{calibration_s:10}});
 for(let block=0;block<100;block++){
  if(block===9)send({type:'calibrate'});
  const rows=Array.from({length:128},(_,i)=>{const t=(block*128+i)/256;return {t,values:Array.from({length:4},(_,ch)=>10*Math.sin(2*Math.PI*(10+ch*.2)*t)+3*Math.sin(2*Math.PI*6*t)+2*Math.sin(2*Math.PI*19*t)+Math.sin(2*Math.PI*2*t))}});
  send({type:'samples',rows});
 }
 assert.equal(messages.filter(x=>x.type==='error').length,0);
 const reference=messages.find(x=>x.type==='reference');assert.equal(Object.keys(reference.references).length,5);
 const last=messages.filter(x=>x.type==='frame').at(-1);assert.ok(last.metrics.ilr.ready);assert.ok(Number.isFinite(last.metrics.poincare.distance));
 send({type:'gap',reason:'test loss'});assert.equal(messages.at(-1).valid,false);
});
