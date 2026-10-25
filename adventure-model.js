import {freshRest,sanitizeRest} from './adventure-rest-model.js';
import {attachedPosition,freeSurfacePosition,surfaceAnchor,furnitureSurfaces,surfaceItemWidth,planSurfacePlacement} from './furniture-surfaces.js';
import {decodeHomeSurfaceState} from './home-surface-storage.js';
import {spatialFields,spatialFootprint,spatialFloorValid,floorPosition,canonicalMountedPosition,placementBlocksDoor,HOME_FLOOR,HOME_DOOR_SPACE} from './home-spatial-model.js';
import {WALK_OUTFITS} from './data/walk-outfits.js';
import {wallPosition,wallPlacementValid,wallSide} from './data/home-wall-furniture.js';
import {freshExpedition,sanitizeExpedition} from './adventure-expedition-model.js';
import {freshWorld,sanitizeWorld,deepGroveWalkable} from './adventure-exploration-model.js';
import {hasEnergy} from './adventure-food-model.js';
import {freshCompanions,sanitizeCompanions} from './adventure-companions-model.js';
import {FURNITURE,STARTER_FURNITURE} from './data/home-furniture.js';
import {WALLPAPERS} from './data/home-wallpapers.js';
export {FURNITURE} from './data/home-furniture.js';
// An isolated, local-only playtest. Never reads classroom wallets or student records.
import {freshLife,sanitizeLife} from './adventure-life-model.js';
export const SAVE_KEY = 'zhuyin.forest-adventure.v1';
const LOCAL_TESTER_GRANT='20261004-wallet-repair';
export function applyLocalTesterGrant(state,hostname){
  if(!['127.0.0.1','localhost','[::1]'].includes(hostname)||state.localTesterGrant===LOCAL_TESTER_GRANT)return false;
  state.stars=Math.max(state.stars,1000);state.localTesterGrant=LOCAL_TESTER_GRANT;return true;
}
export const WORLD = {width:1280,height:800,cell:20};
export const SPAWN = {x:440,y:510};
export const MONSTER_HOME = {x:820,y:426};
// Waterline measured on the painted ground; both woodland areas share it.
export const POND_BOUNDS = {x:1040,y:593,rx:151,ry:88};
export const OUTFITS = [
  {id:'daisy',name:'雛菊日常服',description:'把小小花園穿在身上。',price:0,roles:['rabbit'],row:0},
  ...WALK_OUTFITS.filter(item=>item.approved).map(item=>({id:item.id,name:item.name,description:{rabbit:'棉花兔專用',fox:'橘子狐專用',bear:'蜂蜜熊專用'}[item.character],price:item.price,character:item.character,roles:[item.character]})),
  {id:'fox-original',name:'橘子狐原本服裝',description:'橘子狐專用',price:0,roles:['fox'],character:'fox'},
  {id:'bear-original',name:'蜂蜜熊原本服裝',description:'蜂蜜熊專用',price:0,roles:['bear'],character:'bear'},
  {id:'knight',name:'星光騎士裝',description:'閃亮披風，等星星騎士來穿。',price:12,roles:['knight'],row:null},
];
export const outfitCharacter=id=>OUTFITS.find(o=>o.id===id)?.roles[0];
export const defaultOutfit=character=>character==='fox'?'fox-original':character==='bear'?'bear-original':'daisy';
// Keep the legacy rabbit outfit field; other companions remember independent clothes.
export const equippedOutfit=(state,character=state.companions?.active||'rabbit')=>character==='rabbit'?state.outfit:state.companionOutfits?.[character]||defaultOutfit(character);
export const outfitIsWorn=(state,id)=>state.outfit===id||Object.values(state.companionOutfits||{}).includes(id);
export const TREES = [
  {x:72,y:240,size:218,type:1},{x:80,y:436,size:232,type:1},
  {x:90,y:698,size:224,type:2},{x:252,y:742,size:210,type:1},
  {x:461,y:203,size:238,type:1},{x:623,y:208,size:204,type:2},
  {x:775,y:167,size:207,type:1},{x:971,y:212,size:230,type:2},
  {x:1128,y:306,size:248,type:1},{x:1203,y:434,size:226,type:2},
  {x:592,y:694,size:226,type:1},{x:1160,y:780,size:220,type:2},
];
export const OBSTACLES = [
  {kind:'rect',x:118,y:165,w:244,h:158},
  {kind:'ellipse',...POND_BOUNDS},
  ...TREES.map(t=>({kind:'ellipse',x:t.x,y:t.y-8,rx:23,ry:17})),
];
// The starter forest stays free. One additional region is a permanent unlock.
export const GROVE_PRICE=10;
export const GROVE_TREES=[...TREES,{x:230,y:286,size:270,type:2},{x:357,y:263,size:205,type:1}];
export function unlockGrove(state){if(!hasEnergy(state))return false;
  if(state.groveUnlocked||!Number.isInteger(state.stars)||state.stars<GROVE_PRICE)return false;
  state.stars-=GROVE_PRICE;state.groveUnlocked=true;return true;
}
export function groveWalkable(x,y,padding=13){return deepGroveWalkable(x,y);}
function legacyGroveWalkable(x,y,padding=13){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<24||x>WORLD.width-24||y<65||y>WORLD.height-26)return false;
  if(((x-POND_BOUNDS.x)/(POND_BOUNDS.rx+padding))**2+((y-POND_BOUNDS.y)/(POND_BOUNDS.ry+padding))**2<1)return false;
  return !GROVE_TREES.some(t=>((x-t.x)/(23+padding))**2+((y-(t.y-8))/(17+padding))**2<1);
}
export const ROOM_ENTRY={x:640,y:684};
export const ROOM_WARDROBE={x:1030,y:HOME_FLOOR.back+65};
export const ROOM_WARDROBE_APPROACH={x:ROOM_WARDROBE.x,y:ROOM_WARDROBE.y+53};
// Door thresholds follow the painted side-wall skirting, not the floor plane.
export const WALL_DOOR={width:53,height:210,rise:127};
export const ROOM_KITCHEN_DOOR={x:1165,y:HOME_DOOR_SPACE.anchorY};
export const ROOM_KITCHEN_APPROACH={x:1050,y:HOME_DOOR_SPACE.approachY};
export const ROOM_BEDROOM_DOOR={x:115,y:HOME_DOOR_SPACE.anchorY};
export const ROOM_BEDROOM_APPROACH={x:230,y:HOME_DOOR_SPACE.approachY};
export const KITCHEN_ENTRY={x:640,y:684};
export const INTERIOR_AREAS=['room','kitchen','bedroom','bathroom'];
export const layoutKeyFor=(area='room')=>({room:'layout',kitchen:'kitchenLayout',bedroom:'bedroomLayout',bathroom:'bathroomLayout'})[area];
export const layoutFor=(state,area='room')=>state[layoutKeyFor(area)]||[];
export const isInterior=area=>INTERIOR_AREAS.includes(area);
export const DEFAULT_LAYOUT=[{id:'sofa',x:830,y:450},{id:'rug',x:610,y:558},{id:'table',x:610,y:492},{id:'plant',x:996,y:596}];
export const DEFAULT_BEDROOM_LAYOUT=[{id:'bed',x:320,y:434},{id:'lamp',x:234,y:612}];
const RECT_WARDROBE={x:ROOM_WARDROBE.x-74,y:ROOM_WARDROBE.y-55,w:142,h:63};
const DOOR_CLEARANCE={x:550,y:628,w:180,h:116};
export function freshState(){return {version:1,homeRest:freshRest(),bathroomLayout:[],expedition:freshExpedition(),world:freshWorld(),companions:freshCompanions(),homeRoomsVersion:1,starterKitchenVersion:1,stars:12,roles:['rabbit'],owned:['daisy'],outfit:'daisy',wand:true,wins:0,settled:[],visited:false,groveUnlocked:false,life:freshLife(),wallpaper:'original',wallpaperOwned:['original'],furnitureOwned:[...STARTER_FURNITURE],kitchenLayout:[{id:'daisy-stove',x:800,y:410}],bedroomLayout:DEFAULT_BEDROOM_LAYOUT.map(x=>({...x})),layout:DEFAULT_LAYOUT.map(x=>({...x}))};}
export function sanitizeState(raw){
  const s=freshState();if(!raw||raw.version!==1)return s;
  raw=decodeHomeSurfaceState(raw,FURNITURE);
  s.homeRest=sanitizeRest(raw.homeRest);s.expedition=sanitizeExpedition(raw.expedition);s.companions=sanitizeCompanions(raw.companions);s.world=sanitizeWorld(raw.world);
  s.stars=Number.isInteger(raw.stars)&&raw.stars>=0?raw.stars:12;
  if(raw.localTesterGrant===LOCAL_TESTER_GRANT)s.localTesterGrant=LOCAL_TESTER_GRANT;
  // Only the rabbit is unlockable in this playtest; local imports cannot unlock the knight.
  s.owned=[...new Set(['daisy',...(Array.isArray(raw.owned)?raw.owned.filter(id=>WALK_OUTFITS.some(o=>o.approved&&o.id===id)):[])])];
  s.outfit=s.owned.includes(raw.outfit)&&outfitCharacter(raw.outfit)==='rabbit'?raw.outfit:'daisy';s.wand=raw.wand!==false;
  if(raw.companionOutfits&&typeof raw.companionOutfits==='object'){
    const outfits={};for(const character of ['fox','bear']){const id=raw.companionOutfits[character];if(outfitCharacter(id)===character&&(s.owned.includes(id)||id===defaultOutfit(character)))outfits[character]=id;}
    if(Object.keys(outfits).length)s.companionOutfits=outfits;
  }
  s.wins=Number.isInteger(raw.wins)&&raw.wins>=0?Math.min(9999,raw.wins):0;
  s.settled=Array.isArray(raw.settled)?raw.settled.filter(x=>typeof x==='string').slice(-50):[];
  s.visited=raw.visited===true;
  s.groveUnlocked=raw.groveUnlocked===true;
  s.life=sanitizeLife(raw.life);
  s.wallpaperOwned=[...new Set(['original',...(Array.isArray(raw.wallpaperOwned)?raw.wallpaperOwned.filter(id=>WALLPAPERS.some(w=>w.id===id)):[])])];
  s.wallpaper=s.wallpaperOwned.includes(raw.wallpaper)?raw.wallpaper:'original';
  s.furnitureOwned=[...new Set([...STARTER_FURNITURE,...(Array.isArray(raw.furnitureOwned)?raw.furnitureOwned.filter(id=>FURNITURE.some(f=>f.id===id)):[])])];
  // Only explicitly wall-snapped furniture moves with the new room shell.
  // This uses absolute positions rather than a one-time flag, so repeated cloud
  // loads cannot drift. Restore hosts first; their saved small objects follow below.
  const restoreHost=(item,area)=>{
    if(!item||item.on||!Number.isFinite(item.x)||!Number.isFinite(item.y))return null;
    const f=FURNITURE.find(f=>f.id===item.id);if(!f)return null;
    const legacy={allowDoorOverlap:true},aligned=f.wall&&!f.ceiling&&wallSide(item)!==0?wallPosition(item,f,area):canonicalMountedPosition(item,f,area),pos=aligned&&canPlaceFurniture(s,item.id,aligned,area)?aligned:item;
    return canPlaceFurniture(s,item.id,pos,area,legacy)?{id:item.id,x:pos.x,y:pos.y,...spatialFields(pos)}:null;
  };
  if(Array.isArray(raw.layout)){
    s.layout=[];
    for(const item of raw.layout){const restored=restoreHost(item,'room');if(restored&&!s.layout.some(f=>f.id===restored.id))s.layout.push(restored);}
  }
  s.kitchenLayout=[];s.bedroomLayout=[];s.bathroomLayout=[];
  for(const area of ['kitchen','bedroom','bathroom'])for(const item of Array.isArray(raw[layoutKeyFor(area)])?raw[layoutKeyFor(area)]:[]){
    const restored=restoreHost(item,area);if(restored&&!INTERIOR_AREAS.some(a=>layoutFor(s,a).some(f=>f.id===restored.id)))s[layoutKeyFor(area)].push(restored);
  }
  // A native side worktop is shorter than the old rectangular placeholder.
  // Reflow a complete legacy row together so an unchanged middle appliance
  // cannot strand its neighbours. Already-valid native rows never move again.
  const adjustedAttachments=new Map();
  for(const area of INTERIOR_AREAS)for(const host of layoutFor(s,area)){
    const base=FURNITURE.find(f=>f.id===host.id),surfaces=furnitureSurfaces(base,host);
    surfaces.forEach((surface,index)=>{
      if(!surface.nativeSideSurface)return;
      const oldWidth=furnitureSurfaces(base)[index].width,items=(Array.isArray(raw[layoutKeyFor(area)])?raw[layoutKeyFor(area)]:[]).filter(p=>p?.on===host.id&&p.surface===index&&Number.isFinite(p.offsetX)&&s.furnitureOwned.includes(p.id)&&FURNITURE.some(f=>f.id===p.id&&f.small&&Math.abs(p.offsetX)+f.fw/2<=oldWidth/2+1));
      items.sort((a,b)=>a.offsetX-b.offsetX);const widths=items.map(p=>surfaceItemWidth(FURNITURE.find(f=>f.id===p.id),p,host,surface)),total=widths.reduce((sum,n)=>sum+n,0)+3*(items.length-1);
      const overlap=surface.nativeCabinetProjection&&items.some((p,i)=>i&&p.offsetX-widths[i]/2<items[i-1].offsetX+widths[i-1]/2+3-1e-7);
      if(!overlap&&!items.some(p=>!attachedPosition(p,layoutFor(s,area),FURNITURE)))return;
      if(total>surface.width)return;
      let edge=-total/2;items.forEach((item,i)=>{const pos=attachedPosition({...item,offsetX:edge+widths[i]/2},layoutFor(s,area),FURNITURE);if(pos)adjustedAttachments.set(area+':'+item.id,pos);edge+=widths[i]+3;});
    });
  }
  // Hosts first, then their small objects, independent of save array ordering.
  for(const area of INTERIOR_AREAS)for(const item of Array.isArray(raw[layoutKeyFor(area)])?raw[layoutKeyFor(area)]:[]){
    if(!item?.on||INTERIOR_AREAS.some(a=>layoutFor(s,a).some(p=>p.id===item.id)))continue;
    const pos=adjustedAttachments.get(area+':'+item.id)||attachedPosition(item,layoutFor(s,area),FURNITURE);if(pos&&canPlaceFurniture(s,item.id,pos,area))s[layoutKeyFor(area)].push({id:item.id,...pos});
  }
  // The compact L has three separate usable spans around its sink. Restore
  // valid placements first, then allocate former 210/120-unit overflows largest
  // first so a small decoration cannot consume the only space for an oven.
  // No purchases are removed and no sink is counted as a usable countertop.
  for(const area of INTERIOR_AREAS)for(const item of (Array.isArray(raw[layoutKeyFor(area)])?[...raw[layoutKeyFor(area)]]:[]).sort((a,b)=>(FURNITURE.find(f=>f.id===b?.id)?.fw||0)-(FURNITURE.find(f=>f.id===a?.id)?.fw||0))){
    if(!item?.on||!Number.isFinite(item.offsetX)||INTERIOR_AREAS.some(a=>layoutFor(s,a).some(p=>p.id===item.id)))continue;
    const f=FURNITURE.find(f=>f.id===item.id),host=layoutFor(s,area).find(p=>p.id===item.on),base=FURNITURE.find(f=>f.id===host?.id);
    const effective=host&&furnitureSurfaces(base,host)[item.surface],oldWidth=base?.corner?({0:210,1:120,2:78})[item.surface]||0:effective?.nativeSideSurface?furnitureSurfaces(base)[item.surface].width:0;
    if(!f?.small||!oldWidth||!s.furnitureOwned.includes(item.id)||Math.abs(item.offsetX)+f.fw/2>oldWidth/2+1)continue;
    let pos=null;
    for(const index of base.corner?[...new Set([item.surface,2,0,1])]:[item.surface]){
      const plan=planSurfacePlacement(item.id,host,index,layoutFor(s,area),FURNITURE,undefined,{facing:item.facing});
      if(plan.ok&&canPlaceFurniture(s,item.id,plan.position,area)){for(const change of plan.changes){const peer=layoutFor(s,area).find(p=>p.id===change.id);if(peer)Object.assign(peer,change);}pos=plan.position;break;}
    }
    if(!pos)for(let y=550;y<=700&&!pos;y+=50)for(let x=400;x<=900;x+=70){const candidate={x,y};if(canPlaceFurniture(s,item.id,candidate,area)&&!hasFurnitureOverlap(s,item.id,candidate,area)){pos=candidate;break;}}
    if(pos){const layout=layoutFor(s,area),restored={id:item.id,...pos,...spatialFields(item)},firstAttachment=layout.findIndex(p=>p.on);if(!pos.on&&firstAttachment>=0)layout.splice(firstAttachment,0,restored);else layout.push(restored);}
  }
  // Move only currently placed beds/lamps once. Later personal arrangements stay put.
  if(raw.homeRoomsVersion!==1){
    const sleeping=id=>id==='bed'||id==='lamp'||id.endsWith('-bed')||id.endsWith('-lamp');
    const moved=s.layout.filter(p=>sleeping(p.id));s.layout=s.layout.filter(p=>!sleeping(p.id));s.bedroomLayout.push(...moved);
    if(!Array.isArray(raw.layout))s.bedroomLayout.push(...DEFAULT_BEDROOM_LAYOUT.filter(p=>!INTERIOR_AREAS.some(a=>layoutFor(s,a).some(f=>f.id===p.id))).map(p=>({...p})));
  }
  // One-time starter gift. Keep existing kitchens and later storage choices intact.
  if(raw.starterKitchenVersion!==1&&!s.kitchenLayout.some(p=>FURNITURE.find(f=>f.id===p.id)?.cooking)){
    const candidates=[{x:800,y:410}];
    for(let y=390;y<=630;y+=100)for(let x=260;x<=1000;x+=160)candidates.push({x,y});
    const spot=candidates.find(p=>canPlaceFurniture(s,'daisy-stove',p,'kitchen')&&!hasFurnitureOverlap(s,'daisy-stove',p,'kitchen'))||candidates[0];
    s.kitchenLayout.push({id:'daisy-stove',...spot});
  }
  return s;
}
export function eligibility(state,id){
  const item=OUTFITS.find(x=>x.id===id);if(!item)return 'unknown';
  if(!item.roles.some(x=>state.roles.includes(x)||state.companions?.unlocked.includes(x)))return 'role-locked';
  if(state.owned.includes(id)||item.price===0)return 'owned';
  return state.stars<item.price?'insufficient':'available';
}
export function buyOutfit(state,id){if(!hasEnergy(state))return false;
  if(eligibility(state,id)!=='available')return false;
  const item=OUTFITS.find(x=>x.id===id);state.stars-=item.price;state.owned.push(id);return true;
}
export function equipOutfit(state,id){if(!hasEnergy(state))return false;
  const character=outfitCharacter(id);
  if(eligibility(state,id)!=='owned'||character!==(state.companions?.active||'rabbit'))return false;
  if(character==='rabbit')state.outfit=id;else{state.companionOutfits??={};state.companionOutfits[character]=id;}return true;
}
export function settleWin(state,id){
  if(typeof id!=='string'||!id||state.settled.includes(id))return false;
  state.stars=Math.min(9999,state.stars+3);state.wins=Math.min(9999,state.wins+1);
  state.settled.push(id);state.settled=state.settled.slice(-50);return true;
}
export function walkable(x,y,padding=13){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<24||x>WORLD.width-24||y<65||y>WORLD.height-26)return false;
  return !OBSTACLES.some(o=>o.kind==='rect'
    ?x>o.x-padding&&x<o.x+o.w+padding&&y>o.y-padding&&y<o.y+o.h+padding
    :((x-o.x)/(o.rx+padding))**2+((y-o.y)/(o.ry+padding))**2<1);
}
export function clearSegment(a,b,checker=walkable){
  const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6);
  for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(!checker(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;
}
export function findPath(start,target,checker=walkable,bounds=WORLD){
  const segment=(a,b)=>clearSegment(a,b,checker);
  if(!checker(start.x,start.y)||!checker(target.x,target.y))return null;
  if(segment(start,target))return [target];
  const cell=bounds.cell,cols=Math.ceil(bounds.width/cell),rows=Math.ceil(bounds.height/cell);
  const center=n=>({x:(n%cols)*cell+cell/2,y:Math.floor(n/cols)*cell+cell/2});
  const nearest=p=>{
    const cx=Math.floor(p.x/cell),cy=Math.floor(p.y/cell);let best=null,dist=Infinity;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=cols||y>=rows)continue;
      const id=y*cols+x,q=center(id),d=Math.hypot(q.x-p.x,q.y-p.y);
      if(d<dist&&checker(q.x,q.y)&&segment(p,q)){best=id;dist=d;}
    }return best;
  };
  const first=nearest(start),last=nearest(target);if(first===null||last===null)return null;
  const open=new Set([first]),from=new Map(),g=new Map([[first,0]]);
  const h=id=>Math.hypot(center(id).x-target.x,center(id).y-target.y);
  while(open.size){
    let current=null,score=Infinity;for(const n of open){const s=g.get(n)+h(n);if(s<score){current=n;score=s;}}
    if(current===last){
      const path=[target];let n=current;while(n!==first){path.unshift(center(n));n=from.get(n);}path.unshift(center(first));
      const smooth=[];let anchor=start,index=0;
      while(index<path.length){let next=index;while(next+1<path.length&&segment(anchor,path[next+1]))next++;smooth.push(path[next]);anchor=path[next];index=next+1;}
      return smooth;
    }
    open.delete(current);const p=center(current),cx=current%cols,cy=Math.floor(current/cols);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=cols||y>=rows)continue;
      const n=y*cols+x,q=center(n);if(!segment(p,q))continue;
      const cost=g.get(current)+Math.hypot(q.x-p.x,q.y-p.y);
      if(cost<(g.get(n)??Infinity)){from.set(n,current);g.set(n,cost);open.add(n);}
    }
  }return null;
}

export function furnitureRect(item){const f=FURNITURE.find(f=>f.id===item.id);return f?spatialFootprint(f,item):null;}
function overlaps(a,b,pad=0){return a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;}
function contains(r,x,y,pad=0){return x>r.x-pad&&x<r.x+r.w+pad&&y>r.y-pad&&y<r.y+r.h+pad;}
export function buyFurniture(state,id){if(!hasEnergy(state))return false;
 const f=FURNITURE.find(f=>f.id===id);if(!f||state.furnitureOwned?.includes(id)||!Number.isInteger(state.stars)||state.stars<f.price)return false;
 state.stars-=f.price;(state.furnitureOwned??=[]).push(id);return true;
}
export function buyAndPlaceFurniture(state,id,pos,player,area){
 const next={...state,furnitureOwned:[...state.furnitureOwned],...Object.fromEntries(INTERIOR_AREAS.map(a=>[layoutKeyFor(a),layoutFor(state,a).map(p=>({...p}))]))};
 if(!buyFurniture(next,id)||!placeFurniture(next,id,pos,player,area))return false;
 state.stars=next.stars;state.furnitureOwned=next.furnitureOwned;for(const area of INTERIOR_AREAS)state[layoutKeyFor(area)]=next[layoutKeyFor(area)];return true;
}
const KITCHEN_DOOR_CLEARANCE={x:410,y:288,w:90,h:118};
export function roomWalkable(x,y,state,area='room'){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<180||x>1100||y<288||y>725)return false;
 if(area==='bathroom'&&y<HOME_FLOOR.back)return false;
 if(area==='bedroom'&&contains(RECT_WARDROBE,x,y,14))return false;
 // Furnishings are depth-sorted scenery, so dense decorations never trap a child.
 return true;
}
export function canPlaceFurniture(state,id,pos,area='room',{allowDoorOverlap=false}={}){
 const f=FURNITURE.find(f=>f.id===id);if(!f||!isInterior(area)||!state.furnitureOwned?.includes(id)||(f.areas&&!f.areas.includes(area))||!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return false;
 if(!allowDoorOverlap&&placementBlocksDoor(f,pos,area))return false;
 if(f.wall)return wallPlacementValid(f,pos,area);
 if(pos.on){const p=attachedPosition({id,...pos},layoutFor(state,area),FURNITURE);return !!p&&p.x>=60&&p.x<=1220&&p.y>=50&&p.y<=728;}
 return spatialFloorValid(f,pos);
}
export function hasFurnitureOverlap(state,id,pos,area='room'){
 const f=FURNITURE.find(f=>f.id===id);if(!f||f.flat)return false;
 const r=furnitureRect({id,...pos});
 return layoutFor(state,area).some(item=>item.id!==id&&!FURNITURE.find(f=>f.id===item.id)?.flat&&!!FURNITURE.find(f=>f.id===item.id)?.wall===!!f.wall&&overlaps(r,furnitureRect(item)));
}
export function stoveApproach(state,item){
 const f=FURNITURE.find(f=>f.id===item?.id);if(!f?.cooking)return null;
 // A countertop appliance is approached from the cabinet's floor position,
 // not from its elevated sprite (which can be outside the walking corridor).
 const host=item.on&&layoutFor(state,'kitchen').find(p=>p.id===item.on),base=host&&FURNITURE.find(f=>f.id===host.id);
 const points=[...(host&&base?[{x:host.x+(host.mount==='left'?1:host.mount==='right'?-1:0)*(base.fw/2+35),y:host.y+(host.mount==='left'||host.mount==='right'?0:40)}]:[]),{x:item.x,y:item.y+40},{x:item.x-f.fw/2-35,y:item.y},{x:item.x+f.fw/2+35,y:item.y}];
 return points.find(p=>findPath(KITCHEN_ENTRY,p,(x,y)=>roomWalkable(x,y,state,'kitchen')))||null;
}
export function canUseStove(state,id,area){return area==='kitchen'&&state.furnitureOwned?.includes(id)&&FURNITURE.some(f=>f.id===id&&f.cooking)&&state.kitchenLayout?.some(f=>f.id===id);}
export function placementState(state,id,pos,area='room'){
 const plan=furnitureSurfacePlan(state,id,pos,area);
 // A failed proposal never partially removes an item or shifts its neighbours.
 if(pos.on&&!plan?.ok)return state;
 const next={...state},children=INTERIOR_AREAS.flatMap(a=>layoutFor(state,a).filter(x=>x.on===id));for(const a of INTERIOR_AREAS)next[layoutKeyFor(a)]=layoutFor(state,a).filter(x=>x.id!==id&&x.on!==id).map(x=>({...x}));
 if(plan)for(const change of plan.changes){const peer=next[layoutKeyFor(area)].find(p=>p.id===change.id);if(peer)Object.assign(peer,change);}
 const attached=plan?.position;
 next[layoutKeyFor(area)].push({id,...(attached||{x:Math.round(pos.x/5)*5,y:Math.round(pos.y/5)*5}),...spatialFields(pos)});
 for(const item of children){
  const childFurniture=FURNITURE.find(f=>f.id===item.id);
  // Keep the established room restriction: kitchen-only appliances return to
  // owned storage when their table is moved into a different kind of room.
  if(childFurniture?.areas&&!childFurniture.areas.includes(area))continue;
  const row=next[layoutKeyFor(area)],host=row.find(p=>p.id===id),childPlan=planSurfacePlacement(item.id,host,item.surface,row,FURNITURE,undefined,{facing:item.facing,offsetX:item.offsetX});
  if(!childPlan.ok||!canPlaceFurniture(next,item.id,childPlan.position,area))return state;
  for(const change of childPlan.changes){const peer=row.find(p=>p.id===change.id);if(peer)Object.assign(peer,change);}
  row.push({id:item.id,...childPlan.position});
 }return next;
}
export function furnitureSurfacePlan(state,id,pos,area='room'){
 if(!pos?.on)return null;const layout=layoutFor(state,area),host=layout.find(p=>p.id===pos.on);
 if(!Number.isFinite(pos.offsetX))return {ok:false,reason:'invalid-surface',changes:[]};
 return planSurfacePlacement(id,host,pos.surface,layout,FURNITURE,pos,{facing:pos.facing,offsetX:pos.offsetX});
}
// Shared by the canvas and editor. It is always a copy, never a saved layout.
export function furniturePreviewLayout(state,placement,area='room'){
 if(!placement)return layoutFor(state,area).map(p=>({...p}));
 const plan=furnitureSurfacePlan(state,placement.id,placement,area);
 const next=plan&&!plan.ok?state:placementState(state,placement.id,placement,area);
 const layout=layoutFor(next,area).filter(p=>p.id!==placement.id).map(p=>({...p}));
 layout.push({...placement,...(plan?.ok?plan.position:{})});return layout;
}
export function canReachInterior(state,player,area='room'){
 const checker=(x,y)=>roomWalkable(x,y,state,area);
 if(!findPath(player,ROOM_ENTRY,checker))return false;
 if(area==='room'&&(!findPath(ROOM_ENTRY,ROOM_KITCHEN_APPROACH,checker)||!findPath(ROOM_ENTRY,ROOM_BEDROOM_APPROACH,checker)))return false;
 if(area==='bedroom'&&!findPath(ROOM_ENTRY,ROOM_WARDROBE_APPROACH,checker))return false;
 return area!=='kitchen'||state.kitchenLayout.filter(item=>FURNITURE.find(f=>f.id===item.id)?.cooking).every(item=>stoveApproach(state,item));
}
export function placeFurniture(state,id,pos,player=ROOM_ENTRY,area='room'){if(!hasEnergy(state))return false;
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return false;
 const furniture=FURNITURE.find(f=>f.id===id);
 if(!furniture)return false;
 const plan=furnitureSurfacePlan(state,id,pos,area);if(pos.on&&!plan?.ok)return false;
 const snapped=plan?.position|| (furniture?.wall?wallPosition(pos,furniture,area):floorPosition(pos,furniture,{auto:false,area}));
 if(!canPlaceFurniture(state,id,snapped,area))return false;
 const next=placementState(state,id,pos.on?pos:snapped,area);if(next===state)return false;
 if(!canReachInterior(next,player,area))return false;
 for(const a of INTERIOR_AREAS)state[layoutKeyFor(a)]=next[layoutKeyFor(a)];return true;
}
export function storeFurniture(state,id,area='room'){if(!hasEnergy(state)||!isInterior(area))return false;const key=layoutKeyFor(area),before=layoutFor(state,area).length;state[key]=layoutFor(state,area).filter(x=>x.id!==id&&x.on!==id);return state[key].length!==before;}
export const MONSTER_STOPS=[{x:810,y:400},{x:680,y:345},{x:920,y:370},{x:740,y:535},{x:940,y:470},{x:620,y:470},{x:840,y:540}];
export function advanceMonster(monster,dt,paused=false,rng=Math.random){
  monster.moving=false;if(paused)return;
  monster.wait=Math.max(0,(monster.wait||0)-dt);if(monster.wait)return;
  if(!monster.route?.length){
    const candidates=MONSTER_STOPS.filter(p=>Math.hypot(p.x-monster.x,p.y-monster.y)>90);
    const target=candidates[Math.floor(rng()*candidates.length)];monster.route=target?findPath(monster,target):null;
    if(!monster.route?.length){monster.wait=1;return;}
  }
  const q=monster.route[0],dx=q.x-monster.x,dy=q.y-monster.y,d=Math.hypot(dx,dy),step=Math.min(d,43*dt);
  if(d>.01){monster.x+=dx/d*step;monster.y+=dy/d*step;monster.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?0:2);monster.phase=(monster.phase||0)+step*.17;monster.moving=true;}
  if(d<=step+.1){monster.x=q.x;monster.y=q.y;monster.route.shift();if(!monster.route.length){monster.wait=.9+rng()*1.5;monster.moving=false;}}
}
