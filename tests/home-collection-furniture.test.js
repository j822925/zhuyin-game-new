import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {COLLECTION_FURNITURE} from '../data/home-collection-furniture.js';
import {HOME_COLLECTION_ART} from '../data/home-collection-art.js';
import {FURNITURE,freshState,sanitizeState,placeFurniture,storeFurniture,canPlaceFurniture,canUseStove} from '../adventure-model.js';
import {checkoutCart} from '../adventure-cart-model.js';
import {freeSurfacePosition,furnitureSurfaces} from '../furniture-surfaces.js';
import {wallPosition,wallPlacementValid} from '../data/home-wall-furniture.js';
import {restStatus,takeRest} from '../adventure-rest-model.js';
import {ensureHomeArt} from '../adventure-home-art.js';
import {drawHomeRest} from '../adventure-rest-art.js';
const styles=['daisy','fox','moon','honey','ocean','berry'];
const id=(style,role)=>'collection-'+style+'-'+role;
test('six collections buy at published prices, retain unique ownership and never replace existing items',()=>{
 assert.equal(COLLECTION_FURNITURE.length,72);
 const s=freshState(),old=[...s.furnitureOwned];s.stars=10000;s.world.shops=['furniture'];
 const lines=COLLECTION_FURNITURE.map(f=>({kind:'furniture',id:f.id,quantity:1}));
 assert(checkoutCart(s,'furniture',lines).ok);
 assert.equal(s.stars,10000-COLLECTION_FURNITURE.reduce((sum,f)=>sum+f.price,0));
 const restored=sanitizeState(s);
 for(const f of COLLECTION_FURNITURE){assert(restored.furnitureOwned.includes(f.id));assert.equal(FURNITURE.find(x=>x.id===f.id).price,f.price);}
 for(const item of old)assert(restored.furnitureOwned.includes(item));
 assert(!checkoutCart(s,'furniture',lines).ok);
});
test('small decorations attach to TV stands and three shelf levels; moving and storing hosts preserves ownership',()=>{
 for(const style of styles){
  const s=freshState();s.furnitureOwned.push(...[id(style,'tv-stand'),id(style,'bookcase'),'moon-lamp','plush-1','plush-2','plush-3']);s.layout=[];
  assert(placeFurniture(s,id(style,'tv-stand'),{x:550,y:550}));
  assert(placeFurniture(s,id(style,'bookcase'),{x:850,y:530}));
  for(const [item,hostId,level] of [['moon-lamp',id(style,'tv-stand'),0],['plush-1',id(style,'bookcase'),0],['plush-2',id(style,'bookcase'),1],['plush-3',id(style,'bookcase'),2]]){
   const host=s.layout.find(p=>p.id===hostId),pos=freeSurfacePosition(item,host,level,s.layout,FURNITURE);assert(pos,style+' '+item);assert(placeFurniture(s,item,pos));
  }
  const restored=sanitizeState({...s,layout:[...s.layout].reverse()});assert.equal(restored.layout.filter(p=>p.on).length,4);
  assert(placeFurniture(restored,id(style,'bookcase'),{x:500,y:550},undefined,'bedroom'));
  assert.equal(restored.bedroomLayout.filter(p=>p.on===id(style,'bookcase')).length,3);
  assert(storeFurniture(restored,id(style,'bookcase'),'bedroom'));assert(restored.furnitureOwned.includes('plush-2'));
 }
});
test('kitchen and bathroom pieces respect room restrictions; shower shares the existing daily bath allowance',()=>{
 const now=Date.now();
 for(const style of styles){
  const s=freshState();s.furnitureOwned.push(...COLLECTION_FURNITURE.filter(f=>f.style===style).map(f=>f.id));s.life.nutrition.energy=50;s.life.nutrition.updatedAt=now;
  assert(!canPlaceFurniture(s,id(style,'kitchen-base'),{x:650,y:500},'bedroom'));
  assert(placeFurniture(s,id(style,'kitchen-wall'),{x:650,y:230},undefined,'kitchen'));
  assert(placeFurniture(s,id(style,'shower'),{x:850,y:270},undefined,'bathroom'));
  assert(placeFurniture(s,id(style,'glass-door'),{x:820,y:620},undefined,'bathroom'));
  const restored=sanitizeState(s);restored.life.nutrition.energy=50;restored.life.nutrition.updatedAt=now;
  assert(restStatus(restored,id(style,'shower'),'bathroom',now).ok);
  assert.equal(takeRest(restored,id(style,'shower'),'bathroom',now).gain,5);
  assert.equal(restStatus(restored,id(style,'shower'),'bathroom',now).reason,'used');
 }
});
test('ceiling placement stays above the room and never snaps into a side wall',()=>{
 const fan={ceiling:true,wall:true,height:95,fw:140};
 for(const p of [{x:100,y:600},{x:1200,y:100},{x:600,y:150}]){
  const placed=wallPosition(p,fan);assert(wallPlacementValid(fan,placed,'room'));assert(placed.x>=290&&placed.x<=990);assert(placed.y<=200);
 }
 assert(!wallPlacementValid(fan,{x:160,y:300},'room'));
 const s=freshState();s.furnitureOwned.push('collection-port-6');assert(placeFurniture(s,'collection-port-6',{x:120,y:500}));const restored=sanitizeState(s);assert.equal(restored.layout.find(p=>p.id==='collection-port-6').y,200);
});
test('real new TV and cooking appliances fit counters, remain usable after reload, and kitchen appliances cannot be carried into a bedroom',()=>{
 const s=freshState();s.furnitureOwned.push(id('moon','tv-stand'),id('moon','appliance-counter'),id('moon','dining-table'),...['1','2','3','4','5'].map(n=>'collection-port-'+n));
 assert(placeFurniture(s,id('moon','tv-stand'),{x:620,y:520}));
 const tv=freeSurfacePosition('collection-port-1',s.layout.find(p=>p.id===id('moon','tv-stand')),0,s.layout,FURNITURE);assert(tv);assert(placeFurniture(s,'collection-port-1',tv));
 assert(placeFurniture(s,id('moon','appliance-counter'),{x:550,y:520},undefined,'kitchen'));
 const counter=s.kitchenLayout.find(p=>p.id===id('moon','appliance-counter'));
 for(const item of ['collection-port-2','collection-port-3']){const p=freeSurfacePosition(item,counter,0,s.kitchenLayout,FURNITURE);assert(p);assert(placeFurniture(s,item,p,undefined,'kitchen'));}
 assert(placeFurniture(s,id('moon','dining-table'),{x:860,y:580},undefined,'kitchen'));
 const dining=s.kitchenLayout.find(p=>p.id===id('moon','dining-table')),rice=freeSurfacePosition('collection-port-4',dining,0,s.kitchenLayout,FURNITURE);assert(rice);assert(placeFurniture(s,'collection-port-4',rice,undefined,'kitchen'));
 const restored=sanitizeState(s);for(const item of ['collection-port-2','collection-port-3','collection-port-4'])assert(canUseStove(restored,item,'kitchen'));
 assert(placeFurniture(restored,id('moon','dining-table'),{x:620,y:580},undefined,'bedroom'));assert(!restored.bedroomLayout.some(p=>p.id==='collection-port-4'));assert(restored.furnitureOwned.includes('collection-port-4'));assert(!canUseStove(restored,'collection-port-4','kitchen'));
});
test('wall shower animation keeps the dressed character on the reachable floor',()=>{
 const draws=[],lines=[],c=new Proxy({},{get:(_,name)=>name==='lineTo'?(...args)=>lines.push(args):()=>{},set:()=>true});
 const scene={area:'bathroom',player:{x:850,y:445},art:{},drawPlayer:(_c,_art,args)=>draws.push(args),homeRest:{area:'bathroom',item:{id:id('daisy','shower'),x:850,y:270},kind:'bath',start:0}};
 drawHomeRest(c,scene,{outfit:'daisy'},1000);assert.equal(draws.length,1);assert.equal(draws[0].y,445);assert.equal(draws[0].height,116);assert.equal(lines.length,12);
});
test('whole-atlas metadata has 12 complete cells per style and files are lightweight WebP',async()=>{
 for(const atlas of Object.values(HOME_COLLECTION_ART)){
  assert.equal(atlas.cells.length,12);assert(atlas.bytes<500000);
  const bytes=await fs.readFile(new URL('../'+atlas.src,import.meta.url));assert.equal(bytes.length,atlas.bytes);assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  for(const cell of atlas.cells){assert(cell.w>40&&cell.h>80);assert(cell.x>=0&&cell.y>=0&&cell.x+cell.w<=atlas.width&&cell.y+cell.h<=atlas.height);}
 }
 for(const f of COLLECTION_FURNITURE){const surfaces=furnitureSurfaces(f);if(f.role==='bookcase'||f.role==='display-cabinet')assert.equal(surfaces.length,3);}
});
test('new furniture art uses lazy deduplicated loading and retains retry on a failed image',async()=>{
 const original=globalThis.Image,loaded=[];let fail=true;
 globalThis.Image=class{async decode(){loaded.push(this.src);if(this.src.includes('collectionFox')&&fail)throw new Error('offline');}};
 try{
  const art={};await Promise.all([ensureHomeArt(art,['collectionDaisy']),ensureHomeArt(art,['collectionDaisy'])]);assert.equal(new Set(loaded).size,loaded.length);assert.equal(loaded.filter(src=>src.includes('collectionDaisy')).length,1);assert(art.spatial.daisy);assert.equal(art.collectionDaisy.cells.length,12);
  await assert.rejects(ensureHomeArt(art,['collectionFox']));assert(!art.collectionFox);fail=false;await ensureHomeArt(art,['collectionFox']);assert(art.collectionFox);
 }finally{globalThis.Image=original;}
});
