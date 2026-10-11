import {walkOutfit} from './data/walk-outfits.js?v=outfits-v55';
import {cleanOutfitEdgeRGB} from './adventure-outfit-edges.js?v=outfits-v54a';
import {walkFrame} from './adventure-animation.js';
const cache=new Map();
// Full connected figures, one scale per row: do not resize legs or shoes independently.
export async function loadOutfitArt(id,candidate=null){
  const item=candidate?.id===id?candidate:walkOutfit(id);if(!item)throw Error('找不到服裝');
  if(cache.has(id))return cache.get(id);
  const job=(async()=>{
    const image=new Image();image.src=item.image;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
    const pixels=c.getImageData(0,0,canvas.width,canvas.height).data,rows=[];
    for(let d=0;d<4;d++){
      const cells=[];let top=Infinity,bottom=0;
      for(let f=0;f<4;f++){
        const x=Math.round(f*image.width/4),y=Math.round(d*image.height/4),w=Math.round((f+1)*image.width/4)-x,h=Math.round((d+1)*image.height/4)-y;
        let t=h,b=0,count=0;
        for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(pixels[((y+yy)*image.width+x+xx)*4+3]>96){t=Math.min(t,yy);b=Math.max(b,yy);count++;}
        if(count<100)throw Error('服裝圖格不完整');
        top=Math.min(top,t);bottom=Math.max(bottom,b+1);cells.push({x,y,w,h});
      }
      rows.push({cells,top,bottom,height:bottom-top});
    }
    const idleImage=new Image();idleImage.src=item.idleImage;await idleImage.decode();
    canvas.width=idleImage.width;canvas.height=idleImage.height;c.drawImage(idleImage,0,0);
    const ip=c.getImageData(0,0,canvas.width,canvas.height).data,idle=[];
    for(let d=0;d<4;d++){
      const idleRows=item.idleRows||2;
      const bounds=item.idleRowBounds;
      const x=Math.round(d*canvas.width/4),y=Math.round((bounds?.[item.idleRow]??item.idleRow/idleRows)*canvas.height),x1=Math.round((d+1)*canvas.width/4),y1=Math.round((bounds?.[item.idleRow+1]??(item.idleRow+1)/idleRows)*canvas.height);
      let l=x1,t=y1,r=x,b=y;
      for(let yy=y;yy<y1;yy++)for(let xx=x;xx<x1;xx++)if(ip[(yy*canvas.width+xx)*4+3]>96){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);}
      if(r<=l||b<=t)throw Error('站姿圖格不完整');idle.push({x:l,y:t,w:r-l+1,h:b-t+1});
    }
    const patches=new Map(),images=new Map();
    for(const patch of item.posePatches||[]){
      if(item.sideReview&&(patch.direction===1||patch.direction===3)&&item.sideReview.frames.includes(patch.frame))continue;
      let source=images.get(patch.image);
      if(!source){const img=new Image();img.src=patch.image;await img.decode();canvas.width=img.width;canvas.height=img.height;c.drawImage(img,0,0);const original=c.getImageData(0,0,canvas.width,canvas.height),clean=cleanOutfitEdgeRGB(original.data,img.width,img.height),display=document.createElement('canvas');display.width=img.width;display.height=img.height;const dc=display.getContext('2d');dc.drawImage(img,0,0);const overlay=document.createElement('canvas');overlay.width=img.width;overlay.height=img.height;const op=new Uint8ClampedArray(original.data.length);for(let k=0;k<op.length;k+=4)if(clean.pixels[k]!==original.data[k]||clean.pixels[k+1]!==original.data[k+1]||clean.pixels[k+2]!==original.data[k+2]){op[k]=clean.pixels[k];op[k+1]=clean.pixels[k+1];op[k+2]=clean.pixels[k+2];op[k+3]=255;}overlay.getContext('2d').putImageData(new ImageData(op,img.width,img.height),0,0);dc.globalCompositeOperation='source-atop';dc.drawImage(overlay,0,0);source={image:display,pixels:original.data,edgePixels:clean.changed};images.set(patch.image,source);}
      const {image:img,pixels:px}=source,[x0,y0,x1,y1]=patch.rect.map((v,i)=>Math.round(v*(i%2?img.height:img.width)));
      let l=x1,t=y1,r=x0,b=y0;
      for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++)if(px[(yy*img.width+xx)*4+3]>96){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);}
      if(r<=l||b<=t)throw Error('修正圖格不完整');
      l=Math.max(x0,l-2);t=Math.max(y0,t-2);r=Math.min(x1-1,r+2);b=Math.min(y1-1,b+2);
      patches.set(patch.direction+':'+patch.frame,{image:img,x:l,y:t,w:r-l+1,h:b-t+1,neckY:patch.neckY,targetNeck:patch.targetNeck,offsetX:patch.offsetX||0,headOverlap:patch.headOverlap||0});
    }
    let sideReviewImage;
    if(item.sideReview){sideReviewImage=new Image();sideReviewImage.src=item.sideReview.image;await sideReviewImage.decode();}
    return {item,image,rows,idleImage,idle,idleHeight:Math.max(...idle.map(c=>c.h)),patches,sideReviewImage};
  })();cache.set(id,job);job.catch(()=>cache.delete(id));return job;
}
export function drawOutfit(c,art,{x,y,height=116,direction=0,phase=0,walking=true,shadow=true,frame}={}){
  const d=Math.max(0,Math.min(3,Math.trunc(direction))),row=art.rows[d];
  if(!walking&&frame===undefined){
    const cell=art.idle[d],scale=height/art.idleHeight;
    c.save();if(shadow){c.fillStyle='#3b4c2e36';c.beginPath();c.ellipse(x,y+1,height*.19,height*.04,0,0,Math.PI*2);c.fill();}
    c.drawImage(art.idleImage,cell.x,cell.y,cell.w,cell.h,x-cell.w*scale/2,y-cell.h*scale,cell.w*scale,cell.h*scale);c.restore();return -1;
  }
  const index=frame===undefined?(walking?walkFrame(true,phase,4)-1:1):Math.max(0,Math.min(3,Math.trunc(frame)));
  const cell=row.cells[index],scale=height/row.height;
  c.save();if(shadow){c.fillStyle='#3b4c2e36';c.beginPath();c.ellipse(x,y+1,height*.19,height*.04,0,0,Math.PI*2);c.fill();}
  const patch=art.patches?.get(d+':'+index);
  const review=art.item.sideReview;
  if(art.sideReviewImage&&(d===1||d===3)&&review.frames.includes(index)){
    // Each repaired cell already contains a connected, registered figure.
    // Keep its collar intact instead of cutting and rescaling at the neck again.
    const s=height/400;
    c.drawImage(art.sideReviewImage,index*400,d===1?0:500,400,500,x-200*s,y-475*s,400*s,500*s);
  }
  else if(patch){
    const bodyH=patch.y+patch.h-patch.neckY,s=(row.bottom-patch.targetNeck)*scale/bodyH;
    c.drawImage(patch.image,patch.x,patch.neckY,patch.w,bodyH,x-patch.w*s/2+patch.offsetX*scale,y-bodyH*s,patch.w*s,bodyH*s);
    const headH=patch.targetNeck+1+(patch.headOverlap||0);
    c.drawImage(art.image,cell.x,cell.y,cell.w,headH,x-cell.w*scale/2,y-row.bottom*scale,cell.w*scale,headH*scale);
  }
  else c.drawImage(art.image,cell.x,cell.y,cell.w,cell.h,x-cell.w*scale/2,y-row.bottom*scale,cell.w*scale,cell.h*scale);c.restore();
  return index;
}







