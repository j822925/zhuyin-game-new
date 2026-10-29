import {readingAttemptDecision} from './reading-core.js?v=20261023-life1';
import {createReadingSpeech} from './reading-speech.js?v=20261029-auto1';
import {readSpeechAutoFinish,saveSpeechAutoFinish,speechDiagnostic} from './reading-speech-mode.js?v=20261029-auto1';
export function readingExamAnswer(word,text){const decision=readingAttemptDecision(word,text);return decision==='correct'?'yes':decision==='incorrect'?'no':null;}
export function createReadingExamInput(root,onAnswer,{Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,apple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}={}){
 root.innerHTML='<div class="reading-exam-word" aria-label="題目注音"></div><button type="button" class="reading-exam-mic">🎙️ 開始錄音</button><p class="reading-exam-status" role="status"></p><details data-speech-settings hidden><summary>⚙️ 給大人</summary><p>相容模式：讀完整個詞語後停一下，自動送出。此裝置記住設定；試用無效可改回。</p><button type="button" data-speech-mode></button><p data-speech-diagnostic></p></details>';
 const wordRoot=root.querySelector('.reading-exam-word'),mic=root.querySelector('button'),status=root.querySelector('[role=status]');let question=null,enabled=false,phase='idle',submitted=false;
 const settings=root.querySelector('[data-speech-settings]'),mode=root.querySelector('[data-speech-mode]'),diagnostic=root.querySelector('[data-speech-diagnostic]');let autoFinish=apple&&readSpeechAutoFinish();settings.hidden=!apple;
 function controls(){mic.disabled=!Recognition||!question||!enabled||submitted||['starting','processing'].includes(phase)||(autoFinish&&phase!=='idle');mic.textContent=phase==='idle'?'🎙️ 開始錄音':phase==='starting'?'準備麥克風…':phase==='processing'?'正在辨識…':autoFinish?'👂 正在聽':'✅ 讀完了，送出';mode.disabled=phase!=='idle';mode.textContent=autoFinish?'↩️ 改回按送出':'🔄 試用相容錄音';mode.setAttribute('aria-pressed',String(autoFinish));}
 const speech=Recognition?createReadingSpeech({Recognition,continuous:apple,finalGraceMs:apple?1200:0,stopDelayMs:apple?350:0,onState(s){phase=s;controls();if(autoFinish&&['listening','hearing'].includes(s))status.textContent='🗣️ 讀完整個詞語，停一下';},onError(code,details){status.textContent=['not-allowed','permission-denied'].includes(code)?'請允許麥克風，或找老師幫忙。':['aborted','start-aborted'].includes(code)?'辨識中止，這題不計分。請找老師查看「給大人」。':'沒有確認到完整讀音，請再讀一次（尚未計分）。';settings.hidden=false;diagnostic.textContent=speechDiagnostic(code,details);},onResult(text){
  if(!question||!enabled||submitted)return;const answer=readingExamAnswer(question,text);
  // Do not persist or transmit speech text: only the existing recognition outcome.
  if(answer===null){status.textContent='這次沒有辨識清楚，請再讀一次（尚未計分）。';return;}
  submitted=true;controls();status.textContent='正在保存這題…';onAnswer(answer);
 }}):null;
 mic.onclick=()=>{if(!enabled||submitted)return;if(speech?.busy)speech.release();else{diagnostic.textContent='';status.textContent='👂 請讀上面的注音';speech?.start({autoFinish});}};
 mode.hidden=!apple;mode.onclick=()=>{if(speech?.busy)return;autoFinish=!autoFinish;const saved=saveSpeechAutoFinish(autoFinish);controls();status.textContent=autoFinish?'🎙️ 點一下，讀完後停一下':'🎙️ 點一下，讀完再送出';diagnostic.textContent=saved?'這台裝置已記住設定。':'此頁已切換；瀏覽器無法記住設定，重開後需再選一次。';};
 function cancel(){enabled=false;question=null;submitted=false;speech?.cancel();phase='idle';controls();}
 function show(q){cancel();question=q;wordRoot.replaceChildren();for(const value of q.zhuyin.split(' ')){const group=document.createElement('span');group.className='reading-exam-syllable';group.setAttribute('aria-label',value);const tone=value.match(/[ˊˇˋ˙]/)?.[0]||'';for(const symbol of value.replace(/[ˊˇˋ˙]/g,'')){const el=document.createElement('span');el.textContent=symbol;group.append(el);}if(tone){const t=document.createElement('span');t.className='reading-exam-tone'+(tone==='˙'?' neutral':'');t.textContent=tone;group.append(t);}wordRoot.append(group);}status.textContent=Recognition?'看注音，讀出來':'這個瀏覽器不支援朗讀辨識，請使用 Safari／Chrome。';controls();}
 function setEnabled(value){enabled=!!value;controls();}
 return {show,setEnabled,cancel,get busy(){return speech?.busy||false;}};
}
