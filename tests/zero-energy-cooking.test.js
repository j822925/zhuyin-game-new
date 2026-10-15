import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,canUseStove} from '../adventure-model.js';
import {canCook,cookMeal,eatFood,RECIPES,ENERGY_DECAY_MS} from '../adventure-food-model.js';
const context={area:'kitchen',stationId:'daisy-stove'};
function setup(){const s=freshState();s.life.nutrition.energy=0;s.life.harvest.carrot=1;s.life.harvest.tomato=1;return s;}
test('exhausted player cooks one meal at owned placed stove then eats to recover',()=>{
 const s=setup();assert.ok(canUseStove(s,context.stationId,context.area));assert.ok(canCook(s,'soup',context));assert.ok(cookMeal(s,'soup',context));assert.equal(s.life.nutrition.energy,0);assert.equal(s.life.harvest.carrot,0);assert.equal(s.life.harvest.tomato,0);assert.equal(s.life.nutrition.meals.soup,1);
 assert.equal(cookMeal(s,'soup',context),false);assert.equal(eatFood(s,'soup',{cooked:true}),35);assert.equal(s.life.nutrition.energy,35);assert.equal(s.life.nutrition.meals.soup,0);
});
test('decay to zero while using recipe does not prevent cooking',()=>{const s=setup();s.life.nutrition.energy=1;s.life.nutrition.updatedAt=Date.now()-ENERGY_DECAY_MS;assert.ok(cookMeal(s,'soup',context));assert.equal(s.life.nutrition.energy,0);});
test('zero-energy cooking still checks ingredients, kitchen, stove ownership and capacity atomically',()=>{
 for(const change of [s=>s.life.harvest.tomato=0,s=>s.furnitureOwned=s.furnitureOwned.filter(id=>id!==context.stationId),s=>s.kitchenLayout=[],s=>s.life.nutrition.meals.soup=9999]){const s=setup();change(s);const before=structuredClone(s);assert.equal(cookMeal(s,'soup',context),false);assert.deepEqual(s,before);}
 const s=setup(),before=structuredClone(s);for(const c of [{...context,area:'room'},{...context,stationId:'moon-table'}])assert.equal(cookMeal(s,'soup',c),false);for(const [id,r]of Object.entries(RECIPES).filter(([,r])=>r.buyOnly))assert.equal(cookMeal(s,id,context),false);assert.deepEqual(s,before);
});
