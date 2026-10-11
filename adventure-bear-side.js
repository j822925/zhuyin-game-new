// One master head and one copy of each limb; poses change transforms, not art.
import {loadPoseAtlas} from './adventure-registration.js';
const TAU=Math.PI*2;
const NEAR=[[.09,0,0],[0,0,0],[-.09,0,.10],[0,.018,.035]];
const FAR=[NEAR[2],NEAR[3],NEAR[0],NEAR[1]];
function sample(keys,phase){
  const t=((phase%TAU+TAU)%TAU)/TAU*4,i=Math.floor(t),u=t-i;
  // Smooth arrival/departure at each of the four teacher-approved key poses.
  const s=u*u*(3-2*u);
  return keys[i].map((v,k)=>v+(keys[(i+1)%4][k]-v)*s);
}
export function bearSidePose(phase,walking=true){
  if(!walking)return {near:[.008,0,0],far:[-.016,0,0],bob:0,arm:0,nod:0};
  return {near:sample(NEAR,phase),far:sample(FAR,phase),
    bob:.004*Math.cos(phase*2),arm:.16*Math.cos(phase),nod:.012*Math.sin(phase*2)};
}
export async function loadBearSide(config){
  const [master,parts]=await Promise.all([loadPoseAtlas(config.master,1,1),loadPoseAtlas(config.parts,4,1)]);
  return {master,parts};
}
export function drawBearSide(ctx,rig,{height,phase,walking}){
  const h=height,p=bearSidePose(phase,walking),bob=p.bob*h;
  function part(index,x,y,w,hh){const s=rig.parts.cells[index];ctx.drawImage(rig.parts.image,s.x,s.y,s.w,s.h,x,y,w,hh);}
  function arm(near){
    ctx.save();ctx.translate((near?-.032:.074)*h,-.478*h+bob);
    ctx.rotate(near?p.arm:-p.arm);if(!near)ctx.filter='brightness(.91)';
    const ah=.265*h,aw=1.12*ah*rig.parts.cells[1].w/rig.parts.cells[1].h;
    part(1,-aw*.48,-ah*.055,aw,ah);ctx.restore();
  }
  function leg(near){
    const pose=near?p.near:p.far,bootH=.18*h,bootW=bootH*rig.parts.cells[3].w/rig.parts.cells[3].h;
    const footX=pose[0]*h,footY=-pose[1]*h,toeX=footX+bootW*.65,angle=pose[2];
    // All boot pixels keep one scale. Pivot at the toe to avoid sinking soles.
    const dx=-bootW*.65,dy=-bootH*.87;
    const cuffX=toeX+dx*Math.cos(angle)-dy*Math.sin(angle),cuffY=footY+dx*Math.sin(angle)+dy*Math.cos(angle);
    const hipX=(near?-.022:-.042)*h,hipY=-.236*h+bob;
    ctx.save();if(!near)ctx.filter='brightness(.93)';
    ctx.translate(hipX,hipY);ctx.rotate(Math.atan2(cuffY-hipY,cuffX-hipX)-Math.PI/2);
    part(2,-.0675*h,-.03*h,.135*h,.22*h);ctx.restore();
    ctx.save();if(!near)ctx.filter='brightness(.93)';ctx.translate(toeX,footY);ctx.rotate(angle);
    part(3,-bootW,-bootH,bootW,bootH);
    // The thigh continues into the open cuff; its inner opening must not
    // look like an empty boot. Reuse the same trouser texture under the rim.
    ctx.save();ctx.beginPath();ctx.ellipse(-bootW*.66,-bootH*.90,bootW*.20,bootH*.040,0,0,Math.PI*2);ctx.clip();
    part(2,-bootW*.89,-bootH*1.35,bootW*.48,bootH*.65);ctx.restore();ctx.restore();
  }
  arm(false);leg(false);leg(true);
  const hh=.30*h,ww=1.20*hh*rig.parts.cells[0].w/rig.parts.cells[0].h;
  part(0,-ww*.60,-.51*h+bob,ww,hh);
  arm(true);
  const s=rig.master.cells[0],cut=Math.round(s.h*.502),scale=.94*h/s.h;
  // Use the untouched original head, pivoting at its collar with the torso.
  ctx.save();ctx.translate(0,-.495*h+bob);ctx.rotate(p.nod);
  ctx.drawImage(rig.master.image,s.x,s.y,s.w,cut,-s.w*.53*scale,-cut*scale,s.w*scale,cut*scale);
  ctx.restore();
}
