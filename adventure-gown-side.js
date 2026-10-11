// Right-facing anatomical right foot is the near layer. Keep each painted
// boot assigned to that leg for the entire cycle; the left view mirrors both.
export const GOWN_SIDE_STEPS=[
  {near:[ .032, 0,0],far:[-.032,0,.10]},
  {near:[0,0,0],far:[0,-.025,0]},
  {near:[-.032,0,.10],far:[.032,0,0]},
  {near:[0,-.025,0],far:[0,0,0]},
];

export function drawGownSide(ctx,layers,{height,frame,walking}){
  const step=walking?GOWN_SIDE_STEPS[(frame-1)%4]:{near:[.006,0,0],far:[-.016,0,0]};
  const boot=(index,pose)=>{
    const cell=layers.boots.cells[index],h=height*.145,w=h*cell.w/cell.h;
    ctx.save();
    // Pivot at the toe on the ground: a trailing heel rises without sinking.
    // Place the foot cycle beneath the centre of the gown, not its front edge.
    ctx.translate((pose[0]-.075)*height+w*.67,pose[1]*height);
    ctx.rotate(pose[2]);
    if(index===1)ctx.filter='brightness(0.91)';
    ctx.drawImage(layers.boots.image,cell.x,cell.y,cell.w,cell.h,-w*.92,-h,w,h);
    ctx.restore();
  };
  boot(1,step.far);
  boot(0,step.near);
  // The same complete head, body and hem cover both ankle roots in every pose.
  const cell=layers.body.cells[0],h=height*.915,w=h*cell.w/cell.h;
  const bob=walking&&frame%2===0?-height*.003:0;
  ctx.drawImage(layers.body.image,cell.x,cell.y,cell.w,cell.h,-w*.62,-height+bob,w,h);
}
