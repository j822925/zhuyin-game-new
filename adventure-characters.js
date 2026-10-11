import {loadSideCycle} from './adventure-side-atlas.js?v=panda-hold-v49';
import {drawWalkOutline} from './adventure-walk-outline.js';
import {loadWalkAppearance,drawWalkAppearance} from './adventure-walk-appearance.js';
import {drawRabbit} from './walk-preview-art.js?v=panda-hold-v49';
import {walkFrame} from './adventure-animation.js';
import {walkCharacter} from './data/walk-catalog.js?v=panda-hold-v49';
import {registerWalker,loadPoseAtlas,collarMetrics} from './adventure-registration.js';
import {poseRegions,drawPoseRegion} from './adventure-pose-regions.js';
import {drawGentleSide} from './adventure-side-reach.js';
import {drawGownSide} from './adventure-gown-side.js';
import {loadBearSide,drawBearSide} from './adventure-bear-side.js';
import {drawDepthWalk} from './adventure-depth-walk.js';

const cache=new Map();
export async function loadWalker(id){
  const role=walkCharacter(id);
  if(!role?.walk)throw new Error('角色行走動畫尚未完成');
  if(role.walk.kind==='rabbit')return {role};
  if(cache.has(id))return cache.get(id);
  const pending=loadPoseAtlas(role.walk.image).then(async atlas=>{
    const rows=[0,1,2].map(row=>{
      const cells=atlas.cells.slice(row*5,row*5+5);
      return {height:Math.max(...cells.map(c=>c.h))};
    });
    let side=null;
    if(role.walk.sideImage&&!role.walk.sideIntact){
      const [columns,rows]=role.walk.sideGrid??[4,1];
      const poses=await loadPoseAtlas(role.walk.sideImage,columns,rows);
      side={atlas:poses,height:Math.max(...poses.cells.map(s=>s.h)),registration:registerWalker(poses,{columns:columns*rows,rows:1})};
      side.collars=poses.cells.map(s=>collarMetrics(poses,s,.50));
      side.headCollar={x:atlas.cells[5].w*.66,y:Math.round(atlas.cells[5].h*.53)};
      if(role.walk.motion==='human')side.regions=poses.cells.map(s=>poseRegions(poses,s,.44));
    }
    const registration=registerWalker(atlas);
    let front=null;
    if(role.walk.frontImage){
      const poses=await loadPoseAtlas(role.walk.frontImage,4,1);
      front={atlas:poses,height:Math.max(...poses.cells.map(s=>s.h)),registration:registerWalker(poses,{columns:4,rows:1})};
      front.regions=poses.cells.map(s=>poseRegions(poses,s,.50));
    }
    const regions=front||role.walk.motion==='human'?atlas.cells.map((s,i)=>poseRegions(atlas,s,role.walk.motion==='human'?.49:i<5?.50:.49)):null;
    let full=null;
    if(role.walk.fullImage){
      const poses=await loadPoseAtlas(role.walk.fullImage,4,4);
      const align=atlas=>[[0,4],[4,12],[12,16]].flatMap(([a,b])=>registerWalker({image:atlas.image,cells:atlas.cells.slice(a,b)},{columns:b-a,rows:1,baseFrame:1}));
      full={atlas:poses,registration:align(poses),heights:[Math.max(...poses.cells.slice(0,4).map(s=>s.h)),Math.max(...poses.cells.slice(4,12).map(s=>s.h)),Math.max(...poses.cells.slice(12).map(s=>s.h))]};
      if(role.walk.fullPatchImage){
        const patch=await loadPoseAtlas(role.walk.fullPatchImage,4,4);
        full.patch={atlas:patch,registration:align(patch),cells:role.walk.fullPatchCells};
      }
    }
    let cycle=null;
    if(role.walk.cycleImage){
      const poses=await loadPoseAtlas(role.walk.cycleImage,3,3);
      cycle={atlas:poses,registration:registerWalker(poses,{columns:3,rows:3,baseFrame:1}),heights:[0,1,2].map(r=>Math.max(...poses.cells.slice(r*3,r*3+3).map(s=>s.h)))};
      if(role.walk.cycleSideImage&&!role.walk.sideLayers){
        cycle.side=await loadSideCycle(role.walk);
        const side=cycle.side.atlas;
        if(role.walk.cycleSideHead){
          const {baseCut,poseCut}=role.walk.cycleSideHead;
          cycle.side.headRegion=poseRegions(poses,poses.cells[4],baseCut);
          cycle.side.regions=side.cells.map(s=>poseRegions(side,s,poseCut));
        }
      }
      if(role.walk.cycleSideIdleImage){
        const idle=await loadPoseAtlas(role.walk.cycleSideIdleImage,4,1);
        cycle.sideIdle={atlas:idle,height:Math.max(...idle.cells.map(s=>s.h)),registration:registerWalker(idle,{columns:4,rows:1,baseFrame:1})};
      }
      if(role.walk.cycleFrontImage){
        const front=await loadPoseAtlas(role.walk.cycleFrontImage,3,3);
        cycle.front={atlas:front,registration:registerWalker(front,{columns:3,rows:3,baseFrame:1})};
        cycle.heights[0]=Math.max(...front.cells.slice(0,3).map(s=>s.h));
      }
      if(role.walk.cycleSideNeutralImage){
        const sideNeutral=await loadPoseAtlas(role.walk.cycleSideNeutralImage,3,3);
        cycle.sideNeutral={atlas:sideNeutral,registration:registerWalker(sideNeutral,{columns:3,rows:3,baseFrame:1})};
        // Only the corrected side passing/idle cell is used. Other directions
        // and both established contact drawings retain their original source.
        cycle.heights[1]=Math.max(cycle.heights[1],sideNeutral.cells[4].h);
      }
      if(role.walk.cyclePatchImage){
        const patch=await loadPoseAtlas(role.walk.cyclePatchImage,3,3);
        cycle.patch={atlas:patch,registration:registerWalker(patch,{columns:3,rows:3,baseFrame:1}),cells:role.walk.cyclePatchCells};
        for(const index of cycle.patch.cells){const row=Math.floor(index/3);cycle.heights[row]=Math.max(cycle.heights[row],patch.cells[index].h);}
      }
      if(role.walk.cycleCorrection){
        const corrected=await loadPoseAtlas(role.walk.cycleCorrection,3,3);
        cycle.correction={atlas:corrected,registration:registerWalker(corrected,{columns:3,rows:3,baseFrame:1})};
        cycle.heights[0]=Math.max(cycle.heights[0],corrected.cells[2].h);
      }
    }
    let humanFront=null;
    if(role.walk.humanFrontImage){
      const poses=await loadPoseAtlas(role.walk.humanFrontImage,3,1);
      humanFront={atlas:poses,height:Math.max(...poses.cells.map(s=>s.h)),regions:poses.cells.map(s=>poseRegions(poses,s,.43))};
    }
    let sideLayers=null;
    if(role.walk.sideLayers){
      const [body,boots]=await Promise.all([
        loadPoseAtlas(role.walk.sideLayers.body,1,1),
        loadPoseAtlas(role.walk.sideLayers.boots,2,1),
      ]);
      sideLayers={body,boots};
    }
    const intactSide=!cycle&&role.walk.sideIntact&&role.walk.cycleSideImage?await loadSideCycle(role.walk):null;
    const backCycle=role.walk.backCycle?await loadSideCycle(role.walk.backCycle):null;
    const frontCycle=role.walk.frontCycle?await loadSideCycle(role.walk.frontCycle):null;
    const appearance=role.walk.appearance?await loadWalkAppearance(role.walk.appearance):null;
    const bearSide=role.walk.bearSide?await loadBearSide(role.walk.bearSide):null;
    // Apply painted local edits after measuring the original atlas so changing
    // an arm silhouette cannot alter the head, pose bounds or walk alignment.
    if(role.walk.registeredPosePatches?.length){
      const image=document.createElement('canvas');
      image.width=atlas.image.width;image.height=atlas.image.height;
      const ctx=image.getContext('2d');ctx.drawImage(atlas.image,0,0);
      for(const patch of role.walk.registeredPosePatches){
        const source=await loadPoseAtlas(patch.image,1,1),dst=atlas.cells[patch.index];
        if(!dst||source.image.width!==dst.w||source.image.height!==dst.h)throw new Error('已定位動作圖尺寸不符');
        ctx.clearRect(dst.x,dst.y,dst.w,dst.h);
        ctx.drawImage(source.image,dst.x,dst.y);
      }
      atlas={...atlas,poseImages:Object.fromEntries(role.walk.registeredPosePatches.map(p=>[p.index,image]))};
    }
    return {role,atlas,rows,registration,side,front,regions,cycle,humanFront,full,sideLayers,intactSide,backCycle,frontCycle,appearance,bearSide};
  }).catch(error=>{cache.delete(id);throw error;});
  cache.set(id,pending);
  // Bound decoded images for mobile devices. Existing scene keeps its own ref.
  if(cache.size>5)cache.delete(cache.keys().next().value);
  return pending;
}
export function walkerFrameCount(walker,direction){
  if((direction===1||direction===3)&&walker?.intactSide)return walker.intactSide.atlas.cells.length;
  if((direction===1||direction===3)&&walker?.sideLayers)return 4;
  return direction===1||direction===3?walker?.role.walk.sideFrames??(walker?.full?8:undefined)??walker?.cycle?.side?.atlas.cells.length??walker?.side?.atlas.cells.length??4:4;
}
// Preview timing is independent of drawing count. A role-wide cycle keeps
// every direction in sync; unreviewed roles retain their existing timing.
export function walkerPreviewPhaseRate(walker,direction){
  const side=direction===1||direction===3;
  const cycleMs=walker?.role.walk.previewCycleMs??(side?walker?.role.walk.sidePreviewCycleMs:undefined);
  return cycleMs?Math.PI*2/cycleMs:1/110;
}
export function drawWalker(c,art,walker,options){
  const draw=(ctx,opts)=>walker?.appearance?drawWalkAppearance(ctx,walker.appearance,opts,(target,original)=>drawWalkerArt(target,art,walker,original)):drawWalkerArt(ctx,art,walker,opts);
  if(walker?.role.walk.uniformOutline)return drawWalkOutline(c,walker,options,draw);
  return draw(c,options);
}
function drawWalkerArt(c,art,walker,options){
  if(!walker||walker.role.id==='rabbit'){drawRabbit(c,art,options);return;}
  const {x,y,height=116,direction=0,walking=false,phase=0,shadow=true}=options;
  const row=direction===0?0:direction===2?2:1;
  const frame=walkFrame(walking,phase,walkerFrameCount(walker,direction)),side=row===1&&frame>0?walker.side:null;
  const atlas=side?.atlas??walker.atlas,index=side?frame-1:row*5+frame,s=atlas.cells[index];
  const scale=height/(side?.height??walker.rows[row].height),w=s.w*scale,h=s.h*scale;
  const anchor=(side?.registration??walker.registration)[index].anchorX*scale;
  c.save();c.translate(x,y);
  if(shadow){c.fillStyle='#3b4c2e36';c.beginPath();c.ellipse(0,1,height*.19,height*.044,0,0,Math.PI*2);c.fill();}
  if(direction===3)c.scale(-1,1);
  if(row===1&&walker.bearSide){drawBearSide(c,walker.bearSide,{height,phase,walking});c.restore();return;}
  const intact=row===1?walker.intactSide:row===2?walker.backCycle:walker.frontCycle;
  if(intact){
    const i=walking?(row!==1?[0,1,2,1][frame-1]:frame-1):1;
    const pose=intact.atlas.cells[i],size=height/intact.height,axis=intact.registration[i].anchorX;
    if(row!==1&&walking&&walker.role.walk.depthWalkMotion){
      const motion=walker.role.walk.depthWalkMotion[row===0?'front':'back'];
      if(motion){drawDepthWalk(c,intact,i,{height,phase,motion});c.restore();return;}
    }
    if(row===1&&walking&&walker.role.walk.sidePoseBob){
      // One continuous painted pose from hip through cuff and boot. Move the
      // upper body gently with the two steps, keeping the support sole fixed.
      const bob=Math.cos(phase*2)*height*walker.role.walk.sidePoseBob;
      const cut=Math.round(pose.h*.72),top=-pose.h*size+bob,join=top+cut*size;
      c.drawImage(intact.atlas.image,pose.x,pose.y,pose.w,cut,-axis*size,top,pose.w*size,cut*size);
      c.drawImage(intact.atlas.image,pose.x,pose.y+cut,pose.w,pose.h-cut,-axis*size,join,pose.w*size,-join);
      c.restore();return;
    }
    c.drawImage(intact.atlas.image,pose.x,pose.y,pose.w,pose.h,-axis*size,-pose.h*size,pose.w*size,pose.h*size);
    c.restore();return;
  }
  if(row===1&&walker.sideLayers){
    drawGownSide(c,walker.sideLayers,{height,frame,walking});c.restore();return;
  }
  if(walker.full&&walking){
    const index=row===1?4+frame-1:row===0?[0,1,2,1][frame-1]:(walker.role.walk.fullBackFrames??[12,13,14,13])[frame-1];
    const original=row===0&&walker.role.walk.fullFrontOriginal;
    const source=original?walker:walker.full.patch?.cells.includes(index)?walker.full.patch:walker.full;
    const sourceIndex=original?row*5+(row===0&&walker.role.walk.fullFrontOriginal?[1,0,3,0][frame-1]:0):index;
    const body=source.atlas.cells[sourceIndex];
    // New complete sheets keep the painted head, shoulders and torso together.
    // Register the whole cycle against one head position per direction.
    const size=height/(original?walker.rows[row].height:walker.full.heights[row]);
    const reg=source.registration[sourceIndex],neutral=source.atlas.cells[original?row*5:row===0?1:row===1?5:13];
    const top=-neutral.h*size-reg.headShiftY*size+Math.sin(phase*2)*height*.003;
    const cut=Math.round(body.h*.66),join=top+cut*size;
    drawGentleSide(c,height,ctx=>{ctx.save();if(walker.role.walk.fullSideMirrors?.includes(index))ctx.scale(-1,1);
      ctx.drawImage(source.atlas.image,body.x,body.y,body.w,cut,-reg.anchorX*size,top,body.w*size,cut*size);
      ctx.drawImage(source.atlas.image,body.x,body.y+cut-1,body.w,body.h-cut+1,-reg.anchorX*size,join-size,body.w*size,-join+size);
      ctx.restore();},row===1?walker.role.walk.sideReach:null);
    c.restore();return;
  }
  if(walker.cycle){
    if(row===1&&walking&&walker.cycle.side?.headRegion){drawCycleSide(c,walker,{frame,phase,height});c.restore();return;}
    const sideCycle=row===1&&(walking||walker.role.walk.cycleSideIdle!==undefined)?(!walking&&walker.cycle.sideIdle?walker.cycle.sideIdle:walker.cycle.side):null;
    const idx=sideCycle?(walking?frame-1:walker.role.walk.cycleSideIdle):row*3+(walking?[0,1,2,1][frame-1]:1);
    const source=sideCycle??(walker.cycle.patch?.cells.includes(idx)?walker.cycle.patch:row===0&&walker.cycle.front?walker.cycle.front:idx===4&&walker.cycle.sideNeutral?walker.cycle.sideNeutral:idx===2&&walker.cycle.correction?walker.cycle.correction:walker.cycle),pose=source.atlas.cells[idx];
    const size=height/(sideCycle?.height??walker.cycle.heights[row]),axis=source.registration[idx].anchorX;
    // Preserve the whole painted silhouette; no separate skirt/leg stretching.
    // All poses share one scale and baseline, including when mirrored left.
    if(sideCycle&&walker.role.walk.sideIntact){
      c.drawImage(source.atlas.image,pose.x,pose.y,pose.w,pose.h,-axis*size,-pose.h*size,pose.w*size,pose.h*size);
      c.restore();return;
    }
    const neutral=sideCycle?sideCycle.atlas.cells[1]:(row===0&&walker.cycle.front?walker.cycle.front:walker.cycle).atlas.cells[row*3+1];
    const top=-neutral.h*size-source.registration[idx].headShiftY*size+(walking?Math.sin(phase*2)*height*.003:0);
    const cut=Math.round(pose.h*.5),join=top+cut*size;
    // Keep the long hair and gown as one continuous drawing. Align the head
    // vertically; absorb small source-height errors in the draping lower half.
    drawGentleSide(c,height,ctx=>{
      ctx.drawImage(source.atlas.image,pose.x,pose.y,pose.w,cut,-axis*size,top,pose.w*size,cut*size);
      ctx.drawImage(source.atlas.image,pose.x,pose.y+cut-1,pose.w,pose.h-cut+1,-axis*size,join-size,pose.w*size,-join+size);
    },row===1&&walking?walker.role.walk.sideReach:null);
    c.restore();return;
  }
  if(walker.role.walk.motion==='human'&&(walking||row===0)){
    drawHumanCycle(c,walker,{row,frame,phase:walking?phase:0,height,walking});c.restore();return;
  }
  if(walker.front&&walking&&row!==1){
    drawFoxEndCycle(c,walker,{row,frame,phase,height});c.restore();return;
  }
  if(side){
    // Keep the established face and head scale. Each new pose remains a
    // connected torso / arms / legs drawing, joined beneath the collar.
    const head=walker.atlas.cells[5],hs=height/walker.rows[1].height;
    const hc=side.headCollar,bc=side.collars[index];
    const bob=stepBob(phase,height),bodyHeight=(head.h-hc.y)*hs-bob;
    const widthScale=hs*head.w/s.w;
    drawGentleSide(c,height,ctx=>{
      ctx.save();
      ctx.drawImage(atlas.image,s.x,s.y+bc.y,s.w,s.h-bc.y,-bc.x*widthScale,-bodyHeight,s.w*widthScale,bodyHeight);
      const occlusion=walker.role.walk.sideOcclusions?.[index];
      if(occlusion){
        // Exclude only a surplus paw outside the vest in these source poses.
        // Keep the real rear arm, near arm, satchel and all leg pixels intact.
        const sy=bodyHeight/(s.h-bc.y),mask=new Path2D();
        occlusion.forEach(([px,py],i)=>{
          const dx=(px-bc.x)*widthScale,dy=-bodyHeight+(py-bc.y)*sy;
          if(i)mask.lineTo(dx,dy);else mask.moveTo(dx,dy);
        });mask.closePath();
        // Fox uses the gentle-side offscreen body pass. This region is below
        // its unwarped upper pass, so erasure never touches the scene behind it.
        // Erasing AFTER drawing also preserves identical resampling of feet.
        ctx.globalCompositeOperation='destination-out';ctx.fill(mask);
      }
      ctx.restore();
    },walker.role.walk.sideReach);
    c.save();c.translate(0,-bodyHeight);
    // The old tail rises beside the cheek. Exclude that corner from the head
    // region so it cannot become a detached extra tail above the new body.
    const left=-hc.x*hs,top=-hc.y*hs,right=(head.w-hc.x)*hs;
    c.beginPath();c.moveTo(left,top);c.lineTo(right,top);c.lineTo(right,2*hs);
    c.lineTo(left+head.w*.40*hs,2*hs);c.lineTo(left+head.w*.24*hs,top+head.h*.45*hs);
    c.lineTo(left+head.w*.20*hs,top+head.h*.40*hs);
    c.lineTo(left,top+head.h*.40*hs);c.closePath();c.clip();
    c.drawImage(walker.atlas.image,head.x,head.y,head.w,hc.y+2,-hc.x*hs,-hc.y*hs,head.w*hs,(hc.y+2)*hs);
    c.restore();c.restore();return;
  }
  c.drawImage(atlas.image,s.x,s.y,s.w,s.h,-anchor,-h,w,h);
  c.restore();
}

function drawHumanCycle(c,walker,{row,frame,phase,height,walking}){
  const head=walker.atlas.cells[row*5],headRegion=walker.regions[row*5],hs=height/walker.rows[row].height;
  const side=row===1?walker.side:null;
  const source=side??(row===0?walker.humanFront:null);
  const contact=frame===1||frame===3;
  const index=side?frame-1:source?(contact?(frame===1?0:2):1):contact?(row===0?(frame===1?1:3):11):row*5;
  const atlas=source?.atlas??walker.atlas,body=atlas.cells[index],region=(source?.regions??walker.regions)[index];
  // Only the plain, symmetric back of this football kit is mirrored. The
  // face, front crest and all other characters' accessories are never flipped.
  const mirror=row===2&&frame===3;
  const bob=walking?stepBob(phase,height):0,bh=(head.h-headRegion.cut)*hs-bob;
  const sx=source?height/source.height*(row===0?1.08:1):hs,sy=bh/(body.h-region.cut);
  const collarX=(headRegion.anchor-walker.registration[row*5].anchorX)*hs;
  c.save();c.translate(collarX,0);if(mirror)c.scale(-1,1);
  drawGentleSide(c,height,ctx=>drawPoseRegion(ctx,atlas,body,region.bodyPath,{x:-region.anchor*sx,y:-bh-region.cut*sy,sx,sy}),row===1&&walking?walker.role.walk.sideReach:null);c.restore();
  c.save();c.translate(collarX,-bh);
  drawPoseRegion(c,walker.atlas,head,headRegion.headPath,{x:-headRegion.anchor*hs,y:-headRegion.cut*hs,sx:hs});c.restore();
}

function drawFoxEndCycle(c,walker,{row,frame,phase,height}){
  const head=walker.atlas.cells[row*5],hs=height/walker.rows[row].height;
  const passing=frame===2||frame===4;
  const source=row===0&&!passing?walker.front:null;
  const atlas=source?.atlas??walker.atlas;
  const index=source?(frame===1?0:2):row===2&&!passing?(frame===1?11:14):row*5;
  const body=atlas.cells[index];
  const bodyAtlas=atlas.poseImages?.[index]?{...atlas,image:atlas.poseImages[index]}:atlas;
  const region=source?source.regions[index]:walker.regions[index];
  const headRegion=walker.regions[row*5];
  const hc={x:headRegion.anchor,y:headRegion.cut};
  const bodyCut=region.cut;
  const sx=source?hs*head.w/source.atlas.cells[0].w:hs;
  const bodyAnchor=region.anchor;
  // Neutral passing frames keep paws at thigh level and remove the old
  // chest-level fist. The contact poses alternate complete connected bodies.
  const bob=stepBob(phase,height);
  const bh=(head.h-hc.y)*hs-bob;
  const sy=bh/(body.h-bodyCut);
  drawPoseRegion(c,bodyAtlas,body,region.bodyPath,{x:-bodyAnchor*sx,y:-bh-bodyCut*sy,sx,sy});
  c.save();c.translate(0,-bh);
  drawPoseRegion(c,walker.atlas,head,headRegion.headPath,{x:-hc.x*hs,y:-hc.y*hs,sx:hs});c.restore();
}

// The collar and head share exactly the body's two weight transfers per stride.
// Do not add a separate head swivel: its different beat made the head appear
// disconnected even though the neck position itself followed the body.
function stepBob(phase,height){return Math.sin(phase*2)*height*.005;}

function drawCycleSide(c,walker,{frame,phase,height}){
  const cycle=walker.cycle,side=cycle.side,head=cycle.atlas.cells[4],hr=side.headRegion;
  const body=side.atlas.cells[frame-1],br=side.regions[frame-1];
  const hs=height/cycle.heights[1],sx=height/side.height;
  const bh=(head.h-hr.cut)*hs-stepBob(phase,height),sy=bh/(body.h-br.cut);
  const collarX=(hr.anchor-cycle.registration[4].anchorX)*hs;
  c.save();c.translate(collarX,0);
  drawGentleSide(c,height,ctx=>drawPoseRegion(ctx,side.atlas,body,br.bodyPath,{x:-br.anchor*sx,y:-bh-br.cut*sy,sx,sy}),walker.role.walk.sideReach);
  drawPoseRegion(c,cycle.atlas,head,hr.headPath,{x:-hr.anchor*hs,y:-bh-hr.cut*hs,sx:hs});c.restore();
}
