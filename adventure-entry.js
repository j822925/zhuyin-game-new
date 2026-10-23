import {connectForestStudent} from './adventure-student.js';
import {createForestAccess} from './adventure-access.js';
import {resolveApiEndpoint} from './api-endpoint.js';
const classId=new URL(location.href).searchParams.get('class')||'main';
let barrier=null;
function blocked(reason){
 if(!barrier){barrier=document.createElement('dialog');barrier.setAttribute('aria-label','池東注音探險島入口');document.body.append(barrier);}
 barrier.replaceChildren();const title=document.createElement('h2'),home=document.createElement('a'),retry=document.createElement('button');
 title.textContent=reason==='closed'?'🌳 老師暫時關閉池東注音探險島':reason==='login'?'🔒 請先回首頁登入':'🌳 連線還沒準備好';
 const url=new URL('./index.html',location.href);url.searchParams.set('class',classId);home.href=url.href;home.textContent='🏠 回學習廣場';
 retry.type='button';retry.textContent='再試一次';retry.onclick=()=>location.reload();barrier.append(title,home,document.createTextNode('　'),retry);
 barrier.oncancel=e=>e.preventDefault();if(!barrier.open)barrier.showModal();document.dispatchEvent(new Event('adventure-ui-blocked'));
}
const gate=createForestAccess({classId,onBlocked:blocked,endpoint:resolveApiEndpoint('https://zhuyin-api.j822925.workers.dev/api')});
// Shared by battle entry points; never called for individual answers.
globalThis.ForestAccess=gate;
if(await gate.check()){try{globalThis.ForestStudent=await connectForestStudent({classId,blocked});if(globalThis.ForestStudent)await import('./adventure-play.bundle.js?v=20261023-zonemusic1');}catch(e){blocked(e.message==='forest_closed'?'closed':e.message==='authentication_required'?'login':'offline');}}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden||document.querySelector('#expedition[open],.in-battle'))return;
 void gate.check();
});
