import {audioSource} from './audio-source.js?v=20260928-all1';
import {BASE} from './core.js?v=20260928-all1';
import {tutorClips} from './little-teacher.js?v=20260928-all1';
// Answers are supplied only after submission. Empty parts have no sound.
export function reviewClips(value){
 if(value.mode!=='spelling')return [value.audio];
 const label=String(value.label||'').replace(/[ˊˇˋ˙\s]/g,'').replaceAll('一','ㄧ');
 const initial=BASE.slice(0,21).includes(label[0])?label[0]:'';
 const mark=String(value.label||'').match(/[ˊˇˋ˙]/)?.[0];
 const tone=mark?{'ˊ':2,'ˇ':3,'ˋ':4,'˙':5}[mark]:1;
 return tutorClips({initial,final:label.slice(initial.length),tone,audio:value.audio});
}
function pauseBetween(ms,signal){return new Promise((resolve,reject)=>{
 const abort=()=>{clearTimeout(timer);reject(Error('cancelled'));};
 const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
 signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
});}
// Completion means an actual ended event, not merely a resolved play() promise.
export function playToEnd(audio,{signal,timeoutMs=20000}={}){
 return new Promise((resolve,reject)=>{
  let timer,done=false;
  const cleanup=()=>{clearTimeout(timer);audio.removeEventListener('ended',ended);audio.removeEventListener('error',failed);signal?.removeEventListener('abort',cancelled);};
  const finish=error=>{if(done)return;done=true;cleanup();if(error){audio.pause();reject(error);}else resolve();};
  const ended=()=>finish(),failed=()=>finish(Error('audio_failed')),cancelled=()=>finish(Error('cancelled'));
  audio.addEventListener('ended',ended);audio.addEventListener('error',failed);signal?.addEventListener('abort',cancelled,{once:true});
  if(signal?.aborted){cancelled();return;}
  timer=setTimeout(failed,timeoutMs);
  try{audio.currentTime=0;Promise.resolve(audio.play()).catch(failed);}catch{failed();}
 });
}
export async function playTutorOnce(audio,question,{signal,gapMs=150}={}){
 const clips=tutorClips(question),cancellation=signal||new AbortController().signal;
 for(let i=0;i<clips.length;i++){
  if(cancellation.aborted)throw Error('cancelled');
  audio.src=audioSource(clips[i]);await playToEnd(audio,{signal:cancellation});
  if(i<clips.length-1&&gapMs)await pauseBetween(gapMs,cancellation);
 }
}
export function createExamReview({audio,button,status,onDone,gapMs=150}){
 let controller=null,review=null,count=0,step=0,clips=[],running=false,generation=0;
 function stop(){generation++;controller?.abort();audio.pause();running=false;review=null;}
 async function play(){
  if(running||!review)return;running=true;button.disabled=true;const v=generation;controller=new AbortController();
  try{
   while(count<2){
    while(step<clips.length){
     status.textContent=`🔊 第 ${count+1} 遍／共 2 遍・${step===clips.length-1?'完整題目':'注音 '+(step+1)}`;
     audio.src=audioSource(clips[step]);await playToEnd(audio,{signal:controller.signal});if(v!==generation)return;step++;
     if(step<clips.length&&gapMs)await pauseBetween(gapMs,controller.signal);
    }
    count++;step=0;if(count<2&&clips.length>1&&gapMs)await pauseBetween(gapMs,controller.signal);
   }
   status.textContent='✓ 已完整聽兩遍，正在接續小考…';await onDone(review.index);
  }catch(e){if(v!==generation)return;status.textContent='🔊 聲音沒有播完。請確認音量與連線，再點喇叭繼續。';}
  finally{if(v===generation){running=false;button.disabled=false;button.textContent=count>=2?'✓ 接續小考':`🔊 繼續聽第 ${count+1} 遍`;}}
 }
 button.onclick=play;
 return {stop,show(value){stop();review=value;count=0;step=0;clips=reviewClips(value);button.textContent='🔊 一起再聽兩遍';button.disabled=false;void play();}};
}
