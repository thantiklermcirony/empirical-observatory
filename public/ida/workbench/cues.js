export function cueAt(manifest,time){
 if(!manifest||!Number.isFinite(time))return null;
 // During a dissolve, identify the incoming cue; the manifest retains both intervals.
 let active=null;for(const e of manifest.timeline)if(time>=e.onset_s&&time<e.offset_s)active=e;
 return active;
}
