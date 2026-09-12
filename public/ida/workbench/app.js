import {MuseClient} from './vendor/muse-js.bundle.mjs';
import {DEFAULTS,METHODS,CHANNELS,validateConfig,gate,PacketAssembler} from './core.js';
import {Archive} from './archive.js';
import {ExperimentSpace} from './vr.js';
import {Bridge} from './bridge.js';
import {parseCSV} from './csv.js';
import {cueAt} from './cues.js';

const $=id=>document.getElementById(id),clientId=crypto.randomUUID();
const archive=new Archive(),worker=new Worker(new URL('./engine.worker.js',import.meta.url),{type:'module'});
let config={...DEFAULTS},running=false,source='simulator',valid=false,referenceReady=false,calibrating=false,metrics={},history=[];
let muse=null,subscriptions=[],sampleTimer=null,runStart=0,sampleCount=0,simIndex=0,replay=null,replayIndex=0,lastReceipt=0,lastStatus=0,lastFlush=0;
let experiment=null,expStart=0,phase='idle',trial=null,trials=[],nextTrial=0,difficulty=.35,lastPolicy=0,goodStreak=0,runManifest=null;
let videos=null,videoSource=null,videoProjection='flat',videoBlob=null,remoteState=null,presentedId=null,stopping=false,toastTimer=null,rngState=17;
let catalogue=[],qualityReason='Waiting for input',storageFault=false,visibilityInterrupted=false;
let starting=false;
let activeVideoManifest=null,videoCue=null,lastVideoClock=-1;

let taskSeed=17;
function taskRandom(){taskSeed=(Math.imul(1664525,taskSeed)+1013904223)>>>0;return taskSeed/4294967296}
function random(){rngState=(Math.imul(1664525,rngState)+1013904223)>>>0;return rngState/4294967296}
function normal(){return Math.sqrt(-2*Math.log(Math.max(1e-9,random())))*Math.cos(2*Math.PI*random())}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',6500);$('status-message').textContent=text}
function fail(error){console.error(error);toast(error.message||String(error))}
function event(type,data={}){archive.add(type,{run_s:running?(performance.now()-runStart)/1000:null,...data})}
function download(name,data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function page(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===id));$('page-label').textContent=document.querySelector(`[data-page="${id}"]`)?.textContent.trim()||id;if(id==='sessions')renderSessions().catch(fail);if(id==='workbench')space.resize()}
document.querySelectorAll('.nav').forEach(button=>button.onclick=()=>page(button.dataset.page));

const bridge=new Bridge(onPeer,(state,role)=>{
 $('bridge-status').textContent=`${state} · ${role||'unlinked'}`;
 if(state==='disconnected'||state==='failed'){remoteState=null;space.setTrial(null,'idle');if(running&&experiment){endExperiment('peer disconnected');toast('Peer disconnected. Challenge stopped.')}}
 updateUI();
});
let space;
try{space=new ExperimentSpace($('scene'),respond,onAnimation,(type,data)=>{
 if(type==='video_frame'){
  const cue=cueAt(activeVideoManifest,data.media_time);
  if(cue?.id!==videoCue?.id){videoCue=cue;event('video_cue',{cue,clock:data,stimulus_id:activeVideoManifest?.id})}
  if(Math.abs(data.media_time-lastVideoClock)>=.5){lastVideoClock=data.media_time;event(type,data)}
 }else event(type,data);
 if(type==='xr_end'){$('xr-state').textContent='Desktop preview';$('enter-vr').textContent='Enter VR ↗'}
 if(type==='xr_start'){$('xr-state').textContent='Immersive VR';$('enter-vr').textContent='Exit VR'}
 if(type==='video_error')toast('Video failed. Check format, URL and CORS permissions.');
 if(bridge.role==='viewer'&&bridge.connected)bridge.send({type:'viewer_event',kind:type,data,client_id:clientId,client_ms:performance.now()});
})}catch(error){fail(Error('WebGL could not start: '+error.message));space={resize(){},setTrial(){},supportsVR:async()=>false,enterVR:async()=>{throw Error('WebGL unavailable')},clearVideo(){}}}

function isViewer(){return bridge.connected&&bridge.role==='viewer'}
function selectedMetric(){return isViewer()?remoteState?.metrics?.[remoteState?.config?.method]:metrics[config.method]}
function stats(){
 const closed=trials.filter(t=>t.closed),targets=closed.filter(t=>t.target),non=closed.filter(t=>!t.target),rts=targets.filter(t=>t.response&&t.rt_ms!==null).map(t=>t.rt_ms).sort((a,b)=>a-b);
 return {trials:closed.length,targets:targets.length,hits:targets.filter(t=>t.response).length,false_alarms:non.filter(t=>t.response).length,nontargets:non.length,median_rt_ms:rts.length?rts[Math.floor(rts.length/2)]:null};
}
function receiveSamples(rows){
 if(!running||visibilityInterrupted)return;
 lastReceipt=performance.now();sampleCount+=rows.length;
 archive.add('raw_eeg',{source,fs:config.fs,clock:source==='muse'?'upstream reconstructed sample timestamp; receipt separately logged':'source-relative seconds',rows});
 worker.postMessage({type:'samples',rows});
}
function signalGap(reason,details={}){valid=false;metrics={};qualityReason=reason;worker.postMessage({type:'gap',reason});event('signal_gap',{reason,...details});goodStreak=0}

async function start(){
 if(running||starting||stopping||isViewer())return;
 source=$('source').value;
 if(source==='replay'&&!replay)throw Error('Import a raw CSV under Devices first.');
 if(source==='muse'&&!navigator.bluetooth)throw Error('Web Bluetooth is unavailable in this browser. Try desktop Chrome/Edge or use a separate capture device.');
 starting=true;$('start').disabled=true;let connectedClient=null;
 try{
  // connect() invokes the browser chooser from the user's click, before storage awaits.
  if(source==='muse'){connectedClient=new MuseClient();await connectedClient.connect();config=validateConfig({...config,fs:256});$('dial-fs').value='256'}
  await archive.open();
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(config))))).map(v=>v.toString(16).padStart(2,'0')).join('');
  runManifest={id:crypto.randomUUID(),schema:'ida-lab-session/1',created_ms:Date.now(),state:'running',version:'0.1.0',source,synthetic:source==='simulator',config:{...config},config_sha256:fingerprint,device:connectedClient?.deviceName||null,channels:CHANNELS,feature_bands_hz:[[1,4],[4,8],[8,13],[13,30]],clock:'performance.now per browser; Muse timestamps reconstructed upstream',timing_limit:'Browser frame callback is not measured photon onset',replay:source==='replay'?replay.metadata:null};
  await archive.start(runManifest);worker.postMessage({type:'configure',config});taskSeed=config.seed;
  $('reference-state').textContent='No reference recorded';$('calibration-progress').style.width='0%';
  running=true;storageFault=false;stopping=false;visibilityInterrupted=false;referenceReady=false;calibrating=false;metrics={};history=[];valid=false;qualityReason='Warming up signal window';
  runStart=performance.now();lastReceipt=runStart;sampleCount=0;simIndex=0;replayIndex=0;rngState=config.seed;trials=[];experiment=null;phase='idle';trial=null;difficulty=Math.min(.35,config.max_difficulty);goodStreak=0;lastFlush=runStart;
  event('run_start',{manifest:runManifest});
  if(source==='muse'){
   muse=connectedClient;const assembler=new PacketAssembler(receiveSamples,details=>signalGap(details.reason,details));
   subscriptions.push(muse.eegReadings.subscribe({next:r=>assembler.push(r),error:e=>{signalGap(e.message);stop().catch(fail)}}));
   subscriptions.push(muse.telemetryData.subscribe(t=>event('telemetry',{data:t})));
   subscriptions.push(muse.accelerometerData.subscribe(t=>event('accelerometer',{data:t})));
   subscriptions.push(muse.gyroscopeData.subscribe(t=>event('gyroscope',{data:t})));
   subscriptions.push(muse.connectionStatus.subscribe(connected=>{if(!connected&&running){signalGap('Muse disconnected');stop().catch(fail)}}));
   await muse.start();
  }
  sampleTimer=setInterval(acquisitionTick,50);toast(source==='simulator'?'Synthetic acquisition started. No human data.':'Acquisition started.');updateUI();
 }catch(error){connectedClient?.disconnect();if(running)await stop();throw error}finally{starting=false;$('start').disabled=running||stopping||isViewer()}
}
function acquisitionTick(){
 if(!running)return;const now=performance.now();
 if(source==='simulator'){
  const n=Math.min(config.fs,Math.floor((now-runStart)/1000*config.fs)-simIndex),rows=[];
  for(let j=0;j<n;j++){
   const t=simIndex++/config.fs,load=['maintain','switch'].includes(phase)?difficulty:0;
   const values=CHANNELS.map((_,i)=>(10-5*load)*Math.sin(2*Math.PI*(10+i*.15)*t+i*.4)+(3+5*load)*Math.sin(2*Math.PI*6*t+i*.2)+2*Math.sin(2*Math.PI*19*t)+(3+load)*normal());
   rows.push({t,values});
  }
  if(rows.length)receiveSamples(rows);
 }else if(source==='replay'){
  const rows=[];while(replayIndex<replay.rows.length&&replay.rows[replayIndex].t<=(now-runStart)/1000)rows.push(replay.rows[replayIndex++]);
  if(rows.length)receiveSamples(rows);
  if(replayIndex>=replay.rows.length){toast('Replay complete.');stop().catch(fail)}
 }
 if(now-lastReceipt>1200&&valid)signalGap('Raw signal has stalled');
 if(now-lastFlush>1000){lastFlush=now;archive.flush().catch(storageError)}
}
async function storageError(error){if(storageFault)return;storageFault=true;toast('Recording storage failed. Acquisition is stopping: '+error.message);await stop().catch(()=>{})}
async function stop(){
 if(!running||stopping)return;stopping=true;endExperiment('acquisition stopped');event('run_end',{statistics:stats(),samples:sampleCount});
 running=false;clearInterval(sampleTimer);sampleTimer=null;for(const s of subscriptions)s.unsubscribe();subscriptions=[];
 if(muse){muse.disconnect();muse=null}calibrating=false;phase='idle';
 try{await archive.finish({statistics:stats(),samples:sampleCount,feature_frames:history.length,duration_s:(performance.now()-runStart)/1000,storage_fault:storageFault,interpretation:'exploratory signal geometry'})}finally{stopping=false;updateUI()}
 toast('Run saved to the local session archive.');bridge.send({type:'state',state:stateForPeer()});
}
worker.onmessage=({data})=>{
 if(!running)return;
 if(data.type==='error'){signalGap(data.message);fail(Error(data.message));return}
 if(data.type==='quality'){valid=false;qualityReason=data.reason;metrics={};updateUI();return}
 if(data.type==='calibration'){$('calibration-progress').style.width=`${100*data.frames/data.total}%`;$('reference-state').textContent=`Collecting ${data.frames} / ${data.total} valid frames`;return}
 if(data.type==='reference'){referenceReady=true;calibrating=false;event('reference_frozen',{references:data.references,context:'operator-declared rest',calibration_tolerance:'within-fit; independent validation required'});$('reference-state').textContent='Reference frozen for this run';toast('Reference frozen. Choose a protocol under Experiments.');return}
 if(data.type==='frame'){
  valid=data.valid;qualityReason=data.reason;metrics=data.metrics;
  event('features',{signal_t:data.t,phase,powers:data.powers,metrics,config_sha256:runManifest.config_sha256});
  if(Object.keys(metrics).length){history.push({t:data.t,metrics,phase});if(history.length>7200)history.shift()}
  updateUI();
 }
};

function beginExperiment(id){
 if(!running||!referenceReady)throw Error('Start a source and freeze a reference first.');
 if(source==='replay')throw Error('Historical EEG cannot be paired with a new live challenge.');
 if(experiment)throw Error('End the current challenge first.');
 const item=catalogue.find(x=>x.id===id);if(!item)throw Error('Unknown protocol');
 if(item.kind!=='targets')throw Error('This runner supports target protocols; other kinds need an adapter.');
 space.clearVideo();experiment=item;expStart=performance.now();phase='pending';trials=[];trial=null;nextTrial=expStart;presentedId=null;
 event('experiment_start',{protocol:item,policy:config.policy});page('workbench');toast(item.name+' started.');
}
function closeTrial(){if(trial){trial.closed=true;event('trial_result',{trial:{...trial}});trial=null;presentedId=null}}
function endExperiment(reason='operator ended'){if(!experiment)return;closeTrial();event('experiment_end',{id:experiment.id,reason,statistics:stats()});experiment=null;phase='idle';space.setTrial(null,phase);bridge.send({type:'state',state:stateForPeer()});updateUI()}
function tickExperiment(now){
 if(!experiment||!running)return;
 let elapsed=(now-expStart)/1000,total=0,nextPhase=null;
 for(const part of experiment.phases){total+=part.seconds;if(elapsed<total){nextPhase=part.name;break}}
 if(!nextPhase){endExperiment('protocol complete');toast('Protocol complete. Stop acquisition to finalize the run.');return}
 if(nextPhase!==phase){closeTrial();phase=nextPhase;nextTrial=now+500;event('phase',{phase});bridge.send({type:'state',state:stateForPeer()})}
 if(trial&&now>=trial.deadline_ms)closeTrial();
 if(!['maintain','switch'].includes(phase))return;
 if(config.policy==='residue_gated'&&now-lastPolicy>=5000){
  lastPolicy=now;const decision=gate(metrics[config.method],valid);goodStreak=decision.decision==='advance'?goodStreak+1:0;const old=difficulty;
  if(!valid)difficulty=.1;else if(decision.decision==='reduce')difficulty=Math.max(.1,difficulty-.05);else if(goodStreak>=3)difficulty=Math.min(config.max_difficulty,difficulty+.025);
  if(old!==difficulty)event('policy_update',{old,new:difficulty,gate:decision,threshold_status:'prototype dials, unvalidated'});
 }
 if(now>=nextTrial){
  closeTrial();const id=trials.length+1,rule=phase==='switch'&&Math.floor((id-1)/4)%2?'amber':'teal',color=taskRandom()<.5?'teal':'amber',interval=(3-difficulty*1.5)*1000;
  trial={id,color,rule,target:color===rule,phase,scheduled_ms:now,deadline_ms:now+interval*.8,presentations:{},response:false,rt_ms:null,closed:false};trials.push(trial);nextTrial=now+interval;event('trial_scheduled',{trial:{...trial}});bridge.send({type:'state',state:stateForPeer()});
 }
}
function recordPresentation(id,who,ms){if(trial?.id===id&&!trial.presentations[who]){trial.presentations[who]=ms;event('stimulus_presented',{trial_id:id,client_id:who,client_ms:ms,timing:'after renderer submission; not physical photon onset'})}}
function responseRecord(id,who,ms){
 if(!trial||trial.id!==id||trial.response)return;
 const start=trial.presentations[who];const rt=Number.isFinite(start)&&Number.isFinite(ms)&&ms>=start&&ms-start<10000?ms-start:null;
 trial.response=true;trial.rt_ms=rt;trial.response_client=who;event('response',{trial_id:id,client_id:who,client_ms:ms,rt_ms:rt});updateUI();
}
function respond(){
 if(bridge.connected&&bridge.role==='capture')return;
 const active=isViewer()?remoteState?.trial:trial;if(!active)return;
 if(isViewer())bridge.send({type:'response',trial_id:active.id,client_id:clientId,client_ms:performance.now()});
 else responseRecord(active.id,clientId,performance.now());
}
function onAnimation(now,stage){
 if(stage==='before'){
  if(!isViewer())tickExperiment(now);
  const current=isViewer()?remoteState?.trial:trial,p=isViewer()?remoteState?.phase||'idle':phase;space?.setTrial(current,p,isViewer());
 }else{
  const active=isViewer()?remoteState?.trial:trial;
  if(active&&presentedId!==active.id){presentedId=active.id;if(isViewer())bridge.send({type:'presented',trial_id:active.id,client_id:clientId,client_ms:performance.now()});else recordPresentation(active.id,clientId,performance.now())}
  if(!active)presentedId=null;
  if(now-lastStatus>250){lastStatus=now;updateUI();if(running&&bridge.role==='capture')bridge.send({type:'state',state:stateForPeer()})}
 }
}
function stateForPeer(){return {running,source,phase,trial:trial?{id:trial.id,color:trial.color,rule:trial.rule,phase:trial.phase}:null,metrics,config,valid,statistics:stats(),referenceReady,run_id:runManifest?.id}}
function onPeer(message){
 if(message.type==='state'&&bridge.role==='viewer'){
  if(remoteState?.trial?.id!==message.state.trial?.id)presentedId=null;remoteState=message.state;updateUI();
 }else if(message.type==='presented'&&bridge.role==='capture')recordPresentation(message.trial_id,message.client_id,message.client_ms);
 else if(message.type==='response'&&bridge.role==='capture')responseRecord(message.trial_id,message.client_id,message.client_ms);
 else if(message.type==='viewer_event'&&bridge.role==='capture')event('viewer_event',message);
 else if(message.type==='pong')event('peer_timing',{round_trip_ms:performance.now()-message.sent,remote_ms:message.remote,note:'RTT only; no hardware clock lock'});
}

function updateUI(){
 const viewer=isViewer(),state=viewer?remoteState:null,m=selectedMetric(),all=viewer?state?.metrics||{}:metrics,ok=viewer?state?.valid:valid;
 const g=gate(m,ok),currentPhase=viewer?state?.phase||'idle':phase,currentTrial=viewer?state?.trial:trial;
 $('connection-badge').textContent=viewer?'↔ Linked viewer':running?'● '+(source==='muse'?'Muse Bluetooth':source==='simulator'?'Synthetic input':'CSV replay'):'○ Not connected';
 $('source-title').textContent=viewer?'Linked experiment':source==='muse'?'Direct Muse capture':source==='replay'?'Historical replay':'Synthetic sandbox';
 $('source-description').textContent=source==='simulator'&&!viewer?'Known generated data. No human inference.':'Signal geometry, with source and timing provenance.';
 $('start').disabled=running||viewer;$('stop').disabled=!running;$('source').disabled=running||viewer;
 $('calibrate').disabled=!running||!valid||calibrating||referenceReady||viewer;
 $('apply-dials').disabled=running||viewer;
 document.querySelectorAll('.dial-grid input,.dial-grid select').forEach(e=>e.disabled=running||viewer);
 $('signal-state').textContent=viewer?(ok?'Linked feature stream':'Linked signal unavailable'):`${qualityReason}${sampleCount?' · '+sampleCount.toLocaleString()+' samples':''}`;
 $('electrodes').classList.toggle('good',!!ok);
 $('phase-pill').textContent=(currentPhase==='idle'?'READY':currentPhase).toUpperCase();
 $('gate-decision').textContent=g.decision.toUpperCase();$('gate-reason').textContent=g.reason;
 $('distance').textContent=m?m.distance.toFixed(2):'—';$('residue').textContent=m?m.residue.toFixed(2):'—';
 const ret=m?.return?.[5];$('return').textContent=ret===null||ret===undefined?'—':(ret>=0?'+':'')+ret.toFixed(3);
 const st=viewer?state?.statistics:stats();$('performance').textContent=st?.targets?`${st.hits}/${st.targets}`:'—';$('performance-detail').textContent=st?.trials?`${st.false_alarms} false alarms · ${st.median_rt_ms===null?'RT unavailable':Math.round(st.median_rt_ms)+' ms median RT'}`:'No scored trials yet';
 $('scene-instruction').textContent=currentTrial?`Respond to ${currentTrial.rule.toUpperCase()}`:currentPhase==='recovery'?'Return to the reference context.':currentPhase==='baseline'?'Eyes open. Let the reference settle.':'A quiet space to begin.';
 $('scene-subtitle').textContent=currentTrial?'Space, click or trigger when the target matches.':viewer?'Live experiment from the capture device.':'Start a source, freeze a reference, then introduce a challenge.';
 $('models').replaceChildren();
 for(const [key,info]of Object.entries(METHODS)){
  const row=document.createElement('div');row.className='model-row'+(key===(state?.config?.method||config.method)?' selected':'');
  const name=document.createElement('span');name.textContent=info.name;const small=document.createElement('small');small.textContent=info.family;name.append(small);
  const d=document.createElement('span');d.textContent=all[key]?all[key].distance.toFixed(2):'—';
  const r=document.createElement('span');r.textContent=all[key]?all[key].residue.toFixed(2):'—';row.append(name,d,r);row.title=info.note+' Columns: distance, residue.';$('models').append(row);
 }
 drawHistory();
}
function drawHistory(){
 const canvas=$('history-chart'),rect=canvas.getBoundingClientRect();if(!rect.width)return;const dpr=Math.min(devicePixelRatio,2);canvas.width=rect.width*dpr;canvas.height=160*dpr;
 const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const w=rect.width,h=160;ctx.clearRect(0,0,w,h);
 ctx.strokeStyle='#293b46';ctx.lineWidth=1;for(let i=0;i<4;i++){const y=10+i*40;ctx.beginPath();ctx.moveTo(28,y);ctx.lineTo(w,y);ctx.stroke()}
 const rows=history.slice(-240).filter(row=>row.metrics[config.method]);if(rows.length<2){ctx.fillStyle='#6d8492';ctx.font='11px sans-serif';ctx.fillText('The trace begins after reference calibration.',30,80);return}
 const max=Math.max(1,...rows.map(x=>Math.max(x.metrics[config.method].distance,x.metrics[config.method].residue)));const start=rows[0].t,end=rows.at(-1).t;
 for(const [key,color]of [['distance','#b6e9c9'],['residue','#e6b478']]){
  ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.beginPath();rows.forEach((row,i)=>{const x=28+(row.t-start)/(end-start)*(w-35),y=140-row.metrics[config.method][key]/max*125;
   if(!i||row.metrics[config.method].segment!==rows[i-1].metrics[config.method].segment)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();
 }
 ctx.fillStyle='#6d8492';ctx.font='9px monospace';ctx.fillText(max.toFixed(1),0,15);ctx.fillText('0',8,143);ctx.fillText(`${Math.round(start)} s`,28,157);ctx.fillText(`${Math.round(end)} s`,w-38,157);
}
async function renderSessions(){
 const runs=await archive.list();$('session-list').replaceChildren();
 if(!runs.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No sessions yet. Your first run starts the archive.';$('session-list').append(empty);return}
 for(const run of runs){const row=document.createElement('article');row.className='session-row';const text=document.createElement('div'),title=document.createElement('strong'),sub=document.createElement('small');
  title.textContent=`${new Date(run.created_ms).toLocaleString()} · ${run.source}`;sub.textContent=`${run.state} · ${run.config.method} · half-life ${run.config.half_life_s}s · ${run.id.slice(0,8)}`;text.append(title,sub);
  const button=document.createElement('button');button.className='button secondary';button.textContent='Export session';button.disabled=run.state==='running'&&running;
  button.onclick=()=>archive.export(run.id).then(data=>download(`ida-${run.id}.json`,data)).catch(fail);row.append(text,button);$('session-list').append(row);
 }
}
function renderCatalogue(){
 $('experiment-list').replaceChildren();for(const item of catalogue){const card=document.createElement('article');card.className='experiment-card';
  const label=document.createElement('div');label.className='eyebrow';label.textContent='PROTOCOL / '+item.id;
  const title=document.createElement('h2');title.textContent=item.name;const p=document.createElement('p');p.textContent=item.description;
  const phases=document.createElement('div');phases.className='phase-list';for(const phase of item.phases){const span=document.createElement('span');span.textContent=phase.name+' · '+phase.seconds+'s';phases.append(span)}
  const button=document.createElement('button');button.className='button primary';button.textContent='Run experiment ↗';button.onclick=()=>{try{beginExperiment(item.id)}catch(e){fail(e)}};
  const note=document.createElement('p');note.className='micro';note.textContent=item.status;card.append(label,title,p,phases,button,note);$('experiment-list').append(card);
 }
}
async function capabilities(){
 const xr=await space.supportsVR(),bluetooth=!!navigator.bluetooth;
 const entries=[['DIRECT BLUETOOTH',bluetooth?'API available':'Not available',bluetooth?'A physical Muse connection still needs verification.':'Use a compatible capture browser and pair its viewer.'],['IMMERSIVE VR',xr?'Headset available':'Desktop preview',xr?'WebXR session can be requested from Enter VR.':'WebXR requires a compatible device/browser and HTTPS.'],['DEVICE LINK',typeof RTCPeerConnection!=='undefined'?'WebRTC available':'Unavailable','Manual signaling; same-network connectivity is experimental.']];
 $('capabilities').replaceChildren();for(const [name,status,note]of entries){const el=document.createElement('div'),label=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');label.className='eyebrow';label.textContent=name;strong.textContent=status;small.textContent=note;el.append(label,strong,small);$('capabilities').append(el)}
 $('xr-state').textContent=xr?'WebXR available':'Desktop preview';
}

$('start').onclick=()=>start().catch(fail);$('stop').onclick=()=>stop().catch(fail);
$('calibrate').onclick=()=>{if(!running||!valid||referenceReady)return;calibrating=true;worker.postMessage({type:'calibrate'});event('calibration_start',{context:'operator-declared eyes-open still reference'});$('reference-state').textContent='Collecting valid reference windows…';updateUI()};
$('stop-experiment').textContent='End challenge / video';$('stop-experiment').onclick=()=>{endExperiment();if(space.video){space.clearVideo();event('video_stop',{reason:'participant button'})}};$('enter-vr').onclick=()=>space.enterVR().catch(fail);
$('scene').addEventListener('click',respond);window.addEventListener('keydown',event=>{if(event.code==='Space'&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)){event.preventDefault();respond()}if(event.code==='Escape'&&experiment)endExperiment('escape')});
$('apply-dials').onclick=()=>{try{config=validateConfig({...config,method:$('dial-method').value,policy:$('dial-policy').value,half_life_s:Number($('dial-half-life').value),curvature:Number($('dial-curvature').value),embedding_scale:Number($('dial-scale').value),calibration_s:Number($('dial-calibration').value),fs:Number($('dial-fs').value),seed:Number($('dial-seed').value)});$('dial-state').textContent='Saved for the next run';$('calibrate').textContent=`Collect reference · ${config.calibration_s} s`;toast('Dials saved. New run, new configuration.')}catch(e){fail(e)}};
$('dial-half-life').oninput=()=>$('half-life-label').textContent=$('dial-half-life').value+' s';$('dial-curvature').oninput=()=>$('curvature-label').textContent=Number($('dial-curvature').value).toFixed(2);
$('refresh-sessions').onclick=()=>renderSessions().catch(fail);
$('csv-file').onchange=async()=>{try{if(running)throw Error('Stop acquisition before importing');const file=$('csv-file').files[0];if(!file)return;replay=parseCSV(await file.text(),config.fs);$('csv-status').textContent=`${replay.metadata.samples.toLocaleString()} samples · ${replay.metadata.duration_s.toFixed(1)} s · select Raw CSV replay in the workbench`;$('source').value='replay';toast('Raw recording imported locally.')}catch(e){fail(e)}};
$('video-file').onchange=()=>{const file=$('video-file').files[0];if(!file)return;if(videoBlob)URL.revokeObjectURL(videoBlob);videoBlob=URL.createObjectURL(file);videoSource=videoBlob;videos={title:file.name,local:true,size:file.size};$('video-status').textContent=file.name};
$('load-video-url').onclick=()=>{try{const url=new URL($('video-url').value);if(url.protocol!=='https:')throw Error('Use an HTTPS media URL');videoSource=url.href;videos={title:url.pathname.split('/').at(-1),local:false,url:url.href};$('video-status').textContent='Hosted video ready. Press Play.'}catch(e){fail(e)}};
$('play-video').onclick=async()=>{try{if(!videoSource)throw Error('Choose a local video or load an HTTPS URL');if(experiment)throw Error('End the challenge before changing its stimulus');activeVideoManifest=videos?.manifest?await fetch(videos.manifest).then(r=>{if(!r.ok)throw Error('Stimulus timeline unavailable');return r.json()}):null;videoCue=null;lastVideoClock=-1;videoProjection=$('video-mode').value;await space.playVideo(videoSource,videoProjection);event('video_start',{media:videos,projection:videoProjection,manifest:activeVideoManifest});page('workbench');toast('Video playing. Use Enter VR for immersive output.')}catch(e){fail(e)}};
$('clear-video').onclick=()=>{space.clearVideo();event('video_clear',{});$('video-status').textContent='Playback cleared'};
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&space.video){space.clearVideo();event('video_stop',{reason:'participant escape'});return}
 if(!space.video||space.video.paused||!/^[1-9]$/.test(e.key)||e.repeat||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
 const cue=cueAt(activeVideoManifest,space.video.currentTime);if(cue?.kind==='rating'){if(!running){toast('Ratings need an active recording to be saved.');return}event('video_rating',{cue_id:cue.id,question:cue.question,section:cue.section,value:Number(e.key),media_time:space.video.currentTime});toast('Rating recorded: '+e.key)}
});
$('create-offer').onclick=()=>bridge.offer().then(text=>{$('local-description').value=text}).catch(fail);
$('accept-offer').onclick=async()=>{try{if(running)throw Error('Stop capture before becoming a viewer');$('local-description').value=await bridge.answer($('remote-description').value)}catch(e){fail(e)}};
$('accept-answer').onclick=()=>bridge.accept($('remote-description').value).catch(fail);
$('copy-description').onclick=()=>navigator.clipboard.writeText($('local-description').value).then(()=>toast('Description copied.')).catch(fail);
$('disconnect-peer').onclick=()=>{bridge.close();remoteState=null;$('bridge-status').textContent='Disconnected';updateUI()};
document.addEventListener('visibilitychange',()=>{if(running&&document.hidden&&!space.renderer?.xr.isPresenting){visibilityInterrupted=true;signalGap('Page backgrounded; capture paused');endExperiment('page backgrounded')}else if(running&&visibilityInterrupted){visibilityInterrupted=false;signalGap('Capture resumed after visibility gap')}});
window.addEventListener('beforeunload',e=>{if(running||starting||stopping){e.preventDefault();e.returnValue='Recording or archive save is active.'}});

await Promise.all([archive.open().catch(error=>toast('Local storage unavailable: '+error.message)),fetch('./experiments.json').then(r=>r.json()).then(data=>{catalogue=data;renderCatalogue()}),fetch('./videos.json').then(r=>r.json()).then(data=>{
 for(const item of data.items){const card=document.createElement('article');card.className='experiment-card';const title=document.createElement('h2');title.textContent=item.title;const btn=document.createElement('button');btn.className='button secondary';btn.textContent='Select video';btn.onclick=()=>{const url=new URL(item.url,location.href);if(url.protocol!=='https:'&&url.origin!==location.origin)return toast('HTTPS media required');videoSource=url.href;videos=item;$('video-mode').value=item.projection;$('video-status').textContent=item.title};const note=document.createElement('p');note.textContent=[item.status,item.license].filter(Boolean).join(' · ');card.append(title,note,btn);$('video-catalogue').append(card)}
 if(!data.items.length)$('video-catalogue').textContent='Your catalogue is empty. Add licensed media entries to videos.json.';
}),capabilities()]);
updateUI();
