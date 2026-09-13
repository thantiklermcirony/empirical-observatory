/* SPDX-License-Identifier: GPL-3.0-only
 * A DOM/canvas stand-in, plus real Node worker threads executing the shipped
 * worker source. This checks interaction logic, NOT browser rendering or CSS.
 */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {Worker:Thread}=require('worker_threads');
const html=fs.readFileSync(path.join(__dirname,'Chlamydomonas_Observatory.html'),'utf8');
const markup=html.slice(0,html.indexOf('<script')),ids=new Map(),elements=[],blobs=new Map();let ctx,lastDownload,uid=0;
const drawContext=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},
 {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
class Element{
 constructor(tag,attrs=''){this.tagName=tag;this.attrs={};this.dataset={};this.children=[];this.handlers={};this.value='';this.textContent='';this.style={};this.hidden=/\bhidden\b/.test(attrs);this.disabled=false;
  for(const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){this.attrs[m[1]]=m[2];if(m[1]==='id')this.id=m[2];if(m[1]==='value')this.value=m[2];if(m[1]==='class')this.className=m[2];if(m[1].startsWith('data-'))this.dataset[m[1].slice(5)]=m[2];}
  elements.push(this);if(this.id)ids.set(this.id,this);
 }
 set innerHTML(v){this._html=v;if(v==='')this.children=[];}
 get innerHTML(){return this._html||'';}
 append(...es){this.children.push(...es);for(const e of es){if(e.id)ids.set(e.id,e);if(this.tagName==='head'&&e.tagName==='script')vm.runInContext(e.textContent,ctx);if(this.tagName==='select'&&!this.value)this.value=e.value;}}
 addEventListener(n,f){this.handlers[n]=f;}
 setAttribute(n,v){this.attrs[n]=v;}
 getBoundingClientRect(){if(this.id==='network'&&ids.get('links').hidden)return {width:0,height:390,left:0,top:0};if(['tank','trace'].includes(this.id)&&ids.get('life').hidden)return {width:0,height:0,left:0,top:0};return {width:800,height:this.id==='trace'?220:this.id==='network'?390:290,left:0,top:0};}
 getContext(){return drawContext;}
 click(){if(this.disabled)return;if(this.href)lastDownload={name:this.download,blob:blobs.get(this.href)};return this.onclick?.();}
}
for(const m of markup.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/g))if(/\bid=|data-pane=|data-demo=/.test(m[2]))new Element(m[1],m[2]);
for(const m of markup.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)){const id=m[1].match(/id="([^"]+)"/)[1],opts=[...m[2].matchAll(/<option([^>]*)>/g)];const pick=opts.find(o=>/selected/.test(o[1]))||opts[0];if(pick)ids.get(id).value=pick[1].match(/value="([^"]*)"/)[1];}
ids.get('schedule').value=markup.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1];
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
for(const s of scripts)if(/id="engine-source"/.test(s[1])){const el=new Element('script','id="engine-source"');el.textContent=s[2];}
class Worker{
 constructor(url){this.dead=false;this.queue=[];const blob=blobs.get(url);blob.text().then(code=>{if(this.dead)return;
  this.thread=new Thread(`const vm=require('vm'),{parentPort}=require('worker_threads');const c=vm.createContext({postMessage:x=>parentPort.postMessage(x),onmessage:null});vm.runInContext(${JSON.stringify(code)},c);parentPort.on('message',x=>c.onmessage({data:x}));`,{eval:true});
  this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',e=>this.onerror?.(e));for(const x of this.queue)this.thread.postMessage(x);});}
 postMessage(x){if(this.thread)this.thread.postMessage(x);else this.queue.push(x);}
 terminate(){this.dead=true;this.thread?.terminate();}
}
const document={getElementById:id=>{if(!ids.has(id))throw Error('Missing HTML id '+id);return ids.get(id);},head:new Element('head'),
 createElement:tag=>new Element(tag),querySelectorAll:q=>{
  if(q==='[data-param]')return ids.get('params').children.filter(x=>x.dataset.param);
  if(q==='.pane')return elements.filter(e=>(e.className||'').split(' ').includes('pane'));
  const key=q.match(/\[data-([\w-]+)\]/)?.[1];return elements.filter(e=>e.dataset[key]!==undefined);
 }};
const frames=[];const window={addEventListener(){}};
ctx=vm.createContext({document,window,Blob,Worker,URL:{createObjectURL:b=>{const key='blob:'+uid++;blobs.set(key,b);return key;},revokeObjectURL:u=>blobs.delete(u)},
 console,setTimeout,clearTimeout,requestAnimationFrame:f=>frames.push(f),devicePixelRatio:1});
async function waitFor(f){const start=Date.now();while(!f()){if(Date.now()-start>15000)throw Error('Interaction timed out: '+ids.get('notice').textContent);await new Promise(r=>setTimeout(r,20));}}
(async()=>{
 for(const s of scripts)if(!/type="text\/plain"/.test(s[1]))vm.runInContext(s[2],ctx);
 const state=()=>window.OrganismLab.state,button=demo=>elements.find(e=>e.dataset.demo===demo);
 const checks=[];
 await waitFor(()=>state().runs.length===1);checks.push('startup computes in a real worker thread');
 button('dose').click();await waitFor(()=>!ids.get('run').disabled);assert.deepEqual(Array.from(state().runs,r=>r.final.descendants),[1,8]);
 for(const id of ['clock','sensor']){button(id).click();await waitFor(()=>!ids.get('run').disabled);assert.equal(state().runs.length,2);assert(Math.abs(state().runs[0].events[0].t-state().runs[1].events[0].t)>1);}
 checks.push('all three parameterized paired quick-plays compute; equal-light run gives 1 vs 8');
 ids.get('play').click();frames.shift()(100);frames.shift()(200);assert(state().currentTime>0&&state().currentTime<48);ids.get('play').click();checks.push('playback changes observed time without rerunning');
 elements.find(e=>e.dataset.pane==='links').click();ids.get('node').value='M';ids.get('node').onchange();assert(ids.get('nodeDetail').innerHTML.includes('M-phase'));checks.push('node inspection');
 button('hidden').click();await waitFor(()=>!ids.get('run').disabled);assert(ids.get('finding').textContent.includes('false lead'));assert(Math.abs(state().runs[0].events[0].t-state().runs[1].events[0].t)<.01);checks.push('rejected numerical lead is shown as rejected');
 button('evidence').click();assert(ids.get('empiricalTable').innerHTML.includes('3679'));assert(ids.get('empiricalSummary').textContent.includes('worse'));checks.push('real-data negative result displayed');
 ids.get('save').click();const saved=await lastDownload.blob.text();assert.equal(JSON.parse(saved).schema,'observatory.organism-run.v1');checks.push('export records actual configuration and results');
 ids.get('file').files=[{size:saved.length,text:async()=>saved}];await ids.get('file').onchange();await waitFor(()=>!ids.get('run').disabled);checks.push('import recalculates instead of trusting stored results');
 ids.get('reset').click();await waitFor(()=>!ids.get('run').disabled);ids.get('mode').value='dark';ids.get('run').click();await waitFor(()=>!ids.get('run').disabled);assert.equal(state().runs[0].final.descendants,1);checks.push('control changes alter the computation');
 ids.get('schedule').value=JSON.stringify([{start:0,end:60,light:1},{start:60,end:720,light:0}]);ids.get('applySchedule').click();await waitFor(()=>!ids.get('run').disabled);assert.equal(state().runs[0].final.dose,60);assert.equal(state().runs[0].final.t,720);checks.push('custom schedule is obeyed');
 ids.get('p_mu').value='-1';ids.get('applyRates').click();assert(ids.get('notice').textContent.includes('Invalid parameter'));checks.push('invalid rates rejected');
 const out={status:'passed',checks,scope:'Node VM interaction logic with a small DOM/canvas stand-in; actual simulation in worker threads. Not real browser/CSS/visual QA.'};
 fs.writeFileSync(path.join(__dirname,'UI_LOGIC_TESTS.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
