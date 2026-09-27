// One recognition instance per press; stale callbacks can never answer a new item.
export function createReadingSpeech({Recognition,onState,onResult,onError,setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=null;
 function clear(run){clearTimer(run.timer);clearTimer(run.deadline);}
 function cancel(){const run=active;if(!run)return;active=null;clear(run);try{run.recognition.abort();}catch{}onState('idle');}
 function start(){
  if(active)return false;
  const recognition=new Recognition(),run={recognition,started:false,capturing:false,heard:false,released:false,transcript:''};active=run;
  recognition.lang='zh-TW';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
  const current=()=>active===run;
  const emptyReason=()=>!run.capturing?'mic-not-ready':run.heard?'no-result':'no-speech';
  function fail(code){if(!current())return;active=null;clear(run);try{recognition.abort();}catch{}onState('idle');onError(code);}
  function stop(){if(!current()||!run.started)return;try{recognition.stop();}catch{fail('audio-capture');}}
  run.stop=stop;
  function capturing(){if(!current()||run.capturing||run.released)return;run.capturing=true;clearTimer(run.deadline);run.timer=setTimer(()=>release(),12000);onState('listening');}
  recognition.onstart=()=>{if(!current())return;run.started=true;};
  recognition.onaudiostart=capturing;
  recognition.onsoundstart=()=>{capturing();};
  recognition.onspeechstart=()=>{if(!current())return;capturing();run.heard=true;if(!run.released)onState('hearing');};
  recognition.onresult=e=>{if(!current())return;let text='';for(let i=0;i<e.results.length;i++){if(e.results[i][0]?.transcript?.trim())run.heard=true;if(e.results[i].isFinal)text+=e.results[i][0].transcript;}run.transcript=text;};
  recognition.onerror=e=>fail(e.error==='no-speech'?emptyReason():e.error);
  recognition.onend=()=>{if(!current())return;active=null;clear(run);onState('idle');if(run.transcript.trim())onResult(run.transcript);else onError(emptyReason());};
  run.fail=fail;
  onState('starting');
  run.deadline=setTimer(()=>fail('mic-not-ready'),15000);
  try{recognition.start();}catch{fail('audio-capture');return false;}return true;
 }
 function release(){const run=active;if(!run||run.released)return;
  if(!run.capturing){run.fail('too-short');return;}
  run.released=true;clear(run);run.deadline=setTimer(()=>run.fail('timeout'),10000);onState('processing');run.stop();
 }
 return {start,release,cancel,get busy(){return !!active;}};
}
