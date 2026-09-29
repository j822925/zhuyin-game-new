import {createLocalRecorder,prepareLocalAudio} from './reading-local-core.js?v=20260928-local1';
import {encodeReadingWav,readingBase64} from './reading-cloud-audio.js?v=20260929-cloud1';
export function createCloudReadingSpeech({getUserMedia,Recorder,decode,transcribe,onState,onResult,onError,onInput=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
 let run=null,deviceId='';
 const fail=(current,code)=>{if(run!==current)return;run=null;clearTimer(current.timer);current.controller.abort();recorder.cancel();onState('idle');onError(code);};
 const recorder=createLocalRecorder({Recorder,getUserMedia:async()=>{
  const current=run;
  const stream=await getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,...(deviceId?{deviceId:{exact:deviceId}}:{})}});
  if(run===current)onInput(stream.getAudioTracks()[0]?.label||'內建麥克風');return stream;
 },onState(state){if(run&&state!=='idle')onState(state);},onError(code){if(run)fail(run,code);},onClip:async blob=>{
  const current=run;if(!current)return;onState('processing');
  current.timer=setTimer(()=>fail(current,'timeout'),35000);
  try{
   if(blob.size>2*1024*1024)throw Error('invalid-audio');
   const buffer=await decode(blob);if(run!==current)return;
   const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
   const audio=readingBase64(encodeReadingWav(prepareLocalAudio(channels,buffer.sampleRate)));
   if(run!==current)return;
   const response=await transcribe(audio,current.controller.signal);if(run!==current)return;
   if(response?.error)throw Error(response.error);
   if(typeof response?.text!=='string'||!response.text.trim())throw Error('no-speech');
   clearTimer(current.timer);run=null;onState('idle');onResult(response.text);
  }catch(e){if(run===current)fail(current,e.message||'network');}
 }});
 return {start(options={}){if(run)return;run={controller:new AbortController()};deviceId=options.deviceId||'';recorder.start();},release(){recorder.stop();},cancel(){const current=run;run=null;if(current){clearTimer(current.timer);current.controller.abort();}recorder.cancel();onState('idle');},get busy(){return !!run;}};
}
