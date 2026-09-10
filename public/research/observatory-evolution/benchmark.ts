import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runEpisode} from '../../../lib/engine/discovery.ts';
import type {Policy} from '../../../lib/engine/discovery.ts';
const root=path.dirname(fileURLToPath(import.meta.url));
const site=path.resolve(root,'../../..');
const sourceFiles=[path.join(site,'lib/engine/discovery.ts'),path.join(root,'protocol.json'),path.join(root,'benchmark.ts')];
const sha=(file:string)=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=Object.fromEntries(sourceFiles.map(p=>[path.basename(p),sha(p)]));
fs.writeFileSync(path.join(root,'pre-evaluation.json'),JSON.stringify({createdAt:new Date().toISOString(),hashes:before,seedRange:[10000,19999],note:'Synthetic evaluation, declared before running this range. The model itself was constructed for a known adaptation contrast.'},null,2)+'\n');
const policies:Policy[]=['adaptive_eig','best_fixed','random_feasible','prior_only_planner'];
const stats=Object.fromEntries(policies.map(p=>[p,{correct:0,log_loss_bits:0,cost:0,actions:{} as Record<string,number>}]));
const paired:number[]=[];
const rows=[];
for(let seed=10000;seed<20000;seed++){
 const runs=await Promise.all(policies.map(p=>runEpisode(p,seed)));
 for(let i=0;i<runs.length;i++){
  const r=runs[i],s=stats[policies[i]];s.correct+=r.correct;s.log_loss_bits+=r.log_loss_bits;s.cost+=r.cost;
  for(const e of r.history)s.actions[e.action]=(s.actions[e.action]??0)+1;
  rows.push([seed,r.policy,r.hidden,r.decision,r.correct,r.log_loss_bits,r.cost,r.history.map(e=>e.action+':'+e.outcome).join(';')].join(','));
 }
 paired.push(runs[0].correct-runs[1].correct);
}
const mean=paired.reduce((a,b)=>a+b,0)/paired.length;
const variance=paired.reduce((s,d)=>s+(d-mean)**2,0)/(paired.length-1);
const halfWidth=1.96*Math.sqrt(variance/paired.length);
for(const s of Object.values(stats)){s.correct/=10000;s.log_loss_bits/=10000;s.cost/=10000;}
for(const file of sourceFiles)if(sha(file)!==before[path.basename(file)])throw new Error('Source changed during evaluation.');
const report={seedRange:[10000,19999],episodesPerPolicy:10000,metrics:stats,pairedAccuracyAdvantage:mean,approximate95PercentInterval:[mean-halfWidth,mean+halfWidth],gatePassed:mean>=.05&&mean-halfWidth>0,sourceHashes:before,scope:'A known finite synthetic model; Bayesian test selection, not a learned policy, scientific discovery or cross-project self-improvement.'};
fs.writeFileSync(path.join(root,'episode-results.csv'),'seed,policy,hidden,decision,correct,log_loss_bits,cost,history\n'+rows.join('\n')+'\n');
fs.writeFileSync(path.join(root,'javascript-evaluation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

