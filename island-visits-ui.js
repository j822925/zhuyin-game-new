import {ForestScene} from './adventure-art.js';
import {freshState,FURNITURE,layoutFor,isInterior,roomWalkable,walkable,findPath,equippedOutfit} from './adventure-model.js';
import {ensureHomeArt,furnitureArtKeys} from './adventure-home-art.js';
import {ensureWallpapers,WALLPAPERS} from './adventure-wallpaper.js';
import {ensureWardrobeArt} from './adventure-wardrobe-art.js';
import {ensureBathroom} from './adventure-bathroom.js';
import {ensureClothingArt,drawClothing} from './adventure-clothing.js';
import {loadWalker,drawWalker} from './adventure-characters.js';
import {companionById,companionReady} from './adventure-companions-model.js';
import {createJoystick} from './adventure-joystick.js';
import {inventoryItems} from './adventure-trade-inventory.js';
import {islandSnapshot,VISIT_LAYOUTS,VISIT_EMOTES,giftBlocked} from './island-visits-model.js';
import catalog from './data/island-gift-catalog.json' with {type:'json'};
import {openVisitPeer} from './island-visits-peer.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const names={forest:'🌳 村莊',room:'🛋️ 客廳',bedroom:'🛏️ 臥室',kitchen:'🍳 廚房',bathroom:'🫧 衛浴'};
const errors={visit_closed:'島主暫時不開放參觀。',visit_not_ready:'這座小島還沒保存，等同學玩過再來！',visit_unavailable:'暫時無法拜訪這位同學。',gift_owned:'已經擁有這件物品，禮物仍保留在收禮箱。',gift_claimed:'這份禮物已經領取。',gift_quantity:'物品數量已改變，請重新選擇。',gift_mail_full:'對方收禮箱滿了，等朋友領取後再送。',gift_protected:'先收納或換下這件物品，再送給朋友。',forest_conflict:'另一個分頁已更新進度，請重新整理後再試。',authentication_required:'請回學習廣場重新登入。',forest_closed:'老師暫時關閉探險島。'};
export function createIslandVisits(api){
 const css=el('link');css.rel='stylesheet';css.href=new URL('./island-visits.css?v=20261013-visits1',import.meta.url).href;document.head.append(css);
 const dialog=el('dialog');dialog.id='island-visits';dialog.setAttribute('aria-label','搭船拜訪同學');
 const head=el('header'),title=el('h2','⛵ 搭船拜訪'),mail=button('🎁 收禮箱',showMail),lobbyButton=button('⛵ 碼頭',lobby),close=button('✕ 返回',leave),note=el('div');note.className='visit-message';note.setAttribute('role','status');
 head.append(title,mail,lobbyButton,close);
 const canvas=el('canvas');canvas.className='visit-world';canvas.tabIndex=0;canvas.setAttribute('aria-label','點地面走動，也可用方向鍵與左下搖桿');
 const list=el('section');list.className='visit-lobby';const nav=el('nav');nav.className='visit-nav';const stick=el('button');stick.className='visit-stick';stick.setAttribute('aria-label','移動角色');
 const drawer=el('section');drawer.className='visit-drawer';drawer.hidden=true;
 const request=el('aside');request.className='visit-request';request.hidden=true;
 dialog.append(canvas,head,note,list,nav,stick,drawer,request);document.body.append(dialog);
 let owner=null,snapshot=null,scene=null,connection=null,working=false,generation=0,last=0,frameId,route=[],ownPose=null,emote='',emoteUntil=0,open=true;
 const peers=new Map(),walkers=new Map(),loading=new Set(),keys=new Set();
 const store=()=>globalThis.ForestStudent;
 function button(text,action){const b=el('button',text);b.type='button';b.onclick=()=>run(action);return b;}
 async function run(fn){if(working)return;working=true;dialog.setAttribute('aria-busy','true');try{await fn();}catch(e){message(errors[e.message]||'連線還沒完成，請再試一次。');if(store()?.getPendingGift?.())retryTransfer();}finally{working=false;dialog.setAttribute('aria-busy','false');}}
 function message(s){note.textContent=s;}
 function clearConnection(){connection?.close();connection=null;peers.clear();request.hidden=true;}
 function retryTransfer(){drawer.hidden=false;drawer.replaceChildren(el('h3','🎁 確認送禮進度'),el('p','剛才的交易可能已完成。請確認結果後再繼續，不會重複扣除。'),button('重新確認',async()=>{const next=await store().visitTransfer({});api.apply(next);drawer.hidden=true;message('✓ 禮物交易已確認');}));}
 function leave(){if(store()?.getPendingGift?.()){message('請先重新確認剛才的禮物交易。');retryTransfer();return;}generation++;clearConnection();keys.clear();joystick.reset();cancelAnimationFrame(frameId);dialog.close();api.stop();}
 dialog.oncancel=e=>{e.preventDefault();if(!working)leave();};
 const joystick=createJoystick(stick,{isEnabled:()=>dialog.open&&!!owner&&drawer.hidden&&!working,onStart:()=>{route=[];keys.clear();}});
 async function lobby(){
  generation++;clearConnection();owner=null;keys.clear();route=[];drawer.hidden=true;canvas.hidden=true;nav.hidden=true;stick.hidden=true;list.hidden=false;title.textContent='⛵ 搭船拜訪';list.replaceChildren(el('p','正在查看同班小島…'));message('同班同學的小島；島主離線也可以參觀。');
  const result=await store().visitRequest({kind:'visit-list'});open=result.open;
  const toolbar=el('div');toolbar.className='visit-card';toolbar.append(el('strong','我的小島'),button(open?'🔓 已開放參觀':'🔒 已關閉參觀',async()=>{await store().visitRequest({kind:'visit-setting',open:!open});await lobby();}),button('👋 在家接待朋友',async()=>{if(!open){message('先開放參觀，就能在家接待朋友。');return;}await enter(store().seat,true);}));
  const grid=el('div');grid.className='visit-grid';
  for(const p of result.peers){const card=el('article');card.className='visit-card';const b=button('⛵ 出發',()=>enter(p.seat,false));b.disabled=!p.open||!p.ready;card.append(el('span','🏝️'),el('strong',p.seat+' 的小島'),el('small',!p.open?'暫不開放':p.ready?'可以參觀':'還沒保存小島'),b);grid.append(card);}
  list.replaceChildren(toolbar,el('h3','選一座小島'),grid);if(!result.peers.length)list.append(el('p','同班同學的小島會出現在這裡。'));
 }
 async function enter(target,hosting){
  const token=++generation;clearConnection();api.stop();const result=await store().visitRequest({kind:'visit-snapshot',target});if(token!==generation)return;
  snapshot={...freshState(),...result.snapshot};snapshot.wallpaper=WALLPAPERS.some(w=>w.id===snapshot.wallpaper)?snapshot.wallpaper:'original';
  for(const k of VISIT_LAYOUTS)snapshot[k]=snapshot[k].filter(v=>FURNITURE.some(f=>f.id===v.id));
  owner=target;title.textContent=hosting?'🏡 在家接待':target+' 的小島';list.hidden=true;canvas.hidden=false;nav.hidden=false;stick.hidden=false;drawer.hidden=true;
  scene=new ForestScene(canvas,api.art());scene.monster.visible=false;scene.extraPlayers=[];
  const defaultDraw=scene.drawPlayer;
  function draw(c,a,pose){const id=pose.character||api.state().companions.active;const opt={...pose,outfit:pose.outfit||equippedOutfit(api.state())};if(!drawClothing(c,a,opt)){const walker=walkers.get(id);if(walker)drawWalker(c,a,walker,opt);else defaultDraw(c,a,opt);}}
  scene.drawPlayer=(c,a,p)=>draw(c,a,{...p,character:api.state().companions.active,outfit:equippedOutfit(api.state())});scene.visitDraw=draw;
  await prepareAppearance({character:api.state().companions.active,outfit:equippedOutfit(api.state())});await room('room');
  nav.replaceChildren(...Object.entries(names).map(([id,label])=>button(label,()=>room(id))),...VISIT_EMOTES.map(v=>button(v,()=>{emote=v;emoteUntil=performance.now()+2200;})));
  if(!hosting)nav.append(button('🎁 送禮',showGifts),button('👋 申請一起玩',()=>connect(false)));
  message(hosting?'正在準備接待…':'島主不在這裡。可以自在參觀，喜歡的布置也能仔細看看！');
  if(hosting)await connect(true);
 }
 async function prepareAppearance(p){
  if(!companionReady(companionById(p.character)))return;
  const key=p.character+':'+p.outfit;if(loading.has(key))return;loading.add(key);
  try{await ensureClothingArt(p.outfit);if(p.character!=='rabbit'&&!walkers.has(p.character))walkers.set(p.character,await loadWalker(p.character));}catch{}finally{loading.delete(key);}
 }
 async function room(id){
  route=[];keys.clear();joystick.reset();
  if(isInterior(id))await Promise.all([ensureHomeArt(api.art(),['daisyHome',...furnitureArtKeys(layoutFor(snapshot,id))]),id==='bathroom'?ensureBathroom(api.art()):ensureWallpapers(api.art(),[snapshot.wallpaper]),id==='bedroom'?ensureWardrobeArt(api.art(),snapshot.wallpaper):null]);
  scene.area=id;Object.assign(scene.player,{x:id==='forest'?630:owner===store().seat?700:580,y:id==='forest'?610:630,moving:false});
 }
 async function connect(hosting){
  clearConnection();if(typeof RTCPeerConnection==='undefined'){message('這台裝置暫不支援即時互動，仍可繼續參觀。');return;}
  const result=await store().visitRequest({kind:'visit-ticket',...(hosting?{}:{target:owner})});
  const url=new URL('/island-visits/socket','https://zhuyin-api.j822925.workers.dev');url.protocol='wss:';url.searchParams.set('class',store().classId);url.searchParams.set('group',String(result.group));
  connection=openVisitPeer({socketUrl:store().visitSocketUrl?.(result)||url.href,ticket:result.ticket,seat:store().seat,hosting,
   onStatus:s=>message({hosting:'👋 正在接待朋友（最多三位）。',requesting:'正在詢問島主…',waiting:'等待島主同意，你可以繼續散步。',connected:'✨ 朋友來了！可以招手、一起逛逛。',offline:hosting?'即時接待暫時中斷，回碼頭可重新開放。':'島主不在場或連線未成功，繼續離線參觀吧！',declined:'島主現在不方便，仍可繼續參觀。'}[s]||s),
   onInvitation:(seat,answer)=>{request.hidden=false;request.replaceChildren(el('strong',seat+' 想一起逛小島'),button('👋 歡迎',()=>{answer(true);request.hidden=true;}),button('稍後再玩',()=>{answer(false);request.hidden=true;}));},
   onPose:(seat,p)=>{const old=peers.get(seat);peers.set(seat,{...p,drawX:old?.drawX??p.x,drawY:old?.drawY??p.y});if(!old||old.character!==p.character||old.outfit!==p.outfit)void prepareAppearance(p);},onLeave:seat=>peers.delete(seat)});
 }
 const allowed=(x,y)=>scene&&(isInterior(scene.area)?roomWalkable(x,y,snapshot,scene.area):walkable(x,y));
 canvas.onpointerdown=e=>{if(!owner||working||!drawer.hidden)return;e.preventDefault();canvas.focus();const p=scene.toWorld(e.clientX,e.clientY);route=findPath(scene.player,p,allowed)||[];};
 dialog.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&drawer.hidden&&owner){e.preventDefault();e.stopPropagation();keys.add(e.key);route=[];}});
 dialog.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
 function animate(now){
  if(!dialog.open)return;const dt=Math.min(.05,(now-(last||now))/1000);last=now;
  if(owner&&scene){let dx=0,dy=0,p=scene.player;
   if(!working&&drawer.hidden){dx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0)+joystick.input.x;dy=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0)+joystick.input.y;if(!dx&&!dy&&route.length){dx=route[0].x-p.x;dy=route[0].y-p.y;if(Math.hypot(dx,dy)<5){route.shift();dx=dy=0;}}}
   const distance=Math.hypot(dx,dy),speed=145*dt;p.moving=distance>0;
   if(distance){const x=p.x+dx/distance*Math.min(speed,distance),y=p.y+dy/distance*Math.min(speed,distance);if(allowed(x,y)){p.x=x;p.y=y;}else route=[];p.direction=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?0:2;p.phase+=dt*9;}
   ownPose={room:scene.area,x:p.x,y:p.y,direction:p.direction,moving:p.moving,character:api.state().companions.active,outfit:equippedOutfit(api.state()),emote:now<emoteUntil?emote:''};connection?.sendPose(ownPose);
   scene.extraPlayers=[];for(const [seat,other]of peers){if(other.room!==scene.area)continue;other.drawX+=(other.x-other.drawX)*.28;other.drawY+=(other.y-other.drawY)*.28;scene.extraPlayers.push({y:other.drawY,paint:()=>{scene.visitDraw(scene.c,api.art(),{...other,x:other.drawX,y:other.drawY,height:116,walking:other.moving,phase:now/110});label(seat,other.drawX,other.drawY,other.emote);}});}
   scene.render(now,{...snapshot,outfit:equippedOutfit(api.state()),wand:false},null);label('我',p.x,p.y,ownPose.emote);
  }
  frameId=requestAnimationFrame(animate);
 }
 function label(text,x,y,icon){const c=scene.c;c.save();c.font='14px sans-serif';c.textAlign='center';c.fillStyle='#fff9e9';c.beginPath();c.roundRect(x-38,y+4,76,23,9);c.fill();c.fillStyle='#365947';c.fillText(text,x,y+20);if(icon){c.font='29px sans-serif';c.fillText(icon,x,y-123);}c.restore();}
 function drawerHead(text){drawer.hidden=false;drawer.replaceChildren(el('h3',text),button('↩ 回去逛逛',()=>{drawer.hidden=true;}));keys.clear();route=[];}
 async function showMail(){
  drawerHead('🎁 收禮箱');const result=await store().visitRequest({kind:'visit-mail'});const grid=el('div');grid.className='visit-grid';
  for(const gift of result.gifts){const card=el('article');card.className='visit-card';card.append(el('strong',gift.name+' × '+gift.quantity),el('small','來自 '+gift.sender),button('打開禮物',async()=>{await transfer({kind:'visit-claim',giftId:gift.id});await showMail();message('🎁 收到了！物品已放進物品清單。');}));grid.append(card);}
  drawer.append(grid);if(!result.gifts.length)drawer.append(el('p','收禮箱空空的，收到禮物時會放在這裡。'));
 }
 function showGifts(){
  drawerHead('🎁 送給 '+owner);const items=inventoryItems(api.state()).filter(i=>!giftBlocked(api.state(),catalog.find(c=>c.kind===i.kind&&c.id===i.id)));
  const select=el('select');select.setAttribute('aria-label','禮物分類');for(const [id,name]of Object.entries({all:'全部可送禮物',furniture:'家具與娃娃',clothes:'服飾',wallpaper:'室內風格',seeds:'種子',harvest:'收穫',meal:'料理',fish:'魚',bait:'魚餌'})){const o=el('option',name);o.value=id;select.append(o);}
  const grid=el('div');grid.className='visit-grid';const render=()=>{grid.replaceChildren();for(const item of items.filter(i=>select.value==='all'||i.kind===select.value)){const c=el('article');c.className='visit-card';c.append(el('span',catalog.find(v=>v.kind===item.kind&&v.id===item.id)?.icon||'🎁'),el('strong',item.name),el('small','持有 '+item.quantity),button('選這個',()=>confirmGift(item)));grid.append(c);}if(!grid.children.length)grid.append(el('p','這個分類沒有可送出的物品。'));};select.onchange=render;drawer.append(el('p','初始贈品與好友紀念品留給自己；擺放中的物品請先收納。'),select,grid);render();
 }
 function confirmGift(item){drawerHead('🎁 確認禮物');const quantity=el('input');quantity.type='number';quantity.min='1';quantity.max=String(Math.min(10,item.quantity));quantity.step='1';quantity.value='1';quantity.setAttribute('aria-label','禮物數量');drawer.append(el('p','送給 '+owner+'：'+item.name),quantity,el('p','確認後會從背包取出，放到對方收禮箱。'),button('✓ 確認送出',async()=>{const n=Number(quantity.value);if(!Number.isInteger(n)||n<1||n>Math.min(10,item.quantity)){message('請選擇正確數量（最多 10 個）。');return;}await transfer({kind:'visit-give',target:owner,itemKind:item.kind,itemId:item.id,quantity:n});drawer.hidden=true;message('🎁 禮物已送進朋友的收禮箱！');}),button('重新挑選',showGifts));}
 async function transfer(payload){const state=await store().visitTransfer(payload);api.apply(state);}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearConnection();keys.clear();joystick.reset();if(dialog.open&&owner)message('暫停即時互動。回到碼頭可以重新接待或申請一起玩。');}});
 return {async open(){if(!store()?.visitRequest){api.toast('請從學習廣場登入後，再來搭船拜訪。');return;}api.stop();dialog.showModal();frameId=requestAnimationFrame(animate);await run(async()=>{if(store().getPendingGift?.()){retryTransfer();return;}if(!api.save()||!await store().publish())throw Error('pending_save');await lobby();});},get busy(){return dialog.open;}};
}
