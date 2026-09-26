import {readingDeck,readingStars,matchesReading,READING_WORDS} from './reading-core.js?v=20260926-reading1';
import {createReadingSpeech} from './reading-speech.js?v=20260926-reading1';
import {classStorageKey,classUrl} from './class-context.js?v=20260926-classes1';
import {createApiClient} from './api-client.js?v=20260926-classes1';
import {createStudentAuth} from './student-auth.js?v=20260926-classes1';
const $=id=>document.getElementById(id),demo=new URLSearchParams(location.search).get('demo')==='1';
const localPreview=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const client=createApiClient('https://zhuyin-api.j822925.workers.dev/api');
let config,seat='',deck=[],rows=[],started=0,questionStarted=0,locked=false,currentPayload=null,saving=false,starting=false;
const auth=createStudentAuth({demo,getConfig:()=>config,post:d=>client.post(d)});
const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
const supported=!!Recognition&&globalThis.isSecureContext;
const storageKey=classStorageKey('zhuyin.reading.pending.v1');
let pending=[];
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))pending=saved;}catch{}
function storePending(){try{localStorage.setItem(storageKey,JSON.stringify(pending));return true;}catch{return false;}}
function show(id){for(const name of ['intro','play','result'])$(name).hidden=name!==id;window.scrollTo(0,0);}
for(const link of document.querySelectorAll('a[href]'))link.href=classUrl(demo?'./?demo=1':'./');
const errors={'not-allowed':'請允許麥克風權限，再按住錄音。','service-not-allowed':'這個瀏覽器的語音服務無法使用，請換支援語音辨識的瀏覽器。','audio-capture':'找不到可用的麥克風，請大人協助檢查。','network':'語音服務連線失敗，這次不計分，請再試一次。','no-speech':'沒有聽到完整詞語，這次不計分，請再讀一次。','language-not-supported':'這個裝置不支援中文語音辨識，請換另一個裝置。','timeout':'等待語音服務逾時，這次不計分，請再試一次。','aborted':'錄音已停止，可以重新錄音。'};
const speech=supported?createReadingSpeech({Recognition,onState(state){
 $('record').setAttribute('aria-pressed',String(state==='listening'));
 $('record').disabled=locked||state==='processing';
 $('record-label').textContent=({starting:'準備麥克風…',listening:'正在聽，讀完放開',processing:'正在辨識…',idle:'按住錄音'})[state];
 $('speech-status').textContent=({starting:'請先允許麥克風，等「正在聽」再讀',listening:'正在聽，請讀出上方的詞語',processing:'正在辨識，請稍候…',idle:'按住下方按鈕，讀完再放開'})[state];
},onResult:answer,onError(code){$('speech-status').textContent=errors[code]||'暫時無法辨識，這次不計分，請再試一次。';}}):null;
function press(){if(locked||$('play').hidden||!speech)return;speech.start();}
const record=$('record');let pointerId=null;
record.addEventListener('pointerdown',e=>{if(e.button!==0||pointerId!==null||speech?.busy)return;e.preventDefault();pointerId=e.pointerId;record.setPointerCapture(e.pointerId);press();});
function release(e){if(e.pointerId!==pointerId)return;pointerId=null;speech?.release();}
record.addEventListener('pointerup',release);
record.addEventListener('pointercancel',e=>{if(e.pointerId===pointerId){pointerId=null;speech?.cancel();}});
record.addEventListener('lostpointercapture',release);
record.addEventListener('contextmenu',e=>e.preventDefault());
record.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)press();}});
record.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();speech?.release();}});
record.addEventListener('blur',()=>speech?.release());
// Assistive technology generates a click without pointer/keyboard events.
record.addEventListener('click',e=>{if(e.detail===0&&!speech?.busy&&!locked)press();});
function cancel(){pointerId=null;speech?.cancel();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
window.addEventListener('pagehide',cancel);
window.addEventListener('blur',cancel);
function renderQuestion(){
 cancel();locked=false;$('record').disabled=false;$('record').setAttribute('aria-pressed','false');$('record-label').textContent='按住錄音';
 $('feedback').textContent='';$('next').hidden=true;$('speech-status').textContent='按住下方按鈕，讀完再放開';
 $('progress').textContent=`第 ${rows.length+1} / 5 題`;$('dots').replaceChildren();
 for(let i=0;i<5;i++){const dot=document.createElement('span');dot.className='dot '+(i===rows.length?'current':i<rows.length?rows[i].firstCorrect?'correct':'wrong':'');$('dots').append(dot);}
 const word=deck[rows.length];$('word').replaceChildren();
 for(const value of word.zhuyin.split(' ')){const group=document.createElement('span');group.className='syllable';group.setAttribute('aria-label',value);const tone=value.match(/[ˊˇˋ˙]/)?.[0]||'';for(const symbol of value.replace(/[ˊˇˋ˙]/g,'')){const s=document.createElement('span');s.textContent=symbol;group.append(s);}if(tone){const t=document.createElement('span');t.className='tone'+(tone==='˙'?' neutral':'');t.textContent=tone;group.append(t);}$('word').append(group);}
 questionStarted=Date.now();
}
function answer(text){
 if(locked||$('play').hidden)return;const word=deck[rows.length];locked=true;
 const correct=matchesReading(word,text);rows.push({wordId:word.id,target:word.zhuyin,firstCorrect:correct,seconds:Math.round((Date.now()-questionStarted)/1000)});
 $('record').disabled=true;$('feedback').textContent=correct?'⭐ 讀對了！真棒！':`這次聽到「${text.slice(0,80)}」。題目是「${word.word}」，下次再加油！`;
 $('speech-status').textContent=correct?`你讀的是「${word.word}」`:'這題已記錄，勇敢繼續下一題。';
 $('next').textContent=rows.length===5?'看看我的星星 →':'下一題 →';$('next').hidden=false;
}
async function start(){
 if(starting||!supported||config?.readingWrites!==true||(demo&&!localPreview))return;starting=true;$('start').disabled=true;
 try{seat=$('seat').value;if(!seat){$('home-message').textContent='請先選擇你的座號。';return;}
 if(!demo){if(!await auth.ensure(seat))return;auth.setPrimary(seat);}
 currentPayload=null;deck=readingDeck();rows=[];started=Date.now();show('play');renderQuestion();
 }finally{starting=false;$('start').disabled=false;}
}
function finish(){
 cancel();show('result');const correct=rows.filter(r=>r.firstCorrect).length,stars=readingStars(correct);
 $('score').textContent=`答對 ${correct} / 5 題`;$('stars').textContent=stars?'⭐'.repeat(stars):'再接再厲';
 $('review').replaceChildren();for(const row of rows){const word=READING_WORDS.find(w=>w.id===row.wordId),p=document.createElement('p');p.textContent=`${row.firstCorrect?'✓':'再練練'}　${word.word}　${word.zhuyin}`;$('review').append(p);}
 if(demo){$('save-status').textContent=`老師試玩：本回合 ${stars} 顆星星，不傳送學生成績。`;$('retry-save').hidden=true;return;}
 currentPayload={kind:'round',mode:'reading',roundId:crypto.randomUUID(),seat,total:5,mistakes:5-correct,seconds:Math.round((Date.now()-started)/1000),results:rows};
 pending.push(currentPayload);const stored=storePending();$('save-status').textContent=stored?'正在儲存紀錄與星星…':'此裝置無法暫存，請保持頁面開啟，等待儲存完成。';flushPending();
}
async function flushPending(){
 if(saving||demo||!seat)return;saving=true;$('retry-save').disabled=true;
 try{if(!await auth.ensure(seat))throw Error('authentication_required');
 for(const payload of [...pending].filter(p=>p.seat===seat)){
  const out=await auth.request(payload);if(out.saved!==true)throw Error(out.error||'unconfirmed');
  pending=pending.filter(p=>p.roundId!==payload.roundId);storePending();
  if(payload.roundId===currentPayload?.roundId)$('save-status').textContent=`紀錄已儲存，獲得 ${out.awards[0].stars} 顆星星！`;
 }
 if(!currentPayload)$('home-message').textContent='之前暫存的朗讀紀錄已儲存。';
 }catch{const stored=storePending();const message=stored?'紀錄已暫存，星星尚未確認入帳。請重新儲存。':'紀錄尚未儲存，請勿關閉此頁，請重新儲存。';if(currentPayload)$('save-status').textContent=message;else $('home-message').textContent=message;}
 finally{saving=false;$('retry-save').disabled=false;$('retry-save').hidden=!pending.some(p=>p.seat===seat);$('recover-pending')?.remove();if(pending.some(p=>p.seat===seat)&&!currentPayload){const b=document.createElement('button');b.id='recover-pending';b.className='secondary';b.textContent='儲存先前的朗讀紀錄';b.onclick=flushPending;$('home-message').after(b);}}
}
async function load(){
 $('reload').hidden=true;$('start').disabled=true;
 if(demo&&!localPreview){$('home-message').textContent='第四關已準備好，目前尚未開放。請等待老師通知。';return;}
 if(!supported){$('home-message').textContent=globalThis.isSecureContext?'這個瀏覽器不支援語音辨識，請用支援的 Chrome 或 Safari 開啟。':'錄音需要安全連線，請以 HTTPS 遊戲網址開啟。';return;}
 try{config=demo?{seats:['01'],readingWrites:true}:await client.get({api:'config'});
 if(!config.readingWrites){$('home-message').textContent='第四關已準備好，目前尚未開放。請等待老師通知。';return;}
 $('seat').replaceChildren(new Option('選擇座號',''));for(const s of config.seats)$('seat').append(new Option(s+' 號',s));
 $('seat').value=demo?'01':auth.currentSeat();seat=$('seat').value;$('seat-label').hidden=demo;
 $('home-message').textContent=demo?'老師試玩模式：不記錄成績。':'準備好後，按開始進入朗讀。';$('start').disabled=false;
 if(!demo&&seat&&pending.some(p=>p.seat===seat))flushPending();
 }catch{$('home-message').textContent='還沒連上老師的任務，請確認網路後重試。';$('reload').hidden=false;}
}
function leave(){cancel();$('leave-dialog').showModal();}
function home(){cancel();show('intro');currentPayload=null;}
function hasUnsaved(){return pending.some(p=>p.seat===seat);}
window.addEventListener('beforeunload',e=>{if(!$('play').hidden||hasUnsaved()){e.preventDefault();e.returnValue='';}});
document.querySelectorAll('a[href]').forEach(a=>a.addEventListener('click',e=>{if(!$('play').hidden){e.preventDefault();leave();}}));
window.addEventListener('online',()=>{if(hasUnsaved())flushPending();});
window.addEventListener('pageshow',()=>{if(!$('play').hidden&&!locked)$('record').disabled=false;});
 $('seat').onchange=()=>{seat=$('seat').value;if(seat!==auth.currentSeat())auth.forgetAll();if(pending.some(p=>p.seat===seat))flushPending();};
 $('start').onclick=start;$('reload').onclick=load;$('next').onclick=()=>{if(!locked)return;rows.length===5?finish():renderQuestion();};
 $('leave').onclick=leave;$('stay').onclick=()=>$('leave-dialog').close();$('confirm-leave').onclick=()=>{$('leave-dialog').close();home();};
 $('again').onclick=()=>{if(hasUnsaved()){$('save-status').textContent='請先儲存這次紀錄，再開始下一回合。';return;}home();start();};
 $('retry-save').onclick=flushPending;
load();
