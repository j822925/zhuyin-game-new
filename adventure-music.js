// Forest-only background music. Question audio never goes through this gain node.
export const MUSIC_TRACKS={village:'assets/music/sunny-village-v1.m4a',grove:'assets/music/starlight-forest-v1.m4a',map:'assets/music/horizon-v1.m4a'};
export function musicForArea(area){return area==='grove'?'grove':['forest','room','bedroom','kitchen','bathroom','farm'].includes(area)?'village':area?'map':null;}
export function createForestMusic({makeAudio=()=>new Audio(),makeContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),changed=()=>{}}={}){
 let audio,context,gain,source,area=null,track=null,enabled=true,unlocked=false,battle=false,hidden=false,disposed=false,ticket=0,failed=false;
 const holds=new Set();
 const state=()=>({area,track,enabled,unlocked,battle,hidden,held:holds.size,playing:!!audio&&!audio.paused,gain:battle?.25:.5,failed});
 function notify(){changed(state());}
 function allowed(){return !disposed&&enabled&&unlocked&&!hidden&&!holds.size&&!!musicForArea(area)&&context?.state==='running';}
 function sync(){
  const request=++ticket;if(gain)gain.gain.value=battle?.25:.5;
  if(!allowed()){audio?.pause();notify();return;}
  const next=musicForArea(area);if(next!==track){audio.pause();audio.src=MUSIC_TRACKS[next];track=next;}
  if(audio.paused)Promise.resolve(audio.play()).then(()=>{if(request===ticket){failed=false;if(!allowed())audio.pause();notify();}}).catch(()=>{if(request===ticket){failed=true;notify();}});
  notify();
 }
 async function unlock(){
  if(disposed)return;
  try{if(!context){const next=makeContext(),media=makeAudio(),node=next.createGain(),input=next.createMediaElementSource(media);media.preload='none';media.loop=true;node.gain.value=battle?.25:.5;input.connect(node);node.connect(next.destination);context=next;audio=media;gain=node;source=input;context.onstatechange=sync;audio.addEventListener('error',()=>{failed=true;audio.pause();notify();});}
   // Called directly inside a user gesture, before any await.
   const ready=context.resume();unlocked=true;
   // Safari also needs the media play request within this same gesture.
   if(enabled&&!hidden&&!holds.size&&musicForArea(area)){const next=musicForArea(area);if(track!==next){audio.pause();audio.src=MUSIC_TRACKS[next];track=next;}void audio.play().catch(()=>{});}
   await ready;sync();
  }catch{failed=true;audio?.pause();notify();}
 }
 function hold(){const key={};holds.add(key);sync();let released=false;return()=>{if(released)return;released=true;holds.delete(key);sync();};}
 function protect(media){const release=hold();let done=false;const finish=()=>{if(done)return;done=true;for(const name of ['ended','error','pause','abort','emptied'])media.removeEventListener(name,finish);release();};for(const name of ['ended','error','pause','abort','emptied'])media.addEventListener(name,finish);return finish;}
 return {state,unlock,hold,protect,setArea(value){area=value;sync();},setBattle(value){battle=!!value;sync();},setHidden(value){hidden=!!value;sync();},setEnabled(value){enabled=!!value;sync();},dispose(){disposed=true;++ticket;audio?.pause();if(audio){audio.removeAttribute('src');audio.load();}source?.disconnect();gain?.disconnect();if(context){context.onstatechange=null;void context.close();}holds.clear();},};
}
let button;
export const forestMusic=createForestMusic({changed:s=>{if(!button)return;button.textContent=s.enabled?(s.failed?'♫ 重試':'♫ 音樂'):'♫ 靜音';button.setAttribute('aria-pressed',String(s.enabled));button.title=s.enabled?'關閉背景音樂':'開啟背景音樂';}});
export function installForestMusic(){
 if(button)return;button=document.createElement('button');button.id='forest-music-toggle';button.type='button';button.className='hud-button';button.style.cssText='min-width:70px;min-height:44px;padding:8px;flex-shrink:0';button.setAttribute('aria-label','背景音樂開關');
 document.querySelector('.topbar')?.append(button);
 try{forestMusic.setEnabled(localStorage.getItem('forest-music-enabled')!=='false');}catch{forestMusic.setEnabled(true);}
 const gesture=e=>{if(e.target.closest?.('#forest-music-toggle'))return;if(forestMusic.state().enabled)void forestMusic.unlock();};
 document.addEventListener('pointerup',gesture,{capture:true});document.addEventListener('keydown',gesture,{capture:true});
 button.onclick=()=>{const s=forestMusic.state();forestMusic.setEnabled(s.failed?true:!s.enabled);try{localStorage.setItem('forest-music-enabled',String(forestMusic.state().enabled));}catch{}if(forestMusic.state().enabled)void forestMusic.unlock();};
 document.addEventListener('visibilitychange',()=>forestMusic.setHidden(document.hidden));window.addEventListener('pagehide',()=>forestMusic.setHidden(true));window.addEventListener('pageshow',()=>forestMusic.setHidden(document.hidden));forestMusic.setHidden(document.hidden);
}
