/* SPDX-License-Identifier: GPL-3.0-only */
const fs=require('fs'),path=require('path'),O=require('./engine.js');
const d=__dirname,a=JSON.parse(fs.readFileSync(path.join(d,'CAMPAIGN_RESULTS.json')));
const rows=[],failures=[];
for(const r of a.rows){
 try{
  const s=O.simulate({...r.config,dt:.125,sampleEvery:30});
  rows.push({id:r.id,divisions:s.events.length,coarseDivisions:r.divisions,
    firstDivisionHours:s.events[0]?.t/60||null,descendants:s.final.descendants,finalVolume:s.final.y[0],
    volumeError:s.diagnostics.maxVolumeIdentityRelativeError});
 }catch(e){failures.push({id:r.id,error:e.message});}
 if(rows.length%200===0)console.log('Refined',rows.length);
}
const out={attempted:a.rows.length,successful:rows.length,failures,
 fineStepMinutes:.125,coarseStepMinutes:.5,
 divisionCountChanged:rows.filter(r=>r.divisions!==r.coarseDivisions).length,
 maxVolumeError:Math.max(...rows.map(r=>r.volumeError)),rows};
fs.writeFileSync(path.join(d,'REFINEMENT_RESULTS.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify({...out,rows:undefined},null,2));
