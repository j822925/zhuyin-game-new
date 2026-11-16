import {createArithmeticStore} from './arithmetic-store.js?v=20261116-hub1';
import {createArithmeticService} from './arithmetic-service.js?v=20261116-hub1';
import {fail,VERSION} from './arithmetic-core.js?v=20261115-math2';
export const handlesArithmetic=req=>/^\/(arithmetic|admin\/api\/arithmetic)\//.test(new URL(req.url).pathname);
const teacherOps=new Set(['bootstrap','assignment-save','exam-save','task-state','results','monthly']);
const childOps=new Set(['access','bootstrap','practice-start','exam-start','submit','assignments','exams','notebook']);
export const MESSAGES={forbidden:'目前尚未開放這個帳號使用。',teacher_required:'請先登入教師後台。',student_required:'請回首頁登入。',authentication_required:'登入已到期，請回首頁重新登入。',scope_closed:'老師尚未開放這個練習範圍。',invalid_config:'請檢查難度、題型與題數。',invalid_task:'請檢查作業對象與開放時間。',invalid_answer:'請輸入完整數字。',invalid_answers:'答案尚未完整，請繼續作答。',invalid_request_id:'這次操作未能辨識，請重新讀取。',task_closed:'這份小考或作業尚未開放，或已經截止。',task_locked:'已有作答紀錄，請建立新作業或小考。',request_conflict:'這份紀錄已經儲存，重試內容與原本不同。',stale_revision:'資料已更新，請重新讀取。',scope_too_small:'符合條件的題目不足，請減少題數或調整題型。',not_found:'找不到這份紀錄。',writes_disabled:'目前暫停儲存，請稍後再試。',service_unavailable:'暫時無法儲存，請保留畫面，稍後重試。'};
function reply(request,teacher,data,status=200){const headers={'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};if(!teacher&&request.headers.get('Origin'))headers['Access-Control-Allow-Origin']=request.headers.get('Origin');return Response.json(data,{status,headers});}
async function payload(req){const reader=req.body?.getReader();if(!reader)fail('invalid_answers');let text='',bytes=0;const decoder=new TextDecoder();try{for(;;){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>131072){await reader.cancel();fail('invalid_answers',413);}text+=decoder.decode(r.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}try{const d=JSON.parse(text);if(!d||Array.isArray(d)||typeof d!=='object')fail('invalid_answers');return d;}catch{fail('invalid_answers');}}
export function createArithmeticAPI(deps){return {async fetch(req,env){const url=new URL(req.url),teacher=url.pathname.startsWith('/admin/api/'),op=url.pathname.split('/').pop(),origin=req.headers.get('Origin');
 if(origin&&origin!==url.origin&&(teacher||!(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin)))return reply(req,true,{code:'forbidden',error:MESSAGES.forbidden},403);
 if(req.method==='OPTIONS'){const h={'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Vary':'Origin','Cache-Control':'no-store'};if(origin)h['Access-Control-Allow-Origin']=origin;return new Response(null,{status:204,headers:h});}
 try{
  if(req.method!=='POST')fail('not_found',405);if(!(teacher?teacherOps:childOps).has(op))fail('not_found',404);
  const d=await payload(req),cid=d.classId||'main';if(!/^[a-z][a-z0-9]{1,20}$/.test(cid)||url.searchParams.has('class')&&url.searchParams.get('class')!==cid)fail('forbidden',403);
  let scoped,who;
  if(teacher){const identity=await deps.requireAdmin(req,env);scoped=await deps.authorizeClass(env,identity,cid);who={role:'teacher',classId:cid};}
  else{const bearer=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('Authorization')||'');if(!bearer)fail('authentication_required',401);scoped=await deps.scopeClass(env,cid);const student=await deps.authenticate(scoped.DB,await deps.digest(bearer[1]));if(!/^\d{6}$/.test(student?.seat||'')||d.seat!==undefined&&d.seat!==student.seat)fail('forbidden',403);
   // Pilot membership is private server configuration, never a browser flag.
   const access=await deps.pilotSeats(env,cid);if(!access.includes(student.seat))fail('forbidden',403);
   if(scoped.ENVIRONMENT!=='production'&&!student.test)fail('forbidden',403);
   who={role:'student',classId:cid,seat:student.seat};if(op==='access')return reply(req,false,{available:true});
   if(['practice-start','exam-start','submit'].includes(op)&&scoped.STUDENT_WRITES!=='true')fail('writes_disabled',403);
  }
  const roster=async()=>(await scoped.DB.prepare('SELECT seat,name,test FROM students WHERE active=1 ORDER BY seat LIMIT 500').all()).results;
  const service=createArithmeticService({store:createArithmeticStore(scoped.DB,cid),students:roster,now:deps.now,rng:deps.rng}),method=op.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  return reply(req,teacher,await service[method](who,d));
 }catch(e){const aliases={admin_required:'teacher_required',teacher_forbidden:'forbidden',class_unavailable:'forbidden',login_required:'authentication_required'},code=aliases[e.message]||e.message;return reply(req,teacher,{version:VERSION,code:MESSAGES[code]?code:'service_unavailable',error:MESSAGES[code]||MESSAGES.service_unavailable},e.status||({teacher_required:401,authentication_required:401,forbidden:403}[code])||(MESSAGES[code]?400:503));}
 }};}
