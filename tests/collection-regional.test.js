import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COLLECTION_ZONE_FURNITURE,collectionRegionalProducts} from '../data/collection-zone-furniture.js';
import {COLLECTION_ZONE_ART} from '../data/collection-zone-art.js';
import {ZONE_SHOPS,regionalProductAllowed} from '../data/zone-shops.js';
import {freshState,sanitizeState,FURNITURE,placeFurniture,layoutFor} from '../adventure-model.js';
import {quoteCart,checkoutCart} from '../adventure-cart-model.js';
import {inventoryItems,checkoutSale} from '../adventure-trade-inventory.js';

test('each regional shop gains twelve correctly classified products, without replacing existing goods',()=>{
 assert.equal(COLLECTION_ZONE_FURNITURE.length,108);
 assert.equal(new Set(COLLECTION_ZONE_FURNITURE.map(f=>f.id)).size,108);
 for(const shop of ZONE_SHOPS){
  const added=shop.products.filter(p=>p.id.startsWith('collection-'));
  assert.equal(added.length,12,shop.zone);
  assert.deepEqual(added,collectionRegionalProducts(shop.zone));
  for(const product of added){
   assert.equal(product.kind,shop.zone==='sand'?'meal':'furniture');
   assert.equal(regionalProductAllowed(shop.id,product.kind,product.id),true);
   for(const other of ZONE_SHOPS.filter(s=>s.id!==shop.id))assert.equal(regionalProductAllowed(other.id,product.kind,product.id),false);
  }
  assert.ok(shop.products.some(p=>!p.id.startsWith('collection-')),'existing shop contents remain');
 }
});

test('all regional furniture has a real bounded sprite and a reviewed final price',()=>{
 for(const f of COLLECTION_ZONE_FURNITURE){
  assert.equal(f.zoneShop,true);assert.equal(f.priceVersion,'20261022');
  assert.ok(Number.isInteger(f.price)&&f.price>=15&&f.price<=110,f.id);
  assert.ok(f.height>0&&f.fw>0&&f.fh>0,f.id);
  const atlas=COLLECTION_ZONE_ART[f.atlas],cell=atlas?.cells[f.index];
  assert.ok(cell,f.id);assert.ok(fs.existsSync(new URL('../'+atlas.src,import.meta.url)),atlas.src);
  assert.ok(cell.x>=0&&cell.y>=0&&cell.w>10&&cell.h>10,f.id);
  assert.ok(cell.x+cell.w<=atlas.width&&cell.y+cell.h<=atlas.height,f.id);
  assert.equal(atlas.cells.length,12);
 }
});

test('small display objects, kitchen appliances and ceiling fittings have usable roles',()=>{
 const find=id=>COLLECTION_ZONE_FURNITURE.find(f=>f.id===id);
 for(const i of [2,3,4]){const f=find('collection-port-'+i);assert.equal(f.cooking,true);assert.equal(f.small,true);assert.deepEqual(f.areas,['kitchen']);}
 for(const id of ['collection-port-1','collection-port-5','collection-deep-1','collection-deep-4','collection-deep-12','collection-bridge-1'])assert.equal(find(id).small,true,id);
 for(const id of ['collection-port-6','collection-watch-10']){assert.equal(find(id).ceiling,true);assert.equal(find(id).wall,true);}
 for(const id of ['collection-watch-5','collection-watch-6'])assert.equal(find(id).surfaceKind,'shelf');
 assert.equal(find('collection-watch-3').dining,true);
 assert.equal(find('collection-watch-12').flat,true);
});

test('all 108 purchases survive reload, appear only in their shop inventory, place at home, and sell for half',()=>{
 for(const shop of ZONE_SHOPS.filter(s=>s.zone!=='sand')){
  const state=freshState();state.stars=10000;state.world.visited=true;state.world.shops=['furniture'];
  const products=collectionRegionalProducts(shop.zone),lines=products.map(p=>({...p,quantity:1}));
  const expected=COLLECTION_ZONE_FURNITURE.filter(f=>f.shopZone===shop.zone).reduce((n,f)=>n+f.price,0);
  assert.equal(quoteCart(state,shop.id,lines).total,expected);assert.equal(state.stars,10000);
  assert.equal(checkoutCart(state,shop.id,lines).ok,true);assert.equal(state.stars,10000-expected);
  assert.equal(checkoutCart(state,shop.id,lines).ok,false,'no double purchase');
  const restored=sanitizeState(state);
  for(const product of products){
   const f=FURNITURE.find(f=>f.id===product.id),item=inventoryItems(restored,shop.id).find(i=>i.id===product.id);
   assert.ok(item,f.id);assert.equal(item.sellPrice,Math.floor(f.price/2));
   assert.equal(inventoryItems(restored,'furniture').some(i=>i.id===f.id),false,'regional goods do not leak into main furniture inventory');
   const placed=structuredClone(restored),area=f.areas?.[0]||'room',pos={x:640,y:f.ceiling?160:f.wall?250:600};
   assert.equal(placeFurniture(placed,f.id,pos,undefined,area),true,f.id);
   assert.ok(layoutFor(sanitizeState(placed),area).some(p=>p.id===f.id),f.id+' saved placement');
  }
  const total=products.reduce((sum,p)=>sum+inventoryItems(restored,shop.id).find(i=>i.id===p.id).sellPrice,0),before=restored.stars;
  assert.equal(checkoutSale(restored,shop.id,lines).ok,true);assert.equal(restored.stars,before+total);
  for(const product of products)assert.equal(restored.furnitureOwned.includes(product.id),false);
 }
});
