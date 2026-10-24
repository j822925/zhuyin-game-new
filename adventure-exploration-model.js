import {COLLECTION_SEEDS} from './data/collection-foods.js';
import {battleRewardLimit} from './adventure-economy.js';
import {ZONES} from './data/adventure-zones.js';
import {hasEnergy} from './adventure-food-model.js';
export const GROVE_WORLD={width:2560,height:1760,cell:20};
export const ISLAND_SCALE=1.5;
export const ISLAND_WORLD={width:3840,height:2400,cell:20};
// Landmarks/routes follow the painted raster, in world coordinates.
export const GROVE_PATH=[[.045,.95],[.11,.86],[.17,.80],[.26,.73],[.35,.65],[.39,.56],[.48,.52],[.59,.46],[.65,.39],[.66,.31],[.76,.25],[.84,.17],[.94,.07]].map(([x,y])=>({x:x*2560,y:y*1760}));
export const GROVE_ENTRY={...GROVE_PATH[0]};
export const GROVE_EXIT={...GROVE_PATH.at(-1)};
export const ISLAND_ENTRY={x:920*ISLAND_SCALE,y:880*ISLAND_SCALE};
export const ISLAND_HUB={x:1300*ISLAND_SCALE,y:860*ISLAND_SCALE};
// Extension point: each destination owns its kind, entry, cost and readiness.
// Future classmates must come from an authenticated same-class adapter, never mock names.
export const DESTINATIONS=[
 {id:'forest',name:'星光林地',icon:'🌲',kind:'route',x:448,y:423,entry:{x:460,y:440},price:0,ready:true},
 {id:'furniture',name:'家具行',icon:'🪑',kind:'shop',x:570,y:349,entry:{x:570,y:369},via:[{x:633,y:401},{x:586,y:384}],price:20,ready:true},
 {id:'clothes',name:'服飾店',icon:'👗',kind:'shop',x:760,y:388,entry:{x:760,y:409},via:[{x:703,y:424}],price:20,ready:true},
 {id:'seeds',name:'種子店',icon:'🌱',kind:'shop',x:700,y:284,entry:{x:695,y:305},via:[{x:657,y:382},{x:643,y:334},{x:650,y:308}],price:0,ready:true},
 {id:'harbor',name:'搭船拜訪',icon:'⛵',kind:'visits',x:448,y:649,entry:{x:480,y:629},via:[{x:640,y:476},{x:602,y:521},{x:558,y:560},{x:523,y:593}],price:0,ready:true},
] .map(d=>({...d,x:d.x*2*ISLAND_SCALE,y:d.y*2*ISLAND_SCALE,entry:{x:d.entry.x*2*ISLAND_SCALE,y:d.entry.y*2*ISLAND_SCALE},via:d.via?.map(p=>({x:p.x*2*ISLAND_SCALE,y:p.y*2*ISLAND_SCALE}))}));
DESTINATIONS.push(...ZONES.map(z=>({id:'zone-'+z.id,name:z.name,icon:z.icon,kind:'adventure',x:z.x*ISLAND_SCALE,y:z.y*ISLAND_SCALE,entry:{x:z.x*ISLAND_SCALE,y:(z.y+30)*ISLAND_SCALE},price:0,ready:true,zone:z.id})));
export const SEEDS={...COLLECTION_SEEDS,strawberry:{name:'草莓',icon:'🍓',price:1},cucumber:{name:'小黃瓜',icon:'🥒',price:1},blueberry:{name:'藍莓',icon:'🫐',price:2},lettuce:{name:'萵苣',icon:'🥬',price:2},sunflower:{name:'向日葵',icon:'🌻',price:1},pumpkin:{name:'南瓜',icon:'🎃',price:2}};
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
// Same shops and saved IDs; only the painted island's coastline/paths moved.
// The northern footpath is scenery for now, not an unlocked adventure region.
const rawRoutes=[
 [[460,440],[513,457],[565,463],[619,455],[650,430],[657,382],[643,334],[630,307],[645,268],[674,233],[693,203],[774,152],[875,139],[968,101],[1060,86],[1175,58],[1250,30]],
 [[650,430],[633,401],[586,384],[570,369]],[[650,430],[703,424],[760,409]],
 [[630,307],[650,308],[695,305]],[[774,152],[740,90],[760,70],[710,50],[660,60]],
 [[650,430],[640,476],[602,521],[558,560],[523,593],[480,629],[440,655],[399,697]],
 [[558,560],[455,585],[380,605],[275,654],[170,667]],
 [[602,521],[685,548],[755,565]],[[480,629],[565,666],[620,690]]
 ];
 export const ISLAND_ROUTES=rawRoutes.map(path=>path.map(([x,y])=>({x:x*2*ISLAND_SCALE,y:y*2*ISLAND_SCALE})));
 for(const z of ZONES){const p={x:z.x*ISLAND_SCALE,y:(z.y+30)*ISLAND_SCALE};let nearest=ISLAND_ROUTES.flat().reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b);ISLAND_ROUTES.push([nearest,p]);}
 export function islandWalkable(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=20&&y>=20&&x<ISLAND_WORLD.width-20&&y<ISLAND_WORLD.height-20&&ISLAND_ROUTES.some(path=>path.slice(1).some((b,i)=>segmentDistance({x,y},path[i],b)<72*ISLAND_SCALE));}
 export function newEncounter(slot,rng=Math.random,previous=null){const choices=ENEMIES.filter(e=>e.id!==previous),spec=choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))];const home=GROVE_PATH[[3,6,10][slot]],x=home.x+(rng()-.5)*45,y=home.y+(rng()-.5)*45;return {slot,id:spec.id,...spec,x,y,home:{x,y},maxHp:spec.hp,visible:true,direction:0,phase:0,moving:false,wait:1+rng()*2,respawn:0};}
export function advanceEncounters(list,dt,paused=false,rng=Math.random){if(paused)return;for(let i=0;i<list.length;i++){const m=list[i];if(!m.visible){m.respawn-=dt;if(m.respawn<=0)list[i]=newEncounter(m.slot,rng,m.id);continue;}m.wait-=dt;m.moving=false;if(m.wait>0)continue;const a=m.phase*.19+i*2;const x=m.home.x+Math.sin(a)*38,y=m.home.y+Math.cos(a*.8)*24;if(deepGroveWalkable(x,y)){m.direction=x<m.x?3:1;m.x=x;m.y=y;m.moving=true;}m.phase+=dt*2.5;}}
export function dismissEncounter(m,won,rng=Math.random){if(won){m.visible=false;m.respawn=12+rng()*10;}else{m.hp=m.maxHp;m.wait=2;}}
export function settleEncounter(state,roundId,enemyId){const spec=ENEMIES.find(e=>e.id===enemyId);if(!spec||typeof roundId!=='string'||!roundId||state.settled.includes(roundId))return false;state.stars=state.stars+spec.reward;state.wins=Math.min(9999,state.wins+1);state.settled.push(roundId);state.settled=state.settled.slice(-50);return true;}
