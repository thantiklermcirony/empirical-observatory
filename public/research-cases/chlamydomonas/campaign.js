/* SPDX-License-Identifier: GPL-3.0-only */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const O=require('./engine.js');const dir=__dirname;
const write=(file,x)=>fs.writeFileSync(path.join(dir,file),JSON.stringify(x,null,2));
const slim=r=>({events:r.events.map(e=>e.t),final:r.final,diagnostics:r.diagnostics});
const named=[
 {name:'Constant light',mode:'light',hours:48},
 {name:'12 h day, 12 h night',mode:'daynight',hours:48},
 {name:'Four-hour light pulse',mode:'single',lightHours:4,hours:30},
 {name:'Darkness',mode:'dark',hours:48},
 {name:'Hourly flashes',mode:'pulse',period:1,duty:.5,hours:48},
 {name:'Large initial cell',mode:'daynight',volume:2,hours:48},
 {name:'Growth at half rate',mode:'daynight',hours:48,parameters:{mu:O.defaults.mu*.5}},
 {name:'Weaker light sensing',mode:'daynight',hours:48,parameters:{kDeSkLi:O.defaults.kDeSkLi*.5}}
];

function prepare(){
 const cases=named.map(c=>({...c,schedule:O.makeSchedule(c),initial:O.initial(c.volume||1)}));
 write('REFERENCE_CASES.json',cases);
 write('JS_REFERENCE.json',cases.map(c=>({name:c.name,coarse:slim(O.simulate({...c,dt:.5})),fine:slim(O.simulate({...c,dt:.03125}))})));
 console.log('Prepared independent-solver comparison for',cases.length,'cases');
}

function identities(){
 let worstIN=0,worstTF=0;let count=0;
 for(let k=1;k<=1000;k++){
   // Reproducible, nonnegative test states span small and large arbitrary units.
   const y=O.names.map((_,i)=>.02+5*(.5+.5*Math.sin(k*1.713+i*2.219)));y[0]+=.1;
   const f=O.rhs(y,k%2),p=O.defaults;
   worstIN=Math.max(worstIN,Math.abs(f[3]+f[4]+f[5]-(p.kSyIn-p.kDeIn*(y[3]+y[4]+y[5]))));
   worstTF=Math.max(worstTF,Math.abs(f[2]+f[4]-(p.kSyTf*y[0]-p.kDeTf*(y[2]+y[4]))));
   for(let j=1;j<8;j++){const z=y.slice();z[j]=0;assert(O.rhs(z,k%2)[j]>=-1e-10);count++;}
 }
 assert(worstIN<1e-9&&worstTF<1e-9);
 assert.throws(()=>O.simulate({initial:[-1,1,0,2,1,8,0,0]}));
 assert.throws(()=>O.simulate({parameters:{mu:-1}}));
 assert.throws(()=>O.simulate({schedule:[{start:0,end:20,light:2}]}));
 assert.throws(()=>O.simulate({dt:-1}));
 assert.throws(()=>O.simulate({mode:'invented'}));
 return {random_states:1000,nonnegative_boundary_checks:count,maxInhibitorIdentityResidual:worstIN,maxTFIdentityResidual:worstTF,invalid_input_tests:5};
}

function sweep(){
 const rows=[],failures=[];let i=0;
 // 5 x 5 x 5 x 8 = 1,000 specified combinations, not all possible experiments.
 for(const volume of [.5,.75,1,1.5,2])for(const growth of [.5,.75,1,1.25,1.5])
 for(const sensor of [.25,.5,1,1.5,2])for(const period of [.5,1,2,4,6,8,12,24]){
   const config={mode:'pulse',period,duty:.5,hours:48,volume,parameters:{mu:O.defaults.mu*growth,kDeSkLi:O.defaults.kDeSkLi*sensor}};
   try{const r=O.simulate({...config,dt:.5,sampleEvery:30});
     rows.push({id:i,config,divisions:r.events.length,firstDivisionHours:r.events[0]?.t/60||null,
       descendantCount:r.final.descendants,finalVolume:r.final.y[0],totalVolume:r.final.y[0]*r.final.descendants,
       finalStarterConcentration:r.final.y[1]/r.final.y[0],diagnostics:r.diagnostics});
   }catch(e){failures.push({id:i,config,error:e.message});}
   i++;if(i%200===0)console.log('Simulated',i,'of 1000');
 }
 const base=rows.filter(r=>r.config.volume===1&&r.config.parameters.mu===O.defaults.mu&&r.config.parameters.kDeSkLi===O.defaults.kDeSkLi);
 const findingCases=[];
 // Rank time-pattern contrasts only within identical initial state and parameters.
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
   const a=rows[i],b=rows[j];
   if(a.config.volume!==b.config.volume||a.config.parameters.mu!==b.config.parameters.mu||a.config.parameters.kDeSkLi!==b.config.parameters.kDeSkLi)continue;
   const d=Math.abs(a.divisions-b.divisions);
   if(d)findingCases.push({a:a.id,b:b.id,divisionDifference:d,totalVolumeRelativeDifference:Math.abs(a.totalVolume/b.totalVolume-1)});
 }
 findingCases.sort((a,b)=>b.divisionDifference-a.divisionDifference||a.a-b.a);
 // Independent high-resolution checks for selected extremes; retain failures.
 const confirmed=findingCases.slice(0,10).map(pair=>{
   const a=rows.find(r=>r.id===pair.a),b=rows.find(r=>r.id===pair.b);
   const ra=O.simulate({...a.config,dt:.125}),rb=O.simulate({...b.config,dt:.125});
   return {...pair,aConfig:a.config,bConfig:b.config,fineA:slim(ra),fineB:slim(rb),
     fineDivisionDifference:Math.abs(ra.events.length-rb.events.length)};
 });
 const result={scope:'Finite synthetic parameter campaign using the published cell-cycle equations. No real organism was exposed to these interventions.',
   attempted:i,successful:rows.length,failures,axes:{initialVolume:[.5,.75,1,1.5,2],growthRateMultiplier:[.5,.75,1,1.25,1.5],lightSensorMultiplier:[.25,.5,1,1.5,2],pulsePeriodHours:[.5,1,2,4,6,8,12,24]},
   invariantTests:identities(),maxVolumeIdentityRelativeError:Math.max(...rows.map(r=>r.diagnostics.maxVolumeIdentityRelativeError)),
   maxDivisionBalanceError:Math.max(...rows.map(r=>r.diagnostics.maxDivisionBalanceError)),
   basePulseComparison:base,confirmedContrasts:confirmed,rows};
 write('CAMPAIGN_RESULTS.json',result);
 console.log(JSON.stringify({attempted:i,successful:rows.length,failures:failures.length,base:base.map(r=>({period:r.config.period,divisions:r.divisions,first:r.firstDivisionHours})),strongest:confirmed[0]},null,2));
}

function compare(){
 const a=JSON.parse(fs.readFileSync(path.join(dir,'BDF_REFERENCE.json'))),b=JSON.parse(fs.readFileSync(path.join(dir,'JS_REFERENCE.json')));
 const results=a.map((r,i)=>{
   const calc=q=>({matchingDivisionCount:q.events.length===r.events.length,
    maxEventTimeErrorMinutes:q.events.length===r.events.length?Math.max(0,...q.events.map((t,j)=>Math.abs(t-r.events[j]))):null,
    endpointMaxScaledStateError:Math.max(...q.final.y.map((x,j)=>Math.abs(x-r.final[j])/(1+Math.abs(r.final[j]))))});
   return {name:r.name,referenceEvents:r.events,coarse:calc(b[i].coarse),fine:calc(b[i].fine)};
 });
 const pass=results.every(r=>r.fine.matchingDivisionCount&&r.fine.maxEventTimeErrorMinutes<1.5&&r.fine.endpointMaxScaledStateError<.05);
 write('NUMERICAL_VALIDATION.json',{method:'Independent eight-state SciPy BDF vs four nonlinear-state implicit Euler with exact total-pool updates',
   tolerances:{BDF_rtol:1e-9,BDF_atol:1e-11,fineStepMinutes:.03125,coarseStepMinutes:.5,eventTimeMinutes:1.5,endpointScaledError:.05},
   pass,results,limits:'Finite-case implementation verification, not biological validation; errors are larger near sharp transitions.'});
 console.log(JSON.stringify({pass,results},null,2));
}
if(require.main===module){const cmd=process.argv[2]||'prepare';if(cmd==='prepare')prepare();else if(cmd==='sweep')sweep();else if(cmd==='compare')compare();else throw Error('Unknown campaign command');}
