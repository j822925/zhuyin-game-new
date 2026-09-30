import {createReadingBattle} from './reading-battle.js?v=20260928-allies1';
import {startDemoMonster,creditDemoMonster} from './monster-cards-ui.js?v=20260928-allies1';
import {readingPool,readingLessonDeck,readingTaughtSymbols} from './reading-lesson.js?v=20260928-filter1';
import './asset-cache.js?v=20260928-all1';
import {readingStars,readingDecision,READING_WORDS} from './reading-core.js?v=20260930-script1';
import {createCloudReadingSpeech} from './reading-cloud-speech.js?v=20260930-script1';
import {getReadingCloudStatus,readingClosedMessage} from './reading-cloud-status.js?v=20260930-script1';
import {createReadingSpeech,supportsReadingAudioTrack} from './reading-speech.js?v=20260928-mic4';
import {showNativeFallback} from './reading-fallback.js?v=20260930-script1';
import {createMicCheck,clearMicPlayback} from './reading-mic-check.js?v=20260928-mic3';
import {createMicPreference} from './reading-mic-preference.js?v=20260928-all1';
import {classStorageKey,classUrl} from './class-context.js?v=20260928-all1';
import {createApiClient} from './api-client.js?v=20260928-all1';
import {createStudentAuth} from './student-auth.js?v=20260928-all1';
const $=id=>document.getElementById(id),demo=new URLSearchParams(location.search).get('demo')==='1';
const localPreview=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const allowMicCheck=!demo||localPreview;
const client=createApiClient('https://zhuyin-api.j822925.workers.dev/api');
let config,eligibleWords=[],lessonReady=false,seat='',deck=[],rows=[],started=0,questionStarted=0,locked=false,currentPayload=null,saving=false,starting=false,micBusy=false;
let cloudReady=false;
const auth=createStudentAuth({demo,getConfig:()=>config,post:d=>client.post(d)});
const readingBattle=createReadingBattle({play:$('play'),result:$('result')});let readingRoundId='';
const nativeMode=new URL(location.href).searchParams.get('speech')==='native';
const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
const supported=globalThis.isSecureContext&&(nativeMode?!!Recognition:!!navigator.mediaDevices?.getUserMedia&&!!globalThis.MediaRecorder&&!!(globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext));
const sharedMicrophone=!nativeMode||supportsReadingAudioTrack(navigator);
const storageKey=classStorageKey('zhuyin.reading.pending.v1');
let pending=[];
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))pending=saved;}catch{}
function storePending(){try{localStorage.setItem(storageKey,JSON.stringify(pending));return true;}catch{return false;}}
function show(id){document.body.classList.toggle('reading-battle-active',id==='play');for(const name of ['intro','play','result'])$(name).hidden=name!==id;window.scrollTo(0,0);}
for(const link of document.querySelectorAll('#home-link,a.home'))link.href=classUrl(demo?'./?demo=1':'./');
const appleMobile=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=appleMobile&&(navigator.standalone===true||globalThis.matchMedia?.('(display-mode: standalone)').matches);
const browserReadingUrl=classUrl('reading.html?v=20260928-mic4');
for(const link of document.querySelectorAll('[data-reading-browser]'))link.href=browserReadingUrl;
$('standalone-help').hidden=!standalone;
const errors={
 'not-allowed':'請允許這個網站使用麥克風與語音辨識，再試一次。',
 'no-result':'瀏覽器尚未回傳辨識文字，這次不計分，請再試一次。',
 'aborted':'這次辨識被中止，不計分。請停止其他錄音，再重新試讀。',
 'permission-denied':'請允許這個網站使用麥克風，再點一下錄音。',
 'permission-timeout':'等待麥克風權限逾時，這次不計分，請再試一次。',
 'record-error':'麥克風未能錄音，請檢查權限或選擇的麥克風。這次不計分。',
 'record-timeout':'錄音沒有完成，這次不計分，請重新錄音。',
 'silence':'錄音太小聲或沒有足夠聲音，這次不計分。請靠近麥克風再讀一次。',
 'too-short':'錄音太短，這次不計分。請讀完整個詞語後再送出。',
 'too-long':'錄音超過時間，這次不計分，請重新讀一次詞語。',
 'no-speech':'沒有辨識到完整詞語，這次不計分，請重新讀一次。',
 'authentication_required':'登入已到期，這題不計分。請按「先休息」返回，再登入開始。',
 'daily-limit':'今天的免費朗讀用量已達上限，這題不計分，請明天再練習。',
 'student-limit':'今天已經練習很多次了，這題不計分，請明天再練習。',
 'too-many-requests':'錄音送得太快了，這題不計分，請等一分鐘再試。',
 'unavailable':'雲端辨識暫時無法使用，這次不計分，請稍後再試。',
 'timeout':'辨識等候逾時，這次不計分，請確認網路後再試。',
 'network':'網路連線失敗，這次不計分，請確認網路後再試。'
};
const speechOptions={
 Recorder:globalThis.MediaRecorder,
 getUserMedia:c=>navigator.mediaDevices.getUserMedia(c),
 decode:async blob=>{const Decoder=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;return new Decoder(1,1,16000).decodeAudioData(await blob.arrayBuffer());},
 transcribe:async(audio,signal)=>{
  if(demo)throw Error('authentication_required');
  const payload=auth.decorate({seat,audio});
  let response;try{response=await fetch(classUrl('https://zhuyin-reading.j822925.workers.dev/transcribe'),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),credentials:'omit',cache:'no-store',signal});}catch{throw Error('network');}
  if(response.status===401){auth.forget(seat);throw Error('authentication_required');}
  if(!response.ok)throw Error('unavailable');
  return response.json();
 },
 onInput(label){$('speech-device').textContent='朗讀收音：'+label;},
 onState(state){
  if(state==='starting'){$('speech-help').hidden=true;$('speech-device').textContent='正在開啟選擇的麥克風…';}
  $('tap-record').dataset.state=state;
  $('tap-record').disabled=locked||micBusy||['starting','processing'].includes(state);
  $('tap-record').textContent=state==='idle'?'點一下開始錄音':state==='starting'?'準備麥克風…':state==='processing'?'正在辨識…':'我讀完了，點一下送出';
  $('speech-status').textContent=({starting:'請先允許麥克風，等「正在聽」再讀',listening:nativeMode?'正在聽，請讀出上方的詞語':'正在聽，請讀出上方的詞語（最長八秒）',hearing:'有偵測到說話，讀完再點一下送出',processing:'正在辨識，請稍候…',idle:'點一下開始錄音，讀完再點一下送出'})[state];
 },
 onResult:answer,
 onError(code){$('speech-status').textContent=code==='daily-limit'?readingClosedMessage(code):errors[code]||'這次無法完成辨識，不計分，請重新錄音。';if(code==='daily-limit'){cloudReady=false;$('tap-record').disabled=true;}$('speech-help').hidden=false;if(!nativeMode)showNativeFallback($('speech-help'));$('speech-diagnostic').textContent='頁面版本：20260930-script1；'+(nativeMode?'瀏覽器原有辨識':'雲端辨識')+'；回報：'+code+'。';}
};
const speech=supported?(nativeMode?createReadingSpeech({...speechOptions,Recognition,continuous:appleMobile,finalGraceMs:appleMobile?1200:0,stopDelayMs:appleMobile?350:0,getAudioStream:sharedMicrophone?deviceId=>navigator.mediaDevices.getUserMedia({audio:deviceId?{deviceId:{exact:deviceId}}:true}):undefined}):createCloudReadingSpeech(speechOptions)):null;
if(nativeMode){
 document.querySelector('#intro h1').nextElementSibling.textContent='Safari／瀏覽器原有辨識模式';$('standalone-help').hidden=true;
 const details=document.querySelector('#intro details');details.innerHTML='<summary>給大人的錄音說明</summary><p>現在使用原本的 Safari／瀏覽器語音辨識，不消耗遊戲的雲端朗讀額度。iPad 請在 Safari 開啟，允許麥克風，並保持 Siri／聽寫可用。</p><p>聲音可能交由瀏覽器的語音服務處理；遊戲不保存錄音或辨識文字。這套辨識曾在 Safari 完成關卡，主畫面模式仍需要切換到 Safari。</p>';
}
function press(){if(locked||micBusy||!cloudReady||$('play').hidden||!speech)return;clearClip();speech.start({deviceId:allowMicCheck?$('mic-device').value:''});}
$('tap-record').onclick=()=>{if(locked||micBusy)return;speech?.busy?speech.release():press();};
let micCheck,clipUrl='';
function clearClip(){clearMicPlayback($('mic-playback'),clipUrl);clipUrl='';}
function cancel(){speech?.cancel();micCheck?.cancel();clearClip();readingBattle.reset();}
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
 $('speech-help').hidden=true;
 cancel();locked=false;$('tap-record').disabled=false;$('tap-record').textContent='點一下開始錄音';$('tap-record').dataset.state='idle';
 $('feedback').textContent='';$('next').hidden=true;$('speech-status').textContent='點一下開始錄音，讀完再點一下送出';
 $('progress').textContent=`第 ${rows.length+1} / 5 題`;$('dots').replaceChildren();
 for(let i=0;i<5;i++){const dot=document.createElement('span');dot.className='dot '+(i===rows.length?'current':i<rows.length?rows[i].firstCorrect?'correct':'wrong':'');$('dots').append(dot);}
 const word=deck[rows.length];$('word').replaceChildren();
 for(const value of word.zhuyin.split(' ')){const group=document.createElement('span');group.className='syllable';group.setAttribute('aria-label',value);const tone=value.match(/[ˊˇˋ˙]/)?.[0]||'';for(const symbol of value.replace(/[ˊˇˋ˙]/g,'')){const s=document.createElement('span');s.textContent=symbol;group.append(s);}if(tone){const t=document.createElement('span');t.className='tone'+(tone==='˙'?' neutral':'');t.textContent=tone;group.append(t);}$('word').append(group);}
 questionStarted=Date.now();
}
function answer(text){
 if(locked||$('play').hidden)return;const word=deck[rows.length],decision=readingDecision(word,text);
 if(decision==='retry'){
  $('feedback').textContent='辨識服務回傳的文字格式不清楚，這次不計分。請再讀一次。';
  $('speech-status').textContent='不是你答錯了。請靠近麥克風，慢慢讀完整個詞語。';
  $('tap-record').disabled=false;$('next').hidden=true;return;
 }
 locked=true;const correct=decision==='correct';rows.push({wordId:word.id,target:word.zhuyin,firstCorrect:correct,seconds:Math.round((Date.now()-questionStarted)/1000)});
 $('tap-record').disabled=true;$('feedback').textContent=correct?'⭐ 讀對了！真棒！':`這次聽到「${text.slice(0,80)}」。題目是「${word.word}」，下次再加油！`;
 $('speech-status').textContent=correct?`你讀的是「${word.word}」`:'這題已記錄，勇敢繼續下一題。';
 readingBattle.answer(correct,rows.length,rows.every(r=>r.firstCorrect));
 $('next').textContent=rows.length===5?'看看我的星星 →':'下一題 →';$('next').hidden=false;
}
async function refreshLesson(){
 lessonReady=false;
 const latest=await client.get({api:'config'});
 if(!Array.isArray(latest.symbols)||!Array.isArray(latest.compounds)||!Array.isArray(latest.seats)||typeof latest.readingWrites!=='boolean')throw Error('invalid_lesson');
 config=demo?{...latest,seats:['01']}:latest;
 const cloud=nativeMode?{available:true}:await getReadingCloudStatus();cloudReady=cloud.available;
 eligibleWords=readingPool(config);lessonReady=true;
 const taught=readingTaughtSymbols(config);
 $('lesson-symbols').textContent=taught.length?'老師已勾選：'+taught.join('、'):'老師目前尚未勾選注音。';
 $('lesson-status').textContent=eligibleWords.length>=5?`依老師勾選的注音，可出 ${eligibleWords.length} 題。這回合只從符合範圍的詞語抽五題。`:`符合範圍的詞語只有 ${eligibleWords.length} 題，不足五題，這回合改從全部題庫隨機抽五題。`;
 $('reload').hidden=false;
 if(!cloudReady){$('home-message').textContent=readingClosedMessage(cloud.reason);showNativeFallback($('intro'));}
 return config.readingWrites===true&&cloudReady;
}
async function start(){
 if(starting||!supported||(demo&&!localPreview))return;starting=true;$('seat').disabled=true;$('start').disabled=true;$('reload').disabled=true;
 try{
  $('home-message').textContent='正在確認老師最新勾選的注音…';
  if(!await refreshLesson()){if(cloudReady)$('home-message').textContent='第四關目前尚未開放。請等待老師通知。';return;}
  seat=$('seat').value;if(!seat){$('home-message').textContent='請先選擇你的座號。';return;}
  if(!demo){if(!await auth.ensure(seat)){$('home-message').textContent='請先完成登入，再開始朗讀。';return;}auth.setPrimary(seat);}
  $('home-message').textContent='正在準備朗讀夥伴與反派…';
  readingRoundId=crypto.randomUUID();
  const [profile,encounter]=await Promise.all([
   demo?Promise.resolve({avatar:'rabbit'}):auth.request({kind:'profile',seat}).catch(()=>null),
   demo?Promise.resolve(startDemoMonster(seat,readingRoundId)):auth.request({kind:'monster-start',seat,encounter:readingRoundId})
  ]);
  if(!encounter?.monsterId||encounter.error)throw Error('encounter_unavailable');
  readingBattle.begin(profile,encounter);
  currentPayload=null;deck=readingLessonDeck(eligibleWords);rows=[];started=Date.now();$('round-scope').textContent=eligibleWords.length>=5?'本回合：老師已勾選的注音範圍。':'符合詞語不足五題，本回合從全部題庫出題。';show('play');renderQuestion();
 }catch{lessonReady=false;$('lesson-status').textContent='尚未取得最新的注音設定。';$('home-message').textContent='還沒連上老師的任務，請確認網路後按「更新注音設定」。';$('reload').hidden=false;}
 finally{starting=false;$('seat').disabled=false;$('start').disabled=!lessonReady||!cloudReady||config?.readingWrites!==true;$('reload').disabled=false;}
}
function finish(){
 cancel();show('result');readingBattle.result(0);const correct=rows.filter(r=>r.firstCorrect).length,stars=readingStars(correct);
 $('score').textContent=`答對 ${correct} / 5 題`;$('stars').textContent=stars?'⭐'.repeat(stars):'再接再厲';
 $('review').replaceChildren();for(const row of rows){const word=READING_WORDS.find(w=>w.id===row.wordId),p=document.createElement('p');p.textContent=`${row.firstCorrect?'✓':'再練練'}　${word.word}　${word.zhuyin}`;$('review').append(p);}
 if(demo){readingBattle.result(stars,creditDemoMonster(seat,readingRoundId,correct===5));$('save-status').textContent=`老師試玩：本回合 ${stars} 顆星星，不傳送學生成績。`;$('retry-save').hidden=true;return;}
 currentPayload={kind:'round',mode:'reading',roundId:readingRoundId,monsterBattle:1,seat,total:5,mistakes:5-correct,seconds:Math.round((Date.now()-started)/1000),results:rows};
 pending.push(currentPayload);const stored=storePending();$('save-status').textContent=stored?'正在儲存紀錄與星星…':'此裝置無法暫存，請保持頁面開啟，等待儲存完成。';flushPending();
}
async function flushPending(){
 if(saving||demo||!seat)return;saving=true;$('retry-save').disabled=true;
 try{if(!await auth.ensure(seat))throw Error('authentication_required');
 for(const payload of [...pending].filter(p=>p.seat===seat)){
  const out=await auth.request(payload);if(out.saved!==true)throw Error(out.error||'unconfirmed');
  pending=pending.filter(p=>p.roundId!==payload.roundId);storePending();
  if(payload.roundId===currentPayload?.roundId){$('save-status').textContent=`紀錄已儲存，獲得 ${out.awards[0].stars} 顆星星！`;readingBattle.result(out.awards[0].stars,out.awards[0]);}
 }
 if(!currentPayload)$('home-message').textContent='之前暫存的朗讀紀錄已儲存。';
 }catch{const stored=storePending();const message=stored?'紀錄已暫存，星星尚未確認入帳。請重新儲存。':'紀錄尚未儲存，請勿關閉此頁，請重新儲存。';if(currentPayload)$('save-status').textContent=message;else $('home-message').textContent=message;}
 finally{saving=false;$('retry-save').disabled=false;$('retry-save').hidden=!pending.some(p=>p.seat===seat);$('recover-pending')?.remove();if(pending.some(p=>p.seat===seat)&&!currentPayload){const b=document.createElement('button');b.id='recover-pending';b.className='secondary';b.textContent='儲存先前的朗讀紀錄';b.onclick=flushPending;$('home-message').after(b);}}
}
async function load(){
 $('wordbank-count').textContent=`題庫共有 ${READING_WORDS.length.toLocaleString('zh-TW')} 個詞語，每回合隨機抽 5 題。`;
 $('reload').hidden=true;$('reload').disabled=true;$('start').disabled=true;lessonReady=false;
 if(demo){$('home-message').textContent='雲端朗讀需要登入正式遊戲，請從主畫面選座號並登入。';return;}
 if(!supported){$('home-message').textContent=globalThis.isSecureContext?'這個瀏覽器無法錄音，請更新系統或請老師協助。':'錄音需要安全連線，請以 HTTPS 遊戲網址開啟。';return;}
 try{await refreshLesson();
 if(!cloudReady)return;
 if(!config.readingWrites){$('home-message').textContent='第四關已準備好，目前尚未開放。請等待老師通知。';return;}
 $('mic-check').hidden=false;
 $('seat').replaceChildren(new Option('選擇座號',''));for(const s of config.seats)$('seat').append(new Option(s+' 號',s));
 $('seat').value=demo?'01':auth.currentSeat();seat=$('seat').value;$('seat-label').hidden=demo;
 $('home-message').textContent=demo?'老師試玩模式：沿用本班出題規則，不記錄成績。':'準備好後，按開始進入朗讀。';$('start').disabled=false;
 if(!demo&&seat&&pending.some(p=>p.seat===seat))flushPending();
 }catch{lessonReady=false;$('lesson-status').textContent='尚未取得最新的注音設定。';$('home-message').textContent='還沒連上老師的任務，請確認網路後重試。';$('reload').hidden=false;}
 finally{$('reload').disabled=false;}
}
function leave(){cancel();$('leave-dialog').showModal();}
function home(){cancel();readingBattle.clear();show('intro');currentPayload=null;}
function hasUnsaved(){return pending.some(p=>p.seat===seat);}
window.addEventListener('beforeunload',e=>{if(!$('play').hidden||hasUnsaved()){e.preventDefault();e.returnValue='';}});
document.querySelectorAll('#home-link,a.home').forEach(a=>a.addEventListener('click',e=>{if(!$('play').hidden){e.preventDefault();leave();}}));
window.addEventListener('online',()=>{if(hasUnsaved())flushPending();});
window.addEventListener('pageshow',()=>{if(!$('play').hidden&&!locked&&!micBusy&&!speech?.busy)$('tap-record').disabled=!supported;});
 $('seat').onchange=()=>{seat=$('seat').value;if(seat!==auth.currentSeat())auth.forgetAll();if(pending.some(p=>p.seat===seat))flushPending();};
 $('start').onclick=start;$('reload').onclick=load;$('next').onclick=()=>{if(!locked)return;rows.length===5?finish():renderQuestion();};
 $('leave').onclick=leave;$('stay').onclick=()=>$('leave-dialog').close();$('confirm-leave').onclick=()=>{$('leave-dialog').close();home();};
 $('again').onclick=()=>{if(hasUnsaved()){$('save-status').textContent='請先儲存這次紀錄，再開始下一回合。';return;}home();start();};
 $('retry-save').onclick=flushPending;
load();
