import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,FURNITURE,OUTFITS} from '../adventure-model.js';
import {filterShopItems,ownedQuantity} from '../adventure-trade-inventory.js';
import {quoteCart,checkoutCart} from '../adventure-cart-model.js';
import {SEEDS} from '../adventure-exploration-model.js';

test('catalog search finds matching products without changing state, order or the merchant catalog',()=>{
 const s=freshState(),before=structuredClone(s),goods=FURNITURE.filter(f=>f.style==='moon').map(f=>({...f,kind:'furniture'})),original=[...goods];
 const result=filterShopItems(s,goods,{query:'  月光   廚具 '});
 assert(result.length>0);assert(result.every(f=>f.name.includes('月光')&&f.name.includes('廚具')));
 assert.deepEqual(filterShopItems(s,goods,{query:'不存在的品名'}),[]);
 assert.deepEqual(filterShopItems(s,goods),goods);assert.deepEqual(goods,original);assert.deepEqual(s,before);
});

test('unowned and affordable filters follow real ownership and wallet after checkout without discarding basket items',()=>{
 const s=freshState();s.stars=40;s.world.shops=['clothes'];
 const goods=OUTFITS.filter(o=>o.character==='rabbit'&&o.price>0).map(o=>({...o,kind:'clothes'}));
 const basket=[{kind:'clothes',id:'gardener',quantity:1}];
 assert(filterShopItems(s,goods,{show:'affordable'}).some(i=>i.id==='gardener'));
 assert(!filterShopItems(s,goods,{show:'affordable'}).some(i=>i.price>40));
 assert.deepEqual(filterShopItems(s,goods,{query:'不存在'}),[]);
 assert.equal(quoteCart(s,'clothes',basket).ok,true,'hiding a selected item must not change checkout');
 assert(checkoutCart(s,'clothes',basket).ok);
 assert(!filterShopItems(s,goods,{show:'unowned'}).some(i=>i.id==='gardener'));
 assert.equal(filterShopItems(s,goods,{show:'affordable'}).length,0);
 assert.equal(ownedQuantity(s,'clothes','gardener'),1);
});

test('stackable supplies remain searchable, and empty stocks count as not owned',()=>{
 const s=freshState();s.life.seeds.pumpkin=3;
 const goods=Object.entries(SEEDS).map(([id,v])=>({...v,id,kind:'seeds'}));
 assert(!filterShopItems(s,goods,{show:'unowned'}).some(i=>i.id==='pumpkin'));
 assert(filterShopItems(s,goods,{query:'南瓜'}).some(i=>i.id==='pumpkin'));
 s.life.seeds.pumpkin=0;
 assert(filterShopItems(s,goods,{show:'unowned',query:'南瓜'}).some(i=>i.id==='pumpkin'));
});
