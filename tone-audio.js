// One reusable audio element; stale callbacks never finish the next question.
export function createToneAudio({element=new Audio(),timeoutMs=20000}={}){
 let finishCurrent=null;
 function stop(){if(finishCurrent)finishCurrent(Error('已停止播放'));element.pause();}
 return {stop,element,play(url,speed=.75){
  stop();return new Promise((resolve,reject)=>{
   let settled=false;
   const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);element.removeEventListener('ended',ended);element.removeEventListener('error',failed);if(finishCurrent===finish)finishCurrent=null;if(error){element.pause();reject(error);}else resolve();};
   const ended=()=>finish(),failed=()=>finish(Error('音檔尚未載入，請檢查網路後再聽一次。'));
   const timer=setTimeout(()=>finish(Error('等候聲音逾時，請再聽一次。')),timeoutMs);finishCurrent=finish;
   element.addEventListener('ended',ended);element.addEventListener('error',failed);
   element.src=url;element.playbackRate=([.75,.85,1].includes(speed)?speed:.75)/.75;
   element.preservesPitch=true;element.webkitPreservesPitch=true;
   try{Promise.resolve(element.play()).catch(()=>finish(Error('請點「再聽一次」開始播放聲音。')));}catch{failed();}
  });}
 };
}
