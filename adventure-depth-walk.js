// Opt-in front/back balance motion for intact painted poses.
export function depthWalkGeometry(pose,{height,phase,neck=.46,bob=.008,tilt=.025}){
  const size=height/pose.h;
  const offset=Math.cos(phase*2)*height*bob;
  const top=-height+offset;
  const headCut=Math.round(pose.h*neck),hipCut=Math.round(pose.h*.73);
  return {size,top,headCut,hipCut,hipY:top+hipCut*size,
    neckY:top+headCut*size,angle:Math.sin(phase)*tilt};
}

export function drawDepthWalk(c,intact,index,{height,phase,motion}){
  const pose=intact.atlas.cells[index],axis=intact.registration[index].anchorX;
  const g=depthWalkGeometry(pose,{height,phase,...motion});
  const overlap=Math.max(2,Math.ceil(pose.h*.008)),bodyStart=g.headCut-overlap;
  const left=-axis*g.size,width=pose.w*g.size;
  // The original connected legs/cuffs/boots stay in one strip, anchored at y=0.
  c.drawImage(intact.atlas.image,pose.x,pose.y+g.hipCut,pose.w,pose.h-g.hipCut,
    left,g.hipY,width,-g.hipY);
  // A collar underlap covers the tiny tilt without exposing a neck gap.
  c.drawImage(intact.atlas.image,pose.x,pose.y+bodyStart,pose.w,g.hipCut-bodyStart,
    left,g.top+bodyStart*g.size,width,(g.hipCut-bodyStart)*g.size);
  c.save();c.translate(0,g.neckY);c.rotate(g.angle);
  c.drawImage(intact.atlas.image,pose.x,pose.y,pose.w,g.headCut+1,
    left,-g.headCut*g.size,width,(g.headCut+1)*g.size);
  c.restore();
}
