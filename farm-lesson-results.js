// Farm receipts deliberately contain no written characters, names or answers.
const MODES={hanzi:{reading:'hanzi-reading',writing:'hanzi-writing'},copy:{copy:'hanzi-copy','name-writing':'name-writing','name-copy':'name-copy'},arithmetic:{practice:'arithmetic'}};
export function farmLessonMode(family,mode){return MODES[family]?.[mode]||null;}
export function requestedFarmLesson(family,lesson){return Object.entries(MODES[family]||{}).find(([,id])=>id===lesson)?.[0]||null;}
function context({family,run,seat,excluded=false}){
 if(excluded||!run||!/^\d{1,6}$/.test(String(seat))||run.seat!=null&&String(run.seat)!==String(seat)||run.assignmentId||run.taskId||run.examId||run.result?.review)return null;
 if(family!=='copy'&&run.kind!=='practice')return null;
 if(family==='copy'&&run.kind&&run.kind!=='practice')return null;
 const mode=farmLessonMode(family,family==='arithmetic'?'practice':run.mode),roundId=run.id||run.roundId;
 if(!mode||typeof roundId!=='string'||!roundId)return null;
 const all=family==='arithmetic'?run.questions:run.snapshot?.questions||run.questions;
 if(!Array.isArray(all)||!all.length||all.some(q=>typeof q?.id!=='string'||!q.id)||new Set(all.map(q=>q.id)).size!==all.length)return null;
 const questions=family==='hanzi'?(run.snapshot?.baseQuestions||all.filter(q=>!q.id.includes('.bonus.'))):all;
 if(!Array.isArray(questions)||!questions.length||questions.some(q=>!all.some(a=>a.id===q?.id))||new Set(questions.map(q=>q.id)).size!==questions.length)return null;
 const total=questions.length;
 if(family==='arithmetic'?![5,10,20].includes(total):mode.startsWith('name-')?(total<2||total>6):(total<1||total>5))return null;
 return {family,questions,all,payload:{seat:String(seat),roundId,mode,total,expectedTotal:total}};
}
export function farmLessonStart(input){const c=context(input);return c&&input.run.status==='started'?c.payload:null;}
export function farmLessonCompletion(input){
 const c=context(input),run=input.run;
 if(!c||run.status!=='submitted'||!run.result||run.result.pending||!Array.isArray(run.answers)||run.answers.length!==c.all.length||run.result.total!==c.all.length)return null;
 const byId=new Map(run.answers.map(a=>[a?.questionId,a]));
 if(byId.size!==c.all.length||c.all.some(q=>!byId.has(q.id)))return null;
 const results=c.questions.map(q=>{
  const a=byId.get(q.id),grade=c.family==='arithmetic'?null:c.family==='copy'?a.firstGrade:a.grade;
  const firstCorrect=c.family==='arithmetic'?a.firstCorrect:grade?.correct;
  if(typeof firstCorrect!=='boolean'||grade?.status==='pending')return null;
  return {firstCorrect};
 });
 if(results.some(r=>!r))return null;
 return {...c.payload,kind:'solo',completed:true,results};
}
