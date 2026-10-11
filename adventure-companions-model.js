import {WALK_CATALOG} from './data/walk-catalog.js?v=walk-approved-v36';
import {hasEnergy} from './adventure-food-model.js';

export const companionById=id=>WALK_CATALOG.find(c=>c.id===id);
export const companionReady=c=>!!c&&(c.id==='rabbit'||(c.walk?.approved===true&&!c.walk.reviewPending));
export function companionPrice(c){
 if(!c)return null;if(c.id==='rabbit')return 0;
 const prices={fox:20,cat:30,rose:50,footballer:60,swordsman:80};
 return prices[c.id]??({animal:20,fairy:50,hero:80}[c.category]??100);
}
export const freshCompanions=()=>({unlocked:['rabbit'],active:'rabbit'});
export function sanitizeCompanions(raw){
 const unlocked=[...new Set(['rabbit',...(Array.isArray(raw?.unlocked)?raw.unlocked.filter(id=>companionById(id)):[])])];
 return {unlocked,active:unlocked.includes(raw?.active)&&companionReady(companionById(raw.active))?raw.active:'rabbit'};
}
// Card ownership is an input, never granted by paying the forest fee.
export function companionStatus(state,id,cards=[]){
 const c=companionById(id);if(!c)return 'unknown';
 if(!companionReady(c))return 'preparing';
 if(id!=='rabbit'&&!cards.includes(id))return 'card-needed';
 if(state.companions.unlocked.includes(id))return 'unlocked';
 return Number.isInteger(state.stars)&&state.stars>=companionPrice(c)?'available':'insufficient';
}
export function canUseCompanion(state,id,cards=[]){return companionStatus(state,id,cards)==='unlocked';}
export function selectCompanion(state,id,cards=[]){
 if(!hasEnergy(state)||!canUseCompanion(state,id,cards))return false;
 state.companions.active=id;return true;
}
export function unlockCompanion(state,id,cards=[]){
 if(!hasEnergy(state)||companionStatus(state,id,cards)!=='available')return false;
 state.stars-=companionPrice(companionById(id));state.companions.unlocked.push(id);return true;
}
// This existing home is a local teacher playtest, with its own wallet. Example
// cards are scoped to loopback only; never import or award student collection data.
export const FOREST_TRIAL_CARDS=['rabbit','bear','fox','cat','rose','footballer','swordsman','star-37-yu'];
export function forestPreviewCards(hostname){return ['localhost','127.0.0.1','[::1]'].includes(hostname)?[...FOREST_TRIAL_CARDS]:['rabbit'];}

