// Compare the delivery assets to authored art at actual battle-canvas size.
// Run against a local static preview; never signs into a student's account.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.argv[2],output=path.resolve(process.argv[3]||'.local/mobile-art-qa');
assert(base&&['localhost','127.0.0.1'].includes(new URL(base).hostname));
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__mobile-qa.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body>'}));
 await page.goto(new URL('__mobile-qa.html',base).href);
 const ids=await page.evaluate(async()=>Object.keys((await import('./data/battle-catalog.js')).BATTLE_META)),reports=[];
 for(const [index,id]of ids.entries()){
  const result=await page.evaluate(async id=>{
   const {BattleSprite,battleEffectOrigin}=await import('./battle-sprite.js?v=20261007-ipad1');
   const make=()=>{const c=document.createElement('canvas');c.getContext('2d',{willReadFrequently:true});return new BattleSprite(c,{side:'hero'});};
   const source=make(),mobile=make();await source.character(id,{originalArt:true});await mobile.character(id);
   let geometry=0,mae=0,originDelta=0,boundsDelta=0;const n=source.frames.length;
   const frames=source.starFrame?[...source.frames,source.starFrame]:source.frames;
   const packed=mobile.starFrame?[...mobile.frames,mobile.starFrame]:mobile.frames;
   if(frames.length!==packed.length)throw Error('Frame count '+id);
   for(let i=0;i<frames.length;i++){const a=frames[i],b=packed[i];geometry=Math.max(geometry,...a.pivot.map((v,k)=>Math.abs(v*a.scale-b.pivot[k]*b.scale)),Math.abs(a.image.width*a.scale-b.image.width*b.scale),Math.abs(a.image.height*a.scale-b.image.height*b.scale));if(b.image.width>512||b.image.height>512)throw Error('Oversized pose '+id);}
   const poses=n===12?[['idle',0],['attack',.17],['attack',.3],['attack',.45],['attack',.6],['attack',.8],['guard',.3],['hurt',.4],['hurt',.7],['victory',.5],['star',.8],['defeated',.5]]:[['idle',0],['attack',.17],['attack',.33],['attack',.5],['hurt',.4],['hurt',.75],['victory',.5],['defeated',.5],...(source.starFrame?[['star',.8]]:[])];
   for(const [action,t]of poses){source.action=mobile.action=action;source.draw(t,0);mobile.draw(t,0);const a=source.ctx.getImageData(0,0,480,480).data,b=mobile.ctx.getImageData(0,0,480,480).data;let sum=0;for(let k=0;k<a.length;k++)sum+=Math.abs(a[k]-b[k]);mae=Math.max(mae,sum/a.length);const p=battleEffectOrigin(source.canvas),q=battleEffectOrigin(mobile.canvas);if(p&&q)originDelta=Math.max(originDelta,Math.abs(p.x-q.x),Math.abs(p.y-q.y));if(source.canvas.dataset.bounds){const a=JSON.parse(source.canvas.dataset.bounds),b=JSON.parse(mobile.canvas.dataset.bounds);for(const key of Object.keys(a))boundsDelta=Math.max(boundsDelta,Math.abs(a[key]-b[key]));}}
   let contact;
   if(['knight','rabbit','crimson-moth-lady','mirror-countess','ink-book-spirit','silver-wolf-marquis'].includes(id)){
    const c=document.createElement('canvas');c.width=720;c.height=480;const ctx=c.getContext('2d');ctx.fillStyle='#f3eee4';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#37434c';ctx.font='16px sans-serif';ctx.fillText(id+' — original / mobile',12,22);
    for(const [i,[action,t]]of [['idle',0],['attack',.45],['hurt',.4]].entries()){source.action=mobile.action=action;source.draw(t,0);mobile.draw(t,0);ctx.drawImage(source.canvas,i*240,30,240,240);ctx.drawImage(mobile.canvas,i*240,250,240,240);}contact=c.toDataURL('image/png').split(',')[1];
   }
   source.dispose();mobile.dispose();return{id,poses:poses.length,geometry,mae,originDelta,boundsDelta,contact};
  },id);
  if(result.contact){fs.writeFileSync(path.join(output,id+'.png'),Buffer.from(result.contact,'base64'));delete result.contact;}
  assert(result.geometry<2,id+' altered dimensions '+result.geometry);assert(result.mae<5,id+' visible art difference '+result.mae);assert(result.originDelta<2,id+' projectile origin '+result.originDelta);assert(result.boundsDelta<2,id+' bounds '+result.boundsDelta);reports.push(result);if(index%10===0)console.log((index+1)+'/'+ids.length);
 }
 assert.deepEqual(errors,[]);
 const summary={characters:reports.length,poses:reports.reduce((n,r)=>n+r.poses,0),maxPixelDifference:Math.max(...reports.map(r=>r.mae)),maxGeometryDelta:Math.max(...reports.map(r=>r.geometry)),maxProjectileDelta:Math.max(...reports.map(r=>r.originDelta)),errors,reports};
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,reports:undefined}));
}finally{await browser.close();}
