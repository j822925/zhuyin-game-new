import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,sanitizeState} from '../adventure-model.js';
import {COLLECTION_CROPS,COLLECTION_SEEDS,COLLECTION_FISH,COLLECTION_RECIPES,COLLECTION_SHOP_FOODS} from '../data/collection-foods.js';
import {FISH,fishForRoll,castLine,reelFish,plantCrop,waterCrop,beginFarmRound,settleFarmRound,harvestCrop} from '../adventure-life-model.js';
import {cookMeal,eatFood,ingredientCount} from '../adventure-food-model.js';
import {FISH_SALE_PRICE} from '../adventure-bait.js';
import {beginDining} from '../adventure-dining.js';
import {buySeed} from '../adventure-exploration-model.js';
import {drawFishItem} from '../adventure-life-art.js';
import {COLLECTION_FOOD_ART} from '../data/collection-food-art.js';
const round=(mode,id)=>({mode,roundId:id,total:mode==='reading'?5:10,results:Array.from({length:mode==='reading'?5:10},(_,i)=>({target:'ㄅ',firstCorrect:i<(mode==='reading'?4:7),errors:i<(mode==='reading'?4:7)?0:1}))});
test('twelve paid crops survive reload, grow only from their matching planted batch and can be harvested',()=>{
 const modes={};for(const [id,crop]of Object.entries(COLLECTION_CROPS)){
  modes[crop.lesson]=(modes[crop.lesson]||0)+1;const s=freshState();s.world.visited=true;s.life.farmUnlocked=true;s.stars=10;
  assert(buySeed(s,id));assert.equal(s.stars,10-COLLECTION_SEEDS[id].price);assert(plantCrop(s,0,id));assert.equal(s.life.seeds[id],0);assert(waterCrop(s,0));
  const ticket=beginFarmRound(s,{owner:'test-only-owner',mode:crop.lesson,roundId:id,allowClaim:true}),loaded=sanitizeState(s);assert(ticket);
  assert.equal(settleFarmRound(loaded,ticket,round(crop.lesson,id)),1);assert.equal(harvestCrop(loaded,0),id);assert.equal(settleFarmRound(loaded,ticket,round(crop.lesson,id)),0);assert.equal(sanitizeState(loaded).life.harvest[id],1);
 }assert.deepEqual(modes,{single:3,spelling:3,tone:3,reading:3});
});
test('all fifteen pond fish can be caught once using the same bait and no energy, with stable persisted discoveries',()=>{
 const entries=Object.entries(FISH).filter(([id])=>id!=='star').concat([['star',FISH.star]]);let start=0;
 for(const [id,f]of entries){const n=(start+f.weight/2)/100;start+=f.weight;assert.equal(fishForRoll(n),id);const s=freshState();s.life.pondUnlocked=true;s.life.nutrition.energy=0;s.life.bait.basic=1;
  assert(castLine(s,1000,()=>n));assert.equal(s.life.bait.basic,0);assert.equal(reelFish(s,3499),false);const saved=sanitizeState(s);assert.equal(reelFish(saved,3500),id);assert.equal(reelFish(saved,3501),false);assert.equal(saved.life.fish[id],1);assert.equal(saved.life.fishFound[id],1);assert.equal(saved.life.nutrition.energy,0);assert([1,2].includes(FISH_SALE_PRICE[id]));
 }assert.equal(start,100);assert.equal(Object.keys(COLLECTION_FISH).length,12);
});
test('new recipes consume only available crops and fish, work at zero energy and display their own meal at the table',()=>{
 for(const [id,r]of Object.entries(COLLECTION_RECIPES)){
  const s=freshState();s.life.nutrition.energy=0;s.kitchenLayout=[{id:'daisy-stove',x:640,y:500}];if(!s.furnitureOwned.includes('daisy-stove'))s.furnitureOwned.push('daisy-stove');
  for(const [key,n]of Object.entries(r.ingredients)){if(key==='fish')s.life.fish['collection-fish-0']=n;else s.life.harvest[key]=n;}
  assert(cookMeal(s,id,{area:'kitchen',stationId:'daisy-stove'}));for(const key of Object.keys(r.ingredients))assert.equal(ingredientCount(s,key),0);assert.equal(cookMeal(s,id,{area:'kitchen',stationId:'daisy-stove'}),false);
  const loaded=sanitizeState(s);assert.equal(loaded.life.nutrition.meals[id],1);const scene={area:'room',player:{},reduced:{matches:false}};assert.equal(beginDining(loaded,scene,id,true,1000),r.energy);assert.equal(scene.dining.atlas,'collectionHomeMeals');assert.equal(loaded.life.nutrition.meals[id],0);assert.equal(eatFood(loaded,id,{cooked:true}),0);
 }
});
test('shop meals remain buy-only, preserve stacks and are not consumed when full',()=>{
 assert.equal(Object.keys(COLLECTION_SHOP_FOODS).length,12);
 for(const [id,r]of Object.entries(COLLECTION_SHOP_FOODS)){const s=freshState();s.life.nutrition.meals[id]=2;s.life.nutrition.energy=100;assert.equal(cookMeal(s,id,{area:'kitchen',stationId:'daisy-stove'}),false);assert.equal(eatFood(s,id,{cooked:true}),0);const loaded=sanitizeState(s);assert.equal(loaded.life.nutrition.meals[id],2);loaded.life.nutrition.energy=10;assert.equal(eatFood(loaded,id,{cooked:true}),Math.min(90,r.energy));assert.equal(loaded.life.nutrition.meals[id],1);}
});
test('new fish artwork uses its catalog cell instead of indexing past the original three sprites',()=>{
 const art=Object.fromEntries(Object.entries(COLLECTION_FOOD_ART).map(([key,spec])=>[key,{...spec,image:key}]));
 for(const id of Object.keys(COLLECTION_FISH)){const calls=[],c={drawImage:(...args)=>calls.push(args)};drawFishItem(c,art,id,60,70,58,116);assert.equal(calls.length,1);const spec=COLLECTION_FISH[id],cell=art[spec.atlas].cells[spec.art];assert.equal(calls[0][0],'collectionFish');assert(calls[0][5]>=2);assert(calls[0][5]+calls[0][7]<=118);assert.deepEqual(calls[0].slice(1,5),[cell.x,cell.y,cell.w,cell.h]);}
});
