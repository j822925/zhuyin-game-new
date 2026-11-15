import {VERSION,LEVELS,config,generate,grade,clone,fail,questionKey,validQuestion} from './arithmetic-core.js?v=20261115-math2';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][\w.:-]{7,119}$/.test(v);
const request=d=>{if(!id(d.requestId))fail('invalid_request_id');};
export const ARITHMETIC_REWARD_RULE='arithmetic-perfect-20261115-v1';
const defaultScope=()=>({enabled:true,levels:[...LEVELS],operations:['add','sub','mix'],skills:['basic','regroup','mixed'],revision:0});
const active=(t,now)=>t.enabled&&now>=t.startsAt&&now<t.endsAt;
const visible=(t,seat)=>!t.studentSeats.length||t.studentSeats.includes(seat);
const publicTask=t=>{const {studentSeats,questions,...out}=t;return out;};
export function createArithmeticService({store,now=Date.now,rng=Math.random,students=async()=>[]}){
 async function scope(){return defaultScope();}
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
  questions??=generate(c,rng);const run={id:crypto.randomUUID(),seat:who.seat,kind,taskId:t?.id||null,status:'started',revision:0,config:c,questions,answers:[],result:null,rewardRule:ARITHMETIC_REWARD_RULE,createdAt:now(),updatedAt:now(),startRequestId:d.requestId,startFingerprint:fingerprint};
  try{await store.createRun(run);}catch(e){if(e.status!==409)throw e;const found=kind==='exam'?await store.getExam(who.seat,t.id):await store.getStart(who.seat,d.requestId);if(!found)throw e;if(kind!=='exam'&&found.startFingerprint!==fingerprint)fail('request_conflict',409);return {run:found};}return {run};
 }
 const api={
  async bootstrap(who){return {version:VERSION,scope:await scope(who),...await tasks(who),...(who.role==='teacher'?{students:await students()}: {})};},
  assignmentSave:(w,d)=>taskSave(w,d,'assignment'),examSave:(w,d)=>taskSave(w,d,'exam'),
  async taskState(w,d){teacher(w);if(!['assignment','exam'].includes(d.kind)||typeof d.enabled!=='boolean')fail('invalid_task');const old=await store.getDoc(d.kind,d.id);if(!old)fail('not_found',404);return {task:await store.saveDoc(d.kind,d.id,{...old,enabled:d.enabled},d.revision,now())};},
  assignments:async w=>({assignments:(await tasks(w)).assignments}),exams:async w=>({exams:(await tasks(w)).exams}),
  practiceStart:(w,d)=>start(w,d,'practice'),examStart:(w,d)=>start(w,d,'exam'),
  async submit(who,d){if(who.role!=='student')fail('student_required',403);request(d);const r=await store.getRun(d.roundId);if(!r||r.seat!==who.seat)fail('not_found',404);const fingerprint=JSON.stringify(d.answers);
   if(r.status==='submitted'){if(r.submitFingerprint!==fingerprint)fail('request_conflict',409);return {run:r,duplicate:true};}
   if(r.kind==='exam'){const t=await store.getDoc('exam',r.taskId);if(!t||!visible(t,who.seat)||!active(t,now()))fail('task_closed',403);}
   const g=grade(r.questions,d.answers,{exam:r.kind==='exam'}),stars=r.kind==='practice'&&r.rewardRule===ARITHMETIC_REWARD_RULE&&g.result.correct===g.result.total?1:0;
   const next={...r,status:'submitted',answers:g.rows,result:{...g.result,stars},submitFingerprint:fingerprint,submitRequestId:d.requestId,updatedAt:now()};
   try{await store.saveRun(next,r.revision,stars);}catch(e){if(e.status!==409)throw e;const existing=await store.getRun(r.id);if(existing.status==='submitted'&&existing.submitFingerprint===fingerprint)return {run:existing,duplicate:true};throw e;}return {run:await store.getRun(r.id)};
  },
  async notebook(who){if(who.role!=='student')fail('student_required',403);const seen=new Set(),items=[];for(const r of await store.listRuns({seat:who.seat}))if(r.status==='submitted')for(const a of r.answers){const key=questionKey(a.question);if(seen.has(key))continue;seen.add(key);if(!a.firstCorrect||a.hintUsed)items.push({...a,config:r.config,updatedAt:r.updatedAt});}return {items,limited:true};},
  async results(who,d={}){teacher(who);if(d.runId){const run=await store.getRun(d.runId);if(!run)fail('not_found',404);return {run};}return {runs:await store.listRuns({seat:d.seat,taskId:d.taskId}),limited:true};},
  async monthly(who,d={}){
   teacher(who);if(!/^\d{4}-\d{2}-\d{2}$/.test(d.from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(d.to||''))fail('invalid_config');
   const from=Date.parse(d.from+'T00:00:00+08:00'),to=Date.parse(d.to+'T00:00:00+08:00')+86400000;
   if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>367*86400000||!['all','practice','exam'].includes(d.source||'all'))fail('invalid_config');
   const roster=(await students()).filter(s=>d.seat?s.seat===d.seat:!s.test),seats=new Set(roster.map(s=>s.seat));
   const all=await store.listRuns({seat:d.seat,from,to,limit:5001}),limited=all.length>5000;
   const runs=all.slice(0,5000).filter(r=>seats.has(r.seat)&&r.status==='submitted'&&(!d.source||d.source==='all'||r.kind===(d.source==='exam'?'exam':'practice')));
   return {runs,limited,students:roster.map(s=>{const own=runs.filter(r=>r.seat===s.seat),wrong=new Map();for(const r of own)for(const a of r.answers)if(!a.firstCorrect){const target=a.question.a+(a.question.op==='add'?'＋':'－')+a.question.b+'＝'+(a.question.op==='add'?a.question.a+a.question.b:a.question.a-a.question.b);wrong.set(target,(wrong.get(target)||0)+1);}return {...s,category:{id:'arithmetic',tracked:true,wrong:[...wrong.values()].reduce((a,b)=>a+b,0),items:[...wrong].map(([target,wrong])=>({target,wrong})),omitted:0}};})};
  }
 };return api;
}
export function createMemoryStore({storage,key='arithmetic.demo.v1',classId='main'}={}){
 let all;try{all=JSON.parse(storage?.getItem(key)||'null');}catch{}all??={};const state=all[classId]??={docs:{},runs:{}};all[classId]=state;
 const save=()=>{if(storage)storage.setItem(key,JSON.stringify(all));};const copy=x=>x?clone(x):null;
 return {async getDoc(k,id){return copy(state.docs[k+':'+id]);},async listDocs(k){return Object.entries(state.docs).filter(([id])=>id.startsWith(k+':')).map(([,v])=>copy(v));},async saveDoc(k,id,d,revision,at){const old=state.docs[k+':'+id];if((old?.revision||0)!==revision)fail('stale_revision',409);const value={...clone(d),id,revision:revision+1,updatedAt:at};state.docs[k+':'+id]=value;try{save();}catch(e){if(old)state.docs[k+':'+id]=old;else delete state.docs[k+':'+id];throw e;}return copy(value);},async getRun(id){return copy(state.runs[id]);},async getStart(seat,rid){return copy(Object.values(state.runs).find(r=>r.seat===seat&&r.startRequestId===rid));},async getExam(seat,tid){return copy(Object.values(state.runs).find(r=>r.seat===seat&&r.kind==='exam'&&r.taskId===tid));},async listRuns(f={}){return Object.values(state.runs).filter(r=>(!f.seat||r.seat===f.seat)&&(!f.taskId||r.taskId===f.taskId)&&(!f.from||r.updatedAt>=f.from)&&(!f.to||r.updatedAt<f.to)).sort((a,b)=>b.updatedAt-a.updatedAt||b.createdAt-a.createdAt).slice(0,f.limit||300).map(copy);},async createRun(r){if(Object.values(state.runs).some(x=>x.seat===r.seat&&(x.startRequestId===r.startRequestId||r.kind==='exam'&&x.kind==='exam'&&x.taskId===r.taskId)))fail('conflict',409);state.runs[r.id]=clone(r);try{save();}catch(e){delete state.runs[r.id];throw e;}},async saveRun(r,revision){const old=state.runs[r.id];if(!old||old.revision!==revision)fail('stale_revision',409);state.runs[r.id]={...clone(r),revision:revision+1};try{save();}catch(e){state.runs[r.id]=old;throw e;}}};
}
