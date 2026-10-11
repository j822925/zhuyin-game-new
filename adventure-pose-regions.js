// Runtime clipping paths keep the complete head and any tail / cape extending
// above the collar separate. Source PNGs are never repainted or overwritten.
export function poseRegions(atlas,cell,fraction){
  const w=cell.w,h=cell.h,cut=Math.round(h*fraction);
  const cv=document.createElement('canvas');cv.width=w;cv.height=cut;
  const c=cv.getContext('2d',{willReadFrequently:true});
  c.drawImage(atlas.image,cell.x,cell.y,w,cut,0,0,w,cut);
  const p=c.getImageData(0,0,w,cut).data,seen=new Uint8Array(w*cut),queue=new Int32Array(w*cut);
  let best=[];
  for(let n=0;n<seen.length;n++){
    if(seen[n]||p[n*4+3]<100)continue;let head=0,tail=1;queue[0]=n;seen[n]=1;
    while(head<tail){const v=queue[head++],x=v%w,y=Math.floor(v/w);
      for(const k of [x?v-1:-1,x<w-1?v+1:-1,y?v-w:-1,y<cut-1?v+w:-1])if(k>=0&&!seen[k]&&p[k*4+3]>=100){seen[k]=1;queue[tail++]=k;}
    }
    if(tail>best.length)best=Array.from(queue.subarray(0,tail));
  }
  const left=new Int32Array(cut).fill(w),right=new Int32Array(cut).fill(-1);
  for(const n of best){const x=n%w,y=Math.floor(n/w);for(let yy=Math.max(0,y-1);yy<=Math.min(cut-1,y+1);yy++){left[yy]=Math.min(left[yy],Math.max(0,x-1));right[yy]=Math.max(right[yy],Math.min(w-1,x+1));}}
  const headPath=new Path2D(),bodyPath=new Path2D();
  const ys=Array.from({length:cut},(_,i)=>i).filter(y=>right[y]>=0);
  if(ys.length){
    // A single contour avoids antialias seams between adjacent scanline boxes.
    headPath.moveTo(left[ys[0]],ys[0]);
    for(const y of ys){headPath.lineTo(left[y],y);headPath.lineTo(left[y],y+1);}
    for(const y of [...ys].reverse()){headPath.lineTo(right[y]+1,y+1);headPath.lineTo(right[y]+1,y);}
    headPath.closePath();
  }
  // Opposite winding cuts the head out of the body while leaving the tail cap.
  bodyPath.rect(0,0,w,h);bodyPath.addPath(headPath);
  const centers=[];
  for(let y=Math.max(0,cut-6);y<cut;y++)if(right[y]>=left[y])centers.push((left[y]+right[y])/2);
  return {headPath,bodyPath,cut,anchor:centers.length?centers.reduce((a,b)=>a+b,0)/centers.length:w/2};
}

export function drawPoseRegion(c,atlas,cell,path,{x,y,sx,sy=sx}){
  c.save();c.translate(x,y);c.scale(sx,sy);c.clip(path);
  c.drawImage(atlas.image,cell.x,cell.y,cell.w,cell.h,0,0,cell.w,cell.h);c.restore();
}
