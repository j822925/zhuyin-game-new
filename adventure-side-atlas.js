import {loadPoseAtlas,registerWalker,collarMetrics} from './adventure-registration.js';

// Measure the opaque head silhouette, above the shoulders. A raised foot or
// changing cape/tail bounds must never decide the size of the head and torso.
function headWidths(atlas){
  const canvas=document.createElement('canvas');canvas.width=atlas.image.width;canvas.height=atlas.image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(atlas.image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  return atlas.cells.map(cell=>{
    let widest=0;
    for(let y=Math.floor(cell.h*.05);y<cell.h*.40;y++){
      let run=0;
      for(let x=0;x<cell.w;x++){
        const alpha=pixels[((cell.y+y)*canvas.width+cell.x+x)*4+3];
        run=alpha>150?run+1:0;widest=Math.max(widest,run);
      }
    }
    return widest;
  });
}

function normalizeHeadSize(atlas){
  const widths=headWidths(atlas),target=widths[0];
  if(widths.some(w=>w<1))throw new Error('無法辨識角色頭部尺寸');
  const sizes=atlas.cells.map((cell,i)=>({w:Math.round(cell.w*target/widths[i]),h:Math.round(cell.h*target/widths[i])}));
  const slot=Math.max(...sizes.map(s=>s.w))+8,height=Math.max(...sizes.map(s=>s.h))+8;
  const image=document.createElement('canvas');image.width=slot*sizes.length;image.height=height;
  const ctx=image.getContext('2d');
  const cells=atlas.cells.map((cell,i)=>{
    const out={x:i*slot+4,y:4,...sizes[i]};
    // Uniform whole-character scaling: no separate head/torso stretching.
    ctx.drawImage(atlas.image,cell.x,cell.y,cell.w,cell.h,out.x,out.y,out.w,out.h);
    return out;
  });
  const result={image,cells};
  return {atlas:result,before:widths,after:headWidths(result)};
}

// For vetted intact poses, register crown-to-support-sole height as well.
// Scale the complete figure uniformly; never stretch the head or legs alone.
// This is opt-in: floating props and long garments cannot use these bounds.
function normalizeStandingHeight(atlas){
  const before=atlas.cells.map(c=>c.h),target=before[0];
  const sizes=atlas.cells.map(c=>({w:Math.round(c.w*target/c.h),h:target}));
  const slot=Math.max(...sizes.map(s=>s.w))+8;
  const image=document.createElement('canvas');image.width=slot*sizes.length;image.height=target+8;
  const ctx=image.getContext('2d');
  const cells=atlas.cells.map((c,i)=>{
    const out={x:i*slot+4,y:4,...sizes[i]};
    ctx.drawImage(atlas.image,c.x,c.y,c.w,c.h,out.x,out.y,out.w,out.h);
    return out;
  });
  return {atlas:{image,cells},before,after:cells.map(c=>c.h)};
}

// A shared paper-doll head keeps the same painted fur/face/edge in every pose.
// Join at the collar, never through the face. Limb order comes from the vetted
// body poses; their source assets remain untouched and available for review.
function sharedHeadAtlas(atlas,{index,joins,slot:fixedSlot},headReference=null){
  const headAtlas=headReference??atlas,headIndex=headReference?0:index;
  const base=headAtlas.cells[headIndex],widths=headWidths(atlas);
  const headWidth=headReference?headWidths(headReference)[0]:widths[index];
  const necks=atlas.cells.map((c,i)=>collarMetrics(atlas,c,joins[i]));
  const target=headReference?collarMetrics(headAtlas,base,joins[index]):necks[index],slot=fixedSlot??Math.ceil(Math.max(...atlas.cells.map(c=>c.w))*1.5)+16;
  const height=base.h,image=document.createElement('canvas');image.width=slot*atlas.cells.length;image.height=height+8;
  const ctx=image.getContext('2d'),center=Math.floor(slot*.55),cells=[];
  atlas.cells.forEach((c,i)=>{
    const x=i*slot+center,y=4,sx=headWidth/widths[i],neck=necks[i];
    // Only registration below the collar compensates for source proportion drift.
    // One common crown and floor, no independent frame-wide enlargement.
    ctx.drawImage(atlas.image,c.x,c.y+neck.y,c.w,c.h-neck.y,
      x-neck.x*sx,y+target.y,c.w*sx,height-target.y);
    ctx.drawImage(headAtlas.image,base.x,base.y,base.w,target.y+1,
      x-target.x,y,base.w,target.y+1);
    cells.push({x:i*slot,y:4,w:slot,h:height});
  });
  return {atlas:{image,cells},registration:cells.map(()=>({anchorX:center,headShiftX:0,headShiftY:0,error:0}))};
}

// Passing poses sometimes have narrower calves/paws than their contact poses.
// Correct display registration only in the requested lower-limb band, keeping
// the supporting sole, lift height, source colors and upper artwork unchanged.
function registerPassingVolume(atlas,config){
  const image=document.createElement('canvas');image.width=atlas.image.width;image.height=atlas.image.height;
  const ctx=image.getContext('2d');ctx.drawImage(atlas.image,0,0);
  const pixels=ctx.getImageData(0,0,image.width,image.height).data;
  for(const index of config.frames??[1,3]){
    const cell=atlas.cells[index];let widest=0,axis=cell.w/2;
    for(let y=Math.floor(cell.h*.94);y<cell.h-3;y++){
      let start=-1;
      for(let x=0;x<=cell.w;x++){
        const solid=x<cell.w&&pixels[((cell.y+y)*image.width+cell.x+x)*4+3]>150;
        if(solid&&start<0)start=x;
        if(!solid&&start>=0){if(x-start>widest){widest=x-start;axis=(start+x)/2;}start=-1;}
      }
    }
    const top=Math.floor(cell.h*config.top),full=Math.floor(cell.h*config.full);
    // Keep expanded transparent edge samples inside this pose's own slot.
    ctx.save();ctx.beginPath();ctx.rect(cell.x,cell.y,cell.w,cell.h);ctx.clip();
    ctx.clearRect(cell.x,cell.y+top,cell.w,cell.h-top);
    for(let y=top;y<cell.h;y++){
      const t=Math.min(1,(y-top)/Math.max(1,full-top)),scale=1+(config.scale-1)*t*t*(3-2*t);
      ctx.drawImage(atlas.image,cell.x,cell.y+y,cell.w,1,cell.x+axis-axis*scale,cell.y+y,cell.w*scale,1);
    }
    ctx.restore();
  }
  return {image,cells:atlas.cells};
}

// Local repaint: retain the exact upper source art, then register the new
// lower-body drawing uniformly. No row-wise widening or pose rescheduling.
async function applyLowerPosePatches(atlas,patches){
  const image=document.createElement('canvas');image.width=atlas.image.width;image.height=atlas.image.height;
  const ctx=image.getContext('2d');ctx.drawImage(atlas.image,0,0);
  const sources=new Map();
  for(const patch of patches){
    const key=patch.image+'|'+(patch.columns??2);
    if(!sources.has(key))sources.set(key,await loadPoseAtlas(patch.image,patch.columns??2,1));
    const source=sources.get(key),src=source.cells[patch.cellIndex],dst=atlas.cells[patch.index];
    const ratio=dst.h/src.h,join=patch.join??.48;
    const a=collarMetrics(atlas,dst,join),b=collarMetrics(source,src,join);
    const x=dst.x+a.x-b.x*ratio+(patch.dx??0)*dst.h;
    const top=Math.round(dst.h*patch.from),feather=Math.max(1,Math.round(dst.h*.008));
    const layer=document.createElement('canvas');layer.width=image.width;layer.height=image.height;
    const p=layer.getContext('2d');
    if(patch.leftOfNeck!=null){
      // Exclude isolated neighbouring art outside this pose's leg region.
      const left=dst.x+a.x-patch.leftOfNeck*dst.h;
      p.beginPath();p.rect(left,0,image.width-left,image.height);p.clip();
    }
    p.drawImage(source.image,src.x,src.y,src.w,src.h,x,dst.y,src.w*ratio,dst.h);
    ctx.save();ctx.beginPath();ctx.rect(dst.x,dst.y+top,dst.w,dst.h-top);ctx.clip();
    for(let y=top;y<dst.h;y++){
      const alpha=Math.min(1,(y-top+1)/feather);
      ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=alpha;ctx.fillRect(dst.x,dst.y+y,dst.w,1);
      // Add complementary premultiplied contributions; source-over would
      // lower alpha in the feather and leave a pale horizontal seam.
      ctx.globalCompositeOperation='lighter';ctx.drawImage(layer,dst.x,dst.y+y,dst.w,1,dst.x,dst.y+y,dst.w,1);
    }
    ctx.restore();
  }
  return {image,cells:atlas.cells};
}

// Shared by the full walker and the lightweight side-only review page.
export async function loadSideCycle(walk){
        const [columns,rows]=walk.cycleSideGrid??[4,1];
        let side=await loadPoseAtlas(walk.cycleSideImage,columns,rows);
        // Opt-in selection keeps new small batches on their original directional art.
        if(walk.cycleSideCells)side={image:side.image,cells:walk.cycleSideCells.map(i=>side.cells[i])};
        const referencePoseHeight=walk.sideSharedHead?.image?side.cells[walk.sideSharedHead.index].h:null;
        const patches=walk.cycleSidePosePatches??(walk.cycleSidePosePatch?[walk.cycleSidePosePatch]:[]);
        if(patches.length){
          const replacements=new Map();
          for(const patch of patches){
            const replacement=await loadPoseAtlas(patch.image,patch.columns??1,patch.rows??1);
            const cell=replacement.cells[patch.cellIndex??0],original=side.cells[patch.index];
            if(!cell||!original)throw new Error('側面修正圖片的格數不正確');
            replacements.set(patch.index,{image:replacement.image,cell,width:Math.round(cell.w*original.h/cell.h)});
          }
          const width=Math.max(...side.cells.map(s=>s.w),...Array.from(replacements.values(),p=>p.width))+8;
          const height=Math.max(...side.cells.map(s=>s.h))+8;
          const sheet=document.createElement('canvas');sheet.width=width*side.cells.length;sheet.height=height;
          const ctx=sheet.getContext('2d');
          const cells=side.cells.map((original,i)=>{
            const replacement=replacements.get(i),source=replacement?.cell??original;
            const w=replacement?.width??original.w,h=original.h,x=i*width+4,y=4;
            ctx.drawImage(replacement?.image??side.image,source.x,source.y,source.w,source.h,x,y,w,h);
            return {x,y,w,h};
          });
          side={image:sheet,cells};
        }
        // The old foot placement remains the alignment anchor. A freshly
        // repainted sole must not recenter the entire fairy on every frame.
        const originalRegistration=walk.sideLowerPatches&&!walk.sideSharedHead?registerWalker(side,{columns:side.cells.length,rows:1,baseFrame:1}):null;
        if(walk.sideLowerPatches)side=await applyLowerPosePatches(side,walk.sideLowerPatches);
        let headSize=null,heightSize=null;
        if(walk.sideNormalizeHeight){
          const normalized=normalizeStandingHeight(side);side=normalized.atlas;
          heightSize={before:normalized.before,after:normalized.after};
          headSize={after:headWidths(side)};
        }else if(walk.sideNormalizeHead){
          const normalized=normalizeHeadSize(side);side=normalized.atlas;
          headSize={before:normalized.before,after:normalized.after};
        }
        let registration;
        if(walk.sideSharedHead){
          // Optional immutable head source: a body cleanup must not redraw the
          // approved head used by the remaining poses. Only bear opts in.
          let headReference=null;
          if(walk.sideSharedHead.image){
            const source=await loadPoseAtlas(walk.sideSharedHead.image,1,1),cell=source.cells[0];
            // Match the original pose replacement and height-normalization
            // sampling stages, so the approved head does not subtly resample.
            const firstWidth=Math.round(cell.w*referencePoseHeight/cell.h);
            const first=document.createElement('canvas');first.width=firstWidth+8;first.height=referencePoseHeight+8;
            first.getContext('2d').drawImage(source.image,cell.x,cell.y,cell.w,cell.h,4,4,firstWidth,referencePoseHeight);
            const h=side.cells[walk.sideSharedHead.index].h,w=Math.round(firstWidth*h/referencePoseHeight);
            const image=document.createElement('canvas');image.width=w+8;image.height=h+8;
            image.getContext('2d').drawImage(first,4,4,firstWidth,referencePoseHeight,4,4,w,h);
            headReference={image,cells:[{x:4,y:4,w,h}]};
          }
          const shared=sharedHeadAtlas(side,walk.sideSharedHead,headReference);side=shared.atlas;registration=shared.registration;
          headSize={before:headSize?.after,after:headWidths(side),shared:true};
        }else registration=originalRegistration??registerWalker(side,{columns:side.cells.length,rows:1,baseFrame:1});
        if(walk.sidePassingVolume)side=registerPassingVolume(side,walk.sidePassingVolume);
        // These drawings reference the final displayed proportions. Apply
        // after head/body registration so a second scale cannot thin them.
        if(walk.sideFinalLowerPatches)side=await applyLowerPosePatches(side,walk.sideFinalLowerPatches);
        // Already registered review exports must keep their full canvas bounds.
        // Cropping/rescaling them again would alter the approved head and stride.
        if(walk.sideRegisteredPosePatches?.length){
          const image=document.createElement('canvas');image.width=side.image.width;image.height=side.image.height;
          const ctx=image.getContext('2d',{willReadFrequently:true});ctx.drawImage(side.image,0,0);
          for(const patch of walk.sideRegisteredPosePatches){
            const source=await loadPoseAtlas(patch.image,1,1),dst=side.cells[patch.index];
            if(!dst||source.image.width!==dst.w||source.image.height!==dst.h)throw new Error('已定位側面圖尺寸不符');
            ctx.clearRect(dst.x,dst.y,dst.w,dst.h);
            ctx.drawImage(source.image,dst.x,dst.y);
          }
          side={image,cells:side.cells};
        }
        // Reuse an existing registered hold pose without changing limb art or
        // measuring the character again. Regions move with the intact torso.
        if(walk.fixedPoseRegions?.length){
          const image=document.createElement('canvas');image.width=side.image.width;image.height=side.image.height;
          const ctx=image.getContext('2d');ctx.drawImage(side.image,0,0);
          for(const region of walk.fixedPoseRegions){
            const src=side.cells[region.sourceIndex];
            for(const index of region.targetIndices){
              const dst=side.cells[index];
              if(!src||!dst||src.w!==dst.w||src.h!==dst.h)throw new Error('固定抱持區域的姿勢尺寸不符');
              ctx.save();ctx.beginPath();
              region.polygon.forEach(([x,y],i)=>i?ctx.lineTo(dst.x+x,dst.y+y):ctx.moveTo(dst.x+x,dst.y+y));
              ctx.closePath();ctx.clip();ctx.clearRect(dst.x,dst.y,dst.w,dst.h);
              ctx.drawImage(side.image,src.x,src.y,src.w,src.h,dst.x,dst.y,dst.w,dst.h);ctx.restore();
            }
          }
          side={image,cells:side.cells};
        }
        return {atlas:side,height:Math.max(...side.cells.map(s=>s.h)),registration,headSize,heightSize};
}
