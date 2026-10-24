import {inventoryItems,TRADE_KINDS} from './adventure-trade-inventory.js';
import {floorPosition,facingOptions} from './home-spatial-model.js';
import {furnitureSurfaces,freeSurfacePosition,surfaceAnchor} from './furniture-surfaces.js';
import {drawDoll} from './adventure-art.js';
import {wallPosition} from './data/home-wall-furniture.js';
import {completeAction} from './adventure-action-feedback.js';
import {hasEnergy} from './adventure-food-model.js';
import {FURNITURE,layoutFor,isInterior,hasFurnitureOverlap,canPlaceFurniture,placementState,canReachInterior,placeFurniture,storeFurniture} from './adventure-model.js';
import {HOME_STYLES} from './data/home-furniture.js';
import {ensureHomeArt} from './adventure-home-art.js?v=20261010-light2';
import {ensureWardrobeArt} from './adventure-wardrobe-art.js';
import {drawFurnitureThumb} from './adventure-room.js';
import {WALLPAPERS,ensureWallpapers,ensureWallpaperThumbs,applyWallpaper} from './adventure-wallpaper.js';
export function createHomeDecor(api){
 const $=id=>document.getElementById(id);let style='all',version=0,wallpaperChoice=0,loading=false,category='furniture',wallpaper=null,autoOrient=true;
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('./home-spatial.css?v=20261025-home1',import.meta.url).href;document.head.append(stylesheet);
 const controls=document.createElement('div');controls.id='decor-position-tools';$('decor-hint').before(controls);
 const rooms=document.createElement('nav');rooms.id='decor-rooms';rooms.setAttribute('aria-label','選擇房間');
 for(const [id,name]of Object.entries({room:'客廳',kitchen:'廚房',bedroom:'臥室',bathroom:'衛浴'})){const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.room=id;b.onclick=async()=>{close();await api.switchArea?.(id);open();};rooms.append(b);}$('decor-panel').prepend(rooms);
 const choose=document.createElement('button');choose.type='button';choose.id='decor-choose';choose.textContent='📦 換一件';choose.onclick=()=>{scene().placement=null;update();};controls.before(choose);
 const resize=()=>{if(!scene()?.editing)return;const r=$('decor-panel').getBoundingClientRect(),screen=$('world').getBoundingClientRect(),bottom=r.width>screen.width*.7;scene().decorInsets=bottom?{top:12,bottom:screen.bottom-r.top+12}:{top:12,right:screen.right-r.left+12};};
 const observer=new ResizeObserver(resize);observer.observe($('decor-panel'));window.addEventListener('resize',resize);
 const state=()=>api.state(),scene=()=>api.scene(),area=()=>scene().area;
 $('decor-styles').innerHTML=[{id:'all',name:'全部家具'},{id:'special',name:'特色商品'},...HOME_STYLES].map(s=>`<button type="button" data-home-style="${s.id}" aria-label="${s.name}" data-child-icon="${({all:"📦",special:"🎁",honey:"🍯",ocean:"🐚",berry:"🍓",daisy:"🌼",fox:"🦊",moon:"🌙"})[s.id]}">${s.name}</button>`).join('');
 $('decor-styles').querySelectorAll('button').forEach(b=>b.onclick=()=>{style=b.dataset.homeStyle;scene().placement=null;void palette();update();});
 $('decor-categories').innerHTML=[['furniture','🪑 家具與裝飾'],['wallpaper','🏠 室內風格'],['clothes','👗 服飾'],['meal','🍲 食物'],['ingredients','🥕 食材'],['seeds','🌱 種子']].map(([id,name])=>`<button type="button" data-decor-category="${id}">${name}</button>`).join('');
 $('decor-categories').querySelectorAll('button').forEach(b=>b.onclick=()=>{category=b.dataset.decorCategory;scene().placement=null;scene().wallpaperPreview=null;wallpaper=null;void palette();update();});
 function open(){if(!isInterior(scene()?.area)||api.blocked())return;api.stopMoving();scene().editing=true;scene().placement=null;document.body.classList.add('decorating');$('decor-panel').hidden=false;style='all';category='furniture';wallpaper=null;$('decor-categories').hidden=false;void palette();update();}
 function close(){version++;if(!scene())return;scene().editing=false;scene().placement=null;scene().wallpaperPreview=null;scene().decorInsets=null;wallpaper=null;$('decor-panel').hidden=true;document.body.classList.remove('decorating','decor-placing');}
 async function palette(){
  $('decor-categories').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.decorCategory===category)));
  $('decor-wallet').textContent=`✦ ${state().stars}`;$('decor-styles').hidden=category!=='furniture';$('decor-panel').querySelector('.decor-actions').hidden=!['furniture','wallpaper'].includes(category);
  if(!['furniture','wallpaper'].includes(category)){inventoryPalette();return;}
  $('decor-store').hidden=category==='wallpaper';$('decor-place').textContent=category==='wallpaper'?'換上整套風格 ✓':'放好了 ✓';$('decor-cancel').textContent=category==='wallpaper'?'取消預覽':'取消移動';
  if(category==='wallpaper'){await wallpaperPalette();return;}
  const token=++version,currentArea=area(),available=FURNITURE.filter(f=>state().furnitureOwned.includes(f.id));
  const styles=new Set(available.map(f=>f.style));if(!['all','special'].includes(style)&&!styles.has(style))style='all';
  const items=available.filter(f=>style==='all'||(style==='special'?(!HOME_STYLES.some(s=>s.id===f.style)||f.zoneShop||f.giftOnly):f.style===style)).sort((a,b)=>currentArea==='kitchen'?Number(!!b.cooking)-Number(!!a.cooking):0);
  const theme=HOME_STYLES.find(s=>s.id===style);$('decor-style-note').textContent=theme?`${theme.character}的靈感・${theme.description}`:'';
  $('decor-styles').querySelectorAll('button').forEach(b=>{b.hidden=!['all','special'].includes(b.dataset.homeStyle)&&!styles.has(b.dataset.homeStyle);b.setAttribute('aria-pressed',String(b.dataset.homeStyle===style));});
  $('decor-wallet').textContent=`✦ ${state().stars}`;
  $('furniture-palette').innerHTML=items.map(f=>{const owned=state().furnitureOwned.includes(f.id),here=layoutFor(state(),currentArea).some(p=>p.id===f.id),elsewhere=['room','kitchen','bedroom','bathroom'].some(a=>a!==currentArea&&layoutFor(state(),a).some(p=>p.id===f.id));return `<button type="button" data-furniture="${f.id}" aria-pressed="${scene().placement?.id===f.id}" aria-label="${f.name}，${owned?'已擁有':f.price+' 星幣'}"><canvas width="180" height="150" aria-hidden="true"></canvas><span>${f.wall?"🖼️ ":""}${f.name}</span><small>${owned?(here?'✓ 擺放中':elsewhere?'另一個房間':'已擁有・收納中'):`✦ ${f.price} 星幣`}</small></button>`;}).join('');
  loading=true;$('furniture-palette').setAttribute('aria-busy','true');$('furniture-palette').querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await ensureHomeArt(api.art(),items.map(f=>f.atlas).filter(Boolean));if(token!==version)return;
   $('furniture-palette').querySelectorAll('button').forEach(b=>{drawFurnitureThumb(b.querySelector('canvas'),api.art(),b.dataset.furniture);const f=FURNITURE.find(f=>f.id===b.dataset.furniture);if(f.areas&&!f.areas.includes(currentArea)){b.querySelector('small').textContent='放在'+f.areas.map(a=>({kitchen:'廚房',bathroom:'衛浴',bedroom:'臥室',room:'客廳'})[a]).join('／');b.disabled=true;}else{b.disabled=false;b.onclick=()=>select(b.dataset.furniture);}});
  }catch{if(token===version)$('decor-hint').textContent='這套家具還没載入完成，點上方風格再試一次。';}
  finally{if(token===version){loading=false;$('furniture-palette').setAttribute('aria-busy','false');}}
 }
 function select(id){
  if(loading||category!=='furniture')return;if(!hasEnergy(state())){api.toast('🥄 先吃點東西，再布置');return;}const f=FURNITURE.find(f=>f.id===id);if(!f||!state().furnitureOwned.includes(id)||!api.art()[f.atlas||'furniture'])return;autoOrient=true;
  let pos=layoutFor(state(),area()).find(p=>p.id===id);
  const preview={...state(),furnitureOwned:[...state().furnitureOwned,id]};
  if(!pos&&f.wall)pos=f.ceiling?{x:640,y:160}:{x:850,y:area()==='bathroom'?260:220};
  if(!pos){outer:for(let y=area()==='bathroom'?530:410;y<=650;y+=60)for(let x=330;x<=950;x+=75)if(!hasFurnitureOverlap(preview,id,{x,y},area())&&canPlaceFurniture(preview,id,{x,y},area())&&canReachInterior(placementState(preview,id,{x,y},area()),scene().player,area())){pos={x,y};break outer;}}
  scene().placement={facing:'front',...pos,id,x:pos?.x??640,y:pos?.y??550,valid:false};if(f.corner)Object.assign(scene().placement,floorPosition(scene().placement,f));update();
  $('furniture-palette').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.furniture===id)));
 }
 function move(at){const p=scene().placement;if(!p)return;const f=FURNITURE.find(f=>f.id===p.id),layout=layoutFor(state(),area());let snapped=null,best=Infinity;
  if(f.small)for(const host of layout.filter(x=>x.id!==p.id))for(const [i,s]of furnitureSurfaces(FURNITURE.find(f=>f.id===host.id)).entries()){const a=surfaceAnchor(host,s),distance=Math.hypot(at.x-a.x,at.y-a.y),spot=freeSurfacePosition(p.id,host,i,layout,FURNITURE);if(spot&&distance<Math.max(30,s.width/2)&&distance<best){best=distance;snapped=spot;}}
  delete p.on;delete p.surface;delete p.offsetX;const next=snapped||(f.wall?wallPosition(at,f):floorPosition({...p,...at},f,{auto:autoOrient,area:area()}));delete p.mount;Object.assign(p,next);update();}
 function supportChoices(p,f){let box=$('decor-supports');if(!box){box=document.createElement('div');box.id='decor-supports';box.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin:8px 0';$('decor-hint').before(box);}box.replaceChildren();box.hidden=!f?.small;if(!f?.small)return;
  for(const host of layoutFor(state(),area()).filter(x=>x.id!==p.id)){const base=FURNITURE.find(f=>f.id===host.id);furnitureSurfaces(base).forEach((surface,i)=>{const spot=freeSurfacePosition(p.id,host,i,layoutFor(state(),area()),FURNITURE);const b=document.createElement('button');b.type='button';b.textContent=base.name+'・'+surface.name;b.disabled=!spot;b.style.cssText='font-size:13px;min-height:44px;padding:5px 9px';b.onclick=()=>{Object.assign(p,spot);update();};box.append(b);});}
 }
 function update(){
  const placing=!!scene()?.placement&&category==='furniture';document.body.classList.toggle('decor-placing',placing);choose.hidden=!placing;controls.hidden=!placing;rooms.hidden=placing;rooms.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.room===area())));controls.replaceChildren();
  if(placing){const p=scene().placement,f=FURNITURE.find(f=>f.id===p.id);const label=document.createElement('strong');label.textContent=f.name;controls.append(label);
   for(const direction of facingOptions(f)){const b=document.createElement('button');b.type='button';b.textContent=({front:'↓ 正面',right:'→ 向右',back:'↑ 背面',left:'← 向左'})[direction];b.setAttribute('aria-pressed',String((p.facing||'front')===direction));b.onclick=()=>{autoOrient=false;p.facing=direction;if(f.corner)Object.assign(p,floorPosition({...p,x:direction==='left'?360:920},f));update();};controls.append(b);}
   if(!f.wall&&!f.corner){const b=document.createElement('button');b.type='button';b.textContent=autoOrient?'🧲 自動靠牆':'🧲 自由放置';b.setAttribute('aria-pressed',String(autoOrient));b.onclick=()=>{autoOrient=!autoOrient;update();};controls.append(b);}
  }requestAnimationFrame(resize);
  if(!['furniture','wallpaper'].includes(category)){$('decor-hint').textContent='';$('decor-supports')?.replaceChildren();return;}
  if(category==='wallpaper'){
   $('decor-supports')?.replaceChildren();
   const w=WALLPAPERS.find(w=>w.id===wallpaper),owned=!!w&&state().wallpaperOwned.includes(w.id);
   $('decor-buy').hidden=true;$('decor-buy').disabled=loading||!w||owned||state().stars<w.price;$('decor-buy').textContent=w?`用 ${w.price} 星幣買${w.name}`:'';
   $('decor-place').disabled=loading||!owned||state().wallpaper===w?.id;$('decor-cancel').disabled=!w;$('decor-hint').classList.remove('invalid');
   $('decor-hint').textContent=!w?'選已擁有的室內風格。新款在探險島地圖的家具行。':!owned?(state().stars<w.price?`還差 ${w.price-state().stars} 星幣。`:`正在預覽${w.name}，喜歡再買下。`):state().wallpaper===w.id?'客廳、臥室和廚房換好了。':'正在預覽，按「換上整套風格」就會保存。';return;
  }
  const p=scene()?.placement,f=FURNITURE.find(f=>f.id===p?.id),owned=!!f&&state().furnitureOwned.includes(f.id);let valid=false;
  supportChoices(p,f);
  if(p&&owned){valid=canPlaceFurniture(state(),p.id,p,area())&&canReachInterior(placementState(state(),p.id,p,area()),scene().player,area());p.valid=valid;}
  $('decor-buy').hidden=true;$('decor-buy').disabled=!f||owned||state().stars<f.price;$('decor-buy').textContent=f?`用 ${f.price} 星幣買${f.name}`:'';
  $('decor-place').disabled=!valid;$('decor-cancel').disabled=!p;$('decor-store').disabled=!p||!layoutFor(state(),area()).some(x=>x.id===p.id);
  $('decor-hint').classList.toggle('invalid',!!p&&owned&&!valid);
  $('decor-hint').textContent=!p?(area()==='kitchen'?'擺好已擁有的料理爐，再點它做料理。新家具在島上的家具行。':'挑已擁有的家具來布置。新家具在島上的家具行。'):!owned?(state().stars<f.price?`還差 ${f.price-state().stars} 星幣。已擁有的家具仍能自由布置。`:`${f.name}・${f.price} 星幣。買下就會擺好，之後也能重新移動。`):valid?(hasFurnitureOverlap(state(),p.id,p,area())?'可以放！家具會依前後位置互相遮擋。':'點地板或拖曳選位置，再按 ✓。可靠牆或與家具重疊。'):'請把家具底部放在房間的地板範圍內。';
  if(f?.wall)$('decor-hint').textContent=valid?'🖼️ 可以掛！點牆面選位置，再按 ✓。左右牆會自動轉成側面。':'🖼️ 請點房間後方或左右兩側的牆面。';
  if(f?.ceiling)$('decor-hint').textContent='選房間上方的位置掛好吊扇，再按 ✓。';
  if(f?.small)$('decor-hint').textContent=p.on?'放好了位置，再按 ✓ 確認。':'選上面的家具放上去，或點地板擺放。';
  $('world').dataset.placement=p?.id||'';$('world').dataset.placementValid=String(valid);
 }
 $('decor-buy').onclick=null;
 $('decor-place').onclick=()=>{if(!hasEnergy(state())){close();api.toast('🥄 先吃點東西');return;}if(category==='wallpaper'){if(loading||!isInterior(area())||!applyWallpaper(state(),wallpaper))return;scene().wallpaperPreview=null;api.save();void palette();update();completeAction('wallpaper');return;}const p=scene().placement;if(!p||!placeFurniture(state(),p.id,p,scene().player,area())){update();return;}api.save();scene().placement=null;void palette();update();api.changed();$('decor-hint').textContent='放好了，也幫你記住位置囉！';completeAction('place');};
 $('decor-store').onclick=()=>{if(!hasEnergy(state())){close();api.toast('🥄 先吃點東西');return;}if(!scene().placement)return;storeFurniture(state(),scene().placement.id,area());api.save();scene().placement=null;void palette();update();api.changed();$('decor-hint').textContent='已放進收納，不用再花星幣購買。';completeAction('store');};
 $('decor-cancel').onclick=()=>{scene().placement=null;scene().wallpaperPreview=null;wallpaper=null;void palette();update();};
 $('decor-open').onclick=open;$('decor-close').onclick=close;
 return {open,close,select,move,update};


 function inventoryPalette(){
  version++;loading=false;$('furniture-palette').setAttribute('aria-busy','false');$('decor-style-note').textContent='';
  const kinds=category==='ingredients'?['harvest','fish']:[category],items=inventoryItems(state()).filter(v=>kinds.includes(v.kind));
  const palette=$('furniture-palette');palette.replaceChildren();
  if(!items.length){palette.textContent='這個分類目前沒有物品';return;}
  for(const item of items){const b=document.createElement('button');b.type='button';b.dataset.inventoryItem=item.id;
   const art=document.createElement('span');art.className='inventory-symbol';art.textContent=item.icon||({clothes:'👗',meal:'🍲',fish:'🐟',harvest:'🥕',seeds:'🌱'})[item.kind];
   if(item.kind==='clothes'){const cv=document.createElement('canvas');cv.width=180;cv.height=150;drawDoll(cv,api.art(),{outfit:item.id,wand:false});b.append(cv);}else b.append(art);
   const name=document.createElement('span');name.textContent=item.name+(item.kind==='seeds'?'種子':'');const qty=document.createElement('small');qty.textContent='× '+item.quantity+' · '+({clothes:'去換裝',meal:'選食物',harvest:'食物籃',fish:'去廚房料理',seeds:'去農場播種'})[item.kind];b.append(name,qty);
   b.onclick=()=>{close();api.useInventory?.(item.kind,item.id);};palette.append(b);
  }
 }

 async function wallpaperPalette(){
  const token=++version;loading=true;$('furniture-palette').setAttribute('aria-busy','true');$('decor-wallet').textContent=`✦ ${state().stars}`;$('decor-style-note').textContent='客廳、臥室和廚房一起換風格；衛浴保留磁磚。';
  $('furniture-palette').innerHTML=WALLPAPERS.filter(w=>state().wallpaperOwned.includes(w.id)).map(w=>`<button type="button" data-wallpaper="${w.id}" aria-pressed="${wallpaper===w.id}"><canvas width="180" height="120" aria-hidden="true"></canvas><span>${w.name}</span><small>${state().wallpaper===w.id?'✓ 使用中':state().wallpaperOwned.includes(w.id)?'已擁有':`✦ ${w.price} 星幣`}</small></button>`).join('');
  try{await ensureWallpaperThumbs(api.art(),WALLPAPERS.filter(w=>state().wallpaperOwned.includes(w.id)).map(w=>w.id));if(token!==version)return;
   $('furniture-palette').querySelectorAll('button').forEach(b=>{const c=b.querySelector('canvas').getContext('2d'),img=api.art().wallpaperThumbs[b.dataset.wallpaper];c.drawImage(img,0,0,180,120);
    b.onclick=async()=>{if(loading)return;const choice=++wallpaperChoice;try{await ensureWallpapers(api.art(),[b.dataset.wallpaper]);if(area()==='bedroom')await ensureWardrobeArt(api.art(),b.dataset.wallpaper);if(choice!==wallpaperChoice||token!==version||!scene().editing)return;wallpaper=b.dataset.wallpaper;scene().wallpaperPreview=wallpaper;$('furniture-palette').querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));update();}catch{api.toast('衣櫃圖片還沒載入，請再點一次風格。');}};
   });
  }catch{api.toast('室內圖片暫時沒載入，請再點「整套室內風格」試一次。');}
  finally{if(token===version){loading=false;$('furniture-palette').setAttribute('aria-busy','false');update();}}
 }
}

