// Pure browser/worker research kernel. No DOM, Bluetooth, storage, or inference labels.
export const CHANNELS=['TP9','AF7','AF8','TP10'];
export const METHODS={
 native_alpha:{name:'Native alpha',family:'Comparator',note:'Alpha fractions in the native chart.'},
 rapidity:{name:'Rapidity',family:'UHL candidate',note:'artanh(2 × alpha fraction − 1).'},
 log_odds:{name:'Log odds',family:'Equivalent chart',note:'Twice rapidity; not an independent vote.'},
 ilr:{name:'Log-ratio geometry',family:'Composition',note:'Spectral composition and log total power.'},
 poincare:{name:'Poincaré ball',family:'Curvature candidate',note:'Geodesic distance; curvature and scale are model choices.'}
};
export const DEFAULTS={fs:256,window_s:4,hop_s:.5,half_life_s:30,calibration_s:20,quantile:.95,curvature:1,embedding_scale:4,max_uv:400,min_std:.05,method:'ilr',policy:'fixed',max_difficulty:.7,seed:17};
export function validateConfig(input){
 const c={...DEFAULTS,...input};
 const ranges={fs:[128,512],window_s:[2,8],hop_s:[.25,2],half_life_s:[1,600],calibration_s:[10,300],quantile:[.5,.999],curvature:[.01,10],embedding_scale:[.5,20],max_uv:[10,2000],min_std:[.001,10],max_difficulty:[.1,.8],seed:[0,4294967295]};
 for(const [k,[lo,hi]]of Object.entries(ranges))if(typeof c[k]!=='number'||!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error(`${k} must be in ${lo}–${hi}`);
 if(![128,256,512].includes(c.fs)||![2,4,8].includes(c.window_s))throw Error('Choose a supported rate/window');
 if(!METHODS[c.method]||!['fixed','residue_gated'].includes(c.policy)||!Number.isInteger(c.seed))throw Error('Invalid method, policy or seed');
 for(const k of Object.keys(c))if(!(k in DEFAULTS))throw Error(`Unknown dial ${k}`);
 return c;
}
export const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
export const quantile=(x,p)=>{const a=[...x].sort((u,v)=>u-v),n=(a.length-1)*p,i=Math.floor(n);return a[i]+(a[Math.ceil(n)]-a[i])*(n-i)};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=a=>Math.sqrt(dot(a,a));
const H=[[1/Math.sqrt(2),-1/Math.sqrt(2),0,0],[1/Math.sqrt(6),1/Math.sqrt(6),-2/Math.sqrt(6),0],[1/Math.sqrt(12),1/Math.sqrt(12),1/Math.sqrt(12),-3/Math.sqrt(12)]];
export function fftPower(signal,fs){
 const n=signal.length;if(n<8||(n&(n-1)))throw Error('Power-of-two window required');
 const re=new Float64Array(n),im=new Float64Array(n);let sw=0;
 const m=mean(signal);let tx=0,tt=0;
 for(let i=0;i<n;i++){const t=2*i/(n-1)-1;tx+=t*(signal[i]-m);tt+=t*t}
 const detrended=signal.map((v,i)=>v-m-(2*i/(n-1)-1)*tx/tt);
 for(let i=0;i<n;i++){const w=.5-.5*Math.cos(2*Math.PI*i/(n-1));re[i]=detrended[i]*w;sw+=w*w}
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]]}}
 for(let len=2;len<=n;len<<=1){const angle=-2*Math.PI/len;for(let i=0;i<n;i+=len){for(let j=0;j<len/2;j++){
  const wr=Math.cos(angle*j),wi=Math.sin(angle*j),k=i+j+len/2,tr=re[k]*wr-im[k]*wi,ti=re[k]*wi+im[k]*wr;
  re[k]=re[i+j]-tr;im[k]=im[i+j]-ti;re[i+j]+=tr;im[i+j]+=ti;
 }}}
 const power=Array.from({length:n/2+1},(_,i)=>(re[i]**2+im[i]**2)/(fs*sw)*(i>0&&i<n/2?2:1));
 return {power,detrended,df:fs/n};
}
export function extractPowers(rows,c){
 if(rows.length<c.fs*c.window_s)return {valid:false,reason:'Warming up signal window'};
 if(rows.some(row=>row.length!==4||row.some(v=>!Number.isFinite(v))))return {valid:false,reason:'Non-finite samples'};
 const powers=[];
 for(let ch=0;ch<4;ch++){
  const {power,detrended,df}=fftPower(rows.map(r=>r[ch]),c.fs);
  const sd=Math.sqrt(mean(detrended.map(x=>x*x)));
  if(sd<c.min_std)return {valid:false,reason:`${CHANNELS[ch]} flatline`};
  if(Math.max(...detrended)-Math.min(...detrended)>c.max_uv)return {valid:false,reason:`${CHANNELS[ch]} amplitude artifact`};
  const bands=[[1,4],[4,8],[8,13],[13,30]].map(([a,b])=>power.reduce((s,v,i)=>s+(i*df>=a&&i*df<b?v*df:0),0));
  if(bands.reduce((s,v)=>s+v,0)<1e-8)return {valid:false,reason:'Insufficient power'};
  powers.push(bands.map(v=>Math.max(v,1e-10)));
 }
 return {valid:true,powers,reason:'Basic amplitude, flatline and continuity checks passed'};
}
export function chart(powers,method,c){
 const p=powers.map(row=>row.map(v=>v/row.reduce((a,b)=>a+b,0)));
 const a=p.map(row=>Math.min(1-1e-6,Math.max(1e-6,row[2])));
 if(method==='native_alpha')return a;
 if(method==='rapidity')return a.map(v=>Math.atanh(2*v-1));
 if(method==='log_odds')return a.map(v=>Math.log(v/(1-v)));
 const ilr=p.map(row=>H.map(h=>dot(h,row.map(Math.log))));
 if(method==='ilr')return ilr.flatMap((row,i)=>[Math.log(powers[i].reduce((a,b)=>a+b,0)),...row]);
 if(method==='poincare'){
  const v=ilr.flat().map(x=>x/c.embedding_scale),n=norm(v),k=Math.sqrt(c.curvature);
  return v.map(x=>x*(n>1e-12?Math.min(1-1e-7,Math.tanh(k*n))/(k*n):1));
 }
 throw Error('Unknown chart');
}
export function ballDistance(a,b,c){
 const denom=(1-c*dot(a,a))*(1-c*dot(b,b));if(denom<=0)throw Error('Outside Poincaré ball');
 return Math.acosh(Math.max(1,1+2*c*dot(a.map((v,i)=>v-b[i]),a.map((v,i)=>v-b[i]))/denom))/Math.sqrt(c);
}
export function inverse(matrix){
 const n=matrix.length,a=matrix.map((row,i)=>[...row,...Array.from({length:n},(_,j)=>+(i===j))]);
 for(let k=0;k<n;k++){
  let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
  if(Math.abs(a[pivot][k])<1e-15)throw Error('Degenerate reference');[a[pivot],a[k]]=[a[k],a[pivot]];
  const v=a[k][k];a[k]=a[k].map(x=>x/v);
  for(let i=0;i<n;i++)if(i!==k){const f=a[i][k];a[i]=a[i].map((x,j)=>x-f*a[k][j])}
 }
 return a.map(row=>row.slice(n));
}
export class Reference{
 constructor(values,method,c){
  if(values.length<20)throw Error('20 valid reference frames required');this.method=method;this.c=c;this.n=values.length;
  this.center=values[0].map((_,i)=>mean(values.map(v=>v[i])));this.scale=1;this.precision=null;
  if(method==='poincare')this.scale=Math.max(1e-6,Math.sqrt(mean(values.map(v=>ballDistance(v,this.center,c.curvature)**2))));
  else{
   const n=this.center.length,cov=Array.from({length:n},()=>Array(n).fill(0));
   for(const v of values)for(let i=0;i<n;i++)for(let j=0;j<n;j++)cov[i][j]+=(v[i]-this.center[i])*(v[j]-this.center[j])/(values.length-1);
   const floor=Math.max(1e-12,cov.reduce((s,row,i)=>s+row[i],0)/n*1e-6);
   this.precision=inverse(cov.map((row,i)=>row.map((v,j)=>i===j?v+floor:.8*v)));
  }
  this.deadband=quantile(values.map(v=>this.distance(v)),c.quantile);
 }
 distance(v){
  if(this.method==='poincare')return ballDistance(v,this.center,this.c.curvature)/this.scale;
  const d=v.map((x,i)=>x-this.center[i]);return Math.sqrt(Math.max(0,dot(d,this.precision.map(row=>dot(row,d)))));
 }
 serialize(){return {method:this.method,center:this.center,scale:this.scale,precision:this.precision,deadband:this.deadband,n:this.n,context:'operator-declared reference; not validated health'}}
}
export function residueStep(r,e,dt,halfLife){
 if(![r,e,dt,halfLife].every(Number.isFinite)||r<0||e<0||dt<0||halfLife<=0)throw Error('Invalid residue arguments');
 const a=Math.exp(-Math.LN2*dt/halfLife);return a*r+(1-a)*e;
}
export class Recovery{
 constructor(c,ref){this.c=c;this.ref=ref;this.r=0;this.last=null;this.history=[];this.segment=0}
 gap(){this.r=0;this.last=null;this.history=[];this.segment++}
 update(t,value){
  const d=this.ref.distance(value),e=Math.max(0,d-this.ref.deadband);
  if(this.last!==null){const dt=t-this.last;if(dt<=0)throw Error('Non-increasing timestamp');if(dt>this.c.hop_s*3)this.gap();else this.r=residueStep(this.r,e,dt,this.c.half_life_s)}
  this.last=t;this.history.push({t,d,r:this.r});this.history=this.history.filter(x=>t-x.t<=31+this.c.hop_s*2);
  const s={},g={};for(const span of [5,15,30]){
   const row=this.history.filter(x=>x.t<=t-span).at(-1);
   const ok=row&&t-span-row.t<this.c.hop_s*2;
   s[span]=ok?(row.d-d)/(t-row.t):null;g[span]=ok?(this.r-row.r)/(t-row.t):null;
  }
  return {distance:d,excess:e,residue:this.r,return:s,residue_trend:g,ready:Object.values(s).every(v=>v!==null),deadband:this.ref.deadband,segment:this.segment};
 }
}
export function gate(m,valid){
 if(!valid||!m)return {decision:'hold',reason:'Signal or reference unavailable'};
 if(!m.ready)return {decision:'hold',reason:'Return windows warming up'};
 if(Object.values(m.residue_trend).some(x=>x>1e-4))return {decision:'reduce',reason:'Residue is rising'};
 if(m.residue>.5)return {decision:'reduce',reason:'Above prototype residue threshold'};
 if(Object.values(m.return).every(x=>x>1e-4)&&Object.values(m.residue_trend).every(x=>x<=0))return {decision:'advance',reason:'Consistent return; residue non-rising'};
 return {decision:'hold',reason:'No consistent return evidence'};
}
export class PacketAssembler{
 constructor(onSamples,onGap){this.onSamples=onSamples;this.onGap=onGap;this.pending=new Map();this.lastIndex=null;this.startTime=null}
 push(reading){
  const {index,electrode,samples,timestamp}=reading;
  if(!Number.isInteger(index)||!Number.isInteger(electrode)||electrode<0||electrode>3||samples.length!==12||!samples.every(Number.isFinite)||!Number.isFinite(timestamp))return;
  let packet=this.pending.get(index);if(!packet){packet={channels:[],timestamp};this.pending.set(index,packet)}
  packet.channels[electrode]=samples;
  if(packet.channels.filter(Boolean).length===4){
   this.pending.delete(index);
   const delta=this.lastIndex===null?1:(index-this.lastIndex+65536)%65536;
   if(delta===0||delta>32768)return;
   if(delta!==1)this.onGap({reason:'EEG packet discontinuity',lostPackets:delta-1});
   this.lastIndex=index;if(this.startTime===null)this.startTime=timestamp;
   const rows=Array.from({length:12},(_,i)=>({t:(timestamp-this.startTime)/1000+i/256,values:packet.channels.map(ch=>ch[i])}));
   this.onSamples(rows);
  }
  while(this.pending.size>16){const key=this.pending.keys().next().value;this.pending.delete(key);this.onGap({reason:'Incomplete channel packet',index:key})}
 }
}
