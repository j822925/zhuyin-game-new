// Pure audio preparation for the ungraded on-device experiment. No expected
// answer is ever passed to the recognizer; comparison happens only afterwards.
export function prepareLocalAudio(channels,sampleRate){
 if(!channels.length||!Number.isFinite(sampleRate)||sampleRate<8000)throw Error('audio-format');
 const length=channels[0].length,seconds=length/sampleRate;
 if(seconds<.25)throw Error('too-short');
 if(seconds>12)throw Error('too-long');
 const mono=new Float32Array(length);
 for(const channel of channels){if(channel.length!==length)throw Error('audio-format');for(let i=0;i<length;i++)mono[i]+=(Number.isFinite(channel[i])?channel[i]:0)/channels.length;}
 const step=Math.max(1,Math.round(sampleRate*.02));let voiced=0,first=length,last=0;
 for(let from=0;from<length;from+=step){const to=Math.min(length,from+step);let energy=0;for(let i=from;i<to;i++)energy+=mono[i]*mono[i];if(Math.sqrt(energy/(to-from))>=.008){voiced+=to-from;first=Math.min(first,from);last=to;}}
 if(voiced/sampleRate<.16)throw Error('silence');
 const from=Math.max(0,first-Math.round(sampleRate*.25)),to=Math.min(length,last+Math.round(sampleRate*.25));
 const rate=16000,ratio=sampleRate/rate,count=Math.floor((to-from)/ratio),out=new Float32Array(count+8000);
 for(let j=0;j<count;j++){const a=from+j*ratio,b=Math.min(to,a+ratio);let sum=0;for(let i=Math.floor(a);i<Math.ceil(b);i++)sum+=mono[i]*(Math.min(i+1,b)-Math.max(i,a));out[j+4000]=sum/(b-a);}
 return out;
}

export function createLocalRecorder({getUserMedia,Recorder,onState,onClip,onError,setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=null;
 const close=run=>{clearTimer(run.timer);run.stream?.getTracks().forEach(t=>t.stop());run.stream=null;};
 const fail=(run,code)=>{if(active!==run)return;active=null;close(run);if(run.recorder?.state==='recording')try{run.recorder.stop();}catch{}onState('idle');onError(code);};
 function cancel(){const run=active;if(!run)return;active=null;close(run);if(run.recorder?.state==='recording')try{run.recorder.stop();}catch{}onState('idle');}
 function stop(){const run=active;if(!run?.recorder||run.recorder.state!=='recording'||run.stopping)return;run.stopping=true;clearTimer(run.timer);onState('processing');run.timer=setTimer(()=>fail(run,'record-timeout'),5000);try{run.recorder.stop();run.stream?.getTracks().forEach(t=>t.stop());run.stream=null;}catch{fail(run,'record-error');}}
 async function start(){
  if(active)return;const run={parts:[]};active=run;onState('starting');run.timer=setTimer(()=>fail(run,'permission-timeout'),20000);
  try{
   const stream=await getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
   if(active!==run){stream.getTracks().forEach(t=>t.stop());return;}run.stream=stream;clearTimer(run.timer);
   const mimeType=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>Recorder.isTypeSupported?.(t));
   const recorder=new Recorder(stream,mimeType?{mimeType}:undefined);run.recorder=recorder;
   recorder.ondataavailable=e=>{if(active===run&&e.data.size)run.parts.push(e.data);};
   recorder.onerror=()=>fail(run,'record-error');
   recorder.onstop=()=>{if(active!==run)return;active=null;close(run);const blob=new Blob(run.parts,{type:recorder.mimeType||run.parts[0]?.type||''});run.parts=[];onState('idle');if(blob.size)onClip(blob);else onError('empty');};
   recorder.start();onState('listening');run.timer=setTimer(stop,8000);
  }catch(e){fail(run,e.name==='NotAllowedError'?'permission-denied':'record-error');}
 }
 return {start,stop,cancel,get busy(){return !!active;}};
}
