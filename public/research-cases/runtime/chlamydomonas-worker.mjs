// SPDX-License-Identifier: GPL-3.0-only
import '../chlamydomonas/engine.js';
import {runCase} from './chlamydomonas-runner.mjs';
import {sha256} from './case-core.mjs';
let busy=false;
self.onmessage=async event=>{
  if(busy)return;busy=true;
  try{
    const read=async path=>{const response=await fetch(new URL('../chlamydomonas/'+path,import.meta.url),{cache:'no-cache'});if(!response.ok)throw Error('Source unavailable: '+path);return new Uint8Array(await response.arrayBuffer());};
    const provenance=JSON.parse(new TextDecoder().decode(await read('source-provenance.json')));
    if(await sha256(await read('engine.js'))!==provenance.assets['engine.js'])throw Error('Numerical source hash mismatch.');
    const runtimeAssets={};for(const file of ['case-core.mjs','chlamydomonas-runner.mjs','chlamydomonas-worker.mjs']){const r=await fetch(new URL(file,import.meta.url),{cache:'no-cache'});if(!r.ok)throw Error('Runtime source unavailable');runtimeAssets[file]=await sha256(new Uint8Array(await r.arrayBuffer()));}
    const result=await runCase(event.data,{model:globalThis.Organism,read,provenance:{...provenance,runtimeAssets},onProgress:message=>self.postMessage({type:'progress',message})});self.postMessage({type:'result',result});
  }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:'Case execution failed.'});}finally{busy=false;}
};
