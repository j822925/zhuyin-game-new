import {walkOutfit} from './data/walk-outfits.js';
import {loadOutfitArt,drawOutfit} from './adventure-outfits-art.js';
import {loadWalker,drawWalker} from './adventure-characters.js';

const ready=new Map(),pending=new Map();
export function clothingCharacter(id){return walkOutfit(id)?.character||({'fox-original':'fox','bear-original':'bear'})[id];}
export function ensureClothingArt(id){
  if(!clothingCharacter(id))return Promise.resolve(null);
  if(ready.has(id))return Promise.resolve(ready.get(id));
  if(pending.has(id))return pending.get(id);
  const item=walkOutfit(id);
  const job=(item?loadOutfitArt(id):loadWalker(clothingCharacter(id))).then(value=>{ready.set(id,value);return value;}).finally(()=>pending.delete(id));
  pending.set(id,job);return job;
}
export function drawClothing(c,art,options){
  const value=ready.get(options.outfit);if(!value)return false;
  if(walkOutfit(options.outfit))drawOutfit(c,value,options);
  else drawWalker(c,art,value,options);
  return true;
}
