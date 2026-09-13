/* SPDX-License-Identifier: GPL-3.0-only */
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 let browser;
 try{browser=await require('playwright').chromium.launch({headless:true});}
 catch(e){const r={status:'not-run',reason:'Chromium executable unavailable; attempted browser download timed out. No visual/browser verification claimed.',error:e.message.split('\n')[0]};fs.writeFileSync(path.join(__dirname,'BROWSER_TESTS.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));return;}
 const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto('file://'+path.join(__dirname,'Chlamydomonas_Observatory.html'));
  await p.waitForFunction(()=>window.OrganismLab?.state.runs.length===1);
  await p.click('[data-demo="dose"]');await p.waitForFunction(()=>window.OrganismLab.state.runs.length===2&&!document.getElementById('run').disabled);
  assert.deepEqual(await p.evaluate(()=>OrganismLab.state.runs.map(r=>r.final.descendants)),[1,8]);
  await p.click('#play');await p.waitForTimeout(400);await p.click('#play');
  assert((await p.evaluate(()=>OrganismLab.state.currentTime))>0);
  await p.click('[data-pane="links"]');await p.selectOption('#node','M');assert((await p.textContent('#nodeDetail')).includes('M-phase'));
  await p.click('[data-demo="evidence"]');assert((await p.textContent('#empiricalTable')).includes('3679'));
  await p.click('[data-demo="hidden"]');await p.waitForFunction(()=>!document.getElementById('run').disabled);
  assert((await p.textContent('#finding')).includes('false lead'));
  await p.click('[data-demo="dose"]');await p.waitForFunction(()=>!document.getElementById('run').disabled);
  await p.screenshot({path:path.join(__dirname,'Lab_Desktop.png'),fullPage:true});
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(__dirname,'Lab_Mobile.png'),fullPage:true});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
  assert.deepEqual(errors,[]);const r={status:'passed',interactionChecks:7,consoleErrors:errors};fs.writeFileSync(path.join(__dirname,'BROWSER_TESTS.json'),JSON.stringify(r,null,2));console.log(r);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
