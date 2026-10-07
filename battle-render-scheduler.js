// One animation clock for visible actors. Hidden arenas do not redraw or poll layout.
const all=new Set(),visible=new Set(),byCanvas=new WeakMap();let observer,mutations,frame=0,listening=false;
function schedule(){if(!frame&&visible.size&&!document.hidden)frame=requestAnimationFrame(tick);}
function tick(now){frame=0;for(const actor of visible)actor.tick(now);schedule();}
function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();}
function initialize(){
 if(listening)return;listening=true;document.addEventListener('visibilitychange',visibility);
 if(typeof IntersectionObserver==='function')observer=new IntersectionObserver(entries=>{for(const entry of entries){const actor=byCanvas.get(entry.target);if(!actor)continue;if(entry.target.isConnected)actor.wasConnected=true;if(entry.isIntersecting)visible.add(actor);else visible.delete(actor);}if(!visible.size){cancelAnimationFrame(frame);frame=0;}schedule();});
 if(typeof MutationObserver==='function'){mutations=new MutationObserver(()=>{for(const actor of all){if(actor.canvas.isConnected)actor.wasConnected=true;else if(actor.wasConnected)actor.dispose();}});mutations.observe(document.documentElement,{childList:true,subtree:true});}
}
export function watchBattleCanvas(canvas,tick,dispose){
 initialize();const actor={canvas,tick,dispose,wasConnected:canvas.isConnected};all.add(actor);byCanvas.set(canvas,actor);
 if(observer)observer.observe(canvas);else{visible.add(actor);schedule();}
 return ()=>{all.delete(actor);visible.delete(actor);observer?.unobserve(canvas);if(byCanvas.get(canvas)===actor)byCanvas.delete(canvas);if(!visible.size){cancelAnimationFrame(frame);frame=0;}if(!all.size){observer?.disconnect();mutations?.disconnect();observer=mutations=null;document.removeEventListener('visibilitychange',visibility);listening=false;}};
}
