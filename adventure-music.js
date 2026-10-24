// Forest-only background music. Question audio never goes through this gain node.
export const ZONE_MUSIC_TRACKS=Object.freeze(Object.fromEntries(
 ['bud','stone','sand','sail','shell','whale','watch','port','bridge','deep'].map(id=>[id,`assets/music/zone-${id}-v1.m4a`])
));
export const MUSIC_TRACKS={village:'assets/music/sunny-village-v1.m4a',grove:'assets/music/starlight-forest-v1.m4a',map:'assets/music/horizon-v1.m4a',...ZONE_MUSIC_TRACKS};
export function musicForArea(area){return Object.prototype.hasOwnProperty.call(ZONE_MUSIC_TRACKS,area)?area:area==='grove'?'grove':['forest','room','bedroom','kitchen','bathroom','farm'].includes(area)?'village':area?'map':null;}
export const MUSIC_FADE_OUT_MS=1500;
export const MUSIC_FADE_IN_MS=200;
export function createForestMusic({makeAudio=()=>new Audio(),makeContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),changed=()=>{},schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}={}){
 let audio,context,gain,fadeGain,source,area=null,track=null,enabled=true,unlocked=false,battle=false,hidden=false,disposed=false,ticket=0,resumeTicket=0,failed=false,pending=null,transition=null;
 let envelope={from:0,to:0,start:0,end:0};
 const holds=new Set();
 const state=()=>({area,track,enabled,unlocked,battle,hidden,held:holds.size,playing:!!audio&&!audio.paused,gain:battle?.25:.5,fading:!!transition,failed,needsGesture:enabled&&(!unlocked||context?.state!=='running'||failed)});
 function notify(){changed(state());}
 function permitted(){return !disposed&&enabled&&unlocked&&!hidden&&!holds.size;}
 function envelopeAt(now=context?.currentTime||0){
  if(now>=envelope.end)return envelope.to;
  if(now<=envelope.start)return envelope.from;
  return envelope.from+(envelope.to-envelope.from)*(now-envelope.start)/(envelope.end-envelope.start);
 }
 function rampEnvelope(to,ms=0){
  if(!fadeGain)return;
  const now=context.currentTime,from=envelopeAt(now),end=now+ms/1000,param=fadeGain.gain;
  // Calculate the held value ourselves: older Safari lacks cancelAndHoldAtTime.
  param.cancelScheduledValues(now);param.setValueAtTime(ms?from:to,now);
  if(ms)param.linearRampToValueAtTime(to,end);
  envelope={from:ms?from:to,to,start:now,end};
 }
 function clearTransition(){if(transition){cancel(transition.timer);transition=null;}}
 function stopNow(){
  clearTransition();++ticket;pending=null;rampEnvelope(0);audio?.pause();
 }
 function applyLevel(){
  if(!gain)return;
  const level=battle?.25:.5;
  // Leaving a battle must not boost the old song halfway through its fade.
  if(!transition||level<gain.gain.value)gain.gain.value=level;
 }
 function playCurrent(){
  if(pending||!audio.paused)return;
  const request=++ticket;pending=request;
  try{
   Promise.resolve(audio.play()).then(()=>{
    if(request!==ticket){if(!permitted()||context.state!=='running'||!musicForArea(area)){rampEnvelope(0);audio.pause();}return;}
    pending=null;
    if(!permitted()){stopNow();notify();return;}
    failed=false;
    if(!transition&&context.state==='running')rampEnvelope(1,MUSIC_FADE_IN_MS);
    notify();
   }).catch(()=>{
    if(request!==ticket)return;
    pending=null;failed=true;stopNow();notify();
   });
  }catch{pending=null;failed=true;stopNow();notify();}
 }
 function switchTrack(next){
  ++ticket;pending=null;rampEnvelope(0);audio.pause();
  if(next!==track){track=next;if(next)audio.src=MUSIC_TRACKS[next];}
  applyLevel();if(next)playCurrent();
 }
 function beginTransition(){
  const fading={end:context.currentTime+MUSIC_FADE_OUT_MS/1000,timer:null};
  transition=fading;rampEnvelope(0,MUSIC_FADE_OUT_MS);
  const finish=()=>{
   if(transition!==fading)return;
   if(!permitted()||context.state!=='running'){stopNow();notify();return;}
   // Use the audio clock, not only wall time (a suspended context stops its clock).
   const remaining=(fading.end-context.currentTime)*1000;
   if(remaining>1){fading.timer=schedule(finish,Math.max(20,remaining));return;}
   clearTransition();switchTrack(musicForArea(area));notify();
  };
  fading.timer=schedule(finish,MUSIC_FADE_OUT_MS);
 }
 function sync(gesture=false){
  if(!audio||!permitted()||(context.state!=='running'&&!gesture)){stopNow();notify();return;}
  const next=musicForArea(area);
  if(transition){
   if(next===track){clearTransition();applyLevel();rampEnvelope(1,MUSIC_FADE_IN_MS);}
   else applyLevel();
   notify();return;
  }
  applyLevel();
  if(next!==track){
   if(!audio.paused&&envelopeAt()>0&&context.state==='running')beginTransition();
   else switchTrack(next);
  }else if(next){playCurrent();if(!pending&&!audio.paused&&context.state==='running'&&envelope.to!==1)rampEnvelope(1,MUSIC_FADE_IN_MS);}
  notify();
 }
 async function unlock(){
  if(disposed)return;
  const resumeRequest=++resumeTicket;
  try{
   if(!context){
    const next=makeContext(),media=makeAudio(),node=next.createGain(),fade=next.createGain(),input=next.createMediaElementSource(media);
    media.preload='none';media.loop=true;node.gain.value=battle?.25:.5;fade.gain.value=0;
    input.connect(fade);fade.connect(node);node.connect(next.destination);
    context=next;audio=media;gain=node;fadeGain=fade;source=input;
    context.onstatechange=()=>sync();
    audio.addEventListener('error',()=>{if(disposed||!audio.error)return;failed=true;stopNow();notify();});
   }
   unlocked=true;
   // Keep the media play request inside the first/retry gesture for Safari.
   // Later gestures use the same state machine and cannot skip a pending fade.
   const ready=context.resume();sync(true);await ready;
   if(!disposed)sync();
  }catch{if(!disposed&&resumeRequest===resumeTicket){failed=true;stopNow();notify();}}
 }
 function hold(){const key={};holds.add(key);sync();let released=false;return()=>{if(released)return;released=true;holds.delete(key);sync();};}
 function protect(media){const release=hold();let done=false;const finish=()=>{if(done)return;done=true;for(const name of ['ended','error','pause','abort','emptied'])media.removeEventListener(name,finish);release();};for(const name of ['ended','error','pause','abort','emptied'])media.addEventListener(name,finish);return finish;}
 return {state,unlock,hold,protect,setArea(value){area=value;if(!disposed&&enabled&&!hidden&&!unlocked&&musicForArea(area))void unlock();else sync();},setBattle(value){battle=!!value;sync();},setHidden(value){hidden=!!value;sync();},setEnabled(value){enabled=!!value;sync();},dispose(){disposed=true;stopNow();if(audio){audio.removeAttribute('src');audio.load();}source?.disconnect();fadeGain?.disconnect();gain?.disconnect();if(context){context.onstatechange=null;void context.close();}holds.clear();},};
}
let button;
export const forestMusic=createForestMusic({changed:s=>{if(!button)return;button.textContent=s.enabled?(s.failed?'♫ 重試':'♫ 音樂'):'♫ 靜音';button.setAttribute('aria-pressed',String(s.enabled));button.title=s.enabled?'關閉背景音樂':'開啟背景音樂';}});
export function installForestMusic(){
 if(button)return;button=document.createElement('button');button.id='forest-music-toggle';button.type='button';button.className='hud-button';button.style.cssText='min-width:70px;min-height:44px;padding:8px;flex-shrink:0';button.setAttribute('aria-label','背景音樂開關');
 document.querySelector('.topbar')?.append(button);
 try{forestMusic.setEnabled(localStorage.getItem('forest-music-enabled')!=='false');}catch{forestMusic.setEnabled(true);}
 const gesture=e=>{if(e.target.closest?.('#forest-music-toggle'))return;if(forestMusic.state().enabled)void forestMusic.unlock();};
 document.addEventListener('pointerup',gesture,{capture:true});document.addEventListener('keydown',gesture,{capture:true});
 button.onclick=()=>{const s=forestMusic.state();forestMusic.setEnabled(s.needsGesture?true:!s.enabled);try{localStorage.setItem('forest-music-enabled',String(forestMusic.state().enabled));}catch{}if(forestMusic.state().enabled)void forestMusic.unlock();};
 document.addEventListener('visibilitychange',()=>forestMusic.setHidden(document.hidden));window.addEventListener('pagehide',()=>forestMusic.setHidden(true));window.addEventListener('pageshow',()=>forestMusic.setHidden(document.hidden));forestMusic.setHidden(document.hidden);
}
