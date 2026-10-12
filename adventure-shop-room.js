import {getShopRoom,getShopRoomArt} from './adventure-zone-shop-data.js';
import {RECIPES} from './adventure-food-model.js';
import {SHOP_ROOMS,SHOP_DISPLAY_POSITIONS,SHOP_START,SHOP_COUNTER,SHOP_EXIT,shopPoint,shopStep} from './data/adventure-shop-rooms.js';
import {SHOP_ROOM_ART} from './data/shop-room-art.js';
import {FURNITURE,OUTFITS} from './adventure-model.js';
import {SEEDS} from './adventure-exploration-model.js';
import {CROPS} from './adventure-life-model.js';
import {lifeStamp} from './adventure-life-art.js';
import {ensureHomeArt} from './adventure-home-art.js';
import {drawFurnitureThumb} from './adventure-room.js';
import {drawDoll} from './adventure-art.js';

export function createShopRoom(api){
 let root=null,raf=0,position={...SHOP_START},target=null,arrival=null,keys=new Set(),joystick=null,last=0,room=null,active=null,viewVersion=0,direction=2;
 const button=(label,fn,cls='')=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=fn;return b;};
 function unmount(){viewVersion++;cancelAnimationFrame(raf);root=null;keys.clear();joystick=null;target=null;arrival=null;}
 function walkTo(point,fn=null){target=shopPoint(point,room?.bounds);arrival=fn;keys.clear();joystick=null;root?.focus({preventScroll:true});}
 function clearTalk(){const box=root?.querySelector('.shop-room-talk');if(box)box.hidden=true;}
 function talk(title,text,trade=false){if(!root)return;const box=root.querySelector('.shop-room-talk');box.replaceChildren();box.hidden=false;const h=document.createElement('strong'),p=document.createElement('p');h.textContent=title;p.textContent=text;box.append(h,p);if(trade)box.append(button('🛍️ 看商品',api.trade,'primary'));box.append(button('↩ 繼續逛',()=>{clearTalk();root.focus({preventScroll:true});}));}
 function draw(now){
  if(!root?.isConnected)return;const dt=Math.min(.05,(now-last)/1000||0);last=now;if(document.hidden){raf=requestAnimationFrame(draw);return;}
  let dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0),moving=false;
  if(joystick){dx=joystick.x;dy=joystick.y;}if(dx||dy){target=null;arrival=null;clearTalk();position=shopStep(position,dx,dy,dt,room.bounds);moving=true;}else if(target){dx=target.x-position.x;dy=target.y-position.y;if(Math.hypot(dx,dy)<.8){position=target;target=null;const fn=arrival;arrival=null;fn?.();if(!root?.isConnected)return;}else {const next=shopStep(position,dx,dy,dt,room.bounds);position=next;moving=true;}}
  if(moving)direction=Math.abs(dx)>Math.abs(dy)?dx<0?3:1:dy<0?2:0;
  const canvas=root.querySelector('.shop-room-player'),c=canvas.getContext('2d');canvas.style.left=position.x+'%';canvas.style.top=position.y+'%';canvas.style.zIndex=Math.round(position.y);c.clearRect(0,0,180,220);api.scene().drawPlayer(c,api.art(),{x:90,y:212,height:185,outfit:api.state().outfit,wand:api.state().wand,direction,walking:moving,phase:now/100});root.dataset.playerX=position.x.toFixed(1);root.dataset.playerY=position.y.toFixed(1);
  if(moving&&Math.hypot(position.x-SHOP_EXIT.x,position.y-SHOP_EXIT.y)<3){api.leave();return;}raf=requestAnimationFrame(draw);
 }
 async function mount(host,id,{reset=false}={}){
  unmount();const token=viewVersion;active=id;room=getShopRoom(id);if(!room)return;if(reset)position={...SHOP_START};last=performance.now();direction=2;
  root=document.createElement('section');root.className='shop-room';root.dataset.shop=id;root.dataset.regional=String(!!room.regional);root.tabIndex=0;root.ariaLabel='可以自由走動的'+api.name();root.innerHTML='<div class="shop-room-world"><canvas class="shop-room-player" width="180" height="220" aria-label="我的角色"></canvas></div><aside class="shop-room-talk" aria-live="polite" hidden></aside>';host.append(root);const world=root.querySelector('.shop-room-world');world.style.backgroundImage=`url("${getShopRoomArt(id).src}")`;
  const counter=document.createElement('canvas');counter.width=290;counter.height=180;counter.className='shop-room-counter';counter.ariaHidden='true';if(!room.paintedCounter){world.append(counter);drawFurnitureThumb(counter,api.art(),'table');}
  const owner=button('',()=>{clearTalk();walkTo(room.paintedCounter?{x:54,y:66}:room.counter||SHOP_COUNTER,()=>talk(room.owner,room.greeting,true));},'shop-room-owner');owner.ariaLabel='與'+room.owner+'對話';const img=document.createElement('img');img.src=getShopRoomArt(id).ownerSrc;img.alt=room.owner;img.onerror=()=>{img.hidden=true;owner.classList.add('portrait-missing');};owner.append(img);const tag=document.createElement('small');tag.textContent='💬 '+room.owner;owner.append(tag);world.append(owner);
  const exit=button('🚪 ↩',api.leave,'shop-room-exit');exit.ariaLabel='離開商店';world.append(exit);
  const help=document.createElement('small');help.className='shop-room-hint';help.textContent='點地板走動 · 💬 找店主 · 👀 看陳列';root.append(help);
  const entries=[];
  room.displays.forEach((display,i)=>{
   const item=display.kind==='clothes'?OUTFITS.find(o=>o.id===display.id):['furniture','decor'].includes(display.kind)?FURNITURE.find(f=>f.id===display.id):display.kind==='seeds'?SEEDS[display.id]:display.kind==='meal'?RECIPES[display.id]:CROPS[display.id],point=display.position||SHOP_DISPLAY_POSITIONS[i];
   const b=button('',()=>{clearTalk();walkTo({x:point.x<50?37:63,y:point.y+3},()=>talk(item.name,display.displayOnly?(display.kind==='crop'?'這是免費種子的作物，可以去農場種。':'店內穿搭展示。'):display.kind==='decor'?'小店的布置，歡迎看看！':`✦ ${item.price} 星幣 · 想購買，請找店主。`));},'shop-room-display');b.ariaLabel='查看'+item.name;b.style.left=point.x+'%';b.style.top=point.y+'%';b.style.zIndex=Math.round(point.y);if(room.regional)b.style.width=point.x===16||point.x===84?'12%':'18%';b.innerHTML='<canvas width="240" height="210" aria-hidden="true"></canvas><small>👀</small>';if(display.painted){b.classList.add('painted-display');b.querySelector('small').textContent='👀 '+(display.caption||'衣服展示');}else b.hidden=true;world.append(b);entries.push({display,item,canvas:b.querySelector('canvas'),button:b});
  });
  root.onpointerdown=e=>{if(e.target.closest('button,aside'))return;clearTalk();const r=world.getBoundingClientRect();walkTo({x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100});};
  root.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(e.key)){e.preventDefault();keys.add(e.key);}};root.onkeyup=e=>keys.delete(e.key);
  const stick=button('✿',()=>{},'shop-room-stick');stick.ariaLabel='商店移動搖桿';root.append(stick);const move=e=>{const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;joystick=Math.hypot(x,y)>6?{x,y}:null;};stick.onpointerdown=e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);move(e);};stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))move(e);};for(const evt of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(evt,()=>joystick=null);
  root.focus({preventScroll:true});raf=requestAnimationFrame(draw);
  try{await ensureHomeArt(api.art(),entries.filter(e=>!e.display.painted&&['furniture','decor'].includes(e.display.kind)).map(e=>e.item.atlas).filter(Boolean));if(token!==viewVersion||!root?.isConnected)return;for(const {display,item,canvas,button:b}of entries){if(display.painted)continue;if(['furniture','decor'].includes(display.kind))drawFurnitureThumb(canvas,api.art(),item.id);else if(display.kind==='clothes')drawDoll(canvas,api.art(),{outfit:item.id,height:185,wand:false});else if(display.kind==='meal'){lifeStamp(canvas.getContext('2d'),api.art().cooking,item.art,120,202,155);}else {const crop=CROPS[display.id];lifeStamp(canvas.getContext('2d'),api.art()[crop.atlas||'life'],crop.art,120,202,170);}b.hidden=false;}}catch{if(token===viewVersion)talk('🖼️','陳列圖片還沒載入，重新進店可以再試。');}
 }
 window.addEventListener('blur',()=>{keys.clear();joystick=null;});
 return {mount,unmount};
}
