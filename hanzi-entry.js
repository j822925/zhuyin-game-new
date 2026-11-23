import {CHARACTERS,portrait} from './characters.js?v=20261123-starenvoys1';
import {currentClass} from './class-context.js?v=20261023-exam1';

// This is only the home-screen visibility rule. Every live /hanzi/ operation
// also checks the authenticated class and student on the server.
export const HANZI_PILOT_SEATS=Object.freeze(['115015','115016']);

export function canSeeHanziEntry({classId='main',demo=false,session,selectedSeat='',now=Date.now()}={}){
  if(demo===true)return true;
  return /^[a-z][a-z0-9]{1,20}$/.test(classId)&&!!session&&/^\d{6}$/.test(session.seat)
    &&selectedSeat===session.seat&&typeof session.token==='string'&&session.token.length>0
    &&session.token.length<8192&&Number.isFinite(session.expires)&&session.expires>now;
}

export function hanziEntrySessionKey(href,classId='main'){
  const key='zhuyin.student-session.v1:'+new URL('.',href).pathname+':live';
  return classId==='main'?key:key+':class:'+classId;
}

function readSession(storage,key){
  try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}
}

export function mountHanziEntry({root=globalThis.document,view=globalThis.window,href=view?.location?.href,classId=currentClass,storage,now=()=>Date.now()}={}){
  if(!root||!view||!href)return null;
  const source=new URL(href),demo=source.searchParams.get('demo')==='1',key=hanziEntrySessionKey(href,classId);
  const target=new URL('hanzi.html',source);
  if(classId!=='main'||source.searchParams.has('class'))target.searchParams.set('class',classId);
  if(demo)target.searchParams.set('demo','1');
  let stopped=false,queued=false,refreshTimer=null,expiryTimer=null,timerExpires=0;
  const state=()=>({classId,demo,session:readSession(storage,key),selectedSeat:root.getElementById('seat')?.value||'',now:now()});
  const permitted=()=>canSeeHanziEntry(state());

  function cancelExpiry(){if(expiryTimer!==null)view.clearTimeout(expiryTimer);expiryTimer=null;timerExpires=0;}
  function scheduleExpiry(session,allowed){
    if(demo||!allowed){cancelExpiry();return;}
    if(timerExpires===session.expires&&expiryTimer!==null)return;
    cancelExpiry();timerExpires=session.expires;
    // One expiry timer, not polling or an additional server request.
    expiryTimer=view.setTimeout(()=>{expiryTimer=null;timerExpires=0;refresh();},Math.min(2147483647,Math.max(1,session.expires-now()+1)));
  }
  function protectClick(event){
    if(permitted())return;
    event.preventDefault();event.stopImmediatePropagation();refresh();
  }
  function refresh(){
    if(stopped)return;
    const current=state(),allowed=canSeeHanziEntry(current),worlds=root.querySelector('#home .worlds');
    let link=root.getElementById('hanzi-island-entry');
    // Remove a denied entry; an inline display:block must not override hidden.
    if(!allowed||!worlds){link?.remove();link=null;}
    else if(!link){
      link=root.createElement('a');link.id='hanzi-island-entry';link.className='world forest';link.href=target.href;
      link.style.cssText='display:block;text-decoration:none;color:inherit';
      link.innerHTML='<h3 class="home-level-title">國字森林</h3><span class="world-art" aria-hidden="true">'+portrait(CHARACTERS.find(c=>c.id==='owl'))+'<i>日・月・山</i></span><span class="world-status">開始玩 →</span>';
      link.addEventListener('click',protectClick);link.addEventListener('auxclick',protectClick);worlds.append(link);
    }
    scheduleExpiry(current.session,allowed);
    const grid=root.querySelector('#teacher-testing-hub .teacher-test-grid'),trial=root.querySelector('[data-hanzi-trial]');
    if(!demo)trial?.remove();
    else if(grid&&!trial){
      const trialLink=root.createElement('a');trialLink.dataset.hanziTrial='1';trialLink.href=target.href;
      trialLink.innerHTML='<b>🌿 國字森林</b><span>看國字拼注音、看注音寫國字。試玩不記正式成績。</span>';grid.append(trialLink);
    }
  }
  function queueRefresh(){
    if(stopped||queued)return;queued=true;
    // Native events can checkpoint microtasks between capture and the app's
    // target handler. Check after that handler has cleared/saved the session.
    refreshTimer=view.setTimeout(()=>{refreshTimer=null;queued=false;refresh();},0);
  }
  function onChange(event){if(event.target?.id==='seat')queueRefresh();}
  function onClick(event){if(event.target?.closest?.('#change-student,#login-guide-seats'))queueRefresh();}
  function onClose(event){if(['pin-dialog','student-login-guide'].includes(event.target?.id))queueRefresh();}
  function onStorage(event){if(event.key===key||event.key===null)queueRefresh();}
  function onVisibility(){if(root.visibilityState!=='hidden')queueRefresh();}
  root.addEventListener('change',onChange,true);
  root.addEventListener('click',onClick,true);
  root.addEventListener('close',onClose,true);
  root.addEventListener('visibilitychange',onVisibility);
  view.addEventListener('storage',onStorage);
  view.addEventListener('pageshow',queueRefresh);
  view.addEventListener('focus',queueRefresh);
  const app=root.getElementById('app')||root.body;
  const observer=app&&view.MutationObserver?new view.MutationObserver(queueRefresh):null;
  observer?.observe(app,{childList:true,subtree:true});
  refresh();
  return {refresh,destroy(){
    stopped=true;cancelExpiry();observer?.disconnect();
    if(refreshTimer!==null)view.clearTimeout(refreshTimer);
    root.removeEventListener('change',onChange,true);root.removeEventListener('click',onClick,true);root.removeEventListener('close',onClose,true);
    root.removeEventListener('visibilitychange',onVisibility);view.removeEventListener('storage',onStorage);
    view.removeEventListener('pageshow',queueRefresh);view.removeEventListener('focus',queueRefresh);
    root.getElementById('hanzi-island-entry')?.remove();root.querySelector('[data-hanzi-trial]')?.remove();
  }};
}

if(typeof document!=='undefined'){
  let storage;try{storage=globalThis.sessionStorage;}catch{}
  mountHanziEntry({storage});
}
