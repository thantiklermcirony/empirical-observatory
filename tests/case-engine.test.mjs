import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import '../public/research-cases/chlamydomonas/engine.js';
import {runCase,validateRequest} from '../public/research-cases/runtime/chlamydomonas-runner.mjs';
import {canonical,verifyReceipt} from '../public/research-cases/runtime/case-core.mjs';
const root=new URL('../public/research-cases/chlamydomonas/',import.meta.url);
const read=async path=>new Uint8Array(readFileSync(new URL(path,root)));
const provenance=JSON.parse(readFileSync(new URL('source-provenance.json',root)));
const model=globalThis.Organism;
const records=[];
test('recovered source bytes and added independent reference match declared hashes',()=>{
 const manifest=JSON.parse(readFileSync(new URL('MANIFEST.json',root)));for(const f of manifest.files){const bytes=readFileSync(new URL(f.path,root));assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,f.path);}
 for(const [path,hash] of Object.entries(provenance.assets))assert.equal(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'),hash,path);
});
test('strict input bounds and canonical finite receipts',()=>{for(const bad of [{experiment:'state',slots:12},{experiment:'timing',hours:Infinity},{experiment:'eval'},{experiment:'state',code:'alert(1)'},{experiment:'empirical',hours:96},{experiment:'timing',slots:8}])assert.throws(()=>validateRequest(bad));assert.throws(()=>canonical({x:NaN}));assert.equal(canonical({b:1,a:[2]}),canonical({a:[2],b:1}));});
test('timing comparison, numerical false lead, empirical failure and state search execute',async()=>{
 for(const experiment of ['timing','artifact','empirical','state']){
  const r=await runCase({experiment},{model,read,provenance});assert.equal(await verifyReceipt(r),true);const corrupt=structuredClone(r);corrupt.finding+=' tampered';assert.equal(await verifyReceipt(corrupt),false);assert.equal(r.ai.calls,0);
  if(experiment==='timing'){assert.deepEqual(r.runs.map(x=>x.descendants),[1,8]);assert.ok(r.gates.every(g=>g.status==='pass'));}
  if(experiment==='artifact'){assert.equal(r.classification,'rejected-numerical-artifact');assert.ok(r.details.levels[0].differenceMinutes>70);assert.ok(r.details.levels.at(-1).differenceMinutes<.01);}
  if(experiment==='empirical'){assert.equal(r.details.overall.n,3679);assert.equal(r.gates.find(g=>g.id==='benefit').status,'fail');assert.equal(r.classification,'candidate-prediction-failed');}
  if(experiment==='state'){assert.equal(r.details.rows.length,20);assert.equal(r.classification,'model-state-insufficiency-witness');assert.equal(r.gates.find(g=>g.id==='independent').status,'pass');assert.deepEqual(r.details.witness.histories,['111000','110001']);assert.ok(r.details.rows.every(x=>x.lightMinutes===720));assert.equal(r.details.candidates[0].testN,7);assert.ok(r.details.candidates.some(x=>x.feature==='elapsedDarkHours'));}
  records.push(r);
 }
 if(process.env.CASE_WRITE_VERIFICATION==='1'){mkdirSync('research/case-engine',{recursive:true});writeFileSync('research/case-engine/verification.json',JSON.stringify({schema:'observatory-case-integration-check/1',runs:records.map(({request,classification,gates,finding,receiptSha256,createdAt,details})=>({request,classification,gates,finding,receiptSha256,createdAt,candidates:details.candidates??null}))},null,2)+'\n');}
});
test('96-hour counts agree but a regulator-state mismatch blocks numerical admission',async()=>{const r=await runCase({experiment:'timing',hours:96},{model,read,provenance});assert.deepEqual(r.runs.map(x=>x.descendants),[8,64]);assert.equal(r.gates.find(g=>g.id==='reference-0').status,'fail');assert.equal(r.classification,'numerically-unresolved');assert.match(r.finding,/provisional/);});
test('changed or missing evidence fails closed',async()=>{await assert.rejects(runCase({experiment:'empirical'},{model,read:async()=>new TextEncoder().encode('[]'),provenance}),/integrity mismatch/);});
