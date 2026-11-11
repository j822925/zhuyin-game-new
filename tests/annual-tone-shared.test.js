import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ANSWER_POLICY,answerSummary,roundComplete} from '../annual-challenge-core.js';
import {createMemoryStore,createAnnualChallengeService} from '../annual-challenge-service.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const org={role:'organizer',classId:'main',id:'shared-organizer'},teacher={role:'teacher',classId:'main',id:'shared-teacher',stations:['tone']},child={role:'student',classId:'main',seat:'990001'};
const otherTeacher={...teacher,stations:['spell']},signature=[[[.1,.1],[.6,.7]]];
const question={id:'shared-two',text:'八拔',mode:'basic',enabled:true,zhuyin:'ㄅㄚ ㄅㄚˊ',lexicalTones:[1,2],surfaceTones:[1,2]};
let sequence=0;
const request=(type,revision,extra={})=>({type,revision,requestId:'shared-tone-'+(++sequence),...extra});
const savedAttempt=(station='tone',completed=false)=>({station,index:completed?2:0,revision:5,tonePolicy:'lexical',answerPolicy:ANSWER_POLICY,rounds:Array.from({length:3},()=>({options:[structuredClone(question)],selected:0,firstErrorPenalty:2,result:completed?{answer:[1,2],correct:true,completed:true,firstWrongCharacterCount:0,firstWrongCharacterIndices:[],tries:1}:null})),award:null,receipts:[]});
async function fixture({station='tone',completed=false,mode='official'}={}){
 const store=createMemoryStore(),service=createAnnualChallengeService({store,bank,now:()=>1000,rng:()=>.42,studentExists:({classId,seat})=>classId==='main'&&['990001','990002'].includes(seat)});
 await service.configure(org,2026,{revision:0,access:{official:{enabled:true,allStudents:false,seats:['990001']},rehearsal:{enabled:true,allStudents:false,seats:['990001']}}});
 const key='main:2026:'+mode+':990001';await store.transaction(key,()=>({value:{[station]:savedAttempt(station,completed)}}));
 const attempt=async(who=teacher)=>(await service.card(who,2026,'990001',mode)).attempts[station];
 const command=async(type,extra={},who=teacher)=>service.command(who,2026,'990001',station,request(type,(await attempt(org)).revision,{mode,...extra}));
 return {store,service,attempt,command,key};
}
async function finishTone(f){for(;;){const a=await f.attempt(),r=a.rounds[a.index];if(!roundComplete(r))await f.command('answer',{answer:r.options[r.selected].lexicalTones});if(a.index===a.rounds.length-1)return;await f.command('next');}}

test('teacher screen and child tablet share the same first error and correction record',async()=>{
 const f=await fixture();await f.command('answer',{answer:[2,2]});
 let a=await f.attempt(),r=a.rounds[0];assert.equal(r.result.completed,false);assert.equal(r.result.firstWrongCharacterCount,1);assert.equal(r.result.firstErrorPenalty,2);assert.equal(r.result.tries,1);
 const student=await f.attempt(child);assert.deepEqual(student.rounds[0].result.answer,[2,2]);assert.deepEqual(student.rounds[0].result.wrongCharacterIndices,[0]);assert.equal(student.receipts,undefined);
 assert.equal(JSON.stringify(student).includes('lexicalTones'),false);assert.equal(JSON.stringify(student).includes('surfaceTones'),false);
 await assert.rejects(f.command('next'),/完成/);await assert.rejects(f.command('choose-stamp',{stamp:'tone-frog'}),/完成/);
 await f.command('answer',{answer:[1,2]},child);r=(await f.attempt()).rounds[0];assert.equal(r.result.completed,true);assert.equal(r.result.tries,2);assert.deepEqual(r.result.firstAnswer,[2,2]);
 await f.command('next');await f.command('answer',{answer:[1,3]},child);await f.command('answer',{answer:[1,2]});
 await finishTone(f);a=await f.attempt();assert.equal(answerSummary(a).firstWrongCharacterCount,2);assert.equal(answerSummary(a).deductedPoints,4);assert.equal(answerSummary(a).points,16);
 assert.deepEqual(answerSummary(await f.attempt(child)),answerSummary(a));
 await f.command('award',{award:{score:16,stamp:'tone-frog',signature,note:''}});assert.equal((await f.attempt(child)).award.score,16);
 await assert.rejects(f.command('answer',{answer:[1,2]}),e=>e.status===409);
});

test('authorized organizer also submits tone answers, while initial and extra penalties stay server controlled',async()=>{
 const f=await fixture();await f.command('answer',{answer:[2,2],firstErrorPenalty:0},org);await f.command('answer',{answer:[1,2]},org);await finishTone(f);
 await f.command('extend',{count:1});let a=await f.attempt();assert.equal(a.rounds[3].firstErrorPenalty,1);await f.command('select',{option:0});a=await f.attempt();const good=a.rounds[3].options[0].lexicalTones,bad=good.map((v,i)=>i===0?v%5+1:v);
 await f.command('answer',{answer:bad,firstErrorPenalty:2});await f.command('answer',{answer:good},child);a=await f.attempt();
 assert.equal(a.rounds[0].result.firstErrorPenalty,2);assert.equal(a.rounds[3].result.firstErrorPenalty,1);assert.equal(answerSummary(a).initialWrongCharacterCount,1);assert.equal(answerSummary(a).extraWrongCharacterCount,1);assert.equal(answerSummary(a).deductedPoints,3);
});

test('simultaneous big-screen/tablet submissions accept one revision and replay safely without double deductions',async()=>{
 const f=await fixture(),first=request('answer',5,{answer:[2,2]}),second=request('answer',5,{answer:[1,2]});
 const results=await Promise.allSettled([f.service.command(teacher,2026,'990001','tone',first),f.service.command(child,2026,'990001','tone',second)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 const accepted=results[0].status==='fulfilled'?{who:teacher,body:first}:{who:child,body:second},before=await f.attempt();
 assert.equal(before.rounds[0].result.tries,1);await f.service.command(accepted.who,2026,'990001','tone',accepted.body);assert.deepEqual(await f.attempt(),before);
 await assert.rejects(f.service.command(accepted.who,2026,'990001','tone',{...accepted.body,answer:[5,5]}),e=>e.status===409);
 if(!roundComplete(before.rounds[0]))await f.command('answer',{answer:[1,2]},child);
 const corrected=await f.attempt();await f.service.command(accepted.who,2026,'990001','tone',accepted.body);assert.deepEqual(await f.attempt(),corrected);
});

test('tone stamp can be selected on either device with stale selection protection and same-station validation',async()=>{
 const f=await fixture({completed:true}),pick=request('choose-stamp',5,{stamp:'tone-penguin'});await f.service.command(teacher,2026,'990001','tone',pick);
 assert.equal((await f.attempt(child)).preferredStamp,'tone-penguin');await f.service.command(teacher,2026,'990001','tone',pick);assert.equal((await f.attempt()).revision,6);
 await assert.rejects(f.service.command(child,2026,'990001','tone',request('choose-stamp',5,{stamp:'tone-chick'})),e=>e.status===409);
 await f.command('choose-stamp',{stamp:'tone-chick'},child);assert.equal((await f.attempt()).preferredStamp,'tone-chick');
 await assert.rejects(f.command('choose-stamp',{stamp:'spell-fox'}),/這一關/);await f.command('choose-stamp',{stamp:'tone-frog'},org);assert.equal((await f.attempt(child)).preferredStamp,'tone-frog');
 await f.command('award',{award:{score:20,stamp:'tone-frog',signature,note:''}});await assert.rejects(f.command('choose-stamp',{stamp:'tone-chick'}),e=>e.status===409);
});

test('teacher answer and child-preference permissions remain unchanged outside tone',async()=>{
 const f=await fixture({station:'spell',completed:true});
 for(const who of [org,otherTeacher]){
  await assert.rejects(f.command('answer',{answer:['ㄅㄚ','ㄅㄚˊ']},who),e=>e.status===403&&/孩子/.test(e.message));
  await assert.rejects(f.command('choose-stamp',{stamp:'spell-fox'},who),e=>e.status===403&&/孩子/.test(e.message));
 }
 const tone=await fixture();for(const type of ['answer','choose-stamp'])await assert.rejects(tone.command(type,type==='answer'?{answer:[1,2]}:{stamp:'tone-rabbit'},otherTeacher),e=>e.status===403&&/負責/.test(e.message));
 await f.command('choose-stamp',{stamp:'spell-fox'},child);assert.equal((await f.attempt(org)).preferredStamp,'spell-fox');
});

test('shared tone commands preserve verified identity, student scope, year, mode and event access gates',async()=>{
 const f=await fixture(),payload=request('answer',5,{answer:[1,2]});
 for(const who of [{...teacher,seatScope:'990002'},{...teacher,yearScope:2025},{...teacher,modeScope:'rehearsal'},{...teacher,expiresAt:1000}])await assert.rejects(f.service.command(who,2026,'990001','tone',payload),e=>[401,403].includes(e.status));
 await assert.rejects(f.service.command({...teacher,classId:'grade2'},2026,'990001','tone',payload),e=>e.status===404);
 await assert.rejects(f.service.command(teacher,2026,'990002','tone',payload),e=>e.status===403&&/開放給/.test(e.message));
 await assert.rejects(f.service.command(child,2026,'990002','tone',payload),e=>e.status===403&&/自己/.test(e.message));
 await f.service.configure(org,2026,{revision:1,access:{official:{enabled:false}}});await assert.rejects(f.command('answer',{answer:[1,2]}),e=>e.status===403&&/尚未開放/.test(e.message));
 assert.equal((await f.attempt()).rounds[0].result,null);
});

test('reset rehearsal rejects stale shared-screen answers and stamps while official remains isolated',async()=>{
 const f=await fixture({mode:'rehearsal',completed:true});await f.command('choose-stamp',{stamp:'tone-penguin'});
 assert.deepEqual((await f.service.card(org,2026,'990001','official')).attempts,{});
 await f.service.resetRehearsal(org,2026,{revision:1,requestId:'shared-reset-round'});
 for(const type of ['answer','choose-stamp'])await assert.rejects(f.service.command(teacher,2026,'990001','tone',request(type,6,{mode:'rehearsal',rehearsalRound:1,...(type==='answer'?{answer:[1,2]}:{stamp:'tone-frog'})})),e=>e.status===409&&/已重置/.test(e.message));
 assert.deepEqual((await f.service.card(org,2026,'990001','rehearsal')).attempts,{});assert.equal((await f.service.card(org,2026,'990001','rehearsal',1)).attempts.tone.preferredStamp,'tone-penguin');
});
