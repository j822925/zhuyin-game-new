// Bound UI waiting, not server commit. Uncertain transactions retain their original ID.
export function within(promise,ms){
 let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('request_timeout')),ms);})]).finally(()=>clearTimeout(timer));
}
export async function confirmReward(request,{post,query,postMs=12000,queryMs=5000}){
 let result;
 try{result=await within(Promise.resolve().then(()=>post(request)),postMs);}catch{}
 if(result?.saved&&result.character)return result;
 // Definitive rejections have made no new transaction. Other errors may be uncertain.
 if(['insufficient_stars','cannot_redeem','writes_disabled','staging_test_only','invalid_payload'].includes(result?.error)){
  const error=new Error(result.error);error.definitive=true;throw error;
 }
 if(result?.error==='authentication_required')throw new Error(result.error);
 const status=await within(Promise.resolve().then(()=>query(request)),queryMs);
 if(!status?.saved||!status.character)throw new Error(status?.error||'unconfirmed');
 return status;
}
