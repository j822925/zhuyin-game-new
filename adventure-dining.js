import {FURNITURE,roomWalkable,placementState,INTERIOR_AREAS,layoutKeyFor} from './adventure-model.js';
import {RECIPES,RAW_FOOD,eatFood,hasEnergy} from './adventure-food-model.js';
import {CROPS} from './adventure-life-model.js';

export const DINING_TABLES=FURNITURE.filter(f=>f.dining).map(f=>f.id);
export function diningSpot(state,tableId=null){
 for(const table of state.layout||[]){
  if(tableId&&table.id!==tableId)continue;
  if(!DINING_TABLES.includes(table.id)||!state.furnitureOwned.includes(table.id))continue;
  const f=FURNITURE.find(f=>f.id===table.id),y=Math.min(720,table.y+12);
  for(const side of [-1,1]){const x=table.x+side*96;if(roomWalkable(x,y,state,'room'))return {table:{...table},surface:{x:table.x,y:table.y-f.height*.72},player:{x,y,direction:side===-1?1:3,moving:false,phase:0}};}
 }
 return null;
}
// Narrow zero-energy exception: restore one owned table, no purchase or free edit.
export function restoreDiningTable(state){
 if(hasEnergy(state)||diningSpot(state))return false;
 const id=DINING_TABLES.find(id=>state.furnitureOwned.includes(id));if(!id)return false;
 const next=placementState(state,id,{x:610,y:492},'room');
 for(const area of INTERIOR_AREAS)state[layoutKeyFor(area)]=next[layoutKeyFor(area)];return true;
}
export function availableFood(state,id,cooked){
 const catalog=cooked?RECIPES:RAW_FOOD,food=Object.hasOwn(catalog,id)&&catalog[id],items=cooked?state.life.nutrition.meals:state.life.harvest;
 return !!food&&items[id]>0&&state.life.nutrition.energy<100;
}
export function beginDining(state,scene,id,cooked,now=performance.now(),tableId=null){
 if(scene.area!=='room'||scene.dining)return false;
 const spot=diningSpot(state,tableId);if(!spot)return false;
 const gained=eatFood(state,id,{cooked});if(!gained)return false;
 const crop=CROPS[id],recipe=RECIPES[id];scene.player={...scene.player,...spot.player};
 scene.dining={...spot,id,cooked,gained,atlas:cooked?'cooking':crop.atlas||'life',index:cooked?recipe.art:crop.art,start:now,duration:scene.reduced.matches?1100:3200};return gained;
}
export function diningFrame(effect,now,reduced=false){
 const t=Math.max(0,Math.min(1,(now-effect.start)/effect.duration)),side=effect.player.direction===1?1:-1;
 const hand={x:effect.player.x+side*25,y:effect.player.y-52},mouth={x:effect.player.x+side*20,y:effect.player.y-80};
 const mix=(a,b,p)=>({x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p});
 let at=effect.surface;
 if(t>=.25&&t<.5)at=mix(effect.surface,hand,(t-.25)/.25);
 else if(t>=.5&&t<.72)at=mix(hand,mouth,(t-.5)/.22);
 else if(t>=.72)at=mouth;
 if(reduced)at=t<.65?effect.surface:mouth;
 return {...at,t,alpha:t<.72?1:Math.max(0,1-(t-.72)/.13),lean:reduced?0:Math.sin(Math.min(1,t/.72)*Math.PI)*side*.035,done:t===1};
}
export function drawDining(c,art,scene,now){
 const e=scene.dining;if(!e||scene.area!=='room')return;const f=diningFrame(e,now,scene.reduced.matches),atlas=art[e.atlas];
 if(f.alpha>0){c.save();c.globalAlpha=f.alpha;const size=36*(1-.4*Math.max(0,Math.min(1,(f.t-.5)/.35)));
  // Raw crop atlases contain plants and soil; use the existing food icon instead.
  if(!e.cooked){c.font=`${size*.89}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(CROPS[e.id].icon,f.x,f.y-5);}
  else if(atlas){const cell=atlas.cells[e.index],h=size,w=cell.w/cell.h*h;c.drawImage(atlas.image,cell.x,cell.y,cell.w,cell.h,f.x-w/2,f.y-h*.65,w,h);}
  c.restore();
 }
 if(f.t>.84){c.save();c.fillStyle='#fff9df';c.strokeStyle='#547053';c.lineWidth=4;c.font='bold 18px sans-serif';c.textAlign='center';const x=e.player.x,y=e.player.y-128;c.strokeText('⚡ +'+e.gained,x,y);c.fillText('⚡ +'+e.gained,x,y);c.restore();}
}
