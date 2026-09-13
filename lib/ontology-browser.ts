/** Read-only vocabulary projection. A lexical match cannot authorize an operation. */
import distribution from './ontology-distribution.json' with {type:'json'};
export type OntologyLiteral={predicate:string;value:string;language:string;datatype:string};
export type OntologyAssertion={source:string;label:string;labelOrigin:string;labels:OntologyLiteral[];definitions:OntologyLiteral[];aliases:OntologyLiteral[];types:string[];literals:OntologyLiteral[];relations:{predicate:string;target:string;semantics:string}[];restrictions:{via:string;property:string;quantifier:string;filler:string;fillerKind:string;semantics:string}[];blankNodeLinks:number;deprecated:boolean};
export type OntologyRecord={iri:string;assertions:OntologyAssertion[]};
export type SearchRow=[string,string,string,string,boolean];
export type OntologyHit={key:string;label:string;matched:string;sources:string[];exact:boolean};
export const normalizeOntologyText=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
export const ontologyWords=(s:string)=>normalizeOntologyText(s).match(/[\p{L}\p{N}]+/gu)??[];
export function ontologyDescriptions(a:OntologyAssertion){return a.definitions.length?a.definitions:a.literals.filter(x=>['http://purl.org/dc/terms/description','http://www.w3.org/2000/01/rdf-schema#comment','http://www.linkedmodel.org/schema/vaem#description','http://www.geneontology.org/formats/oboInOwl#hasDefinition'].includes(x.predicate));}
export async function ontologyHash(s:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function safeOntologyUrl(s:string){return /^https?:\/\//i.test(s)?s:undefined;}
export function ontologyAssetUrl(path:string){
 const key=path.replace(/^\/ledger-data\//,'');
 if(!path.startsWith('/ledger-data/')||!Object.hasOwn(distribution.files,key))throw Error('Unregistered vocabulary file.');
 return distribution.baseUrl+key;
}
export async function verifyOntologyBytes(path:string,bytes:Uint8Array<ArrayBuffer>){
 const files=distribution.files as Record<string,{bytes:number;sha256:string;expandedBytes?:number;expandedSha256?:string}>;
 const expected=files[path.replace(/^\/ledger-data\//,'')];
 if(!expected)throw Error('Unregistered vocabulary file.');
 const packed=bytes[0]===0x1f&&bytes[1]===0x8b;
 const size=packed?expected.bytes:expected.expandedBytes;
 const hash=packed?expected.sha256:expected.expandedSha256;
 if(bytes.length!==size||!hash)throw Error('Vocabulary integrity check failed.');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 if([...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')!==hash)throw Error('Vocabulary integrity check failed.');
}
export async function fetchOntologyFile(path:string):Promise<unknown>{
 const response=await fetch(ontologyAssetUrl(path),{cache:'no-cache'});if(!response.ok)throw Error('Vocabulary file unavailable.');
 const bytes=new Uint8Array(await response.arrayBuffer());
 await verifyOntologyBytes(path,bytes);
 // A browser may already have decoded an HTTP Content-Encoding. Inspect the actual bytes.
 const text=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);
 return JSON.parse(text);
}
export function selectOntologyRows(rows:SearchRow[],query:string,options:{sources?:string[];obsolete?:boolean;offset?:number;limit?:number}={}){
 const norm=normalizeOntologyText(query),words=ontologyWords(norm).filter(w=>w.length>=2);
 if(!words.length)return {hits:[] as OntologyHit[],total:0};
 const found=new Map<string,OntologyHit>();
 for(const [matched,key,source,label,deprecated] of rows){
  if((deprecated&&!options.obsolete)||(options.sources&&!options.sources.includes(source)))continue;
  const tokens=ontologyWords(matched);if(!words.every(w=>tokens.some(t=>t.startsWith(w))))continue;
  const exact=matched===norm,prior=found.get(key);
  if(prior){if(!prior.sources.includes(source))prior.sources.push(source);if(exact&&!prior.exact){prior.label=label;prior.matched=matched;prior.exact=true;}}
  else found.set(key,{key,label,matched,sources:[source],exact});
 }
 const all=[...found.values()].sort((a,b)=>Number(b.exact)-Number(a.exact)||a.label.localeCompare(b.label)||a.key.localeCompare(b.key));
 const offset=Math.max(0,options.offset??0),limit=Math.max(1,Math.min(100,options.limit??30));
 return {hits:all.slice(offset,offset+limit),total:all.length};
}
export async function searchOntology(query:string,options:Parameters<typeof selectOntologyRows>[2]={},read:(path:string)=>Promise<unknown>=fetchOntologyFile){
 const first=ontologyWords(query).find(w=>w.length>=2);if(!first)return {hits:[],total:0};
 const hash=await ontologyHash(first.slice(0,2));const rows=await read(`/ledger-data/search/${hash.slice(0,2)}.json.gz`) as SearchRow[];
 return selectOntologyRows(rows,query,options);
}
export async function readOntologyRecord(key:string,read:(path:string)=>Promise<unknown>=fetchOntologyFile){
 if(!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid record key.');
 const shard=await read(`/ledger-data/records/${key.slice(0,2)}.json.gz`) as Record<string,OntologyRecord>;
 return shard[key]??null;
}
