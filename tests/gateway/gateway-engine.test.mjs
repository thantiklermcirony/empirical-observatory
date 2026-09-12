import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const site=path.resolve(process.env.LAB_SITE_ROOT ?? process.cwd());
const load=p=>import(pathToFileURL(path.join(site,p)).href);
const {evaluateLabRequest,parseLabRequest,labCatalogue}=await load('lib/lab-engine.ts');
const {LAB_EXAMPLES}=await load('lib/lab-contract.ts');
const {createTemporalExample,hashTemporalJson}=await load('lib/engine/temporal-router.ts');
const {readLabBody,labError}=await load('lib/lab-http.ts');
for(const example of LAB_EXAMPLES)await test(`documented template executes: ${example.id}`,async()=>{
  const r=await evaluateLabRequest({prompt:example.prompt});
  assert.equal(r.prompt,example.prompt);assert.equal(r.interpretation.status,'declared_model');
  assert.ok(r.branches.some(x=>x.id!=='encyclopedia'&&x.state==='computed'));
  const {receiptSha256,...content}=r;assert.equal(receiptSha256,await hashTemporalJson(content));
});
await test('order controls have actual exact outputs and changed input changes both results',async()=>{
  const original=await evaluateLabRequest({prompt:LAB_EXAMPLES[0].prompt});
  assert.equal(original.inquiries[0].results.at(-1).value,'7/26');assert.equal(original.inquiries[1].results.at(-1).value,'11/25');
  const changed=await evaluateLabRequest({prompt:LAB_EXAMPLES[0].prompt.replace('x=1/4','x=1/2')});
  for(let i=0;i<2;i++){assert.notEqual(changed.inquiries[i].results.at(-1).value,original.inquiries[i].results.at(-1).value);assert.notEqual(changed.inquiries[i].execution.input_sha256,original.inquiries[i].execution.input_sha256);}
});
await test('resource prompt explicit quantities and target retained',async()=>{
  const p=LAB_EXAMPLES.find(x=>x.id==='resource').prompt;
  const a=await evaluateLabRequest({prompt:p}),b=await evaluateLabRequest({prompt:p.replace('N=[9,11]','N=[60,80]').replace('0.60 mM?','0.62 mM?')});
  assert.notDeepEqual(a.inquiries[0].results,b.inquiries[0].results);
  const values=b.inquiries[0].quantities.map(q=>q.value);assert.ok(values.some(x=>JSON.stringify(x)==='["60","80"]'));assert.ok(values.includes('0.62'));
});
await test('unknown prose and all added unsupported qualifiers stay gaps',async()=>{
  const prompts=["What determines Jupiter's atmospheric stripes?",...LAB_EXAMPLES.flatMap(x=>[x.prompt+' Do not assume this model.',x.prompt+' at t=5 seconds',x.prompt+' in mice',x.prompt+' without dephasing'])];
  for(const prompt of prompts){const r=await evaluateLabRequest({prompt});assert.equal(r.prompt,prompt);assert.equal(r.interpretation.status,'needs_interpretation');assert.equal(r.inquiries.length,0);assert.ok(!r.branches.some(x=>x.state==='computed'));assert.ok(r.interpretation.missing.length);}
});
await test('explicit typed input executes while unsupported constraints remain unresolved',async()=>{
  const q=createTemporalExample('actions-ab');q.quantities[0].value='1/2';
  const r=await evaluateLabRequest({inquiry:q});assert.equal(r.inquiries[0].quantities[0].value,'1/2');
  q.constraints={temperature:'40 C'};const gap=await evaluateLabRequest({inquiry:q});
  assert.ok(gap.inquiries[0].results.every(x=>x.status!=='established_in_scope'));
  assert.ok(!gap.branches.some(x=>x.id!=='encyclopedia'&&x.state==='computed'));
});
await test('missing native quantum premise remains unresolved through the printout',async()=>{
  const q=createTemporalExample('quantum');const protocol=q.quantities.find(x=>x.meaning==='quantum.reference.protocol')??q.quantities[0];
  protocol.value.premises['P-H']='missing';const r=await evaluateLabRequest({inquiry:q});
  assert.equal(r.inquiries[0].results[0].status,'unresolved');assert.equal(r.branches.find(x=>x.id==='quantum').state,'unresolved');
});
await test('maximum hosted quantum grid/preparations survives whole-printout sealing',async()=>{
  const q=createTemporalExample('quantum'),p=q.quantities[0].value;p.clock.points=201;
  p.preparations=[{id:'plus_y',bloch:[0,1,0]},{id:'minus_y',bloch:[0,-1,0]},{id:'plus_x',bloch:[1,0,0]},{id:'mixed',bloch:[0,0,0]}];
  const r=await evaluateLabRequest({inquiry:q});assert.equal(r.branches.find(x=>x.id==='quantum').state,'computed');
  const {receiptSha256,...content}=r;assert.equal(receiptSha256,await hashTemporalJson(content));
});
await test('branch values are projections of the same report outputs',async()=>{
  for(const example of LAB_EXAMPLES.filter(x=>x.id!=='control')){
    const r=await evaluateLabRequest({prompt:example.prompt});
    const expected=r.inquiries.flatMap(q=>q.results.map(x=>x.value));
    const actual=r.branches.filter(x=>!['encyclopedia','dynamics'].includes(x.id)).flatMap(x=>x.results.map(y=>y.value));
    assert.deepEqual(actual,expected);assert.ok(r.encyclopedia.every(e=>e.status.startsWith('candidate entry;')));
  }
});
await test('invalid envelopes cannot smuggle results or runtime authority',()=>{
  for(const request of [null,[],{}, {prompt:'x',inquiry:{}},{prompt:'x',results:[{status:'accepted'}]}, {inquiry:{},runtime:{execute:'shell'}},{prompt:''},{prompt:'x'.repeat(2001)}])assert.throws(()=>parseLabRequest(request));
});
await test('HTTP rejects decoded duplicate keys and malformed JSON',async()=>{
  for(const text of ['{"prompt":"first","prompt":"second"}','{"prompt":"first","\\u0070rompt":"second"}','{"inquiry":{"id":1,"id":2}}','{}{}','[1,]']){
    await assert.rejects(()=>readLabBody(new Request('https://example.test/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:text})));
  }
});
await test('HTTP stream cap ignores false small length and rejects malformed UTF8',async()=>{
  const big='"'+'x'.repeat(65536)+'"';
  const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(big));c.close();}});
  await assert.rejects(()=>readLabBody(new Request('https://example.test/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':'2'},body:stream,duplex:'half'})));
  await assert.rejects(()=>readLabBody(new Request('https://example.test/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:new Uint8Array([0x22,0xc3,0x28,0x22])})));
});
await test('HTTP content type is a complete media type, not a prefix',async()=>{
  await assert.rejects(()=>readLabBody(new Request('https://example.test/api/inquiry',{method:'POST',headers:{'Content-Type':'application/jsonp'},body:'{}'})));
});
await test('error responses do not leak internal failures',async()=>{
  const response=labError(new Error('PRIVATE_TOKEN_AND_PROMPT'));const text=await response.text();assert.ok(!text.includes('PRIVATE_TOKEN'));assert.ok(response.status>=400);
});
await test('catalogue contains structured examples without callbacks or local paths',()=>{
  const catalogue=labCatalogue();assert.ok(catalogue.structuredExamples.quantum);const text=JSON.stringify(catalogue);assert.ok(!text.includes('C:\\Users'));assert.ok(!text.includes('C:/Users'));assert.ok(!text.includes('execute:'));
});
