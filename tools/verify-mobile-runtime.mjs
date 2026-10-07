import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),base=process.argv[2];
assert(base&&['localhost','127.0.0.1'].includes(new URL(base).hostname));
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!==new URL(base).hostname)return route.abort();if(/\.(webp|png|mp3|wav)$/.test(u.pathname))await new Promise(resolve=>setTimeout(resolve,2500));await route.continue().catch(e=>{if(!/already handled|closed/.test(e.message))throw e;});});
 const started=Date.now();await page.goto(base+'?demo=1',{waitUntil:'domcontentloaded'});await page.locator('#seat option[value="01"]').waitFor({state:'attached'});const firstScreenMs=Date.now()-started;
 assert(firstScreenMs<2500,'First screen waited for delayed media: '+firstScreenMs);assert.equal(await page.locator('.prepare-dialog[open]').count(),0);
 console.log(JSON.stringify({firstScreenMs}));const clockPage=await browser.newPage();
 await clockPage.route('**/__clock-qa.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body>'}));await clockPage.goto(new URL('__clock-qa.html',base).href);
 const clock=await clockPage.evaluate(async()=>{
  const {BattleSprite}=await import('./battle-sprite.js?v=20261007-ipad1'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const c=document.createElement('canvas');c.style.cssText='width:200px;height:200px';document.body.append(c);const rig=new BattleSprite(c);await rig.character('knight');let draws=0;const real=rig.draw.bind(rig);rig.draw=(...a)=>{draws++;real(...a);};
  await sleep(150);draws=0;await sleep(1000);const idle=draws;rig.play('attack');draws=0;await sleep(900);const attack=draws;
  c.style.display='none';await sleep(150);draws=0;await sleep(300);const hidden=draws;
  c.style.display='block';draws=0;await sleep(300);const resumed=draws;c.remove();await sleep(150);const disposed=rig.disposed;return{idle,attack,hidden,resumed,disposed};
 });
 assert(clock.idle>=8&&clock.idle<=14,JSON.stringify(clock));assert(clock.attack>=20&&clock.attack<=29,JSON.stringify(clock));assert.equal(clock.hidden,0);assert(clock.resumed>0);assert.equal(clock.disposed,true);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({firstScreenMs,mediaDelayMs:2500,noStartupModal:true,clock,errors}));
}finally{await browser.close();}
