import {readingDeck,readingStars,matchesReading,READING_WORDS} from './reading-core.js?v=20260926-reading1';
import {createReadingSpeech} from './reading-speech.js?v=20260927-mic2';
import {createMicCheck} from './reading-mic-check.js?v=20260927-mic2';
import {classStorageKey,classUrl} from './class-context.js?v=20260926-classes1';
import {createApiClient} from './api-client.js?v=20260926-classes1';
import {createStudentAuth} from './student-auth.js?v=20260926-classes1';
const $=id=>document.getElementById(id),demo=new URLSearchParams(location.search).get('demo')==='1';
const localPreview=['localhost','127.0.0.1','[::1]'].includes(location.hostname)||(demo&&location.pathname.endsWith('/teacher-preview/reading.html'));
const client=createApiClient('https://zhuyin-api.j822925.workers.dev/api');
let config,seat='',deck=[],rows=[],started=0,questionStarted=0,locked=false,currentPayload=null,saving=false,starting=false,micBusy=false;
const auth=createStudentAuth({demo,getConfig:()=>config,post:d=>client.post(d)});
const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
const supported=!!Recognition&&globalThis.isSecureContext;
const storageKey=classStorageKey('zhuyin.reading.pending.v1');
let pending=[];
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))pending=saved;}catch{}
function storePending(){try{localStorage.setItem(storageKey,JSON.stringify(pending));return true;}catch{return false;}}
function show(id){for(const name of ['intro','play','result'])$(name).hidden=name!==id;window.scrollTo(0,0);}
for(const link of document.querySelectorAll('a[href]'))link.href=classUrl(new URL(demo?'./?demo=1':'./',document.baseURI).href);
const errors={'not-allowed':'請允許麥克風權限，再按住錄音。','service-not-allowed':'這個瀏覽器的語音服務無法使用，請換支援語音辨識的瀏覽器。','audio-capture':'找不到可用的麥克風，請大人協助檢查。','network':'語音服務連線失敗，這次不計分，請再試一次。','no-speech':'沒有聽到完整詞語，這次不計分，請再讀一次。','language-not-supported':'這個裝置不支援中文語音辨識，請換另一個裝置。','timeout':'等待語音服務逾時，這次不計分，請再試一次。','aborted':'錄音已停止，可以重新錄音。'};
Object.assign(errors,{
 'too-short':'放開時麥克風還沒準備好。請改按「點一下開始錄音」，等「正在聽」出現再讀，讀完再按完成。',
 'mic-not-ready':'語音服務沒有開始收音。請先用下方「測試麥克風」檢查；若回放有聲音，可用 Chrome 開啟相同網址再試。',
 'no-result':'已偵測到說話，但辨識服務沒有回傳完整文字。這次不計分，請再試；也可以用 Chrome 開啟相同網址比較。',
 'no-speech':'麥克風已啟動，但辨識服務沒有偵測到說話。這次不計分，請用下方「測試麥克風」回放確認。',
});
const speech=supported?createReadingSpeech({Recognition,onState(state){
 $('record').setAttribute('aria-pressed',String(['listening','hearing'].includes(state)));
 $('record').disabled=locked||micBusy||state==='processing';$('tap-record').disabled=locked||micBusy||state==='processing';
 $('tap-record').textContent=state==='idle'?'點一下開始錄音（不用按住）':state==='processing'?'正在辨識…':'我讀完了，點一下送出';
 $('record-label').textContent=({starting:'準備麥克風…',listening:'正在聽，讀完放開',hearing:'有聽到說話',processing:'正在辨識…',idle:'按住錄音'})[state];
 $('speech-status').textContent=({starting:'請先允許麥克風，等「正在聽」再讀',listening:'正在聽，請讀出上方的詞語',hearing:'有偵測到說話，讀完後再放開或按完成',processing:'正在辨識，請稍候…',idle:'按住錄音，或使用下方點按錄音'})[state];
},onResult:answer,onError(code){$('speech-status').textContent=errors[code]||'暫時無法辨識，這次不計分，請再試一次。';}}):null;
function press(){if(locked||micBusy||$('play').hidden||!speech)return;speech.start();}
const record=$('record');let pointerId=null;
record.addEventListener('pointerdown',e=>{if(e.button!==0||pointerId!==null||speech?.busy)return;e.preventDefault();pointerId=e.pointerId;record.setPointerCapture(e.pointerId);press();});
function release(e){if(e.pointerId!==pointerId)return;pointerId=null;speech?.release();}
record.addEventListener('pointerup',release);
record.addEventListener('pointercancel',e=>{if(e.pointerId===pointerId){pointerId=null;speech?.cancel();}});
record.addEventListener('lostpointercapture',release);
record.addEventListener('contextmenu',e=>e.preventDefault());
record.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)press();}});
record.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();speech?.release();}});
let keyboardHeld=false;
record.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key))keyboardHeld=true;});
record.addEventListener('keyup',()=>{keyboardHeld=false;});
record.addEventListener('blur',()=>{if(keyboardHeld){keyboardHeld=false;speech?.release();}});
// Assistive technology generates a click without pointer/keyboard events.
record.addEventListener('click',e=>{if(e.detail===0&&!speech?.busy&&!locked)press();});
$('tap-record').onclick=()=>{if(locked||micBusy)return;speech?.busy?speech.release():press();};
let micCheck,clipUrl='';
function clearClip(){$('mic-playback').pause();$('mic-playback').removeAttribute('src');$('mic-playback').load();$('mic-playback').hidden=true;if(clipUrl)URL.revokeObjectURL(clipUrl);clipUrl='';}
function cancel(){pointerId=null;keyboardHeld=false;speech?.cancel();micCheck?.cancel();clearClip();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
window.addEventListener('pagehide',cancel);
// Permission prompts may blur the window. Only leaving/hiding the page cancels.
$('mic-check').hidden=!(demo&&localPreview);
if(demo&&localPreview){
 const messages={permission:'請允許麥克風；允許後會錄四秒。',recording:'正在錄四秒：請說「一、二、三，測試」。',ready:'錄好了，請按下方播放。如果聽得到自己，代表麥克風有收音；若遊戲仍無法辨識，可改用 Chrome 比較。',idle:'檢查已取消。',denied:'麥克風權限被拒絕，請在網址列的網站權限允許麥克風。',missing:'找不到麥克風，請確認電腦已接上麥克風。',error:'無法錄音，請確認麥克風沒有被其他程式獨占。',empty:'錄音沒有收到資料，請檢查電腦選用的輸入裝置。','permission-timeout':'等待麥克風權限逾時，可以再按一次測試。'};
 micCheck=createMicCheck({getUserMedia:()=>navigator.mediaDevices.getUserMedia({audio:true}),Recorder:globalThis.MediaRecorder,onState(state){
  micBusy=['permission','recording'].includes(state);$('mic-test').disabled=micBusy;$('mic-cancel').hidden=!micBusy;
  $('record').disabled=locked||micBusy||!supported;$('tap-record').disabled=locked||micBusy||!supported;
  $('mic-status').textContent=messages[state];
 },onClip(blob){clearClip();clipUrl=URL.createObjectURL(blob);$('mic-playback').src=clipUrl;$('mic-playback').hidden=false;}});
 $('mic-test').onclick=()=>{speech?.cancel();clearClip();micCheck.start();};$('mic-cancel').onclick=()=>micCheck.cancel();
 if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){$('mic-test').disabled=true;$('mic-status').textContent='這個瀏覽器無法進行麥克風回放檢查，請改用 Chrome。';}
}
function renderQuestion(){
 cancel();locked=false;$('record').disabled=false;$('tap-record').disabled=false;$('tap-record').textContent='點一下開始錄音（不用按住）';$('record').setAttribute('aria-pressed','false');$('record-label').textContent='按住錄音';
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
 $('record').disabled=true;$('tap-record').disabled=true;$('feedback').textContent=correct?'⭐ 讀對了！真棒！':`這次聽到「${text.slice(0,80)}」。題目是「${word.word}」，下次再加油！`;
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
