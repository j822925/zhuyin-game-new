import {cacheName,publicMedia,TTL} from './cache-policy.js?v=20260928-perflive1';
const base=new URL('.',import.meta.url).href;
let registration;
export function startMediaCache(){
 if(registration)return registration;
 const work=(async()=>{
  if(!('serviceWorker'in navigator))return false;
  try{await navigator.serviceWorker.register(new URL('media-worker.js',import.meta.url),{scope:new URL(base).pathname,updateViaCache:'none'});
   if(navigator.serviceWorker.controller)return true;
   return await new Promise(resolve=>{const done=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',change);resolve(!!navigator.serviceWorker.controller);},change=()=>done(),timer=setTimeout(done,2200);navigator.serviceWorker.addEventListener('controllerchange',change);});
  }catch{return false;}
 })();let timer;registration=Promise.race([work,new Promise(resolve=>{timer=setTimeout(()=>resolve(false),2500);})]).finally(()=>clearTimeout(timer));return registration;
}
void startMediaCache();
export async function missingMedia(paths){
 const urls=[...new Set(paths.filter(p=>publicMedia(p,base)).map(p=>new URL(p,base).href))];
 try{const cache=await caches.open(cacheName(base));const missing=[];for(const url of urls){const r=await cache.match(url);if(!r||Date.now()-Number(r.headers.get('x-media-saved'))>TTL)missing.push(url);}return missing;}catch{return urls;}
}
export async function prepareMedia(paths,{signal,onProgress=()=>{}}={}){
 const missing=await missingMedia(paths);let next=0,completed=0,failed=0;
 onProgress({completed,total:missing.length,failed});
 await Promise.all(Array.from({length:Math.min(2,missing.length)},async()=>{while(next<missing.length&&!signal?.aborted){
  const url=missing[next++],controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,8000);signal?.addEventListener('abort',abort,{once:true});
  try{if(signal?.aborted)throw Error('cancelled');const response=await fetch(url,{credentials:'omit',signal:controller.signal});if(!response.ok)throw Error('unavailable');await response.arrayBuffer();completed++;}catch{if(!signal?.aborted)failed++;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  onProgress({completed,total:missing.length,failed});
 }}));return {completed,total:missing.length,failed,cancelled:!!signal?.aborted};
}
let warming=false;
export async function warmAudio(paths){
 if(warming||document.hidden||navigator.connection?.saveData||navigator.connection?.effectiveType==='2g')return;
 warming=true;try{await prepareMedia(paths.slice(0,2));}finally{warming=false;}
}
