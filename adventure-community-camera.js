import {createMapGesture} from './adventure-map-zoom.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function communityCamera(w,h,zoom,focus){
 const normal=Math.max(w/1.5,h),min=Math.min(w/1.5,h)/normal;
 const scale=clamp(zoom,min,2.2),height=normal*scale,width=height*1.5;
 const axis=(size,frame,center)=>size<=frame?(frame-size)/2:clamp(frame/2-center*size,frame-size,0);
 return {width,height,scale,min,left:axis(width,w,focus.x),top:axis(height,h,focus.y)};
}
export function communityZoom(field,nav,stop,walk,player){
 const world=field.querySelector('.exp-world');
 let scale=1,focus=null,cam,lastFoot,ignoreUntil=0;
 const minus=document.createElement('button'),plus=document.createElement('button');
 function follow(foot){
  if(lastFoot&&(lastFoot.x!==foot.x||lastFoot.y!==foot.y))focus=null;
  lastFoot={...foot};
  cam=communityCamera(field.clientWidth,field.clientHeight,scale,focus||{x:foot.x/100,y:foot.y/100});
  scale=cam.scale;minus.disabled=scale<=cam.min+.001;plus.disabled=scale>=2.199;
  return cam;
 }
 function zoom(base,next,from,to){
  const w=field.clientWidth,h=field.clientHeight,c=communityCamera(w,h,next,{x:.5,y:.5});
  scale=c.scale;
  focus={x:(from.x-base.left)/base.width+(w/2-to.x)/c.width,y:(from.y-base.top)/base.height+(h/2-to.y)/c.height};
  follow(player());
 }
 follow(player());
 for(const [el,label,step] of [[minus,'縮小社區',1/1.25],[plus,'放大社區',1.25]]){
  el.type='button';el.textContent=el===minus?'−':'＋';el.ariaLabel=label;
  el.onclick=()=>{stop();const p={x:field.clientWidth/2,y:field.clientHeight/2};zoom(cam,scale*step,p,p);};nav.prepend(el);
 }
 const gesture=createMapGesture({camera:()=>cam,stop,start:()=>{},zoom,tap:(p,button)=>button?button.click():walk(p.x+field.getBoundingClientRect().left,p.y+field.getBoundingClientRect().top)});
 const point=e=>({x:e.clientX-field.getBoundingClientRect().left,y:e.clientY-field.getBoundingClientRect().top});
 field.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!world.contains(e.target))return;
  e.preventDefault();gesture.down(e.pointerId,point(e),e.target.closest('button'));field.setPointerCapture(e.pointerId);
 });
 field.addEventListener('pointermove',e=>{if(gesture.has(e.pointerId)){e.preventDefault();gesture.move(e.pointerId,point(e));}});
 for(const type of ['pointercancel','lostpointercapture','pointerup'])field.addEventListener(type,e=>{
  if(!gesture.has(e.pointerId))return;e.preventDefault();ignoreUntil=performance.now()+600;gesture.up(e.pointerId,type!=='pointerup');
 });
 field.addEventListener('click',e=>{if(e.detail&&performance.now()<ignoreUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 return follow;
}
