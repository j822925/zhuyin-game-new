import {readSheet,WOLF_ACTIONS,wolfPose} from './wolf-battle-player.js?v=20261003-all-motion1';
export {WOLF_ACTIONS as CONCEPT_ACTIONS};
const clamp=t=>Math.max(0,Math.min(1,t));
export class ConceptBattleSprite{
 async load(meta){const [a,r]=await Promise.all([readSheet(meta.attackImage),readSheet(meta.reactionsImage)]);this.meta=meta;const target=meta.proportion==='tall'?390:meta.group==='人形幻魔'?330:meta.group==='幻獸'?285:300;
  const scale=(frames,stand)=>Math.min(target/Math.max(1,stand.bounds.bottom-stand.bounds.top),...frames.map(f=>Math.min(420/Math.max(1,f.pivot[1]),500/f.image.width)));
  const sa=scale(a,a[0]),sr=scale(r,r[3]);a.forEach(f=>f.scale=sa);r.forEach(f=>f.scale=sr);this.frames=[...a,...r];return this;
 }
 draw(ctx,{action='idle',t=0,clock=0,side='enemy',reduced=false}={}){if(!this.frames)return;const p=wolfPose(action,clamp(t)),f=this.frames[p.frame],d=side==='hero'?-1:1,physical=['slash','spear','leaf','frost','jade','stone','coin','crystal'].includes(this.meta.fx);
  const rush=action==='attack'?Math.sin(Math.PI*clamp((t-.27)/.63))*(physical?30:12):0,recoil=action==='hurt'?-12*Math.sin(Math.PI*clamp((t-.17)/.77)):0;
  const shift=reduced?0:rush+recoil,leftReach=(d>0?f.pivot[0]:f.image.width-f.pivot[0])*f.scale,rightReach=(d>0?f.image.width-f.pivot[0]:f.pivot[0])*f.scale;
  const x=Math.max(12+leftReach,Math.min(948-rightReach,(side==='hero'?690:270)+d*shift)),y=470+(action==='idle'&&!reduced?Math.sin(clock*1.7)*1.1:0);ctx.save();ctx.translate(x,y);ctx.scale(d,1);
  if(action==='attack'&&physical&&!reduced&&t>.40&&t<.60){ctx.save();ctx.globalAlpha=.08;ctx.drawImage(f.image,-f.pivot[0]*f.scale-14,-f.pivot[1]*f.scale,f.image.width*f.scale,f.image.height*f.scale);ctx.restore();}
  ctx.drawImage(f.image,-f.pivot[0]*f.scale,-f.pivot[1]*f.scale,f.image.width*f.scale,f.image.height*f.scale);ctx.restore();
  let label=p.label;if(action==='attack')label=['準備迎戰','蓄力 · 準備出招','招式蓄勢',this.meta.attackLabel,'招式落下','收勢', '回到待機'][p.index];if(action==='guard'&&p.frame===6)label=this.meta.guardLabel;if(action==='victory')label=p.frame===9?this.meta.victoryLabel:'恢復姿態 · 準備慶祝';if(action==='star')label=p.frame===10?'我方領獎 · 捧起星星':'迎接獎勵';if(action==='defeated')label=p.frame===11?'敗北 · 暫時休息':'被擊退';
  return{...p,label,x,y,bounds:{left:x+(d>0?-f.pivot[0]*f.scale:-(f.image.width-f.pivot[0])*f.scale),right:x+(d>0?(f.image.width-f.pivot[0])*f.scale:f.pivot[0]*f.scale),top:y-f.pivot[1]*f.scale,bottom:y+(f.image.height-f.pivot[1])*f.scale}};
 }
}
function glyph(ctx,kind,x,y,size,angle,color){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
 if(['butterfly','moth'].includes(kind)){for(const d of [-1,1]){ctx.beginPath();ctx.ellipse(d*size*.55,0,size*.55,size*.8,d*.4,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,-size*.65);ctx.lineTo(0,size*.65);ctx.stroke();}
 else if(['fire','lava','lantern'].includes(kind)){ctx.beginPath();ctx.moveTo(0,-size);ctx.quadraticCurveTo(size*1.3,size*.2,0,size);ctx.quadraticCurveTo(-size,size*.2,0,-size);ctx.fill();}
 else if(['ice','frost','crystal'].includes(kind)){ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.55,0);ctx.lineTo(0,size);ctx.lineTo(-size*.55,0);ctx.closePath();ctx.stroke();}
 else if(['lightning','spear'].includes(kind)){ctx.beginPath();ctx.moveTo(size*.2,-size);ctx.lineTo(-size*.6,size*.1);ctx.lineTo(size*.15,size*.1);ctx.lineTo(-size*.2,size);ctx.stroke();}
 else if(['notes','melody'].includes(kind)){ctx.beginPath();ctx.ellipse(-size*.3,size*.4,size*.4,size*.28,-.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(0,size*.4);ctx.lineTo(0,-size);ctx.lineTo(size*.6,-size*.7);ctx.stroke();}
 else if(kind==='cards'){ctx.strokeRect(-size*.65,-size,size*1.3,size*2);ctx.fillRect(-size*.12,-size*.12,size*.24,size*.24);}
 else if(['forest','jade','leaf','spores'].includes(kind)){ctx.beginPath();ctx.moveTo(0,-size);ctx.quadraticCurveTo(size*1.2,0,0,size);ctx.quadraticCurveTo(-size*1.2,0,0,-size);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-size*.7);ctx.lineTo(0,size*.7);ctx.stroke();}
 else if(kind==='spider'){for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,size*(.3+i*.3),size*(.3+i*.3),0,0,Math.PI*2);ctx.stroke();}for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*size,Math.sin(a)*size);ctx.stroke();}}
 else if(kind==='moon'){ctx.beginPath();ctx.arc(0,0,size,-1.1,1.1);ctx.quadraticCurveTo(-size*.1,0,Math.cos(-1.1)*size,Math.sin(-1.1)*size);ctx.fill();}
 else if(kind==='ink'){ctx.beginPath();ctx.ellipse(0,0,size*.6,size,angle,0,Math.PI*2);ctx.fill();}
 else if(kind==='sugar'){ctx.beginPath();ctx.moveTo(0,size);ctx.bezierCurveTo(-size*1.4,0,-size,-size,0,-size*.25);ctx.bezierCurveTo(size,-size,size*1.4,0,0,size);ctx.fill();}
 else{ctx.beginPath();ctx.arc(0,0,size,0,Math.PI*2);ctx.stroke();}ctx.restore();}
export function drawConceptEffects(ctx,meta,action,t,side){const d=side==='hero'?-1:1,x=side==='hero'?690:270,color=meta.accent,kind=meta.fx;ctx.save();ctx.translate(x,470);ctx.scale(d,1);
 if(action==='attack'&&t>.43&&t<.78){const q=(t-.43)/.35;ctx.globalAlpha=Math.sin(q*Math.PI)*.8;ctx.shadowColor=color;ctx.shadowBlur=10;
  if(['slash','leaf','frost','crystal'].includes(kind)){ctx.strokeStyle=color;ctx.lineWidth=5*(1-q)+2;ctx.beginPath();ctx.ellipse(100,-170,110,132,-.4,-1.6+q*.2,.65+q*.4);ctx.stroke();}
  else if(kind==='spear'){ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(115,-160);ctx.lineTo(230+q*230,-160);ctx.stroke();}
  for(let i=0;i<3;i++){const px=140+q*270+i*24,py=-175+Math.sin(q*4+i)*15;glyph(ctx,kind,px,py,kind==='wind'?17:10+i*2,q*2+i*.4,color);}
 }
 if(action==='hurt'&&t>.22&&t<.38){ctx.globalAlpha=(1-(t-.22)/.16)*.8;ctx.strokeStyle='#ffddbe';ctx.lineWidth=3;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(60+Math.cos(a)*10,-200+Math.sin(a)*10);ctx.lineTo(60+Math.cos(a)*25,-200+Math.sin(a)*25);ctx.stroke();}}
 ctx.restore();}
