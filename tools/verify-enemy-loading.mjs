import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.argv[2];assert(base,'Pass a preview URL');
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true});
try{
 const page=await browser.newPage({viewport:{width:768,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const fixture=new URL('__battle-loading.html',base).href;
 await page.route('**/__battle-loading.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="battle-rpg.css?v=20261007-ipad1"><style>.opponent-art{width:480px;height:480px}.practice-opponent{width:480px}</style><body>'}));
 const counts=new Map();let manualFailure=true;
 await page.route('**/assets/battle-ipad-v1/**',async r=>{
  const url=new URL(r.request().url()),id=url.pathname.split('/').pop().replace('.webp',''),n=(counts.get(id)||0)+1;counts.set(id,n);
  if(id==='ember-witch'||id==='eclipse-duke')await new Promise(resolve=>setTimeout(resolve,id==='ember-witch'?650:1200));
  if((id==='coin-mimic'&&n===1)||(id==='sugar-devil'&&n<=2)||(id==='storm-griffin'&&manualFailure))return r.fulfill({contentType:'image/webp',body:'corrupt cached image'});
  await r.continue();
 });
 await page.goto(fixture);await page.evaluate(async()=>{
  const {createOpponent,updateOpponent}=await import('./character-battle.js?v=20261007-ipad1'),{MONSTERS}=await import('./data/monsters.js?v=20261004-villains1'),{playMonster}=await import('./monster-motion.js?v=20261007-ipad1');
  window.enemy=createOpponent();document.body.append(enemy);window.changeEnemy=id=>updateOpponent(enemy,MONSTERS.find(m=>m.id===id),10,0);window.enemyAction=action=>playMonster(enemy,action);
 });
 const ready=id=>page.waitForFunction(id=>enemy.dataset.rigStatus==='ready'&&enemy.querySelector('canvas').dataset.ready===id,id);
 await page.evaluate(()=>changeEnemy('raven-masquerade'));await ready('raven-masquerade');
 await page.evaluate(()=>{changeEnemy('ember-witch');enemyAction('guard');});
 const loading=await page.evaluate(()=>{const canvas=enemy.querySelector('canvas');return{ready:canvas.dataset.ready,status:enemy.dataset.rigStatus,portrait:getComputedStyle(enemy.querySelector('img')).visibility,transform:getComputedStyle(canvas).transform,empty:!canvas.getContext('2d').getImageData(0,0,480,480).data.some(v=>v!==0)};});
 assert.equal(loading.ready,undefined);assert.equal(loading.status,'loading');assert.equal(loading.portrait,'hidden');assert.equal(loading.transform,'none');assert(loading.empty);
 await ready('ember-witch');await page.waitForTimeout(400);assert.equal(await page.locator('.monster-canvas').getAttribute('data-action'),'guard');assert.equal(await page.locator('.monster-canvas').getAttribute('data-pose'),'6');
 await page.evaluate(()=>changeEnemy('eclipse-duke'));await page.waitForTimeout(50);await page.evaluate(()=>changeEnemy('ink-book-spirit'));await ready('ink-book-spirit');await page.waitForTimeout(1400);
 assert.equal(await page.locator('.monster-canvas').getAttribute('data-ready'),'ink-book-spirit');assert.equal(await page.locator('.opponent-caption').innerText(),'墨汁小書靈');
 await page.evaluate(()=>changeEnemy('coin-mimic'));await ready('coin-mimic');assert.equal(counts.get('coin-mimic'),2);
 await page.evaluate(()=>changeEnemy('sugar-devil'));await page.waitForFunction(()=>enemy.dataset.rigStatus==='retry');await ready('sugar-devil');assert.equal(counts.get('sugar-devil'),3);
 await page.evaluate(()=>changeEnemy('storm-griffin'));await page.waitForFunction(()=>enemy.dataset.rigStatus==='retry');await page.waitForTimeout(1800);await page.waitForFunction(()=>enemy.dataset.rigStatus==='retry');assert.equal(counts.get('storm-griffin'),4);manualFailure=false;await page.locator('.monster-motion-status').click();await ready('storm-griffin');assert.equal(counts.get('storm-griffin'),5);
 // Reusing a detached arena must restart its disposed renderer.
 await page.evaluate(()=>enemy.remove());await page.waitForTimeout(100);await page.evaluate(()=>{document.body.append(enemy);changeEnemy('storm-griffin');});await ready('storm-griffin');
 // A second character() call on the same canvas must not keep old frames.
 await page.evaluate(async()=>{const {BattleSprite}=await import('./battle-sprite.js?v=20261007-ipad1');const canvas=document.createElement('canvas'),rig=new BattleSprite(canvas);await rig.character('coin-mimic');rig.draw(0,0);const slow=rig.character('mistblade-wolf');if(canvas.dataset.ready||rig.frames)throw Error('Old actor retained while loading');const newer=rig.character('ink-book-spirit');await Promise.all([slow,newer]);if(canvas.dataset.ready!=='ink-book-spirit'||rig.id!=='ink-book-spirit')throw Error('A late actor replaced the current actor');rig.dispose();});
 // Loading transitions never shrink a portrait into a differently scaled pose.
 for(const width of [390,768,1280]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>{enemyAction('attack');});await page.waitForTimeout(550);assert.equal(await page.locator('.monster-canvas').getAttribute('data-ready'),'storm-griffin');assert.equal(await page.locator('.monster-canvas').getAttribute('data-facing'),'right');}
 assert.deepEqual(errors,[]);const report={base,oldEnemyCleared:true,lateLoadCannotReplaceEnemy:true,oldTallScaleCleared:true,pendingAnswerReplayed:true,corruptCacheRecovered:true,automaticRetry:true,manualRetry:true,sameCanvasRaceSafe:true,errors};console.log(JSON.stringify(report));if(process.env.TEST_REPORT)fs.writeFileSync(process.env.TEST_REPORT,JSON.stringify(report,null,2));
}finally{await browser.close();}
