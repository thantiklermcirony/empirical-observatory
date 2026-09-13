/** Restore exact public captures; fail closed when a moving upstream URL has changed. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative} from 'node:path';
const root=resolve(process.argv[2]??'.ontology-captures');
const manifest=JSON.parse(await readFile(new URL('./sources.json',import.meta.url),'utf8'));
await mkdir(root,{recursive:true});
for(const s of manifest){
 if(s.status!=='captured')continue;
 const target=resolve(root,s.file);if(relative(root,target).startsWith('..'))throw Error('Unsafe capture path.');
 let bytes;try{bytes=await readFile(target);}catch{/* Missing captures are fetched from their declared source. */}
 if(bytes&&createHash('sha256').update(bytes).digest('hex')===s.sha256){console.log(s.id,'verified existing capture');continue;}
 const response=await fetch(s.url,{method:s.method??'GET',body:s.body,headers:s.method?{'Content-Type':'application/x-www-form-urlencoded'}:undefined,signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error(`${s.id}: HTTP ${response.status}`);
 const parts=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>s.bytes)throw Error(s.id+': source exceeds pinned size; do not silently update.');parts.push(chunk);}
 bytes=Buffer.concat(parts);if(size!==s.bytes||createHash('sha256').update(bytes).digest('hex')!==s.sha256)throw Error(s.id+': content changed. Retrieve the preserved original capture or review a new release.');
 await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);console.log(s.id,'captured and verified');
}
await writeFile(resolve(root,'sources.json'),JSON.stringify(manifest,null,2));
