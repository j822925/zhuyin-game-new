import {FURNITURE} from './data/home-furniture.js';
import {BASIC_TOILET} from './data/bathroom-fixtures.js';
import {decayEnergy,MAX_ENERGY} from './adventure-food-model.js';
export const REST_REWARD={sleep:10,bath:5,toilet:1};
export const taipeiDay=(now=Date.now())=>new Date(now+8*3600000).toISOString().slice(0,10);
export const freshRest=()=>({sleep:null,bath:null,toilet:{day:null,count:0}});
const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
export function sanitizeRest(raw){const rest=Object.fromEntries(['sleep','bath'].map(k=>[k,validDay(raw?.[k])?raw[k]:null]));rest.toilet={day:validDay(raw?.toilet?.day)?raw.toilet.day:null,count:validDay(raw?.toilet?.day)&&Number.isInteger(raw?.toilet?.count)?Math.max(0,Math.min(5,raw.toilet.count)):0};return rest;}
export const restFurniture=id=>id===BASIC_TOILET.id?BASIC_TOILET:FURNITURE.find(f=>f.id===id);
export const restKind=f=>f?.rest||(f?.id.endsWith('-toilet')?'toilet':null);
export const toiletRemaining=(state,now=Date.now())=>Math.max(0,5-(state.homeRest?.toilet?.day>=taipeiDay(now)?state.homeRest.toilet.count:0));
const keys={room:'layout',bedroom:'bedroomLayout',kitchen:'kitchenLayout',bathroom:'bathroomLayout'};
export function restStatus(state,id,area,now=Date.now()){
 const f=restFurniture(id),kind=restKind(f),fixed=id===BASIC_TOILET.id&&area==='bathroom';
 if(!REST_REWARD[kind]||(!fixed&&(!state.furnitureOwned.includes(id)||!state[keys[area]]?.some(p=>p.id===id)))||(['bath','toilet'].includes(kind)&&area!=='bathroom'))return {ok:false,reason:'missing'};
 decayEnergy(state.life.nutrition,now);
 if(kind==='toilet'?toiletRemaining(state,now)===0:state.homeRest?.[kind]>=taipeiDay(now))return {ok:false,reason:'used',kind};
 if(state.life.nutrition.energy>=MAX_ENERGY)return {ok:false,reason:'full',kind};
 return {ok:true,kind,gain:Math.min(REST_REWARD[kind],MAX_ENERGY-state.life.nutrition.energy)};
}
export function takeRest(state,id,area,now=Date.now()){
 const result=restStatus(state,id,area,now);if(!result.ok)return result;
 state.homeRest??=freshRest();if(result.kind==='toilet'){const remaining=toiletRemaining(state,now),day=taipeiDay(now);state.homeRest.toilet={day:state.homeRest.toilet?.day>day?state.homeRest.toilet.day:day,count:6-remaining};result.remaining=remaining-1;}else state.homeRest[result.kind]=taipeiDay(now);state.life.nutrition.energy+=result.gain;return result;
}
