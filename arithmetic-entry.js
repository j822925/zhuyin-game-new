import {classUrl,currentClass,classStorageKey} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
const demo=new URLSearchParams(location.search).get('demo')==='1';
let storage;try{storage=sessionStorage;}catch{}
const sessions=createStudentSession({storage,key:classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live')});
let checked='',permitted=demo,pending=false;
function attach(){const worlds=document.querySelector('#home .worlds');if(!worlds)return;let link=document.getElementById('arithmetic-island-entry');const session=sessions.read(),key=demo?'demo':session?.seat+':'+session?.token;
 if(!demo&&checked!==key){if(pending)return;permitted=false;link?.remove();checked=key;if(!session)return;pending=true;const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);fetch('https://zhuyin-api.j822925.workers.dev/arithmetic/access',{method:'POST',credentials:'omit',cache:'no-store',signal:ctl.signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.token},body:JSON.stringify({classId:currentClass})}).then(async r=>{const data=await r.json();if(sessions.read()?.token===session.token)permitted=r.ok&&data.available===true;}).catch(()=>{}).finally(()=>{clearTimeout(timer);pending=false;attach();});return;}
 if(!permitted){link?.remove();return;}if(link)return;
 link=document.createElement('a');link.id='arithmetic-island-entry';link.className='world';link.href=classUrl('arithmetic.html'+(demo?'?demo=1':''));link.style.cssText='display:block;text-decoration:none;color:#244b41;border:1px solid #d5dcc8;border-radius:24px;padding:24px;background:#eef2df';link.innerHTML='<div aria-hidden="true" style="font:bold 52px system-ui;color:#b77a30">＋ －</div><small>數學學習</small><h3>加減法挑戰</h3><p>想一想、算一算，和夥伴一起打怪。</p><span class="world-status">前往數字探險谷 →</span>';worlds.append(link);
}
function trial(){const grid=document.querySelector('#teacher-testing-hub .teacher-test-grid');if(!demo||!grid||grid.querySelector('[data-math-trial]'))return;const a=document.createElement('a');a.dataset.mathTrial='1';a.href=classUrl('arithmetic.html?demo=1');a.innerHTML='<b>＋ 加減法挑戰</b><span>選難度、計算打怪，教師設定試玩。</span>';grid.append(a);}
function refresh(){attach();trial();}refresh();const app=document.getElementById('app');if(app)new MutationObserver(refresh).observe(app,{childList:true,subtree:true});window.addEventListener('pageshow',refresh);
