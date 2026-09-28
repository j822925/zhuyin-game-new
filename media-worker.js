const CACHE_VERSION='v2',MAX_ITEMS=512,MAX_BYTES=96*1024*1024,MAX_FILE=4*1024*1024,TTL=30*86400000;
function publicMedia(path,base){try{const u=new URL(path,base),b=new URL(base);return u.origin===b.origin&&u.pathname.startsWith(b.pathname)&&/^(audio|assets)\//.test(u.pathname.slice(b.pathname.length))&&/\.(mp3|wav|ogg|webp|png|jpg|jpeg|svg)$/i.test(u.pathname);}catch{return false;}}
function cacheName(base){return 'zhuyin-public-media-'+encodeURIComponent(new URL(base).pathname)+'-'+CACHE_VERSION;}
function orderedCards(cards){const order=Array.from('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ');return cards.filter(c=>order.includes(c.symbol)).slice().sort((a,b)=>order.indexOf(a.symbol)-order.indexOf(b.symbol));}

const base=new URL('./',self.location.href),CACHE=cacheName(base),inflight=new Map();let writes=Promise.resolve(),metadata;
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const old=CACHE.slice(0,-2)+'v1';await caches.delete(old);await self.clients.claim();})()));
async function remember(cache,url,response){
 if(!response.ok||response.status!==200||response.type==='opaque'||/no-store|private/i.test(response.headers.get('cache-control')||'')||Number(response.headers.get('content-length'))>MAX_FILE)return;
 const bytes=await response.arrayBuffer();if(bytes.byteLength>MAX_FILE)return;
 const headers=new Headers(response.headers);headers.set('x-media-size',String(bytes.byteLength));headers.set('x-media-saved',String(Date.now()));headers.set('content-length',String(bytes.byteLength));headers.delete('content-encoding');
 writes=writes.catch(()=>{}).then(async()=>{
  if(!metadata){metadata=new Map();for(const key of await cache.keys()){const r=await cache.match(key);metadata.set(key.url,{size:Number(r.headers.get('x-media-size'))||MAX_FILE,saved:Number(r.headers.get('x-media-saved'))||0});}}
  metadata.set(url,{size:bytes.byteLength,saved:Date.now()});let total=[...metadata.values()].reduce((n,m)=>n+m.size,0);
  for(const [key,m]of [...metadata].sort((a,b)=>a[1].saved-b[1].saved)){if(metadata.size<=MAX_ITEMS&&total<=MAX_BYTES)break;await cache.delete(key);metadata.delete(key);total-=m.size;}
  try{await cache.put(url,new Response(bytes,{status:200,headers}));}catch{metadata.delete(url);/* Storage denied/full never blocks the game. */}
 });await writes;
}
async function load(request,event){
 const cache=await caches.open(CACHE),url=request.url,cached=await cache.match(url);let response=cached&&Date.now()-Number(cached.headers.get('x-media-saved'))<TTL?cached:null;
 if(!response){let pending=inflight.get(url);if(!pending){pending=(async()=>{const headers=new Headers(request.headers);headers.delete('range');headers.delete('if-range');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{return await fetch(new Request(url,{headers,credentials:'omit',signal:controller.signal}));}finally{clearTimeout(timer);}})();inflight.set(url,pending);pending.finally(()=>inflight.delete(url)).catch(()=>{});}
  try{response=(await pending).clone();if(!response.ok&&cached)response=cached;else event.waitUntil(remember(cache,url,response.clone()).catch(()=>{}));}catch(e){if(!cached)throw e;response=cached;}
 }
 const range=request.headers.get('range');if(!range||response.status!==200)return response;const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return fetch(request);
 const body=await response.arrayBuffer(),length=body.byteLength,start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2])),end=match[1]?(match[2]?Math.min(Number(match[2]),length-1):length-1):length-1;
 if(start>end||start>=length)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`}});
 const h=new Headers(response.headers);h.set('Content-Range',`bytes ${start}-${end}/${length}`);h.set('Content-Length',String(end-start+1));h.set('Accept-Ranges','bytes');h.delete('Content-Encoding');return new Response(body.slice(start,end+1),{status:206,headers:h});
}
self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&publicMedia(event.request.url,base))event.respondWith(load(event.request,event).catch(async()=>{const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);try{return await fetch(new Request(event.request,{signal:c.signal}));}catch{return new Response('Media unavailable',{status:503});}finally{clearTimeout(timer);}}));});
