import {cacheName,publicMedia,TTL} from './cache-policy.js?v=20261011-ipad2';
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
export async function prepareMedia(paths,{signal,onProgress=()=>{},timeoutMs=8000,concurrency=2,retries=0,retryDelayMs=500}={}){
 const missing=await missingMedia(paths),failedUrls=[];let next=0,completed=0,retrying=0;
 const workers=Math.max(1,Math.min(8,Math.floor(Number(concurrency)||2))),attempts=Math.max(0,Math.min(2,Math.floor(Number(retries)||0)));
 const progress=()=>onProgress({completed,total:missing.length,failed:failedUrls.length,retrying});
 const waitRetry=ms=>new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',done);resolve();};timer=setTimeout(done,ms);signal?.addEventListener('abort',done,{once:true});if(signal?.aborted)done();});
 progress();
 await Promise.all(Array.from({length:Math.min(workers,missing.length)},async()=>{while(next<missing.length&&!signal?.aborted){
  const url=missing[next++];let ok=false;
  for(let attempt=0;attempt<=attempts&&!signal?.aborted;attempt++){
   if(attempt){retrying++;progress();await waitRetry(retryDelayMs*attempt);retrying--;if(signal?.aborted)break;}
   const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,timeoutMs);signal?.addEventListener('abort',abort,{once:true});let retryable=true;
   try{if(signal?.aborted)break;const response=await fetch(url,{credentials:'omit',headers:{'X-Zhuyin-Prepare':'1'},signal:controller.signal});if(!response.ok){retryable=response.status>=500||[408,429].includes(response.status);throw Error('unavailable');}await response.arrayBuffer();ok=true;completed++;break;}catch{if(!retryable)break;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  if(!ok&&!signal?.aborted)failedUrls.push(url);progress();
 }}));
 // A timed-out client request may nevertheless have completed in the media worker.
 if(failedUrls.length&&!signal?.aborted){const remaining=await missingMedia(failedUrls);completed+=failedUrls.length-remaining.length;failedUrls.splice(0,failedUrls.length,...remaining);progress();}
 return {completed,total:missing.length,failed:failedUrls.length,cancelled:!!signal?.aborted};
}
let warming=false;
export async function warmAudio(paths){
 if(warming||document.hidden||navigator.connection?.saveData||navigator.connection?.effectiveType==='2g')return;
 warming=true;try{await prepareMedia(paths.slice(0,2));}finally{warming=false;}
}
