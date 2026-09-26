// One recognition instance per press; stale callbacks can never answer a new item.
export function createReadingSpeech({Recognition,onState,onResult,onError,setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=null;
 function clear(run){clearTimer(run.timer);clearTimer(run.deadline);}
 function cancel(){const run=active;if(!run)return;active=null;clear(run);try{run.recognition.abort();}catch{}onState('idle');}
 function start(){
  if(active)return false;
  const recognition=new Recognition(),run={recognition,started:false,released:false,transcript:'',failed:false};active=run;
  recognition.lang='zh-TW';recognition.continuous=true;recognition.interimResults=false;recognition.maxAlternatives=1;
  const current=()=>active===run;
  function fail(code){if(!current())return;run.failed=true;active=null;clear(run);try{recognition.abort();}catch{}onState('idle');onError(code);}
  function stop(){if(!current()||!run.started)return;try{recognition.stop();}catch{fail('audio-capture');}}
  run.stop=stop;
  recognition.onstart=()=>{if(!current())return;run.started=true;if(run.released){stop();return;}onState('listening');};
  recognition.onresult=e=>{if(!current())return;let text='';for(let i=0;i<e.results.length;i++)if(e.results[i].isFinal)text+=e.results[i][0].transcript;run.transcript=text;};
  recognition.onerror=e=>fail(e.error);
  recognition.onend=()=>{if(!current())return;active=null;clear(run);onState('idle');if(run.transcript.trim())onResult(run.transcript);else onError('no-speech');};
  onState('starting');
  run.timer=setTimer(()=>release(),12000);
  run.deadline=setTimer(()=>fail('timeout'),22000);
  try{recognition.start();}catch{fail('audio-capture');return false;}return true;
 }
 function release(){const run=active;if(!run||run.released)return;run.released=true;onState('processing');run.stop();}
 return {start,release,cancel,get busy(){return !!active;}};
}
