import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ANSWER_POLICY,answerSummary,roundComplete,gradeAnswer,spellingParts,defaultEvent,normalizeEvent} from '../annual-challenge-core.js';
import {createMemoryStore,createAnnualChallengeService} from '../annual-challenge-service.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const org={role:'organizer',classId:'main',id:'retry-teacher'},child={role:'student',classId:'main',seat:'990001'},key='main:2026:official:990001';
const signature=[[[.1,.1],[.6,.7]]],q2={id:'qa-two',text:'八拔',mode:'basic',enabled:true,zhuyin:'ㄅㄚ ㄅㄚˊ',lexicalTones:[1,2],surfaceTones:[1,2],audioUrl:'qa.mp3'},q1={...q2,id:'qa-one',text:'八',zhuyin:'ㄅㄚ',lexicalTones:[1],surfaceTones:[1]};
const makeAttempt=(station,policy=true)=>({station,index:0,revision:5,tonePolicy:'lexical',...(policy?{answerPolicy:ANSWER_POLICY}:{}),rounds:[q2,q1,q2].map(q=>({options:[structuredClone(q)],selected:0,result:null})),award:null,receipts:[]});
const correct=(station,q)=>station==='tone'?q.lexicalTones:spellingParts(q);
const wrong=(station,answer,index=0)=>answer.map((v,i)=>i===index?(station==='tone'?(v%5)+1:'ㄇㄨˋ'):v);
let sequence=0;
async function fixture(station='tone',saved=makeAttempt(station)){
 const memory=createMemoryStore();let writes=0;
 const store={transaction:(k,fn)=>memory.transaction(k,value=>{const result=fn(value);if(result?.value!==undefined)writes++;return result;})};
 const service=createAnnualChallengeService({store,bank,studentExists:({seat})=>seat==='990001',rng:()=>.42});
 await service.configure(org,2026,{revision:0,enabled:true});if(saved)await store.transaction(key,()=>({value:{[station]:saved}}));
 const attempt=async(who=org)=>(await service.card(who,2026,who===child?undefined:'990001')).attempts[station];
 const command=async(type,extra={},who=org)=>service.command(who,2026,'990001',station,{type,revision:(await attempt())?.revision||0,requestId:'retry-answer-'+(++sequence),...extra});
 return {service,store,attempt,command,writes:()=>writes,raw:()=>store.transaction(key,value=>({out:value}))};
}
async function finish(f,station){for(;;){const a=await f.attempt(),r=a.rounds[a.index];if(!roundComplete(r)){if(r.selected===null)await f.command('select',{option:0});const chosen=(await f.attempt()).rounds[a.index];await f.command('answer',{answer:correct(station,chosen.options[chosen.selected])},child);}if(a.index===a.rounds.length-1)return;await f.command('next');}}

test('grading identifies characters, not individual wrong phonetic parts, with normalized neutral dots',()=>{
 assert.deepEqual(gradeAnswer('tone',q2,[2,4]).wrongCharacterIndices,[0,1]);
 const grade=gradeAnswer('spell',q2,['ㄇㄨˋ','ㄅㄚˊ']);assert.equal(grade.wrongCharacterCount,1);assert.deepEqual(grade.wrongCharacterIndices,[0]);
 assert.equal(gradeAnswer('spell',{zhuyin:'˙ㄗ ㄇㄠ'},['ㄗ˙','ㄇㄠ─']).correct,true);
 assert.equal(roundComplete({result:{correct:false}}),true);assert.equal(roundComplete({result:{completed:false}}),false);assert.equal(roundComplete({result:null}),false);
});

for(const station of ['tone','spell']){
 test(station+': first errors stay fixed while retries must become correct; incomplete work cannot progress',async()=>{
  const f=await fixture(station),good=correct(station,q2),first=wrong(station,good,0),second=wrong(station,good,1);
  await assert.rejects(f.command('answer',{answer:[]},child));assert.equal((await f.attempt()).rounds[0].result,null);
  await f.command('answer',{answer:first},child);let a=await f.attempt(),r=a.rounds[0];
  assert.equal(r.result.completed,false);assert.equal(r.result.tries,1);assert.deepEqual(r.result.firstWrongCharacterIndices,[0]);assert.equal(r.result.firstWrongCharacterCount,1);assert.equal(r.result.firstErrorPenalty,2);
  for(const [type,extra,who] of [['next',{},org],['extend',{count:1},org],['choose-stamp',{stamp:station==='tone'?'tone-rabbit':'spell-fox'},child],['award',{award:{score:16,stamp:station==='tone'?'tone-rabbit':'spell-fox',signature,note:''}},org]])await assert.rejects(f.command(type,extra,who),/完成/);
  await f.command('answer',{answer:second},child);r=(await f.attempt()).rounds[0];assert.equal(r.result.tries,2);assert.deepEqual(r.result.answer,second);assert.deepEqual(r.result.wrongCharacterIndices,[1]);assert.deepEqual(r.result.firstAnswer,first);assert.deepEqual(r.result.firstWrongCharacterIndices,[0]);assert.equal(r.result.firstWrongCharacterCount,1);
  const student=await f.attempt(child),sr=student.rounds[0].result;assert.deepEqual(sr.answer,second);assert.deepEqual(sr.wrongCharacterIndices,[1]);assert.equal(sr.completed,false);assert.equal(sr.tries,2);assert.equal(sr.firstWrongCharacterCount,1);
  assert.equal(student.receipts,undefined);assert.equal(JSON.stringify(student).includes('lexicalTones'),false);assert.equal(JSON.stringify(student).includes('surfaceTones'),false);assert.equal(JSON.stringify(student).includes('zhuyin'),false);
  assert.deepEqual(answerSummary(student),answerSummary(await f.attempt()));
  await f.command('answer',{answer:good},child);r=(await f.attempt()).rounds[0];assert.equal(roundComplete(r),true);assert.equal(r.result.tries,3);assert.equal(r.result.firstWrongCharacterCount,1);assert.deepEqual(r.result.wrongCharacterIndices,[]);
  await assert.rejects(f.command('answer',{answer:good},child),e=>e.status===409);
  await finish(f,station);a=await f.attempt();assert.deepEqual(answerSummary(a),{total:3,completed:3,remaining:0,answered:3,corrected:1,totalCharacters:5,firstWrongCharacterCount:1,wrongCharacters:1,initialWrongCharacterCount:1,extraWrongCharacterCount:0,deductedPoints:2,rawPoints:8,maxRawPoints:10,points:16});
  await assert.rejects(f.command('award',{award:{score:18,stamp:station==='tone'?'tone-rabbit':'spell-fox',signature,note:''}}),/首次錯字比例/);
  await f.command('award',{award:{score:16,stamp:station==='tone'?'tone-rabbit':'spell-fox',signature,note:''}});assert.equal((await f.attempt()).award.score,16);
 });

 test(station+': first-answer retries are idempotent and stale/reused requests cannot change the first error',async()=>{
  const f=await fixture(station),answer=wrong(station,correct(station,q2)),request={type:'answer',revision:5,requestId:'fixed-first-'+station,answer};
  await f.service.command(child,2026,'990001',station,request);const after=await f.raw(),writes=f.writes();
  await f.service.command(child,2026,'990001',station,request);assert.equal(f.writes(),writes);assert.deepEqual(await f.raw(),after);
  await assert.rejects(f.service.command(child,2026,'990001',station,{...request,answer:correct(station,q2)}),e=>e.status===409);
  await assert.rejects(f.service.command(child,2026,'990001',station,{...request,requestId:'stale-new-'+station}),e=>e.status===409);
  await f.command('answer',{answer:correct(station,q2)},child);const corrected=await f.raw(),correctedWrites=f.writes();await f.service.command(child,2026,'990001',station,request);assert.deepEqual(await f.raw(),corrected);assert.equal(f.writes(),correctedWrites);
 });

 test(station+': initial first errors cost two and new extra errors cost one, fixed across retries and client overrides',async()=>{
  const f=await fixture(station);
  for(let i=0;i<3;i++){const a=await f.attempt(),q=a.rounds[i].options[0],good=correct(station,q),bad=good.map(v=>station==='tone'?(v%5)+1:'ㄇㄨˋ');await f.command('answer',{answer:bad},child);await f.command('answer',{answer:bad},child);await f.command('answer',{answer:good},child);if(i<2)await f.command('next');}
  assert.equal(answerSummary(await f.attempt()).points,0);assert.equal(answerSummary(await f.attempt()).firstWrongCharacterCount,5);
  const before=(await f.attempt()).rounds;await f.command('extend',{count:2,firstErrorPenalty:2});assert.ok((await f.attempt()).rounds.slice(3).every(r=>r.firstErrorPenalty===1));assert.ok((await f.attempt(child)).rounds.slice(3).every(r=>r.firstErrorPenalty===1));
  for(let i=3;i<5;i++){await f.command('select',{option:0});const r=(await f.attempt()).rounds[i],good=correct(station,r.options[0]),bad=good.map(v=>station==='tone'?(v%5)+1:'ㄇㄨˋ');await f.command('answer',{answer:bad,firstErrorPenalty:2},child);await f.command('answer',{answer:bad,firstErrorPenalty:0},child);await f.command('answer',{answer:good},child);const result=(await f.attempt()).rounds[i].result;assert.equal(result.firstErrorPenalty,1);assert.equal(result.tries,3);assert.equal(result.firstWrongCharacterCount,good.length);if(i<4)await f.command('next');}
  const after=await f.attempt(),total=after.rounds.reduce((n,r)=>n+[...r.options[r.selected].text].length,0),extraCharacters=total-5,sum=answerSummary(after);
  assert.deepEqual(after.rounds.slice(0,3),before);assert.equal(sum.totalCharacters,total);assert.equal(sum.firstWrongCharacterCount,total);assert.equal(sum.initialWrongCharacterCount,5);assert.equal(sum.extraWrongCharacterCount,extraCharacters);assert.equal(sum.deductedPoints,10+extraCharacters);assert.equal(sum.rawPoints,extraCharacters);assert.equal(sum.points,Math.round(extraCharacters/(total*2)*20));assert.equal(sum.maxRawPoints,total*2);assert.ok(sum.points>0);
  assert.deepEqual(answerSummary(await f.attempt(child)),sum);assert.ok((await f.attempt(child)).rounds.slice(3).every(r=>r.result.firstErrorPenalty===1));
  await f.command('award',{award:{score:sum.points,stamp:station==='tone'?'tone-rabbit':'spell-fox',signature,note:''}});assert.equal((await f.attempt()).award.score,sum.points);
 });

 test(station+': active old work projects read-only once; completed history is preserved and extends into the new policy',async()=>{
  const old=makeAttempt(station,false);old.index=1;old.rounds[0].result={answer:wrong(station,correct(station,q2)),correct:false};
  const f=await fixture(station,old),writes=f.writes(),first=await f.attempt();assert.equal(first.answerPolicy,ANSWER_POLICY);assert.equal(first.revision,6);assert.deepEqual(first.rounds,old.rounds);assert.deepEqual(await f.attempt(),first);assert.equal(f.writes(),writes);assert.deepEqual((await f.raw())[station],old);
  assert.equal(answerSummary(first).firstWrongCharacterCount,1);assert.deepEqual(answerSummary(await f.attempt(child)),answerSummary(first));
  await assert.rejects(f.service.command(child,2026,'990001',station,{type:'answer',revision:5,requestId:'old-version-'+station,answer:correct(station,q1)}),e=>e.status===409);
  await f.service.command(org,2026,'990001','read',{type:'start',revision:0,requestId:'unrelated-read-'+station});assert.deepEqual((await f.raw())[station],old);
  await finish(f,station);assert.equal((await f.raw())[station].answerPolicy,ANSWER_POLICY);assert.deepEqual((await f.raw())[station].rounds[0],old.rounds[0]);
  const done=makeAttempt(station,false);done.index=2;done.rounds.forEach((r,i)=>{r.result=i===0?{answer:wrong(station,correct(station,r.options[0])),correct:false}:{correct:true};});
  const h=await fixture(station,done),historicalWrites=h.writes();assert.deepEqual(await h.attempt(),done);assert.equal(h.writes(),historicalWrites);
  await h.command('extend',{count:1});const extended=await h.attempt();assert.equal(extended.answerPolicy,ANSWER_POLICY);assert.deepEqual(extended.rounds.slice(0,3),done.rounds);assert.equal(answerSummary(extended).firstWrongCharacterCount,1);
  const legacyAward=await fixture(station,done);await legacyAward.command('award',{award:{score:13,stamp:station==='tone'?'tone-rabbit':'spell-fox',signature,note:'保留舊評分'}});const awarded=await legacyAward.raw(),awardWrites=legacyAward.writes();assert.equal((await legacyAward.attempt()).award.score,13);assert.deepEqual(await legacyAward.raw(),awarded);assert.equal(legacyAward.writes(),awardWrites);
 });
}

test('tone defaults to four even for saved former defaults; explicit counts remain three through eight',async()=>{
 assert.equal(defaultEvent().toneCount,4);assert.equal(normalizeEvent({toneCount:10}).toneCount,4);
 const f=await fixture('tone',null);await f.service.configure(org,2026,{revision:1,toneCount:5});await f.command('start');assert.equal((await f.attempt()).rounds.length,4);
 for(const count of [3,4,5,6,7,8]){const t=await fixture('tone',null);await t.command('start',{count,firstErrorPenalty:1});assert.equal((await t.attempt()).rounds.length,count);assert.equal((await t.attempt()).answerPolicy,ANSWER_POLICY);assert.ok((await t.attempt()).rounds.every(r=>r.firstErrorPenalty===2));}
 const spell=await fixture('spell',null);await spell.command('start');assert.equal((await spell.attempt()).rounds.length,5);
});
