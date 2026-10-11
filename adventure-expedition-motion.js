import {GUARDIAN_EYES,GUARDIAN_COLORS,blinkAmount,guardianPose,turnMotion} from './data/expedition-motion.js';
import {battleCharacter} from './data/battle-catalog.js';

// A local puppet, not a new image sequence. The original face/art stays intact;
// tiny clipped texture strips close the eyelids briefly. No per-frame downloads.
export function mountGuardian(image,{zone,beast=false,boss=true}={}){
 const canvas=document.createElement('canvas');canvas.className='guardian-motion';canvas.setAttribute('aria-hidden','true');
 const host=document.createElement('span');host.className=image.className+' guardian-art';image.className='guardian-picture';image.replaceWith(host);host.append(image,canvas);
 const c=canvas.getContext('2d'),eyes=boss?(GUARDIAN_EYES[zone?.id]?.[beast?'beast':'human']||[]):[],seed=(zone?.index||0)+(beast?13:0),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let dead=false,raf=0,last=0,action='idle',started=0,ready=false;
 function loaded(){if(dead||!image.naturalWidth)return;canvas.width=image.naturalWidth+80;canvas.height=image.naturalHeight+40;ready=true;host.classList.add('guardian-ready');}
 image.addEventListener('load',loaded);if(image.complete)loaded();
 function draw(now){if(dead)return;raf=requestAnimationFrame(draw);if(document.hidden||now-last<1000/24||!host.getClientRects().length||!ready)return;last=now;
  const t=Math.min(1,(now-started)/900);if(t===1)action='idle';const clock=now/1000,p=guardianPose(action,t,clock,reduced.matches),w=image.naturalWidth,h=image.naturalHeight;
  c.clearRect(0,0,canvas.width,canvas.height);c.save();c.translate(canvas.width/2+p.x,h+20+p.y);c.rotate(p.angle);c.scale(1,p.stretch);c.translate(-w/2,-h);c.drawImage(image,0,0);
  const blink=reduced.matches?0:blinkAmount(clock,seed);canvas.dataset.blink=blink>.75?'closed':'open';canvas.dataset.action=action;
  if(blink>0)for(const [x,y,ew,eh] of eyes){
   c.save();c.beginPath();c.ellipse(x+ew/2,y+eh/2,ew/2,eh/2+.6,0,0,Math.PI*2);c.clip();
   const lid=eh*blink*.52,open=Math.max(.8,eh-lid*2);
   c.drawImage(image,x,y-2,ew,2,x,y,ew,lid+.5);c.drawImage(image,x,y+eh,ew,2,x,y+eh-lid,ew,lid+.5);
   c.drawImage(image,x,y,ew,eh,x,y+lid,ew,open);c.restore();
  }c.restore();
 }
 raf=requestAnimationFrame(draw);
 return {play(next){action=next;started=performance.now();},dispose(){dead=true;cancelAnimationFrame(raf);image.removeEventListener('load',loaded);host.replaceWith(image);}};
}

export function mountSparring({hero,foe,characterId,zone,beast=false,boss=true}){
 let dead=false,rig=null,pendingAction='idle',pendingAt=0,finish=null,timers=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),guardian=foe?mountGuardian(foe,{zone,beast,boss}):null;
 hero.classList.add('exp-battle-player');hero.dataset.motionStatus='loading';
 // Keep the same canvas/renderer used by the original zhuyin rounds.
 import('./battle-sprite.js').then(async({BattleSprite})=>{
  if(dead)return;const fallback=document.createElement('canvas');fallback.width=hero.width;fallback.height=hero.height;fallback.getContext('2d').drawImage(hero,0,0);rig=new BattleSprite(hero,{side:'hero'});hero.getContext('2d').drawImage(fallback,0,0,480,480);await rig.character(battleCharacter(characterId)||'rabbit');
  if(dead){rig.dispose();return;}hero.dataset.motionStatus='ready';rig.play(pendingAction);if(pendingAt)rig.started=pendingAt;
 }).catch(()=>{if(!dead)hero.dataset.motionStatus='fallback';});
 const playHero=action=>{pendingAction=action;pendingAt=performance.now();rig?.play(action);};
 function later(fn,ms){timers.push(setTimeout(()=>{if(!dead)fn();},ms));}
 function effect(target,text,guard=false){
  const field=hero.parentElement,at=target==='hero'?hero:field.querySelector('.exp-foe'),r=at?.getBoundingClientRect(),base=field.getBoundingClientRect();if(!r)return;
  const el=document.createElement('span');el.className='spar-impact'+(guard?' spar-guard':'');el.textContent=text;el.style.cssText=`left:${r.left+r.width/2-base.left}px;top:${r.top+r.height*.45-base.top}px;--spar-color:${GUARDIAN_COLORS[zone.index]}`;field.append(el);later(()=>el.remove(),800);
 }
 function flight(target){
  if(reduced.matches)return;const field=hero.parentElement,other=field.querySelector('.exp-foe');if(!other)return;
  const a=(target==='hero'?other:hero).getBoundingClientRect(),b=(target==='hero'?hero:other).getBoundingClientRect(),base=field.getBoundingClientRect(),el=document.createElement('span');
  el.className='spar-flight';el.textContent='✧';el.style.cssText=`left:${a.left+a.width/2-base.left}px;top:${a.top+a.height*.55-base.top}px;--fly-x:${b.left+b.width/2-a.left-a.width/2}px;--fly-y:${b.top+b.height*.55-a.top-a.height*.55}px;--spar-color:${GUARDIAN_COLORS[zone.index]}`;field.append(el);later(()=>el.remove(),500);
 }
 function release(ok){timers.forEach(clearTimeout);timers=[];const done=finish;finish=null;done?.(ok);}
 const hidden=()=>{if(document.hidden&&finish)release(true);};document.addEventListener('visibilitychange',hidden);
 return {
  play(result){release(false);const motion=turnMotion(result);return new Promise(resolve=>{
   finish=resolve;playHero(motion.hero==='attack'?'attack':'idle');if(motion.foe==='attack')guardian?.play('attack');
   if(result.damage)later(()=>flight(motion.target),reduced.matches?0:180);
   later(()=>{if(motion.foe==='hurt')guardian?.play('hurt');if(motion.hero==='hurt')playHero('hurt');effect(motion.target,result.damage?`${motion.guard?'🛡 ':''}−${result.damage}`:'再試試',motion.guard);},reduced.matches?0:520);
   if(result.won)later(()=>playHero('victory'),reduced.matches?0:1050);
   later(()=>release(true),reduced.matches?160:result.won?2200:1550);
  });},
  dispose(){dead=true;release(false);rig?.dispose();guardian?.dispose();hero.parentElement?.querySelectorAll('.spar-impact,.spar-flight').forEach(el=>el.remove());document.removeEventListener('visibilitychange',hidden);}
 };
}
