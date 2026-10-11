import {loadPoseAtlas,registerWalker} from './adventure-registration.js';
import {walkFrame} from './adventure-animation.js';
const originalFrames=new WeakMap();

// Appearance is an upper-body layer. Approved lower-body pixels, registration,
// contact/passing poses and cadence continue to come from the original walker.
export async function loadWalkAppearance(spec){
  const atlas=await loadPoseAtlas(spec.image,3,2);
  return {atlas,registration:registerWalker(atlas,{columns:3,rows:2,baseFrame:1}),spec};
}
export function drawWalkAppearance(c,appearance,options,drawOriginal){
  const {x,y,height=116,direction=0,walking=false,phase=0}=options;
  if(direction===1||direction===3)return drawOriginal(c,options);
  const row=direction===2?1:0,{atlas,registration,spec}=appearance;
  const poseIndex=walking?[0,1,2,1][walkFrame(true,phase,4)-1]:1;
  const i=row*3+poseIndex,base=spec.sharedHead===false?i:row*3+1,pose=atlas.cells[i],head=atlas.cells[base];
  const layout=spec.rows[row],cutY=y-height*(1-layout.keepFrom);
  // This clip is deliberately fixed in world coordinates: every foot is drawn
  // by the exact old code at its exact old position, never scaled or restyled.
  const blend=height*.02;
  let original=originalFrames.get(appearance);
  if(!original){original=document.createElement('canvas');originalFrames.set(appearance,original);}
  if(original.width!==c.canvas.width||original.height!==c.canvas.height){original.width=c.canvas.width;original.height=c.canvas.height;}
  const oc=original.getContext('2d');oc.setTransform(1,0,0,1,0,0);oc.clearRect(0,0,original.width,original.height);
  oc.setTransform(c.getTransform());drawOriginal(oc,options);
  // Render the original in full before masking. Clipping its scaled drawImage
  // directly can change browser resampling at otherwise untouched shoe edges.
  c.save();c.beginPath();c.rect(x-height*2,cutY-blend,height*4,height*2);c.clip();c.setTransform(1,0,0,1,0,0);c.drawImage(original,0,0);c.restore();
  const size=height/head.h,headCut=head.h*layout.headCut;
  const poseHeadCut=pose.h*layout.headCut,poseBottom=pose.h*layout.bodyCut;
  const bob=walking?Math.sin(phase*2)*height*.003:0;
  const neckY=y-height*(1-layout.headHeight)+bob,top=y-height+bob;
  // One stable painted head per direction, with the same two small weight
  // transfers per stride. The clothing join absorbs this; feet stay untouched.
  const hx=-registration[base].anchorX*size+x;
  const bx=x-registration[i].anchorX*size;
  const paint=()=>{
    c.drawImage(atlas.image,head.x,head.y,head.w,headCut,hx,top,head.w*size,height*layout.headHeight);
    c.drawImage(atlas.image,pose.x,pose.y+poseHeadCut-1,pose.w,poseBottom-poseHeadCut+1,
      bx,neckY-1,pose.w*size,cutY-neckY+1);
  };
  c.save();c.beginPath();c.rect(x-height*2,y-height*1.4,height*4,cutY-blend-(y-height*1.4));c.clip();paint();c.restore();
  // Cross-fade only the clothing join, entirely ABOVE the locked foot band.
  // The old feet below cutY are never repainted, transformed or blended.
  for(let n=0;n<8;n++){
    c.save();c.beginPath();c.rect(x-height*2,cutY-blend+n*blend/8,height*4,blend/8);c.clip();c.globalAlpha*=1-(n+.5)/8;paint();c.restore();
  }
}
