import {classStorageKey} from './class-context.js?v=20260926-classes1';
import {createStudentSession} from './student-session.js?v=20260920-login1';
// PINs never enter storage, URLs or score payloads. Primary sessions survive same-tab navigation.
export function loginFeedback(code,retryAfter){
 if(code==='invalid_pin')return {icon:'🔁 🔒',label:'密碼不正確，請再試一次'};
 if(code==='locked'){const seconds=Math.min(300,Math.max(1,Math.ceil(Number(retryAfter)||300)));return {icon:'⏳ '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'),label:'暫時鎖定，請等 '+seconds+' 秒後再試，或請老師協助'};}
 if(code==='request_timeout')return {icon:'📶 ⏳',label:'連線等候逾時，尚未確認密碼；請稍後再試'};
 if(['network_error','http_error','invalid_response'].includes(code))return {icon:'📶 ⚠',label:'無法連線驗證，並非密碼錯誤；請老師確認網路與後台'};
 return {icon:'🛠 ⚠',label:'後台驗證發生錯誤，並非密碼錯誤；請找老師協助'};
}
export function createStudentAuth({demo,getConfig,post}){
 const sessions=new Map();let busy=false,active=null,buffer='',resolvePrompt=null;
 let storage;try{storage=sessionStorage;}catch{}
 const tab=createStudentSession({storage,key:classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':'+(demo?'demo':'live'))});
 const restored=tab.read();let primary=restored?.seat||'';if(restored)sessions.set(primary,{token:restored.token,expires:restored.expires});
 // Back/forward cache must not revive a previous student's in-memory login after switching.
 window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
 function forget(seat){sessions.delete(seat);if(primary===seat){primary='';tab.clear();}}
 const dialog=document.createElement('dialog');dialog.id='pin-dialog';dialog.innerHTML='<div class="pin-top"><strong id="pin-seat"></strong><button type="button" id="pin-cancel" class="icon-button" aria-label="取消登入">✕</button></div><div class="pin-lock" aria-hidden="true">🔒</div><output id="pin-dots" aria-label="已輸入零位密碼">○ ○ ○ ○</output><p id="pin-status" role="status"></p><div class="pin-pad">'+[1,2,3,4,5,6,7,8,9,'clear',0,'back'].map(n=>`<button type="button" data-pin="${n}" aria-label="${n==='clear'?'全部清除':n==='back'?'刪除一位':n}">${n==='clear'?'↺':n==='back'?'⌫':n}</button>`).join('')+'</div>';
 document.body.append(dialog);
 const $=id=>document.getElementById(id);
 function showFailure(code,retryAfter){const message=loginFeedback(code,retryAfter);$('pin-status').textContent=message.icon;$('pin-status').setAttribute('aria-label',message.label);$('pin-status').setAttribute('title',message.label);}
 function display(){ $('pin-dots').textContent=Array.from({length:4},(_,i)=>i<buffer.length?'●':'○').join(' ');$('pin-dots').setAttribute('aria-label','已輸入 '+buffer.length+' 位密碼');dialog.querySelectorAll('[data-pin]').forEach(b=>b.disabled=busy);$('pin-cancel').disabled=busy;}
 function finish(ok){buffer='';active=null;dialog.close();const resolve=resolvePrompt;resolvePrompt=null;resolve?.(ok);}
 async function submit(){
  if(busy||buffer.length!==4)return;busy=true;display();$('pin-status').textContent='…';$('pin-status').setAttribute('aria-label','正在連線驗證，請稍候');$('pin-status').removeAttribute('title');
  try{
   let out;
   if(demo){
    let pins={},fail={};try{pins=JSON.parse(localStorage.getItem('zhuyin.demo.pins.v1')||'{}');fail=JSON.parse(sessionStorage.getItem('zhuyin.demo.pin-fails.'+active)||'{}');}catch{}
    if(fail.until>Date.now())out={ok:false,error:'locked'};
    else if(buffer===(pins[active]||'1234')){out={ok:true,token:'demo-'+active,expires:Date.now()+7200000};sessionStorage.removeItem('zhuyin.demo.pin-fails.'+active);}
    else{const count=(fail.until?0:fail.count||0)+1;sessionStorage.setItem('zhuyin.demo.pin-fails.'+active,JSON.stringify({count,until:count>=5?Date.now()+300000:0}));out={ok:false,error:count>=5?'locked':'invalid_pin'};}
   }else out=await post({kind:'login',seat:active,pin:buffer});
   buffer='';if(out?.ok===true&&typeof out.token==='string'&&out.token&&Number.isFinite(out.expires)&&out.expires>Date.now()){sessions.set(active,{token:out.token,expires:out.expires});finish(true);}
   else showFailure(out?.error,out?.retryAfter);
  }catch(error){buffer='';showFailure(error.message);}
  finally{busy=false;display();}
 }
 function key(value){if(busy)return;if(value==='clear')buffer='';else if(value==='back')buffer=buffer.slice(0,-1);else if(/^\d$/.test(value)&&buffer.length<4)buffer+=value;display();if(buffer.length===4)submit();}
 dialog.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>key(b.dataset.pin));$('pin-cancel').onclick=()=>finish(false);
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)finish(false);});
 dialog.addEventListener('keydown',e=>{if(/^\d$/.test(e.key)){e.preventDefault();key(e.key);}else if(e.key==='Backspace'){e.preventDefault();key('back');}});
 function verified(seat){const s=sessions.get(seat);if(s&&s.expires>Date.now())return true;if(s)forget(seat);return false;}
 return {
  verified,
  forget,
  forgetAll(){sessions.clear();primary='';tab.clear();},
  currentSeat(){return verified(primary)?primary:'';},
  setPrimary(seat){if(!verified(seat))return false;primary=seat;tab.save({seat,...sessions.get(seat)});return true;},
  async ensure(seat){if(!seat)return false;if(verified(seat))return true;if(active)return false;
   if(!demo&&!getConfig()?.authRequired){document.getElementById('home-message').textContent='請老師先部署密碼後台，才能登入。';return false;}
   active=seat;buffer='';$('pin-seat').textContent='🔢 '+seat+' 號・輸入密碼';$('pin-status').textContent='';$('pin-status').removeAttribute('aria-label');$('pin-status').removeAttribute('title');display();dialog.showModal();return new Promise(resolve=>resolvePrompt=resolve);
  },
  decorate(payload){
   const list=payload.kind==='race'?payload.seats:payload.competition?.seats;
   const seats=list||[payload.seat];for(const seat of seats)if(!verified(seat))throw new Error('authentication_required');
   return list?{...payload,authTokens:Object.fromEntries(seats.map(s=>[s,sessions.get(s).token]))}:{...payload,token:sessions.get(payload.seat).token};
  },
  async request(payload){const out=await post(this.decorate(payload));if(out.error==='authentication_required'){for(const seat of payload.seats||payload.competition?.seats||[payload.seat])forget(seat);throw new Error(out.error);}return out;}
 };
}
