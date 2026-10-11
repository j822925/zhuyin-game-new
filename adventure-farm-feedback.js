import {CROPS} from './adventure-life-model.js';
export const FARM_EFFECT_MS={seed:1200,water:1600,grow:2000,harvest:1800};
export function farmEffect(scene,type,plot,crop,plantId,now=performance.now(),delay=0){
 scene.farmEffects??=new Map();const effect={type,plot,crop,plantId,start:now+delay,duration:scene.reduced.matches?450:FARM_EFFECT_MS[type]};scene.farmEffects.set(plot.id,effect);scene.farmFocus={x:plot.x,y:plot.y};return effect;
}
export function farmProgress(effect,now){return Math.max(0,Math.min(1,(now-effect.start)/effect.duration));}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function stamp(c,atlas,index,x,y,h,trim=1){if(!atlas)return;const a=atlas.cells[index],w=a.w/a.h*h;c.drawImage(atlas.image,a.x,a.y,a.w,a.h*trim,x-w/2,y-h*trim,w,h*trim);}
// Reuse the painted seedlings and crop sprites; no downloaded animation frames.
export function drawFarmPlant(c,art,{x,y,stage,crop,effect,index,now,reduced}){
 const overall=effect?farmProgress(effect,now):1,t=Math.max(0,Math.min(1,(overall-index*.055)/.7)),ease=1-(1-t)**3;
 const definition=CROPS[crop],height=crop==='carrot'?72:88,atlas=art[definition.atlas||'life'];
 const seed=()=>{oval(c,x-3,y-5,3,1.6,'#ead2a4');oval(c,x+6,y-3,2.2,1.3,'#c6a371');};
 const sprout=(h=38,alpha=1)=>{c.save();c.globalAlpha=alpha;stamp(c,art.seedling,0,x,y,h);c.restore();};
 const mature=(scale=1,alpha=1,dy=0,angle=0,trim=1)=>{c.save();c.globalAlpha=alpha;c.translate(x,y+dy);c.rotate(angle);stamp(c,atlas,definition.art,0,0,height*scale,trim);c.restore();};
 if(stage==='growing'||effect?.type==='water')oval(c,x,y-2,23,7,'#49352124');
 if(!effect){if(stage==='seed')seed();else if(stage==='growing')sprout();else if(stage==='ready')mature();return;}
 if(effect.type==='seed'){
  seed();if(!reduced&&t<.8){oval(c,x,y-45*(1-ease),3.4,2.5,'#f3d5a0');for(let j=0;j<3;j++)oval(c,x+(j-1)*7*ease,y-4-Math.sin(t*Math.PI)*8,1.8,1.4,'#997347');}
 }else if(effect.type==='water'){
  if(t<.25)seed();else sprout(reduced?38:6+32*ease,ease);
  if(!reduced&&overall<.8)for(let j=0;j<3;j++){const fall=(overall*2.6+j*.29+index*.17)%1;oval(c,x+(j-1)*10,y-60+fall*56,1.8,3.8,'#b3ddecdd');}
 }else if(effect.type==='grow'){
  sprout(38,1-ease);mature(reduced?1:.28+.72*ease,ease);
  if(!reduced&&t>.4&&t<.95)for(let j=0;j<3;j++)oval(c,x+Math.cos(j*2.1)*24,y-height*ease+Math.sin(j*2.1)*14,2,2,'#fff2b7');
 }else if(effect.type==='harvest'){
  oval(c,x,y-2,13,4,'#50382155');
  const lift=Math.max(0,(t-.24)/.76),alpha=reduced?1-t:Math.min(1,(1-t)*3);
  const shake=reduced?0:t<.3?Math.sin(t*70)*.075:0;
  mature(1,alpha,reduced?0:-Math.sin(lift*Math.PI/2)*62,shake,.87);
  if(!reduced&&t>.25&&t<.8)for(let j=0;j<4;j++){const k=(t-.25)/.55;oval(c,x+(j-1.5)*18*k,y-22*Math.sin(k*Math.PI)+j%2*3,2.5*(1-k),1.8*(1-k),'#947044');}
 }
}
