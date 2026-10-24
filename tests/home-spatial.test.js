import test from 'node:test';import assert from 'node:assert/strict';
import {FURNITURE,freshState,sanitizeState,placeFurniture,layoutFor,canPlaceFurniture,storeFurniture} from '../adventure-model.js';
import {floorPosition,decorCamera,spatialFields,HOME_FACINGS} from '../home-spatial-model.js';
import {wallPosition} from '../data/home-wall-furniture.js';
import {freeSurfacePosition,attachedPosition} from '../furniture-surfaces.js';
import {islandSnapshot} from '../island-visits-model.js';
import {checkoutCart} from '../adventure-cart-model.js';
import {HOME_SPATIAL_ART} from '../data/home-spatial-art.js';
import {spatialSprite} from '../home-spatial-art.js';
const styles=['daisy','fox','moon','honey','ocean','berry'];
const owned=()=>{const s=freshState();s.furnitureOwned=FURNITURE.map(f=>f.id);s.layout=[];s.kitchenLayout=[];s.bedroomLayout=[];s.bathroomLayout=[];return s;};
test('all owned furniture retains valid orientation and position through room save/load',()=>{
 for(const f of FURNITURE){const s=owned(),area=f.areas?.[0]||'room';
  for(const facing of ['front','left','right']){let pos=f.corner?floorPosition({x:facing==='right'?920:360,y:465},f):f.wall?wallPosition({x:facing==='left'?160:facing==='right'?1120:640,y:f.ceiling?190:area==='bathroom'?330:260},f):{x:640,y:610,facing};
   assert(placeFurniture(s,f.id,pos,undefined,area),f.id+' '+facing);
   assert(sanitizeState(s)[{room:'layout',kitchen:'kitchenLayout',bedroom:'bedroomLayout',bathroom:'bathroomLayout'}[area]].some(p=>p.id===f.id),f.id+' survives');
  }
 }
 assert.equal(placeFurniture(owned(),'unknown',{x:500,y:500}),false);
});
test('six cabinet collections mount to all three walls, L runs mirror, and chairs have four actual frames',()=>{
 const art={spatial:Object.fromEntries(Object.entries(HOME_SPATIAL_ART).map(([k,v])=>[k,{cells:v.cells}]))};
 for(const style of styles){const s=owned(),base=FURNITURE.find(f=>f.id===`collection-${style}-kitchen-base`);
  for(const target of [{x:210,y:540},{x:1070,y:540},{x:640,y:300}]){const p=floorPosition(target,base,{area:'kitchen'});assert(placeFurniture(s,base.id,p,undefined,'kitchen'));assert.deepEqual(sanitizeState(s).kitchenLayout.find(v=>v.id===base.id),{id:base.id,...p});}
  const corner=FURNITURE.find(f=>f.id===`spatial-${style}-corner-kitchen`);
  for(const x of [200,1000]){const p=floorPosition({x,y:500},corner);assert(placeFurniture(s,corner.id,p,undefined,'kitchen'));assert.equal(islandSnapshot(s).kitchenLayout.find(v=>v.id===corner.id).mount,p.mount);}
  const chair=FURNITURE.find(f=>f.id===`collection-${style}-dining-chair`),frames=HOME_FACINGS.map(facing=>spatialSprite(art,chair,{facing}).cell);assert.equal(new Set(frames).size,4);
 }
});
test('small items follow rotated counters and both arms of a corner run without losing ownership',()=>{
 const s=owned(),hostId='spatial-moon-corner-kitchen',f=FURNITURE.find(f=>f.id===hostId);
 placeFurniture(s,hostId,floorPosition({x:200,y:500},f),undefined,'kitchen');
 for(const [id,surface]of [['plush-0',0],['plush-1',1]]){const p=freeSurfacePosition(id,s.kitchenLayout.find(p=>p.id===hostId),surface,s.kitchenLayout,FURNITURE);assert(p);assert(placeFurniture(s,id,p,undefined,'kitchen'));}
 const before=structuredClone(s.kitchenLayout);assert(placeFurniture(s,hostId,floorPosition({x:1100,y:500},f),undefined,'kitchen'));
 for(const id of ['plush-0','plush-1']){const p=s.kitchenLayout.find(p=>p.id===id);assert.equal(p.on,hostId);assert.notEqual(p.x,before.find(p=>p.id===id).x);assert.deepEqual(attachedPosition(p,s.kitchenLayout,FURNITURE),Object.fromEntries(Object.entries(p).filter(([k])=>k!=='id')));}
 assert.equal(sanitizeState(s).kitchenLayout.filter(p=>p.on===hostId).length,2);assert(storeFurniture(s,hostId,'kitchen'));assert(!s.kitchenLayout.some(p=>p.on===hostId));assert(s.furnitureOwned.includes('plush-1'));
});
test('public visits only expose supported layout fields, not arbitrary metadata',()=>{
 const p=islandSnapshot({layout:[{id:'bed',x:300,y:500,facing:'left',mount:'left',token:'private'},{id:'table',x:500,y:500,facing:'secret',mount:'secret'}],token:'private'});
 assert.deepEqual(p.layout,[{id:'bed',x:300,y:500,facing:'left',mount:'left'},{id:'table',x:500,y:500}]);assert(!JSON.stringify(p).includes('private'));assert.deepEqual(spatialFields({facing:'junk',mount:'junk'}),{});
});
test('camera leaves the full room outside inventory and placement toolbar on tablet and phone',()=>{
 for(const [w,h,insets]of [[1024,768,{right:344}],[768,1024,{right:344}],[390,844,{bottom:410}],[1024,768,{bottom:190}],[768,1024,{bottom:230}]]){const c=decorCamera(w,h,insets),left=-c.x*c.scale,top=-c.y*c.scale;assert(left>=11.9);assert(top>=11.9);assert((1280-c.x)*c.scale<=w-(insets.right||12)+.1);assert((800-c.y)*c.scale<=h-(insets.bottom||12)+.1);}
});
test('new L cabinet and matching extra chair are paid items, no free ownership is introduced',()=>{
 const s=freshState();s.stars=200;s.world.shops=['furniture'];const ids=['spatial-moon-corner-kitchen','spatial-moon-dining-chair'];for(const id of ids)assert(!s.furnitureOwned.includes(id));assert(checkoutCart(s,'furniture',ids.map(id=>({kind:'furniture',id,quantity:1}))).ok);assert.equal(s.stars,80);assert.equal(FURNITURE.find(f=>f.id===ids[0]).resaleBase,100);
});
