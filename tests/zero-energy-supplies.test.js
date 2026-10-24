import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,sanitizeState,OUTFITS,FURNITURE} from '../adventure-model.js';
import {quoteCart,checkoutCart} from '../adventure-cart-model.js';
import {SEEDS,DESTINATIONS,destinationOpen,buySeed} from '../adventure-exploration-model.js';
import {BAITS} from '../adventure-bait.js';
import {ENERGY_DECAY_MS} from '../adventure-food-model.js';
const setup=()=>{const s=freshState();s.world.visited=true;s.world.shops=['furniture','clothes'];s.stars=1000;s.life.nutrition.energy=0;return s;};
test('zero energy allows free seed store entry, quote and confirmed seed plus bait purchase',()=>{
 const s=setup(),before=structuredClone(s);assert.equal(DESTINATIONS.find(d=>d.id==='seeds').price,0);assert(destinationOpen(s,'seeds'));
 const lines=[...Object.keys(SEEDS).map(id=>({kind:'seeds',id,quantity:2})),{kind:'bait',id:'basic',quantity:3}];
 const cost=Object.values(SEEDS).reduce((n,v)=>n+v.price*2,0)+3*BAITS.basic.price;
 assert.equal(quoteCart(s,'seeds',lines).total,cost);assert.deepEqual(s,before);
 assert(checkoutCart(s,'seeds',lines).ok);const loaded=sanitizeState(s);
 assert.equal(loaded.stars,1000-cost);assert.equal(loaded.life.nutrition.energy,0);
 for(const id of Object.keys(SEEDS))assert.equal(loaded.life.seeds[id],2);
 assert.equal(loaded.life.bait.basic,before.life.bait.basic+3);
});
test('seed and bait checkouts still succeed if energy decays to zero after quotation',()=>{
 const s=setup(),lines=[{kind:'seeds',id:'pumpkin',quantity:2},{kind:'bait',id:'basic',quantity:1}];s.life.nutrition.energy=1;
 assert(quoteCart(s,'seeds',lines).ok);s.life.nutrition.updatedAt=Date.now()-ENERGY_DECAY_MS-100;
 assert(checkoutCart(s,'seeds',lines).ok);assert.equal(s.life.nutrition.energy,0);assert.equal(s.stars,995);
});
test('zero energy does not bypass price, capacity, validity, store or atomic checkout checks',()=>{
 const seed={kind:'seeds',id:'pumpkin',quantity:1},bait={kind:'bait',id:'basic',quantity:1};
 for(const [shop,lines,change]of [
  ['seeds',[seed,bait],s=>s.stars=2],['seeds',[seed,bait],s=>s.life.seeds.pumpkin=9999],
  ['seeds',[seed,bait],s=>s.life.bait.basic=9999],['seeds',[seed,{...bait,id:'unknown'}],()=>{}],
  ['seeds',[{...seed,quantity:-1}],()=>{}],['seeds',[seed,seed],()=>{}],['clothes',[seed,bait],()=>{}],
  ['seeds',[seed,bait],s=>s.world.visited=false]
 ]){const s=setup();change(s);const before=structuredClone(s);assert(!checkoutCart(s,shop,lines).ok);assert.deepEqual(s,before);}
 const s=setup();s.stars=0;assert.equal(buySeed(s,'pumpkin'),false);assert.equal(s.life.seeds.pumpkin,0);
});
test('non-supply and mixed purchases remain blocked without energy',()=>{
 const s=setup(),outfit=OUTFITS.find(o=>o.id==='gardener'),furniture=FURNITURE.find(f=>f.price>0&&!f.starter&&!f.zoneShop&&!s.furnitureOwned.includes(f.id));assert(outfit);assert(furniture);
 for(const [shop,lines]of [['clothes',[{kind:'clothes',id:outfit.id,quantity:1}]],['furniture',[{kind:'furniture',id:furniture.id,quantity:1}]],['seeds',[{kind:'seeds',id:'pumpkin',quantity:1},{kind:'clothes',id:outfit.id,quantity:1}]]]){const before=structuredClone(s);assert(!checkoutCart(s,shop,lines).ok);assert.deepEqual(s,before);}
});
