import {GROVE_ENTRY,GROVE_EXIT,DESTINATIONS} from './adventure-exploration-model.js';
import {ROOM_KITCHEN_APPROACH,ROOM_BEDROOM_APPROACH} from './adventure-model.js';
import {FARM_GATE,POND_BANK} from './adventure-life-model.js';

const exit=(id,point,target,radius=55)=>({id,...point,target,radius});
export const AREA_EXITS={
 forest:[exit('home',{x:260,y:370},'room'),exit('grove',{x:988,y:400},'grove'),exit('farm',FARM_GATE,'farm'),exit('pond',POND_BANK,'pond')],
 room:[exit('outside',{x:640,y:715},'forest',40),exit('kitchen',ROOM_KITCHEN_APPROACH,'kitchen'),exit('bedroom',ROOM_BEDROOM_APPROACH,'bedroom')],
 kitchen:[exit('living',ROOM_BEDROOM_APPROACH,'room')],
 bedroom:[exit('living',ROOM_KITCHEN_APPROACH,'room'),exit('bathroom',ROOM_BEDROOM_APPROACH,'bathroom')],
 bathroom:[exit('bedroom',ROOM_KITCHEN_APPROACH,'bedroom')],
 farm:[exit('village',{x:625,y:730},'forest')],
 grove:[exit('village',GROVE_ENTRY,'forest',85),exit('island',GROVE_EXIT,'island',85)],
 island:DESTINATIONS.map(d=>({...exit(d.id,d.entry,d.kind==='route'?'grove':'destination',64),interaction:'offer'})),
};
// Latch until the player leaves the doorway: no bounce on arrival, reopen on
// closing a shop, or repeated locked-entry prompt while standing still.
export function createExitProximity(){
 let current=null,held=new Set();
 const distance=(p,e)=>Math.hypot(p.x-e.x,p.y-e.y);
 function reset(area,p){current=area;held=new Set((AREA_EXITS[area]||[]).filter(e=>distance(p,e)<=e.radius+24).map(e=>e.id));}
 function poll(area,p,blocked=false){
  if(blocked)return null;
  if(current!==area){reset(area,p);return null;}
  for(const e of AREA_EXITS[area]||[]){
   const d=distance(p,e);if(d>e.radius+24)held.delete(e.id);
   else if(d<=e.radius&&!held.has(e.id)){held.add(e.id);return e;}
  }
  return null;
 }
 return {reset,poll};
}
