import {createStudentSession} from './student-session.js';
import {createApiClient} from './api-client.js';
import {freshState} from './adventure-model.js';
import {openForestSync,forestSaveKey} from './adventure-sync.js';
export async function connectForestStudent({classId='main',blocked}={}){
 const suffix=classId==='main'?'':':class:'+classId,key='zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live'+suffix;
 const auth=createStudentSession({storage:sessionStorage,key}),session=auth.read();if(!session){blocked('login');return null;}
 const api=createApiClient('https://zhuyin-api.j822925.workers.dev/api'),saveKey=forestSaveKey(classId,session.seat);
 let dialog=null,store,statusTimer;
 const savingNote=document.createElement('div');savingNote.id='forest-saving-note';savingNote.setAttribute('role','status');savingNote.hidden=true;savingNote.style.cssText='position:fixed;z-index:10000;top:86px;left:50%;transform:translateX(-50%);padding:7px 15px;border:1px solid #c7b48b;border-radius:18px;background:#fff9e9ed;color:#486044;font-size:13px;pointer-events:none';document.body.append(savingNote);
 let inputLocks=[];
 function releaseInputs(){for(const [node,inert]of inputLocks)node.inert=inert;inputLocks=[];}
 function status(kind,error){
  clearTimeout(statusTimer);
  if(kind==='saving'){
   dialog?.close();savingNote.textContent='☁ 保存中';savingNote.hidden=false;
   // Preserve the former modal's brief input lock so pending purchases cannot race.
   if(!inputLocks.length)for(const node of document.body.children){if(node===savingNote||node===dialog||['SCRIPT','STYLE','LINK'].includes(node.tagName))continue;inputLocks.push([node,node.inert]);node.inert=true;}
   return;
  }
  releaseInputs();
  if(kind==='saved'){dialog?.close();const note=document.getElementById('save-note');if(note)note.textContent='☁ 已儲存';savingNote.textContent='☁ 已保存';savingNote.hidden=false;statusTimer=setTimeout(()=>savingNote.hidden=true,1400);return;}
  savingNote.hidden=true;
  if(!dialog){dialog=document.createElement('dialog');dialog.id='forest-save-status';dialog.setAttribute('aria-label','保存森林進度');dialog.oncancel=e=>e.preventDefault();document.body.append(dialog);}
  dialog.replaceChildren();const h=document.createElement('h2');h.textContent=kind==='saving'?'☁ 正在保存…':'📶 進度尚未確認保存';dialog.append(h);
  if(kind==='error'){
   const retry=document.createElement('button');retry.textContent='重新儲存';retry.onclick=()=>void store.flush();dialog.append(retry);
   if(['forest_conflict','insufficient_stars','authentication_required'].includes(error)){retry.hidden=true;const p=document.createElement('p');p.textContent=error==='authentication_required'?'請回首頁重新登入，再回來保存。':'另一個分頁的進度或星星已更新。重新載入雲端版本前，這次尚未保存的操作會取消。';const back=document.createElement('button');back.textContent='回首頁';back.onclick=()=>{if(error!=='authentication_required'&&!confirm('取消這次尚未保存的森林操作，重新載入雲端進度？'))return;if(error!=='authentication_required')localStorage.removeItem(saveKey);location.href=new URL('index.html?class='+classId,location.href).href;};dialog.append(p,back);}
  }
  if(!dialog.open)dialog.showModal();
 }
 const sendVisit=async data=>{
  const current=auth.read();if(current?.seat!==session.seat)throw Error('authentication_required');
  const result=await api.post({...data,seat:session.seat,token:current.token});if(result.error)throw Error(result.error);return result;
 };
 const giftKey=saveKey+':gift-operation';
 const giftRejected=e=>['gift_protected','gift_quantity','gift_owned','gift_mail_full','gift_claimed','gift_unavailable','visit_closed','visit_unavailable','invalid_payload','forest_closed','writes_disabled','forest_conflict','id_conflict'].includes(e.message);
 // A confirmed gift survives an interrupted response. Resolve it before reading a save.
 const recovery=localStorage.getItem(giftKey);
 if(recovery){try{await sendVisit(JSON.parse(recovery));localStorage.removeItem(saveKey);}catch(e){if(!giftRejected(e))throw e;}localStorage.removeItem(giftKey);}
 try{store=await openForestSync({key:saveKey,storage:localStorage,fresh:freshState,onStatus:status,onBalance:stars=>window.dispatchEvent(new CustomEvent('forest-wallet',{detail:{stars}})),send:async data=>{
  const current=auth.read();if(current?.seat!==session.seat)throw Error('authentication_required');return api.post({...data,seat:session.seat,token:current.token});
 }});}catch(e){if(['forest_conflict','insufficient_stars','authentication_required'].includes(e.message)){status('error',e.message);return null;}throw e;}
 store.seat=session.seat;store.classId=classId;
 store.visitRequest=sendVisit;
 store.visitTransfer=async payload=>{
  let operation=localStorage.getItem(giftKey);
  if(!operation){if(!await store.flush())throw Error('pending_save');operation=JSON.stringify({...payload,operationId:crypto.randomUUID(),revision:store.revision});localStorage.setItem(giftKey,operation);}
  try{const result=await sendVisit(JSON.parse(operation));const next=store.adopt(result);localStorage.removeItem(giftKey);return next;}
  catch(e){if(giftRejected(e))localStorage.removeItem(giftKey);throw e;}
 };
 store.getPendingGift=()=>!!localStorage.getItem(giftKey);
 const home=document.getElementById('forest-home');if(home)home.href=new URL('index.html?class='+classId,location.href).href;
 const note=document.querySelector('.trail-footnote');if(note)note.textContent='星星與星幣共用；買過的入口只付一次。';
 const mission=document.querySelector('#mission-battle span');if(mission)mission.textContent='練習注音，獲得經驗與星星';
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 // iPad may suspend a background page. Try to flush now; the local journal remains
 // the recovery source if the operating system stops the request before its reply.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void store.flush();});
 window.addEventListener('pagehide',()=>void store.flush());
 // Explicit exits wait for the same durable operation; no sendBeacon with credentials.
 document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a||a.target==='_blank'||a.dataset.forestLeaving||a.getAttribute('href').startsWith('#'))return;const url=new URL(a.href);if(url.origin!==location.origin)return;e.preventDefault();void store.flush().then(ok=>{if(ok)location.assign(url.href);});},true);
 return store;
}
