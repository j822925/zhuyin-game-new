import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/__battle-preparation.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body>Battle preparation test</body>');return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 const mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'};
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=0'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1024,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'__battle-preparation.html');
 await page.evaluate(async()=>{
  window.assets=await import('./asset-cache.js');
  window.preload=await import('./data/battle-preload.js');
  window.loader=await import('./battle-frame-loader.js');
  window.catalog=await import('./data/battle-catalog.js');
  window.characters=await import('./student-profile.js');
  await assets.startMediaCache();
 });
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 // School-like congestion: a valid response arrives after the old 8 s cutoff.
 const slow=await browser.newPage();await slow.goto(base+'__battle-preparation.html');let slowRequests=0;
 await slow.route('**/assets/battle-ipad-v1/ink-book-spirit.webp*',async route=>{slowRequests++;await new Promise(r=>setTimeout(r,9000));await route.continue();});
 const slowCount=await slow.evaluate(async()=>{const {loadPackedBattle}=await import('./battle-frame-loader.js');return (await loadPackedBattle('ink-book-spirit')).frames.length;});
 assert.equal(slowCount,12);assert.equal(slowRequests,1);await slow.close();
 const preparation=await page.evaluate(()=>assets.prepareMedia(preload.BATTLE_PRELOAD));assert.equal(preparation.failed,0);
 // The old worker saves after responding. The new platform worker will await it.
 await page.waitForFunction(async()=>!(await assets.missingMedia(preload.BATTLE_PRELOAD)).length,{},{timeout:30000});
 await page.context().setOffline(true);
 const offline=await page.evaluate(async()=>{
  let poses=0;const ids=[...new Set(characters.PROFILE_CHARACTERS.map(c=>catalog.battleCharacter(c.id)))];
  for(const id of ids){const p=await loader.loadPackedBattle(id);poses+=p.frames.length;
   assertPixels(p.frames[0].image,id);
   for(const f of [...p.frames,...(p.allyStar?[p.allyStar]:[])]){f.image.width=0;f.image.height=0;}
  }
  return {actors:ids.length,poses};
  function assertPixels(canvas,id){if(!canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some(v=>v))throw Error('Empty offline pose '+id);}
 });
 assert.equal(offline.actors,84);assert.deepEqual(errors,[]);
 const report={preparation,offline,slowResponseMs:9000,slowRequests,errors,physicalIPadTested:false};
 console.log(JSON.stringify(report));if(process.env.TEST_REPORT)fs.writeFileSync(process.env.TEST_REPORT,JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
