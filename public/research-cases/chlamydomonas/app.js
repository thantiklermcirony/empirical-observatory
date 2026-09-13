/* SPDX-License-Identifier: GPL-3.0-only */
'use strict';
const $=id=>document.getElementById(id), engineCode=$('engine-source').textContent;
const boot=document.createElement('script');boot.textContent=engineCode;document.head.append(boot);
const O=globalThis.Organism, green='#9be6b2', violet='#c9b5fc', muted='#a6c1b6';
let runs=[],configs=[],labels=['Your experiment'],currentTime=0,playing=false,worker=null,requestId=0,lastFrame=0,activeDemo=null;
let customInitial=null,customParameters=null;
const controls=['mode','hours','volume','lightHours','period','duty','growth','sensor'];
function outputs(){for(const [id,suffix] of [['hours',' h'],['volume',' AV'],['lightHours',' h'],['growth','×'],['sensor','×']])$(id+'Out').textContent=$(id).value+suffix;$('dutyOut').textContent=Math.round(100*+$('duty').value)+'%';}
function configFromUI(){return {mode:$('mode').value,hours:+$('hours').value,volume:+$('volume').value,
 lightHours:+$('lightHours').value,period:$('mode').value==='daynight'?24:+$('period').value,duty:+$('duty').value,
 parameters:customParameters||{mu:O.defaults.mu*+$('growth').value,kDeSkLi:O.defaults.kDeSkLi*+$('sensor').value},
 ...(customInitial?{initial:customInitial}:{}),dt:.03125,sampleEvery:3};}
function setUI(c){for(const id of ['mode','hours','volume','lightHours','period','duty'])if(c[id]!==undefined)$(id).value=c[id];
 $('growth').value=(c.parameters?.mu??O.defaults.mu)/O.defaults.mu;
 $('sensor').value=(c.parameters?.kDeSkLi??O.defaults.kDeSkLi)/O.defaults.kDeSkLi;
 customInitial=c.initial||null;customParameters=c.parameters||null;outputs();fillParameters(O.parameters(c.parameters));}
function fillParameters(p=O.defaults){$('params').innerHTML='';for(const [key,value] of Object.entries(p)){
 const lab=document.createElement('label');lab.htmlFor='p_'+key;lab.textContent=key;
 const input=document.createElement('input');input.id='p_'+key;input.type='number';input.min='0';input.step='any';input.value=value;input.dataset.param=key;
 const info=LAB_DATA.parameters?.find(p=>p.name===key);if(info){input.title=info.unit+' — '+info.meaning+(info.structural_dial?' (changes the model response law)':'');lab.title=input.title;}
 $('params').append(lab,input);}}
function showPane(id){document.querySelectorAll('.pane').forEach(p=>p.hidden=p.id!==id);document.querySelectorAll('[data-pane]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.pane===id)));draw();}
document.querySelectorAll('[data-pane]').forEach(b=>b.onclick=()=>showPane(b.dataset.pane));
function download(value,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function integral(schedule,t){return schedule.reduce((a,s)=>a+s.light*Math.max(0,Math.min(t,s.end)-s.start),0);}
function prepareDisplay(r){
 const points=r.trace.map(s=>({...s}));
 for(const e of r.events){const dose=integral(r.schedule,e.t),L=r.schedule.find(s=>s.start<=e.t&&s.end>=e.t)?.light||0;
   points.push({t:e.t,y:e.parent,generation:e.generation-1,descendants:2**(e.generation-1),light:L,dose,order:0});
   points.push({t:e.t,y:e.daughter,generation:e.generation,descendants:2**e.generation,light:L,dose,order:1});}
 r.display=points.sort((a,b)=>a.t-b.t||(a.order??2)-(b.order??2));return r;
}
function stateAt(r,t){const a=r.display;let lo=0,hi=a.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(a[mid].t<=t+1e-8)lo=mid+1;else hi=mid;}
 const left=a[Math.max(0,lo-1)],right=a[Math.min(a.length-1,lo)];
 const light=r.schedule.find(s=>s.start<=t&&s.end>t)?.light??r.schedule.at(-1).light;
 if(left.generation!==right.generation||right.t<=left.t)return {...left,light};
 const f=Math.max(0,Math.min(1,(t-left.t)/(right.t-left.t)));
 return {...left,t,light,dose:integral(r.schedule,t),y:left.y.map((v,i)=>v+f*(right.y[i]-v))};
}
function requestRun(cs,title='Your experiment',names=['Your experiment'],jump=0){
 playing=false;$('play').textContent='Play';worker?.terminate();requestId++;
 runs=[];currentTime=0;$('save').disabled=true;
 for(const id of ['clock','cellCount','cellVolume','totalVolume','lightDose'])$(id).textContent='—';
 drawTank();drawChart();
 configs=cs.map(c=>({...c,dt:.03125,sampleEvery:3}));labels=names;
 $('run').disabled=true;$('notice').className='';$('notice').textContent='Integrating the cell-cycle equations…';$('runTitle').textContent=title;
 const code=engineCode+'\nonmessage=function(e){try{postMessage({id:e.data.id,runs:e.data.configs.map(c=>Organism.simulate(c))});}catch(err){postMessage({id:e.data.id,error:err.message});}};';
 const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);
 worker.onmessage=e=>{if(e.data.id!==requestId)return;$('run').disabled=false;
   if(e.data.error){$('notice').textContent='Model run rejected: '+e.data.error;$('notice').className='alert';return;}
   runs=e.data.runs.map(prepareDisplay);currentTime=Math.min(jump,runs[0].final.t/60);$('time').max=runs[0].final.t/60;$('time').value=currentTime;
   $('save').disabled=false;
   $('labelA').textContent='A · '+labels[0];$('labelB').textContent=runs[1]?'B · '+labels[1]:'';
   const states=runs.map(r=>r.final.descendants).join(' / ');
   $('notice').textContent='Calculated. Endpoint descendants: '+states+'. Simulation-only prediction.';
   if(activeDemo==='dose')$('finding').textContent=`At 48 h: ${runs[0].final.descendants} versus ${runs[1].final.descendants} descendants. Both received ${runs[0].final.dose/60} h of light and have the same total lineage volume. The timing acts through regulation. This is a model prediction, independently checked numerically—not a measured biological discovery.`;
   if(activeDemo==='hidden')$('finding').textContent=`A false lead caught: a coarse solver suggested a 72.7-minute difference after redistributing a bound pool. At this finer step, first division is ${(runs[0].events[0].t/60).toFixed(3)} versus ${(runs[1].events[0].t/60).toFixed(3)} h. Independent BDF integration also removes the difference. The apparent discovery was numerical error.`;
   draw();worker.terminate();worker=null;
 };
 worker.onerror=e=>{$('run').disabled=false;$('notice').textContent='Worker failed: '+e.message;$('notice').className='alert';};
 worker.postMessage({id:requestId,configs});
}
function reset(){customParameters=null;customInitial=null;activeDemo=null;for(const [id,v] of Object.entries({mode:'daynight',hours:48,volume:1,lightHours:12,period:24,duty:.5,growth:1,sensor:1}))$(id).value=v;outputs();fillParameters();}
$('run').onclick=()=>{activeDemo=null;$('finding').textContent='Your custom intervention. Growth and light-sensing multipliers modify published rate parameters, not measured nutrient or gene doses.';requestRun([configFromUI()]);};
$('reset').onclick=()=>{reset();$('run').click();};
controls.forEach(id=>$(id).addEventListener('input',()=>{customInitial=null;customParameters=null;outputs();$('notice').textContent='Controls changed. Press Run experiment to calculate.';fillParameters(O.parameters({mu:O.defaults.mu*+$('growth').value,kDeSkLi:O.defaults.kDeSkLi*+$('sensor').value}));}));
$('applyRates').onclick=()=>{try{const p={};document.querySelectorAll('[data-param]').forEach(e=>p[e.dataset.param]=e.value===''?NaN:+e.value);customParameters=O.parameters(p);$('run').click();}catch(e){$('notice').textContent=e.message;$('notice').className='alert';}};
$('applySchedule').onclick=()=>{try{const schedule=JSON.parse($('schedule').value);if(!Array.isArray(schedule))throw Error('Expected a segment array');activeDemo=null;$('finding').textContent='Custom ordered illumination segments. Times are in minutes; the schedule sets the horizon. Other rate and initial-state controls are retained.';requestRun([{...configFromUI(),schedule}],'Custom light schedule');}catch(e){$('notice').textContent=e.message;$('notice').className='alert';}};
$('play').onclick=()=>{if(!runs.length)return;if(currentTime>=runs[0].final.t/60)currentTime=0;playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('end').onclick=()=>{if(!runs.length)return;playing=false;currentTime=runs[0].final.t/60;$('play').textContent='Play';draw();};
$('time').oninput=()=>{playing=false;$('play').textContent='Play';currentTime=+$('time').value;draw();};
$('measurement').onchange=draw;
$('save').onclick=()=>{if(!runs.length)return;download({schema:'observatory.organism-run.v1',model:Connectors.contract.model,configurations:configs,labels,
 evidence:'Published model simulation, not a measured experiment',sourceCommit:LAB_DATA.empirical.source_commit,
 results:runs.map(({display,...r})=>r)},'Observatory_Experiment.json');};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{try{const f=$('file').files[0];if(!f)return;if(f.size>20000000)throw Error('Run file is too large');const v=JSON.parse(await f.text());
 if(v.schema!=='observatory.organism-run.v1'||v.model!==Connectors.contract.model||!Array.isArray(v.configurations)||v.configurations.length<1||v.configurations.length>2)throw Error('Unrecognized model/run format');
 for(const c of v.configurations){O.parameters(c.parameters);if(c.initial&&(c.initial.length!==8||c.initial.some(x=>!Number.isFinite(x)||x<0)||c.initial[0]<=0))throw Error('Invalid initial state');}
 activeDemo=null;setUI(v.configurations[0]);showPane('life');$('finding').textContent='Imported configuration. Results are recalculated locally; saved results are not treated as evidence.';requestRun(v.configurations,'Imported experiment',['Imported A','Imported B']);
 }catch(e){$('notice').textContent='Import rejected: '+e.message;$('notice').className='alert';}};
function demo(id){activeDemo=id;showPane(id==='evidence'?'evidence':'life');if(id==='evidence'){$('finding').textContent='A real-data observation-panel test. The added history dial does not improve prediction overall. This is separate from the mechanistic simulation.';return;}
 let cs,names,title,jump=0;
 if(id==='dose'){const p=LAB_DATA.campaign.confirmedContrasts[0];cs=[p.aConfig,p.bConfig];names=['15 min light / 15 min dark','12 h light / 12 h dark'];title='Same light, different family';jump=48;}
 if(id==='clock'){cs=[{mode:'pulse',period:1,duty:.5,hours:48},{mode:'daynight',hours:48}];names=['Hourly flashes','Day / night'];title='The schedule is a dial';jump=14;$('finding').textContent='Same starting cell, same rates, same 24 h of light over 48 h. Changing the pulse schedule changes when the first division occurs. The source model already contains this light-sensitive mechanism.';}
 if(id==='sensor'){cs=[{mode:'daynight',hours:48},{mode:'daynight',hours:48,parameters:{kDeSkLi:O.defaults.kDeSkLi*.5}}];names=['Default light sensitivity','Half light sensitivity'];title='Change what light means';jump=12;$('finding').textContent='Only the starter-kinase light-dependent degradation rate changes. Growth per hour of light is identical. This separates light as a growth input from light as a regulatory signal; it is a parameter intervention, not a calibrated gene edit.';}
 if(id==='hidden'){const w=LAB_DATA.connectors.best;cs=[{initial:w.base,mode:'dark',hours:12},{initial:w.changed,mode:'dark',hours:12}];names=['Original distribution','Redistributed complex'];title='A false discovery, caught';jump=2;}
 setUI({mode:'daynight',hours:48,volume:1,lightHours:12,period:24,duty:.5,...cs[0]});requestRun(cs,title,names,jump);
}
document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>demo(b.dataset.demo));
function canvas(id){const c=$(id),box=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1;if(!box.width)return null;
 if(c.width!==Math.round(box.width*dpr)||c.height!==Math.round(box.height*dpr)){c.width=Math.round(box.width*dpr);c.height=Math.round(box.height*dpr);}
 const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box.width,box.height);return {ctx,w:box.width,h:box.height};}
function cell(ctx,x,y,r,s,color){
 const g=ctx.createRadialGradient(x-r*.3,y-r*.3,1,x,y,r);g.addColorStop(0,'#8dcf9c');g.addColorStop(.5,'#276a53');g.addColorStop(1,'#163e32');
 ctx.beginPath();ctx.ellipse(x,y,r*.9,r,0,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
 ctx.beginPath();ctx.ellipse(x-r*.16,y+r*.05,r*.52,r*.65,-.4,.2,5.8);ctx.strokeStyle='#90bb5d';ctx.lineWidth=Math.max(2,r*.11);ctx.stroke();
 ctx.beginPath();ctx.arc(x+r*.12,y-r*.15,Math.max(2,r*.19),0,Math.PI*2);ctx.fillStyle=`rgba(226,210,124,${Math.min(.95,.2+s.y[7]/s.y[0])})`;ctx.fill();
 ctx.beginPath();ctx.arc(x-r*.6,y-r*.2,Math.max(1.4,r*.08),0,Math.PI*2);ctx.fillStyle='#e78d56';ctx.fill();
 ctx.strokeStyle=color+'aa';ctx.lineWidth=1;
 for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(x+sign*r*.2,y-r*.95);ctx.bezierCurveTo(x+sign*r*.25,y-r*1.55,x+sign*r,y-r*1.65,x+sign*r*.65,y-r*1.9);ctx.stroke();}
}
function drawTank(){const c=canvas('tank');if(!c||!runs.length)return;const {ctx,w,h}=c;
 let commonScale=20;
 for(const r of runs)for(const s of r.trace){const area=w/runs.length,n=Math.min(32,s.descendants),cols=Math.ceil(Math.sqrt(n*area/(h-80))),rows=Math.ceil(n/cols);
   commonScale=Math.min(commonScale,(area-25)/(cols*2.6*Math.cbrt(s.y[0])),(h-76)/(rows*3*Math.cbrt(s.y[0])));}
 for(let j=0;j<runs.length;j++){
  const s=stateAt(runs[j],currentTime*60),area=w/runs.length,x0=area*j,color=j?violet:green;
  const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,s.light?'#203c31':'#081d23');grad.addColorStop(1,'#0b2320');ctx.fillStyle=grad;ctx.fillRect(x0,0,area,h);
  if(j){ctx.strokeStyle='#466159';ctx.beginPath();ctx.moveTo(x0,18);ctx.lineTo(x0,h-18);ctx.stroke();}
  ctx.font='12px system-ui';ctx.fillStyle=color;ctx.fillText((j?'B':'A')+'   '+(s.light?'LIGHT':'DARK'),x0+20,26);
  ctx.fillStyle=muted;ctx.fillText(`${s.descendants.toLocaleString()} descendants · ${s.y[0].toFixed(3)} AV each`,x0+20,h-16);
  const count=Math.min(32,s.descendants),cols=Math.ceil(Math.sqrt(count*area/(h-80))),rows=Math.ceil(count/cols);
  const radius=commonScale*Math.cbrt(s.y[0]);
  for(let k=0;k<count;k++){const row=Math.floor(k/cols),col=k%cols,x=x0+area/2+(col-(cols-1)/2)*Math.min(65,(area-28)/cols),y=h/2+14+(row-(rows-1)/2)*Math.min(60,(h-90)/rows);cell(ctx,x,y,Math.max(2,radius),s,color);}
 }
}
function value(s,key){return key==='volume'?s.y[0]:key==='total'?s.y[0]*s.descendants:key==='count'?s.descendants:s.y[O.names.indexOf(key)]/s.y[0];}
function drawChart(){const c=canvas('trace');if(!c||!runs.length)return;const {ctx,w,h}=c,key=$('measurement').value,p={l:58,r:18,t:20,b:30},W=w-p.l-p.r,H=h-p.t-p.b;
 const maxT=runs[0].final.t,maxY=Math.max(.001,...runs.flatMap(r=>r.display.map(s=>value(s,key))))*1.08;
 const x=t=>p.l+t/maxT*W,y=v=>p.t+H-v/maxY*H;
 for(const seg of runs[0].schedule)if(!seg.light){ctx.fillStyle='#071c20';ctx.fillRect(x(seg.start),p.t,x(seg.end)-x(seg.start),H);}
 ctx.font='11px system-ui';for(let k=0;k<=4;k++){let v=maxY*k/4;ctx.strokeStyle='#2a4540';ctx.beginPath();ctx.moveTo(p.l,y(v));ctx.lineTo(w-p.r,y(v));ctx.stroke();ctx.fillStyle=muted;ctx.textAlign='right';ctx.fillText(v>=100?v.toFixed(0):v.toFixed(v<1?2:1),p.l-7,y(v)+4);}
 ctx.textAlign='center';for(let k=0;k<=4;k++)ctx.fillText((maxT/60*k/4).toFixed(0)+' h',x(maxT*k/4),h-8);
 runs.forEach((r,j)=>{ctx.beginPath();r.display.forEach((s,i)=>{if(i===0)ctx.moveTo(x(s.t),y(value(s,key)));else ctx.lineTo(x(s.t),y(value(s,key)));});ctx.strokeStyle=j?violet:green;ctx.lineWidth=1.8;ctx.stroke();});
 ctx.strokeStyle='#e4eac0';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x(currentTime*60),p.t);ctx.lineTo(x(currentTime*60),h-p.b);ctx.stroke();ctx.setLineDash([]);ctx.textAlign='left';
}
let networkPositions=[];
function drawNetwork(){const c=canvas('network');if(!c)return;const {ctx,w,h}=c,selected=$('node').value;
 networkPositions=O.names.map((id,i)=>{const a=-Math.PI/2+i*Math.PI/4;return {id,x:w/2+Math.cos(a)*Math.min(190,w*.34),y:h/2+Math.sin(a)*140};});
 for(const [from,to] of Connectors.contract.edges){const a=networkPositions.find(n=>n.id===from),b=networkPositions.find(n=>n.id===to),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
  ctx.beginPath();ctx.moveTo(a.x+ux*24,a.y+uy*24);ctx.lineTo(b.x-ux*29,b.y-uy*29);ctx.strokeStyle=from===selected||to===selected?'#7ba98e':'#2e4d43';ctx.lineWidth=from===selected||to===selected?1.6:.7;ctx.stroke();
  const px=b.x-ux*29,py=b.y-uy*29;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-ux*6-uy*3,py-uy*6+ux*3);ctx.lineTo(px-ux*6+uy*3,py-uy*6-ux*3);ctx.closePath();ctx.fillStyle=ctx.strokeStyle;ctx.fill();}
 for(const n of networkPositions){ctx.beginPath();ctx.arc(n.x,n.y,25,0,Math.PI*2);ctx.fillStyle=n.id===selected?'#a7d8b4':'#193c30';ctx.fill();ctx.strokeStyle='#8fb699';ctx.stroke();ctx.fillStyle=n.id===selected?'#092116':'#e1eddf';ctx.textAlign='center';ctx.font='12px system-ui';ctx.fillText(n.id,n.x,n.y+4);}
 ctx.fillStyle=muted;ctx.font='12px system-ui';ctx.fillText('Equation dependencies',w/2,h/2);ctx.fillText('Click a node to inspect',w/2,h/2+20);ctx.textAlign='left';nodeDetail();
}
$('network').onclick=e=>{const box=$('network').getBoundingClientRect(),n=networkPositions.find(n=>Math.hypot(e.clientX-box.left-n.x,e.clientY-box.top-n.y)<30);if(n){$('node').value=n.id;drawNetwork();}};
for(const n of Connectors.contract.nodes){const o=document.createElement('option');o.value=n.id;o.textContent=n.id+' — '+n.label;$('node').append(o);}
function nodeDetail(){const n=Connectors.contract.nodes.find(n=>n.id===$('node').value),s=runs[0]?stateAt(runs[0],currentTime*60):null;
 $('nodeDetail').innerHTML=`<span class="pill">Published model</span><h3 style="margin-top:10px">${n.label}</h3><code>${n.equation}</code><p class="small">${n.note}</p><p>Current amount in A: ${s?s.y[O.names.indexOf(n.id)].toPrecision(5):'—'} ${n.unit}</p>`;}
$('node').onchange=drawNetwork;
function draw(){if(runs.length){const s=stateAt(runs[0],currentTime*60);$('clock').textContent=currentTime.toFixed(1)+' h';$('time').value=currentTime;$('cellCount').textContent=s.descendants.toLocaleString();$('cellVolume').textContent=s.y[0].toFixed(3);$('totalVolume').textContent=(s.y[0]*s.descendants).toFixed(3);$('lightDose').textContent=(s.dose/60).toFixed(1)+' h';}drawTank();drawChart();drawNetwork();}
function animate(ts){if(playing&&runs.length){currentTime+=Math.min(.1,(ts-lastFrame)/1000)*+$('speed').value;if(currentTime>=runs[0].final.t/60){currentTime=runs[0].final.t/60;playing=false;$('play').textContent='Play';}draw();}lastFrame=ts;requestAnimationFrame(animate);}
const em=LAB_DATA.empirical;
$('empiricalTable').innerHTML=em.folds.map(f=>`<tr><td>${f.held_out_experiment_hours} h</td><td>${f.size_time.n}</td><td class="num">${f.size_time.brier.toFixed(4)}</td><td class="num">${f.size_time_history.brier.toFixed(4)}</td></tr>`).join('')+`<tr><th>Combined held-out predictions</th><td>${em.total_eligible}</td><td class="num">${em.overall.size_time.brier.toFixed(4)}</td><td class="num">${em.overall.size_time_history.brier.toFixed(4)}</td></tr>`;
$('empiricalSummary').textContent=`The added history dial made the overall Brier score ${(-em.brier_improvement/em.overall.size_time.brier*100).toFixed(1)}% worse. It helped in two experiments and hurt in two. This test does not support admitting that particular dial as a general improvement.`;
const ext=em.external_protocol;$('externalSummary').textContent=`Different-protocol check: ${ext.eligible_rows} eligible cells. Brier score ${ext.size_time.brier.toFixed(4)} → ${ext.size_time_history.brier.toFixed(4)} with history, but log loss ${ext.size_time.log_loss.toFixed(4)} → ${ext.size_time_history.log_loss.toFixed(4)} (worse). The mixed result does not reverse the conclusion.`;
$('testline').innerHTML=`<span><b>${LAB_DATA.campaign.successful.toLocaleString()}</b> parameter combinations</span><span><b>${em.total_eligible.toLocaleString()}</b> held-out cell records</span><span><b>${LAB_DATA.numerical.results.length}</b> independent solver cases</span><span><b>${LAB_DATA.refinement.divisionCountChanged}</b> counts changed on grid refinement</span>`;
window.OrganismLab={get state(){return {configs,runs,currentTime,activeDemo};},run:c=>requestRun([c]),demo,contract:Connectors.contract};
window.addEventListener('resize',draw);fillParameters();outputs();requestAnimationFrame(animate);
requestRun([configFromUI()],'12-hour day / 12-hour night');
