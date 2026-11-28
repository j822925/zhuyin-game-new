import {PAINTED_ISLAND} from './adventure-island-pilot.js';
import * as painted from './data/island-painted-routes.js';
import * as original from './data/island-original-routes.js';
import {COLLECTION_SEEDS} from './data/collection-foods.js';
import {LESSON_SEEDS} from './data/lesson-harvest-foods.js';
import {battleRewardLimit} from './adventure-economy.js';
import {hasEnergy} from './adventure-food-model.js';
export const GROVE_WORLD={width:2560,height:1760,cell:20};
// Landmarks/routes follow the painted raster, in world coordinates.
export const GROVE_PATH=[[.045,.95],[.11,.86],[.17,.80],[.26,.73],[.35,.65],[.39,.56],[.48,.52],[.59,.46],[.65,.39],[.66,.31],[.76,.25],[.84,.17],[.94,.07]].map(([x,y])=>({x:x*2560,y:y*1760}));
export const GROVE_ENTRY={...GROVE_PATH[0]};
export const GROVE_EXIT={...GROVE_PATH.at(-1)};
const island=PAINTED_ISLAND?painted:original;
export const {ISLAND_WORLD,ISLAND_ENTRY,ISLAND_HUB,DESTINATIONS,ISLAND_ROUTES}=island;
export const SEEDS={...COLLECTION_SEEDS,...LESSON_SEEDS,strawberry:{name:'草莓',icon:'🍓',price:1},cucumber:{name:'小黃瓜',icon:'🥒',price:1},blueberry:{name:'藍莓',icon:'🫐',price:2},lettuce:{name:'萵苣',icon:'🥬',price:2},sunflower:{name:'向日葵',icon:'🌻',price:1},pumpkin:{name:'南瓜',icon:'🎃',price:2}};
export const FREE_SEEDS=['carrot','tomato','corn'];
export const ENEMIES=[
 {id:'mushroom',name:'蘑菇寶寶',art:'mushroom',mode:'single',hp:3,reward:3,level:1},
 {id:'acorn',name:'橡果團子',art:'acorn',mode:'spelling',hp:3,reward:5,level:1},
 {id:'cloud',name:'棉花星雲',art:'cloud',mode:'tone',hp:3,reward:6,level:1},
 {id:'mushroom-chief',name:'蘑菇隊長',art:'mushroom',mode:'single',hp:5,reward:8,level:2},
 {id:'acorn-chief',name:'橡果勇士',art:'acorn',mode:'spelling',hp:5,reward:12,level:2},
 {id:'cloud-chief',name:'星雲守護者',art:'cloud',mode:'tone',hp:5,reward:15,level:2},
].map(e=>({...e,reward:battleRewardLimit({mode:e.mode,chief:e.level===2})}));
export const enemySpec=id=>ENEMIES.find(x=>x.id===id)||ENEMIES[0];
export const modeIcon=mode=>({single:'👂',spelling:'🧩',tone:'♫'})[mode];
export function freshWorld(){return {visited:false,shops:[]};}
export function sanitizeWorld(raw){return {visited:raw?.visited===true,shops:[...new Set((Array.isArray(raw?.shops)?raw.shops:[]).filter(id=>DESTINATIONS.some(d=>d.id===id&&d.kind==='shop'&&d.price>0)))]};}
export function destinationOpen(state,id){const d=DESTINATIONS.find(d=>d.id===id);return !!d&&d.ready&&(d.price===0||state.world?.shops.includes(id));}
export function unlockDestination(state,id){const d=DESTINATIONS.find(d=>d.id===id);if(!hasEnergy(state)||!state.world?.visited||!d?.ready||d.kind!=='shop'||!d.price||destinationOpen(state,id)||!Number.isInteger(state.stars)||state.stars<d.price)return false;state.stars-=d.price;state.world.shops.push(id);return true;}
export function buySeed(state,id){const seed=Object.hasOwn(SEEDS,id)&&SEEDS[id];if(!seed||!state.world?.visited||!Number.isInteger(state.stars)||state.stars<seed.price||(state.life.seeds?.[id]||0)>=9999)return false;state.stars-=seed.price;(state.life.seeds??={})[id]=(state.life.seeds[id]||0)+1;return true;}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export const GROVE_ROUTES=[GROVE_PATH,...[
 [[.26,.73],[.18,.74],[.13,.67],[.15,.60],[.19,.54]],
 [[.39,.56],[.30,.50],[.24,.40],[.21,.31],[.22,.24],[.18,.14]],
 [[.65,.39],[.57,.34],[.51,.32],[.46,.25],[.42,.19]],
 [[.72,.28],[.81,.32],[.87,.40],[.91,.48],[.92,.55]],
].map(path=>path.map(([x,y])=>({x:x*2560,y:y*1760})))];
export function deepGroveWalkable(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||x<30||y<40||x>2530||y>1730)return false;return GROVE_ROUTES.some(path=>path.slice(1).some((b,i)=>segmentDistance({x,y},path[i],b)<100));}
export function islandWalkable(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<20||y<20||x>=ISLAND_WORLD.width-20||y>=ISLAND_WORLD.height-20)return false;
 if(PAINTED_ISLAND)return painted.paintedGround(x,y);
 const point={x,y},radius=108;
 return ISLAND_ROUTES.some(line=>line.some((b,i)=>i>0&&segmentDistance(point,line[i-1],b)<radius));
}
export function newEncounter(slot,rng=Math.random,previous=null){const choices=ENEMIES.filter(e=>e.id!==previous),spec=choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))];const home=GROVE_PATH[[3,6,10][slot]],x=home.x+(rng()-.5)*45,y=home.y+(rng()-.5)*45;return {slot,id:spec.id,...spec,x,y,home:{x,y},maxHp:spec.hp,visible:true,direction:0,phase:0,moving:false,wait:1+rng()*2,respawn:0};}
export function advanceEncounters(list,dt,paused=false,rng=Math.random){
 for(let i=0;i<list.length;i++){
  const m=list[i];
  m.moving=false;
  if(paused)continue;
  if(!m.visible){m.respawn-=dt;if(m.respawn<=0)list[i]=newEncounter(m.slot,rng,m.id);continue;}
  m.wait-=dt;if(m.wait>0)continue;
  const a=m.phase*.19+i*2;
  m.phase+=dt*2.5;
  const dx=m.home.x+Math.sin(a)*38-m.x,dy=m.home.y+Math.cos(a*.8)*24-m.y;
  const distance=Math.hypot(dx,dy);
  if(distance<.001)continue;
  const step=Math.min(distance,dt*24),x=m.x+dx*step/distance,y=m.y+dy*step/distance;
  if(!deepGroveWalkable(x,y))continue;
  if(Math.abs(dx)>distance*.15)m.direction=dx<0?3:1;
  if(Math.abs(dy)>distance*.24)m.away=dy<0;
  m.x=x;m.y=y;m.walkDistance=(m.walkDistance||0)+step;m.moving=true;
 }
}
export function dismissEncounter(m,won,rng=Math.random){if(won){m.visible=false;m.respawn=12+rng()*10;}else{m.hp=m.maxHp;m.wait=2;}}
export function settleEncounter(state,roundId,enemyId){const spec=ENEMIES.find(e=>e.id===enemyId);if(!spec||typeof roundId!=='string'||!roundId||state.settled.includes(roundId))return false;state.stars=state.stars+spec.reward;state.wins=Math.min(9999,state.wins+1);state.settled.push(roundId);state.settled=state.settled.slice(-50);return true;}
