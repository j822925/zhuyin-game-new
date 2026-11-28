import {createHandwriting} from './hanzi-handwriting.js';
import {gradeReading} from './hanzi-bank.js';
import {gradeCopy} from './hanzi-copy-core.js';
import {answer as sumAnswer,hint as mathHint} from './arithmetic-core.js';
import {audioSource} from './audio-source.js?v=20261102-a1';
import {appendToneTarget} from './adventure-tone-question.js';
const node=(tag,txt,cls)=>{const e=document.createElement(tag);e.textContent=txt||'';if(cls)e.className=cls;return e;};
const button=(txt,fn)=>{const e=node('button',txt);e.type='button';e.onclick=fn;return e;};
export function mountLearningInput(r,q,onAnswer,current){
 const controller=new AbortController(),signal=controller.signal,mode=q.mode==='weekly'?'reading':q.mode;
 let board=null,audio=null;
 const alive=()=>!signal.aborted&&current()&&r.controls.isConnected;
 function answer(ok,hint){if(alive())onAnswer(ok,hint);}
 function dispose(){controller.abort();board?.destroy();audio?.pause();}
 async function render(){
  board?.destroy();board=null;r.controls.replaceChildren();
  if(q.audio){
   const play=button('🔊 聽題目',()=>{audio?.pause();audio=new Audio(audioSource(q.audio));audio.play().catch(()=>{if(alive())r.note.textContent='請再點一次聽題目。';});});
   r.controls.append(play);if(q.mode==='tone')appendToneTarget(r.controls,{...q,targetCharacter:[...q.label][q.targetIndex]});
   const keys=node('div','','study-keys');r.controls.append(keys);
   function choices(list,expected,then){keys.replaceChildren();for(const value of list)keys.append(button(value||'空白',()=>{if(!alive())return;if(value===expected&&then){then();return;}answer(value===expected,'再聽一次題目。');}));}
   if(q.parts)choices(q.parts.initial,q.initial,()=>{r.note.textContent=(q.initial||'空白')+' ＋ □';choices(q.parts.final,q.final);});else choices(q.choices,q.answer);
   return;
  }
    let input='',tone=null,locked=false,writing=false,interrupted=false;
    const actions=node('div','','study-actions'),keys=node('div','','study-keys'),value=node('output','');
    let alternatives=[];
    const strike=button('出招',submit);
    const update=()=>{value.textContent=input+(tone||'')||'　';};
    const clear=()=>{input='';tone=null;update();board?.clear();};
    function submit(){
      if(locked||!alive()||writing||board?.isTracePractice())return;

      let ok=false;
      if(mode==='math')ok=input!==''&&Number(input)===sumAnswer(q.q);
      else if(mode==='reading')ok=tone!==null&&gradeReading(q,input+tone).correct;
      else if(board&&!interrupted&&board.getStrokes().length)ok=(q.mode==='copy'||q.mode==='name-copy'?gradeCopy(board.getStrokes(),board.getReference()):board.grade({gradingPolicy:'automatic-v1',alternatives})).correct===true;
      if(!input&&!board&&mode!=='math')return;
      if((mode==='math'&&input==='')||(mode==='reading'&&tone===null))return;
      answer(ok,mode==='math'?mathHint(q.q):mode==='reading'?'再看看國字和聲調。':'再試著寫一次。');
    }
    if(mode==='math'||mode==='reading'){
      keys.dataset.kind=mode;const labels=mode==='math'?[...'1234567890']:[...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ','一聲','ˊ','ˇ','ˋ','˙'];
      for(const k of labels)keys.append(button(k,()=>{if(mode==='reading'&&['一聲','ˊ','ˇ','ˋ','˙'].includes(k))tone=k==='一聲'?'':k;else if(input.length<(mode==='math'?5:3))input+=k;update();}));
      r.controls.append(value,keys);
    }else{
      const holder=node('div','','study-ink');r.controls.append(holder);
      const pad=createHandwriting(holder,{allowDemo:true,traceFeedbackElement:r.note,onChange:i=>{writing=i.isDrawing;interrupted=i.inputInterrupted||i.inputTooComplex;}});board=pad;
      try{const reference=await pad.load(q.character);if(!alive())return;if(!reference)throw Error('reference-unavailable');
        alternatives=await Promise.all((q.similar||[]).map(async char=>{
          const url=new URL('./data/hanzi-strokes/U'+char.codePointAt(0).toString(16).toUpperCase()+'.json',import.meta.url);
          const response=await fetch(url,{signal:signal});
          return response.ok?response.json():null;
        }));alternatives=alternatives.filter(Boolean);}
      catch{if(alive()){r.note.textContent='這個字的筆順暫時讀不到。';r.controls.replaceChildren(button('再試一次',()=>void render()));}return;}
      if(!alive())return;
      const demo=button('看筆順',async()=>{if(locked||pad.isTracePractice())return;locked=true;try{await pad.showDemo();}finally{locked=false;}});
      const trace=button('開啟淡色底字',()=>{
        if(locked||writing||!alive())return;
        const tracing=pad.setTracePractice(!pad.isTracePractice());
        trace.setAttribute('aria-pressed',String(tracing));
        trace.textContent=tracing?'關閉底字，自己寫':'開啟淡色底字';
        demo.hidden=tracing;
        strike.disabled=tracing;
        if(!tracing)r.note.textContent='換你自己從空白格寫一次。';
      });
      trace.setAttribute('aria-pressed','false');actions.append(demo,trace);
    }
    actions.append(button('重寫',clear),strike);r.controls.append(actions);
  }
 void render();return dispose;
}
