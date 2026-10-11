import {completeAction} from './adventure-action-feedback.js';
import {WALK_CATALOG} from './data/walk-catalog.js?v=walk-approved-v36';
import {companionById,companionReady,companionPrice,companionStatus,unlockCompanion,selectCompanion} from './adventure-companions-model.js?v=bear-forest-v37';
import {hasEnergy} from './adventure-food-model.js';
import {mediaUrl} from './media-url.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function createCompanions(api){
 const dialog=el('dialog');dialog.id='companion-dialog';dialog.setAttribute('aria-labelledby','companion-title');
 const head=el('header'),title=el('h2','小屋夥伴');title.id='companion-title';const balance=el('strong'),close=el('button','✕');close.setAttribute('aria-label','關閉小屋夥伴');
 head.append(title,balance,close);
 const hint=el('p','🃏 ＋ ✦ → 🚶　只解鎖一次'),grid=el('div');grid.className='companion-grid';
 const info=el('details'),infoTitle=el('summary','ⓘ'),infoText=el('p',!globalThis.ForestStudent&&api.trial?'本機試玩使用示範角色卡與試玩星幣，不變更學生收藏。正式規則：先有角色卡，再用星幣解鎖小屋使用權。':'先取得角色卡，再用星幣解鎖小屋使用權。');infoTitle.setAttribute('aria-label','角色解鎖說明');info.append(infoTitle,infoText);
 const status=el('p');status.id='companion-message';status.setAttribute('role','status');
 const confirm=el('section');confirm.className='companion-confirm';confirm.hidden=true;
 const chosen=el('strong'),buy=el('button'),cancel=el('button','↩');buy.id='companion-confirm';buy.className='primary';cancel.setAttribute('aria-label','取消解鎖');confirm.append(chosen,buy,cancel);
 dialog.append(head,hint,grid,info,status,confirm);document.body.append(dialog);
 let working=false,generation=0,pending=null,focus=null;
 const s=()=>api.state();
 const labels={preparing:'🌱 待確認','card-needed':'🃏 先集卡',insufficient:'✦ 星幣不足',unlocked:'✓ 已解鎖',available:'🔒'};
 function card(c){
  const state=companionStatus(s(),c.id,api.cards()),b=el('button'),img=el('img');b.type='button';b.dataset.companion=c.id;
  img.src=mediaUrl(c.image);img.alt='';img.loading='lazy';img.decoding='async';b.append(img,el('span',c.name));
  b.append(el('small',c.id===s().companions.active?'✓ 使用中':state==='available'?`🔒 ✦ ${companionPrice(c)}`:state==='insufficient'?`✦ ${companionPrice(c)}・不足`:labels[state]));
  b.setAttribute('aria-label',`${c.name}，${c.id===s().companions.active?'使用中':labels[state]}${c.id!=='rabbit'&&state!=='unlocked'?'，'+companionPrice(c)+' 星幣':''}`);
  b.disabled=working||!hasEnergy(s())||['preparing','card-needed','insufficient'].includes(state)||c.id===s().companions.active;
  b.onclick=()=>{if(state==='available'){pending=c.id;chosen.textContent=c.name;buy.textContent=`🔓 ✦ ${companionPrice(c)} ✓`;buy.setAttribute('aria-label',`確認花 ${companionPrice(c)} 星幣解鎖${c.name}`);confirm.hidden=false;status.textContent='';buy.focus();}else void choose(c.id);};return b;
 }
 function render(){
  balance.textContent=`✦ ${s().stars}`;grid.replaceChildren(...WALK_CATALOG.filter(companionReady).map(card));
  close.disabled=false;buy.disabled=working;cancel.disabled=false;dialog.setAttribute('aria-busy',String(working));
 }
 async function choose(id){
  if(working)return;const kind=companionStatus(s(),id,api.cards());if(!['available','unlocked'].includes(kind)||!hasEnergy(s()))return;
  const token=++generation,original=s();working=true;render();status.textContent='🚶 正在準備…';
  try{
   // Download/decode first. Failed assets and cancelled requests never cost stars.
   const walker=await api.prepare(id);
   if(token!==generation||!dialog.open||s()!==original)return;
   const snapshot={stars:original.stars,companions:{active:original.companions.active,unlocked:[...original.companions.unlocked]}};
   const current=companionStatus(original,id,api.cards());
   if(current==='available'&&!unlockCompanion(original,id,api.cards()))throw Error('eligibility');
   if(!selectCompanion(original,id,api.cards())){Object.assign(original,snapshot);throw Error('eligibility');}
   if(!api.save()){Object.assign(original,snapshot);throw Error('save');}
   api.apply(id,walker);api.changed();pending=null;confirm.hidden=true;dialog.close();completeAction('companion',{detail:companionById(id).name});
  }catch(error){if(token===generation){status.textContent=error.message==='save'?'無法儲存，星幣沒有扣除。':'夥伴暫時無法出發，星幣沒有扣除。';}}
  finally{if(token===generation){working=false;render();}}
 }
 buy.onclick=()=>{if(pending)void choose(pending);};cancel.onclick=()=>{generation++;working=false;pending=null;confirm.hidden=true;status.textContent='';render();};
 function hide(){generation++;working=false;pending=null;confirm.hidden=true;dialog.close();}
 close.onclick=hide;dialog.addEventListener('cancel',e=>{e.preventDefault();hide();});
 dialog.addEventListener('close',()=>{if(!dialog.open){focus?.focus();api.stop();}});
 return {get busy(){return dialog.open||working;},close:hide,open(){if(api.blocked()||!hasEnergy(s()))return;api.stop();focus=document.activeElement;status.textContent='';confirm.hidden=true;render();dialog.showModal();}};
}
