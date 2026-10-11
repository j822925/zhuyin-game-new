// Paint over the existing pond. No new images, animation downloads or reward timers.
export const FISHING_MS={cast:1100,reel:2100};
const clamp=n=>Math.max(0,Math.min(1,n));
export function fishingEffect(scene,type,fish=null,now=performance.now()){
 return scene.fishingEffect={type,fish,start:now,duration:scene.reduced.matches?350:FISHING_MS[type]};
}
export function fishingStage(pending,effect,now=performance.now(),wallNow=Date.now()){
 if(effect&&now-effect.start<effect.duration)return effect.type==='cast'?'casting':'reeling';
 return pending?(wallNow>=pending.biteAt?'ready':'waiting'):effect?.type==='reel'?'caught':'idle';
}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function splash(c,x,y,t){if(t<0||t>1)return;c.save();c.globalAlpha=1-t;c.strokeStyle='#eff9dc';c.lineWidth=2;
 for(let i=0;i<2;i++){c.beginPath();c.ellipse(x,y,8+t*35+i*8,3+t*12+i*3,0,0,Math.PI*2);c.stroke();}
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7;oval(c,x+Math.cos(a)*t*32,y-Math.sin(t*Math.PI)*24+Math.sin(a)*t*10,2,3.5,'#c8e7db');}c.restore();}
export function drawFishing(c,art,state,scene,now){
 if(!scene.fishingView||scene.area!=='forest')return;
 const e=scene.fishingEffect,reduced=scene.reduced.matches,stage=fishingStage(state.life.fishing,e,now),t=e?clamp((now-e.start)/e.duration):1;
 const bank=scene.player,hand={x:bank.x+20,y:bank.y-54},water={x:1023,y:625};
 // A bamboo rod pivots from the character's hand; the line and float follow it.
 const casting=stage==='casting',reeling=stage==='reeling';
 const swing=reduced?1:casting?clamp(t/.65):1,angle=casting?-2.4+swing*1.5:reeling?-.9-Math.sin(t*Math.PI)*.55:-.9;
 const tip={x:hand.x+Math.cos(angle)*103,y:hand.y+Math.sin(angle)*103};
 c.save();c.lineCap='round';c.strokeStyle='#775a38';c.lineWidth=4;c.beginPath();c.moveTo(hand.x,hand.y);c.quadraticCurveTo((hand.x+tip.x)/2+5,(hand.y+tip.y)/2,tip.x,tip.y);c.stroke();
 c.strokeStyle='#d9b576';c.lineWidth=1.4;c.beginPath();c.moveTo(hand.x+1,hand.y-2);c.lineTo(tip.x,tip.y);c.stroke();
 const pending=state.life.fishing;
 let float={...water},showFloat=!!pending;
 if(casting&&!reduced){const fly=clamp(t/.65);float={x:tip.x+(water.x-tip.x)*fly,y:tip.y+(water.y-tip.y)*fly-Math.sin(fly*Math.PI)*70};}
 const wave=reduced?0:Math.sin(now/(stage==='ready'?95:420))*(stage==='ready'?3.5:1.3);
 if(reeling){const lift=reduced?1:clamp(t/.7);float={x:water.x+(hand.x+23-water.x)*lift,y:water.y+(hand.y-30-water.y)*lift-Math.sin(lift*Math.PI)*95};showFloat=true;}
 if(showFloat){c.strokeStyle='#fff5d6';c.lineWidth=1.4;c.beginPath();c.moveTo(tip.x,tip.y);c.quadraticCurveTo((tip.x+float.x)/2,Math.min(tip.y,float.y)-12,float.x,float.y+wave);c.stroke();}
 if(pending){
  if(!casting||t>.65){c.strokeStyle='#e5f2d6aa';c.lineWidth=1.5;c.beginPath();c.ellipse(water.x,water.y+5,stage==='ready'?27:16,stage==='ready'?9:5,0,0,Math.PI*2);c.stroke();}
  oval(c,float.x,float.y+wave,5,7,'#d88665');oval(c,float.x,float.y-4+wave,5,3,'#fff0c4');
  if(stage==='ready'){c.font='bold 28px sans-serif';c.textAlign='center';c.fillStyle='#fff8d9';c.fillText('!',water.x,water.y-23+wave);}
 }
 if(casting&&!reduced)splash(c,water.x,water.y,(t-.65)/.35);
 if(reeling&&!reduced)splash(c,water.x,water.y,t/.45);
 if((reeling||stage==='caught')&&e?.fish&&art.fish){
  const cell=art.fish.cells[({silver:0,gold:1,star:2})[e.fish]],x=reeling?float.x:hand.x+23,y=reeling?float.y+20:hand.y-10,h=52,w=cell.w/cell.h*h;
  c.save();c.translate(x,y);if(reeling&&!reduced)c.rotate(Math.sin(t*30)*.14);c.drawImage(art.fish.image,cell.x,cell.y,cell.w,cell.h,-w/2,-h,w,h);c.restore();
  if(stage==='caught'){c.fillStyle='#fff5d6';c.font='bold 21px sans-serif';c.textAlign='center';c.fillText('+1',x,y-h-8);}
 }
 c.restore();
}
