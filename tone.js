import {createToneRecorder} from './tone-record-client.js?v=20261009-backend2';
import {TONES,validateBank,poolFor,makeDeck,grade,summarize} from './tone-core.js?v=20261002-original1';
import {createToneAudio} from './tone-audio.js?v=20260930-v1';
import {classUrl,classStorageKey} from './class-context.js?v=20260928-all1';
import {createStudentAuth} from './student-auth.js?v=20261009-accounts1';
import {createApiClient} from './api-client.js?v=20260928-all1';
import {warmAudio} from './asset-cache.js?v=20260928-all1';
const $=id=>document.getElementById(id),demo=new URLSearchParams(location.search).get('demo')==='1';
const client=createApiClient('https://zhuyin-api.j822925.workers.dev/api');
let roundId='',startedAt=0;
let config,bank,seat='',mode='basic',length='all',deck=[],index=0,answers=[],results=[],active=0,busy=false,heard=false,submitted=false,reviewDone=false,epoch=0,starting=false;
const auth=createStudentAuth({demo,getConfig:()=>config,post:p=>client.post(p)}),audio=createToneAudio();
const recorder=createToneRecorder({demo,storage:sessionStorage,key:()=>classStorageKey('zhuyin.tone.pending.v1:'+new URL('.',location.href).pathname+':'+seat),send:p=>auth.request({...p,seat}),status:(message,retry)=>{$('save-status').textContent=message;$('save-retry').hidden=!retry;}});
$('save-retry').onclick=()=>recorder.flush();
const homeUrl=()=>classUrl(demo?'./?demo=1':'./');$('back').href=homeUrl();$('credits').href=classUrl('tone-credits.html');
const key=()=>classStorageKey('zhuyin.tone.practice.v1:'+new URL('.',location.href).pathname+':'+(demo?'demo':'live')+':'+seat);
const toneName=t=>TONES[t-1].name,modeName=()=>({basic:'🌱 無變調',sandhi:'✨ 有變調',all:'🌈 混合挑戰'})[mode];
function stop(){epoch++;audio.stop();busy=false;}
function show(name){
 for(const id of ['entry','intro','play','result','catalog'])$(id).hidden=id!==name;
 $('entry-back').hidden=name==='entry';$('error').textContent='';
 const playing=name==='play',info=$('stage-information'),main=info.parentElement;
 document.body.classList.toggle('is-playing',playing);
 // Put secondary information after the task in both visual and keyboard order.
 if(playing)main.append(info);else main.prepend(info);
 window.scrollTo(0,0);
}
function validSeat(){return demo||auth.verified(seat);}
function save(){try{sessionStorage.setItem(key(),JSON.stringify({roundId,startedAt,version:bank.version,mode,length,deck:deck.map(q=>q.id),index,answers,results,submitted,speed:Number($('speed').value)}));}catch{/* Storage failure never prevents practice. */}}
function clear(){try{sessionStorage.removeItem(key());}catch{}}
function saved(){try{
 const s=JSON.parse(sessionStorage.getItem(key())||'null'),pool=bank.questions.filter(q=>q.enabled&&!bank.disabledIds.includes(q.id));
 if(!s||s.version!==bank.version||!['basic','sandhi','all'].includes(s.mode)||!['short','medium','all'].includes(s.length)||!Array.isArray(s.deck)||!s.deck.length||s.deck.length>10||new Set(s.deck).size!==s.deck.length||s.deck.some(id=>!pool.some(q=>q.id===id))||!Number.isInteger(s.index)||s.index<0||s.index>=s.deck.length||!Array.isArray(s.answers)||s.answers.length!==pool.find(q=>q.id===s.deck[s.index]).text.length||s.answers.some(t=>t!==null&&!TONES.some(x=>x.value===t))||typeof s.submitted!=='boolean'||!Array.isArray(s.results)||s.results.length!==s.index+(s.submitted?1:0))return null;
 // Recalculate local feedback, never trust stored scores; no server rewards are sent.
 s.results=s.results.map((r,i)=>{const q=pool.find(q=>q.id===s.deck[i]);if(r.id!==q.id)throw Error();return r.skipped?{id:q.id,skipped:true}:grade(q,r.answers);});
 if(s.submitted&&s.results.at(-1).skipped)return null;
 return s;
 }catch{return null;}}
function updateChoices(){
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 document.querySelectorAll('[data-length]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.length===length)));
 const n=poolFor(bank,mode,length).length;$('pool-count').textContent=`可選 ${n} 個詞語 · 本回合隨機 ${Math.min(10,n)} 題，不重複`;
 $('start').disabled=!n||starting;$('resume').hidden=!saved();
}
function entry(){stop();show('entry');updateChoices();}
$('entry-back').onclick=entry;$('again').onclick=entry;
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;updateChoices();});
document.querySelectorAll('[data-length]').forEach(b=>b.onclick=()=>{length=b.dataset.length;updateChoices();});
async function loadBank(){const response=await fetch('tone-questions.json?v=20261002-original1',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('題庫暫時無法載入，請稍後再試。');return validateBank(await response.json());}
$('start').onclick=async()=>{
 if(starting)return;if(!validSeat()){location.href=homeUrl();return;}
 starting=true;updateChoices();
 try{bank=await loadBank();deck=makeDeck(poolFor(bank,mode,length));if(!deck.length)throw Error('這個範圍暫時沒有題目，請換一種挑戰。');stop();roundId=crypto.randomUUID();startedAt=Date.now();index=0;results=[];answers=Array(deck[0].text.length).fill(null);submitted=false;save();
  if(mode!=='basic'){show('intro');$('intro-status').textContent='';}else begin();
 }catch(e){$('error').textContent=e.message;}finally{starting=false;updateChoices();}
};
$('resume').onclick=()=>{if(!validSeat()){location.href=homeUrl();return;}const s=saved();if(!s){updateChoices();return;}roundId=s.roundId||crypto.randomUUID();startedAt=s.startedAt||Date.now();mode=s.mode;length=s.length;deck=s.deck.map(id=>bank.questions.find(q=>q.id===id));index=s.index;answers=s.answers;results=s.results;submitted=s.submitted;$('speed').value=[.75,.85,1].includes(s.speed)?String(s.speed):'0.75';begin(true);};
$('intro-listen').onclick=async()=>{const token=epoch,q=bank.questions.find(q=>q.text==='你好'&&q.enabled&&!bank.disabledIds.includes(q.id));if(!q)return;$('intro-listen').disabled=true;try{await audio.play(q.audioUrl,Number($('speed').value));if(token===epoch)$('intro-status').textContent='連讀聽起來像二聲、三聲；作答仍選「你：三聲、好：三聲」。';}catch(e){if(token===epoch)$('intro-status').textContent=e.message;}finally{$('intro-listen').disabled=false;}};
$('intro-go').onclick=()=>begin();
function begin(restore=false){
 stop();show('play');const q=deck[index];if(!restore){answers=Array(q.text.length).fill(null);submitted=false;}active=Math.max(0,answers.indexOf(null));heard=false;reviewDone=false;
 $('mode-label').textContent=modeName();$('progress-label').textContent=`第 ${index+1} / ${deck.length} 題`;$('progress').max=deck.length;$('progress').value=index;
 $('review').hidden=true;$('retry').hidden=true;$('next').hidden=true;$('submit').hidden=false;$('tones').hidden=false;$('status').textContent='';$('companion-message').textContent='我陪你慢慢聽！';$('question-id').textContent=`題目：${q.text} · 編號 ${bank.questions.findIndex(x=>x.id===q.id)+1}`;
 save();render();void warmAudio(deck.slice(index,index+2).map(x=>x.audioUrl));
 if(submitted){displayFeedback();if(results.at(-1).wholeCorrect){heard=true;reviewDone=true;render();}else reviewTwice();}else playQuestion();
}
function render(){
 const q=deck[index];$('characters').style.setProperty('--letters',q.text.length);$('characters').replaceChildren();
 [...q.text].forEach((char,i)=>{const b=document.createElement('button');b.className='char'+(!submitted&&active===i?' active':'');b.disabled=busy||submitted||!heard;b.setAttribute('aria-label',char+'，'+(answers[i]===null?'尚未作答':toneName(answers[i])));
  const w=document.createElement('span');w.className='word';w.textContent=char;const a=document.createElement('span');a.className='answer';a.textContent=answers[i]===null?'?':TONES[answers[i]-1].mark;b.append(w,a);
  if(submitted)b.classList.add(answers[i]===q.lexicalTones[i]?'correct':'wrong');b.onclick=()=>{active=i;render();};$('characters').append(b);
 });
 $('tones').replaceChildren();for(const t of TONES){const b=document.createElement('button');b.setAttribute('aria-label',t.name);b.setAttribute('aria-pressed',String(answers[active]===t.value));b.disabled=busy||submitted||!heard;
  const mark=document.createElement('span');mark.className='mark';mark.textContent=t.mark;const label=document.createElement('span');label.className='tone-name';label.textContent=t.name;b.append(mark,label);b.onclick=()=>{if(busy||submitted||!heard)return;answers[active]=t.value;const next=answers.findIndex((v,i)=>v===null&&i>active);active=next>=0?next:Math.max(0,answers.indexOf(null));save();render();};$('tones').append(b);
 }
 $('submit').disabled=busy||submitted||!heard||answers.some(v=>v===null);$('listen').disabled=busy||submitted;$('next').disabled=busy||!reviewDone;$('retry').disabled=busy;
}
async function playQuestion(){
 if(busy||submitted)return;const token=epoch;busy=true;$('error').textContent='';$('status').textContent='🔊 聽完整詞語，再選聲調…';render();
 try{await audio.play(deck[index].audioUrl,Number($('speed').value));if(token===epoch){heard=true;$('status').textContent='選每個字原本的聲調，需要時可以再聽一次。';}}
 catch(e){if(token===epoch){$('error').textContent=e.message;$('status').textContent='還沒有完整聽到題目；可重播，或跳過這題。';}}
 finally{if(token===epoch){busy=false;render();}}
}
$('listen').onclick=playQuestion;
function displayFeedback(){
 const q=deck[index],r=results.at(-1);$('submit').hidden=true;$('tones').hidden=true;$('next').hidden=false;$('review').hidden=false;$('corrections').replaceChildren();$('status').textContent='';
 $('feedback').textContent=r.wholeCorrect?'✓ 每個字都答對了！':'一起再聽，記住字原本的聲調！';$('companion-message').textContent=r.wholeCorrect?'原本的聲調選對了！':'沒關係，我陪你再練習。';
 [...q.text].forEach((char,i)=>{const p=document.createElement('p');p.className='correction';p.textContent=`${char}：${toneName(q.lexicalTones[i])} ${TONES[q.lexicalTones[i]-1].mark}`;$('corrections').append(p);});
 $('next').textContent=index===deck.length-1?'看這次成果 🌟':'下一題 ▶';$('progress').value=index+1;render();
}
async function reviewTwice(){
 if(busy)return;const token=epoch;busy=true;reviewDone=false;$('retry').hidden=true;$('error').textContent='';render();
 try{for(let n=1;n<=2;n++){if(token!==epoch)return;$('review-status').textContent=`看答案，再聽第 ${n} / 2 遍…`;await audio.play(deck[index].audioUrl,Number($('speed').value));}
  if(token===epoch){reviewDone=true;$('review-status').textContent='兩遍都聽完了，準備好就往下一題！';}
 }catch(e){if(token===epoch){$('error').textContent=e.message;$('retry').hidden=false;$('review-status').textContent='聲音尚未播放完成，請再聽兩遍。';}}
 finally{if(token===epoch){busy=false;render();}}
}
$('retry').onclick=reviewTwice;
$('submit').onclick=()=>{if(busy||submitted||!heard||answers.some(v=>v===null))return;results.push(grade(deck[index],answers));submitted=true;save();displayFeedback();if(results.at(-1).wholeCorrect){reviewDone=true;$('review-status').textContent='準備好就往下一題！';render();}else reviewTwice();};
function advance(){if(index+1<deck.length){index++;begin();return;}stop();show('result');recorder.enqueue({kind:'tone-record',roundId,bankVersion:bank.version,drillMode:mode,length,seconds:Math.max(0,Math.round((Date.now()-startedAt)/1000)),results:results.map(r=>r.skipped?{id:r.id,skipped:true}:{id:r.id,answers:r.answers})});clear();const s=summarize(results);$('whole-score').textContent=`整題全對 ${s.whole} / ${s.total} 題`;$('character-score').textContent=`字的聲調答對 ${s.correct} / ${s.characters} 字`;$('skipped-score').textContent=s.skipped?`跳過 ${s.skipped} 題，不計入對錯。`:'';}
$('next').onclick=()=>{if(!busy&&reviewDone)advance();};
$('skip').onclick=()=>{stop();const skipped={id:deck[index].id,skipped:true};if(submitted)results[results.length-1]=skipped;else results.push(skipped);advance();};
$('browse').onclick=()=>{stop();show('catalog');renderCatalog();};
$('search').oninput=renderCatalog;
function renderCatalog(){
 $('catalog-list').replaceChildren();for(const q of poolFor(bank,'all').filter(q=>q.text.includes($('search').value.trim()))){
  const article=document.createElement('article');article.className='word-card';const title=document.createElement('h2');title.textContent=`${bank.questions.indexOf(q)+1}. ${q.text}`;
  const listen=document.createElement('button');listen.textContent='🔊 聽詞語';listen.onclick=async()=>{stop();const token=epoch;try{await audio.play(q.audioUrl,Number($('speed').value));}catch(e){if(token===epoch)$('error').textContent=e.message;}};
  const detail=document.createElement('details'),summary=document.createElement('summary'),answer=document.createElement('p');summary.textContent='查看原本聲調答案';answer.textContent=[...q.text].map((c,i)=>c+'：'+toneName(q.lexicalTones[i])).join('／')+(q.mode==='sandhi'?'（連讀可能變調，答案仍選原本聲調）':'');detail.append(summary,answer);
  article.append(title,listen,detail);$('catalog-list').append(article);
 }
}
$('login-button').onclick=async()=>{seat=$('seat').value;if(await auth.ensure(seat)){auth.setPrimary(seat);$('identity').textContent=seat+' 號・聲調小劇場';$('login').hidden=true;entry();void recorder.flush();}};
async function initialize(){try{
 bank=await loadBank();$('load-status').textContent=`已準備 ${poolFor(bank,'all').length} 個真人詞語錄音。`;
 if(demo){seat='teacher-preview';$('identity').textContent='教師試玩・不記正式成績';entry();return;}
 seat=auth.currentSeat();if(seat){$('identity').textContent=seat+' 號・聲調小劇場';entry();void recorder.flush();return;}
 config=await client.get({api:'config'});if(!Array.isArray(config.seats))throw Error('暫時讀不到座號，請回首頁重新登入。');$('seat').replaceChildren(...config.seats.map(s=>new Option(s+' 號',s)));$('login').hidden=false;
 }catch(e){$('error').textContent=e.message+' 可重新整理再試。';$('load-status').textContent='';}}
window.addEventListener('online',()=>{if(seat&&auth.verified(seat))void recorder.flush();});
window.addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)return;stop();if(!$('play').hidden){if(submitted&&!reviewDone){$('retry').hidden=false;$('review-status').textContent='播放已暫停，請重新聽兩遍。';}render();}});
void initialize();
