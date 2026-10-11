// Walking-only copy of the approved rabbit renderer; forest assets are not loaded.
import {mediaUrl} from './media-url.js';
import {walkFrame,walkPosture} from './adventure-animation.js';
import {drawGentleSide,sideReachX} from './adventure-side-reach.js';
// These four existing delivery copies preserve the current rabbit pixels.
const rabbitMedia={
  'assets/adventure-prototype/rabbit-cohesive-v3.png':'assets/adventure-lite/rabbit-cohesive-v3.a838f382b797.webp',
  'assets/adventure-prototype/rabbit-daisy-walk-v1.png':'assets/adventure-lite/rabbit-daisy-walk-v1.2243e2e94e28.webp',
  'assets/adventure-prototype/rabbit-daisy-side-eight-v4.png':'assets/adventure-lite/rabbit-daisy-side-eight-v4.61b6e61ddadc.webp',
  'assets/adventure-prototype/rabbit-daisy-front-back-walk-v1.png':'assets/adventure-lite/rabbit-daisy-front-back-walk-v1.c7c364c4fdb8.webp',
};
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function line(c,points,color,width){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
export function star(c,x,y,r,color,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.46:r;i?c.lineTo(Math.cos(a)*d,Math.sin(a)*d):c.moveTo(Math.cos(a)*d,Math.sin(a)*d);}c.closePath();c.fillStyle=color;c.fill();c.restore();}
export async function loadAtlas(src,columns,boundaries,{adaptiveRows=false}={}){
  const image=new Image();image.src=mediaUrl(rabbitMedia[src]??src);await image.decode();
  const scan=document.createElement('canvas');scan.width=image.width;scan.height=image.height;
  const ctx=scan.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,image.width,image.height).data;
  const rows=boundaries.map(v=>Math.round(v*image.height));
  const columnRows=Array.from({length:columns},(_,col)=>rows.map((y,index)=>{
    if(!adaptiveRows||!index||index===rows.length-1)return y;
    const left=Math.round(col*image.width/columns),right=Math.round((col+1)*image.width/columns);
    let best=y,cost=Infinity;
    for(let yy=Math.max(1,y-Math.round(image.height*.055));yy<Math.min(image.height-1,y+image.height*.055);yy++){
      let occupied=0;
      for(let dy=-1;dy<=1;dy++)for(let x=left;x<right;x++)if(pixels[((yy+dy)*image.width+x)*4+3]>100)occupied++;
      const value=occupied+Math.abs(yy-y)*.03;
      if(value<cost){best=yy;cost=value;}
    }
    return best;
  }));
  const cells=[];
  for(let row=0;row<rows.length-1;row++)for(let col=0;col<columns;col++){
    const x0=Math.round(col*image.width/columns),x1=Math.round((col+1)*image.width/columns),y0=columnRows[col][row],y1=columnRows[col][row+1],w=x1-x0,h=y1-y0;
    const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=null,max=0;
    const solid=n=>pixels[((y0+Math.floor(n/w))*image.width+x0+n%w)*4+3]>70;
    for(let n=0;n<seen.length;n++){
      if(seen[n]||!solid(n))continue;let head=0,tail=1,l=w,t=h,r=0,b=0;seen[n]=1;queue[0]=n;
      while(head<tail){const v=queue[head++],x=v%w,y=Math.floor(v/w);l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
        for(const next of [x?v-1:-1,x<w-1?v+1:-1,y?v-w:-1,y<h-1?v+w:-1])if(next>=0&&!seen[next]&&solid(next)){seen[next]=1;queue[tail++]=next;}
      }
      if(tail>max){max=tail;best={x:x0+Math.max(0,l-2),y:y0+Math.max(0,t-2),w:Math.min(w-1,r+2)-Math.max(0,l-2)+1,h:Math.min(h-1,b+2)-Math.max(0,t-2)+1};}
    }
    if(!best||max<100)throw new Error('Missing sprite '+src+':'+cells.length);
    cells.push(best);
  }
  return {image,cells};
}
export async function loadArt(){
  const [rabbit,walk,sideWalk,frontBackWalk]=await Promise.all([
    loadAtlas('assets/adventure-prototype/rabbit-cohesive-v3.png',4,[0,.5,1]),
    loadAtlas('assets/adventure-prototype/rabbit-daisy-walk-v1.png',4,[0,291/1402,577/1402,863/1402,1142/1402,1]),
    loadAtlas('assets/adventure-prototype/rabbit-daisy-side-eight-v4.png',4,[0,.5,1]),
    loadAtlas('assets/adventure-prototype/rabbit-daisy-front-back-walk-v1.png',4,[0,.49,1]),
  ]);
  // Register full lower-body poses at the collar, keeping a shared head.
  // Never resize or rotate individual limbs.
  for(const atlas of [rabbit,walk,sideWalk,frontBackWalk]){
  const scan=document.createElement('canvas');scan.width=atlas.image.width;scan.height=atlas.image.height;
  const ctx=scan.getContext('2d',{willReadFrequently:true});ctx.drawImage(atlas.image,0,0);
  const pixels=ctx.getImageData(0,0,scan.width,scan.height).data;
  for(const s of atlas.cells){
    let narrow=Infinity,neck=Math.round(s.h*.565),neckCenter=s.w/2;
    for(let yy=Math.floor(s.h*.50);yy<Math.ceil(s.h*.66);yy++){
      let left=s.w,right=-1;
      for(let xx=0;xx<s.w;xx++)if(pixels[((s.y+yy)*scan.width+s.x+xx)*4+3]>150){left=Math.min(left,xx);right=xx;}
      const width=right-left;if(width>12&&width<narrow){narrow=width;neck=yy;neckCenter=(left+right)/2;}
    }
    let left=s.w,right=0;
    for(let yy=0;yy<neck;yy++)for(let xx=0;xx<s.w;xx++)if(pixels[((s.y+yy)*scan.width+s.x+xx)*4+3]>150){left=Math.min(left,xx);right=Math.max(right,xx);}
    s.neck=neck;s.neckCenter=neckCenter;s.headWidth=right-left+1;s.headCenter=(left+right)/2;
  }
  }
  return {rabbit,walk,sideWalk,frontBackWalk};
}
export function drawRabbit(c,art,{x,y,height=110,outfit='daisy',direction=0,walking=false,phase=0,wand=true,casting=0,shadow=true}){
  const h=height,frame=walkFrame(walking,phase,direction===1||direction===3?art.sideWalk.cells.length:4),step=walking?Math.sin(phase):0;
  const posture=walkPosture(walking&&outfit==='daisy',phase,direction);
  const collarOffset=posture.bob*h,bodyHeight=h*.454-collarOffset;
  let poseGrip=null;
  // Continuous artwork keeps shoulders, arms, torso and boots connected.
  // Both costumes retain the same upper silhouette and face.
  const head=art.rabbit.cells[direction],body=art.rabbit.cells[(outfit==='gardener'?4:0)+direction];
  // Only the frontal daisy pose changes registration: asymmetric ears and
  // the flower must not decide where the chin sits above the collar.
  const frontAligned=outfit==='daisy'&&direction===0;
  const headOffsetX=frontAligned?(head.w/2-head.neckCenter)/head.h*h:0;
  const drawRegion=(cell,from,to)=>{
    const width=cell.w/cell.h*h;
    c.drawImage(art.rabbit.image,cell.x,cell.y+cell.h*from,cell.w,cell.h*(to-from),-width/2,-h+h*from,width,h*(to-from));
  };
  if(shadow){ellipse(c,x,y+1,h*.19,h*.044,'#3b4c2e36');ellipse(c,x,y,h*.12,h*.021,'#37492b20');}
  c.save();c.translate(x,y);c.rotate((outfit==='daisy'?0:step*.022)+(casting?Math.sin(casting*Math.PI)*-.055:0));
  // Share the head down to the fur just above the collar; preserve the
  // illustrator's uninterrupted shoulders and limbs below it.
  if(outfit==='daisy'){
    const side=direction===1||direction===3;
    const atlas=frame?(side?art.sideWalk:art.frontBackWalk):art.walk;
    // Each complete pose includes BOTH counter-swinging arms. The far arm
    // recedes behind the torso, instead of remaining a fixed bump in front.
    // Mirror complete front/back passing poses to alternate the support foot.
    const mirror=frame>0&&((side&&direction===3)||(!side&&frame===4));
    const index=!frame?direction:side?frame-1:(direction===2?4:0)+(frame===4?1:frame-1);
    const s=atlas.cells[index],sx=(head.w/head.h*h)/s.headWidth;
    const bodyAnchor=frontAligned?s.neckCenter:s.headCenter;
    if(frame){
      // Palm centers measured in the source sheets. Register the prop with
      // the same whole-body transform, including the mirrored passing pose.
      const palms=side?[[135,368],[558,378],[955,380],[1384,361],[257,857],[622,875],[995,879],[1308,872]]:
        direction===0?[[269,340],[650,349],[1027,349],[482,349]]:
        [[137,794],[482,822],[870,817],[650,822]];
      const [px,py]=palms[frame-1];
      const gx=(px-s.x-bodyAnchor)*sx;
      poseGrip={x:mirror?-gx:gx,y:-bodyHeight+(py-s.y-s.neck)/(s.h-s.neck)*bodyHeight};
      if(side)poseGrip.x=sideReachX(poseGrip.x,poseGrip.y,h);
    }else if(frontAligned)poseGrip={x:h*.15+(s.headCenter-bodyAnchor)*sx,y:-h*.25};
    c.save();if(mirror)c.scale(-1,1);
    // The complete connected body compresses/extends by at most 3.1%.
    // Its bottom stays at y=0, so the planted foot and shadow never bounce.
    drawGentleSide(c,h,ctx=>ctx.drawImage(atlas.image,s.x,s.y+s.neck,s.w,s.h-s.neck,-bodyAnchor*sx,-bodyHeight,s.w*sx,bodyHeight),side&&frame?'normal':null);c.restore();
  }else drawRegion(body,.565,1);
  // Follow the moving collar, rotating around the neck rather than the
  // image center. The existing fur/collar overlap conceals the small tilt.
  c.save();c.translate(0,collarOffset-h*.44);c.rotate(posture.headAngle);
  c.translate(headOffsetX,h*.44);drawRegion(head,0,.565);c.restore();
  if(wand){
    let grip=[{x:.15,y:-.25},{x:-.10,y:-.245},{x:-.15,y:-.25},{x:.10,y:-.245}][direction];
    const sign=direction===2||direction===1?-1:1;
    c.save();c.translate(poseGrip?.x??grip.x*h,poseGrip?.y??grip.y*h);c.rotate(sign*.13+(casting?Math.sin(casting*Math.PI)*sign*.8:0));
    line(c,[[0,0],[0,-h*.235]],'#715939',h*.021);line(c,[[-h*.003,0],[-h*.003,-h*.235]],'#bc975b',h*.01);
    star(c,0,-h*.265,h*.067,'#ce9c49');star(c,0,-h*.268,h*.052,'#ffe1a0');
    line(c,[[-h*.03,-h*.16],[h*.03,-h*.135],[0,-h*.105]],'#9caf83',h*.015);c.restore();
  }
  c.restore();
}
