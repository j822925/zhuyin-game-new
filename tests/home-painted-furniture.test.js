import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {FURNITURE} from '../adventure-model.js';
import {HOME_PERSPECTIVE_ART} from '../data/home-perspective-art.js';
import {paintedFurnitureSprite,paintedFurnitureBounds,drawPaintedFurniture} from '../home-painted-furniture.js';

const art={perspective:Object.fromEntries(Object.entries(HOME_PERSPECTIVE_ART).map(([key,meta])=>[key,{image:{key},cells:meta.cells}]))};
test('all six native corner and cabinet styles have bounded, immutable transparent atlases',()=>{
 assert.equal(Object.keys(HOME_PERSPECTIVE_ART).length,13);
 for(const meta of Object.values(HOME_PERSPECTIVE_ART)){
  const bytes=fs.readFileSync(new URL('../'+meta.src,import.meta.url));
  assert.ok(meta.src.includes(createHash('sha256').update(bytes).digest('hex').slice(0,12)));
  for(const c of Object.values(meta.cells)){assert.ok(c.x>=0&&c.y>=0&&c.w>0&&c.h>0&&c.x+c.w<=meta.width&&c.y+c.h<=meta.height);}
 }
});
test('whole painted side cutouts keep their natural proportions and upright axes in both orientations',()=>{
 for(const theme of ['daisy','fox','moon','honey','ocean','berry'])for(const role of ['kitchen-base','kitchen-wall','bookcase'])for(const facing of ['left','right']){
  const f=FURNITURE.find(f=>f.id==='collection-'+theme+'-'+role),p={x:facing==='left'?200:1080,y:490,facing,mount:facing};
  const sprite=paintedFurnitureSprite(art,f,p),r=paintedFurnitureBounds(art,f,p);assert.ok(sprite);
  assert.ok(Math.abs(r.w/r.h-sprite.cell.w/sprite.cell.h)<1e-10);
  const calls=[],c={save(){},restore(){},translate(){},scale(x,y){assert.ok(Math.abs(x)===1&&y===1);},drawImage(...args){calls.push(args);},transform(){assert.fail('Painted solids must never be sheared');}};
  assert.equal(drawPaintedFurniture(c,art,f,p),true);assert.equal(calls.length,1);
 }
});
test('oven and other tabletop appliances resolve a real side drawing after attachment and JSON reload',()=>{
 for(const id of ['collection-port-1','collection-port-2','collection-port-3','collection-port-4','collection-port-5','collection-port-8'])for(const facing of ['left','right']){
  const f=FURNITURE.find(f=>f.id===id),p=JSON.parse(JSON.stringify({id,x:500,y:318,on:'collection-moon-kitchen-base',surface:0,offsetX:0,facing}));
  const sprite=paintedFurnitureSprite(art,f,p);assert.ok(sprite);assert.equal(sprite.atlas.image.key,'appliances');assert.equal(sprite.mirror,facing==='right');
  assert.equal(paintedFurnitureSprite(art,f,{...p,facing:'front'}),null);
 }
});
test('both complete painted L units leave a generous gap ahead of the doorway',()=>{
 for(const theme of ['daisy','fox','moon','honey','ocean','berry'])for(const facing of ['left','right']){
  const f=FURNITURE.find(f=>f.corner&&f.style===theme),p={x:facing==='left'?410:870,y:500,facing,mount:'corner-'+facing};
  const r=paintedFurnitureBounds(art,f,p);assert.equal(r.y+r.h,500);assert.ok(590-(r.y+r.h)>=90);assert.equal(r.w,570);
 }
});
