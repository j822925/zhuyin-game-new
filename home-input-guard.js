// Decorating uses one finger to place furniture. Keep a second finger from
// starting browser magnification or taking over the active furniture drag.
// Outside the editor the island map keeps its own pinch controls unchanged.
export function installHomeInputGuard({stage,panel,enabled,view=window}){
 const touches=new Set();let multi=false,lastTap=null,suppressClickUntil=0;
 const inEditor=target=>!!target&&(stage.contains(target)||panel.contains(target));
 const active=e=>enabled()&&inEditor(e.target);
 const consume=e=>{if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
 const reset=()=>{touches.clear();multi=false;lastTap=null;suppressClickUntil=0;};
 const bindings=[];
 const on=(target,type,listener,options)=>{target.addEventListener(type,listener,options);bindings.push(()=>target.removeEventListener(type,listener,options));};
 const capture={capture:true,passive:false};
 for(const root of [stage,panel]){
  on(root,'pointerdown',e=>{if(!active(e)||e.pointerType!=='touch')return;touches.add(e.pointerId);if(touches.size>1){multi=true;suppressClickUntil=e.timeStamp+700;}if(multi)consume(e);},capture);
  on(root,'pointermove',e=>{if(enabled()&&multi&&touches.has(e.pointerId))consume(e);},capture);
  const end=e=>{if(!touches.has(e.pointerId))return;touches.delete(e.pointerId);if(multi){suppressClickUntil=e.timeStamp+400;consume(e);}if(!touches.size)multi=false;};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(root,type,end,capture);
  on(root,'touchstart',e=>{if(active(e)&&e.touches.length>1)consume(e);},capture);
  on(root,'touchmove',e=>{if(active(e)&&e.touches.length>1)consume(e);},capture);
  on(root,'touchend',e=>{
   if(!active(e)||e.touches.length)return;
   const touch=e.changedTouches?.[0],now=e.timeStamp;
   if(touch&&lastTap&&now-lastTap.time<330&&Math.hypot(touch.clientX-lastTap.x,touch.clientY-lastTap.y)<24){if(e.cancelable)e.preventDefault();lastTap=null;}
   else lastTap=touch?{time:now,x:touch.clientX,y:touch.clientY}:null;
  },capture);
  on(root,'dblclick',e=>{if(active(e))consume(e);},capture);
  on(root,'click',e=>{if(active(e)&&(multi||e.timeStamp<suppressClickUntil))consume(e);},capture);
  for(const type of ['gesturestart','gesturechange','gestureend'])on(root,type,e=>{if(active(e))consume(e);},capture);
  on(root,'wheel',e=>{if(active(e)&&e.ctrlKey)consume(e);},capture);
 }
 on(view,'blur',reset);
 return {reset,destroy(){reset();bindings.forEach(remove=>remove());}};
}
