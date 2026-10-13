import {DESTINATIONS,GROVE_ENTRY,GROVE_EXIT,modeIcon,destinationOpen} from './adventure-exploration-model.js';
import {zoneById} from './data/adventure-zones.js';
export function createExplorationUI(api){
 const stage=document.getElementById('map-stage'),buttons=[];
 let offer=null;
 const invitation=document.createElement('aside');invitation.id='island-invitation';invitation.hidden=true;invitation.setAttribute('aria-label','附近地點');invitation.innerHTML='<button class="invitation-close" aria-label="略過這個地點">✕</button><strong class="invitation-title"></strong><p class="invitation-info" aria-live="polite"></p><small class="invitation-note">可以繼續走，想去再進入</small><button class="invitation-enter primary">🚪 進入</button>';stage.append(invitation);
 function hideOffer(){offer=null;invitation.hidden=true;}
 function offerDestination(id,nearby=false){const d=DESTINATIONS.find(d=>d.id===id);if(!d||api.scene()?.area!=='island'||api.blocked()||nearby&&offer&&!offer.nearby)return;offer={id,nearby};invitation.hidden=false;invitation.dataset.destination=id;invitation.querySelector('strong').textContent=d.icon+' '+d.name;
  const z=d.zone&&zoneById(d.zone),level=api.state().expedition.level;let info=z?`建議 Lv.${z.level}–${z.maxLevel}　你是 Lv.${level}`:d.kind==='shop'?destinationOpen(api.state(),id)?'店門開著，歡迎來逛逛！':`首次開放 ✦ ${d.price} 星幣`:d.kind==='visits'?'搭船拜訪同班同學；島主不在也能參觀。':'沿著小路，回到星光林地。';
  if(z&&level+2<z.level)info+='　⚠ 敵人很強；不點怪就能安心散步。';invitation.querySelector('p').textContent=info;const enter=invitation.querySelector('.invitation-enter');enter.disabled=!d.ready;enter.textContent=d.kind==='route'?'🌲 前往':d.kind==='visits'?'⛵ 搭船':'🚪 進入';enter.setAttribute('aria-label','進入'+d.name);
 }
 invitation.querySelector('.invitation-close').onclick=hideOffer;invitation.querySelector('.invitation-enter').onclick=()=>{if(!offer||api.blocked())return;const id=offer.id;hideOffer();api.enter(id);};
 function button(id,label,icon,action){const b=document.createElement('button');b.id=id;b.className='exploration-pin';b.setAttribute('aria-label',label);b.innerHTML=icon;b.hidden=true;b.onclick=()=>{if(!api.blocked())action();};stage.append(b);buttons.push(b);return b;}
 const back=button('grove-return','走到路口回暖陽村','🏡 <small>回暖陽村</small>',()=>api.enter('village'));
 const onward=button('grove-world','走到森林盡頭前往探險島地圖','🗺️ <small>探險島地圖</small>',()=>api.enter('island'));
 const nodes=DESTINATIONS.map(d=>button('world-'+d.id,d.name,`${d.icon}<small>${d.name}</small>`,()=>offerDestination(d.id)));
 const enemies=Array.from({length:3},(_,i)=>button('encounter-'+i,'森林小怪','',()=>api.battle(api.scene().encounters[i])));
 const harbor=document.createElement('dialog');harbor.id='island-harbor';harbor.setAttribute('aria-label','搭船拜訪注音島');harbor.innerHTML='<button class="close" aria-label="離開碼頭">✕</button><div class="harbor-boat">⛵</div><h2>搭船拜訪注音島</h2><p>航線準備中</p><p class="muted">之後從這裡出發，拜訪班上朋友的小屋。</p><button class="quiet" id="harbor-back">↩ 回島上</button>';document.body.append(harbor);harbor.querySelectorAll('button').forEach(b=>b.onclick=()=>harbor.close());
 function showHarbor(){hideOffer();api.stop();void api.visits();}
 function pin(b,p,visible,edge=false){const s=api.scene(),at=s.toScreen(p.x,p.y);const w=s.width,h=s.height;b.hidden=!visible||api.blocked()||!edge&&(at.x<45||at.x>w-45||at.y<150||at.y>h-100);if(b.hidden)return;b.style.left=(edge?Math.max(60,Math.min(w-60,at.x)):at.x)+'px';b.style.top=(edge?Math.max(235,Math.min(h-145,at.y)):at.y)+'px';b.dataset.offscreen=String(edge&&(at.x<50||at.x>w-50||at.y<220||at.y>h-140));}
 function position(){const s=api.scene();if(!s)return;if(stage.scrollLeft||stage.scrollTop){stage.scrollLeft=0;stage.scrollTop=0;}if(offer){const d=DESTINATIONS.find(d=>d.id===offer.id);if(s.area!=='island'||api.blocked()||offer.nearby&&Math.hypot(s.player.x-d.entry.x,s.player.y-d.entry.y)>160)hideOffer();}pin(back,GROVE_ENTRY,s.area==='grove',true);pin(onward,GROVE_EXIT,s.area==='grove',true);DESTINATIONS.forEach((d,i)=>{pin(nodes[i],{x:d.x,y:d.y+22},s.area==='island');const locked=d.kind==='shop'&&!destinationOpen(api.state(),d.id);nodes[i].dataset.locked=String(locked);const html=`${d.icon}<small>${d.name}${locked?` · 🔒 ${d.price}`:d.ready?'':' · ⋯'}</small>`;if(nodes[i].dataset.label!==html){nodes[i].dataset.label=html;nodes[i].innerHTML=html;}});
  enemies.forEach((b,i)=>{const m=s.encounters?.[i];if(!m){b.hidden=true;return;}const p=s.toScreen(m.x,m.y);pin(b,{x:m.x,y:m.y-118},s.area==='grove'&&m.visible&&p.x>50&&p.x<s.width-50&&p.y>240&&p.y<s.height-60);const label='挑戰'+m.name;if(b.getAttribute('aria-label')!==label){b.setAttribute('aria-label',label);b.innerHTML=modeIcon(m.mode)+' <small>挑戰</small>';}});
 }
 return {position,offerDestination,hideOffer,openDestination:id=>{const d=DESTINATIONS.find(d=>d.id===id);if(d?.kind==='shop')api.shop(id);else if(d?.kind==='adventure')api.expedition(d.zone,{approved:true});else if(d?.kind==='visits')showHarbor();},close:()=>{hideOffer();harbor.close();},get busy(){return harbor.open;}};
}
