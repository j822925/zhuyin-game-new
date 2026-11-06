// Both annual doors stay visible. Only the server decides who may use each mode.
import {currentClass,classStorageKey,classUrl} from './class-context.js';
if(currentClass==='main'&&new URL(location.href).searchParams.get('demo')!=='1'){
 const key=classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live');
 let observed='',availability=null,generation=0,queued=false,checking=false;
 function read(){try{const s=JSON.parse(sessionStorage.getItem(key)||'null');return s?.expires>Date.now()&&typeof s.token==='string'?s:null;}catch{return null;}}
 function label(mode){if(!read())return '登入後查看開放狀態';if(!availability)return checking?'確認開放狀態…':'進入查看開放狀態';const access=availability[mode];return !access?.allowed?'老師尚未開放給你':access.enabled?'已開放・出發吧！':'等待老師開放';}
 function paint(){
  const home=document.getElementById('home');if(!home)return;
  if(!document.getElementById('annual-portal-style')){
   const style=document.createElement('style');style.id='annual-portal-style';style.textContent='.annual-portal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0;clear:both}.annual-portal{display:flex;align-items:center;gap:12px;min-width:0;min-height:100px;padding:10px 16px;border:3px solid #b6c995;border-radius:24px;background:linear-gradient(135deg,#fffdf2,#e6f2db);box-shadow:0 4px 0 #c4d7ad;color:#365b45;text-decoration:none;text-align:left;transition:transform .15s}.annual-portal.official{border-color:#e0bc75;background:linear-gradient(135deg,#fffdf1,#fff0ca);box-shadow:0 4px 0 #e8d19f;color:#77582e}.annual-portal:hover{transform:translateY(-2px)}.annual-portal:focus-visible{outline:4px solid #378d80;outline-offset:3px}.annual-portal>img{width:68px;height:68px;object-fit:contain;flex:none}.annual-portal-copy{display:flex;min-width:0;flex-direction:column;gap:4px}.annual-portal strong{font-size:21px;line-height:1.25}.annual-portal small{font-size:13px;line-height:1.35}.annual-portal-status{font-weight:700;color:#557a50}.official .annual-portal-status{color:#916b29}.annual-portal-arrow{font-size:21px;margin-left:auto}@media(max-width:600px){.annual-portal-grid{gap:8px}.annual-portal{gap:6px;padding:9px 7px;border-radius:18px;min-height:96px}.annual-portal>img{width:45px;height:45px}.annual-portal strong{font-size:17px}.annual-portal small{font-size:11px}.annual-portal-arrow{display:none}}';document.head.append(style);
  }
  const state=JSON.stringify([label('rehearsal'),label('official')]);let entry=document.getElementById('annual-challenge-entry');
  if(entry?.dataset.state===state)return;
  if(!entry){entry=document.createElement('section');entry.id='annual-challenge-entry';entry.className='annual-portal-grid';entry.setAttribute('aria-label','一年一度注音闖關');const forest=document.getElementById('forest-game-section');if(forest)forest.before(entry);else home.append(entry);}
  entry.dataset.state=state;
  entry.innerHTML=[['rehearsal','闖關預演','練一練，準備出發','listen-owl'],['official','正式闖關','收集五關專屬印章','read-cat']].map(([mode,title,subtitle,animal])=>'<a class="annual-portal '+mode+'" href="'+classUrl('annual-challenge.html?class=main&mode='+mode)+'"><img src="assets/annual-challenge-20261103/'+animal+'.webp" alt="" loading="lazy" width="68" height="68"><span class="annual-portal-copy"><strong>'+title+'</strong><small>'+subtitle+'</small><small class="annual-portal-status">'+label(mode)+'</small></span><span class="annual-portal-arrow" aria-hidden="true">➜</span></a>').join('');
 }
 async function check(force=false){
  const s=read(),identity=s?s.seat+':'+s.token:'';
  if(!force&&identity===observed){paint();return;}
  observed=identity;availability=null;const epoch=++generation;checking=!!s;paint();if(!s)return;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const r=await fetch('https://zhuyin-api.j822925.workers.dev/annual/api/availability',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({classId:'main',year:2026}),cache:'no-store',signal:controller.signal});if(!r.ok)return;const own=await r.json();if(epoch!==generation)return;availability=own;}
  catch{}finally{clearTimeout(timer);if(epoch===generation){checking=false;paint();}}
 }
 const queue=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;void check();});};
 const app=document.getElementById('app');if(app)new MutationObserver(queue).observe(app,{childList:true,subtree:true});
 window.addEventListener('pageshow',()=>void check(true));window.addEventListener('focus',()=>void check(true));queue();
}
