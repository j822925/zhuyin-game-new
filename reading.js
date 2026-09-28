import {readingDeck,readingStars,matchesReading,READING_WORDS} from './reading-core.js?v=20260926-reading1';
import {createReadingSpeech,supportsReadingAudioTrack} from './reading-speech.js?v=20260928-mic4';
import {createMicCheck} from './reading-mic-check.js?v=20260928-mic3';
import {createMicPreference} from './reading-mic-preference.js?v=20260928-memory1';
import {classStorageKey,classUrl} from './class-context.js?v=20260926-classes1';
import {createApiClient} from './api-client.js?v=20260926-classes1';
import {createStudentAuth} from './student-auth.js?v=20260926-classes1';
const $=id=>document.getElementById(id),demo=new URLSearchParams(location.search).get('demo')==='1';
const localPreview=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const allowMicCheck=!demo||localPreview;
const client=createApiClient('https://zhuyin-api.j822925.workers.dev/api');
let config,seat='',deck=[],rows=[],started=0,questionStarted=0,locked=false,currentPayload=null,saving=false,starting=false,micBusy=false;
const auth=createStudentAuth({demo,getConfig:()=>config,post:d=>client.post(d)});
const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
const supported=!!Recognition&&globalThis.isSecureContext;
const sharedMicrophone=supportsReadingAudioTrack(navigator)&&!!navigator.mediaDevices?.getUserMedia;
const storageKey=classStorageKey('zhuyin.reading.pending.v1');
let pending=[];
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))pending=saved;}catch{}
function storePending(){try{localStorage.setItem(storageKey,JSON.stringify(pending));return true;}catch{return false;}}
function show(id){for(const name of ['intro','play','result'])$(name).hidden=name!==id;window.scrollTo(0,0);}
for(const link of document.querySelectorAll('a[href]'))link.href=classUrl(demo?'./?demo=1':'./');
const errors={'not-allowed':'請允許麥克風權限，再點一下開始錄音。','service-not-allowed':'這個瀏覽器的語音服務無法使用，請換支援語音辨識的瀏覽器。','audio-capture':'找不到可用的麥克風，請大人協助檢查。','network':'語音服務連線失敗，這次不計分，請再試一次。','no-speech':'沒有聽到完整詞語，這次不計分，請再讀一次。','language-not-supported':'這個裝置不支援中文語音辨識，請換另一個裝置。','timeout':'等待語音服務逾時，這次不計分，請再試一次。','aborted':'錄音已停止，可以重新錄音。'};
Object.assign(errors,{
 'too-short':'麥克風還沒準備好。請點一下開始錄音，等「正在聽」出現再讀，讀完再點一下送出。',
 'mic-not-ready':'語音服務沒有開始收音。請先用下方「測試麥克風」檢查；若回放有聲音，可用 Chrome 開啟相同網址再試。',
 'no-result':'已偵測到說話，但辨識服務沒有回傳完整文字。這次不計分，請再試；也可以用 Chrome 開啟相同網址比較。',
 'no-speech':'辨識服務沒有回傳可用的詞語，這次不計分。若回放已有聲音，請確認「朗讀收音」裝置；裝置正確仍失敗，可能是辨識服務的問題。',
 'device-missing':'選擇的麥克風已中斷，請更新麥克風清單並重新選擇。',
});
const speech=supported?createReadingSpeech({Recognition,
getAudioStream:sharedMicrophone?deviceId=>navigator.mediaDevices.getUserMedia({audio:deviceId?{deviceId:{exact:deviceId}}:true}):undefined,
onInput(label){$('speech-device').textContent=`朗讀收音：${label}`;},onState(state){
 if(state==='starting')$('speech-device').textContent=sharedMicrophone?'正在開啟選擇的麥克風…':'朗讀收音：瀏覽器預設麥克風';
 $('tap-record').dataset.state=state;
 $('tap-record').disabled=locked||micBusy||['starting','processing'].includes(state);
 $('tap-record').textContent=state==='idle'?'點一下開始錄音':state==='starting'?'準備麥克風…':state==='processing'?'正在辨識…':'我讀完了，點一下送出';
 $('speech-status').textContent=({starting:'請先允許麥克風，等「正在聽」再讀',listening:'正在聽，請讀出上方的詞語',hearing:'有偵測到說話，讀完後再點一下送出',processing:'正在辨識，請稍候…',idle:'點一下開始錄音，讀完再點一下送出'})[state];
},onResult:answer,onError(code){$('speech-status').textContent=errors[code]||'暫時無法辨識，這次不計分，請再試一次。';}}):null;
function press(){if(locked||micBusy||$('play').hidden||!speech)return;speech.start({deviceId:allowMicCheck?$('mic-device').value:''});}
$('tap-record').onclick=()=>{if(locked||micBusy)return;speech?.busy?speech.release():press();};
let micCheck,clipUrl='';
function clearClip(){$('mic-playback').pause();$('mic-playback').removeAttribute('src');$('mic-playback').load();$('mic-playback').hidden=true;if(clipUrl)URL.revokeObjectURL(clipUrl);clipUrl='';}
function cancel(){speech?.cancel();micCheck?.cancel();clearClip();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
window.addEventListener('pagehide',cancel);
// Permission prompts may blur the window. Only leaving/hiding the page cancels.
$('mic-check').hidden=!(demo&&localPreview);
if(allowMicCheck){
 $('mic-routing-note').textContent=sharedMicrophone?'上方朗讀與下方回放檢查都使用這個選單選擇的麥克風。':'iPad／Safari 朗讀每次都使用系統預設麥克風，不必在這裡重選。此選單只設定回放檢查，無法更改朗讀收音或麥克風權限。iPad 請用 Safari，並保持 Siri／聽寫可用。';
 const preference=createMicPreference();
 function showPreference(){
  const choice=preference.choice,scope=sharedMicrophone?'朗讀與回放':'回放檢查';
  $('mic-preference-note').textContent=!choice?`選擇後會自動記住這台裝置、這個瀏覽器的${scope}麥克風。`:preference.saved?`已記住${scope}麥克風：${choice.label||'所選麥克風'}。下次進來會自動選回來。`:`這次已選用${scope}麥克風，但瀏覽器無法儲存設定，下次可能需要重新選擇。`;
 }
 const remembered=preference.choice;
 if(remembered?.deviceId){$('mic-device').append(new Option(remembered.label||'已記住的麥克風',remembered.deviceId));$('mic-device').value=remembered.deviceId;}
 showPreference();
 let deviceRefresh=0;
 async function refreshMicrophones(){
  const request=++deviceRefresh;
  try{
   const inputs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');
   if(request!==deviceRefresh)return;
   const selected=$('mic-device').value,options=[new Option('瀏覽器預設麥克風','')];
   for(const [i,d] of inputs.entries())if(d.deviceId)options.push(new Option(d.label||`麥克風 ${i+1}（允許權限後顯示名稱）`,d.deviceId));
   const missing=selected&&!inputs.some(d=>d.deviceId===selected);
   if(missing)options.push(new Option(`${preference.choice?.label||'已選擇的麥克風'}（暫時找不到）`,selected));
   $('mic-device').replaceChildren(...options);$('mic-device').value=selected;
   $('mic-device-note').textContent=missing?'暫時找不到已選擇的麥克風。請確認已連接、允許麥克風後更新清單；必要時重新選擇。系統會保留原本的選擇。':inputs.some(d=>d.label)?'筆電請選 Microphone Array／內建麥克風。Steam Streaming 是虛擬裝置。':'若清單沒有裝置名稱，請先按一次測試並允許麥克風，再選擇裝置重錄。';
  }catch{$('mic-device-note').textContent='無法讀取麥克風清單，請檢查這個網站的麥克風權限。';}
 }
 const messages={permission:'請允許麥克風；允許後會錄四秒。',recording:'正在錄四秒：請說「一、二、三，測試」。',ready:'錄好了，請按下方播放。若仍無聲，請確認上方實際收音裝置，再選 Microphone Array 重錄；也請確認播放音量沒有靜音。',idle:'檢查已取消。',denied:'麥克風權限被拒絕，請在網址列的網站權限允許麥克風。',missing:'找不到選擇的麥克風，請更新清單並重新選擇。',error:'無法錄音，請確認麥克風沒有被其他程式獨占。',empty:'錄音沒有收到資料，請檢查電腦選用的輸入裝置。','permission-timeout':'等待麥克風權限逾時，可以再按一次測試。'};
 micCheck=createMicCheck({getUserMedia:constraints=>navigator.mediaDevices.getUserMedia(constraints),Recorder:globalThis.MediaRecorder,onStream(stream){
  const track=stream.getAudioTracks()[0];$('mic-active-device').textContent=`這次收音裝置：${track?.label||'瀏覽器未提供名稱'}`;refreshMicrophones();
 },onState(state){
  micBusy=['permission','recording'].includes(state);$('mic-test').disabled=micBusy;$('mic-cancel').hidden=!micBusy;$('mic-device').disabled=micBusy;$('mic-refresh').disabled=micBusy;
  $('tap-record').disabled=locked||micBusy||!supported;
  $('mic-status').textContent=messages[state];
 },onClip(blob){clearClip();clipUrl=URL.createObjectURL(blob);$('mic-playback').src=clipUrl;$('mic-playback').hidden=false;}});
 $('mic-test').onclick=()=>{speech?.cancel();clearClip();$('mic-active-device').textContent='正在開啟選擇的麥克風…';micCheck.start({deviceId:$('mic-device').value});};$('mic-cancel').onclick=()=>micCheck.cancel();
 $('mic-device').onchange=()=>{clearClip();const select=$('mic-device');preference.select(select.value,select.selectedOptions[0]?.textContent||'所選麥克風');showPreference();$('mic-active-device').textContent='已選擇新裝置，請按測試重新錄音。';refreshMicrophones();};
 $('mic-refresh').onclick=refreshMicrophones;
 navigator.mediaDevices?.addEventListener?.('devicechange',refreshMicrophones);
 if(navigator.mediaDevices?.enumerateDevices)refreshMicrophones();
 if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){$('mic-test').disabled=true;$('mic-status').textContent='這個瀏覽器無法進行麥克風回放檢查，請改用 Chrome。';}
}
function renderQuestion(){
 cancel();locked=false;$('tap-record').disabled=false;$('tap-record').textContent='點一下開始錄音';$('tap-record').dataset.state='idle';
 $('feedback').textContent='';$('next').hidden=true;$('speech-status').textContent='點一下開始錄音，讀完再點一下送出';
 $('progress').textContent=`第 ${rows.length+1} / 5 題`;$('dots').replaceChildren();
 for(let i=0;i<5;i++){const dot=document.createElement('span');dot.className='dot '+(i===rows.length?'current':i<rows.length?rows[i].firstCorrect?'correct':'wrong':'');$('dots').append(dot);}
 const word=deck[rows.length];$('word').replaceChildren();
 for(const value of word.zhuyin.split(' ')){const group=document.createElement('span');group.className='syllable';group.setAttribute('aria-label',value);const tone=value.match(/[ˊˇˋ˙]/)?.[0]||'';for(const symbol of value.replace(/[ˊˇˋ˙]/g,'')){const s=document.createElement('span');s.textContent=symbol;group.append(s);}if(tone){const t=document.createElement('span');t.className='tone'+(tone==='˙'?' neutral':'');t.textContent=tone;group.append(t);}$('word').append(group);}
 questionStarted=Date.now();
}
function answer(text){
 if(locked||$('play').hidden)return;const word=deck[rows.length];locked=true;
 const correct=matchesReading(word,text);rows.push({wordId:word.id,target:word.zhuyin,firstCorrect:correct,seconds:Math.round((Date.now()-questionStarted)/1000)});
 $('tap-record').disabled=true;$('feedback').textContent=correct?'⭐ 讀對了！真棒！':`這次聽到「${text.slice(0,80)}」。題目是「${word.word}」，下次再加油！`;
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
 $('mic-check').hidden=false;
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
window.addEventListener('pageshow',()=>{if(!$('play').hidden&&!locked&&!micBusy&&!speech?.busy)$('tap-record').disabled=!supported;});
 $('seat').onchange=()=>{seat=$('seat').value;if(seat!==auth.currentSeat())auth.forgetAll();if(pending.some(p=>p.seat===seat))flushPending();};
 $('start').onclick=start;$('reload').onclick=load;$('next').onclick=()=>{if(!locked)return;rows.length===5?finish():renderQuestion();};
 $('leave').onclick=leave;$('stay').onclick=()=>$('leave-dialog').close();$('confirm-leave').onclick=()=>{$('leave-dialog').close();home();};
 $('again').onclick=()=>{if(hasUnsaved()){$('save-status').textContent='請先儲存這次紀錄，再開始下一回合。';return;}home();start();};
 $('retry-save').onclick=flushPending;
load();
