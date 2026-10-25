import {createIslandVisits} from './island-visits-ui.js';
import {encodeHomeSurfaceState} from './home-surface-storage.js';
import {installMapZoom} from './adventure-map-zoom.js';
import {forestMusic,installForestMusic} from './adventure-music.js';
import {installAdventureControls} from './adventure-controls.js';
installForestMusic();
import {interiorDoorGeometry,paintedDoorGeometry} from './adventure-room.js';
import {furnitureVisualBounds} from './home-spatial-art.js';
import {equippedOutfit,outfitCharacter,defaultOutfit} from './adventure-model.js';
import {clothingCharacter,ensureClothingArt,drawClothing} from './adventure-clothing.js';
import {ensureBathroom} from './adventure-bathroom.js';
import {ensureRoomShell,roomShell,roomShellDoorGeometry} from './home-room-shells.js';
import {createActionFeedback,completeAction} from './adventure-action-feedback.js';
import {installReadingAid} from './adventure-reading-aid.js';
import {createHomeRest} from './adventure-rest-ui.js';
import {createExpedition} from './adventure-expedition-ui.js';
import {GROVE_WORLD,GROVE_ENTRY,GROVE_EXIT,ISLAND_ENTRY,ISLAND_WORLD,islandWalkable,newEncounter,advanceEncounters,enemySpec,dismissEncounter,settleEncounter,modeIcon} from './adventure-exploration-model.js';
import {ensureExplorationArt} from './adventure-exploration-art.js';
import {createShop} from './adventure-cart-ui.js';
import {createExplorationUI} from './adventure-exploration-ui.js';
import {encounterDeck,challengeChoices,expectedAnswer,challengePrompt} from './adventure-encounters.js';
import {AREA_EXITS,createExitProximity} from './adventure-exits.js';
const exitProximity=createExitProximity();
let shop=null,exploration=null,expedition=null,rest=null,visits=null;
import {ensureHomeArt,furnitureArtKeys} from './adventure-home-art.js?v=20261010-light2';
import {ensureWardrobeArt} from './adventure-wardrobe-art.js';
import {createCompanions} from './adventure-companions.js';
import {canUseCompanion,forestPreviewCards} from './adventure-companions-model.js';
import './child-picture-ui.js';
import {ensureWallpapers} from './adventure-wallpaper.js';
import {createHomeDecor} from './adventure-home-decor.js?v=20261010-light2';
import {layoutFor,isInterior,ROOM_KITCHEN_DOOR,ROOM_KITCHEN_APPROACH,ROOM_BEDROOM_DOOR,ROOM_BEDROOM_APPROACH,KITCHEN_ENTRY,stoveApproach} from './adventure-model.js';
import './asset-cache.js?v=20260927-1';
import {withEnergyMood} from './adventure-energy-art.js';
import {createKitchen} from './adventure-kitchen.js';
import {hasEnergy,canSpendEnergy,spendEnergy} from './adventure-food-model.js';
import {SAVE_KEY,MONSTER_HOME,OUTFITS,FURNITURE,ROOM_ENTRY,ROOM_WARDROBE,freshState,sanitizeState,eligibility,buyOutfit,equipOutfit,settleWin,walkable,findPath,roomWalkable,canPlaceFurniture,placeFurniture,storeFurniture,advanceMonster} from './adventure-model.js';
import {loadArt,ForestScene,drawDoll} from './adventure-art.js?v=20261010-light2';
import {ensureTerrain} from './adventure-terrain.js?v=20261010-light2';
import {drawFurnitureThumb} from './adventure-room.js';
import {createJoystick} from './adventure-joystick.js';
import {WALK_CYCLE_DISTANCE,walkFrame} from './adventure-animation.js';
import {poolFor,questionDeck,optionsFor} from './core.js';
import {audioSource} from './audio-source.js';
import {loadWalker,drawWalker,walkerFrameCount} from './adventure-characters.js';
import {GROVE_PRICE,unlockGrove,groveWalkable} from './adventure-model.js';
import {farmWalkable,FARM_ENTRY} from './adventure-life-model.js';
import {createLife} from './adventure-life.js';
import {applyLocalTesterGrant} from './adventure-model.js';
let activeWalker=null,companions=null,walkerGeneration=0;
const companionCards=()=>globalThis.ForestStudent?.cards||forestPreviewCards(location.hostname);

const $=id=>document.getElementById(id);
const wardrobe=$('wardrobe'),canvas=$('world'),monsterButton=$('monster-button'),trail=$('trail-dialog');
const pool=poolFor('single',{symbols:Array.from('ㄅㄆㄇㄈㄉㄊ'),compounds:[]},[]);
let state=load(),art=null,scene=null,route=[],arrival=null,round=null,audio=null,heard=false;
let last=performance.now(),timerIds=[],roundGeneration=0,toastTimer=0,preview=state.outfit,previewDirection=0,previewWalking=false;
const actionFeedback=createActionFeedback({scene:()=>scene});installReadingAid();
let keys=new Set(),walked=0,lastDoll=0,previousFocus=null;
let switching=false,decorPointer=null,monsterHovered=false,lastEnergyAccess=null;
const directions={down:[0,1,0],right:[1,0,1],up:[0,-1,2],left:[-1,0,3]};
const keyDirections={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
const joystick=createJoystick($('joystick'),{isEnabled:()=>!!scene&&!round&&!companions?.busy&&!expedition?.busy&&!shop?.busy&&!exploration?.busy&&!visits?.busy&&!wardrobe.open&&!trail.open&&!(life.busy||(kitchen.busy||rest?.busy))&&!scene.editing&&!switching,onStart:()=>stopMoving()});
const life=createLife({state:()=>state,scene:()=>scene,art:()=>art,walkTo,stopMoving,save,renderState,toast,switchArea,arrived:()=>exitProximity.reset(scene.area,scene.player),food:()=>kitchen.eatAtHome(),cook:()=>kitchen.cookAtHome(),blocked:()=>!scene||!!round||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||switching||scene.editing||(life.busy||(kitchen.busy||rest?.busy))});
const kitchen=createKitchen({state:()=>state,scene:()=>scene,art:()=>art,stopMoving,save,renderState,toast,switchArea,decorate:()=>openDecor(),blocked:()=>!scene||!!round||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||switching||scene.editing||life.busy||(kitchen.busy||rest?.busy)});
const mapZoom=installMapZoom({stage:$('map-stage'),canvas,scene:()=>scene,enabled:()=>scene?.area==='island'&&!round&&!wardrobe.open&&!companions?.busy&&!expedition?.busy&&!shop?.busy&&!visits?.busy&&!exploration?.busy&&!trail.open&&!switching&&!scene.editing&&!life.busy&&!kitchen.busy&&!rest?.busy&&!joystick.input.active,stop:()=>{stopMoving();keys.clear();},tap:(x,y)=>walkTo(scene.toWorld(x,y)),hideOffer:()=>exploration?.hideOffer()});
companions=createCompanions({state:()=>state,cards:companionCards,trial:companionCards().length>1,prepare:id=>id==='rabbit'?Promise.resolve(null):loadWalker(id),apply:setCompanion,save,changed:()=>{renderState();renderArea();},stop:stopMoving,toast,blocked:()=>!scene||!!round||switching||scene.editing||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||life.busy||(kitchen.busy||rest?.busy)});
function setCompanion(id,walker){activeWalker=walker;canvas.dataset.character=id;void ensureClothingArt(equippedOutfit(state,id)).then(()=>renderState()).catch(()=>toast('衣服圖片暫時沒載入，重新開啟可再試。'));}
async function restoreCompanion(requested=null){
 const token=++walkerGeneration;
 const desired=requested&&hasEnergy(state)&&canUseCompanion(state,requested,companionCards())?requested:state.companions.active;
 const id=canUseCompanion(state,desired,companionCards())?desired:'rabbit';
 try{const walker=id==='rabbit'?null:await loadWalker(id);if(token!==walkerGeneration)return;setCompanion(id,walker);state.companions.active=id;}
 catch{if(token!==walkerGeneration)return;setCompanion('rabbit',null);state.companions.active='rabbit';toast('夥伴圖片暫時沒載入，先和棉花兔出發；已解鎖的資格仍保留。');}
}


function load(){if(globalThis.ForestStudent)return sanitizeState(globalThis.ForestStudent.state);try{return sanitizeState(JSON.parse(localStorage.getItem(SAVE_KEY)));}catch{return freshState();}}
function save(){const stored=encodeHomeSurfaceState(state,FURNITURE);if(globalThis.ForestStudent)return globalThis.ForestStudent.save(stored);try{localStorage.setItem(SAVE_KEY,JSON.stringify(stored));$('save-note').textContent='已自動儲存 · 下次用這個瀏覽器繼續冒險';return true;}catch{$('save-note').textContent='目前無法儲存，關閉頁面後試玩進度可能遺失';toast('瀏覽器目前無法儲存，關閉後可能遺失這次進度。');return false;}}
function toast(text){clearTimeout(toastTimer);$('map-toast').textContent=text;$('map-toast').hidden=false;toastTimer=setTimeout(()=>$('map-toast').hidden=true,3200);}
function journal(id,done){$(id).classList.toggle('done',done);$(id).querySelector('i').textContent=done?'✓':'○';}
function renderState(){
  kitchen.update();
  syncEnergyAccess();
  renderTrail();
  $('balance').textContent=state.stars;$('wardrobe-balance').textContent=state.stars;
  $('wearing-name').textContent=OUTFITS.find(x=>x.id===state.outfit).name;
  journal('mission-dress',state.outfit==='gardener');journal('mission-walk',state.visited);journal('mission-battle',state.wins>0);
  canvas.dataset.outfit=equippedOutfit(state);canvas.dataset.wand=String(state.wand);
  if(art)drawDoll($('portrait'),art,{outfit:state.outfit,wand:false,height:81});
  document.querySelector('.companion strong').textContent='棉花兔';$('portrait').setAttribute('aria-label','棉花兔');$('wardrobe-open').hidden=false;document.title='池東注音探險島';document.querySelector('.brand h1').textContent='池東注音探險島';
  if(activeWalker&&activeWalker.role.id!=='rabbit'){
    const role=activeWalker.role,portrait=$('portrait'),ctx=portrait.getContext('2d');
    drawDoll(portrait,art,{outfit:equippedOutfit(state),wand:false,height:81});
    document.querySelector('.companion strong').textContent=role.name;$('wearing-name').textContent=OUTFITS.find(o=>o.id===equippedOutfit(state))?.name||'小屋夥伴';
    portrait.setAttribute('aria-label',role.name);$('wardrobe-open').hidden=!['fox','bear'].includes(role.id);
    document.title=`池東注音探險島`;document.querySelector('.brand h1').textContent=`池東注音探險島`;
  }
}
function needFood(){if(hasEnergy(state))return false;kitchen.open('bag','🥄 先吃點東西');return true;}
function syncEnergyAccess(){
  const energy=state.life.nutrition.energy;if(energy===lastEnergyAccess)return;lastEnergyAccess=energy;const empty=energy===0;
  for(const el of [$('wardrobe-open'),$('room-wardrobe'),$('find-monster'),monsterButton,$('companions-open')]){el.dataset.energyLocked=String(empty);el.setAttribute('aria-disabled',String(empty));}
  if(empty){companions?.close();shop?.close();exploration?.close();if(wardrobe.open)closeWardrobe();}
}
$('companions-open').addEventListener('click',e=>{e.preventDefault();if(!hasEnergy(state)){needFood();return;}companions.open();});
installAdventureControls();
function stopMoving(){route=[];arrival=null;keys.clear();joystick.reset();if(scene){scene.player.moving=false;scene.player.phase=0;scene.marker=null;}}
const canWalk=(x,y)=>{
  if(isInterior(scene?.area))return roomWalkable(x,y,state,scene.area);
  if(scene?.area==='farm')return farmWalkable(x,y);if(scene?.area==='island')return islandWalkable(x,y);
  if(scene?.area==='grove')return groveWalkable(x,y);
  if(!state.life.farmUnlocked&&x>359&&x<532&&y>696&&y<746)return false;
  return walkable(x,y);
};
function walkTo(target,onArrival=null){
  if(!scene||switching||scene.editing||(kitchen.busy||rest?.busy))return false;
  const path=findPath(scene.player,target,canWalk,scene.area==='grove'?GROVE_WORLD:ISLAND_WORLD);
  if(!path)return false;
  keys.clear();joystick.reset();route=path;arrival=onArrival;scene.marker={...target,at:performance.now()};return true;
}
function exitsBlocked(){return !scene||switching||scene.editing||!!round||(scene.area==='farm'&&!!arrival)||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||life.busy||(kitchen.busy||rest?.busy);}
function enterExit(id){
 if(exitsBlocked())return;
 const e=AREA_EXITS[scene.area]?.find(e=>e.id===id);if(!e)return;
 stopMoving();
 if(e.target==='destination'){scene.player.x=e.x;scene.player.y=e.y;exitProximity.reset(scene.area,scene.player);exploration.openDestination(id);return;}
 if(e.target==='pond'||e.target==='farm'){life.visit(e.target);return;}
 if(e.target==='grove'&&!state.groveUnlocked){openTrail();return;}
 switchArea(e.target);
}
function face(dx,dy){if(Math.abs(dx)>Math.abs(dy))return dx>=0?1:3;return dy>=0?0:2;}
function move(dt){
  if(!scene)return;
  if(mapZoom.active){scene.player.moving=false;return;}
  if(switching||scene.editing||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||(life.busy||(kitchen.busy||rest?.busy))||(round&&round.phase!=='approach')){scene.player.moving=false;return;}
  const p=scene.player,before={x:p.x,y:p.y};
  let dx=joystick.input.x,dy=joystick.input.y;
  if(!joystick.input.active){
    dx=0;dy=0;for(const key of keys){const direction=directions[keyDirections[key]];if(direction){dx+=direction[0];dy+=direction[1];}}
    const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}
  }
  if((joystick.input.active||dx||dy)&&!round){
    route=[];arrival=null;scene.marker=null;const step=150*dt,mx=dx*step,my=dy*step;
    if(canWalk(p.x+mx,p.y+my)){p.x+=mx;p.y+=my;}
    else {if(canWalk(p.x+mx,p.y))p.x+=mx;if(canWalk(p.x,p.y+my))p.y+=my;}
    if(dx||dy)p.direction=face(dx,dy);
  }else if(route.length){
    const q=route[0],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),step=Math.min(d,155*dt);
    if(d>.01){p.direction=face(dx,dy);p.x+=dx/d*step;p.y+=dy/d*step;}
    if(d<=step+.1){p.x=q.x;p.y=q.y;route.shift();}
    if(!route.length){scene.marker=null;const cb=arrival;arrival=null;cb?.();}
  }
  const distance=Math.hypot(p.x-before.x,p.y-before.y);p.moving=distance>.001;p.phase+=distance*Math.PI*2/WALK_CYCLE_DISTANCE;if(!p.moving)p.phase=0;walked+=distance;
  if(walked>90&&!state.visited){state.visited=true;save();renderState();}
}
function positionHotspots(){
  const indoors=isInterior(scene.area),m=scene.toScreen(scene.monster.x,scene.monster.y),s=scene.camera.scale;
  monsterButton.style.left=m.x+'px';monsterButton.style.top=m.y+'px';monsterButton.style.width=Math.max(65,105*s)+'px';monsterButton.style.height=Math.max(70,112*s)+'px';
  monsterButton.hidden=scene.area!=='forest'||indoors||scene.area==='farm'||!!round||!scene.monster.visible||m.x<0||m.x>scene.width||m.y<0||m.y>scene.height;
  const home=scene.toScreen(259,329);$('house-button').style.left=home.x+'px';$('house-button').style.top=home.y+'px';$('house-button').hidden=scene.area!=='forest'||!!round||home.x<-40||home.x>scene.width+40;
  const label=scene.toScreen(230,361);$('home-label').style.left=label.x+'px';$('home-label').style.top=label.y+'px';$('home-label').hidden=scene.area!=='forest'||home.x<-40||home.x>scene.width+40;
  const gate=scene.toScreen(scene.area==='grove'?470:990,scene.area==='grove'?710:368),sign=$('trail-sign');sign.style.left=gate.x+'px';sign.style.top=gate.y+'px';sign.hidden=scene.area!=='forest'||indoors||scene.area==='farm'||!!round||scene.editing||gate.x<60||gate.x>scene.width-60||gate.y<150||gate.y>scene.height-170;
  const returnDoor=scene.area==='kitchen'?ROOM_BEDROOM_DOOR:ROOM_KITCHEN_DOOR;
  $('room-wardrobe').style.width=Math.max(64,145*s)+'px';$('room-wardrobe').style.height=Math.max(70,205*s)+'px';
  for(const [id,x,y] of [['room-wardrobe',ROOM_WARDROBE.x,ROOM_WARDROBE.y],['room-exit',scene.area==='room'?640:returnDoor.x,scene.area==='room'?746:returnDoor.y]]){const at=scene.toScreen(x,y),el=$(id);el.style.left=at.x+'px';el.style.top=at.y+'px';el.hidden=(id==='room-wardrobe'?scene.area!=='bedroom':!indoors)||scene.editing;}
  function wallDoorTarget(id,point){const shell=roomShell(art,scene.wallpaperPreview||state.wallpaper,scene.area),p=(shell?roomShellDoorGeometry(scene.area,point.x<640?-1:1):null)||(art.spatial?.doors?paintedDoorGeometry:interiorDoorGeometry)(scene.area,point.x<640?-1:1),door=p,topRise=door.rise-door.flare;const at=scene.toScreen(p.x,p.y+door.rise/2),el=$(id);el.style.left=at.x+'px';el.style.top=at.y+'px';el.style.width=Math.max(48,(door.width+12)*s)+'px';el.style.height=(door.height+door.rise)*s+'px';el.style.setProperty('--door-sign-inset',(p.x<640?-8:8)*s+'px');el.style.setProperty('--door-sign-top',(shell?14:door.rise/2-40+8*topRise/door.width)*s+'px');el.style.setProperty('--door-sign-width',72*s+'px');el.style.setProperty('--door-sign-height',56*s+'px');el.style.setProperty('--door-sign-shear',String((p.x<640?-1:1)*.55*topRise/door.width));}
  wallDoorTarget('room-bathroom',ROOM_BEDROOM_DOOR);$('room-bathroom').hidden=scene.area!=='bedroom'||scene.editing;
  wallDoorTarget('room-kitchen',ROOM_KITCHEN_DOOR);wallDoorTarget('room-bedroom',ROOM_BEDROOM_DOOR);
  for(const id of ['room-kitchen','room-bedroom'])$(id).hidden=scene.area!=='room'||scene.editing;
  const sideRoom=scene.area==='kitchen'||scene.area==='bedroom'||scene.area==='bathroom';$('room-exit').classList.toggle('wall-return',sideRoom);
  if(sideRoom)wallDoorTarget('room-exit',returnDoor);else{$('room-exit').style.width='';$('room-exit').style.height='';}
  for(const b of $('kitchen-stations').children){const item=state.kitchenLayout.find(p=>p.id===b.dataset.station);if(!item)continue;const f=FURNITURE.find(f=>f.id===item.id),at=scene.toScreen(item.x,item.y);b.style.left=at.x+'px';b.style.top=at.y+'px';b.style.width=Math.max(62,f.fw*s)+'px';b.style.height=Math.max(64,f.height*s)+'px';b.hidden=scene.area!=='kitchen'||scene.editing||(kitchen.busy||rest?.busy)||switching;}
  exploration?.position();
  canvas.dataset.x=scene.player.x.toFixed(1);canvas.dataset.y=scene.player.y.toFixed(1);canvas.dataset.direction=String(scene.player.direction);canvas.dataset.moving=String(scene.player.moving);canvas.dataset.area=scene.area;canvas.dataset.monsterX=scene.monster.x.toFixed(1);canvas.dataset.monsterY=scene.monster.y.toFixed(1);canvas.dataset.monsterMoving=String(scene.monster.moving);
  canvas.dataset.walkFrame=String(walkFrame(scene.player.moving&&!scene.reduced.matches,scene.player.phase,clothingCharacter(equippedOutfit(state))?4:walkerFrameCount(activeWalker,scene.player.direction)));
}
function tick(now){
  requestAnimationFrame(tick);const dt=Math.min(.035,(now-last)/1000);last=now;if(!scene||document.hidden)return;
  if(expedition?.busy&&!expedition.localBattle||shop?.busy)return;
  move(dt);
  const nearby=exitProximity.poll(scene.area,scene.player,exitsBlocked()||mapZoom.active);if(nearby){if(nearby.interaction==='offer')exploration.offerDestination(nearby.id,true);else enterExit(nearby.id);}
  if(scene.area==='grove')advanceEncounters(scene.encounters,dt,!!round||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||life.busy||(kitchen.busy||rest?.busy)||switching);
  else if(scene.area==='forest')advanceMonster(scene.monster,dt,!!round||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||(life.busy||(kitchen.busy||rest?.busy))||isInterior(scene.area)||scene.area==='farm'||monsterHovered||switching);
  scene.render(now,state,!!round&&round.phase!=='approach');positionHotspots();mapZoom.update();life.position(now);kitchen.tick(now);rest?.tick(now);rest?.position();syncEnergyAccess();
  if(wardrobe.open&&now-lastDoll>65){renderDoll(now);lastDoll=now;}
}
async function init(){
  $('load-retry').hidden=true;
  try{
    art=await loadArt();scene=new ForestScene(canvas,art);
    const roleId=new URLSearchParams(location.search).get('character'),rabbitDraw=scene.drawPlayer;
    await restoreCompanion(roleId);save();
    if(roleId&&!canUseCompanion(state,roleId,companionCards()))toast('🔒 點選夥伴，先解鎖小屋使用權');
    if(roleId){const clean=new URL(location.href);clean.searchParams.delete('character');history.replaceState(null,'',clean);}
    scene.drawPlayer=withEnergyMood((c,a,options)=>{const pose={...options,outfit:equippedOutfit(state)};if(drawClothing(c,a,pose))return;return activeWalker?drawWalker(c,a,activeWalker,pose):rabbitDraw(c,a,pose);},()=>state.life.nutrition.energy);
    $('map-loading').hidden=true;canvas.dataset.ready='true';renderState();renderArea();if(new URL(location.href).searchParams.get('returnFarm')==='1'&&state.life.farmUnlocked)switchArea('farm',()=>{const ready=state.life.plots.filter(p=>p?.ready).length;if(ready)toast(`有 ${ready} 處作物成熟了！點「採收」帶回家做料理。`);});
  }catch(e){console.error(e);$('map-loading').querySelector('strong').textContent='森林圖片還沒準備好';$('map-loading').querySelector('p').textContent='請確認連線後再試一次。';$('load-retry').hidden=false;}
  finally{document.dispatchEvent(new Event('adventure-ui-ready'));}
}
$('load-retry').addEventListener('click',init);
canvas.addEventListener('pointerdown',e=>{
  if(!scene||round||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||(life.busy||(kitchen.busy||rest?.busy))||switching||joystick.input.active)return;e.preventDefault();canvas.focus({preventScroll:true});
  const at=scene.toWorld(e.clientX,e.clientY);
  if(scene.area==='grove'){const hit=[...(scene.encounters||[])].reverse().find(m=>m.visible&&Math.abs(at.x-m.x)<48&&at.y<m.y+12&&at.y>m.y-(m.level===2?120:100));if(hit){startBattle(hit);return;}}
  if(scene.editing){
    if(!scene.placement){const hit=[...layoutFor(state,scene.area)].sort((a,b)=>b.y-a.y).find(item=>{const f=FURNITURE.find(f=>f.id===item.id),r=furnitureVisualBounds(art,f,item);return at.x>=r.x&&at.x<=r.x+r.w&&at.y>=r.y&&at.y<=r.y+r.h;});if(hit)selectFurniture(hit.id);return;}
    decorPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);moveFurniture(at);return;
  }
  walkTo(at);
});
canvas.addEventListener('pointermove',e=>{if(decorPointer===e.pointerId&&scene?.editing)moveFurniture(scene.toWorld(e.clientX,e.clientY));});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>decorPointer=null);
document.addEventListener('keydown',e=>{
  if(mapZoom.active)return;
  if(wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||(life.busy||(kitchen.busy||rest?.busy))||!scene)return;
  if(e.key==='Escape'&&scene.editing){closeDecor();return;}
  if(scene.editing||switching)return;
  if(e.key==='Escape'&&round){endBattle();return;}
  if(keyDirections[e.key]&&!round&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();keys.add(e.key);}
});
document.addEventListener('keyup',e=>keys.delete(e.key));
window.addEventListener('blur',()=>{keys.clear();joystick.reset();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(round?.phase==='approach')endBattle({focus:false});else stopMoving();stopAudio();}});
$('find-monster').addEventListener('click',()=>{if(round||isInterior(scene?.area)||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||needFood())return;if(scene.area==='grove'){const m=scene.encounters.filter(m=>m.visible).sort((a,b)=>Math.hypot(a.x-scene.player.x,a.y-scene.player.y)-Math.hypot(b.x-scene.player.x,b.y-scene.player.y))[0];if(m)walkTo({x:m.x,y:m.y+40},()=>startBattle(m));else toast('🌿 小怪很快就回來');return;}walkTo({x:750,y:495},()=>{toast('蘑菇怪正在附近散步，點一下牠才會開始挑戰。');monsterButton.focus({preventScroll:true});});});
$('go-home').addEventListener('click',()=>{if((kitchen.busy||rest?.busy))return;if(round)endBattle();if(scene?.area==='grove'||scene?.area==='island'||scene?.area==='farm')switchArea('forest');else if(scene?.area==='kitchen'||scene?.area==='bedroom'||scene?.area==='bathroom')leaveKitchen();else if(scene?.area==='room')leaveRoom();else enterExit('home');});
$('house-button').addEventListener('click',()=>enterExit('home'));
$('room-exit').addEventListener('click',()=>scene?.area==='room'?leaveRoom():leaveKitchen());
$('room-kitchen').addEventListener('click',()=>enterExit('kitchen'));
$('room-bedroom').addEventListener('click',()=>enterExit('bedroom'));
$('room-bathroom').addEventListener('click',()=>enterExit('bathroom'));
$('room-wardrobe').addEventListener('click',()=>walkTo({x:ROOM_WARDROBE.x,y:ROOM_WARDROBE.y+53},openWardrobe));
function renderArea(){
  forestMusic.setArea(scene.area);
  kitchen.update();
  const indoor=isInterior(scene.area),grove=scene.area==='grove';document.body.classList.toggle('in-room',indoor);$('location-name').textContent=indoor?`${activeWalker?.role.name||'棉花兔'}的小屋`:grove?'星光林地':'暖陽村';$('location-weather').textContent=indoor?'我的家，慢慢變成喜歡的樣子':grove?'小花發著光，蘑菇怪在等你':'家門口，就有小小冒險';
  $('map-note').textContent=indoor?'點地板走走，也能布置自己的家':'☞ 點草地走走，點怪物才開戰';$('decor-open').hidden=!indoor;$('find-monster').hidden=indoor;$('go-home').textContent=indoor?'出門散步 ↗':'回家 ⌂';
  if(grove||scene.area==='farm'||scene.area==='island')$('go-home').textContent='回暖陽村 ⌂';
  if(scene.area==='island'){$('location-name').textContent='探險島地圖';$('location-weather').textContent='自由散步，想進去時再按側邊的門';$('find-monster').hidden=true;}
  if(grove)$('location-weather').textContent='👂 🧩 ♫ · 林間小怪正在等你';
  if(scene.area==='farm'){$('location-name').textContent='向日葵農場';$('location-weather').textContent='種下一點期待，帶回滿滿收穫';$('map-note').textContent='在田裡播種、澆水、採收';$('find-monster').hidden=true;canvas.setAttribute('aria-label','向日葵農場。點地面走路，在一整片田地裡分別種植不同作物。');}
  if(scene.area==='room')$('location-name').textContent='我的客廳';
  if(scene.area==='kitchen'){$('location-name').textContent='我的小廚房';$('location-weather').textContent='把收穫變成熱騰騰的料理';$('map-note').textContent=state.kitchenLayout.some(p=>FURNITURE.find(f=>f.id===p.id)?.cooking)?'點料理爐，開始做料理':'按椅子圖示，擺回料理爐';}
  if(scene.area==='bedroom'){$('location-name').textContent='我的臥室';$('location-weather').textContent='換衣服，休息一下';}
  const sideRoom=scene.area==='kitchen'||scene.area==='bedroom'||scene.area==='bathroom';if(sideRoom)$('go-home').textContent=scene.area==='bathroom'?'回臥室 🛏️':'回客廳 ⌂';
  if(scene.area==='bathroom'){$('location-name').textContent='我的衛浴';$('location-weather').textContent='泡泡裡休息一下';$('room-exit').setAttribute('aria-label','回臥室');}else $('room-exit').setAttribute('aria-label',scene.area==='room'?'走出小屋':'回客廳');
  rest?.update();
  $('room-exit').textContent=scene.area==='bathroom'?'回臥室 ↩':sideRoom?'回客廳 ↩':'出門 ↓';$('room-exit').setAttribute('aria-label',scene.area==='bathroom'?'走回臥室':sideRoom?'走回客廳':'走出小屋');refreshKitchenStations();
  $('trail-sign').querySelector('strong').textContent=grove?'回家的小路':'森林小路';$('trail-sign').querySelector('small').textContent=grove?'← 暖陽村':state.groveUnlocked?'星光林地 →':'星光林地 · 未開放';
  canvas.setAttribute('aria-label',indoor?'我的小屋。拖曳搖桿、點地板或按方向鍵走路，點物品清單擺放物品。':'森林地圖。拖曳搖桿、點地板或使用方向鍵走路；怪物需要點選才會開始戰鬥。');
}
async function switchArea(area,onArrival=null){
  if(!['forest','room','kitchen','bedroom','bathroom','grove','farm','island'].includes(area)||(area==='grove'&&!state.groveUnlocked)||(area==='farm'&&!state.life.farmUnlocked))return false;
  if(switching||!scene||scene.dining)return false;switching=true;stopMoving();closeDecor();mapZoom.reset();scene.islandView=null;
  if(area==='grove'||area==='island'){try{toast('🌲 正在展開地圖…');await ensureExplorationArt(art,area);}catch(e){switching=false;toast('地圖暫時沒載入，請再試一次。');return false;}}
  if(area==='farm'){try{toast('🌱 正在走進農場…');await Promise.all([ensureTerrain(art.terrain,'farm'),ensureHomeArt(art,['extraCrops','collectionCrops'])]);}catch(e){switching=false;toast('農場圖片暫時沒載入，請再試一次。');return false;}}
  if(area==='island'){state.world.visited=true;save();}
  if(isInterior(area)){try{toast('正在推開房間的小門…');await Promise.all([ensureHomeArt(art,['daisyHome',...(area==='bathroom'?['daisyComplete']:[]),...furnitureArtKeys(layoutFor(state,area))]),ensureRoomShell(art,state.wallpaper,area),(area==='bedroom'?ensureWardrobeArt(art,state.wallpaper):null)]);}catch(error){console.warn(error);switching=false;toast('房間圖片暫時沒載入，請再點門口試一次。');return false;}}
  clearTimeout(toastTimer);$('map-toast').hidden=true;$('scene-fade').classList.add('changing');
  return new Promise(resolve=>setTimeout(()=>{
    const fromGrove=scene.area==='grove',fromIsland=scene.area==='island',fromFarm=scene.area==='farm',fromKitchen=scene.area==='kitchen',fromBedroom=scene.area==='bedroom',fromBathroom=scene.area==='bathroom';scene.area=area;scene.player={...(area==='kitchen'?ROOM_BEDROOM_APPROACH:area==='bathroom'?ROOM_KITCHEN_APPROACH:area==='bedroom'?(fromBathroom?ROOM_BEDROOM_APPROACH:ROOM_KITCHEN_APPROACH):area==='room'?(fromKitchen?ROOM_KITCHEN_APPROACH:fromBedroom?ROOM_BEDROOM_APPROACH:ROOM_ENTRY):area==='farm'?FARM_ENTRY:area==='grove'?(fromIsland?GROVE_EXIT:GROVE_ENTRY):area==='island'?ISLAND_ENTRY:fromFarm?{x:450,y:660}:fromGrove?{x:988,y:400}:{x:260,y:371}),direction:isInterior(area)||area==='grove'||area==='farm'?2:0,moving:false,phase:0};scene.marker=null;scene.fishingView=false;scene.monster={...scene.monster,...MONSTER_HOME,hp:3,visible:!isInterior(area)&&area!=='farm',route:[],moving:false,wait:1.1};if(area==='grove'){scene.encounters??=[0,1,2].map(i=>newEncounter(i));scene.monster=scene.encounters.find(m=>m.visible)||scene.encounters[0];}scene.camera.x=scene.player.x;scene.camera.y=scene.player.y;renderArea();
    exitProximity.reset(scene.area,scene.player);switching=false;$('scene-fade').classList.remove('changing');canvas.focus({preventScroll:true});
    if(area==='farm')life.enterFarm();
    if(area==='room')toast(hasEnergy(state)?'🛏️ ← 客廳 → 🍲':'🥄 先吃點東西');
    if(area==='bedroom')toast('🛏️ 點床休息・🛁 左邊是衛浴');
    if(area==='bathroom')toast('🚽 點馬桶 +1 體力，每天 5 次；🛁 浴缸可以買回來布置');
    if(area==='kitchen')toast(state.kitchenLayout.some(p=>FURNITURE.find(f=>f.id===p.id)?.cooking)?'點料理爐，把今天的收穫做成料理吧。':'按椅子圖示，把已有的料理爐擺回廚房。');
    if(!onArrival)completeAction('travel',{duration:1800});onArrival?.();resolve(true);
  },180));
}
function leaveRoom(){if(!scene||scene.area!=='room'||switching)return;closeDecor();enterExit('outside');}

function renderTrail(){
  life.menu();
  const unlocked=state.groveUnlocked,need=Math.max(0,GROVE_PRICE-state.stars);
  $('grove-tag').textContent=unlocked?'已開放':`✦ ${GROVE_PRICE} · 永久開放`;$('trail-island').hidden=!state.world.visited;
  $('grove-unlock').textContent=unlocked?'去星光林地 →':`用 ${GROVE_PRICE} 星幣開放`;
  $('grove-unlock').disabled=unlocked?false:!hasEnergy(state)||need>0;
  $('trail-message').textContent=unlocked?'可以自由散步；點怪挑戰才需要 8 體力。':!hasEnergy(state)?'🥄 先吃點東西':need?`口袋裡有 ${state.stars} 枚試玩星幣，再收集 ${need} 顆就能打開小路。`:`口袋裡有 ${state.stars} 枚試玩星幣，開放後還有 ${state.stars-GROVE_PRICE} 顆。`;
  if(!art)return;
  for(const [id,cottage]of [['village-postcard',true],['grove-postcard',false]]){
    const c=$(id).getContext('2d');c.clearRect(0,0,360,240);const bg=c.createLinearGradient(0,0,0,240);bg.addColorStop(0,'#e9eed4');bg.addColorStop(1,'#c5d5a4');c.fillStyle=bg;c.fillRect(0,0,360,240);c.fillStyle='#e8dcba';c.beginPath();c.ellipse(180,214,139,18,0,0,Math.PI*2);c.fill();
    const sprite=(index,x,y,h)=>{const a=art.forest.cells[index],w=a.w/a.h*h;c.drawImage(art.forest.image,a.x,a.y,a.w,a.h,x-w/2,y-h,w,h);};
    if(cottage){sprite(1,53,220,145);sprite(0,187,220,210);sprite(2,319,223,120);}else{sprite(1,65,225,200);sprite(2,275,214,210);sprite(3,174,221,92);c.fillStyle='#fff6c5';for(const [x,y]of [[135,63],[191,80],[214,143],[103,151]]){c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();}}
  }
}
function openTrail(){if(!scene||round||switching||(life.busy||(kitchen.busy||rest?.busy)))return;stopMoving();closeDecor();renderTrail();trail.showModal();}
$('trail-open').addEventListener('click',openTrail);$('trail-sign').addEventListener('click',()=>enterExit(scene.area==='grove'?'village':'grove'));
$('trail-island').onclick=()=>{trail.close();if(state.world.visited)switchArea('island');};
$('trail-close').addEventListener('click',()=>trail.close());trail.addEventListener('close',()=>{keys.clear();joystick.reset();canvas.focus({preventScroll:true});});
$('trail-village').addEventListener('click',()=>{trail.close();if(scene.area!=='forest')switchArea('forest');});
$('grove-unlock').addEventListener('click',()=>{
  if(!state.groveUnlocked){if(!unlockGrove(state)){renderTrail();return;}save();renderState();renderArea();$('trail-message').textContent='小路打開了！星星已收好，以後來都不用再付。';completeAction('unlock',{host:trail});return;}
  trail.close();switchArea('grove');
});

rest=createHomeRest({dine:id=>kitchen.eatAtHome(id),state:()=>state,scene:()=>scene,art:()=>art,save,changed:renderState,stop:stopMoving,walkTo,toast,blocked:()=>!scene||switching||scene.editing||!!round||wardrobe.open||trail.open||life.busy||kitchen.busy||shop?.busy||expedition?.busy||companions?.busy});
const decor=createHomeDecor({switchArea,useInventory:(kind)=>{if(kind==='clothes')document.getElementById('wardrobe-open').click();else if(kind==='seeds')life.visit('farm');else if(kind==='fish')kitchen.cookAtHome();else kitchen.eatAtHome();},state:()=>state,scene:()=>scene,art:()=>art,stopMoving,save,renderState,toast,changed:()=>renderArea(),blocked:()=>!scene||!!round||switching||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||life.busy||(kitchen.busy||rest?.busy)});
expedition=createExpedition({openShop:(id,onReturn)=>shop.openRegion(id,onReturn),state:()=>state,scene:()=>scene,art:()=>art,save,changed:renderState,stop:stopMoving,toast,defeated:()=>switchArea('forest',()=>completeAction('lose',{detail:'🥄 吃點東西，補充體力'})),blocked:()=>!scene||!!round||switching||wardrobe.open||shop?.busy||companions?.busy||life.busy||(kitchen.busy||rest?.busy)});
shop=createShop({state:()=>state,scene:()=>scene,art:()=>art,save,changed:renderState,stop:stopMoving,toast,blocked:()=>!scene||!!round||switching||wardrobe.open||companions?.busy||trail.open||life.busy||(kitchen.busy||rest?.busy)||visits?.busy||exploration?.busy});
visits=createIslandVisits({state:()=>state,art:()=>art,save,stop:stopMoving,toast,apply:next=>{state=sanitizeState(next);renderState();}});
exploration=createExplorationUI({visits:()=>visits.open(),state:()=>state,scene:()=>scene,enter:enterExit,switchArea,shop:id=>shop.open(id),expedition:(id,options)=>expedition.open(id,options),battle:m=>startBattle(m),stop:stopMoving,blocked:()=>!scene||!!round||switching||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||trail.open||life.busy||(kitchen.busy||rest?.busy)||visits?.busy||exploration?.busy});
function openDecor(){decor.open();}
function closeDecor(){decor.close();decorPointer=null;}
function selectFurniture(id){decor.select(id);}
function moveFurniture(at){decor.move(at);}
function updateDecor(){decor.update();}
function leaveKitchen(){if(!['kitchen','bedroom','bathroom'].includes(scene?.area)||switching)return;closeDecor();enterExit(scene.area==='bathroom'?'bedroom':'living');}
function refreshKitchenStations(){
 const box=$('kitchen-stations');box.replaceChildren();
 for(const item of state.kitchenLayout.filter(p=>FURNITURE.find(f=>f.id===p.id)?.cooking)){
  const f=FURNITURE.find(f=>f.id===item.id),button=document.createElement('button');button.type='button';button.className='stove-hotspot';button.dataset.station=item.id;button.setAttribute('aria-label','使用'+f.name+'製作料理');button.innerHTML='<span aria-hidden="true">🍲</span>';button.hidden=true;
  button.onclick=()=>{if(scene?.area!=='kitchen'||scene.editing||(kitchen.busy||rest?.busy)||switching)return;const target=stoveApproach(state,item);if(!target||!walkTo(target,()=>kitchen.useStation(item.id)))toast('先在料理爐前面留一點走路空間吧。');};box.append(button);
 }
}
const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
function syncFullscreen(){const active=!!fullscreenElement();$('fullscreen').setAttribute('aria-pressed',String(active));$('fullscreen').setAttribute('aria-label',active?'離開全螢幕':'進入全螢幕');$('fullscreen').querySelector('span').textContent=active?'縮回視窗':'全螢幕';}
$('fullscreen').addEventListener('click',async()=>{
  try{if(fullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)await exit.call(document);}else{const target=document.documentElement,request=target.requestFullscreen||target.webkitRequestFullscreen;if(!request){toast('遊戲已鋪滿視窗；這個瀏覽器目前不支援隱藏瀏覽器邊框。');return;}await request.call(target);}syncFullscreen();}
  catch{toast('遊戲已鋪滿視窗；目前無法切換系統全螢幕。');}
});
document.addEventListener('fullscreenchange',syncFullscreen);document.addEventListener('webkitfullscreenchange',syncFullscreen);

function openWardrobe(){
  if((kitchen.busy||rest?.busy)||life.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy)return;
  if(needFood())return;
  if(!isInterior(scene?.area)){toast('🧥 回家到衣櫃換衣服');return;}
  if(!['rabbit','fox','bear'].includes(state.companions.active)){companions.open();return;}
  if(!art){toast('棉花兔還在準備，請稍等一下。');return;}
  if(round||switching)return;closeDecor();stopMoving();preview=equippedOutfit(state);previewDirection=0;previewWalking=false;previousFocus=document.activeElement;
  $('preview-walk').textContent='走幾步';renderCloset();wardrobe.showModal();renderDoll(performance.now());$('wardrobe-close').focus({preventScroll:true});
}
function closeWardrobe(){wardrobe.close();previewWalking=false;(previousFocus?.isConnected?previousFocus:$('wardrobe-open')).focus({preventScroll:true});}
$('wardrobe-open').addEventListener('click',openWardrobe);$('wardrobe-close').addEventListener('click',closeWardrobe);
wardrobe.addEventListener('cancel',e=>{e.preventDefault();closeWardrobe();});
function renderCloset(){
  const character=state.companions.active,characterName={rabbit:'棉花兔',fox:'橘子狐',bear:'蜂蜜熊'}[character];
  $('wardrobe-title').textContent=characterName+'的衣櫃';
  for(const el of document.querySelectorAll('.tools-heading,.tool-options'))el.hidden=preview!=='daisy';
  $('outfit-list').innerHTML=OUTFITS.filter(item=>item.roles.includes(character)&&(state.owned.includes(item.id)||item.id===defaultOutfit(character))).map(item=>{
    const status=eligibility(state,item.id),locked=status==='role-locked',equipped=equippedOutfit(state)===item.id;
    const buttonText=locked?'尚未獲得角色':status==='owned'?(equipped?'✓ 穿著中':'換上這套'):status==='insufficient'?`還差 ${item.price-state.stars} 顆星星`:`✦ ${item.price} 購買並換上`;
    return `<article class="outfit-card ${preview===item.id?'selected':''}" data-item="${item.id}"><button class="outfit-thumb" data-preview="${item.id}" aria-label="${locked?'查看':'試穿'}${item.name}" ${locked?'disabled':''}>${locked?'<img src="assets/characters/star-envoy-sprites/star-01-bo-v1.png" alt="星星騎士的服裝">':`<canvas width="140" height="166" data-thumb="${item.id}" aria-label="${item.name}" role="img"></canvas>`}</button><div class="outfit-text"><h4>${item.name}</h4><div class="role-badge ${locked?'locked':''}"><img src="${locked?'assets/characters/star-envoy-sprites/star-01-bo-v1.png':'assets/characters/cozy-v1/'+character+'.png'}" alt="${locked?'星星騎士':characterName}"><span>${locked?'星星騎士專用 · 尚未獲得':characterName+'專用'}</span></div><p class="outfit-desc">${item.description}${locked?' · ✦ 12':''}</p></div><div class="outfit-actions">${locked?'':`<button class="try-button" data-preview="${item.id}">試穿看看</button>`}<button data-buy="${item.id}" class="buy-button ${equipped?'equipped':''}" ${locked||equipped||status==='insufficient'?'disabled':''}>${buttonText}</button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-thumb]').forEach(cv=>drawDoll(cv,art,{outfit:cv.dataset.thumb,wand:false}));
  document.querySelectorAll('[data-preview]').forEach(b=>b.addEventListener('click',()=>{
    if(eligibility(state,b.dataset.preview)==='role-locked')return;
    preview=b.dataset.preview;renderCloset();renderDoll(performance.now());
    $('wardrobe-status').textContent=eligibility(state,preview)==='owned'?'這套已經在衣櫃裡了，按「換上這套」就能穿出門。':'這是試穿效果；購買並換上後，地圖上的夥伴也會穿同一套。';
    document.querySelector(`[data-item="${preview}"] .try-button`)?.focus({preventScroll:true});
  }));
  document.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',async()=>{
    const id=b.dataset.buy,status=eligibility(state,id);let bought=false;
    if(status!=='owned'||!isInterior(scene.area))return;
    b.disabled=true;
    try{await ensureClothingArt(id);}catch{toast('衣服圖片還沒載入，請再試一次。');renderCloset();return;}
    if(!wardrobe.open)return;
    const before=structuredClone(state);if(!equipOutfit(state,id)){renderCloset();return;}
    if(!save()){Object.assign(state,before);if(!Object.hasOwn(before,'companionOutfits'))delete state.companionOutfits;renderCloset();$('wardrobe-status').textContent='尚未儲存，原本的穿搭已保留，請再試一次。';return;}preview=id;renderState();renderCloset();renderDoll(performance.now());
    completeAction('dress',{host:wardrobe,anchor:'#doll'});$('wardrobe-status').textContent=(bought?'買好了！這套衣服會一直留在你的衣櫃裡。':'換好囉！')+' 出門時，夥伴也會穿這一套。';
  }));
  document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.tool==='wand')===state.wand)));
  $('wardrobe-balance').textContent=state.stars;$('preview-walk').setAttribute('aria-pressed',String(previewWalking));
}
function renderDoll(now){
  const item=OUTFITS.find(x=>x.id===preview)||OUTFITS[0];
  $('preview-name').textContent=item.name;$('preview-tag').textContent=preview===equippedOutfit(state)?'目前穿搭':eligibility(state,preview)==='owned'?'試穿中 · 已擁有':'試穿中 · 尚未購買';
  $('direction-label').textContent=['正面','右側','背面','左側'][previewDirection];
  const options={outfit:preview,direction:previewDirection,walking:previewWalking&&!scene.reduced.matches,phase:now/110,wand:state.wand};
  drawDoll($('doll'),art,options);drawDoll($('mini-doll'),art,options);
  $('doll').dataset.outfit=preview;$('doll').dataset.direction=String(previewDirection);$('doll').dataset.wand=String(state.wand);
  $('doll').dataset.walkFrame=String(walkFrame(options.walking,options.phase,4));
  $('walk-preview-note').textContent='按「走幾步」，再轉身看看。';
  $('doll').setAttribute('aria-label',`${item.name}，${['正面','右側','背面','左側'][previewDirection]}`);
}
$('turn-left').addEventListener('click',()=>{previewDirection=(previewDirection+3)%4;renderDoll(performance.now());});
$('turn-right').addEventListener('click',()=>{previewDirection=(previewDirection+1)%4;renderDoll(performance.now());});
$('preview-walk').addEventListener('click',()=>{previewWalking=!previewWalking;$('preview-walk').textContent=previewWalking?'站好囉':'走幾步';$('preview-walk').setAttribute('aria-pressed',String(previewWalking));renderDoll(performance.now());});
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>{
  if(!hasEnergy(state)){closeWardrobe();needFood();return;}state.wand=b.dataset.tool==='wand';save();renderState();renderCloset();renderDoll(performance.now());completeAction('tool',{host:wardrobe,anchor:'#doll'});$('wardrobe-status').textContent=state.wand?'帶好魔法杖了，地圖上也看得到喔！':'先把魔法杖收起來。空著手也能施放星星魔法。';
}));

let releaseQuestionMusic=null;
function stopAudio(){if(audio){audio.pause();audio.currentTime=0;audio=null;}releaseQuestionMusic?.();releaseQuestionMusic=null;$('listen').classList.remove('playing');}
function later(fn,ms){const gen=roundGeneration;timerIds.push(setTimeout(()=>{if(gen===roundGeneration&&round)fn();},ms));}
function setBattleControls(disabled){$('wardrobe-open').disabled=disabled;$('find-monster').disabled=disabled;$('joystick').disabled=disabled;$('trail-open').disabled=disabled;}
function endBattle({focus=true}={}){
 forestMusic.setBattle(false);
 const had=!!round,m=scene?.monster,won=round?.phase==='reward';roundGeneration++;timerIds.forEach(clearTimeout);timerIds=[];stopAudio();round=null;heard=false;stopMoving();$('battle-panel').hidden=true;document.body.classList.remove('in-battle');setBattleControls(false);
 if(scene){scene.castAt=0;if(scene.area==='grove'&&m?.maxHp){if(!won)dismissEncounter(m,false);}else{scene.monster.visible=true;scene.monster.hp=3;}}
 monsterHovered=false;canvas.dataset.battle='idle';if(had&&focus){toast('🌿 休息一下，隨時再來');canvas.focus({preventScroll:true});}
}
async function startBattle(encounter=null){
  if(expedition){if(!scene||!['forest','grove'].includes(scene.area)||switching)return;const m=encounter||scene.monster;if(!m?.visible)return;if(encounter)scene.monster=m;await expedition.openEncounter(scene.area,m.id||'mushroom',()=>{if(scene.area==='grove')dismissEncounter(m,true);else{m.visible=false;setTimeout(()=>{if(scene.area==='forest')m.visible=true;},12000);}});return;}
 if(!scene||round||wardrobe.open||companions?.busy||expedition?.busy||shop?.busy||visits?.busy||exploration?.busy||trail.open||life.busy||(kitchen.busy||rest?.busy)||!['forest','grove'].includes(scene.area)||switching)return;
 if(!canSpendEnergy(state,'battle')){kitchen.open('bag','森林挑戰需要 8 體力，先吃點東西吧。');return;}
 const spec=scene.area==='grove'?enemySpec(encounter?.id):enemySpec('mushroom');if(scene.area==='grove'&&(!encounter?.visible||!scene.encounters.includes(encounter)))return;
 if(encounter)scene.monster=encounter;stopMoving();const token=++roundGeneration,area=scene.area,m=scene.monster;round={id:crypto.randomUUID(),spec,index:0,phase:'loading',errors:0};canvas.dataset.battle='loading';setBattleControls(true);toast('♫ 準備小挑戰…');
 forestMusic.setBattle(true);
 let prepared;try{prepared=await encounterDeck(spec);}catch{if(token===roundGeneration){endBattle({focus:false});toast('聲音題庫暫時沒載入，請再試一次。');}return;}
 if(token!==roundGeneration||!round||scene.area!==area||!m.visible)return;Object.assign(round,prepared,{phase:'approach'});canvas.dataset.battle='approach';
 const candidates=[{x:m.x-95,y:m.y+35},{x:m.x+95,y:m.y+35},{x:m.x,y:m.y+70}],bounds=area==='grove'?GROVE_WORLD:ISLAND_WORLD;
 const target=candidates.find(p=>findPath(scene.player,p,canWalk,bounds));if(!target){endBattle();return;}
 if(!walkTo(target,()=>{if(!round||scene.monster!==m)return;if(!spendEnergy(state,'battle')){endBattle();needFood();return;}save();renderState();scene.player.direction=face(m.x-scene.player.x,m.y-scene.player.y);m.hp=spec.hp;m.maxHp=spec.hp;document.body.classList.add('in-battle');$('battle-panel').hidden=false;$('battle-title').textContent=spec.name+' · '+'★'.repeat(spec.level);$('battle-kicker').textContent=modeIcon(spec.mode)+' · ✦ '+spec.reward;$('reward-actions').hidden=true;$('question-row').hidden=false;$('battle-leave').hidden=false;showQuestion();}))endBattle();
}
monsterButton.addEventListener('click',()=>startBattle());
monsterButton.addEventListener('pointerenter',()=>monsterHovered=true);monsterButton.addEventListener('pointerleave',()=>monsterHovered=false);monsterButton.addEventListener('focus',()=>monsterHovered=true);monsterButton.addEventListener('blur',()=>monsterHovered=false);
$('battle-leave').addEventListener('click',()=>endBattle());
function showQuestion(){if(!round)return;stopAudio();round.phase='question';heard=false;round.part='initial';round.parts=null;canvas.dataset.battle='question';renderAnswers();$('listen').disabled=false;playQuestion();}
function renderAnswers(){if(!round)return;const spec=round.spec;$('question-count').textContent=(round.index+1)+' / '+spec.hp;$('monster-health').textContent='♥ '.repeat(scene.monster.hp).trim();$('monster-health').setAttribute('aria-label',spec.name+'剩餘'+scene.monster.hp+'點體力');$('challenge-prompt').textContent=challengePrompt(round);$('answer-choices').replaceChildren();
 for(const option of challengeChoices(round)){const b=document.createElement('button');b.textContent=option.label;b.setAttribute('aria-label',spec.mode==='tone'?option.value+'聲':'選擇 '+option.label);b.disabled=!heard;b.onclick=()=>answer(option.value,b);$('answer-choices').append(b);} $('battle-message').textContent=spec.mode==='spelling'?'聽一聽，拼出注音':spec.mode==='tone'?'聽一聽，選聲調':'聽一聽，選注音';}
async function playQuestion(){if(!round||round.phase!=='question')return;forestMusic.setBattle(true);const generation=roundGeneration,index=round.index;const release=forestMusic.hold();stopAudio();const current=new Audio(audioSource(round.deck[index].audio));audio=current;releaseQuestionMusic=forestMusic.protect(current);release();current.preload='auto';current.addEventListener('ended',()=>{if(audio===current)$('listen').classList.remove('playing');});
 try{await current.play();if(generation!==roundGeneration||!round||round.index!==index||audio!==current){current.pause();return;}heard=true;$('listen').classList.add('playing');$('answer-choices').querySelectorAll('button:not(.wrong)').forEach(b=>b.disabled=false);}
 catch{if(generation!==roundGeneration||!round||round.index!==index||audio!==current)return;releaseQuestionMusic?.();releaseQuestionMusic=null;$('listen').classList.remove('playing');$('battle-message').textContent='♫ 點一下重聽；請確認音量與連線';}}
$('listen').addEventListener('click',playQuestion);
function answer(value,button){if(!round||round.phase!=='question'||!heard||button.disabled)return;if(value!==expectedAnswer(round)){round.errors++;button.classList.add('wrong');button.disabled=true;$('battle-message').textContent='再聽一次，慢慢來';playQuestion();return;}
 if(round.spec.mode==='spelling'&&round.part==='initial'){round.part='final';renderAnswers();return;}
 stopAudio();round.phase='casting';canvas.dataset.battle='casting';$('listen').disabled=true;$('answer-choices').querySelectorAll('button').forEach(b=>b.disabled=true);button.classList.add('correct');$('battle-message').textContent='✨ 答對了！';scene.castAt=performance.now();
 later(()=>{scene.monster.hp--; $('monster-health').textContent='♥ '.repeat(scene.monster.hp);},540);
 later(()=>{scene.castAt=0;round.index++;if(round.index>=round.deck.length){round.phase='reward';canvas.dataset.battle='reward';scene.monster.visible=false;if(scene.area==='grove')dismissEncounter(scene.monster,true);if(settleEncounter(state,round.id,round.spec.id)){save();renderState();}$('battle-title').textContent='✨ 挑戰完成';$('battle-kicker').textContent=round.spec.name+'去休息了';$('question-row').hidden=true;$('battle-leave').hidden=true;$('reward-actions').hidden=false;$('battle-message').textContent='✦ +'+round.spec.reward+' 星幣';$('reward-continue').focus({preventScroll:true});}else{round.errors=0;showQuestion();}},1200);
}
$('reward-continue').addEventListener('click',()=>{endBattle({focus:false});toast('✨ 收好星幣，繼續探索');canvas.focus({preventScroll:true});});
$('reward-wardrobe').addEventListener('click',()=>{endBattle({focus:false});switchArea('room');});
window.addEventListener('pagehide',()=>{actionFeedback.clear();endBattle({focus:false});clearTimeout(toastTimer);});
// Explicit local playtest link: set the tester's balance without resetting their home.
// Consume the parameter so ordinary refreshes keep purchases and deductions intact.
const testEntry=new URL(location.href);
// Apply the requested grant in the user's actual browser storage on next load.
// Persist its receipt in the home save; subsequent refreshes retain spending.
if(!globalThis.ForestStudent&&applyLocalTesterGrant(state,testEntry.hostname))save();
if(!globalThis.ForestStudent&&['127.0.0.1','localhost','[::1]'].includes(testEntry.hostname)&&testEntry.searchParams.get('testStars')==='1000'){
  state.stars=1000;save();testEntry.searchParams.delete('testStars');history.replaceState(null,'',testEntry);
}
// Persist the first timestamp too, so time away counts even before the first move.
save();renderState();requestAnimationFrame(tick);init();


// Reconcile the original game's completed rounds before the next home save.
window.addEventListener('forest-wallet',event=>{state.stars=event.detail.stars;renderState();});
window.addEventListener('storage',async e=>{if(globalThis.ForestStudent)return;if(e.key!==SAVE_KEY)return;actionFeedback.clear();expedition?.close();companions.close();shop.close();exploration.close();endBattle({focus:false});state=load();if(!scene)return;kitchen.cancelDining();rest?.cancel();stopMoving();closeDecor();life.close();document.getElementById('food-dialog').close();await restoreCompanion();
 try{if(isInterior(scene.area))await Promise.all([ensureHomeArt(art,[...(scene.area==='bathroom'?['daisyComplete']:[]),...furnitureArtKeys(layoutFor(state,scene.area))]),ensureRoomShell(art,state.wallpaper,scene.area),(scene.area==='bedroom'?ensureWardrobeArt(art,state.wallpaper):null)]);}catch{toast('圖片還沒載入，請重新進房間。');}
 renderState();renderArea();if(scene.area==='farm'){await ensureHomeArt(art,['extraCrops','collectionCrops']);life.enterFarm();}
});
window.addEventListener('pageshow',async e=>{if(e.persisted){expedition?.close();companions.close();state=load();await restoreCompanion();renderState();}});
