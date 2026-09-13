/* SPDX-License-Identifier: GPL-3.0-only
 * Observatory implementation of Heldt et al.'s published model.
 * Original equations/parameters: upstream/models/*.txt, retained with attribution.
 * This is a reduced cell-cycle model, not a molecularly complete organism.
 */
(function(root){
 'use strict';
 const names=['V','SK','TF','IN','INTF','IP','S','M'];
 const defaults={mu:.0029,At:1,CdTh:.2,kSySk:.002,kDeSk:.002,kDeSkLi:.038,
   kSyTf:.06,kDeTf:.06,kSyIn:6.1,kDeIn:.5,kAsTfIn:500,kDsTfIn:.1,
   kPhInSk:5.6,kPhInFk:65,kDpIn:2,kSySTf:.25,jInSM:.125,nInSM:4,
   kDeS:.1,kSyMS:.2,kSyMM:.06,kDeM:.1,kDeMA:10,kPhAS:25,kPhAM:2000,nPhA:2,kDpA:2};
 function parameters(changes={}){
   const p={...defaults,...changes};
   for(const [k,v] of Object.entries(p))if(!Object.hasOwn(defaults,k)||!Number.isFinite(v)||v<0)throw Error('Invalid parameter '+k);
   for(const k of ['CdTh','kDeSk','kDeTf','kDeIn','jInSM','kDpA'])if(p[k]<=0)throw Error(k+' must be positive');
   return p;
 }
 function initial(volume=1){return [volume,volume,0,2.6*volume,volume,8.6*volume,0,0];}
 function rhs(y,L,p=defaults){
   const [V,SK,TF,IN,C,IP,S,M]=y;
   const r=(p.kPhInSk*SK+p.kPhInFk*TF)/V;
   const bind=p.kAsTfIn/V*IN*TF;
   const A=p.At*V*p.kDpA/(p.kDpA+p.kPhAS*(S/V)**p.nPhA+p.kPhAM*(M/V)**p.nPhA);
   const hill=p.jInSM**p.nInSM/(p.jInSM**p.nInSM+(M/V)**p.nInSM);
   return [p.mu*V*L,p.kSySk*V-(p.kDeSk+p.kDeSkLi*L)*SK,
    p.kSyTf*V-bind+(p.kDsTfIn+r+p.kDeIn)*C-p.kDeTf*TF,
    p.kSyIn-bind+(p.kDsTfIn+p.kDeTf)*C-(r+p.kDeIn)*IN+p.kDpIn*IP,
    bind-(p.kDsTfIn+r+p.kDeIn+p.kDeTf)*C,
    r*(IN+C)-(p.kDpIn+p.kDeIn)*IP,p.kSySTf*TF*hill-p.kDeS*S,
    p.kSyMS*S+p.kSyMM*M-(p.kDeM+p.kDeMA*A/V)*M];
 }
 function forced(pool,V,g,d,k,h){
   return pool*Math.exp(-d*h)+k*V*(Math.exp(g*h)-Math.exp(-d*h))/(g+d);
 }
 function solve(A,b){
   const n=b.length;A=A.map((r,i)=>[...r,b[i]]);
   for(let k=0;k<n;k++){
     let q=k;for(let i=k+1;i<n;i++)if(Math.abs(A[i][k])>Math.abs(A[q][k]))q=i;
     if(Math.abs(A[q][k])<1e-18)throw Error('Singular Newton system');
     [A[k],A[q]]=[A[q],A[k]];
     for(let i=k+1;i<n;i++){const w=A[i][k]/A[k][k];for(let j=k+1;j<=n;j++)A[i][j]-=w*A[k][j];A[i][k]=0;}
   }
   const x=Array(n).fill(0);
   for(let i=n-1;i>=0;i--){let v=A[i][n];for(let j=i+1;j<n;j++)v-=A[i][j]*x[j];x[i]=v/A[i][i];}
   return x;
 }
 function step(y,L,p,h){
   const g=p.mu*L, V=y[0]*Math.exp(g*h);
   const SK=forced(y[1],y[0],g,p.kDeSk+p.kDeSkLi*L,p.kSySk,h);
   const T=forced(y[2]+y[4],y[0],g,p.kDeTf,p.kSyTf,h);
   const It=(y[3]+y[4]+y[5])*Math.exp(-p.kDeIn*h)+p.kSyIn/p.kDeIn*(-Math.expm1(-p.kDeIn*h));
   const old=[y[4],y[5],y[6],y[7]];
   const valid=x=>x.every(z=>Number.isFinite(z)&&z>=-1e-10)&&x[0]<=T+1e-10&&x[0]+x[1]<=It+1e-10;
   function residual(x){
     const [C,IP,S,M]=x,TF=T-C,IN=It-C-IP;
     const r=(p.kPhInSk*SK+p.kPhInFk*TF)/V;
     const av=p.At*p.kDpA/(p.kDpA+p.kPhAS*(S/V)**p.nPhA+p.kPhAM*(M/V)**p.nPhA);
     const f=[p.kAsTfIn/V*IN*TF-(p.kDsTfIn+r+p.kDeIn+p.kDeTf)*C,
      r*(It-IP)-(p.kDpIn+p.kDeIn)*IP,
      p.kSySTf*TF*p.jInSM**p.nInSM/(p.jInSM**p.nInSM+(M/V)**p.nInSM)-p.kDeS*S,
      p.kSyMS*S+p.kSyMM*M-(p.kDeM+p.kDeMA*av)*M];
     return x.map((v,i)=>v-old[i]-h*f[i]);
   }
   let x=old.slice();x[0]=Math.min(x[0],T*.999999,It*.999999);x[1]=Math.min(x[1],(It-x[0])*.999999);
   const norm=r=>Math.max(...r.map((z,i)=>Math.abs(z)/(1+Math.abs(old[i]))));
   for(let it=0;it<24;it++){
     const r=residual(x),n=norm(r);
     if(n<1e-9){
       const out=[V,SK,T-x[0],It-x[0]-x[1],x[0],x[1],x[2],x[3]];
       if(out.some(z=>z < -1e-9||!Number.isFinite(z)))throw Error('Negative/nonfinite solution');
       return out.map(z=>Math.max(0,z)); // Only roundoff-scale negatives permitted.
     }
     const J=Array.from({length:4},()=>Array(4));
     for(let j=0;j<4;j++){
       const z=x.slice(),e=1e-6*Math.max(1,Math.abs(z[j]));z[j]+=e;
       const rr=residual(z);for(let i=0;i<4;i++)J[i][j]=(rr[i]-r[i])/e;
     }
     const d=solve(J,r.map(z=>-z));let accepted=false;
     for(let k=0;k<22;k++){
       const scale=2**(-k),z=x.map((v,i)=>v+scale*d[i]);
       if(valid(z)&&norm(residual(z))<n){x=z;accepted=true;break;}
     }
     if(!accepted)throw Error('Newton line search failed');
   }
   throw Error('Newton iteration limit');
 }
 function makeSchedule({mode='daynight',hours=48,period=24,lightHours=12,duty=.5,offset=0}={}){
   if(![hours,period,offset,lightHours,duty].every(Number.isFinite)||!(hours>0&&hours<=96&&period>0&&lightHours>=0&&duty>=0&&duty<=1))throw Error('Invalid schedule');
   if(period<1/60)throw Error('Pulse period must be at least one minute');
   if(!['daynight','light','dark','single','pulse','reverse'].includes(mode))throw Error('Unknown schedule');
   const end=hours*60,events=new Set([0,end]);
   if(mode==='single'){if(lightHours*60>0&&lightHours*60<end)events.add(lightHours*60);}
   if(['daynight','pulse','reverse'].includes(mode)){
     const lit=mode==='daynight'?Math.min(period,lightHours):period*duty;
     for(let k=-2-Math.ceil(Math.abs(offset)/period);k<=Math.ceil(hours/period)+2;k++){
       for(const t of [(k*period+offset)*60,(k*period+offset+lit)*60])if(t>0&&t<end)events.add(t);
     }
   }
   const times=[...events].sort((a,b)=>a-b),segs=[];
   for(let i=0;i<times.length-1;i++){
     const t=(times[i]+times[i+1])/120,phase=((t-offset)%period+period)%period;
     let light=mode==='light'?1:mode==='dark'?0:mode==='single'?+(t<lightHours):+(phase<(mode==='daynight'?Math.min(lightHours,period):period*duty));
     if(mode==='reverse')light=1-light;
     segs.push({start:times[i],end:times[i+1],light});
   }
   return segs;
 }
 function simulate(opts={}){
   const p=parameters(opts.parameters),schedule=opts.schedule||makeSchedule(opts);
   let y=(opts.initial||initial(opts.volume??1)).slice(),t=0,generation=0;
   if(y.length!==8||y[0]<=0||y.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid initial state');
   if(!schedule.length||schedule.length>2048)throw Error('Schedule must contain 1 to 2048 segments');
   schedule.forEach((s,i)=>{if(!Number.isFinite(s.end)||s.start!==(i?schedule[i-1].end:0)||s.end<=s.start||![0,1].includes(s.light))throw Error('Invalid forcing segment');});
   const dt=opts.dt??.5, sampleEvery=opts.sampleEvery??5;
   if(!(dt>0&&dt<=5&&sampleEvery>0)||schedule.at(-1).end>5760)throw Error('Invalid integration settings');
   const initialV=y[0],events=[],trace=[],diagnostics={steps:0,retries:0,minState:0,maxVolumeIdentityRelativeError:0,maxDivisionBalanceError:0};
   let dose=0,nextSample=0;
   const snapshot=L=>({t,y:y.slice(),light:L,generation,dose,descendants:2**generation});
   trace.push(snapshot(schedule[0].light));nextSample=sampleEvery;
   for(const seg of schedule){
     while(t<seg.end-1e-9){
       let h=Math.min(dt,seg.end-t,Math.max(1e-9,nextSample-t)),z;
       for(;;){try{z=step(y,seg.light,p,h);break;}catch(e){h/=2;diagnostics.retries++;if(h<1e-6)throw e;}}
       if(y[7]/y[0]>p.CdTh&&z[7]/z[0]<=p.CdTh){
         let lo=0,hi=h;
         for(let k=0;k<18;k++){const mid=(lo+hi)/2,w=step(y,seg.light,p,mid);if(w[7]/w[0]>p.CdTh)lo=mid;else hi=mid;}
         h=hi;z=step(y,seg.light,p,h);
         const before=z.slice();z=z.map(v=>v/2);generation++;
         events.push({t:t+h,generation,parent:before,daughter:z.slice(),represented_daughters:2**generation});
         diagnostics.maxDivisionBalanceError=Math.max(diagnostics.maxDivisionBalanceError,...before.map((v,i)=>Math.abs(v-2*z[i])));
       }
       t+=h;dose+=h*seg.light;y=z;diagnostics.steps++;
       diagnostics.minState=Math.min(diagnostics.minState,...y);
       const exact=initialV*Math.exp(p.mu*dose),total=y[0]*2**generation;
       diagnostics.maxVolumeIdentityRelativeError=Math.max(diagnostics.maxVolumeIdentityRelativeError,Math.abs(total/exact-1));
       if(t>=nextSample-1e-7){trace.push(snapshot(seg.light));nextSample+=sampleEvery;}
       if(diagnostics.steps>250000)throw Error('Step limit');
     }
   }
   if(trace.at(-1).t<t-1e-7)trace.push(snapshot(schedule.at(-1).light));
   return {parameters:p,schedule,initial:opts.initial||initial(opts.volume??1),trace,events,final:snapshot(schedule.at(-1).light),diagnostics,
     scope:'Published deterministic cell-cycle model; symmetric synchronous lineage. No nutrient chemistry, ATP, motility, death or sexual cycle.'};
 }
 const api={names,defaults,parameters,initial,rhs,step,makeSchedule,simulate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Organism=api;
})(typeof globalThis!=='undefined'?globalThis:this);
