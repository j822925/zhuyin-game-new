import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ANSWER_POLICY,SCALED_ANSWER_POLICY,answerSummary,spellingParts,listeningSummary} from '../annual-challenge-core.js';
import {createMemoryStore,createAnnualChallengeService} from '../annual-challenge-service.js';

const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const org={role:'organizer',classId:'main',id:'direct-score-teacher'},child={role:'student',classId:'main',seat:'990001'};
const key='main:2026:official:990001',signature=[[[.1,.1],[.6,.7]]];
const question={id:'direct-two',text:'八拔',mode:'basic',enabled:true,zhuyin:'ㄅㄚ ㄅㄚˊ',lexicalTones:[1,2],surfaceTones:[1,2],audioUrl:'direct.mp3'};
const correct=(station,q=question)=>station==='tone'?q.lexicalTones:spellingParts(q);
const stamp=station=>station==='tone'?'tone-rabbit':'spell-fox';
const result=(station,wrong=0)=>({answer:correct(station),correct:true,completed:true,firstWrongCharacterCount:wrong,firstWrongCharacterIndices:Array.from({length:wrong},(_,i)=>i),tries:wrong?2:1});
function saved(station,count=3,policy=ANSWER_POLICY){return {station,index:count-1,revision:5,tonePolicy:'lexical',answerPolicy:policy,rounds:Array.from({length:count},(_,i)=>({options:[structuredClone(question)],selected:0,firstErrorPenalty:2,result:result(station,i===0?1:0)})),award:null,receipts:[]};}
let sequence=0;
async function fixture(station,attempt=saved(station)){
 const memory=createMemoryStore();let writes=0;
 const store={transaction:(k,fn)=>memory.transaction(k,value=>{const out=fn(value);if(out?.value!==undefined)writes++;return out;})};
 const service=createAnnualChallengeService({store,bank,studentExists:({classId,seat})=>classId==='main'&&seat==='990001',rng:()=>.42});
 await service.configure(org,2026,{revision:0,enabled:true});await store.transaction(key,()=>({value:{[station]:attempt}}));
 const read=async(who=org)=>(await service.card(who,2026,'990001')).attempts[station];
 const command=async(type,extra={},who=org)=>service.command(who,2026,'990001',station,{type,revision:(await read()).revision,requestId:'direct-command-'+(++sequence),...extra});
 return {service,read,command,writes:()=>writes,raw:()=>store.transaction(key,value=>({out:value[station]}))};
}

for(const station of ['tone','spell']){
 test(station+': direct deductions do not depend on question count or added correct characters',()=>{
  for(const count of [3,8])assert.equal(answerSummary(saved(station,count)).points,18);
  const extraOnly=saved(station);extraOnly.rounds[0].firstErrorPenalty=1;
  assert.equal(answerSummary(extraOnly).points,19);
  const mixed=saved(station);mixed.rounds.push({...structuredClone(mixed.rounds[0]),firstErrorPenalty:1});
  assert.equal(answerSummary(mixed).points,17);assert.equal(answerSummary(mixed).deductedPoints,3);
  mixed.rounds.push(...Array.from({length:5},()=>({...structuredClone(mixed.rounds[1]),firstErrorPenalty:1})));
  assert.equal(answerSummary(mixed).points,17);
  const many=saved(station,8);many.rounds.forEach(r=>{r.result=result(station,2);});
  assert.equal(answerSummary(many).deductedPoints,32);assert.equal(answerSummary(many).points,0);
 });

 test(station+': adding and correctly answering more questions never restores previously deducted points',async()=>{
  const f=await fixture(station);assert.equal(answerSummary(await f.read()).points,18);
  await f.command('extend',{count:2});assert.equal(answerSummary(await f.read()).points,18);
  for(let index=3;index<5;index++){
   await f.command('select',{option:0});const a=await f.read(),q=a.rounds[index].options[0];
   await f.command('answer',{answer:correct(station,q)},child);assert.equal(answerSummary(await f.read()).points,18);
   if(index<4)await f.command('next');
  }
  assert.deepEqual(answerSummary(await f.read(child)),answerSummary(await f.read()));
  await f.command('award',{award:{score:18,stamp:stamp(station),signature,note:''}});
  assert.equal((await f.read()).award.score,18);
 });

 test(station+': completed unsigned scaled cards project once without writes; receipts precede migration and stale commands fail',async()=>{
  const old=saved(station,3,SCALED_ANSWER_POLICY),receipt={type:'answer',revision:4,requestId:'old-scaled-answer-'+station,answer:correct(station)};
  old.receipts=[{id:receipt.requestId,body:JSON.stringify(receipt)}];
  const f=await fixture(station,old),writes=f.writes(),projected=await f.read();
  assert.equal(projected.answerPolicy,ANSWER_POLICY);assert.equal(projected.revision,6);assert.equal(answerSummary(projected).points,18);
  assert.deepEqual(projected.rounds,old.rounds);assert.deepEqual(await f.read(),projected);
  assert.deepEqual(answerSummary(await f.read(child)),answerSummary(projected));assert.equal(f.writes(),writes);assert.deepEqual(await f.raw(),old);
  assert.deepEqual(await f.service.command(child,2026,'990001',station,receipt),{ok:true,revision:5});
  assert.deepEqual(await f.raw(),old);assert.equal(f.writes(),writes);
  await assert.rejects(f.service.command(child,2026,'990001',station,{...receipt,answer:[]}),e=>e.status===409);
  await assert.rejects(f.service.command(child,2026,'990001',station,{type:'choose-stamp',revision:5,requestId:'stale-scaled-stamp-'+station,stamp:stamp(station)}),e=>e.status===409);
  await assert.rejects(f.command('award',{award:{score:answerSummary(old).points,stamp:stamp(station),signature,note:''}}),/首次錯字直接扣分/);
  assert.equal(f.writes(),writes);assert.deepEqual(await f.raw(),old);
  await f.command('choose-stamp',{stamp:stamp(station)},child);
  const persisted=await f.raw();assert.equal(persisted.answerPolicy,ANSWER_POLICY);assert.equal(persisted.revision,7);assert.deepEqual(persisted.rounds,old.rounds);
  assert.deepEqual(await f.read(),persisted);assert.equal(f.writes(),writes+1);
  await f.command('award',{award:{score:18,stamp:stamp(station),signature,note:''}});assert.equal((await f.raw()).award.score,18);
 });

 test(station+': unfinished scaled attempts migrate and retain first-error penalties through correction',async()=>{
  const old=saved(station,3,SCALED_ANSWER_POLICY);old.index=0;
  old.rounds[0].firstErrorPenalty=1;old.rounds[0].result={...result(station,1),correct:false,completed:false,tries:1,firstErrorPenalty:1,firstAnswer:station==='tone'?[2,2]:['ㄇㄨˋ','ㄅㄚˊ']};
  const f=await fixture(station,old),writes=f.writes();
  assert.equal((await f.read()).revision,6);assert.equal(answerSummary(await f.read()).points,19);assert.equal(f.writes(),writes);
  await f.command('answer',{answer:correct(station)},child);
  const a=await f.read();assert.equal(a.answerPolicy,ANSWER_POLICY);assert.equal(a.revision,7);assert.equal(a.rounds[0].result.tries,2);assert.equal(a.rounds[0].result.firstWrongCharacterCount,1);assert.equal(a.rounds[0].result.firstErrorPenalty,1);assert.equal(answerSummary(a).points,19);
 });

 test(station+': awarded scaled history and its score stay unchanged',async()=>{
  const old=saved(station,3,SCALED_ANSWER_POLICY),score=answerSummary(old).points;
  assert.equal(score,17);old.award={score,stamp:stamp(station),signature,note:'歷史簽章',teacherId:org.id,savedAt:1000};
  const f=await fixture(station,old),writes=f.writes();assert.deepEqual(await f.read(),old);
  assert.equal((await f.read(child)).award.score,17);assert.equal(answerSummary(await f.read()).points,17);
  await assert.rejects(f.command('extend',{count:1}),e=>e.status===409);
  assert.equal(f.writes(),writes);assert.deepEqual(await f.raw(),old);
 });
}

test('listening keeps its separate proportional two/one/zero scoring',()=>{
 const rounds=Array.from({length:12},(_,index)=>({result:{outcome:index===0?'fail':'pass'}}));
 assert.equal(listeningSummary({rounds}).points,18);assert.equal(listeningSummary({rounds}).rawPoints,22);
});
