// Access is confirmed by the server; this module never contains the pilot roster.
import {currentClass,classStorageKey,classUrl} from './class-context.js';
if(currentClass==='main'&&new URL(location.href).searchParams.get('demo')!=='1'){
 const key=classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live');
 let observed='',allowed=false,generation=0,queued=false;
 function read(){try{const s=JSON.parse(sessionStorage.getItem(key)||'null');return s?.expires>Date.now()&&typeof s.token==='string'?s:null;}catch{return null;}}
 function paint(){const home=document.getElementById('home');let entry=document.getElementById('annual-challenge-entry');if(!home||!allowed){entry?.remove();return;}if(entry)return;entry=document.createElement('a');entry.id='annual-challenge-entry';entry.className='forest-game-link';entry.href=classUrl('annual-challenge.html?class=main');entry.textContent='🏝️ 注音闖關預演　收集五個印章 ▶';const forest=document.getElementById('forest-game-section');if(forest)forest.before(entry);else home.append(entry);}
 async function check(force=false){const s=read(),identity=s?s.seat+':'+s.token:'';if(!force&&identity===observed){paint();return;}observed=identity;allowed=false;paint();const epoch=++generation;if(!s)return;try{const r=await fetch('https://zhuyin-api.j822925.workers.dev/annual/api/card',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({classId:'main',year:2026,seat:s.seat}),cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)return;const card=await r.json();if(epoch!==generation)return;allowed=card.event?.enabled===true&&card.mode==='rehearsal';paint();}catch{}}
 const queue=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;void check();});};
 const app=document.getElementById('app');if(app)new MutationObserver(queue).observe(app,{childList:true,subtree:true});
 window.addEventListener('pageshow',()=>void check(true));window.addEventListener('focus',()=>void check(true));queue();
}
