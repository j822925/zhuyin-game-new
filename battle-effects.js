// Effects use a separate transparent plane: questions never move or lose focus.
import {BATTLE_META} from './data/battle-catalog.js?v=20260928-allies1';
const palettes={leaf:'#bfe08e',petal:'#ffd0b7',honey:'#ffc562',cloud:'#d7e9ff',ice:'#a4e5ff',sun:'#ffdf7c',star:'#ffe6a0',moon:'#d1b6ff',bubble:'#99e5e8',rainbow:'#dfbbff',berry:'#ff9ac1',slash:'#ffe2a1',electric:'#fff292',dash:'#b6defe',wind:'#c2eee1',arrow:'#d4dc9c',music:'#ffc7ee',rock:'#dcb398',heart:'#ffb7d3'};
const skillNames={leaf:'綠葉飛旋',petal:'花花飛舞',honey:'甜蜜光波',cloud:'雲朵突擊',ice:'冰晶飛舞',sun:'陽光出擊',star:'星光閃耀',moon:'月光魔法',bubble:'泡泡波浪',rainbow:'彩虹旋舞',berry:'莓果飛舞',slash:'流光斬',electric:'閃電衝擊',dash:'疾速突擊',wind:'旋風出擊',arrow:'追光箭',music:'音符魔法',rock:'大地震波',heart:'愛心光波'};
function mote(c,kind,x,y,r,a,color,alpha=1){
 if(kind==='petal'){drawBlossom(c,x,y,r,a,alpha);return;}
 c.save();c.translate(x,y);c.rotate(a);c.globalAlpha=alpha;c.fillStyle=color;c.strokeStyle=color;c.lineWidth=2;
 if(kind==='leaf'){c.beginPath();c.ellipse(0,0,r,r*.42,-.5,0,Math.PI*2);c.fill();c.strokeStyle='#f1ffcf';c.beginPath();c.moveTo(-r*.7,r*.3);c.lineTo(r*.7,-r*.3);c.stroke();}
 else if(['bubble','honey','cloud'].includes(kind)){c.beginPath();c.arc(0,0,r,0,Math.PI*2);if(kind==='bubble'){c.stroke();c.globalAlpha*=.23;}c.fill();c.fillStyle='#ffffff';c.beginPath();c.ellipse(-r*.3,-r*.35,r*.25,r*.13,-.5,0,Math.PI*2);c.fill();}
 else if(kind==='moon'){c.beginPath();c.arc(0,0,r,.6,5.7);c.quadraticCurveTo(-r*.3,0,r*Math.cos(.6),r*Math.sin(.6));c.fill();}
 else if(kind==='ice'){for(let i=0;i<6;i++){c.rotate(Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(r,0);c.moveTo(r*.6,0);c.lineTo(r*.4,-r*.2);c.moveTo(r*.6,0);c.lineTo(r*.4,r*.2);c.stroke();}}
 else if(kind==='electric'){c.beginPath();c.moveTo(r*.3,-r);c.lineTo(-r*.6,r*.1);c.lineTo(0,r*.1);c.lineTo(-r*.3,r);c.lineTo(r*.6,-r*.1);c.lineTo(0,-r*.1);c.closePath();c.fill();}
 else if(kind==='music'){c.beginPath();c.ellipse(-r*.3,r*.4,r*.45,r*.3,-.3,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(0,r*.3);c.lineTo(0,-r);c.lineTo(r*.6,-r*.6);c.stroke();}
 else if(kind==='heart'){c.beginPath();c.moveTo(0,r);c.bezierCurveTo(-r*2,-r*.2,-r*.6,-r*1.6,0,-r*.4);c.bezierCurveTo(r*.6,-r*1.6,r*2,-r*.2,0,r);c.fill();}
 else{c.beginPath();for(let i=0;i<10;i++){const theta=i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;i?c.lineTo(Math.cos(theta)*rr,Math.sin(theta)*rr):c.moveTo(Math.cos(theta)*rr,Math.sin(theta)*rr);}c.closePath();c.fill();}
 c.restore();
}
export function drawBlossom(c,x,y,r,rotation=0,alpha=1){
 c.save();c.translate(x,y);c.rotate(rotation);c.globalAlpha=alpha;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.fillStyle=i%2?'#ffd9b8':'#ffbeaa';c.beginPath();c.ellipse(Math.cos(a)*r*.55,Math.sin(a)*r*.55,r*.52,r*.37,a,0,Math.PI*2);c.fill();}
 c.fillStyle='#fff0a3';c.beginPath();c.arc(0,0,r*.3,0,Math.PI*2);c.fill();c.restore();
}
export function startBattleEffects({actor,opponent,correct,timing}){
 const canvas=document.createElement('canvas');canvas.className='rpg-battle-fx';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 const c=canvas.getContext('2d'),start=performance.now(),mage=actor.dataset.rig==='rabbit',meta=BATTLE_META[correct?actor.dataset.rig:opponent.dataset.monster],kind=meta?.fx||'star',color=palettes[kind]||'#ffe2a1',physical=['slash','dash','arrow'].includes(kind);let raf=0,disposed=false,width=0,height=0;
 const point=(el)=>{const r=el.getBoundingClientRect();return {x:r.left+r.width*.5,y:r.top+r.height*.61,top:r.top+18,size:Math.min(r.width,r.height)};};
 const line=(x,y,r,angle,alpha=1)=>{c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(angle);c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.stroke();c.restore();};
 const ring=(x,y,r,alpha=1)=>{c.save();c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(x,y,r*.48,r,0,0,Math.PI*2);c.stroke();c.restore();};
 function frame(now){if(disposed)return;if(!actor.isConnected||!opponent.isConnected||document.hidden){dispose();return;}
  if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);c.setTransform(dpr,0,0,dpr,0,0);}
  c.clearRect(0,0,width,height);const ms=now-start,a=point(actor),b=point(opponent.querySelector('.opponent-art')),source=correct?a:b,target=correct?b:a,launch=timing.windup,impact=timing.impact;
  if(ms<950){const fade=Math.min(1,ms/100,(950-ms)/220),text=correct?(mage?'棉花兔・花花飛舞':actor.dataset.rig==='knight'?'爆星・流光斬':(meta?.name||actor.dataset.name)+'・'+(skillNames[kind]||'星光出擊')):(meta?.name||'小怪物')+'・'+(skillNames[kind]||'魔法反擊');
   c.save();c.globalAlpha=Math.max(0,fade);c.font='700 15px "Microsoft JhengHei", sans-serif';const w=c.measureText(text).width+30,x=Math.max(8,Math.min(width-w-8,a.x-w/2)),y=Math.max(8,a.top);
   c.fillStyle='#131d35ec';c.fillRect(x,y,w,32);c.fillStyle=color;c.fillRect(x,y,3,32);c.textAlign='center';c.fillText(text,x+w/2,y+22);c.restore();
  }
  if(correct&&ms<launch){const q=ms/launch;if(mage)drawBlossom(c,a.x-22,a.y,8+q*11,q,q*.75);else ring(a.x-22,a.y,12+q*34,q*.65);}
  if(ms>=launch&&ms<impact){const q=(ms-launch)/(impact-launch),ease=q*q,x=source.x+(target.x-source.x)*ease,y=source.y+(target.y-source.y)*ease,angle=Math.atan2(target.y-source.y,target.x-source.x);
   if(mage&&correct){for(let i=2;i>=0;i--){const trail=Math.max(0,ease-i*.07),xx=source.x+(target.x-source.x)*trail,yy=source.y+(target.y-source.y)*trail-24*Math.sin(trail*Math.PI)+Math.sin(q*5+i)*4;drawBlossom(c,xx,yy,14-i*3,q*4+i,1-i*.23);}}
   else if(!physical){for(let i=2;i>=0;i--){const trail=Math.max(0,ease-i*.075),xx=source.x+(target.x-source.x)*trail,yy=source.y+(target.y-source.y)*trail-18*Math.sin(trail*Math.PI);mote(c,kind,xx,yy,15-i*3,q*3+i,color,1-i*.25);}}
   else{c.save();c.translate(x,y);c.rotate(angle);const length=Math.min(140,Math.abs(target.x-source.x)*.32),g=c.createLinearGradient(-length,0,16,0);g.addColorStop(0,color+'00');g.addColorStop(1,color);c.fillStyle=g;c.beginPath();c.moveTo(18,0);c.lineTo(-length,-9);c.lineTo(-length,9);c.closePath();c.fill();c.fillStyle='#fff9e6';c.beginPath();c.ellipse(0,0,14,mage||!correct?10:3,0,0,Math.PI*2);c.fill();c.restore();
   if(correct){line(x,y,30,-.95,.8);line(x+9,y,22,-.95,.5);}}
  }
  if(ms>=impact&&ms<impact+490){const elapsed=ms-impact,q=Math.max(0,(elapsed-70)/420),alpha=1-q,r=16+q*44;
   if(mage&&correct){for(let i=0;i<6;i++){const a=i*Math.PI/3;drawBlossom(c,target.x+Math.cos(a)*r,target.y+Math.sin(a)*r+q*9,10-q*3,a+q*2,alpha);}drawBlossom(c,target.x,target.y,19*(1-q),q,alpha);}
   else if(!physical){for(let i=0;i<6;i++){const a=i*Math.PI/3;mote(c,kind,target.x+Math.cos(a)*r,target.y+Math.sin(a)*r,10-q*4,a+q,color,alpha);}ring(target.x,target.y,r*.5,alpha*.65);}
   else{c.save();c.globalAlpha=alpha;c.translate(target.x,target.y);c.strokeStyle=color;c.lineWidth=2;ring(0,0,r,alpha);
   for(let i=0;i<12;i++){const angle=i*Math.PI*2/12+.18,near=(12+q*30),far=near+(1-q)*(i%3===0?31:15);c.beginPath();c.moveTo(Math.cos(angle)*near,Math.sin(angle)*near);c.lineTo(Math.cos(angle)*far,Math.sin(angle)*far);c.stroke();}
   if(correct&&!mage){line(0,0,Math.min(70,target.size*.4),-.9,alpha);line(3,3,Math.min(48,target.size*.28),.8,alpha*.6);}else ring(0,0,r*.65,alpha);
   c.restore();}
  }
  if(ms>impact+500){dispose();return;}raf=requestAnimationFrame(frame);
 }
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);canvas.remove();}
 raf=requestAnimationFrame(frame);return {dispose};
}
