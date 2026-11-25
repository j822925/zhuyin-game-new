import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,sanitizeState,placeFurniture,storeFurniture,buyFurniture,canUseStove,FURNITURE} from '../adventure-model.js';
import {checkoutCart,quoteCart} from '../adventure-cart-model.js';
import {checkoutSale,inventoryItems,ownedQuantity} from '../adventure-trade-inventory.js';
import {encodeHomeSurfaceState} from '../home-surface-storage.js';
import {normalizeVisitRoomLayouts} from '../island-visits-ui.js';
import {islandSnapshot} from '../island-visits-model.js';
import {diningSpot} from '../adventure-dining.js';
import {furnitureFor} from '../data/home-furniture.js';

test('confirmed furniture orders create separate pieces, including after reload and resale',()=>{
 const s=freshState(),id='collection-moon-dining-chair',f=furnitureFor(id);
 s.world.visited=true;s.world.shops=['furniture'];s.stars=1000;
 const line={kind:'furniture',id,quantity:3};
 assert.equal(quoteCart(s,'furniture',[line]).total,3*f.price);
 assert.equal(s.stars,1000);
 assert(checkoutCart(s,'furniture',[line]).ok);
 assert.equal(s.stars,1000-3*f.price);
 const copies=s.furnitureOwned.filter(piece=>furnitureFor(piece)===f);
 assert.equal(new Set(copies).size,3);
 for(const [i,piece] of copies.slice(0,2).entries()){
  assert(placeFurniture(s,piece,{x:500+i*220,y:590,facing:i?'right':'left'},undefined,'room'));
 }
 const saved=sanitizeState(JSON.parse(JSON.stringify(encodeHomeSurfaceState(s,FURNITURE))));
 assert.deepEqual(saved.layout,s.layout);
 const inventory=inventoryItems(saved,'furniture').find(item=>item.id===id);
 assert.deepEqual([inventory.quantity,inventory.sellableQuantity],[3,1]);
 const unchanged=structuredClone(saved);
 assert.equal(checkoutSale(saved,'furniture',[{...line,quantity:2}]).ok,false);
 assert.deepEqual(saved,unchanged);
 assert(checkoutSale(saved,'furniture',[{...line,quantity:1}]).ok);
 assert.equal(saved.stars,s.stars+Math.floor(f.price/2));
 assert.deepEqual(normalizeVisitRoomLayouts(islandSnapshot(saved)).layout.filter(p=>copies.includes(p.id)),s.layout.filter(p=>copies.includes(p.id)));
 assert(storeFurniture(saved,copies[0]));
 assert(checkoutSale(saved,'furniture',[{...line,quantity:1}]).ok);
 assert(saved.layout.some(p=>p.id===copies[1]));
 assert.equal(ownedQuantity(saved,'furniture',id),1);
 assert(buyFurniture(saved,id));
 assert.deepEqual(saved.layout,unchanged.layout.filter(p=>p.id!==copies[0]));
});

test('copies of tables and stoves retain their interactions and support distinct objects',()=>{
 const s=freshState();s.stars=1000;
 for(const id of ['moon-table','moon-stove','moon-lamp']){
  assert(buyFurniture(s,id));assert(buyFurniture(s,id));
 }
 assert(placeFurniture(s,'moon-stove__2',{x:820,y:515},undefined,'kitchen'));
 assert(canUseStove(s,'moon-stove__2','kitchen'));
 for(const [i,suffix] of ['','__2'].entries()){
  const table='moon-table'+suffix;
  assert(placeFurniture(s,table,{x:475+300*i,y:560}));
  assert.equal(diningSpot(s,table).table.id,table);
  assert(placeFurniture(s,'moon-lamp'+suffix,{x:475+300*i,y:470,on:table,surface:0,offsetX:0}));
 }
 const restored=sanitizeState(encodeHomeSurfaceState(s,FURNITURE));
 assert.equal(restored.layout.find(p=>p.id==='moon-lamp__2').on,'moon-table__2');
 assert(storeFurniture(restored,'moon-table__2'));
 assert(restored.layout.some(p=>p.id==='moon-lamp'&&p.on==='moon-table'));
 assert(restored.furnitureOwned.includes('moon-lamp__2'));
});
