import {prepareLocalAudio,createLocalRecorder} from './reading-local-core.js?v=20260928-local1';
import {matchesReading,READING_WORDS} from './reading-core.js?v=20260928-all1';
const $=id=>document.getElementById(id),words=['apple','school','giraffe','happy','colorful'].map(id=>READING_WORDS.find(w=>w.id===id));
let worker,pending,requestId=0,epoch=0,ready=false,busy=false,index=0,recordState='idle';
const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
$('context').textContent=standalone?'目前：主畫面模式（正是這次要測的模式）':'目前：瀏覽器分頁。要確認主畫面可用，請按下方說明加入主畫面再試。';
function controls(){
 $('prepare').disabled=busy;$('record').disabled=!ready||(busy&&recordState!=='listening');$('next').disabled=busy;$('audio-file').disabled=!ready||busy;$('cancel').hidden=!busy;
 $('record').textContent=recordState==='listening'?'我讀完了，點一下送出':busy?'請稍候…':'點一下開始錄音';
}
function stopWorker(){worker?.terminate();worker=null;ready=false;if(pending){clearTimeout(pending.timer);pending.reject(Error('cancelled'));pending=null;}$('setup').hidden=false;}
function rpc(type,audio){
 if(pending)return Promise.reject(Error('busy'));
 if(!worker){worker=new Worker(new URL('./reading-local-worker.js?v=20260928-local1',import.meta.url),{type:'module'});worker.onmessage=({data})=>{
  if(!pending||pending.id!==data.id)return;
  if(data.type==='progress'){const pct=data.total?Math.round(data.loaded/data.total*100):0;$('status').textContent=`正在下載模型檔案：${pct}%（不同檔案會分別顯示進度）`;$('download').hidden=false;$('download').max=100;$('download').value=pct;return;}
  const p=pending;pending=null;clearTimeout(p.timer);data.type==='error'?p.reject(Error(data.message)):p.resolve(data);
 };worker.onerror=()=>{const p=pending;pending=null;if(p){clearTimeout(p.timer);p.reject(Error('worker-error'));}};}
 const id=++requestId;
 return new Promise((resolve,reject)=>{pending={id,resolve,reject,timer:setTimeout(()=>{const p=pending;pending=null;worker?.terminate();worker=null;ready=false;if(p)p.reject(Error('timeout'));},type==='prepare'?300000:90000)};worker.postMessage({id,type,audio},audio?[audio.buffer]:[]);});
}
const errorText={'silence':'錄音太小聲或沒有足夠聲音，請靠近麥克風再試。','too-short':'錄音太短，請完整讀完再送出。','too-long':'請選十二秒以內的短音檔。','permission-denied':'請允許這個網站使用麥克風，再重試。','permission-timeout':'等待麥克風權限逾時，請重試。','timeout':'這台裝置準備或辨識花太久，已停止。可再試一次，或先使用正式版 Safari 朗讀。','record-error':'錄音未能完成，請確認麥克風權限，再試一次。','worker-error':'辨識程式無法啟動，請確認網路與可用記憶體，再重新準備。','file-large':'請選擇 10 MB 以內的短音檔。'};
function showError(e){$('status').textContent=errorText[e.message]||'這次無法完成辨識。請重新準備模型，或換短一點的錄音。';$('diagnostic').textContent='技術訊息：'+String(e.message).slice(0,250);}
function render(){
 const w=words[index];$('progress').textContent=`試讀 ${index+1} / 5`;$('word').replaceChildren();$('result').textContent='';
 for(const value of w.zhuyin.split(' ')){const group=document.createElement('span');group.className='syllable';const tone=value.match(/[ˊˇˋ˙]/)?.[0]||'';for(const symbol of value.replace(/[ˊˇˋ˙]/g,'')){const s=document.createElement('span');s.textContent=symbol;group.append(s);}if(tone){const t=document.createElement('span');t.className='tone'+(tone==='˙'?' neutral':'');t.textContent=tone;group.append(t);}$('word').append(group);}
 $('next').textContent=index===4?'回第一個詞語 →':'下一個詞語 →';
}
async function recognize(blob){
 const turn=++epoch,question=words[index];busy=true;controls();$('result').textContent='';$('status').textContent='裝置正在辨識，請留在這一頁…';
 try{
  if(blob.size>10*1024*1024)throw Error('file-large');
  const Decoder=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
  const decoder=new Decoder(1,1,16000),buffer=await decoder.decodeAudioData(await blob.arrayBuffer());
  if(turn!==epoch)return;
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  const audio=prepareLocalAudio(channels,buffer.sampleRate);
  const result=await rpc('transcribe',audio);if(turn!==epoch)return;
  const text=result.text.trim(),same=matchesReading(question,text),seconds=result.seconds.toFixed(1);
  $('result').textContent=text?`辨識文字：「${text}」｜${same?'與題目一致':'與題目不同，可以重錄'}`:'沒有辨識到文字，可以重錄。';
  $('status').textContent=`本機辨識完成，用了 ${seconds} 秒。本次不計分。`;
  const row=document.createElement('li');row.textContent=`${question.word} → ${text||'無文字'}（${seconds} 秒；${same?'一致':'不同'}）`;$('history').append(row);while($('history').children.length>20)$('history').firstChild.remove();
 }catch(e){if(turn===epoch&&e.message!=='cancelled'){showError(e);if(!['silence','too-short','too-long','file-large'].includes(e.message))stopWorker();}}
 finally{if(turn===epoch){busy=false;controls();}}
}
const recorder=createLocalRecorder({getUserMedia:c=>navigator.mediaDevices.getUserMedia(c),Recorder:globalThis.MediaRecorder,onState:s=>{recordState=s;busy=s!=='idle';controls();if(s==='starting')$('status').textContent='請允許麥克風，準備好再讀…';if(s==='listening')$('status').textContent='正在聽，請讀出上方詞語。';},onClip:recognize,onError:code=>showError(Error(code))});
$('prepare').onclick=async()=>{const turn=++epoch;busy=true;controls();$('status').textContent='正在準備免費模型，初次下載請稍候…';try{await rpc('prepare');if(turn!==epoch)return;ready=true;$('setup').hidden=true;$('exercise').hidden=false;$('status').textContent='模型準備好了！點錄音按鈕試讀。';render();}catch(e){if(turn===epoch&&e.message!=='cancelled'){showError(e);stopWorker();}}finally{if(turn===epoch){busy=false;$('download').hidden=true;controls();}}};
$('record').onclick=()=>{if(recordState==='listening')recorder.stop();else if(ready&&!busy){$('result').textContent='';recorder.start();}};
$('next').onclick=()=>{if(busy)return;index=(index+1)%words.length;render();$('status').textContent='點一下錄音，讀完整個詞語。';};
$('audio-file').onchange=()=>{const file=$('audio-file').files[0];$('audio-file').value='';if(file&&ready&&!busy)recognize(file);};
function cancel(){++epoch;recorder.cancel();if(pending)stopWorker();busy=false;recordState='idle';$('download').hidden=true;$('status').textContent='已停止，可重新準備或錄音。';controls();}
$('cancel').onclick=cancel;document.addEventListener('visibilitychange',()=>{if(document.hidden&&busy)cancel();});window.addEventListener('pagehide',()=>{cancel();stopWorker();});
if(!isSecureContext||!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder||!globalThis.Worker){$('prepare').disabled=true;$('status').textContent='目前環境無法執行這個試驗，請使用 iPad 上的正式 HTTPS 網址。';}
