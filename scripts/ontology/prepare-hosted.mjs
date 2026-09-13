/** Omit only byte-verified, externally preserved ledger data from the generated deployment. */
import {readFile,unlink} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const config=JSON.parse(await readFile(new URL('../../lib/ontology-distribution.json',import.meta.url),'utf8'));
if(!/^[a-f0-9]{40}$/.test(config.revision)||config.baseUrl!==`https://raw.githubusercontent.com/thantiklermcirony/empirical-observatory/${config.revision}/public/ledger-data/`)throw Error('Invalid pinned data location.');
const root=resolve('dist/client/ledger-data'),targets=[];
for(const [name,expected] of Object.entries(config.files)){
 if(!/^(records|search|sources)\/[a-zA-Z0-9_.-]+$/.test(name))throw Error('Invalid generated asset path.');
 const target=resolve(root,name);if(relative(root,target).startsWith('..'))throw Error('Path escapes generated data directory.');
 const bytes=await readFile(target);
 if(bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('Generated dataset differs from preserved snapshot: '+name);
 targets.push(target);
}
for(const target of targets)await unlink(target);
console.log(`Hosted ledger uses ${targets.length} byte-pinned external assets; local source and audit files remain intact.`);
