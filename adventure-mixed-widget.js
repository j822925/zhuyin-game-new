import {mixedSource} from './adventure-mixed-questions.js';
import {mountLearningInput} from './adventure-battle-input.js';

export function mixedBattleWidget(sourceFactory=mixedSource){
 let source,key,question,abort,dispose;
 function hide(){abort?.abort();dispose?.();dispose=null;}
 function reset(){hide();source=null;key=null;question=null;}
 async function show(panel,round,answer){
  hide();const request=new AbortController();abort=request;
  const host=document.createElement('section'),prompt=document.createElement('strong'),note=document.createElement('p'),controls=document.createElement('div');
  host.className='mixed-question';controls.className='study-controls';
  host.append(prompt,note,controls);panel.append(host);note.textContent='準備題目中…';
  const alive=()=>!request.signal.aborted&&host.isConnected;
  const timeout=setTimeout(()=>request.abort('timeout'),14000);
  try{
   source??=sourceFactory();if(!source.current())throw Error('請先回學習廣場重新登入。');
   if(round!==key||!question){const next=await source.next(request.signal);if(!alive())return;key=round;question=next;}
   if(!alive()||!source.current())return;
   host.dataset.mode=question.mode;prompt.textContent=question.prompt;note.textContent='';
   dispose=mountLearningInput({note,controls},question,answer,()=>alive()&&source.current());
  }catch(e){
   if(!host.isConnected||abort!==request||request.signal.aborted&&request.signal.reason!=='timeout')return;
   note.textContent=request.signal.reason==='timeout'?'連線較慢，請再試一次。':e.message;
   const retry=document.createElement('button');retry.textContent='重新讀題';retry.onclick=()=>{host.remove();void show(panel,round,answer);};controls.append(retry);
  }finally{clearTimeout(timeout);}
 }
 return {show,reset,hide};
}
