import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {env} from './cloudflare-binding.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),site=path.resolve(process.env.LAB_SITE_ROOT ?? process.cwd());
registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return{url:pathToFileURL(path.join(here,'cloudflare-binding.mjs')).href,shortCircuit:true};
  if(specifier.startsWith('@/'))return{url:pathToFileURL(path.join(site,specifier.slice(2)+'.ts')).href,shortCircuit:true};
  return next(specifier,context);
}});
const load=p=>import(pathToFileURL(path.join(site,p)).href);
const baseRoute=await load('app/api/inquiry/route.ts'),saveRoute=await load('app/api/inquiry/save/route.ts'),itemRoute=await load('app/api/inquiry/[id]/route.ts');
const {savePrintout,readPrintout,deletePrintout,bearer,PRINT_RETENTION_MS}=await load('lib/lab-storage.ts');
const {createTemporalExample,hashTemporalJson}=await load('lib/engine/temporal-router.ts');
const {LAB_EXAMPLES}=await load('lib/lab-contract.ts');
const migration='drizzle/0001_giant_living_lightning.sql';
class Database {
  constructor(){this.sql=new DatabaseSync(':memory:');this.sql.exec(fs.readFileSync(path.join(site,migration),'utf8'));this.calls=[];}
  prepare(sql){const database=this;return{sql,args:[],bind(...args){return{...this,args};},async first(){database.calls.push({kind:'first',sql,args:this.args});return database.sql.prepare(sql).get(...this.args)??null;},async run(){database.calls.push({kind:'run',sql,args:this.args});const r=database.sql.prepare(sql).run(...this.args);return{meta:{changes:Number(r.changes)}};}};}
  async batch(statements){this.sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.sql.exec('COMMIT');return results;}catch(error){this.sql.exec('ROLLBACK');throw error;}}
  count(){return this.sql.prepare('SELECT COUNT(*) n FROM lab_printouts').get().n;}
  close(){this.sql.close();}
}
const databases=[];const fresh=()=>{const d=new Database();databases.push(d);env.DB=d;return d;};
const request=(body,token)=>new Request('https://example.test/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:typeof body==='string'?body:JSON.stringify(body)});
const access=(id,token,method='GET',query='')=>new Request(`https://example.test/api/inquiry/${id}${query}`,{method,headers:token?{Authorization:`Bearer ${token}`}:{}});
const context=id=>({params:Promise.resolve({id})});
const observations={};
await test('actual GET catalogue and POST inquiry route execute without local service',async()=>{
  assert.equal(baseRoute.GET().status,200);const r=await baseRoute.POST(request({prompt:LAB_EXAMPLES[0].prompt}));assert.equal(r.status,200);const b=await r.json();assert.equal(b.printout.inquiries[0].results.at(-1).value,'7/26');assert.equal(r.headers.get('Cache-Control'),'no-store');
});
await test('actual POST rejects duplicate envelope/nested keys and runtime injection',async()=>{
  for(const body of ['{"prompt":"first","prompt":"second"}','{"inquiry":{"a":1,"\\u0061":2}}','{"prompt":"x","runtime":{"execute":"anything"}}'])assert.equal((await baseRoute.POST(request(body))).status,400);
});
await test('actual save accepts only original request and returns server calculation',async()=>{
  const d=fresh(),q=createTemporalExample('actions-ab');q.results=[{value:'999',status:'accepted'}];
  const response=await saveRoute.POST(request({request:{inquiry:q}}));assert.equal(response.status,201);const saved=await response.json();
  assert.equal(saved.printout.inquiries[0].results.at(-1).value,'7/26');assert.match(saved.token,/^[a-f0-9]{64}$/);assert.equal(d.count(),1);
  const row=d.sql.prepare('SELECT * FROM lab_printouts').get();assert.notEqual(row.token_hash,saved.token);assert.equal(row.token_hash,await hashTemporalJson(saved.token));assert.ok(!row.printout_json.includes(saved.token));
  const {receiptSha256,...content}=saved.printout;assert.equal(receiptSha256,await hashTemporalJson(content));
  for(const body of [{request:{prompt:'x'},printout:{summary:'accepted'}},{printout:saved.printout},{request:{prompt:'x',results:[{value:999}]}}])assert.equal((await saveRoute.POST(request(body))).status,400);
  assert.equal(d.count(),1);
});
await test('owner token isolation across actual read/delete routes and no token query fallback',async()=>{
  const d=fresh(),a=await savePrintout(d,{request:{prompt:LAB_EXAMPLES[0].prompt}}),b=await savePrintout(d,{request:{prompt:LAB_EXAMPLES[1].prompt}});
  for(const token of [null,b.token,a.token.slice(1),'0'.repeat(64)]){
    assert.equal((await itemRoute.GET(access(a.id,token),context(a.id))).status,404);
    assert.equal((await itemRoute.DELETE(access(a.id,token,'DELETE'),context(a.id))).status,404);
  }
  assert.equal((await itemRoute.GET(access(a.id,null,'GET',`?token=${a.token}`),context(a.id))).status,404);
  assert.equal(d.count(),2);
  const good=await itemRoute.GET(access(a.id,a.token),context(a.id));assert.equal(good.status,200);assert.equal((await good.json()).printout.id,a.id);
  assert.equal((await itemRoute.DELETE(access(a.id,a.token,'DELETE'),context(a.id))).status,200);
  assert.equal((await itemRoute.GET(access(a.id,a.token),context(a.id))).status,404);assert.equal(d.count(),1);
});
await test('invalid IDs/tokens short circuit without database access',async()=>{
  const d=fresh();for(const id of ["' OR 1=1 --",'../private','not-a-uuid']){assert.equal(await readPrintout(d,id,'0'.repeat(64)),null);assert.equal(await deletePrintout(d,id,'0'.repeat(64)),false);}assert.equal(d.calls.length,0);
  assert.equal(bearer(access('x',null,'GET','?token='+'a'.repeat(64))),null);
});
await test('retention applies exact expiry boundary and cleanup',async()=>{
  const d=fresh(),now=new Date('2026-09-12T12:00:00Z'),a=await savePrintout(d,{request:{prompt:LAB_EXAMPLES[0].prompt}},now);
  assert.equal(Date.parse(a.expiresAt)-now.getTime(),PRINT_RETENTION_MS);
  assert.ok(await readPrintout(d,a.id,a.token,new Date(Date.parse(a.expiresAt)-1)));
  assert.equal(await readPrintout(d,a.id,a.token,new Date(a.expiresAt)),null);
  await savePrintout(d,{request:{prompt:'An explicitly unresolved question'}},new Date(a.expiresAt));assert.equal(d.count(),1);
});
await test('unknown and unsupported questions remain scoped gaps after saving',async()=>{
  const d=fresh(),a=await savePrintout(d,{request:{prompt:LAB_EXAMPLES[0].prompt+' at t=5 seconds'}});
  const row=await readPrintout(d,a.id,a.token);const restored=JSON.parse(row.printout_json);
  assert.equal(restored.interpretation.status,'needs_interpretation');assert.equal(restored.inquiries.length,0);assert.ok(!restored.branches.some(x=>x.state==='computed'));
});
await test('declared correction recomputes and old saved output remains immutable',async()=>{
  const d=fresh(),first=await savePrintout(d,{request:{inquiry:createTemporalExample('resource')}}),prior=first.printout.inquiries[0];
  const next=await savePrintout(d,{request:{inquiry:createTemporalExample('resource-corrected'),previous:prior}});
  assert.notDeepEqual(next.printout.inquiries[0].results,prior.results);
  assert.ok(next.printout.limitations.some(x=>x.includes('declared comparison')));
  assert.deepEqual(JSON.parse((await readPrintout(d,first.id,first.token)).printout_json),first.printout);
  const q=createTemporalExample('resource-corrected');q.identity.revision=999;
  await assert.rejects(()=>savePrintout(d,{request:{inquiry:q,previous:prior}}));assert.equal(d.count(),2);
});
await test('database errors do not claim save success or expose internal details',async()=>{
  env.DB={prepare(){throw new Error('PRIVATE_BINDING_TOKEN');}};
  const response=await saveRoute.POST(request({request:{prompt:'unknown'}}));assert.ok(response.status>=400);assert.ok(!(await response.text()).includes('PRIVATE_BINDING_TOKEN'));
});
await test('SQL quota bounds retained records in one day',async()=>{
  const d=fresh(),now=new Date('2026-09-12T12:00:00Z');
  const insert=d.sql.prepare('INSERT INTO lab_printouts (id,token_hash,created_day,expires_at,printout_json) VALUES (?,?,?,?,?)');
  for(let i=0;i<200;i++)insert.run(crypto.randomUUID(),'seed','2026-09-12','2026-10-12T12:00:00Z','{}');
  await assert.rejects(()=>savePrintout(d,{request:{prompt:'unknown'}},now),x=>x.code==='storage_quota');assert.equal(d.count(),200);
  d.sql.exec('DELETE FROM lab_printouts WHERE rowid=(SELECT MIN(rowid) FROM lab_printouts)');
  const saved=await savePrintout(d,{request:{prompt:'unknown'}},now);assert.ok(saved.id);assert.equal(d.count(),200);
  observations.quota='The SQL counts retained records created that day; deletion frees capacity. This is not a monotone daily creation/rate counter.';
});
for (const database of databases) database.close();
