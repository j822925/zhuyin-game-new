import test from 'node:test';
import assert from 'node:assert/strict';
import {mixedSource} from '../adventure-mixed-questions.js';
import {districtLayout} from '../data/neighborhood-landmarks.js';
import {neighborhoods} from '../data/island-neighborhoods.js';
import {laneContains,laneRoute} from '../adventure-district-paths.js';
import {communityCamera} from '../adventure-community-camera.js';

test('ten villages connect spawn, resident, street ends and return without clipping corners',()=>{
 const point=([x,y])=>({x,y});
 for(const id of Object.keys(neighborhoods)){
  const l=districtLayout(id);
  for(const dest of [l.return,l.resident,...l.streets.map(s=>s.at(-1))]){
   let last=point(l.villageSpawn);
   const path=laneRoute(l,last,point(dest),true);assert(path.length,id);
   for(const next of path){
    for(let n=0;n<=20;n++)assert(laneContains(l,{x:last.x+(next.x-last.x)*n/20,y:last.y+(next.y-last.y)*n/20},true),id);
    last=next;
   }
   assert.deepEqual(last,point(dest));
  }
 }
});
test('community camera keeps aspect ratio, bounds zoom and can show the whole village',()=>{
 for(const [w,h] of [[1024,768],[390,844],[844,390]]){
  const a=communityCamera(w,h,.001,{x:.9,y:.2}),b=communityCamera(w,h,99,{x:.9,y:.2});
  assert(a.width<=w+.001&&a.height<=h+.001);assert.equal(b.scale,2.2);
  assert.equal(b.width/b.height,1.5);assert(b.left<=0&&b.top<=0&&b.left+b.width>=w&&b.top+b.height>=h);
 }
});
test('listening offers only enabled sounds and invalidates results on a login change',async()=>{
 let valid=true,reads=0;
 const src=mixedSource({current:()=>valid,async read(route){assert.equal(route,'config');reads++;return {symbols:['ㄅ','ㄚ'],compounds:[]};}},()=>.999);
 const sig=new AbortController().signal;
 for(let i=0;i<2;i++){const q=await src.next(sig);assert.equal(q.mode,'single');assert.deepEqual(q.choices.sort(),['ㄅ','ㄚ'].sort());}
 assert.equal(reads,1);valid=false;await assert.rejects(src.next(sig),/重新/);
 const changed=mixedSource({current:()=>!valid,async read(){valid=true;return {symbols:['ㄅ']};}},()=>.999);
 await assert.rejects(changed.next(sig),/重新/);
});
