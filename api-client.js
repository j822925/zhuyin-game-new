// Google ContentService redirects to a temporary URL. Never reuse a cached redirect.
import {classUrl} from './class-context.js?v=20260926-classes1';
// Credentials remain in POST bodies and are never added to URLs or logs.
export function createApiClient(endpoint,{fetchImpl=globalThis.fetch,timeoutMs=45000}={}){
 async function request(params={},payload){
  const url=new URL(classUrl(endpoint));for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
  url.searchParams.set('_fresh',Date.now()+'-'+Math.random().toString(36).slice(2));
  const controller=new AbortController();let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  try{
   const response=await fetchImpl(url.toString(),{method:payload===undefined?'GET':'POST',cache:'no-store',credentials:'omit',redirect:'follow',signal:controller.signal,...(payload===undefined?{}:{headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)})});
   if(!response.ok)throw new Error('http_error');
   let data;try{data=await response.json();}catch(error){if(controller.signal.aborted)throw error;throw new Error('invalid_response');}
   if(!data||typeof data!=='object')throw new Error('invalid_response');
   return data;
  }catch(error){if(timedOut)throw new Error('request_timeout');if(['http_error','invalid_response'].includes(error.message))throw error;throw new Error('network_error');}
  finally{clearTimeout(timer);}
 }
 // Do not automatically retry login: a lost response must not multiply PIN failures.
 return {get:params=>request(params),post:payload=>request({},payload)};
}
