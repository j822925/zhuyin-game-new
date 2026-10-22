import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,sanitizeState,FURNITURE} from '../adventure-model.js';
import {quoteCart,checkoutCart,cartItem} from '../adventure-cart-model.js';
import {inventoryItems,quoteSale,checkoutSale,shopAcceptsItem} from '../adventure-trade-inventory.js';
import {ZONE_SHOPS} from '../data/zone-shops.js';
import {getShopRoom} from '../adventure-zone-shop-data.js';
import {priceFurniture} from '../adventure-economy.js';

const setup=()=>{const s=freshState();s.stars=100000;s.world.visited=true;s.world.shops=['furniture','clothes','seeds'];return s;};
const added=(shop)=>shop.products.filter(p=>p.id.startsWith('collection-'));

test('each of ten stores offers twelve new usable goods and all display positions exist',()=>{
 assert.equal(ZONE_SHOPS.length,10);
 for(const shop of ZONE_SHOPS){
  assert.equal(added(shop).length,12,shop.id);
  for(const p of added(shop)){const item=cartItem(p.kind,p.id);assert(item,`${shop.id}/${p.id}`);assert(Number.isSafeInteger(item.price)&&item.price>0);}
  for(const d of getShopRoom(shop.id).displays){assert(Number.isFinite(d.position.x));assert(Number.isFinite(d.position.y));}
 }
});

test('new products survive purchase/save/reload, stay in their shop inventory, and sell at half price',()=>{
 for(const shop of ZONE_SHOPS)for(const p of added(shop)){
  const state=setup(),line={...p,quantity:1},item=cartItem(p.kind,p.id),before=state.stars;
  assert(quoteCart(state,shop.id,[line]).ok,p.id);assert.equal(state.stars,before);
  assert(checkoutCart(state,shop.id,[line]).ok,p.id);assert.equal(state.stars,before-item.price);
  const saved=sanitizeState(JSON.parse(JSON.stringify(state)));
  const owned=inventoryItems(saved,shop.id).find(i=>i.kind===p.kind&&i.id===p.id);
  assert.equal(owned?.quantity,1,p.id);assert.equal(owned.sellPrice,Math.floor(item.price/2),p.id);
  if(p.kind==='furniture'){
   assert(!inventoryItems(saved,'furniture').some(i=>i.id===p.id),p.id+' must not appear in general furniture store');
   assert(!checkoutCart(saved,shop.id,[line]).ok,p.id+' must not charge twice');
  }
  assert(quoteSale(saved,shop.id,[line]).ok,p.id);assert(checkoutSale(saved,shop.id,[line]).ok,p.id);
  assert.equal(saved.stars,before-item.price+Math.floor(item.price/2),p.id);
  assert(!inventoryItems(saved,shop.id).some(i=>i.id===p.id),p.id);
 }
});

test('specialty furniture cannot be bought or sold through the wrong shop',()=>{
 const s=setup();
 for(const shop of ZONE_SHOPS)for(const p of added(shop).filter(p=>p.kind==='furniture')){
  s.furnitureOwned.push(p.id);
  for(const other of ZONE_SHOPS.filter(x=>x.id!==shop.id)){
   assert(!shopAcceptsItem(other.id,p.kind,p.id),p.id+' in '+other.id);
   assert(!quoteSale(s,other.id,[{...p,quantity:1}]).ok);
   assert(!quoteCart(setup(),other.id,[{...p,quantity:1}]).ok);
  }
 }
});

test('new final prices are not multiplied again and legacy prices remain unchanged',()=>{
 assert.equal(priceFurniture({id:'old',zoneShop:true,price:20}).price,40);
 assert.equal(priceFurniture({id:'old',style:'moon',price:20}).price,45);
 for(const item of FURNITURE.filter(f=>f.priceVersion==='20261022')){
  assert.deepEqual(priceFurniture(item),item,item.id);
  assert.equal(item.resaleBase,item.price,item.id);
 }
 const s=setup();s.stars=1;
 const item=ZONE_SHOPS.flatMap(added).find(p=>p.kind==='furniture');
 const original=structuredClone(s);assert(!checkoutCart(s,'region-port',[{...item,quantity:1}]).ok);assert.deepEqual(s,original);
});
