import './asset-cache.js?v=20260928-all1';
import {audioSource} from './audio-source.js?v=20261020-bo1';
import {createApiClient} from './api-client.js?v=20260928-all1';
import {createStudentAuth} from './student-auth.js?v=20261009-accounts1';
import {classStorageKey,classUrl} from './class-context.js?v=20261023-exam1';
import {createToneInput} from './exam-tone-input.js?v=20261023-exam1';
import {readingNotebookLaunchPlan} from './notebook-launch.js?v=20261023-notebook1';
const $=id=>document.getElementById(id),client=createApiClient('https://zhuyin-api.j822925.workers.dev/api',{timeoutMs:15000}),readingPage=document.body.classList.contains('reading-page');
const names={single:'👂 聽音辨識',spelling:'🧩 拼音工坊',tone:'🎭 聲調劇場',reading:'🎙️ 朗讀錯題本'};
let config=null,seat='',question=null,selection={},heard=false,busy=false,pending=null,after='',afterMode='',mode=readingPage?'reading':'all',readingInput=null,view=0,audioEpoch=0;
const auth=createStudentAuth({demo:false,getConfig:()=>config,post:d=>client.post(d)}),audio=new Audio();audio.preload='auto';
const toneInput=createToneInput($('tone-input'),()=>enable());
const messages={authentication_required:'請再輸入密碼，就能接著複習。',review_changed:'這題有新的錯題紀錄，請按重新連線。',review_unavailable:'這題已更新，請按重新連線。'};
const pendingKey=()=>classStorageKey('notebook-pending-v1:'+seat);
function savePending(){try{if(pending)localStorage.setItem(pendingKey(),JSON.stringify(pending));else localStorage.removeItem(pendingKey());}catch{}}
function restorePending(){try{const p=JSON.parse(localStorage.getItem(pendingKey()));if(p?.kind==='notebook-answer'&&['single','spelling','tone','reading'].includes(p.mode)&&Number.isInteger(p.revision)&&typeof p.target==='string'&&typeof p.answer==='string')pending=p;}catch{}}
async function request(d){const out=await auth.request({...d,seat,notebookVersion:2});if(out.error)throw Error(out.error);return out;}
function stopAudio(){audioEpoch++;audio.pause();audio.removeAttribute('src');audio.load();}
function enable(){
 const ready=heard&&!busy&&!pending&&!!question;
 const complete=question?.mode==='single'?selection.answer!==undefined:question?.mode==='tone'?toneInput.complete():selection.initial!==undefined&&selection.final!==undefined;
 $('submit').disabled=!ready||!complete;document.querySelectorAll('[data-choice],.spelling-head button').forEach(b=>b.disabled=!ready);toneInput.setEnabled(ready);readingInput?.setEnabled(!document.hidden&&!busy&&!pending&&!!question&&question.mode==='reading'&&!$('practice').hidden);
 $('start').disabled=busy||!config;$('next').disabled=busy;$('listen').disabled=busy||!!pending;$('replay').disabled=busy;$('account').disabled=busy||!!pending;$('seat').disabled=busy||!!pending;document.querySelectorAll('[data-mode]').forEach(b=>{b.disabled=busy||!!pending;b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
}
async function run(fn){if(busy)return;busy=true;$('home-message').dataset.error='false';$('home-message').textContent='';enable();try{await fn();$('retry').hidden=true;}catch(e){$('home-message').dataset.error='true';$('home-message').textContent=messages[e.message]||'還沒連上網路，請按重新連線。';$('retry').hidden=false;if(['review_changed','review_unavailable'].includes(e.message)){pending=null;savePending();}}finally{busy=false;enable();}}
async function play(){if(document.hidden||!audio.getAttribute('src'))return;const epoch=++audioEpoch;let timer;try{audio.pause();audio.currentTime=0;await Promise.race([audio.play(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('audio_timeout')),8000);})]);if(epoch!==audioEpoch)return;heard=true;$('audio-status').textContent='';enable();}catch{if(epoch===audioEpoch){audio.pause();$('audio-status').textContent='請點喇叭再聽一次';}}finally{clearTimeout(timer);}}
function part(kind){for(const p of ['initial','final'])$(p+'-slot').dataset.active=String(p===kind);}
function options(id,values,kind){$(id).replaceChildren();for(const value of values){const b=document.createElement('button');b.type='button';b.textContent=value||'空白';b.dataset.choice=kind;b.onclick=()=>{selection[kind]=value;$(id).querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));if(kind!=='answer'){$(kind+'-slot').textContent=value||'空白';part(kind==='initial'&&selection.final===undefined?'final':kind);}enable();};$(id).append(b);}}
async function loadQuestion(){
 const render=++view;stopAudio();readingInput?.cancel();const out=await request({kind:'notebook-list',mode,after,afterMode});if(render!==view)return;
 question=out.question;heard=false;selection={};$('feedback').hidden=true;$('empty').hidden=!!question;$('practice').hidden=!question;if(!question)return;
 $('count').textContent='待複習 '+out.count+' 題';$('mode-label').textContent=names[question.mode];for(const [id,m] of [['choices','single'],['spelling','spelling'],['tone-input','tone'],['reading-input','reading']])$(id).hidden=question.mode!==m;
 $('submit').hidden=question.mode==='reading';$('listen').hidden=question.mode==='reading';$('audio-status').textContent='';
 if(question.mode==='single')options('choices',question.choices,'answer');
 else if(question.mode==='spelling'){for(const kind of ['initial','final']){$(kind+'-slot').textContent=kind==='initial'?'選聲符':'選韻符';options(kind+'-choices',question.choices[kind],kind);}part('initial');$('tone').textContent=question.toneMark;$('tone').parentElement.dataset.neutral=String(question.toneMark==='˙');}
 else if(question.mode==='tone')toneInput.show(question.text);
 else{
  if(!readingInput){const {createReadingExamInput}=await import('./exam-reading-input.js?v=20261023-readingexam1');if(render!==view)return;readingInput=createReadingExamInput($('reading-input'),answer=>submit(answer));}
  readingInput.show(question);heard=true;return;
 }
 audio.src=audioSource(question.audio);enable();await play();
}
async function sendPending(){const sent={...pending};const out=await request(sent);pending=null;savePending();after=sent.target;afterMode=sent.mode;stopAudio();readingInput?.cancel();question=null;$('practice').hidden=true;$('feedback').hidden=false;$('feedback-icon').textContent=out.correct?'🌟':'🌱';$('feedback-title').textContent=out.correct?'答對了！這題畢業囉！':'再練一次就更熟悉！';$('correct-answer').textContent=out.answer;$('replay').hidden=!out.audio;if(out.audio){audio.src=audioSource(out.audio);if(!out.correct)await play();}}
function submit(answer){if(busy||pending||!question)return;stopAudio();readingInput?.cancel();pending={kind:'notebook-answer',mode:question.mode,target:question.target,revision:question.revision,answer};savePending();run(sendPending);}
async function open(){const selected=$('seat').value;if(!selected)return;if(seat!==selected){auth.forgetAll();after='';afterMode='';pending=null;}seat=selected;if(!await auth.ensure(seat))return;auth.setPrimary(seat);$('account').textContent=seat+' · 換人';$('account').hidden=false;$('login-area').hidden=true;restorePending();if(pending)await sendPending();else await loadQuestion();}
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(busy||pending)return;mode=b.dataset.mode;after='';afterMode='';enable();if(seat&&$('login-area').hidden)run(loadQuestion);};
$('account').onclick=()=>{view++;stopAudio();readingInput?.cancel();question=null;$('login-area').hidden=false;$('practice').hidden=$('feedback').hidden=$('empty').hidden=true;enable();};
$('start').onclick=()=>run(open);$('listen').onclick=$('replay').onclick=play;$('next').onclick=()=>run(loadQuestion);$('initial-slot').onclick=()=>part('initial');$('final-slot').onclick=()=>part('final');
$('submit').onclick=()=>{if(!$('submit').disabled)submit(question.mode==='single'?selection.answer:question.mode==='tone'?toneInput.value():selection.initial+selection.final);};
$('retry').onclick=()=>run(async()=>{if(!config){await start();return;}if(!seat){await open();return;}if(!await auth.ensure(seat))return;auth.setPrimary(seat);if(pending)await sendPending();else await loadQuestion();});
window.addEventListener('pagehide',()=>{stopAudio();readingInput?.cancel();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();readingInput?.cancel();}else if(question?.mode==='reading'&&!pending&&!busy){readingInput?.show(question);enable();}});
const plan=readingNotebookLaunchPlan(location.href);$('home').href=classUrl('./');document.querySelector('#empty a').href=classUrl('./');
if(readingPage)document.querySelector('nav a').href=classUrl('notebook.html');
const readingLink=$('reading-link');if(readingLink){readingLink.href=plan.safariUrl||plan.browserUrl;if(plan.standalone&&!plan.safariUrl){readingLink.target='_blank';readingLink.rel='noopener';}}
async function start(){config=await client.get({api:'config'});if(!Array.isArray(config.seats))throw Error('config');$('seat').replaceChildren(new Option('選擇學號',''));for(const s of config.seats)$('seat').append(new Option(s,s));seat=auth.currentSeat();if(seat)$('seat').value=seat;enable();if(seat)await open();}
if(readingPage&&plan.standalone){
 $('login-area').hidden=true;const panel=document.createElement('section');panel.id='reading-handoff';panel.innerHTML='<h2>🎙️ 到 Safari 朗讀</h2><a>開啟朗讀錯題本 ↗</a><details><summary>沒有開啟？</summary><p>請複製網址到 Safari，再選原學號登入。</p><input readonly aria-label="朗讀錯題本網址"><button>複製網址</button><p role="status"></p></details>';
 panel.querySelector('a').href=plan.safariUrl||plan.browserUrl;if(!plan.safariUrl){panel.querySelector('a').target='_blank';panel.querySelector('a').rel='noopener';}panel.querySelector('input').value=plan.browserUrl;panel.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText(plan.browserUrl);panel.querySelector('[role=status]').textContent='已複製';}catch{panel.querySelector('input').select();panel.querySelector('[role=status]').textContent='請長按網址複製';}};document.querySelector('main').append(panel);
}else run(start);
