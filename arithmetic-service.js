import {VERSION,LEVELS,config,generate,grade,clone,fail,questionKey,validQuestion} from './arithmetic-core.js';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][\w.:-]{7,119}$/.test(v);
const request=d=>{if(!id(d.requestId))fail('invalid_request_id');};
const defaultScope=()=>({enabled:true,levels:[10,18,99],operations:['add','sub','mix'],skills:['basic','regroup','mixed'],overrides:{},revision:0});
const active=(t,now)=>t.enabled&&now>=t.startsAt&&now<t.endsAt;
const visible=(t,seat)=>!t.studentSeats.length||t.studentSeats.includes(seat);
const publicTask=t=>{const {studentSeats,questions,...out}=t;return out;};
export function createArithmeticService({store,now=Date.now,rng=Math.random,students=async()=>[]}){
 async function scope(who){const s=await store.getDoc('scope','scope')||defaultScope();if(who.role==='teacher')return s;const {overrides,...out}=s;return {...out,...(s.overrides?.[who.seat]||{})};}
 const teacher=who=>{if(who.role!=='teacher')fail('teacher_required',403);};
 async function authorizeConfig(who,c){const s=await scope(who);if(!s.enabled||!s.levels.includes(c.max)||!s.operations.includes(c.operation)||!s.skills.includes(c.skill))fail('scope_closed',403);}
 async function tasks(who){const runs=await store.listRuns(who.role==='teacher'?{}:{seat:who.seat});const result={assignments:[],exams:[]};for(const kind of ['assignment','exam'])for(const t of await store.listDocs(kind)){if(who.role!=='teacher'&&(!visible(t,who.seat)||!active(t,now())))continue;const own=runs.filter(r=>r.taskId===t.id&&r.status==='submitted');result[kind==='exam'?'exams':'assignments'].push({...who.role==='teacher'?t:publicTask(t),completedRounds:own.length,attempt:kind==='exam'?own[0]||null:undefined});}return result;}
 async function taskSave(who,d,kind){teacher(who);const c=config(d.config),roster=await students(),seats=d.studentSeats??[];
  if(typeof d.title!=='string'||!d.title.trim()||d.title.length>80||!Array.isArray(seats)||seats.some(s=>!/^\d{6}$/.test(s)||!roster.some(r=>r.seat===s))||new Set(seats).size!==seats.length||!Number.isSafeInteger(d.startsAt)||!Number.isSafeInteger(d.endsAt)||d.endsAt<=d.startsAt||typeof d.enabled!=='boolean')fail('invalid_task');
  const requiredRounds=kind==='assignment'?d.requiredRounds:1;if(!Number.isInteger(requiredRounds)||requiredRounds<1||requiredRounds>50)fail('invalid_task');
  const key=d.id||crypto.randomUUID(),old=await store.getDoc(kind,key);if(old&&(await store.listRuns({taskId:key})).length)fail('task_locked',409);
  const t={title:d.title.trim(),kind,config:c,studentSeats:seats,startsAt:d.startsAt,endsAt:d.endsAt,enabled:d.enabled,requiredRounds,...kind==='exam'?{questions:generate(c,rng)}:{}};
  return {task:await store.saveDoc(kind,key,t,d.revision??0,now())};
 }
 async function start(who,d,kind){if(who.role!=='student')fail('student_required',403);request(d);let t=null,c,questions;
  const prior=await store.getStart(who.seat,d.requestId),fingerprint=JSON.stringify({kind,config:d.config??null,taskId:d.taskId??null,questionIds:d.questionIds??null});
  if(prior){if(prior.startFingerprint!==fingerprint)fail('request_conflict',409);return {run:prior};}
  if(d.taskId){t=await store.getDoc(kind==='exam'?'exam':'assignment',d.taskId);if(!t||!visible(t,who.seat)||!active(t,now()))fail('task_closed',403);c=t.config;if(kind==='exam'){const existing=await store.getExam(who.seat,t.id);if(existing)return {run:existing};questions=t.questions;}}
  else if(kind==='exam')fail('invalid_task');
  else {c=config(d.config);await authorizeConfig(who,c);}
  if(d.questionIds){if(t||!Array.isArray(d.questionIds)||d.questionIds.length<1||d.questionIds.length>20||new Set(d.questionIds).size!==d.questionIds.length)fail('invalid_answers');const notebook=await api.notebook(who);questions=d.questionIds.map(id=>{const q=notebook.items.find(x=>x.questionId===id)?.question;if(!q||!validQuestion(q,c))fail('scope_closed',403);return q;});}
  questions??=generate(c,rng);const run={id:crypto.randomUUID(),seat:who.seat,kind,taskId:t?.id||null,status:'started',revision:0,config:c,questions,answers:[],result:null,createdAt:now(),updatedAt:now(),startRequestId:d.requestId,startFingerprint:fingerprint};
  try{await store.createRun(run);}catch(e){if(e.status!==409)throw e;const found=kind==='exam'?await store.getExam(who.seat,t.id):await store.getStart(who.seat,d.requestId);if(!found)throw e;if(kind!=='exam'&&found.startFingerprint!==fingerprint)fail('request_conflict',409);return {run:found};}return {run};
 }
 const api={
  async bootstrap(who){return {version:VERSION,scope:await scope(who),...await tasks(who),...(who.role==='teacher'?{students:await students()}: {})};},
  async scopeSave(who,d){teacher(who);const s=d.scope;if(!s||typeof s.enabled!=='boolean'||!Array.isArray(s.levels)||s.levels.some(n=>!LEVELS.includes(n))||!s.levels.length||!Array.isArray(s.operations)||!s.operations.length||s.operations.some(x=>!['add','sub','mix'].includes(x))||!Array.isArray(s.skills)||!s.skills.length||s.skills.some(x=>!['basic','regroup','mixed'].includes(x)))fail('invalid_config');
   const roster=await students(),overrides=s.overrides||{};if(Object.entries(overrides).some(([seat,v])=>!roster.some(r=>r.seat===seat)||!Array.isArray(v.levels)||!v.levels.length||v.levels.some(n=>!LEVELS.includes(n))||Object.keys(v).some(k=>k!=='levels')))fail('invalid_config');
   return {scope:await store.saveDoc('scope','scope',{enabled:s.enabled,levels:[...new Set(s.levels)],operations:[...new Set(s.operations)],skills:[...new Set(s.skills)],overrides},d.revision,now())};},
  assignmentSave:(w,d)=>taskSave(w,d,'assignment'),examSave:(w,d)=>taskSave(w,d,'exam'),
  async taskState(w,d){teacher(w);if(!['assignment','exam'].includes(d.kind)||typeof d.enabled!=='boolean')fail('invalid_task');const old=await store.getDoc(d.kind,d.id);if(!old)fail('not_found',404);return {task:await store.saveDoc(d.kind,d.id,{...old,enabled:d.enabled},d.revision,now())};},
  assignments:async w=>({assignments:(await tasks(w)).assignments}),exams:async w=>({exams:(await tasks(w)).exams}),
  practiceStart:(w,d)=>start(w,d,'practice'),examStart:(w,d)=>start(w,d,'exam'),
  async submit(who,d){if(who.role!=='student')fail('student_required',403);request(d);const r=await store.getRun(d.roundId);if(!r||r.seat!==who.seat)fail('not_found',404);const fingerprint=JSON.stringify(d.answers);
   if(r.status==='submitted'){if(r.submitFingerprint!==fingerprint)fail('request_conflict',409);return {run:r,duplicate:true};}
   if(r.kind==='exam'){const t=await store.getDoc('exam',r.taskId);if(!t||!visible(t,who.seat)||!active(t,now()))fail('task_closed',403);}
   const g=grade(r.questions,d.answers,{exam:r.kind==='exam'});const next={...r,status:'submitted',answers:g.rows,result:g.result,submitFingerprint:fingerprint,submitRequestId:d.requestId,updatedAt:now()};
   try{await store.saveRun(next,r.revision);}catch(e){if(e.status!==409)throw e;const existing=await store.getRun(r.id);if(existing.status==='submitted'&&existing.submitFingerprint===fingerprint)return {run:existing,duplicate:true};throw e;}return {run:await store.getRun(r.id)};
  },
  async notebook(who){if(who.role!=='student')fail('student_required',403);const seen=new Set(),items=[];for(const r of await store.listRuns({seat:who.seat}))if(r.status==='submitted')for(const a of r.answers){const key=questionKey(a.question);if(seen.has(key))continue;seen.add(key);if(!a.firstCorrect||a.hintUsed)items.push({...a,config:r.config,updatedAt:r.updatedAt});}return {items,limited:true};},
  async results(who,d={}){teacher(who);if(d.runId){const run=await store.getRun(d.runId);if(!run)fail('not_found',404);return {run};}return {runs:await store.listRuns({seat:d.seat,taskId:d.taskId}),limited:true};}
 };return api;
}
export function createMemoryStore({storage,key='arithmetic.demo.v1',classId='main'}={}){
 let all;try{all=JSON.parse(storage?.getItem(key)||'null');}catch{}all??={};const state=all[classId]??={docs:{},runs:{}};all[classId]=state;
 const save=()=>{if(storage)storage.setItem(key,JSON.stringify(all));};const copy=x=>x?clone(x):null;
 return {async getDoc(k,id){return copy(state.docs[k+':'+id]);},async listDocs(k){return Object.entries(state.docs).filter(([id])=>id.startsWith(k+':')).map(([,v])=>copy(v));},async saveDoc(k,id,d,revision,at){const old=state.docs[k+':'+id];if((old?.revision||0)!==revision)fail('stale_revision',409);const value={...clone(d),id,revision:revision+1,updatedAt:at};state.docs[k+':'+id]=value;try{save();}catch(e){if(old)state.docs[k+':'+id]=old;else delete state.docs[k+':'+id];throw e;}return copy(value);},async getRun(id){return copy(state.runs[id]);},async getStart(seat,rid){return copy(Object.values(state.runs).find(r=>r.seat===seat&&r.startRequestId===rid));},async getExam(seat,tid){return copy(Object.values(state.runs).find(r=>r.seat===seat&&r.kind==='exam'&&r.taskId===tid));},async listRuns(f={}){return Object.values(state.runs).filter(r=>(!f.seat||r.seat===f.seat)&&(!f.taskId||r.taskId===f.taskId)).sort((a,b)=>b.updatedAt-a.updatedAt||b.createdAt-a.createdAt).slice(0,300).map(copy);},async createRun(r){if(Object.values(state.runs).some(x=>x.seat===r.seat&&(x.startRequestId===r.startRequestId||r.kind==='exam'&&x.kind==='exam'&&x.taskId===r.taskId)))fail('conflict',409);state.runs[r.id]=clone(r);try{save();}catch(e){delete state.runs[r.id];throw e;}},async saveRun(r,revision){const old=state.runs[r.id];if(!old||old.revision!==revision)fail('stale_revision',409);state.runs[r.id]={...clone(r),revision:revision+1};try{save();}catch(e){state.runs[r.id]=old;throw e;}}};
}
