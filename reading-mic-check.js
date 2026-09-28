// Local, user-triggered hardware check. No fetch, storage, scoring or transcription.
// Do not reset an unused media element between questions. On iPad, even media
// playback/session changes can interfere with native speech recognition.
export function clearMicPlayback(player,url,revoke=URL.revokeObjectURL){
 if(!player.paused)player.pause();
 if(player.hasAttribute('src')){player.removeAttribute('src');player.load();}
 player.hidden=true;
 if(url)revoke(url);
}
export function createMicCheck({getUserMedia,Recorder,onState,onClip,onStream=()=>{},makeBlob=parts=>new Blob(parts,{type:parts[0]?.type||''}),setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=null;
 const close=run=>{clearTimer(run.timer);run.stream?.getTracks().forEach(track=>track.stop());};
 function cancel(){const run=active;if(!run)return;active=null;close(run);if(run.recorder?.state==='recording')run.recorder.stop();onState('idle');}
 async function start({deviceId=''}={}){
  if(active)return;const run={parts:[]};active=run;onState('permission');
  run.timer=setTimer(()=>{if(active!==run)return;cancel();onState('permission-timeout');},20000);
  try{
   const stream=await getUserMedia({audio:deviceId?{deviceId:{exact:deviceId}}:true});if(active!==run){stream.getTracks().forEach(t=>t.stop());return;}run.stream=stream;clearTimer(run.timer);onStream(stream);
   const recorder=new Recorder(stream);run.recorder=recorder;
   recorder.ondataavailable=e=>{if(active===run&&e.data.size)run.parts.push(e.data);};
   recorder.onerror=()=>{if(active!==run)return;active=null;close(run);onState('error');};
   recorder.onstop=()=>{if(active!==run)return;active=null;close(run);const blob=makeBlob(run.parts);if(blob.size){onClip(blob);onState('ready');}else onState('empty');};
   recorder.start();onState('recording');run.timer=setTimer(()=>{if(active!==run)return;recorder.stop();close(run);},4000);
  }catch(e){if(active!==run)return;active=null;close(run);onState(e.name==='NotAllowedError'?'denied':['NotFoundError','OverconstrainedError'].includes(e.name)?'missing':'error');}
 }
 return {start,cancel,get busy(){return !!active;}};
}
