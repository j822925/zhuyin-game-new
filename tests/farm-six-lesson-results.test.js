import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {farmLessonStart,farmLessonCompletion,requestedFarmLesson} from '../farm-lesson-results.js';

function fixture(family,mode,total=5){
 const questions=Array.from({length:total},(_,i)=>({id:'q'+i,character:'測試字',bopomofo:'私人答案'}));
 const run={id:'test-round',seat:'990001',mode,kind:'practice',status:'started',snapshot:{questions},questions};
 return {family,run,seat:'990001'};
}
function finish(input,correct=4){
 const run=structuredClone(input.run),questions=run.snapshot.questions;
 run.status='submitted';run.result={total:questions.length,correct,stars:10};
 run.answers=questions.map((q,i)=>({questionId:q.id,grade:{correct:i<correct,status:i<correct?'correct':'incorrect'},firstGrade:{correct:i<correct,status:i<correct?'correct':'incorrect'},finalGrade:{correct:true},firstCorrect:i<correct,answer:'私人答案'}));
 return {...input,run};
}

test('all six real lesson modes snapshot their complete starting count without private content',()=>{
 for(const [family,mode,total,lesson] of [['hanzi','reading',5,'hanzi-reading'],['hanzi','writing',5,'hanzi-writing'],['copy','copy',5,'hanzi-copy'],['copy','name-writing',3,'name-writing'],['copy','name-copy',2,'name-copy'],['arithmetic','practice',20,'arithmetic']]){
  const input=fixture(family,mode,total),payload=farmLessonStart(input);
  assert.deepEqual(payload,{seat:'990001',roundId:'test-round',mode:lesson,total,expectedTotal:total});
  assert.equal(requestedFarmLesson(family,lesson),mode);
  assert.doesNotMatch(JSON.stringify(payload),/私人答案|測試字/);
 }
 assert.equal(requestedFarmLesson('hanzi','name-copy'),null);
});

test('only confirmed complete receipts count, and corrections never replace first answers',()=>{
 for(const [family,mode,total] of [['hanzi','reading',5],['hanzi','writing',5],['copy','copy',5],['copy','name-writing',3],['copy','name-copy',2],['arithmetic','practice',5]]){
  const input=finish(fixture(family,mode,total),total-1),p=farmLessonCompletion(input);
  assert.equal(p.completed,true);assert.equal(p.kind,'solo');assert.equal(p.expectedTotal,total);
  assert.deepEqual(p.results,Array.from({length:total},(_,i)=>({firstCorrect:i<total-1})));
  assert.doesNotMatch(JSON.stringify(p),/私人答案|測試字|grade|character|stars/);
  input.run.status='started';assert.equal(farmLessonCompletion(input),null);
  input.run.status='submitted';input.run.answers.pop();assert.equal(farmLessonCompletion(input),null);
 }
});

test('hanzi bonus correction questions are required to finish but do not inflate the original score',()=>{
 const input=fixture('hanzi','writing');input.run.snapshot.baseQuestions=structuredClone(input.run.snapshot.questions);
 input.run.snapshot.questions.push({id:'q0.bonus.1'});
 const done=finish(input,3),p=farmLessonCompletion(done);
 assert.equal(p.total,5);assert.deepEqual(p.results.map(r=>r.firstCorrect),[true,true,true,false,false]);
 done.run.answers.pop();assert.equal(farmLessonCompletion(done),null);
});

test('exams, assignments, notebook corrections, unfinished grades and wrong owners never grow crops',()=>{
 for(const patch of [{kind:'exam'},{assignmentId:'assignment'},{taskId:'task'},{examId:'exam'},{seat:'990002'},{status:'pending_review'}]){
  const input=finish(fixture('hanzi','reading'));Object.assign(input.run,patch);assert.equal(farmLessonCompletion(input),null);
 }
 const input=finish(fixture('copy','name-copy',3));
 assert.equal(farmLessonCompletion({...input,excluded:true}),null);
 input.run.result.review=true;assert.equal(farmLessonCompletion(input),null);delete input.run.result.review;
 input.run.answers[0].firstGrade.correct=null;assert.equal(farmLessonCompletion(input),null);
});

test('small taught scopes and full names use actual complete counts; arbitrary partial arithmetic is rejected',()=>{
 for(const count of [1,2,3,4,5])assert.equal(farmLessonStart(fixture('copy','copy',count)).total,count);
 for(const count of [2,3,4,5,6])assert.equal(farmLessonStart(fixture('copy','name-writing',count)).total,count);
 for(const count of [5,10,20])assert.equal(farmLessonStart(fixture('arithmetic','practice',count)).total,count);
 for(const [family,mode,count]of [['hanzi','reading',6],['copy','copy',6],['copy','name-copy',1],['copy','name-writing',7],['arithmetic','practice',1],['arithmetic','practice',7]])assert.equal(farmLessonStart(fixture(family,mode,count)),null);
});

test('duplicate, missing and foreign question IDs cannot masquerade as a full receipt',()=>{
 const input=finish(fixture('hanzi','reading'));
 input.run.answers[1].questionId='q0';assert.equal(farmLessonCompletion(input),null);
 input.run.answers[1].questionId='foreign';assert.equal(farmLessonCompletion(input),null);
 input.run.answers[1].questionId='q1';input.run.result.total=4;assert.equal(farmLessonCompletion(input),null);
 input.run.result.total=5;input.run.snapshot.questions[1].id='q0';assert.equal(farmLessonStart({...input,run:{...input.run,status:'started'}}),null);
});

test('farm-only save retry uses the same receipt and does not submit another learning result',()=>{
 const nodes=new Map(),calls=[];let session={seat:'990001',expires:Date.now()+60000},fail=true;
 const panel={append(n){nodes.set(n.id,n);}};nodes.set('farm-result-notice',panel);
 const sandbox={Date,document:{getElementById:id=>nodes.get(id),createElement:()=>({})},farmLessonStart,farmLessonCompletion,requestedFarmLesson,beginIslandFarmRound:p=>calls.push(['begin',p]),completeIslandFarmRound:p=>{calls.push(['complete',p]);return {status:fail?'storage-error':'qualified'};},mountFarmReturn:()=>{},getIslandFarmContext:()=>null};
 const source=fs.readFileSync(new URL('../farm-lesson-link.js',import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replace(/^export \{requestedFarmLesson\};\r?\n/m,'').replace('export function createFarmLessonLink','function createFarmLessonLink');
 vm.runInNewContext(source+'\nthis.createLink=createFarmLessonLink;',sandbox);
 const link=sandbox.createLink({family:'hanzi',demo:false,getSession:()=>session});
 link.complete(finish(fixture('hanzi','reading')).run);assert.equal(calls.length,1);assert(nodes.get('farm-result-retry'));
 fail=false;nodes.get('farm-result-retry').onclick();assert.equal(calls.length,2);assert.deepEqual(calls[0][1],calls[1][1]);
 session={seat:'990002',expires:Date.now()+60000};nodes.get('farm-result-retry').onclick();assert.equal(calls.length,2);
 session={seat:'990001',expires:1};nodes.get('farm-result-retry').onclick();assert.equal(calls.length,2);
});

test('teacher demos cannot link to a real student farm',()=>{
 let called=false;const sandbox={Date,document:{getElementById:()=>null},farmLessonStart,farmLessonCompletion,requestedFarmLesson,beginIslandFarmRound:()=>{called=true;},completeIslandFarmRound:()=>{called=true;},mountFarmReturn:()=>{},getIslandFarmContext:()=>null};
 const source=fs.readFileSync(new URL('../farm-lesson-link.js',import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replace(/^export \{requestedFarmLesson\};\r?\n/m,'').replace('export function createFarmLessonLink','function createFarmLessonLink');
 vm.runInNewContext(source+'\nthis.createLink=createFarmLessonLink;',sandbox);
 const link=sandbox.createLink({family:'hanzi',demo:true,getSession:()=>({seat:'990001',expires:Date.now()+60000})});
 link.start(fixture('hanzi','reading').run);link.complete(finish(fixture('hanzi','reading')).run);assert.equal(called,false);
});

test('explicit demo farm uses its isolated identity without reading a live session',()=>{
 const calls=[];const sandbox={Date,document:{getElementById:()=>null},farmLessonStart,farmLessonCompletion,requestedFarmLesson,
  beginIslandFarmRound:(p,o)=>calls.push([p,o]),completeIslandFarmRound:(p,o)=>{calls.push([p,o]);return{status:'qualified'};},mountFarmReturn:()=>{},
  getIslandFarmContext:()=>({demo:true,seat:'01',mode:'name-copy',returnUrl:'https://example.test/adventure-preview.html?class=main&demo=1'})};
 const source=fs.readFileSync(new URL('../farm-lesson-link.js',import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replace(/^export \{requestedFarmLesson\};\r?\n/m,'').replace('export function createFarmLessonLink','function createFarmLessonLink');
 vm.runInNewContext(source+'\nthis.createLink=createFarmLessonLink;',sandbox);
 const link=sandbox.createLink({family:'copy',demo:true,getSession:()=>{throw Error('must not read formal login');}});
 link.start(fixture('copy','name-copy',2).run);link.complete(finish(fixture('copy','name-copy',2),2).run);
 assert.equal(calls.length,2);for(const [payload,options]of calls){assert.equal(payload.seat,'01');assert.equal(options.demo,true);}
});
