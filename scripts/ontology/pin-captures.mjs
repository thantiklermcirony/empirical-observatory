/** Publish exact source capture links after preserving the dataset in the pinned public revision. */
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../public/ledger-data/',import.meta.url);
const distribution=JSON.parse(await readFile(new URL('../../lib/ontology-distribution.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
for(const source of manifest.sources){
 const local=source.localCaptureDownload??source.captureDownload;
 if(!local.startsWith('/ledger-data/sources/'))throw Error('Unexpected local capture path.');
 const key=local.replace('/ledger-data/','');
 if(!Object.hasOwn(distribution.files,key))throw Error('Capture was not preserved in pinned distribution.');
 source.localCaptureDownload=local;source.captureDownload=distribution.baseUrl+key;
}
manifest.hostedDistribution={revision:distribution.revision,baseUrl:distribution.baseUrl,verification:'Search and record reads require matching SHA-256 and length before parsing.'};
await writeFile(new URL('manifest.json',root),JSON.stringify(manifest));
console.log('Pinned all original capture links. Rerun audit.mjs to bind its receipt to this manifest.');
