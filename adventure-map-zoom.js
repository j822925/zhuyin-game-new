import {ISLAND_WORLD} from './adventure-exploration-model.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function islandZoomLimits(width,height){
 const normal=Math.max(.55,Math.min(.92,width/1280));
 return {min:Math.min(width/ISLAND_WORLD.width,height/ISLAND_WORLD.height)*.92,max:normal*2,normal};
}
export function islandCamera(camera,width,height){
 const {min,max}=islandZoomLimits(width,height),scale=clamp(camera.scale,min,max);
 const axis=(value,size,screen)=>screen/scale>=size?(size-screen/scale)/2:clamp(value,0,size-screen/scale);
 return {scale,x:axis(camera.x,ISLAND_WORLD.width,width),y:axis(camera.y,ISLAND_WORLD.height,height)};
}
export function zoomIsland(camera,width,height,scale,from,to=from){
 const limits=islandZoomLimits(width,height),next=clamp(scale,limits.min,limits.max);
 return islandCamera({scale:next,x:camera.x+from.x/camera.scale-to.x/next,y:camera.y+from.y/camera.scale-to.y/next},width,height);
}
// Keep the entire touch sequence exclusive: the first finger is only a tap on release.
export function createMapGesture(api){
 const points=new Map();let baseline=null,pinched=false;
 function rebase(){const p=[...points.values()];baseline=p.length<2?null:{distance:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),center:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},camera:{...api.camera()}};}
 return {
  down(id,p,target){if(points.has(id))return;points.set(id,{...p,start:p,target,moved:false});api.stop();if(points.size>1){pinched=true;api.start();}rebase();},
  move(id,p){const old=points.get(id);if(!old)return;points.set(id,{...old,...p,moved:old.moved||Math.hypot(p.x-old.start.x,p.y-old.start.y)>12});if(!baseline||points.size!==2)return;const a=[...points.values()],distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);api.zoom(baseline.camera,baseline.camera.scale*distance/baseline.distance,baseline.center,{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2});},
  up(id,cancelled=false){const p=points.get(id);if(!p)return;points.delete(id);if(cancelled)pinched=true;if(!points.size){if(!pinched&&!p.moved)api.tap(p,p.target);pinched=false;baseline=null;}else rebase();},
  reset(){points.clear();baseline=null;pinched=false;},
  has:id=>points.has(id),get active(){return points.size>0;}
 };
}
export function installMapZoom({stage,canvas,scene,enabled,stop,tap,hideOffer}){
 const toolbar=document.createElement('nav');toolbar.className='island-zoom-controls';toolbar.hidden=true;toolbar.setAttribute('aria-label','地圖縮放');stage.append(toolbar);
 const apply=camera=>{const s=scene();s.islandView={...camera,free:true};Object.assign(s.camera,camera);canvas.dataset.zoom=camera.scale.toFixed(3);};
 const zoom=(camera,scale,from,to)=>{const s=scene();apply(zoomIsland(camera,s.width,s.height,scale,from,to));};
 const center=()=>({x:scene().width/2,y:scene().height/2});
 const halt=()=>{stop();hideOffer();};
 let forwarded=false,suppressUntil=0;
 const gesture=createMapGesture({camera:()=>scene().camera,stop:halt,start:()=>stage.classList.add('island-pinching'),zoom,tap:(p,target)=>{if(!enabled())return;if(target===canvas){const r=canvas.getBoundingClientRect();tap(p.x+r.left,p.y+r.top);}else{forwarded=true;try{target.click();}finally{forwarded=false;}}}});
 function button(label,text,action){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.textContent=text;b.onclick=()=>{if(!enabled()||gesture.active)return;halt();action();canvas.focus({preventScroll:true});};toolbar.append(b);return b;}
 const minus=button('縮小地圖','−',()=>zoom(scene().camera,scene().camera.scale/1.3,center()));
 button('查看全島','全島',()=>{const s=scene(),scale=islandZoomLimits(s.width,s.height).min;apply(islandCamera({scale,x:0,y:0},s.width,s.height));});
 button('回到角色','◎',()=>{const s=scene(),scale=islandZoomLimits(s.width,s.height).normal;s.islandView={scale,free:false};Object.assign(s.camera,islandCamera({scale,x:s.player.x-s.width/scale/2,y:s.player.y-s.height/scale/2},s.width,s.height));});
 const plus=button('放大地圖','＋',()=>zoom(scene().camera,scene().camera.scale*1.3,center()));
 const surface=target=>target===canvas?canvas:target.closest?.('.exploration-pin');
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 stage.addEventListener('pointerdown',e=>{const target=surface(e.target);if(e.pointerType!=='touch'||!target||!enabled())return;consume(e);suppressUntil=performance.now()+700;gesture.down(e.pointerId,point(e),target);stage.setPointerCapture(e.pointerId);},{capture:true,passive:false});
 stage.addEventListener('pointermove',e=>{if(!gesture.has(e.pointerId))return;consume(e);if(enabled())gesture.move(e.pointerId,point(e));},{capture:true,passive:false});
 function end(e){if(!gesture.has(e.pointerId))return;consume(e);suppressUntil=performance.now()+700;gesture.up(e.pointerId,e.type!=='pointerup'||!enabled());if(!gesture.active)stage.classList.remove('island-pinching');}
 for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,end,{capture:true,passive:false});
 stage.addEventListener('click',e=>{if(!forwarded&&surface(e.target)&&(gesture.active||performance.now()<suppressUntil))consume(e);},true);
 // Trackpad pinch, plus buttons for a mouse or keyboard. Ordinary page scrolling is untouched.
 stage.addEventListener('wheel',e=>{if(!e.ctrlKey||!surface(e.target)||!enabled())return;consume(e);halt();zoom(scene().camera,scene().camera.scale*Math.exp(-clamp(e.deltaY,-80,80)*.01),point(e));},{passive:false});
 function reset(){gesture.reset();stage.classList.remove('island-pinching');}
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 return {reset,get active(){return gesture.active;},update(){const s=scene(),visible=s?.area==='island'&&enabled();toolbar.hidden=!visible;stage.classList.toggle('island-overview',s?.area==='island'&&s.camera.scale<islandZoomLimits(s.width,s.height).normal*.65);if(!visible){reset();return;}const limits=islandZoomLimits(s.width,s.height);minus.disabled=s.camera.scale<=limits.min+.001;plus.disabled=s.camera.scale>=limits.max-.001;canvas.dataset.zoom=s.camera.scale.toFixed(3);}};
}
