import {FARM_CROP_ART} from './data/farm-crop-art.js';
import {ZONE_SHOP_ART} from './data/zone-shop-art.js';
import {EXTRA_CELLS} from './data/home-extra-cells.js';
import {WALL_DECOR_ART} from './data/wall-decor-art.js';
import {HOME_EXPANSION_ART} from './data/home-expansion-art.js';
import {HOME_COMPLETION_ART} from './data/home-completion-art.js';
import {HOME_COLLECTION_ART} from './data/home-collection-art.js';
import {COLLECTION_ZONE_ART} from './data/collection-zone-art.js';
import {COLLECTION_FOOD_ART} from './data/collection-food-art.js';
import {adventureMediaUrl as mediaUrl} from './adventure-media.js';
import {HOME_ATLASES,FURNITURE} from './data/home-furniture.js';
import {HOME_CELLS} from './data/home-atlas-cells.js';
const pending=new WeakMap();
export function ensureHomeArt(art,keys=['daisyHome']){
 let jobs=pending.get(art);if(!jobs){jobs=new Map();pending.set(art,jobs);}
 return Promise.all([...new Set(keys)].map(key=>{
  if(art[key])return art[key];if(jobs.has(key))return jobs.get(key);
  const task=(async()=>{const image=new Image();image.src=mediaUrl(key==='kitchenGround'?'assets/adventure-prototype/kitchen-ground-v1.png':HOME_ATLASES[key]);await image.decode();
   const result=key==='kitchenGround'?image:{image,cells:key==='wallDecor'?WALL_DECOR_ART.cells:(HOME_CELLS[key]||EXTRA_CELLS[key]||HOME_EXPANSION_ART[key]||HOME_COMPLETION_ART[key]||HOME_COLLECTION_ART[key]||COLLECTION_ZONE_ART[key]||COLLECTION_FOOD_ART[key]||FARM_CROP_ART[key]||ZONE_SHOP_ART[key]).cells};art[key]=result;return result;
  })();jobs.set(key,task);task.catch(()=>jobs.delete(key));return task;
 }));
}
export const furnitureArtKeys=items=>items.map(item=>FURNITURE.find(f=>f.id===item.id)?.atlas).filter(Boolean);
