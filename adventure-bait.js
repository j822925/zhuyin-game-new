import {COLLECTION_FISH} from './data/collection-foods.js';
export const BAITS={basic:{name:'池塘魚餌',icon:'🪱',price:1}};
export const STARTER_BAIT=10;
export const FISH_SALE_PRICE={...Object.fromEntries(Object.entries(COLLECTION_FISH).map(([id,f])=>[id,f.salePrice])),silver:1,gold:1,star:2};
export function buyBait(state,id){const bait=BAITS[id];if(!bait||!Number.isSafeInteger(state.stars)||state.stars<bait.price||(state.life.bait?.[id]||0)>=9999)return false;state.stars-=bait.price;(state.life.bait??={})[id]=(state.life.bait[id]||0)+1;return true;}
