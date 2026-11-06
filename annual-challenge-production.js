// Live identity stays in the existing authentication helpers, never in demo storage.
export const ANNUAL_API_ORIGIN='https://zhuyin-api.j822925.workers.dev';
export function productionContext(location){
 const url=new URL(location.href);
 const teacher=url.origin===ANNUAL_API_ORIGIN&&url.pathname.startsWith('/admin/annual/');
 return {teacher,classId:url.searchParams.get('class')||'main',mode:url.searchParams.get('mode')==='official'?'official':'rehearsal',origin:ANNUAL_API_ORIGIN};
}
export function annualQuestionKey(card,station){
 if(!card||!station)return '';
 const attempt=card.attempts?.[station],round=attempt?.rounds?.[attempt.index];
 const selected=round?.selected==null?null:round.options?.[round.selected];
 return JSON.stringify([card.event?.classId,card.event?.year,card.mode,card.rehearsalRound,card.seat,station,attempt?.index,selected?.id,selected?.text,!!round?.result]);
}
export function annualScopeKey(card){return card?JSON.stringify([card.event?.classId,card.event?.year,card.mode,card.rehearsalRound,card.seat]):'';}
export function annualRequestData(action,data){
 if(action!=='config')return data;
 const patch={};for(const name of ['revision','enabled','mode','startsAt','endsAt','actionCount','access'])if(Object.hasOwn(data,name))patch[name]=data[name];
 return {year:data.year,patch};
}
export function createStationPoller({read,eligible,onError=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,interval=3000}){
 let timer=null,running=false,stopped=false,failures=0,generation=0;
 function schedule(delay){if(stopped)return;clearTimer(timer);timer=setTimer(tick,delay);}
 async function tick(){
  timer=null;if(stopped||running)return;if(!eligible()){schedule(interval);return;}
  running=true;const epoch=generation;
  try{await read();if(epoch===generation)failures=0;}catch(error){if(epoch===generation){failures++;onError(error,failures);}}
  finally{running=false;if(!stopped)schedule(Math.min(30000,interval*2**Math.min(failures,4)));}
 }
 return {start(){stopped=false;schedule(interval);},wake(){if(!stopped&&!running)schedule(0);},stop(){stopped=true;generation++;clearTimer(timer);timer=null;}};
}
const messages={
 admin_required:'關主登入已到期，請重新使用 Google 登入。',teacher_forbidden:'這個 Google 帳號尚未取得本班關主權限。',authentication_required:'學生登入已到期，請重新登入。',
 annual_forbidden:'這個帳號尚未開放年度闖關，請找老師確認。',annual_not_allowed:'這個帳號尚未開放年度闖關，請找老師確認。',pilot_not_allowed:'這個帳號尚未開放年度闖關，請找老師確認。',class_unavailable:'這個班級目前沒有開放年度闖關。',
 service_unavailable:'闖關服務暫時無法連線，請稍後重試。',invalid_payload:'資料格式有誤，請重新讀取進度。',
 'auth/popup-blocked':'Google 登入視窗被擋住，請在 Safari 允許此網站開啟彈出式視窗。',
 'auth/popup-closed-by-user':'登入視窗已關閉，可以再按一次 Google 登入。','auth/cancelled-popup-request':'登入已取消，可以再試一次。',
 'auth/network-request-failed':'無法連線至 Google，請確認網路後再試。'
};
export function annualError(error){return messages[error?.code]||messages[error?.message]||error?.message||'暫時無法連線，請重試。';}
export function annualTimeout(promise,timeoutMs,message,onTimeout=()=>{}){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{onTimeout();reject(Error(message));},timeoutMs);
  Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
 });
}
export function createAnnualTransport({context,getToken,fetchImpl=globalThis.fetch,timeoutMs=12000,tokenTimeoutMs=12000}){
 return async function request(action,data={}){
  if(!['session','card','command','config','config-read','roster','availability','reset-rehearsal'].includes(action))throw Error('找不到闖關操作');
  if(!context.teacher&&['config','config-read','roster','reset-rehearsal'].includes(action))throw Error('請由關主操作');
  if(context.teacher&&globalThis.location&&globalThis.location.origin!==context.origin)throw Error('請從原平台的關主入口登入');
  const token=await annualTimeout(Promise.resolve().then(getToken),tokenTimeoutMs,'登入確認逾時，請重試原本的操作；尚未確認的保存會保留。');if(!token)throw Object.assign(Error('請先登入'),{status:401});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(context.origin+(context.teacher?'/admin/annual/api/':'/annual/api/')+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({...data,classId:context.classId,mode:context.mode||'rehearsal'}),cache:'no-store',credentials:'omit',signal:controller.signal});
   let out;try{out=await response.json();}catch{throw Error('服務暫時無法回應，請稍後重試');}
   if(!response.ok||out?.error)throw Object.assign(Error(messages[out?.error]||out?.error||'無法讀取，請重試'),{status:response.status,code:out?.error});
   return out;
  }catch(error){if(error.name==='AbortError')throw Error('連線逾時，尚未確認保存結果；請按重試');throw error;}finally{clearTimeout(timer);}
 };
}
export async function createProductionAdapter({location=globalThis.location,year,onExpired=()=>{},signal}={}){
 const context=productionContext(location);let studentAuth=null,teacher=null,firebaseAuth=null,sdk=null,expiryTimer=null,epoch=0;
 if(context.classId!=='main')throw Error('這個班級目前沒有開放年度闖關。');
 let studentSeat='';
 const transport=createAnnualTransport({context,getToken:async()=>{
  if(context.teacher)return teacher?teacher.getIdToken():null;
  return studentSeat&&studentAuth.verified(studentSeat)?studentAuth.decorate({seat:studentSeat}).token:null;
 }});
 const bootController=new AbortController(),abortBoot=()=>bootController.abort();
 const bootMessage='登入準備逾時，請確認網路後按「重新載入」再試。';
 if(signal?.aborted)throw Error(bootMessage);
 signal?.addEventListener('abort',abortBoot,{once:true});
 try{await annualTimeout((async()=>{
 if(context.teacher){
  const response=await fetch('/admin/auth-config',{cache:'no-store',signal:bootController.signal}),config=await response.json();
  if(!response.ok||config.mode!=='firebase'||!config.firebase?.apiKey)throw Error('關主登入設定暫時無法讀取。');
  sdk=await import('/admin/auth-sdk.js');
  if(bootController.signal.aborted)throw Error(bootMessage);
  firebaseAuth=sdk.initializeAuth(sdk.initializeApp(config.firebase),{persistence:sdk.inMemoryPersistence,popupRedirectResolver:sdk.browserPopupRedirectResolver});
  firebaseAuth.languageCode='zh-TW';await firebaseAuth.authStateReady();
 }else{
  const [{createStudentAuth},{createApiClient}]=await Promise.all([import('./student-auth.js?v=20261009-accounts1'),import('./api-client.js?v=20260928-all1')]);
  if(bootController.signal.aborted)throw Error(bootMessage);
  const client=createApiClient(context.origin+'/api');
  studentAuth=createStudentAuth({demo:false,getConfig:()=>({authRequired:true}),post:payload=>client.post(payload)});
  const style=document.createElement('link');style.rel='stylesheet';style.href='student-auth.css?v=20261011-seats1';document.head.append(style);
 }
 if(bootController.signal.aborted)throw Error(bootMessage);
 })(),15000,bootMessage,abortBoot);}catch(error){abortBoot();if(error.name==='AbortError')throw Error(bootMessage);throw error;}finally{signal?.removeEventListener('abort',abortBoot);}
 async function logout(){epoch++;clearTimeout(expiryTimer);studentSeat='';studentAuth?.forgetAll();teacher=null;if(firebaseAuth)await sdk.signOut(firebaseAuth).catch(()=>{});}
 async function rejectSession(error){if(context.teacher||error.status===401)await logout();else studentSeat='';}
 async function established(){
  const out=await transport('session',{year,...(!context.teacher?{seat:studentSeat}:{})});
  if(context.teacher){if(out.role!=='organizer'||!Array.isArray(out.seats)||out.seats.some(s=>typeof s!=='string'||!/^\d{6}$/.test(s)))throw Error('關主帳號尚未準備好');}
  else if(out.role!=='student'||out.seat!==studentSeat)throw Error('學生登入資料不一致');
  if(out.classId!==context.classId)throw Error('班級資料不一致');
  return out;
 }
 return {
  context,teacher:context.teacher,
  setMode(mode){if(!context.teacher||!['rehearsal','official'].includes(mode))throw Error('無法切換闖關模式');context.mode=mode;},
  async restore(){if(context.teacher)return null;studentSeat=studentAuth.currentSeat();if(!studentSeat)return null;try{return await established();}catch(error){await rejectSession(error);throw error;}},
  async login({seat}={}){
   const started=epoch;
   if(context.teacher){
    const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
    // Called directly from the teacher's click, before any await, for iPad popup support.
    const result=await sdk.signInWithPopup(firebaseAuth,provider);if(started!==epoch)return null;teacher=result.user;
    clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{void logout();onExpired();},2*60*60*1000);
   }else{
    if(typeof seat!=='string'||!/^\d{6}$/.test(seat))throw Error('請輸入完整六位學號');
    if(!await studentAuth.ensure(seat))return null;if(started!==epoch)return null;studentAuth.setPrimary(seat);studentSeat=seat;
   }
   try{return await established();}catch(error){await rejectSession(error);throw error;}
  },
  logout,
  async request(path,body){
   if(path==='logout'){await logout();return {ok:true};}
   const [name,query='']=path.split('?'),params=Object.fromEntries(new URLSearchParams(query));
   const action=name==='configure'?'config':name;
   const data={...params,...body};if(data.year!==undefined)data.year=Number(data.year);
   if(!context.teacher)data.seat=studentSeat;
   return transport(action,annualRequestData(action,data));
  }
 };
}
