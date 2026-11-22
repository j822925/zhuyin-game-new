import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {LESSON_HARVEST_ART} from '../data/lesson-harvest-art.js';
import {LESSON_CROPS,LESSON_RECIPES} from '../data/lesson-harvest-foods.js';
import {HOME_ATLASES} from '../data/home-furniture.js';
import {ensureHomeArt} from '../adventure-home-art.js';
import {drawFarmPlant} from '../adventure-farm-feedback.js';

test('six new crops and meals resolve to complete lightweight transparent WebP cells',async()=>{
 for(const [key,catalog] of [['lessonCrops',LESSON_CROPS],['lessonMeals',LESSON_RECIPES]]){
  const atlas=LESSON_HARVEST_ART[key],bytes=await fs.readFile(new URL('../'+atlas.src,import.meta.url));
  assert.equal(HOME_ATLASES[key],atlas.src);assert.equal(atlas.cells.length,6);
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.equal(bytes.subarray(12,16).toString(),'VP8X');
  assert(bytes[20]&16,'alpha channel must survive compression');assert(bytes.length<230000);
  const width=bytes.readUIntLE(24,3)+1,height=bytes.readUIntLE(27,3)+1;
  assert.deepEqual([width,height],[1056,704]);
  assert.deepEqual(Object.values(catalog).map(item=>item.art),[0,1,2,3,4,5]);
  for(const item of Object.values(catalog)){
   assert.equal(item.atlas,key);const cell=atlas.cells[item.art];
   assert(cell.w>200&&cell.h>250);assert(cell.x>0&&cell.y>0);
   assert(cell.x+cell.w<width&&cell.y+cell.h<height);
  }
 }
});

test('farm and kitchen can load the new art on demand without duplicate requests or furniture downloads',async()=>{
 const original=globalThis.Image,loaded=[];globalThis.Image=class{async decode(){loaded.push(this.src);}};
 try{
  const art={};await Promise.all([ensureHomeArt(art,['lessonCrops']),ensureHomeArt(art,['lessonCrops','lessonMeals'])]);
  await ensureHomeArt(art,['lessonCrops','lessonMeals']);
  assert.equal(loaded.length,2);assert.equal(new Set(loaded).size,2);assert.equal(art.spatial,undefined);
  for(const key of ['lessonCrops','lessonMeals'])assert.equal(art[key].cells,LESSON_HARVEST_ART[key].cells);
  for(const [crop,definition] of Object.entries(LESSON_CROPS)){
   const draws=[],ctx={save(){},restore(){},translate(){},rotate(){},drawImage(...args){draws.push(args);}};
   drawFarmPlant(ctx,art,{x:100,y:100,stage:'ready',crop,index:0,now:0,reduced:true});
   assert.equal(draws.length,1);assert.equal(draws[0][0],art.lessonCrops.image);
   const cell=LESSON_HARVEST_ART.lessonCrops.cells[definition.art];assert.deepEqual(draws[0].slice(1,5),[cell.x,cell.y,cell.w,cell.h]);
  }
 }finally{globalThis.Image=original;}
});
