// Identity-specific poses; independent from the live game and home skeleton.
export const WOLF_ACTIONS={
 idle:{duration:0,keys:[[0,0,'從容待機']]},
 attack:{duration:1800,keys:[[0,0,'準備出刀'],[.10,1,'握柄 · 蓄力'],[.28,2,'拔刀 · 舉刃'],[.43,3,'踏步 · 向敵人揮砍'],[.58,4,'刀勢落下'],[.74,5,'收勢'],[.94,0,'回到待機']]},
 guard:{duration:1400,keys:[[0,0,'察覺來襲'],[.12,6,'舉臂 · 護住臉與胸口'],[.83,8,'放下防禦'],[.96,0,'回到待機']]},
 hurt:{duration:2000,keys:[[0,6,'舉臂抵擋'],[.22,7,'受擊 · 閉眼皺眉'],[.65,8,'穩住身體 · 恢復'],[.94,0,'回到待機']]},
 victory:{duration:1700,keys:[[0,8,'收刀站穩'],[.18,9,'握拳 · 勝利致意']]},
 star:{duration:2000,keys:[[0,8,'收刀迎接獎勵'],[.20,10,'雙手捧星星']]},
 defeated:{duration:1800,keys:[[0,7,'被擊退'],[.28,11,'單膝落地 · 認輸']]}
};
const clamp=t=>Math.max(0,Math.min(1,t));
export function wolfPose(action,t){const def=WOLF_ACTIONS[action]||WOLF_ACTIONS.idle;let index=0;for(let i=0;i<def.keys.length;i++)if(t>=def.keys[i][0])index=i;return {frame:def.keys[index][1],label:def.keys[index][2],index};}

// Use connected silhouettes, not nominal cell edges: a saber may extend into
// the transparent gutter. Keep each weapon and fur edge with its own pose.
export async function readSheet(url){
 const im=new Image();im.src=url;await im.decode();const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
 const w=im.width,h=im.height,rgba=ctx.getImageData(0,0,w,h).data,labels=new Int32Array(w*h),queue=new Int32Array(w*h),parts=[];let id=0;
 for(let n=0;n<labels.length;n++){
  if(labels[n]||rgba[n*4+3]<40)continue;id++;let head=0,tail=1,l=w,r=0,top=h,bottom=0;queue[0]=n;labels[n]=id;
  const add=k=>{if(k>=0&&!labels[k]&&rgba[k*4+3]>=40){labels[k]=id;queue[tail++]=k;}};
  while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(x>0)add(p-1);if(x<w-1)add(p+1);if(y>0)add(p-w);if(y<h-1)add(p+w);}
  if(tail>3000)parts.push({id,l,r,top,bottom,pixels:tail});
 }
 if(parts.length!==6)throw Error('角色姿勢載入不完整（'+parts.length+' / 6）');
 parts.sort((a,b)=>Math.floor((a.top+a.bottom)/h)-Math.floor((b.top+b.bottom)/h)||a.l-b.l);
 return parts.map(p=>{
  const l=Math.max(0,p.l-3),top=Math.max(0,p.top-3),r=Math.min(w-1,p.r+3),bottom=Math.min(h-1,p.bottom+3),image=document.createElement('canvas');image.width=r-l+1;image.height=bottom-top+1;const fc=image.getContext('2d'),out=fc.createImageData(image.width,image.height);
  let sum=0,count=0;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const n=(top+y)*w+l+x;if(!rgba[n*4+3])continue;let keep=labels[n]===p.id;
   if(!keep&&rgba[n*4+3]<40)for(let dy=-2;dy<=2&&!keep;dy++)for(let dx=-2;dx<=2;dx++){const xx=l+x+dx,yy=top+y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&labels[yy*w+xx]===p.id){keep=true;break;}}
   if(keep){out.data.set(rgba.subarray(n*4,n*4+4),(y*image.width+x)*4);if(top+y>p.bottom-(p.bottom-p.top)*.055&&labels[n]===p.id){sum+=x;count++;}}
  }
  fc.putImageData(out,0,0);return{image,pivot:[count?sum/count:image.width/2,p.bottom-top],bounds:p};
 });
}
export class WolfBattleSprite{
 async load(){const [attack,reactions]=await Promise.all([readSheet('assets/battle-sprites/mistblade-wolf-attack-v1.webp'),readSheet('assets/battle-sprites/mistblade-wolf-reactions-v1.webp')]);
  // Standing body heights define scale. Bent knees and kneeling keep their
  // natural lower height rather than being stretched to a standing portrait.
  const scales=[390/(attack[0].bounds.bottom-attack[0].bounds.top),390/(reactions[3].bounds.bottom-reactions[3].bounds.top)];
  attack.forEach(f=>f.scale=scales[0]);reactions.forEach(f=>f.scale=scales[1]);this.frames=[...attack,...reactions];return this;
 }
 draw(ctx,{action='idle',t=0,clock=0,side='enemy',reduced=false}={}){
  if(!this.frames)return;const p=wolfPose(action,clamp(t)),f=this.frames[p.frame],direction=side==='hero'?-1:1;
  const rush=action==='attack'?Math.sin(Math.PI*clamp((t-.27)/.63))*34:0,recoil=action==='hurt'?-14*Math.sin(Math.PI*clamp((t-.17)/.77)):0;
  const x=(side==='hero'?690:270)+direction*(reduced?0:rush+recoil),y=470+(action==='idle'&&!reduced?Math.sin(clock*1.7)*1.2:0);ctx.save();ctx.translate(x,y);ctx.scale(direction,1);
  if(action==='attack'&&!reduced&&t>.40&&t<.60){ctx.save();ctx.globalAlpha=.10;ctx.drawImage(f.image,-f.pivot[0]*f.scale-15,-f.pivot[1]*f.scale,f.image.width*f.scale,f.image.height*f.scale);ctx.restore();}
  ctx.drawImage(f.image,-f.pivot[0]*f.scale,-f.pivot[1]*f.scale,f.image.width*f.scale,f.image.height*f.scale);
  ctx.restore();return{...p,x,y,bounds:{left:x+(direction>0?-f.pivot[0]*f.scale:-(f.image.width-f.pivot[0])*f.scale),right:x+(direction>0?(f.image.width-f.pivot[0])*f.scale:f.pivot[0]*f.scale),top:y-f.pivot[1]*f.scale,bottom:y+(f.image.height-f.pivot[1])*f.scale}};
 }
}
