// One in-flight request per bank. Failed/stalled downloads can be retried explicitly.
export function createQuestionLoader(url,convert=x=>x,{fetchImpl=(...args)=>fetch(...args),timeoutMs=12000}={}){
 let job;
 return ()=>job??=(async()=>{
  const controller=new AbortController();let timer;
  try{return await Promise.race([
   (async()=>{const response=await fetchImpl(url,{signal:controller.signal});if(!response.ok)throw Error('question_http');return convert(await response.json());})(),
   new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('question_timeout'));},timeoutMs);})
  ]);}finally{clearTimeout(timer);}
 })().catch(error=>{job=null;throw error;});
}
