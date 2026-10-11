import {SHOP_FOODS} from './data/zone-shop-foods.js';
import {FURNITURE} from './data/home-furniture.js';
export const MAX_ENERGY=100;
export const ENERGY_COST={fish:0,battle:8};
export const ENERGY_DECAY_MS=60*60*1000;
export const RAW_FOOD={strawberry:{name:'草莓',energy:9},cucumber:{name:'小黃瓜',energy:8},blueberry:{name:'藍莓',energy:10},lettuce:{name:'萵苣',energy:6},carrot:{name:'紅蘿蔔',energy:8},tomato:{name:'小番茄',energy:6},corn:{name:'甜玉米',energy:8}};
export const INGREDIENT_NAMES={carrot:'紅蘿蔔',tomato:'小番茄',corn:'甜玉米',pumpkin:'南瓜',fish:'魚'};
export const RECIPES={...SHOP_FOODS,
 soup:{name:'蔬菜暖湯',ingredients:{carrot:1,tomato:1},energy:35,art:2,description:'第一道家常料理，把今天的收穫煮成暖暖的一碗。'},
 tomatoFish:{name:'番茄烤魚',ingredients:{fish:1,tomato:2},energy:55,art:3,description:'把池塘釣到的魚，配上香甜的小番茄。'},
 cornCup:{name:'香甜玉米盅',ingredients:{corn:2,tomato:1},energy:45,art:4,description:'金黃玉米加上番茄丁，裝進小木杯。'},
 pumpkinPlate:{name:'南瓜烤蔬菜',ingredients:{pumpkin:1,carrot:1},energy:40,art:5,description:'慢慢烤出南瓜和紅蘿蔔的香甜。'},
};
const count=n=>Number.isSafeInteger(n)&&n>=0?Math.min(9999,n):0;
export function freshNutrition(now=Date.now()){return {energy:MAX_ENERGY,meals:Object.fromEntries(Object.keys(RECIPES).map(id=>[id,0])),updatedAt:now};}
export function sanitizeNutrition(raw,now=Date.now()){const n=freshNutrition(now);if(!raw||typeof raw!=='object')return n;
 n.energy=Number.isFinite(raw.energy)?Math.max(0,Math.min(MAX_ENERGY,Math.floor(raw.energy))):MAX_ENERGY;
 for(const id of Object.keys(RECIPES))n.meals[id]=count(raw.meals?.[id]);
 n.updatedAt=Number.isFinite(raw.updatedAt)&&raw.updatedAt>0?Math.min(now,raw.updatedAt):now;decayEnergy(n,now);return n;
}
// Retain the fraction of the hour across reloads; no per-frame or per-login penalty.
export function decayEnergy(n,now=Date.now()){if(!n||!Number.isFinite(now)||now<n.updatedAt)return 0;const hours=Math.floor((now-n.updatedAt)/ENERGY_DECAY_MS);if(hours<1)return 0;const lost=Math.min(n.energy,hours);n.energy-=lost;n.updatedAt+=hours*ENERGY_DECAY_MS;return hours;}
export function hasEnergy(state){decayEnergy(state.life?.nutrition);return state.life?.nutrition?.energy>0;}
export function canSpendEnergy(state,action){const cost=ENERGY_COST[action];decayEnergy(state.life?.nutrition);return Number.isInteger(cost)&&state.life?.nutrition?.energy>=cost;}
export function spendEnergy(state,action){if(!canSpendEnergy(state,action))return false;state.life.nutrition.energy-=ENERGY_COST[action];return true;}
export function ingredientCount(state,id){return id==='fish'?Object.values(state.life.fish).reduce((a,b)=>a+b,0):(state.life.harvest[id]||0);}
export function canCook(state,id,{stationId,area}={}){if(!hasEnergy(state)||area!=='kitchen'||!state.furnitureOwned?.includes(stationId)||!FURNITURE.some(f=>f.id===stationId&&f.cooking)||!state.kitchenLayout?.some(f=>f.id===stationId))return false;const r=Object.hasOwn(RECIPES,id)&&RECIPES[id];return !!r&&!r.buyOnly&&state.life.nutrition.meals[id]<9999&&Object.entries(r.ingredients).every(([key,n])=>ingredientCount(state,key)>=n);}
export function cookMeal(state,id,context){if(!canCook(state,id,context))return false;
 for(const [key,amount]of Object.entries(RECIPES[id].ingredients)){
  if(key==='fish'){let remaining=amount;for(const fish of Object.keys(state.life.fish)){const used=Math.min(remaining,state.life.fish[fish]);state.life.fish[fish]-=used;remaining-=used;}}
  else state.life.harvest[key]-=amount;
 }
 state.life.nutrition.meals[id]++;return true;
}
export function eatFood(state,id,{cooked=false}={}){const catalog=cooked?RECIPES:RAW_FOOD,food=Object.hasOwn(catalog,id)&&catalog[id],inventory=cooked?state.life.nutrition.meals:state.life.harvest,n=state.life.nutrition;decayEnergy(n);
 if(!food||!inventory[id]||n.energy>=MAX_ENERGY)return 0;
 const restored=Math.min(food.energy,MAX_ENERGY-n.energy);inventory[id]--;n.energy+=restored;return restored;
}
