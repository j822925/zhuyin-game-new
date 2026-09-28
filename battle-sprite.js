// Battle art and timing are independent of the home/wardrobe skeleton.
import {drawBlossom} from './battle-effects.js?v=20260928-all1';
import {BATTLE_ART,BATTLE_META} from './data/battle-catalog.js?v=20260928-all1';
export {BATTLE_ART};
export const BATTLE_DURATIONS={attack:1250,hurt:1700,victory:1600,star:1900};
const pivots={knight:[[253,431],[645,429],[1137,427],[1584,425],[242,852],[706,854],[1115,862],[1543,863]],rabbit:[[230,453],[679,453],[1142,453],[1587,453],[237,872],[663,872],[1090,872],[1544,872]]};
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const caches=new Map();

// Generated silhouettes cross nominal grid lines. Isolate connected silhouettes
// once on load, retaining edge alpha, instead of chopping weapons at cell edges.
async function loadAtlas(id){
 if(caches.has(id)){const cached=caches.get(id);caches.delete(id);caches.set(id,cached);return cached;}
 if(!BATTLE_ART[id])throw Error('Unknown battle character');
 const pending=(async()=>{const image=new Image();image.src=BATTLE_ART[id];await image.decode();
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const {width:w,height:h}=canvas,source=ctx.getImageData(0,0,w,h),rgba=source.data,labels=new Int32Array(w*h),queue=new Int32Array(w*h),parts=[];let label=0;
 for(let n=0;n<labels.length;n++){
  if(labels[n]||rgba[n*4+3]<40)continue;
  label++;let head=0,tail=1,l=w,t=h,r=0,b=0;queue[0]=n;labels[n]=label;
  const add=k=>{if(k>=0&&!labels[k]&&rgba[k*4+3]>=40){labels[k]=label;queue[tail++]=k;}};
  while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);if(x>0)add(p-1);if(x<w-1)add(p+1);if(y>0)add(p-w);if(y<h-1)add(p+w);}
  if(tail>3000)parts.push({label,l,t,r,b});
 }
 if(parts.length!==8)throw Error('Unexpected battle atlas layout: '+id+' ('+parts.length+')');
 parts.sort((a,b)=>Math.floor((a.t+a.b)/h)-Math.floor((b.t+b.b)/h)||a.l-b.l);
 const frames=parts.map((p,index)=>{const frame=document.createElement('canvas'),l=Math.max(0,p.l-3),t=Math.max(0,p.t-3);frame.width=Math.min(w-1,p.r+3)-l+1;frame.height=Math.min(h-1,p.b+3)-t+1;
  const fc=frame.getContext('2d'),out=fc.createImageData(frame.width,frame.height);
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){const n=(t+y)*w+l+x;if(!rgba[n*4+3])continue;let keep=labels[n]===p.label;
   // Only restore low-alpha edge pixels near this silhouette, never a neighbor.
   if(!keep&&rgba[n*4+3]<40)for(let dy=-2;dy<=2&&!keep;dy++)for(let dx=-2;dx<=2;dx++){const xx=l+x+dx,yy=t+y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&labels[yy*w+xx]===p.label){keep=true;break;}}
   if(keep)out.data.set(rgba.subarray(n*4,n*4+4),(y*frame.width+x)*4);
  }
  let footX=0,footCount=0;for(let yy=Math.max(p.t,p.b-Math.round((p.b-p.t)*.07));yy<=p.b;yy++)for(let xx=p.l;xx<=p.r;xx++)if(labels[yy*w+xx]===p.label){footX+=xx;footCount++;}
  const pivot=pivots[id]?.[index]||[footCount?footX/footCount:(p.l+p.r)/2,p.b];
  fc.putImageData(out,0,0);return {image:frame,pivot:[pivot[0]-l,pivot[1]-t]};
 });
 const scale=pivots[id] ? .78 : Math.min(...frames.map(f=>Math.min(350/f.pivot[1],202/Math.max(1,f.pivot[0]),202/Math.max(1,f.image.width-f.pivot[0]))));
 frames.forEach(f=>f.scale=scale);return frames;
 })();caches.set(id,pending);while(caches.size>6)caches.delete(caches.keys().next().value);pending.catch(()=>{if(caches.get(id)===pending)caches.delete(id);});return pending;
}

export function battlePose(kind,action,t,reduced=false){
 t=clamp(t);const p={frame:0,x:0,y:0,angle:0,face:3};
 if(action==='attack'){
  p.frame=t<.07?0:t<.27?1:t<.40?2:t<.67?3:t<.86?5:0;
  const forward=smooth((t-.25)/.10),recover=smooth((t-.67)/.33);
  p.x=kind==='knight'?10*Math.sin(Math.min(t/.27,1)*Math.PI)-24*forward*(1-recover):-12*forward*(1-recover);
  p.y=kind==='knight'?-7*Math.sin(clamp((t-.25)/.42)*Math.PI):-17*Math.sin(clamp((t-.27)/.4)*Math.PI);
 }else if(action==='hurt'){
  p.frame=t<.63?4:t<.9?5:0;p.face=t<.63?1:3;
  p.x=(kind==='rabbit'?14:24)*Math.sin(clamp(t/.16)*Math.PI/2)*(1-smooth((t-.42)/.58));p.angle=(kind==='rabbit'?2:3)*(1-smooth(t/.7));
 }else if(action==='victory'){p.frame=t<.12?5:6;p.face=2;p.y=kind==='rabbit'?-9*Math.abs(Math.sin(t*Math.PI*2))*Math.sin(t*Math.PI):0;
 }else if(action==='star'){p.frame=7;p.face=2;p.y=3*(1-smooth(t*3));}
 else if(action==='defeated'){p.frame=7;p.face=1;}
 if(kind!=='knight'&&kind!=='rabbit'){
  const meta=BATTLE_META[kind],fx=meta?.fx,enemy=meta?.enemy,direction=enemy?-1:1;
  if(action==='attack'){const rush=smooth((t-.25)/.10)*(1-smooth((t-.67)/.33));p.x=direction*(-(['slash','dash','arrow'].includes(fx)?28:12)*rush);p.y=-(['dash','petal','wind','cloud'].includes(fx)?16:5)*Math.sin(clamp((t-.27)/.4)*Math.PI);}
  if(action==='hurt'){p.x*=direction;p.angle*=direction;}
  if(action==='victory'&&['petal','bubble','sun','berry'].includes(fx))p.y=-8*Math.abs(Math.sin(t*Math.PI*2))*Math.sin(t*Math.PI);
 }
 if(reduced){p.x=p.y=p.angle=0;p.frame=action==='attack'?2:action==='hurt'?4:action==='victory'?6:['star','defeated'].includes(action)?7:0;p.face=['hurt','defeated'].includes(action)?1:['victory','star'].includes(action)?2:3;}
 return p;
}

export class BattleSprite{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');canvas.width=canvas.height=480;this.id='knight';this.action='idle';this.started=0;this.last=0;this.token=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);}
 async character(id){const token=++this.token,frames=await loadAtlas(id);if(this.disposed||token!==this.token)return;this.id=id;this.frames=frames;this.ready=true;this.canvas.dataset.ready=id;this.canvas.dataset.renderer='battle-sprites';}
 play(action){this.action=action;this.started=performance.now();this.canvas.dataset.action=action;}
 tick(now){if(this.disposed)return;if(this.canvas.isConnected)this.wasConnected=true;else if(this.wasConnected){this.dispose();return;}this.frame=requestAnimationFrame(this.tick);if(document.hidden||now-this.last<1000/30||!this.canvas.getClientRects().length)return;this.last=now;const duration=BATTLE_DURATIONS[this.action],t=duration?clamp((now-this.started)/duration):0;if(duration&&t>=1&&this.action!=='star')this.play('idle');this.draw(t,now/1000);}
 draw(t,clock){if(!this.frames)return;const c=this.ctx,p=battlePose(this.id,this.action,t,this.reduced.matches);c.clearRect(0,0,480,480);this.canvas.dataset.face=String(p.face);this.canvas.dataset.pose=String(p.frame);
  const spell=this.id==='rabbit',active=this.action==='attack';
  const drawFrame=(x,alpha=1)=>{const f=this.frames[p.frame],s=f.scale;c.save();c.globalAlpha=alpha;c.translate((pivots[this.id]?274:240)+p.x+x,416+p.y);c.rotate(p.angle*Math.PI/180);c.drawImage(f.image,-f.pivot[0]*s,-f.pivot[1]*s,f.image.width*s,f.image.height*s);c.restore();};
  if(!spell&&['slash','dash','arrow'].includes(BATTLE_META[this.id]?.fx)&&active&&!this.reduced.matches&&t>.26&&t<.58){const d=BATTLE_META[this.id]?.enemy?-1:1;drawFrame(34*d,.09);drawFrame(18*d,.17);}
  // Cotton Rabbit keeps the garden identity: a few soft blossoms, no mage sigil.
  if(spell&&active&&!this.reduced.matches&&t>.2&&t<.7){const q=(t-.2)/.5;for(let i=0;i<3;i++)drawBlossom(c,161-q*30+i*14,266-i*23-q*30,6+i,q*2+i,Math.sin(q*Math.PI)*.65);}
  drawFrame(0);
  if(this.action==='star'){c.save();c.globalAlpha=.28+.12*Math.sin(this.reduced.matches?0:clock*2);const y=spell?295:246,glow=c.createRadialGradient(264,y,2,264,y,46);glow.addColorStop(0,'#fff4bb');glow.addColorStop(1,'#ffe78a00');c.fillStyle=glow;c.fillRect(210,y-54,108,108);c.restore();}
 }
 dispose(){this.disposed=true;this.token++;cancelAnimationFrame(this.frame);}
}
