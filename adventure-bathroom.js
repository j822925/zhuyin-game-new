import {BATHROOM_ART} from './data/bathroom-art.js';
const jobs=new WeakMap();
export function ensureBathroom(art){
 if(art.bathroomGround)return Promise.resolve(art.bathroomGround);if(jobs.has(art))return jobs.get(art);
 const task=(async()=>{const image=new Image();image.src=BATHROOM_ART.src;await image.decode();art.bathroomGround=image;return image;})();
 jobs.set(art,task);task.catch(()=>jobs.delete(art));return task;
}
