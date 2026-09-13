import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {normalizeOntologyText,ontologyHash,readOntologyRecord,searchOntology,selectOntologyRows,safeOntologyUrl,verifyOntologyBytes,ontologyAssetUrl,type SearchRow} from '../lib/ontology-browser.ts';
const root=new URL('../public',import.meta.url);
void test('Hosted data routing permits only pinned files; a changed byte is rejected',async()=>{
 const path='/ledger-data/records/00.json.gz';const b=new Uint8Array(readFileSync(new URL('../public'+path,import.meta.url)));
 await verifyOntologyBytes(path,b);await verifyOntologyBytes(path,new Uint8Array(gunzipSync(b)));
 const altered=b.slice();altered[20]^=1;await assert.rejects(()=>verifyOntologyBytes(path,altered),/integrity/);
 await assert.rejects(()=>verifyOntologyBytes('/ledger-data/records/unknown.json.gz',b),/Unregistered/);
 assert.match(ontologyAssetUrl(path),/^https:\/\/raw\.githubusercontent\.com\/thantiklermcirony\/empirical-observatory\/[a-f0-9]{40}\/public\/ledger-data\/records\/00\.json\.gz$/);
 for(const bad of ['/ledger-data/../secrets','/ledger-data/sources/unknown.gz','/ledger-data/__proto__','https://example.org/'])assert.throws(()=>ontologyAssetUrl(bad),/Unregistered/);
});
const read=async(path:string)=>{const b=readFileSync(new URL('.'+path,root+'/'));return JSON.parse((path.endsWith('.gz')?gunzipSync(b):b).toString('utf8'));};
void test('Labels with identical spelling preserve separate scientific identifiers',()=>{
 const rows:SearchRow[]=[['entropy','one','a','Entropy',false],['entropy','two','b','Entropy',false],['entropy','one','b','Entropy',false],['entropy','old','a','Obsolete entropy',true]];
 const r=selectOntologyRows(rows,'entropy');assert.equal(r.total,2);assert.deepEqual(r.hits[0].sources,['a','b']);assert.equal(selectOntologyRows(rows,'entropy',{obsolete:true}).total,3);
 assert.equal(selectOntologyRows(rows,'entropy',{sources:['b']}).total,2);assert.equal(selectOntologyRows(rows,'entropy',{sources:[]}).total,0);
});
void test('Search normalization is lexical, pagination stable, no definition-based inference',()=>{
 assert.equal(normalizeOntologyText('  ＥＮＴＲＯＰＹ  '),'entropy');
 const rows:SearchRow[]=[['redox potential','a','x','Redox potential',false],['potential energy','b','x','Potential energy',false]];
 assert.equal(selectOntologyRows(rows,'pot red').total,1);assert.equal(selectOntologyRows(rows,'x').total,0);assert.equal(selectOntologyRows(rows,'potential',{limit:1,offset:1}).hits.length,1);assert.equal(selectOntologyRows(rows,'cure cancer').total,0);
});
void test('Record paths cannot be supplied as traversal or executable URLs',async()=>{
 await assert.rejects(()=>readOntologyRecord('../../etc/passwd'));assert.equal(safeOntologyUrl('javascript:alert(1)'),undefined);assert.equal(safeOntologyUrl('https://qudt.org/'),'https://qudt.org/');assert.equal(await ontologyHash('entropy'),createHash('sha256').update('entropy').digest('hex'));
});
void test('Every compiled shard matches the content integrity ledger',()=>{
 const integrity=JSON.parse(readFileSync(new URL('../public/ledger-data/integrity.json',import.meta.url),'utf8'));
 for(const f of integrity){const b=readFileSync(new URL(`../public/ledger-data/${f.kind}/${f.bucket}.json.gz`,import.meta.url));assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);const expanded=gunzipSync(b);assert.equal(expanded.length,f.expandedBytes);assert.equal(createHash('sha256').update(expanded).digest('hex'),f.expandedSha256);assert.ok(f.bytes<25_000_000,'Static file limit');}
});
void test('Every original capture decompresses to its pinned scientific source bytes',()=>{
 const m=JSON.parse(readFileSync(new URL('../public/ledger-data/manifest.json',import.meta.url),'utf8'));
 for(const s of m.sources){const b=readFileSync(new URL('.'+(s.localCaptureDownload??s.captureDownload),root+'/'));const original=s.captureDownload.endsWith('.gz')?gunzipSync(b):b;assert.equal(original.length,s.bytes,s.id);assert.equal(createHash('sha256').update(original).digest('hex'),s.sha256,s.id);assert.ok(!s.resolvedUrl.includes('?'),'No expiring redirect tokens in public provenance.');}
});
void test('All identifiers and source record totals reconcile without label-based merging',()=>{
 const m=JSON.parse(readFileSync(new URL('../public/ledger-data/manifest.json',import.meta.url),'utf8'));const integrity=JSON.parse(readFileSync(new URL('../public/ledger-data/integrity.json',import.meta.url),'utf8'));let iris=0,assertions=0,relations=0;const counts=new Map<string,number>();
 for(const f of integrity.filter((x:{kind:string})=>x.kind==='records')){const b=gunzipSync(readFileSync(new URL(`../public/ledger-data/records/${f.bucket}.json.gz`,import.meta.url)));const records=JSON.parse(b.toString('utf8'));for(const [key,r] of Object.entries(records) as [string,{iri:string;assertions:{source:string;relations:unknown[]}[]}][]){assert.equal(createHash('sha256').update(r.iri).digest('hex'),key);iris++;for(const a of r.assertions){assertions++;relations+=a.relations.length;counts.set(a.source,(counts.get(a.source)??0)+1);}}}
 assert.equal(iris,m.totals.distinctIris);assert.equal(assertions,m.totals.sourceRecords);assert.equal(relations,m.totals.relations);for(const s of m.sources)assert.equal(counts.get(s.id),s.counts.records,s.id);
});
void test('Manifest totals preserve provenance and admit zero new operations',()=>{
 const m=JSON.parse(readFileSync(new URL('../public/ledger-data/manifest.json',import.meta.url),'utf8'));assert.ok(m.totals.sources>=25);assert.ok(m.totals.distinctIris>100000);assert.equal(m.totals.newExecutableOperations,0);assert.equal(m.sources.reduce((n:number,s:{counts:{records:number}})=>n+s.counts.records,0),m.totals.sourceRecords);
 for(const s of m.sources){assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(s.license.url);assert.ok(s.attribution);assert.match(s.captureDownload,/^https:\/\/raw\.githubusercontent\.com\/thantiklermcirony\/empirical-observatory\/[a-f0-9]{40}\/public\/ledger-data\/sources\//);assert.ok(s.localCaptureDownload.startsWith('/ledger-data/sources/'));}
 assert.equal(m.sources.find((s:{id:string})=>s.id==='uat').license.label,'CC BY-SA 3.0');
});
void test('Real scientific queries load indexed concepts, with exact source records',async()=>{
 for(const query of ['entropy','glutathione','neuron','uncertainty','noun','galaxy']){const r=await searchOntology(query,{},read);assert.ok(r.total>0,query);const x=await readOntologyRecord(r.hits[0].key,read);assert.ok(x?.iri);assert.ok(x?.assertions.length);assert.equal(await ontologyHash(x!.iri),r.hits[0].key);}
});
void test('Independent ambiguity receipt identifies its exact snapshot and makes no completeness claim',()=>{
 const bytes=(name:string)=>readFileSync(new URL('../public/ledger-data/'+name,import.meta.url));const q=JSON.parse(bytes('quality.json').toString('utf8'));const m=JSON.parse(bytes('manifest.json').toString('utf8'));
 assert.equal(q.inputs.manifestSha256,createHash('sha256').update(bytes('manifest.json')).digest('hex'));assert.equal(q.inputs.integritySha256,createHash('sha256').update(bytes('integrity.json')).digest('hex'));assert.equal(q.counts.reportedLexicalCollisionGroups,m.totals.ambiguousLabels);assert.equal(q.scope.exhaustive,false);assert.equal(q.review.confirmedScientificErrors,0);
 const packed=bytes('collision-candidates.json.gz');assert.equal(createHash('sha256').update(packed).digest('hex'),q.candidates.sha256);const candidates=JSON.parse(gunzipSync(packed).toString('utf8')).candidates;assert.equal(candidates.length,q.counts.reportedLexicalCollisionGroups);assert.equal(new Set(candidates.map((c:{label:string})=>c.label)).size,candidates.length);for(const c of candidates)assert.ok(new Set(c.iris).size>=2);
});
