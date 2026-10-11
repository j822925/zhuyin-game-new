import {adventureMediaUrl as mediaUrl} from './adventure-media.js';
// Painted ground stays a single raster layer; sprites and save data stay separate.
export async function loadTerrain(){
 const terrain={};await ensureTerrain(terrain,'village');return terrain;
}
const jobs=new WeakMap();
export function ensureTerrain(terrain,area){
 if(!['village','farm'].includes(area))return Promise.reject(new Error('Unknown terrain'));
 if(terrain[area])return Promise.resolve(terrain[area]);
 let pending=jobs.get(terrain);if(!pending){pending=new Map();jobs.set(terrain,pending);}
 if(pending.has(area))return pending.get(area);
 const task=(async()=>{const image=new Image();image.src=mediaUrl(`assets/adventure-prototype/${area}-ground-painted-v1.png`);await image.decode();terrain[area]=image;return image;})();
 pending.set(area,task);task.catch(()=>pending.delete(area));return task;
}

export function drawFieldDetail(c,art){
 const image=art.terrain.farm;
 // A close-up from the same uninterrupted field, not an isolated planter box.
 c.drawImage(image,image.width*.23,image.height*.43,image.width*.52,image.height*.32,0,0,600,300);
}
