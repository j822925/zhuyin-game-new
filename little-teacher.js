import {audioSource} from './audio-source.js?v=20260923-provided1';
import {SUPPLIED_TUTOR_AUDIO} from './data/supplied-audio.js?v=20260923-provided1';
import {BASE,COMPOUNDS} from './core.js?v=20260913-tutor1';
import {setVerticalSymbols,showSpellingTone} from './spelling-layout.js?v=20260913-tutor1';
export function tutorClips(q){
 const symbolAudio=s=>SUPPLIED_TUTOR_AUDIO[s]||(BASE.includes(s)?'audio/audio_F'+(BASE.indexOf(s)+1)+'.WAV':'audio/compound/c'+String(COMPOUNDS.indexOf(s)+1).padStart(2,'0')+'.mp3');
 return [symbolAudio(q.initial),symbolAudio(q.final),q.audio];
}
export function createLittleTeacher({onReturn}){
 const dialog=document.createElement('dialog');dialog.id='tutor-dialog';dialog.setAttribute('aria-label','小老師拼音示範');
 dialog.innerHTML=`<div class="tutor-heading"><img src="assets/characters/cozy-v1/owl.png" alt="小老師"><span aria-hidden="true">🎓</span></div><div class="tutor-answer"><div class="tutor-part" data-part="0"></div><span class="spelling-tone" hidden></span><div class="tutor-part" data-part="1"></div></div><p class="tutor-status" role="status"></p><div class="tutor-actions"><button class="secondary" data-tutor-replay aria-label="再聽小老師示範">🔊 ↻</button><button class="primary" data-tutor-return aria-label="蓋住答案，換我拼">🙋 ▶</button></div>`;
 document.body.append(dialog);
 const voice=new Audio(),answer=dialog.querySelector('.tutor-answer'),parts=[...dialog.querySelectorAll('[data-part]')],status=dialog.querySelector('.tutor-status');let clips=[],generation=0,step=0,timer;
 function stop(){generation++;clearTimeout(timer);voice.pause();voice.onended=null;voice.onerror=null;parts.forEach(p=>p.classList.remove('speaking'));answer.classList.remove('speaking');}
 async function playStep(token){
  if(token!==generation||!dialog.open)return;
  parts.forEach((p,i)=>p.classList.toggle('speaking',step===i));answer.classList.toggle('speaking',step===2);status.textContent=['① 👂','② 👂','③ 👂'][step];
  voice.src=audioSource(clips[step]);
  const fail=()=>{if(token!==generation)return;stop();status.textContent='🔇 請按 🔊 重試';};
  voice.onerror=fail;
  voice.onended=()=>{if(token!==generation)return;if(step<2){step++;timer=setTimeout(()=>playStep(token),450);}else{stop();status.textContent='🙋 ✨';}};
  try{await voice.play();}catch{fail();}
 }
 function replay(){stop();step=0;playStep(generation);}
 function close(resume=true){const wasOpen=dialog.open;stop();dialog.close();if(wasOpen&&resume)onReturn();}
 dialog.querySelector('[data-tutor-replay]').onclick=replay;
 dialog.querySelector('[data-tutor-return]').onclick=()=>close();
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {get open(){return dialog.open;},show(q){stop();clips=tutorClips(q);setVerticalSymbols(parts[0],q.initial);setVerticalSymbols(parts[1],q.final);parts[0].setAttribute('aria-label',q.initial);parts[1].setAttribute('aria-label',q.final);showSpellingTone(answer,q);dialog.showModal();replay();},close:()=>close(false)};
}
