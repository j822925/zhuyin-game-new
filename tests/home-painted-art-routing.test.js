import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FURNITURE} from '../data/home-furniture.js';
import {HOME_PERSPECTIVE_ART as META} from '../data/home-perspective-art.js';
import {ensurePaintedFurniture,paintedFurnitureSprite,paintedFurnitureBounds} from '../home-painted-furniture.js';
import {furnitureSurfaces} from '../furniture-surfaces.js';

const themes=['daisy','fox','moon','honey','ocean','berry'];
const art={perspective:Object.fromEntries(Object.entries(META).map(([key,m])=>[key,{image:{key},cells:m.cells}]))};
const byId=id=>{const f=FURNITURE.find(f=>f.id===id);assert(f,id+' exists');return f;};
const expected=new Map();
for(const theme of themes){
 for(const role of ['kitchen-base','appliance-counter'])expected.set(`collection-${theme}-${role}`,[theme+'Cabinet','base']);
 expected.set(`collection-${theme}-kitchen-wall`,[theme+'Cabinet','wall']);
 for(const role of ['bookcase','display-cabinet'])expected.set(`collection-${theme}-${role}`,[theme+'Side','bookcase']);
 expected.set(`spatial-${theme}-corner-kitchen`,[theme+'Corner','corner']);
}
for(const [theme,id] of Object.entries({daisy:'daisy-stove',fox:'fox-stove',moon:'moon-stove',honey:'honey-range',ocean:'ocean-complete-stove',berry:'berry-complete-stove'}))expected.set(id,[theme+'Side','stove']);
for(const [theme,id] of Object.entries({daisy:'daisy-fridge',fox:'fox-complete-fridge',moon:'moon-complete-fridge',honey:'honey-complete-fridge',ocean:'ocean-complete-fridge',berry:'berry-complete-fridge'}))expected.set(id,[theme+'Side','fridge']);
expected.set('port-fridge',['honeySide','fridge']);
for(const [suffix,cell] of Object.entries({1:'tv',2:'microwave',3:'oven',4:'rice',5:'stereo',8:'blender'}))expected.set('collection-port-'+suffix,['appliances',cell]);
for(const [theme,id] of Object.entries({daisy:'daisy-sink',fox:'fox-complete-sink',moon:'moon-complete-sink',honey:'honey-complete-sink',ocean:'ocean-vanity',berry:'berry-complete-sink'}))expected.set(id,['sinks',theme]);

test('all 61 purchased IDs route to the intended style and cell, including ocean vanity and port fridge aliases',()=>{
 assert.equal(expected.size,61);
 const actual=FURNITURE.filter(f=>paintedFurnitureSprite(art,f,{facing:'left'})).map(f=>f.id).sort();
 assert.deepEqual(actual,[...expected.keys()].sort());
 for(const [id,[key,cell]] of expected)for(const facing of ['left','right']){
  const f=byId(id),p={x:600,y:490,facing,mount:facing},s=paintedFurnitureSprite(art,f,p),bounds=paintedFurnitureBounds(art,f,p);
  assert.equal(s.atlas,art.perspective[key],id+' '+facing);assert.equal(s.name,cell,id);assert.equal(s.mirror,facing==='right');
  assert(Object.values(bounds).every(Number.isFinite),id+' finite bounds');assert(bounds.w>0&&bounds.h>0,id+' positive bounds');
  assert(Math.abs(bounds.w/bounds.h-s.cell.w/s.cell.h)<1e-10,id+' keeps native proportions');
  if(!f.corner)assert.equal(paintedFurnitureSprite(art,f,{...p,facing:'front'}),null,id+' front remains original');
 }
});

test('the six real sink IDs have no inherited shelf/tabletop attachment rule',()=>{
 for(const [id,[key]] of expected)if(key==='sinks')for(const facing of ['front','left','right']){
  assert.deepEqual(furnitureSurfaces(byId(id),{id,x:600,y:490,facing,mount:facing}),[],id);
 }
});

function webpDimensions(buffer){
 assert.equal(buffer.toString('ascii',0,4),'RIFF');assert.equal(buffer.toString('ascii',8,12),'WEBP');
 for(let offset=12;offset+8<=buffer.length;){
  const type=buffer.toString('ascii',offset,offset+4),size=buffer.readUInt32LE(offset+4),p=offset+8;
  if(type==='VP8X')return [buffer.readUIntLE(p+4,3)+1,buffer.readUIntLE(p+7,3)+1];
  if(type==='VP8L'){const n=buffer.readUInt32LE(p+1);return [(n&0x3fff)+1,((n>>>14)&0x3fff)+1];}
  if(type==='VP8 ')return [buffer.readUInt16LE(p+6)&0x3fff,buffer.readUInt16LE(p+8)&0x3fff];
  offset=p+size+(size%2);
 }
 assert.fail('No WebP dimensions');
}
test('all 48 native sprite cells match real atlas dimensions and every cell is used by a product',()=>{
 let cells=0;
 const used=new Set([...expected.values()].map(([key,cell])=>key+'/'+cell));
 for(const [key,meta] of Object.entries(META)){
  const buffer=fs.readFileSync(new URL('../'+meta.src,import.meta.url));
  assert.deepEqual(webpDimensions(buffer),[meta.width,meta.height],key);
  for(const [name,c] of Object.entries(meta.cells)){
   cells++;assert(used.has(key+'/'+name),key+'/'+name+' is not orphaned');
   assert(c.x>=0&&c.y>=0&&c.w>0&&c.h>0&&c.x+c.w<=meta.width&&c.y+c.h<=meta.height,key+'/'+name+' bounds');
  }
 }
 assert.equal(cells,48);
});

test('concurrent room loads share decoded artwork; another style loads only its three atlases',async()=>{
 const prior=globalThis.Image,calls=[];
 globalThis.Image=class{async decode(){calls.push(this.src);await Promise.resolve();}};
 try{
  const a={};await Promise.all([ensurePaintedFurniture(a,['moon','moon']),ensurePaintedFurniture(a,['moon'])]);
  assert.equal(calls.length,5);assert.equal(new Set(calls).size,5);
  await ensurePaintedFurniture(a,['daisy']);assert.equal(calls.length,8);
  assert.deepEqual(Object.keys(a.perspective).sort(),['appliances','sinks','moonSide','moonCorner','moonCabinet','daisySide','daisyCorner','daisyCabinet'].sort());
 }finally{globalThis.Image=prior;}
});

test('failed artwork decode can retry without refetching already decoded atlases',async()=>{
 const prior=globalThis.Image,calls=new Map();let fail=true;
 globalThis.Image=class{async decode(){calls.set(this.src,(calls.get(this.src)||0)+1);if(this.src===META.sinks.src&&fail){fail=false;throw Error('simulated offline');}}};
 try{
  const a={};await assert.rejects(ensurePaintedFurniture(a,['moon']),/simulated offline/);
  await ensurePaintedFurniture(a,['moon']);assert(a.perspective.sinks);
  assert.equal(calls.get(META.sinks.src),2);
  for(const [src,count] of calls)if(src!==META.sinks.src)assert.equal(count,1,src);
 }finally{globalThis.Image=prior;}
});
