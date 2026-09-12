// IndexedDB keeps recordings on this browser. No upload or cloud account.
export class Archive{
 constructor(){this.db=null;this.run=null;this.serial=0;this.queue=[];this.writing=Promise.resolve()}
 async open(){
  if(this.db)return;
  this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('ida-lab-v1',1);r.onupgradeneeded=()=>{
    r.result.createObjectStore('runs',{keyPath:'id'});r.result.createObjectStore('chunks',{keyPath:['run','serial']}).createIndex('run','run');
   };r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 }
 async transaction(store,mode,fn){
  await this.open();return new Promise((resolve,reject)=>{const tx=this.db.transaction(store,mode);let result;
   try{result=fn(tx.objectStore(store))}catch(e){reject(e);return}
   tx.oncomplete=()=>resolve(result?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage aborted'));
  });
 }
 async start(manifest){this.writing=Promise.resolve();this.run=manifest;this.serial=0;this.queue=[];await this.transaction('runs','readwrite',s=>s.put(manifest))}
 add(type,data){if(this.run)this.queue.push({type,wall_ms:Date.now(),monotonic_ms:performance.now(),...data})}
 flush(){
  if(!this.run||!this.queue.length)return this.writing;
  const batch=this.queue;this.queue=[];const chunk={run:this.run.id,serial:this.serial++,records:batch};
  this.writing=this.writing.then(()=>this.transaction('chunks','readwrite',s=>s.put(chunk)));return this.writing;
 }
 async finish(summary){await this.flush();this.run={...this.run,state:'complete',summary};await this.transaction('runs','readwrite',s=>s.put(this.run));const run=this.run;this.run=null;return run}
 async list(){return (await this.transaction('runs','readonly',s=>s.getAll())).sort((a,b)=>b.created_ms-a.created_ms)}
 async export(id){
  const manifest=await this.transaction('runs','readonly',s=>s.get(id));
  const chunks=await this.transaction('chunks','readonly',s=>s.index('run').getAll(IDBKeyRange.only(id)));
  return {schema:'ida-lab-session/1',manifest,records:chunks.sort((a,b)=>a.serial-b.serial).flatMap(x=>x.records)};
 }
}
