// No periodic polling and no student data in this public class setting.
export function createForestAccess({classId='main',fetchImpl=globalThis.fetch,endpoint='https://zhuyin-api.j822925.workers.dev/api',onBlocked=()=>{},timeoutMs=12000}={}){
 let pending=null;
 return {check(){
  if(pending)return pending;
  pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{const url=new URL(endpoint);url.searchParams.set('api','forest-access');url.searchParams.set('class',classId);
    const response=await fetchImpl(url,{cache:'no-store',credentials:'omit',signal:controller.signal});
    if(!response.ok)throw Error();const data=await response.json();if(typeof data.enabled!=='boolean')throw Error();
    if(!data.enabled)onBlocked('closed');return data.enabled;
   }catch{onBlocked('offline');return false;}finally{clearTimeout(timer);pending=null;}
  })();return pending;
 }};
}
