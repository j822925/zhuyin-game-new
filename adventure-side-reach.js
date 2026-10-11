// A small, continuous deformation of the connected side artwork. The central
// torso and head stay fixed; only the reach outside the torso is eased inward.
// Distal paws/boots translate together rather than scaling the whole character.
const buffers=new Map();
const knots=[-.9,-.60,-.34,-.21,-.07,0,.07,.21,.34,.60,.9];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function reachWeight(x,y,profile){
  const depth=1+y,abs=Math.abs(x);
  const arm=smooth((depth-.52)/.10)*(1-smooth((depth-.75)/.08));
  const foot=smooth((depth-.79)/.15);
  // The envoy's upright staff and gripping hand stay rigid. Her free arm is
  // behind her in the right-facing source (also mirrored for the left view).
  const armWeight=profile==='staff'&&x>0?0:arm;
  const vertical=Math.max(armWeight,foot);
  const horizontal=abs<=.07?0:abs<.21?(abs-.07)/.14:abs<=.34?1:Math.max(0,(.60-abs)/.26);
  return vertical*horizontal;
}
export function sideReachX(x,y,height,profile){
  return x-Math.sign(x)*height*.022*reachWeight(x/height,y/height,profile);
}
export function drawGentleSide(c,height,draw,profile=null){
  if(!profile){draw(c);return;}
  const unit=Math.ceil(height),ox=unit,oy=Math.ceil(height*1.1),width=unit*2,bottom=oy+Math.ceil(height*.05);
  const transform=c.getTransform(),resolution=Math.min(3,Math.max(2,Math.ceil(Math.hypot(transform.a,transform.b))));
  const key=width+'x'+bottom+'@'+resolution;
  let cv=buffers.get(key);
  if(!cv){cv=document.createElement('canvas');cv.width=width*resolution;cv.height=bottom*resolution;buffers.set(key,cv);if(buffers.size>4)buffers.delete(buffers.keys().next().value);}
  const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);
  ctx.save();ctx.scale(resolution,resolution);ctx.translate(ox,oy);draw(ctx);ctx.restore();
  // Upper artwork is copied once, without deformation. Keep row boundaries
  // integral to avoid transparent horizontal seams at small game sizes.
  const start=Math.floor(oy-height*.48);
  c.save();c.beginPath();c.rect(-ox,-oy,width,start);c.clip();draw(c);c.restore();
  for(let row=start;row<bottom;row+=2){
    const rows=Math.min(2,bottom-row),y=row-oy;
    for(let i=0;i<knots.length-1;i++){
      const left=knots[i]*height,right=knots[i+1]*height;
      const dl=sideReachX(left,y+rows/2,height,profile),dr=sideReachX(right,y+rows/2,height,profile);
      c.drawImage(cv,(ox+left)*resolution,row*resolution,(right-left)*resolution,rows*resolution,dl,y,dr-dl,rows);
    }
  }
}
