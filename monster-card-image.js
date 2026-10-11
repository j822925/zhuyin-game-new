import {optimizedImage} from './data/portrait-thumbnails.js?v=20261007-ipad1';
const cleanups=new WeakMap();
export function disposeMonsterCardImages(root){for(const stage of root.querySelectorAll('.monster-card-stage')){cleanups.get(stage)?.();cleanups.delete(stage);}}

// Native lazy images inside a modal can stay deferred. Start only visible cards
// explicitly, and keep artwork failures separate from collection ownership.
export function mountMonsterCardImage(stage,c){
 const img=document.createElement('img');img.decoding='async';img.alt=c.name;
 img.width=300;img.height=270;img.loading='eager';
 const status=document.createElement('button');status.type='button';
 status.className='monster-card-image-status';status.disabled=true;
 status.setAttribute('aria-live','polite');status.textContent='圖片準備中…';
 stage.append(img,status);stage.dataset.imageStatus='waiting';
 const preferred=optimizedImage(c.image);let timer,original=false,started=false,observer;
 cleanups.set(stage,()=>{observer?.disconnect();clearTimeout(timer);img.onload=img.onerror=null;});
 const fresh=source=>{const url=new URL(source,import.meta.url);url.searchParams.set('retry',`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);return url.href;};
 const fail=()=>{clearTimeout(timer);
  if(!original&&preferred!==c.image){original=true;load(c.image);return;}
  stage.dataset.imageStatus='retry';status.hidden=false;status.disabled=false;
  status.textContent='圖片沒載入，點我再試一次';
 };
 function load(source){stage.dataset.imageStatus='loading';status.hidden=false;status.disabled=true;status.textContent='圖片準備中…';
  clearTimeout(timer);timer=setTimeout(()=>{img.onload=img.onerror=null;img.removeAttribute('src');fail();},30000);
  img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight){fail();return;}clearTimeout(timer);stage.dataset.imageStatus='ready';status.hidden=true;};
  img.onerror=fail;img.src=source;
 }
 const start=()=>{if(started)return;started=true;load(preferred);};
 status.onclick=()=>{original=false;load(fresh(preferred));};
 if(typeof IntersectionObserver==='function'){
  observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();start();}},{rootMargin:'100px'});
  observer.observe(stage);
 }else start();
 return img;
}
