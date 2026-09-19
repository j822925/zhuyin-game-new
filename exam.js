import {createApiClient} from './api-client.js?v=20260913-tutor1';
import {createStudentAuth} from './student-auth.js?v=20260913-tutor1';
const $=id=>document.getElementById(id),client=createApiClient('https://zhuyin-api.j822925.workers.dev/api');
let config=null,seat='',examId=new URLSearchParams(location.search).get('id')||'',state=null,busy=false,heard=false,selection={},offset=0,expiryTried=false,renderVersion=0;
const pendingMemory=new Map();
const auth=createStudentAuth({demo:false,getConfig:()=>config,post:d=>client.post(d)}),audio=new Audio();audio.preload='auto';
const messages={exam_closed:'目前不是這場小考的作答時間。',exam_unavailable:'這場小考不存在或已取消。',exam_not_started:'尚未開始這場小考。',exam_sequence:'進度已更新，請按恢復進度。',id_conflict:'這一題已送出，不能改答案。請按恢復進度。',authentication_required:'請重新驗證密碼，再接續小考。'};
const key=()=>`zhuyin.exam.pending.${examId}.${seat}`;
function readPending(){try{const p=pendingMemory.has(key())?pendingMemory.get(key()):JSON.parse(localStorage.getItem(key()));return p?.kind==='exam-answer'&&p.examId===examId&&p.seat===seat&&Number.isInteger(p.index)&&typeof p.answer==='string'?p:null;}catch{return null;}}
function savePending(p){pendingMemory.set(key(),p);try{localStorage.setItem(key(),JSON.stringify(p));}catch{}}
function clearPending(){pendingMemory.delete(key());try{localStorage.removeItem(key());}catch{}}
async function request(d){const out=await auth.request({...d,seat,examId});if(out.error)throw Error(out.error);return out;}
async function run(fn){if(busy)return;busy=true;$('submit').disabled=true;$('start').disabled=true;$('recover').disabled=true;$('home-message').textContent='正在保存／讀取，請稍候…';try{await fn();$('home-message').textContent='';$('recover').hidden=true;}catch(e){$('home-message').textContent=messages[e.message]||'連線尚未確認，請按「恢復進度」。不要重新開始或換座號，尚未送達的答案須在結束前恢復連線。';$('recover').hidden=false;}finally{busy=false;$('recover').disabled=false;$('start').disabled=!config;enable();}}
function enable(){const enabled=heard&&!busy&&!readPending()&&state&&!state.finished&&Date.now()+offset<state.exam.ends;document.querySelectorAll('[data-choice]').forEach(b=>b.disabled=!enabled);$('submit').disabled=!enabled||!(state.exam.mode==='single'?selection.answer:selection.initial&&selection.final);}
async function listen(){if(!state?.question)return;const version=renderVersion;try{audio.currentTime=0;await audio.play();if(version!==renderVersion)return;heard=true;$('audio-status').textContent='聽清楚再選，還可以再聽一次。';enable();}catch{if(version===renderVersion)$('audio-status').textContent='請按喇叭播放聲音，確認音量與網路。';}}
function choose(kind,value,button){selection[kind]=value;for(const b of document.querySelectorAll(`[data-choice="${kind}"]`))b.classList.toggle('selected',b===button);if(kind!=='answer')$(kind+'-slot').textContent=value;enable();}
function buttons(id,values,kind){$(id).replaceChildren();for(const value of values){const b=document.createElement('button');b.type='button';b.textContent=value;b.dataset.choice=kind;b.setAttribute('aria-label',value);b.onclick=()=>choose(kind,value,b);$(id).append(b);}}
function render(out){renderVersion++;state=out;offset=out.serverNow-Date.now();expiryTried=false;audio.pause();heard=false;selection={};$('login-area').hidden=true;$('result').hidden=!out.finished;$('question-area').hidden=!!out.finished;
 if(out.finished){clearPending();$('score').textContent=`答對 ${out.correct}／25 題，${out.correct*4} 分${out.unanswered?`；${out.unanswered} 題未作答`:''}。`;$('stars').textContent=`⭐ 獲得 ${out.stars} 顆星星（本場只發一次，不另加練習獎勵）。${out.starTicket?' 滿分星使資格已保留！角色與抽獎畫面準備中，完成後可領取。':''}`;$('clock').textContent='已交卷';return;}
 $('exam-title').textContent=out.exam.title;$('progress').textContent=`第 ${out.question.index+1}／25 題・已保存 ${out.answered} 題`;$('audio-status').textContent='請先聽題目';audio.src=out.question.audio;
 $('choices').hidden=out.exam.mode!=='single';$('spelling-area').hidden=out.exam.mode!=='spelling';
 if(out.exam.mode==='single')buttons('choices',out.question.choices,'answer');else{for(const kind of ['initial','final']){$(kind+'-slot').textContent='';buttons(kind+'-choices',out.question.choices[kind],kind);}$('tone').textContent=out.question.toneMark;}
 enable();listen();
}
async function resume(){if(!seat||!examId)return;if(!await auth.ensure(seat))return;const pending=readPending();if(pending){let out;try{out=await request(pending);}catch(e){if(!['id_conflict','exam_sequence'].includes(e.message))throw e;out=await request({kind:'exam-resume'});if(!out.finished&&out.answered<=pending.index)throw e;}clearPending();render(out);}else render(await request({kind:'exam-start'}));}
$('start').onclick=()=>{seat=$('seat').value;examId=$('exam-select').value;if(!seat||!examId){$('home-message').textContent='請選座號與小考。';return;}history.replaceState(null,'','?id='+encodeURIComponent(examId));run(resume);};
$('recover').onclick=()=>run(resume);$('listen').onclick=listen;
$('submit').onclick=()=>run(async()=>{const payload={kind:'exam-answer',seat,examId,index:state.question.index,answer:state.exam.mode==='single'?selection.answer:selection.initial+selection.final};savePending(payload);const out=await request(payload);clearPending();render(out);});
setInterval(()=>{if(!state||state.finished)return;const remaining=Math.max(0,state.exam.ends-Date.now()-offset);$('clock').textContent=`⏱ 剩下 ${Math.floor(remaining/60000)} 分 ${Math.floor(remaining%60000/1000)} 秒`;if(!remaining){enable();if(!busy&&!expiryTried){expiryTried=true;run(async()=>render(await request({kind:'exam-resume'})));}}},1000);
window.addEventListener('online',()=>{if(seat&&examId&&!busy)run(resume);});
async function load(){try{const [c,list]=await Promise.all([client.get({api:'config'}),client.get({api:'exams'})]);config=c;for(const s of c.seats)$('seat').append(new Option(s+' 號',s));for(const e of list.exams)$('exam-select').append(new Option(e.title+'（'+(e.mode==='spelling'?'拼音':'聽音')+'）',e.id));if(examId&&![...$('exam-select').options].some(o=>o.value===examId))$('exam-select').append(new Option('接續／查看原小考',examId));if(examId)$('exam-select').value=examId;$('start').disabled=false;if(!$('exam-select').options.length){$('home-message').textContent='目前沒有安排小考。';$('start').disabled=true;}}catch{$('home-message').textContent='無法讀取小考，請重新整理或確認網路。';}}
load();
