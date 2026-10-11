import {mediaUrl} from './media-url.js';
import {loadAtlas} from './walk-preview-art.js?v=walk-approved-v36';
// Register intact poses by the head, not the moving cape / tail silhouette.
// This fixes translation only. Missing limb poses still need new artwork.
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
export function collarMetrics(atlas,cell,fraction){
  const cv=document.createElement('canvas');cv.width=atlas.image.width;cv.height=atlas.image.height;
  const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(atlas.image,0,0);
  const p=c.getImageData(0,0,cv.width,cv.height).data,y=Math.round(cell.h*fraction);
  const centers=[];
  for(let yy=y-2;yy<=y+2;yy++){
    let start=-1,best=[0,0];
    for(let x=0;x<=cell.w;x++){
      const solid=x<cell.w&&p[((cell.y+yy)*cv.width+cell.x+x)*4+3]>150;
      if(solid){if(start<0)start=x;}
      else if(start>=0){if(x-start>best[1]-best[0])best=[start,x];start=-1;}
    }
    centers.push((best[0]+best[1])/2);
  }
  return {y,x:median(centers)};
}
export async function loadPoseAtlas(src,columns=5,rows=3){
  const image=new Image();image.src=mediaUrl(src);await image.decode();
  const cv=document.createElement('canvas');cv.width=image.width;cv.height=image.height;
  const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  const pixels=c.getImageData(0,0,cv.width,cv.height).data,w=cv.width,h=cv.height;
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[];
  // Find whole connected figures before assigning grid cells. Generated sheets
  // do not have mathematically equal gutters; cutting first clips ears / shoes.
  for(let n=0;n<seen.length;n++){
    if(seen[n]||pixels[n*4+3]<=70)continue;
    let head=0,tail=1,l=w,t=h,r=0,b=0;queue[0]=n;seen[n]=1;
    while(head<tail){
      const v=queue[head++],x=v%w,y=Math.floor(v/w);l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
      for(const next of [x?v-1:-1,x<w-1?v+1:-1,y?v-w:-1,y<h-1?v+w:-1]){
        if(next>=0&&!seen[next]&&pixels[next*4+3]>70){seen[next]=1;queue[tail++]=next;}
      }
    }
    if(tail>100)components.push({l,t,r,b,area:tail});
  }
  const cells=Array(columns*rows);
  for(const s of components.sort((a,b)=>b.area-a.area)){
    if(s.b-s.t>h/rows*1.3||s.r-s.l>w/columns*1.3)continue;
    if(s.area<w*h/columns/rows*.045||s.b-s.t<h/rows*.35)continue;
    const col=Math.min(columns-1,Math.floor((s.l+s.r)/2/w*columns));
    const row=Math.min(rows-1,Math.floor((s.t+s.b)/2/h*rows)),index=row*columns+col;
    if(cells[index])continue;
    const x=Math.max(0,s.l-2),y=Math.max(0,s.t-2);
    cells[index]={x,y,w:Math.min(w-1,s.r+2)-x+1,h:Math.min(h-1,s.b+2)-y+1};
  }
  if(Array.from(cells).some(s=>!s)){
    // A few painted poses touch in the sheet. Cut those at the narrowest
    // local gutter rather than through the nominal one-third boundary.
    const fallback=await loadAtlas(src,columns,Array.from({length:rows+1},(_,i)=>i/rows),{adaptiveRows:true});
    for(let i=0;i<cells.length;i++)if(!cells[i])cells[i]=fallback.cells[i];
  }
  return {image,cells};
}
export function registerWalker(atlas,{columns=5,rows=3,baseFrame=0}={}){
  const scan=document.createElement('canvas');scan.width=atlas.image.width;scan.height=atlas.image.height;
  const c=scan.getContext('2d',{willReadFrequently:true});c.drawImage(atlas.image,0,0);
  const {data}=c.getImageData(0,0,scan.width,scan.height),stride=scan.width;
  const pixel=(s,x,y)=>((s.y+Math.round(y))*stride+s.x+Math.round(x))*4;
  const alpha=(s,x,y)=>x>=0&&x<s.w&&y>=0&&y<s.h?data[pixel(s,x,y)+3]:0;
  const registrations=[];
  for(let row=0;row<rows;row++){
    const base=atlas.cells[row*columns+baseFrame],centers=[];
    // Wide opaque runs at the sole exclude a thin staff touching the floor.
    for(let y=Math.floor(base.h*.92);y<base.h-3;y+=2){
      const runs=[];let start=-1;
      for(let x=0;x<=base.w;x++){
        if(alpha(base,x,y)>150){if(start<0)start=x;}
        else if(start>=0){if(x-start>base.h*.035)runs.push([start,x-1]);start=-1;}
      }
      if(runs.length)centers.push((runs[0][0]+runs.at(-1)[1])/2);
    }
    const anchor=centers.length?median(centers):base.w/2,samples=[];
    for(let y=Math.floor(base.h*.07);y<base.h*.43;y+=5)for(let x=3;x<base.w-3;x+=5){
      if(alpha(base,x,y)>230){const i=pixel(base,x,y);samples.push([x,y,data[i],data[i+1],data[i+2]]);}
    }
    for(let frame=0;frame<columns;frame++){
      const s=atlas.cells[row*columns+frame];
      if(frame===baseFrame){registrations.push({anchorX:anchor,headShiftX:0,headShiftY:0,error:0});continue;}
      const initial=(s.w-base.w)/2,range=Math.ceil(base.h*.18);
      let best={score:Infinity,dx:initial,dy:0};
      const score=(dx,dy)=>{
        let sum=0;
        for(const [x,y,r,g,b] of samples){
          const xx=x+dx,yy=y+dy;
          if(alpha(s,xx,yy)<160){sum+=255;continue;}
          const i=pixel(s,xx,yy);sum+=(Math.abs(data[i]-r)+Math.abs(data[i+1]-g)+Math.abs(data[i+2]-b))/3;
        }
        return sum/Math.max(1,samples.length);
      };
      for(let dy=-Math.ceil(base.h*.065);dy<=base.h*.065;dy+=4)for(let dx=Math.round(initial-range);dx<=initial+range;dx+=4){
        const cost=score(dx,dy);if(cost<best.score)best={score:cost,dx,dy};
      }
      const coarse={...best};
      for(let dy=coarse.dy-3;dy<=coarse.dy+3;dy++)for(let dx=coarse.dx-3;dx<=coarse.dx+3;dx++){
        const cost=score(dx,dy);if(cost<best.score)best={score:cost,dx,dy};
      }
      registrations.push({anchorX:anchor+best.dx,headShiftX:best.dx,headShiftY:best.dy,error:Math.round(best.score*10)/10});
    }
  }
  return registrations;
}
