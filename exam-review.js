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
export function createExamReview({audio,button,status,onDone}){
 let controller=null,review=null,count=0,running=false,generation=0;
 function stop(){generation++;controller?.abort();audio.pause();running=false;review=null;}
 async function play(){
  if(running||!review)return;running=true;button.disabled=true;const v=generation;controller=new AbortController();
  try{
   while(count<2){status.textContent=`🔊 正在聽第 ${count+1} 遍／共 2 遍`;await playToEnd(audio,{signal:controller.signal});if(v!==generation)return;count++;}
   status.textContent='✓ 已完整聽兩遍，正在接續小考…';await onDone(review.index);
  }catch(e){if(v!==generation)return;status.textContent='🔊 聲音沒有播完。請確認音量與連線，再點喇叭繼續。';}
  finally{if(v===generation){running=false;button.disabled=false;button.textContent=count>=2?'✓ 接續小考':`🔊 繼續聽第 ${count+1} 遍`;}}
 }
 button.onclick=play;
 return {stop,show(value){stop();review=value;count=0;audio.src=value.audio;button.textContent='🔊 一起再聽兩遍';button.disabled=false;void play();}};
}
