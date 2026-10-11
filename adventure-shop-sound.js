let context;
export function checkoutSound(success=true){
 try{context??=new (window.AudioContext||window.webkitAudioContext)();void context.resume();const now=context.currentTime;
  (success?[1046.5,1568,2093]:[260,196]).forEach((f,i)=>{const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=f;const t=now+i*(success?.045:.12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+(success?.55:.24));o.connect(g).connect(context.destination);o.start(t);o.stop(t+.6);});
 }catch{/* A text receipt remains available when audio is unavailable. */}
}
