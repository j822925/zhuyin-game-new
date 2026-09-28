// start(audioTrack) is supported by desktop Chromium 135+, but not Safari/iPad
// or Android. Other engines must use their native default-microphone path.
export function supportsReadingAudioTrack({userAgent='',platform='',maxTouchPoints=0}={}){
 if(/Android|iPhone|iPad|iPod/.test(userAgent)||(platform==='MacIntel'&&maxTouchPoints>1))return false;
 return Number(userAgent.match(/(?:Chrome|Chromium)\/(\d+)/)?.[1]||0)>=135;
}
// One recognition instance per press; stale callbacks can never answer a new item.
export function createReadingSpeech({Recognition,onState,onResult,onError,getAudioStream,onInput=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=null;
 function clear(run){clearTimer(run.timer);clearTimer(run.deadline);}
 function close(run){run.stream?.getTracks().forEach(t=>t.stop());run.stream=null;}
 function cancel(){const run=active;if(!run)return;active=null;clear(run);try{run.recognition.abort();}catch{}close(run);onState('idle');}
 function start({deviceId=''}={}){
  if(active)return false;
  const recognition=new Recognition(),run={recognition,started:false,capturing:false,heard:false,released:false,transcript:''};active=run;
  recognition.lang='zh-TW';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
  const current=()=>active===run;
  const emptyReason=()=>!run.capturing?'mic-not-ready':run.heard?'no-result':'no-speech';
  function fail(code){if(!current())return;active=null;clear(run);try{recognition.abort();}catch{}close(run);onState('idle');onError(code);}
  function stop(){if(!current()||!run.started)return;try{recognition.stop();}catch{fail('audio-capture');}}
  run.stop=stop;
  function capturing(){if(!current()||run.capturing||run.released)return;run.started=true;run.capturing=true;clearTimer(run.deadline);run.timer=setTimer(()=>release(),12000);onState('listening');}
  recognition.onstart=()=>{if(!current())return;run.started=true;if(run.stream)capturing();};
  recognition.onaudiostart=capturing;
  recognition.onsoundstart=()=>{capturing();};
  recognition.onspeechstart=()=>{if(!current())return;capturing();run.heard=true;if(!run.released)onState('hearing');};
  recognition.onresult=e=>{if(!current())return;let text='';for(let i=0;i<e.results.length;i++){if(e.results[i][0]?.transcript?.trim())run.heard=true;if(e.results[i].isFinal)text+=e.results[i][0].transcript;}run.transcript=text;};
  recognition.onerror=e=>fail(e.error==='no-speech'?emptyReason():e.error);
  recognition.onend=()=>{if(!current())return;active=null;clear(run);close(run);onState('idle');if(run.transcript.trim())onResult(run.transcript);else onError(emptyReason());};
  run.fail=fail;
  onState('starting');
  run.deadline=setTimer(()=>fail('mic-not-ready'),15000);
  if(getAudioStream){
   // This promise belongs to this run; permission may resolve after cancel/leave.
   Promise.resolve().then(()=>current()?getAudioStream(deviceId):null).then(stream=>{
    if(!stream)return;
    if(!current()){stream.getTracks().forEach(t=>t.stop());return;}
    run.stream=stream;const track=stream.getAudioTracks()[0];
    if(!track||track.kind!=='audio'||track.readyState!=='live'){fail('audio-capture');return;}
    onInput(track.label||'選擇的麥克風');recognition.start(track);
   }).catch(e=>fail(e.name==='NotAllowedError'?'not-allowed':e.name==='OverconstrainedError'?'device-missing':'audio-capture'));
   return true;
  }
  // Safari requires this native start to stay synchronous with the user's tap.
  try{onInput('瀏覽器預設麥克風');recognition.start();}catch{fail('audio-capture');return false;}return true;
 }
 function release(){const run=active;if(!run||run.released)return;
  if(!run.capturing){run.fail('too-short');return;}
  run.released=true;clear(run);run.deadline=setTimer(()=>run.fail('timeout'),10000);onState('processing');run.stop();
 }
 return {start,release,cancel,get busy(){return !!active;}};
}
