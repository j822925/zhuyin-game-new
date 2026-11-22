import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSON_CROPS,LESSON_SEEDS,LESSON_RAW_FOOD,LESSON_RECIPES} from '../data/lesson-harvest-foods.js';
import {freshState,sanitizeState} from '../adventure-model.js';
import {CROPS,CROP_HARVEST_YIELD,plantCrop,waterCrop,harvestCrop} from '../adventure-life-model.js';
import {SEEDS} from '../adventure-exploration-model.js';
import {RECIPES,RAW_FOOD,INGREDIENT_NAMES,canCook,cookMeal,eatFood} from '../adventure-food-model.js';
import {quoteCart,checkoutCart} from '../adventure-cart-model.js';
import {inventoryItems,quoteSale,checkoutSale} from '../adventure-trade-inventory.js';
import {beginDining} from '../adventure-dining.js';

const pairs=[['cabbage','hanzi-reading'],['spinach','hanzi-writing'],['peanut','hanzi-copy'],['sesame','name-writing'],['taro','name-copy'],['pineapple','arithmetic']];
const setup=()=>{const s=freshState();s.world.visited=true;s.life.farmUnlocked=true;s.stars=100;s.life.nutrition.energy=0;return s;};
const kitchen={area:'kitchen',stationId:'daisy-stove'};

test('six new crops have distinct lessons, paid affordable seeds and a complete recipe each',()=>{
 assert.equal(Object.keys(LESSON_CROPS).length,6);assert.equal(Object.keys(LESSON_RECIPES).length,6);
 assert.equal(Object.keys(CROPS).length,27);assert.equal(Object.keys(SEEDS).length,24);assert.equal(Object.keys(RECIPES).length,31);
 for(const [i,[id,lesson]]of pairs.entries()){
  assert.equal(CROPS[id].lesson,lesson);assert.equal(CROPS[id].art,i);assert.equal(CROPS[id].atlas,'lessonCrops');
  assert.equal(SEEDS[id].price,i<4?1:2);assert.equal(INGREDIENT_NAMES[id],CROPS[id].name);
  const recipes=Object.values(LESSON_RECIPES).filter(r=>r.ingredients[id]);assert.equal(recipes.length,1);
  assert.equal(recipes[0].art,i);assert.equal(recipes[0].atlas,'lessonMeals');assert(!recipes[0].buyOnly);
  for(const ingredient of Object.keys(recipes[0].ingredients))assert(CROPS[ingredient]);
 }
 assert.deepEqual(Object.keys(LESSON_RAW_FOOD),['pineapple']);assert.equal(RAW_FOOD.pineapple.energy,10);
});

test('new seeds buy at zero energy, remain in inventory and plant without granting extra harvest',()=>{
 const s=setup(),lines=pairs.map(([id])=>({kind:'seeds',id,quantity:2})),quote=quoteCart(s,'seeds',lines);
 assert(quote.ok);assert.equal(quote.total,16);assert.equal(s.stars,100);assert(checkoutCart(s,'seeds',lines).ok);
 const saved=sanitizeState(s);assert.equal(saved.stars,84);assert.equal(saved.life.nutrition.energy,0);
 for(const [i,[id]]of pairs.entries()){
  assert.equal(saved.life.seeds[id],2);assert(plantCrop(saved,i,id));assert(waterCrop(saved,i));
  assert.equal(saved.life.seeds[id],1);assert.equal(saved.life.harvest[id],0);assert.equal(harvestCrop(saved,i),false);
 }
 const reloaded=sanitizeState(saved);assert.deepEqual(reloaded.life.plots.map(p=>p.crop),pairs.map(([id])=>id));
 const owned=inventoryItems(reloaded,'seeds').filter(v=>v.kind==='seeds'&&LESSON_SEEDS[v.id]);
 assert.equal(owned.length,6);assert(owned.every(v=>v.quantity===1));
});

test('seed quantity and price validation keep a mixed purchase atomic',()=>{
 const s=setup(),lines=[{kind:'seeds',id:'cabbage',quantity:1},{kind:'seeds',id:'pineapple',quantity:1}];
 s.stars=2;const before=structuredClone(s);assert(!checkoutCart(s,'seeds',lines).ok);assert.deepEqual(s,before);
 s.stars=100;s.life.seeds.pineapple=9999;const full=structuredClone(s);assert(!checkoutCart(s,'seeds',lines).ok);assert.deepEqual(s,full);
});

test('all new recipes consume their actual harvest, survive reload and restore energy at a table',()=>{
 for(const [id,recipe]of Object.entries(LESSON_RECIPES)){
  const s=setup();s.kitchenLayout=[{id:'daisy-stove',x:640,y:500}];
  if(!s.furnitureOwned.includes('daisy-stove'))s.furnitureOwned.push('daisy-stove');
  assert.equal(canCook(s,id,kitchen),false);
  for(const [ingredient,quantity]of Object.entries(recipe.ingredients))s.life.harvest[ingredient]=quantity;
  assert.equal(cookMeal(s,id,{...kitchen,area:'room'}),false);assert(cookMeal(s,id,kitchen));
  for(const ingredient of Object.keys(recipe.ingredients))assert.equal(s.life.harvest[ingredient],0);
  assert.equal(cookMeal(s,id,kitchen),false);assert.equal(s.life.nutrition.meals[id],1);
  const saved=sanitizeState(s);assert.equal(saved.life.nutrition.meals[id],1);
  const scene={area:'room',player:{},reduced:{matches:false}};
  assert.equal(beginDining(saved,scene,id,true,1000),recipe.energy);assert.equal(scene.dining.atlas,'lessonMeals');
  assert.equal(scene.dining.index,recipe.art);assert.equal(saved.life.nutrition.meals[id],0);
  assert.equal(saved.life.nutrition.energy,recipe.energy);assert.equal(eatFood(saved,id,{cooked:true}),0);
 }
});

test('new seed resale is only half the purchase price and harvested crops stay distinct',()=>{
 const s=setup();s.life.nutrition.energy=50;
 for(const [id]of pairs){s.life.seeds[id]=1;s.life.harvest[id]=CROP_HARVEST_YIELD;}
 const items=inventoryItems(s,'seeds');
 for(const [id]of pairs){const seed=items.find(v=>v.kind==='seeds'&&v.id===id);assert.equal(seed.sellPrice,Math.floor(SEEDS[id].price/2));
  assert.equal(items.find(v=>v.kind==='harvest'&&v.id===id).quantity,6);
 }
 assert(!quoteSale(s,'seeds',[{kind:'seeds',id:'cabbage',quantity:1}]).ok);
 assert(checkoutSale(s,'seeds',[{kind:'seeds',id:'taro',quantity:1}]).ok);assert.equal(s.stars,101);assert.equal(s.life.seeds.taro,0);
 assert.equal(sanitizeState(s).life.harvest.taro,6);
});

test('raw pineapple is edible while unprepared new ingredients cannot be consumed',()=>{
 const s=setup();for(const [id]of pairs)s.life.harvest[id]=1;
 for(const [id]of pairs.filter(([id])=>id!=='pineapple')){assert.equal(eatFood(s,id),0);assert.equal(s.life.harvest[id],1);}
 assert.equal(eatFood(s,'pineapple'),10);assert.equal(s.life.harvest.pineapple,0);assert.equal(s.life.nutrition.energy,10);
 s.life.harvest.pineapple=1;s.life.nutrition.energy=100;assert.equal(eatFood(s,'pineapple'),0);assert.equal(s.life.harvest.pineapple,1);
});

test('saving the expanded catalog keeps existing furniture, farm plots and meal inventory',()=>{
 const original=freshState();original.life.farmUnlocked=true;original.world.visited=true;
 original.life.harvest.carrot=12;original.life.harvest['sweet-potato']=3;
 original.life.nutrition.meals.soup=2;original.life.nutrition.meals['collection-melonBowl']=1;
 original.life.seeds.pumpkin=3;plantCrop(original,0,'carrot');waterCrop(original,0);
 original.life.plots[0].ready=true;original.life.plots[0].growthSeen=true;
 const old=structuredClone(original),expanded=sanitizeState(original);
 for(const [id]of pairs){assert.equal(expanded.life.seeds[id],0);assert.equal(expanded.life.harvest[id],0);}
 for(const id of Object.keys(LESSON_RECIPES))assert.equal(expanded.life.nutrition.meals[id],0);
 expanded.life.seeds.cabbage=2;expanded.life.harvest.pineapple=6;expanded.life.nutrition.meals['lesson-taro-porridge']=1;
 const loaded=sanitizeState(JSON.parse(JSON.stringify(expanded)));
 for(const field of ['layout','kitchenLayout','bedroomLayout','bathroomLayout','furnitureOwned','owned','outfit','stars'])assert.deepEqual(loaded[field],old[field]);
 assert.deepEqual(loaded.life.plots,old.life.plots);assert.equal(loaded.life.harvest.carrot,12);
 assert.equal(loaded.life.harvest['sweet-potato'],3);assert.equal(loaded.life.seeds.pumpkin,3);
 assert.equal(loaded.life.nutrition.meals.soup,2);assert.equal(loaded.life.nutrition.meals['collection-melonBowl'],1);
 assert.equal(loaded.life.seeds.cabbage,2);assert.equal(loaded.life.harvest.pineapple,6);assert.equal(loaded.life.nutrition.meals['lesson-taro-porridge'],1);
});
