import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,sanitizeState,placeFurniture,storeFurniture,FURNITURE,layoutFor,canPlaceFurniture} from '../adventure-model.js';
import {furnitureSurfaces,freeSurfacePosition} from '../furniture-surfaces.js';
import {checkoutCart} from '../adventure-cart-model.js';
const fixture=()=>{const s=freshState();s.furnitureOwned=FURNITURE.map(f=>f.id);s.layout=[{id:'table',x:600,y:520},{id:'sofa',x:800,y:420},{id:'display-ocean-bookcase',x:300,y:510}];return s;};
test('small objects attach to table/sofa/shelf; survive sanitizing out of order and reload',()=>{
 const s=fixture();for(const [id,hostId,index] of [['plush-0','table',0],['moon-lamp','sofa',0],['plush-1','display-ocean-bookcase',1]]){const host=s.layout.find(x=>x.id===hostId),pos=freeSurfacePosition(id,host,index,s.layout,FURNITURE);assert(pos);assert(placeFurniture(s,id,pos));}
 const before=structuredClone(s.layout);s.layout.reverse();const restored=sanitizeState(s);for(const item of before)assert.deepEqual(restored.layout.find(p=>p.id===item.id),item);
 assert(!canPlaceFurniture(s,'bed',{x:600,y:400,on:'table',surface:0,offsetX:0}));assert(!canPlaceFurniture(s,'plush-0',{x:0,y:0,on:'missing',surface:0,offsetX:0}));
});
test('move host carries items between rooms; storing host retains ownership and stores children',()=>{
 const s=fixture(),pos=freeSurfacePosition('plush-0',s.layout[0],0,s.layout,FURNITURE);placeFurniture(s,'plush-0',pos);
 assert(placeFurniture(s,'table',{x:700,y:550},undefined,'bedroom'));assert(!s.layout.some(p=>p.id==='plush-0'));const child=s.bedroomLayout.find(p=>p.id==='plush-0');assert.equal(child.x,700+pos.offsetX);assert.equal(child.on,'table');
 assert(storeFurniture(s,'table','bedroom'));assert(!s.bedroomLayout.some(p=>p.id==='plush-0'));assert(s.furnitureOwned.includes('plush-0'));
});
test('full slots reject overlap; placing back on floor detaches; new furniture uses normal paid checkout',()=>{
 const s=fixture(),host=s.layout[0];for(const id of ['plush-0','plush-1']){const pos=freeSurfacePosition(id,host,0,s.layout,FURNITURE);assert(pos);placeFurniture(s,id,pos);}
 assert.equal(freeSurfacePosition('plush-3',host,0,s.layout,FURNITURE),null);
 assert(placeFurniture(s,'plush-0',{x:900,y:600}));assert.equal(s.layout.find(x=>x.id==='plush-0').on,undefined);
 const buyer=freshState();buyer.stars=1000;buyer.world.shops=['furniture'];const all=FURNITURE.filter(f=>f.id.startsWith('display-'));assert.equal(all.length,6);
 const result=checkoutCart(buyer,'furniture',all.map(f=>({kind:'furniture',id:f.id,quantity:1})));assert(result.ok);assert.equal(buyer.stars,1000-all.reduce((n,f)=>n+f.price,0));assert.equal(sanitizeState(buyer).furnitureOwned.filter(id=>id.startsWith('display-')).length,6);
 for(const f of FURNITURE.filter(f=>f.small&&!f.id.startsWith('collection-'))){assert(f.height<=65);assert(f.fw<=80);}assert(furnitureSurfaces(all.find(f=>f.id==='display-ocean-bookcase')).length===3);
});
