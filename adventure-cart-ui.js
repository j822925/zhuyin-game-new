import {BAITS} from './adventure-bait.js';
import {zoneShop,getShopRoomArt} from './adventure-zone-shop-data.js';
import {completeAction} from './adventure-action-feedback.js';
import {createShopRoom} from './adventure-shop-room.js';
import {FURNITURE,OUTFITS,eligibility} from './adventure-model.js';
import {DESTINATIONS,unlockDestination,SEEDS} from './adventure-exploration-model.js';
import {ensureHomeArt} from './adventure-home-art.js?v=20261010-light2';
import {drawFurnitureThumb} from './adventure-room.js';
import {drawDoll} from './adventure-art.js?v=20261010-light2';
import {WALLPAPERS,ensureWallpaperThumbs} from './adventure-wallpaper.js';
import {lifeStamp} from './adventure-life-art.js';
import {cartItem,shopIsOpen,quoteCart,checkoutCart} from './adventure-cart-model.js';
import {inventoryItems,ownedQuantity,quoteSale,checkoutSale,TRADE_KINDS} from './adventure-trade-inventory.js';
import {checkoutSound} from './adventure-shop-sound.js';
import {HOME_STYLES} from './data/home-furniture.js';
export function createShop(api){
 const dialog=document.createElement('dialog');dialog.id='island-shop';dialog.className='cart-shop';dialog.setAttribute('aria-label','島上商店');document.body.append(dialog);
 let active=null,category='furniture',style='daisy',version=0,mode='buy',baskets={buy:[],sell:[]},filter='all',stage='welcome',notice='',committing=false,onReturn=null,observers=[];
 const s=()=>api.state(),basket=()=>baskets[mode],near=()=>active&&(active.zone?s().expedition.active===active.zone&&!!s().expedition.runs[active.zone]&&!s().expedition.runs[active.zone].battle:api.scene()?.area==='island'&&Math.hypot(api.scene().player.x-active.entry.x,api.scene().player.y-active.entry.y)<100);
 const room=createShopRoom({...api,name:()=>active?.name||'商店',leave:close,trade:()=>{stage='browse';notice='';void render();}});
 function disconnect(){observers.forEach(o=>o.disconnect());observers=[];}
 function close(){version++;disconnect();room.unmount();dialog.close();active=null;baskets={buy:[],sell:[]};api.stop();const callback=onReturn;onReturn=null;callback?.();}
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 function fail(reason){checkoutSound(false);notice=reason;void render();}
 function commit(fn){
  if(committing||!near())return false;committing=true;const before=structuredClone(s());
  try{const result=fn();if(!result?.ok){fail(result?.reason||'暫時無法交易');return false;}
   if(!api.save())throw new Error('save');
  }catch{Object.assign(s(),before);fail('💾 尚未儲存，星幣和物品都沒有變動，請再試一次');return false;}finally{committing=false;}
  api.changed();checkoutSound(true);return true;
 }
 function resetTrade(){baskets={buy:[],sell:[]};mode='buy';filter='all';notice='';}
 async function open(id){if(api.blocked())return;active=DESTINATIONS.find(x=>x.id===id&&x.kind==='shop');if(!active||!near()){active=null;return;}api.stop();resetTrade();stage=shopIsOpen(s(),id)?'room':'welcome';category=id==='furniture'?'furniture':id==='clothes'?'clothes':'seeds';dialog.showModal();await render(true);}
 async function openRegion(id,returned){if(dialog.open)return false;const shop=zoneShop(id);if(!shop||s().expedition.active!==shop.zone||!s().expedition.runs[shop.zone]||s().expedition.runs[shop.zone].battle)return false;active=shop;onReturn=returned;api.stop();resetTrade();stage='room';category='regional';dialog.showModal();await render(true);return true;}
 function btn(text,fn,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.onclick=fn;return b;}
 function items(){if(category==='regional')return active.products.map(p=>cartItem(p.kind,p.id)).filter(Boolean);if(category==='furniture')return FURNITURE.filter(f=>!f.starter&&!f.zoneShop&&!f.giftOnly&&f.style===style).map(f=>({...f,kind:'furniture'}));if(category==='wallpaper')return WALLPAPERS.filter(w=>w.price>0).map(w=>({...w,kind:'wallpaper'}));if(category==='clothes')return OUTFITS.filter(o=>o.price>0&&o.character).map(o=>({...o,kind:'clothes'}));return [...Object.entries(SEEDS).map(([id,item])=>({...item,id,kind:'seeds'})),...Object.entries(BAITS).map(([id,item])=>({...item,id,kind:'bait'}))];}
 function lineItem(line){return mode==='sell'?inventoryItems(s(),active.id).find(v=>v.kind===line.kind&&v.id===line.id):cartItem(line.kind,line.id);}
 const price=item=>mode==='sell'?item?.sellPrice||0:item?.price||0;
 function add(item){
  const lines=basket(),max=mode==='sell'?item.quantity:['seeds','meal','bait'].includes(item.kind)?99:1;
  let line=lines.find(l=>l.kind===item.kind&&l.id===item.id);
  if(line&&line.quantity>=Math.min(99,max)){notice='已達可選數量';void render();return;}
  if(line)line.quantity++;else lines.push({kind:item.kind,id:item.id,quantity:1});
  stage='browse';notice=(mode==='buy'?'🧺 ':'📤 ')+item.name+' 已加入'+(mode==='buy'?'購物籃，尚未扣款':'賣出籃，尚未賣出');void render();
 }
 function basketUI(aside){
  const selling=mode==='sell';aside.innerHTML=`<h2>${selling?'📤 賣出籃':'🧺 購物籃'}</h2><div class="cart-lines" data-scroll="basket"></div><div class="cart-summary"></div>`;
  const list=aside.querySelector('.cart-lines'),summary=aside.querySelector('.cart-summary');
  if(!basket().length)list.innerHTML='<p class="cart-empty">'+(selling?'點下方持有物<br>加入賣出籃':'點上方商品<br>加入購物籃')+'</p>';
  for(const line of basket()){const item=lineItem(line),row=document.createElement('div');row.className='cart-line';row.innerHTML=`<span>${item?.name||'物品已變動'}${line.kind==='seeds'?'種子':''}<small>${TRADE_KINDS[line.kind]} · ✦ ${price(item)} × ${line.quantity}</small></span>`;
   const controls=document.createElement('div');controls.className='cart-quantity';
   const minus=btn('−',()=>{line.quantity--;baskets[mode]=basket().filter(x=>x.quantity>0);stage='browse';void render();});minus.ariaLabel='減少 '+(item?.name||'物品');controls.append(minus);
   const qty=document.createElement('b');qty.textContent=line.quantity;controls.append(qty);
   const max=selling?item?.quantity||0:['seeds','meal','bait'].includes(line.kind)?99:1;
   const plus=btn('+',()=>{if(item)add(item);});plus.ariaLabel='增加 '+(item?.name||'物品');plus.disabled=line.quantity>=Math.min(99,max);controls.append(plus);row.append(controls);list.append(row);
  }
  const total=basket().reduce((n,l)=>n+price(lineItem(l))*l.quantity,0),after=s().stars+(selling?total:-total);
  summary.innerHTML=`<strong>${selling?'可得':'合計'} ✦ ${total}</strong><small>交易後 ✦ ${after}</small>`;
  if(stage==='confirm'){
   summary.insertAdjacentHTML('beforeend',`<p>${selling?'確定賣出這些物品？':'確定購買這些物品？'}</p>`);
   summary.append(btn(selling?'✓ 確認賣出':'✓ 確認付款',()=>{const count=basket().reduce((n,l)=>n+l.quantity,0);if(commit(()=>selling?checkoutSale(s(),active.id,basket()):checkoutCart(s(),active.id,basket()))){baskets[mode]=[];stage='browse';notice=selling?`✓ 已賣出 ${count} 件，獲得 ${total} 星幣！`:`✓ 已買好 ${count} 件，已放入下方持有物！`;void render();if(!selling)completeAction('buy',{host:dialog,detail:count+' 件 ✓'});}},'primary'),btn('↩ 再看看',()=>{stage='browse';void render();}));
  }else{const checkout=btn(selling?'查看賣出明細':'🛍️ 去結帳',()=>{const q=selling?quoteSale(s(),active.id,basket()):quoteCart(s(),active.id,basket());if(!q.ok){fail(q.reason);return;}stage='confirm';notice='請確認右側明細與金額';void render();},'primary');checkout.disabled=!basket().length;summary.append(checkout);}
 }
 function grid(host,list,inventory,token){
  const grid=document.createElement('div');grid.className='trade-grid';grid.dataset.scroll=inventory?'inventory':'goods';host.append(grid);
  if(!list.length){grid.innerHTML='<p class="cart-empty">這個分類目前沒有物品</p>';return;}
  const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);void draw(e.target,list[Number(e.target.dataset.index)]);}}, {root:grid,rootMargin:'80px'});observers.push(observer);
  async function draw(b,item){const cv=b.querySelector('canvas');if(!cv)return;try{
   if(item.kind==='furniture')await ensureHomeArt(api.art(),[item.atlas].filter(Boolean));
   if(item.kind==='wallpaper')await ensureWallpaperThumbs(api.art(),[item.id]);
   if(token!==version||!dialog.open)return;
   if(item.kind==='furniture')drawFurnitureThumb(cv,api.art(),item.id);
   else if(item.kind==='clothes')drawDoll(cv,api.art(),{outfit:item.id,wand:false});
   else if(item.kind==='meal')lifeStamp(cv.getContext('2d'),api.art().cooking,item.art,100,166,140);
   else if(item.kind==='wallpaper')cv.getContext('2d').drawImage(api.art().wallpaperThumbs[item.id],0,20,200,125);
  }catch{if(token===version){cv.replaceWith(Object.assign(document.createElement('span'),{className:'trade-icon',textContent:'📦'}));}}}
  list.forEach((item,i)=>{
   const count=ownedQuantity(s(),item.kind,item.id),selected=mode===(inventory?'sell':'buy')?(baskets[mode].find(l=>l.kind===item.kind&&l.id===item.id)?.quantity||0):0;
   const roleLocked=item.kind==='clothes'&&eligibility(s(),item.id)==='role-locked';
   const locked=inventory?mode!=='sell'||!!item.sellReason:mode==='sell'||roleLocked||(count>0&&!['seeds','meal','bait'].includes(item.kind));
   const b=btn('',()=>add(item),'trade-slot'+(selected?' selected':''));b.dataset.index=i;b.dataset[inventory?'inventoryItem':'shopItem']=item.id;b.disabled=locked;
   const icon=item.kind==='seeds'?'🌱':item.icon||'🐟';
   b.innerHTML=`<div class="trade-picture">${['seeds','harvest','fish','bait'].includes(item.kind)?'<span class="trade-icon">'+(item.icon||icon)+'</span>':'<canvas width="200" height="170" aria-hidden="true"></canvas>'}<b class="trade-count">${inventory?'× '+count:'持有 '+count}</b></div><span class="trade-name">${item.name}${item.kind==='seeds'?'種子':''}</span><small>${inventory?(item.sellReason||'賣出 ✦ '+item.sellPrice):'✦ '+item.price}</small>${selected?'<em>籃內 '+selected+'</em>':''}`;
   if(!inventory&&roleLocked)b.querySelector('small').textContent='🔒 先解鎖'+({fox:'橘子狐',bear:'蜂蜜熊',rabbit:'棉花兔'}[item.character]||'夥伴');
   b.title=item.name+' · 持有 '+count+(inventory?' · '+(item.sellReason||'賣出單價 '+item.sellPrice):' · 單價 '+item.price);grid.append(b);observer.observe(b);
  });
 }
 async function render(reset=false){
  if(!active||!dialog.open)return;
  const scrolls=Object.fromEntries([...dialog.querySelectorAll('[data-scroll]')].map(e=>[e.dataset.scroll,[e.scrollTop,e.scrollLeft]]));
  room.unmount();disconnect();const token=++version;dialog.dataset.stage=stage;dialog.dataset.mode=mode;dialog.dataset.regional=String(!!active.zone);dialog.style.setProperty('--shop-room',`url("${getShopRoomArt(active.id).src}")`);
  dialog.innerHTML=`<header><h2>${active.icon} ${active.name}</h2><strong aria-label="持有星幣">✦ ${s().stars}</strong><nav></nav></header><p class="cart-notice" role="status">${notice||'上方選商品，下方看持有物；確認後才會交易。'}</p><div class="cart-layout"><section class="shop-content"></section><aside class="cart-basket"></aside></div>`;
  const nav=dialog.querySelector('header nav'),body=dialog.querySelector('.shop-content'),aside=dialog.querySelector('aside');
  if(stage!=='room'&&shopIsOpen(s(),active.id)){
   for(const [id,label]of [['buy','🛍️ 買入'],['sell','📤 賣出']]){const b=btn(label,()=>{mode=id;stage='browse';notice=id==='sell'?'點下方持有物加入賣出籃；擺放中與紀念品會保留。':'';void render();},id===mode?'primary':'');b.setAttribute('aria-pressed',String(id===mode));nav.append(b);}
   nav.append(btn('🚶 回店裡',()=>{stage='room';notice='';void render();}));
  }
  nav.append(btn('✕',close));nav.lastChild.ariaLabel='離開商店';
  if(!shopIsOpen(s(),active.id)){aside.hidden=true;body.innerHTML=`<h2>${active.icon}</h2><p>開放店鋪 ✦ ${active.price}</p><small>只付這一次，以後自由進店</small>`;body.append(btn('🔓 確認開放',()=>{if(commit(()=>({ok:unlockDestination(s(),active.id),reason:'✦ 星幣或體力不足'}))){stage='room';notice='';void render(true);completeAction('unlock',{host:dialog});}},'primary'));return;}
  if(stage==='room'){await room.mount(dialog,active.id,{reset});return;}
  basketUI(aside);
  body.innerHTML='<section class="trade-panel merchant-panel"><h3>🏪 商店貨品 <small>點選加入購物籃</small></h3><nav class="trade-filters" data-scroll="goods-tabs"></nav></section><section class="trade-panel inventory-panel"><h3>🎒 我的持有物 <small></small></h3><nav class="trade-filters" data-scroll="inventory-tabs"></nav></section>';
  const merchant=body.children[0],owned=body.children[1],tabs=merchant.querySelector('nav'),invTabs=owned.querySelector('nav');
  merchant.querySelector('h3 small').textContent=mode==='sell'?'切換「買入」即可選購':'點選加入購物籃';owned.querySelector('h3 small').textContent=mode==='sell'?'點選加入賣出籃':'買好後會出現在這裡';
  if(active.id==='furniture'){
   for(const [id,label]of [['furniture','🪑 家具'],['wallpaper','🏠 室內風格']])tabs.append(btn(label,()=>{category=id;void render();},id===category?'primary':''));
   if(category==='furniture')for(const v of HOME_STYLES)tabs.append(btn(v.name,()=>{style=v.id;void render();},v.id===style?'primary':''));
  }
  const inv=inventoryItems(s(),active.id);if(filter!=='all'&&!inv.some(v=>v.kind===filter))filter='all';if(new Set(inv.map(v=>v.kind)).size>1)for(const [id,label]of Object.entries(TRADE_KINDS))if(id==='all'||inv.some(v=>v.kind===id))invTabs.append(btn(label,()=>{filter=id;void render();},filter===id?'primary':''));
  if(filter!=='all'&&!inv.some(v=>v.kind===filter))filter='all';
  const goods=items(),kinds=new Set(goods.map(v=>v.kind));body.dataset.sparse=String(goods.length<=3);
  grid(merchant,goods,false,token);grid(owned,inv.filter(v=>filter==='all'||v.kind===filter).sort((a,b)=>Number(kinds.has(b.kind))-Number(kinds.has(a.kind))),true,token);
  for(const e of dialog.querySelectorAll('[data-scroll]'))if(scrolls[e.dataset.scroll]){e.scrollTop=scrolls[e.dataset.scroll][0];e.scrollLeft=scrolls[e.dataset.scroll][1];}
 }
 return {open,openRegion,close,get busy(){return dialog.open;}};
}
