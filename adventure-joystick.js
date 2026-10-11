// One captured pointer owns the stick until release or cancellation.
export function createJoystick(element,{isEnabled,onStart}){
  const input={x:0,y:0,active:false};let pointer=null,center=null;
  function reset(){
    const old=pointer;pointer=null;input.x=0;input.y=0;input.active=false;
    element.style.setProperty('--stick-x','0px');element.style.setProperty('--stick-y','0px');
    element.dataset.active='false';
    if(old!==null&&element.hasPointerCapture(old))element.releasePointerCapture(old);
  }
  function update(e){
    const dx=e.clientX-center.x,dy=e.clientY-center.y,d=Math.hypot(dx,dy),radius=center.radius;
    const travel=Math.min(d,radius),strength=Math.max(0,(travel-7)/(radius-7));
    input.x=d?dx/d*strength:0;input.y=d?dy/d*strength:0;
    element.style.setProperty('--stick-x',`${d?dx/d*travel:0}px`);
    element.style.setProperty('--stick-y',`${d?dy/d*travel:0}px`);
  }
  element.addEventListener('pointerdown',e=>{
    if(pointer!==null||!isEnabled()||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();onStart();
    const r=element.getBoundingClientRect();center={x:r.left+r.width/2,y:r.top+r.height/2,radius:r.width*.30};
    pointer=e.pointerId;input.active=true;element.dataset.active='true';
    element.setPointerCapture(pointer);element.focus({preventScroll:true});update(e);
  });
  element.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer)return;e.preventDefault();
    if(!isEnabled()){reset();return;}update(e);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,e=>{if(e.pointerId===pointer)reset();});
  element.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('resize',reset);
  return {input,reset};
}
