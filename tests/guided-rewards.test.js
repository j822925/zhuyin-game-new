import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {CLASS_FURNITURE,CLASS_MEALS} from '../data/guided-rewards.js';
import {CLASS_ART} from '../data/guided-prize-art.js';
import {FURNITURE,furnitureFor} from '../data/home-furniture.js';
import {freshState,sanitizeState,placeFurniture,buyFurniture} from '../adventure-model.js';
import {RECIPES,eatFood,canCook} from '../adventure-food-model.js';
import {cartItem} from '../adventure-cart-model.js';

test('ten exclusive, illustrated foods restore the specified portion and never waste food at full energy',()=>{
 const state=freshState(),n=state.life.nutrition;
 assert.equal(CLASS_MEALS.length,10);
 for(const meal of CLASS_MEALS){
  assert.equal(Object.values(RECIPES).filter(r=>r.name===meal.name).length,1);
  assert.ok(meal.energy>=70 && meal.energy<=100);
  assert.ok(!cartItem('meal',meal.id));
  assert.ok(!canCook(state,meal.id,{stationId:'stove',area:'kitchen'}));
  n.energy=0;n.meals[meal.id]=3;
  assert.equal(eatFood(state,meal.id,{cooked:true}),meal.energy);
  n.energy=99;assert.equal(eatFood(state,meal.id,{cooked:true}),1);
  assert.equal(eatFood(state,meal.id,{cooked:true}),0);
  assert.equal(sanitizeState(state).life.nutrition.meals[meal.id],1);
 }
});
test('ten exclusive furniture pieces can be stored, placed and reloaded, including duplicate rewards',()=>{
 assert.equal(CLASS_FURNITURE.length,10);
 for(const item of CLASS_FURNITURE){
  const s=freshState();s.stars=1000;s.layout=[];
  assert.equal(FURNITURE.filter(f=>f.name===item.name).length,1);
  assert.ok(!cartItem('furniture',item.id));assert.equal(buyFurniture(s,item.id),false);
  const copy=item.id+'__2';s.furnitureOwned.push(item.id,copy);
  assert.equal(furnitureFor(copy).id,item.id);
  assert.ok(placeFurniture(s,copy,{x:550,y:450,facing:'front'},undefined,'room'),item.name);
  const saved=sanitizeState(s);assert.ok(saved.furnitureOwned.includes(copy));
  assert.ok(saved.layout.some(v=>v.id===copy));
 }
 for(const atlas of Object.values(CLASS_ART)){
  assert.equal(atlas.cells.length,10);
  assert.ok(existsSync(new URL('../'+atlas.src,import.meta.url)));
 }
});
