import {PRACTICE_RULE,practiceQuestions} from './hanzi-practice.js?v=20261115-hanzi2';
import {questionPool,gradeReading} from './hanzi-bank.js';

export function createHanziClient({endpoint,classId,getSession,fetchImpl=globalThis.fetch,timeoutMs=20000}){
  return {async request(action,payload={}){
    if(!/^(bootstrap|practice-start|practice-submit|assignments|exams|exam-start|exam-submit|notebook|card-draw)$/.test(action))throw Error('invalid_action');
    const session=getSession();if(!session||session.expires<=Date.now())throw Error('authentication_required');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetchImpl(new URL('/hanzi/'+action,endpoint),{method:'POST',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.token},body:JSON.stringify({...payload,classId})});
      let result;try{result=await response.json();}catch{throw Error('invalid_response');}
      if(!response.ok||result.error||result.ok===false)throw Object.assign(Error(result.code||'http_error'),{userMessage:typeof result.error==='string'?result.error:null});
      return result;
    }catch(error){if(error.name==='AbortError')throw Error('request_timeout');throw error;}
    finally{clearTimeout(timer);}
  }};
}

export function shuffled(items,random=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}

// Demo data never enters the production API. Repeated sends keep the same receipt.
export function createHanziDemo({bank,storage,key,gradeWriting}){
  let saved;try{saved=JSON.parse(storage?.getItem(key)||'null');}catch{}
  const state=saved?.version===bank.version?saved:{version:bank.version,rounds:{},receipts:{},notebook:[]};
  const persist=()=>{try{storage?.setItem(key,JSON.stringify(state));}catch{}};
  return {async request(action,payload={}){
    if(action==='bootstrap')return {version:'hanzi-demo-v1',catalog:bank,scope:{revision:0,termId:bank.semesterId,lessonIds:bank.lessons.filter(x=>x.id==='1').map(x=>x.id)},assignments:[],exams:[]};
    if(action==='assignments')return {assignments:[]};if(action==='exams')return {exams:[]};
    if(action==='notebook')return {items:state.notebook};
    if(action==='practice-start'){
      const existing=Object.values(state.rounds).find(r=>r.requestId===payload.requestId);if(existing)return existing;
      let pool=questionPool(bank,payload.lessonIds,payload.mode,{termId:payload.termId});if(payload.questionIds)pool=pool.filter(q=>payload.questionIds.includes(q.id));
      const unique=[...new Map(shuffled(pool).map(q=>[q.itemId,q])).values()];
      const questions=shuffled(unique).slice(0,Math.max(1,Math.min(payload.mode==='writing'?10:30,Number(payload.count)||5))).map(q=>({...q,questionId:q.id,mode:payload.mode}));
      if(!questions.length)throw Error('empty_scope');
      const round={roundId:crypto.randomUUID(),requestId:payload.requestId,mode:payload.mode,questions,snapshot:{mode:payload.mode,practiceRule:PRACTICE_RULE,baseQuestions:structuredClone(questions),questions:structuredClone(questions),bonusPool:shuffled(unique)}};state.rounds[round.roundId]=round;persist();return round;
    }
    if(action==='practice-submit'){
      if(state.receipts[payload.roundId])return state.receipts[payload.roundId];
      const round=state.rounds[payload.roundId];if(!round)throw Error('round_not_found');
      round.questions=practiceQuestions(round.snapshot,payload.answers);if(payload.answers?.length!==round.questions.length)throw Error('incomplete_round');
      const results=[];
      for(const q of round.questions){const submitted=payload.answers.find(a=>a.questionId===(q.questionId||q.id));if(!submitted)throw Error('incomplete_round');
        const result=round.mode==='writing'?await gradeWriting(q,submitted.answer):gradeReading(q,submitted.answer);
        if(result.correct===false){const correction=submitted.correction,checked=correction&&(round.mode==='writing'?await gradeWriting(q,correction.answer):gradeReading(q,correction.answer));if(!correction?.demonstrationComplete||checked.correct!==true)throw Error('correction_required');}
        const status=result.status||(result.correct?'correct':'incorrect');const row={questionId:q.questionId||q.id,question:q,...result,status,hintUsed:!!submitted.hintUsed};results.push(row);
        state.notebook=state.notebook.filter(x=>x.questionId!==row.questionId||x.mode!==round.mode);
        if(status!=='correct')state.notebook.push({...row,mode:round.mode,updatedAt:new Date().toISOString()});
      }
      const pending=results.filter(r=>r.status==='pending').length,correct=results.filter(r=>r.status==='correct').length;
      const result={run:{id:round.roundId,kind:'practice',mode:round.mode,status:'submitted',snapshot:{questions:round.questions},answers:results.map((r,i)=>({questionId:r.questionId,answer:payload.answers[i].answer,hintUsed:r.hintUsed,grade:r})),result:{correct,pending,total:results.length,incorrect:results.length-correct-pending,score:pending?null:Math.round(correct/results.length*100),perfect:!pending&&correct===results.length,stars:correct===results.length?1:0,corrected:payload.answers.filter(a=>a.correction).length}},demo:true};state.receipts[round.roundId]=result;persist();return result;
    }
    throw Error('demo_unavailable');
  }};
}

export function resultRows(run){
  if(!run?.result||!Array.isArray(run.answers)||!Array.isArray(run.snapshot?.questions))throw Error('invalid_response');
  return run.answers.map(row=>{const question=run.snapshot.questions.find(q=>q.id===row.questionId);if(!question||!row.grade)throw Error('invalid_response');const grade=row.teacherReview?{...row.grade,correct:row.teacherReview.correct,status:row.teacherReview.correct?'correct':'incorrect'}:row.grade;return {...grade,question,questionId:row.questionId,hintUsed:row.hintUsed,teacherReview:row.teacherReview};});
}

export function taskState(task){
  if(task.kind==='assignment')return (task.completedRounds||0)>=(task.requiredRounds||1)?'completed':'open';
  if(task.attempt?.status&&task.attempt.status!=='started')return 'submitted';
  if(task.attempt?.status==='started')return 'started';
  return 'open';
}

// Six decimal places preserve much finer than a screen pixel while keeping a
// ten-character round below the server's 1 MiB bound. Local ink is untouched.
export function compactAnswers(answers){
 const compact=answer=>!Array.isArray(answer?.strokes)?answer:{...answer,strokes:answer.strokes.map(s=>s.map(p=>({x:Number(p.x.toFixed(6)),y:Number(p.y.toFixed(6)),...(p.t===undefined?{}:{t:Math.round(p.t)})})))};
 return answers.map(row=>({...row,answer:compact(row.answer),...(row.correction?{correction:{...row.correction,answer:compact(row.correction.answer)}}:{})}));
}

export function createRoundStore({storage,key,getOwner}){
  let volatileValue;
  return {
    read(){try{const raw=volatileValue===undefined?storage?.getItem(key):volatileValue;const s=JSON.parse(raw||'null');if(!s||s.owner!==getOwner()||!s.round?.roundId||!Array.isArray(s.round.questions)||!Array.isArray(s.answers)||s.answers.length>s.round.questions.length||s.finished)return null;return s;}catch{return null;}},
    save(value){try{volatileValue=JSON.stringify({...value,owner:getOwner()});if(!storage)return false;storage.setItem(key,volatileValue);return true;}catch{return false;}},
    clear(){volatileValue=null;try{storage?.removeItem(key);}catch{}}
  };
}
