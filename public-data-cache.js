// Only anonymous configuration/schedule reads are shared. No auth or student data.
const stores=new WeakMap();
function sessionStore(){try{return globalThis.sessionStorage;}catch{return undefined;}}
export function publicDataRequest(key,load,{fetchImpl=globalThis.fetch,ttl=60000,force=false,now=Date.now,storage=sessionStore()}={}){
 let cache=stores.get(fetchImpl);if(!cache){cache=new Map();stores.set(fetchImpl,cache);}
 const storageKey='zhuyin.public-read.v1:'+key;
 let hit=cache.get(key);
 if(hit?.pending)return hit.pending.then(copy);
 if(!force&&!hit&&fetchImpl===globalThis.fetch){try{const entry=JSON.parse(storage?.getItem(storageKey)||'null');if(entry&&now()>=entry.at&&now()-entry.at<ttl)hit=entry;}catch{}}
 if(!force&&hit&&now()>=hit.at&&now()-hit.at<ttl)return Promise.resolve(copy(hit.value));
 const pending=Promise.resolve().then(load).then(value=>{
  if(value.error||value.ok===false){cache.delete(key);return value;}
  const entry={at:now(),value};cache.set(key,entry);
  if(fetchImpl===globalThis.fetch)try{storage?.setItem(storageKey,JSON.stringify(entry));}catch{}
  return value;
 },error=>{cache.delete(key);throw error;});
 cache.set(key,{pending});return pending.then(copy);
}
function copy(value){return JSON.parse(JSON.stringify(value));}
