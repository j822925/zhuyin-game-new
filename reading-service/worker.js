import {validateReadingWav} from '../reading-cloud-audio.js';
const MODEL='@cf/openai/whisper-large-v3-turbo';
const one=(db,sql,...values)=>db.prepare(sql).bind(...values).first();
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
async function body(request){
 if(Number(request.headers.get('Content-Length'))>440000)throw Error('invalid-audio');
 const reader=request.body?.getReader();if(!reader)throw Error('invalid-audio');let length=0,text='';const decoder=new TextDecoder();
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>440000){await reader.cancel();throw Error('invalid-audio');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 try{return JSON.parse(text);}catch{throw Error('invalid-audio');}
}
export async function reserve(db,key,amount,limit){
 if(!Number.isFinite(amount)||amount<=0||amount>limit)throw Error('daily-limit');
 const row=await one(db,`INSERT INTO reading_cloud_usage(bucket,used) VALUES(?,?) ON CONFLICT(bucket) DO UPDATE SET used=used+excluded.used WHERE used+excluded.used<=? RETURNING used`,key,amount,limit);
 if(!row)throw Error('daily-limit');
}
export async function availability(env,now=Date.now()){
 const day=new Date(now).toISOString().slice(0,10),resetAt=Date.parse(day+'T00:00:00Z')+86400000;
 if(env.READING_CLOUD_ENABLED!=='true'||!env.DB||!env.AI)return {available:false,reason:'unavailable',resetAt};
 const counts=await env.DB.prepare('SELECT bucket,used FROM reading_cloud_usage WHERE bucket IN (?,?,?)').bind('blocked:'+day,'requests:'+day,'seconds:'+day).all();
 const values=Object.fromEntries(counts.results.map(r=>[r.bucket,r.used]));
 const exhausted=values['blocked:'+day]>0||values['requests:'+day]>=1000||values['seconds:'+day]>=6000;
 return {available:!exhausted,reason:exhausted?'daily-limit':null,resetAt};
}
export function freeQuotaError(error){return Number(error?.code)===3036||/\b3036\b|daily free allocation|neurons.*(?:limit|exhaust)|quota.*exceed/i.test(String(error?.message||''));}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 const allowed=(env.ALLOWED_ORIGINS||'https://j822925.github.io').split(',');
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(origin&&!allowed.includes(origin))return new Response('Origin not allowed',{status:403});
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
 if(request.method==='GET'&&url.pathname==='/health')return reply({ok:true,version:'20260929-cloud1',enabled:env.READING_CLOUD_ENABLED==='true'});
 if(request.method==='GET'&&url.pathname==='/status'){try{return reply(await availability(env));}catch{return reply({available:false,reason:'unavailable'});}}
 if(url.pathname!=='/transcribe'||request.method!=='POST')return reply({error:'not-found'},404);
 try{
  if(env.READING_CLOUD_ENABLED!=='true'||!env.AI||!env.DB)throw Error('unavailable');
  const d=await body(request),id=url.searchParams.get('class')||'main',now=Date.now();
  if(!/^[a-z][a-z0-9]{1,20}$/.test(id)||!d||typeof d.seat!=='string'||!/^\d{1,3}$/.test(d.seat)||typeof d.token!=='string'||!/^[a-f0-9]{64}$/.test(d.token))throw Error('authentication_required');
  if(!await one(env.DB,'SELECT id FROM platform_classes WHERE id=? AND active=1',id))throw Error('authentication_required');
  const prefix=id==='main'?'':'c_'+id+'_';
  const student=await one(env.DB,`SELECT s.seat FROM ${prefix}sessions t JOIN ${prefix}students s ON s.seat=t.seat AND s.pin_version=t.version WHERE t.token_hash=? AND s.seat=? AND t.expires>? AND s.active=1`,await hash(d.token),d.seat,now);
  if(!student)throw Error('authentication_required');
  const status=await availability(env,now);if(!status.available)throw Error(status.reason);
  const {seconds}=validateReadingWav(d.audio),day=new Date(now).toISOString().slice(0,10),who=id+':'+student.seat;
  // Atomic D1 counters across workers/classes. Failed inference still reserves
  // quota; no automatic retry or refund can overspend the free safety budget.
  try{await reserve(env.DB,'minute:'+Math.floor(now/60000)+':'+who,1,10);}catch{throw Error('too-many-requests');}
  try{await reserve(env.DB,'student:'+day+':'+who,1,150);}catch{throw Error('student-limit');}
  await reserve(env.DB,'requests:'+day,1,1000);
  try{await reserve(env.DB,'seconds:'+day,Math.ceil(seconds),6000);}catch{
   await env.DB.prepare('INSERT OR IGNORE INTO reading_cloud_usage(bucket,used) VALUES(?,1)').bind('blocked:'+day).run();throw Error('daily-limit');
  }
  let output;
  try{output=await env.AI.run(MODEL,{audio:d.audio,task:'transcribe',language:'zh',condition_on_previous_text:false});}catch(e){
   if(freeQuotaError(e)){await env.DB.prepare('INSERT OR IGNORE INTO reading_cloud_usage(bucket,used) VALUES(?,1)').bind('blocked:'+day).run();throw Error('daily-limit');}
   throw Error('unavailable');
  }
  const text=(output?.text??output?.transcription_info?.text??'').trim();
  if(!text||text.length>60)throw Error('no-speech');
  return reply({text});
 }catch(e){
  const known=['authentication_required','invalid-audio','silence','no-speech','daily-limit','student-limit','too-many-requests','unavailable'];
  const error=known.includes(e.message)?e.message:'unavailable';
  return reply({error},error==='authentication_required'?401:200);
 }
}};
