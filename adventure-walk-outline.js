// Opt-in display contour. Paint every direction at one resolution so thin
// source edges don't alternate between pale and dark as poses change scale.
const buffers=new WeakMap();
export function drawWalkOutline(ctx,walker,options,paint){
  const endView=options.direction===0||options.direction===2;
  const contour=endView?walker.role?.walk?.endOutline:null;
  let buffer=buffers.get(walker);
  if(!buffer){
    const art=document.createElement('canvas'),mask=document.createElement('canvas');
    art.width=mask.width=1280;art.height=mask.height=900;
    buffer={art,mask};buffers.set(walker,buffer);
  }
  const {art,mask}=buffer,a=art.getContext('2d'),m=mask.getContext('2d');
  a.clearRect(0,0,art.width,art.height);
  paint(a,{...options,x:640,y:800,height:640,shadow:false});
  m.clearRect(0,0,mask.width,mask.height);m.globalCompositeOperation='source-over';
  m.drawImage(art,0,0);m.globalCompositeOperation='source-in';
  m.fillStyle=contour?.color??'#79523d';m.fillRect(0,0,mask.width,mask.height);
  m.globalCompositeOperation='source-over';
  const height=options.height??116,scale=height/640;
  ctx.save();ctx.translate(options.x,options.y);ctx.scale(scale,scale);
  if(options.shadow!==false){ctx.fillStyle='#3b4c2e36';ctx.beginPath();ctx.ellipse(0,1,640*.19,640*.044,0,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.globalAlpha*=contour?.opacity??1;
  const radius=contour?.radius??1.2;
  for(let n=0;n<8;n++){const angle=n*Math.PI/4;ctx.drawImage(mask,-640+Math.cos(angle)*radius,-800+Math.sin(angle)*radius);}
  ctx.restore();
  ctx.drawImage(art,-640,-800);ctx.restore();
}
