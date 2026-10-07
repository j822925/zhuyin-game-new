import {WolfBattleSprite,WOLF_ACTIONS,wolfPose} from './wolf-battle-player.js?v=20261003-motion1';
import {BattleSprite} from './battle-sprite.js?v=20261007-ipad1';
const $=id=>document.getElementById(id),canvas=$('battle'),ctx=canvas.getContext('2d'),wolf=new WolfBattleSprite(),rivalCanvas=document.createElement('canvas'),rival=new BattleSprite(rivalCanvas),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let ready=false,action='idle',elapsed=0,playing=false,last=0,frameHandle=0;const speed=()=>Number($('speed').value),duration=()=>WOLF_ACTIONS[action].duration;
function play(next){action=next;elapsed=0;playing=next!=='idle'&&!reduced.matches;sync();render(performance.now()/1000);}
function sync(){for(const b of document.querySelectorAll('[data-action]'))b.setAttribute('aria-pressed',String(b.dataset.action===action));$('pause').textContent=playing?'暫停動作':'繼續播放';$('pause').disabled=!ready||action==='idle';$('step').disabled=!ready||action==='idle';$('progress').disabled=!ready||action==='idle';}
function drawGround(){ctx.save();ctx.strokeStyle='#b2d5df25';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(70,472);ctx.lineTo(890,472);ctx.stroke();for(const x of [270,690]){const g=ctx.createRadialGradient(x,475,1,x,475,100);g.addColorStop(0,'#050f1970');g.addColorStop(1,'#050f1900');ctx.save();ctx.translate(0,380);ctx.scale(1,.2);ctx.fillStyle=g;ctx.fillRect(x-105,370,210,210);ctx.restore();}ctx.restore();}
function effects(t,side){const d=side==='hero'?-1:1,x=side==='hero'?690:270;ctx.save();ctx.translate(x,470);ctx.scale(d,1);
 if(action==='attack'&&t>.43&&t<.71){const q=(t-.43)/.28;ctx.globalAlpha=Math.sin(q*Math.PI)*.8;ctx.strokeStyle='#d6f8ff';ctx.lineWidth=7*(1-q)+2;ctx.shadowColor='#9dd3ee';ctx.shadowBlur=16;ctx.beginPath();ctx.ellipse(98,-195,142,173,-.35,-1.6+q*.3,.7+q*.3);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#80b7cc';ctx.stroke();
  // The trail travels toward the rival on the opposite side of the arena.
  ctx.globalAlpha=Math.sin(q*Math.PI)*.55;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(210+q*110,-210+q*40);ctx.lineTo(280+q*150,-205+q*40);ctx.stroke();
 }
 if(action==='hurt'&&t>.22&&t<.38){ctx.globalAlpha=(1-(t-.22)/.16)*.8;ctx.strokeStyle='#ffdcba';ctx.lineWidth=3;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(90+Math.cos(a)*12,-265+Math.sin(a)*12);ctx.lineTo(90+Math.cos(a)*27,-265+Math.sin(a)*27);ctx.stroke();}}
 if(action==='star'&&t>.2){ctx.globalAlpha=.2;const g=ctx.createRadialGradient(0,-258,3,0,-258,55);g.addColorStop(0,'#ffe49d');g.addColorStop(1,'#ffe49d00');ctx.fillStyle=g;ctx.fillRect(-55,-313,110,110);}ctx.restore();
}
function render(clock){if(!ready)return;const t=duration()?Math.min(1,elapsed/duration()):0,side=$('side').value;ctx.clearRect(0,0,960,540);drawGround();
 let rivalAction='idle',rt=0;if(action==='attack'&&t>.51&&t<.90){rivalAction='hurt';rt=(t-.51)/.39;}if(action==='hurt'){rivalAction=t<.45?'attack':'idle';rt=Math.min(1,t/.45);}rival.action=rivalAction;rival.draw(rt,clock);
 ctx.save();ctx.translate(side==='hero'?260:700,470);if(side==='hero')ctx.scale(-1,1);ctx.drawImage(rivalCanvas,-180,-312,360,360);ctx.restore();
 const p=wolf.draw(ctx,{action,t,clock,side,reduced:reduced.matches});if(!reduced.matches)effects(t,side);
 canvas.dataset.action=action;canvas.dataset.pose=String(p.frame);canvas.dataset.facing=side==='hero'?'left':'right';canvas.dataset.time=t.toFixed(3);canvas.dataset.bounds=JSON.stringify(p.bounds);
 $('phase').textContent=p.label;$('progress').value=String(Math.round(t*1000));$('position').textContent=Math.round(t*100)+'%';$('side-label').textContent=side==='hero'?'我方 · 向左出招':'敵方 · 向右出招';
}
function tick(now){frameHandle=requestAnimationFrame(tick);const delta=last?Math.min(now-last,80):0;last=now;if(document.hidden||!ready)return;if(playing){elapsed=Math.min(duration(),elapsed+delta*speed());if(elapsed>=duration()){playing=false;sync();}}render(now/1000);}
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>play(b.dataset.action);
$('pause').onclick=()=>{if(elapsed>=duration())elapsed=0;playing=!playing;sync();};$('side').onchange=()=>render(performance.now()/1000);
$('progress').oninput=()=>{playing=false;elapsed=Number($('progress').value)/1000*duration();sync();render(performance.now()/1000);};
$('step').onclick=()=>{playing=false;const keys=WOLF_ACTIONS[action].keys,t=duration()?elapsed/duration():0,next=keys.find(k=>k[0]>t+.002);elapsed=(next?next[0]+.001:0)*duration();sync();render(performance.now()/1000);};
document.addEventListener('visibilitychange',()=>{last=performance.now();});reduced.addEventListener('change',()=>{if(reduced.matches)playing=false;sync();});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frameHandle);rival.dispose();});
try{await Promise.all([wolf.load(),rival.character('knight')]);rival.dispose();ready=true;canvas.dataset.ready='mistblade-wolf';for(const b of document.querySelectorAll('[data-action]'))b.disabled=false;sync();frameHandle=requestAnimationFrame(tick);}catch(e){rival.dispose();$('phase').textContent='動作暫時無法載入';$('error').hidden=false;$('error').textContent='請重新整理再試一次。'+e.message;}
