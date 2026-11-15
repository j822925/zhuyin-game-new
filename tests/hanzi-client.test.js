import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHanziClient,createHanziDemo,createRoundStore,resultRows,taskState,compactAnswers} from '../hanzi-client.js';
import {splitBopomofo} from '../hanzi-bank.js';
const bank=JSON.parse(fs.readFileSync(new URL('../data/hanzi-curriculum.json',import.meta.url)));
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};

test('authenticated requests keep trusted class and pass server errors to the user',async()=>{
 let captured;const client=createHanziClient({endpoint:'https://example.test',classId:'main',getSession:()=>({token:'a'.repeat(64),expires:Date.now()+10000}),fetchImpl:async(url,options)=>{captured={url,options};return Response.json({code:'untaught_scope',error:'這些課次尚未開放。'},{status:403});}});
 await assert.rejects(client.request('practice-start',{classId:'grade2',requestId:'stable-request'}),e=>e.message==='untaught_scope'&&e.userMessage==='這些課次尚未開放。');
 assert.equal(JSON.parse(captured.options.body).classId,'main');assert.equal(captured.options.headers.Authorization,'Bearer '+'a'.repeat(64));assert.equal(captured.options.credentials,'omit');
});
test('an expired session cannot send a request or fall back to another identity',async()=>{
 let called=false;const client=createHanziClient({endpoint:'https://example.test',classId:'main',getSession:()=>({token:'old',expires:1}),fetchImpl:async()=>{called=true;}});await assert.rejects(client.request('bootstrap'),/authentication_required/);assert.equal(called,false);
});
test('server run and teacher correction determine result rows; missing server grades are rejected',()=>{
 const run={snapshot:{questions:[{id:'one',word:'右手'}]},answers:[{questionId:'one',grade:{correct:false,status:'incorrect'},teacherReview:{correct:true}}],result:{correct:1}};
 assert.equal(resultRows(run)[0].correct,true);assert.equal(resultRows(run)[0].question.word,'右手');assert.throws(()=>resultRows({results:[{correct:true}]}),/invalid_response/);
});
test('tasks distinguish homework completion from submitted exams that can be revisited',()=>{
 assert.equal(taskState({kind:'assignment',requiredRounds:2,completedRounds:1}),'open');assert.equal(taskState({kind:'assignment',requiredRounds:2,completedRounds:2}),'completed');assert.equal(taskState({kind:'exam',attempt:{status:'submitted'}}),'submitted');assert.equal(taskState({kind:'exam',attempt:{status:'started'}}),'started');
});
test('resumable ink is scoped to the original student and storage failures are visible to caller',()=>{
 const storage=memory();let owner='main:115001';const store=createRoundStore({storage,key:'round',getOwner:()=>owner});const strokes=[[{x:.1,y:.2,t:0},{x:.7,y:.2,t:30}]];
 assert.equal(store.save({round:{roundId:'r',questions:[{id:'q'}]},answers:[],strokes}),true);assert.deepEqual(store.read().strokes,strokes);owner='main:115002';assert.equal(store.read(),null);owner='grade2:115001';assert.equal(store.read(),null);
 const denied=createRoundStore({storage:{setItem(){throw Error('quota');}},key:'r',getOwner:()=>owner});assert.equal(denied.save({}),false);
 const absent=createRoundStore({key:'r',getOwner:()=>owner});assert.equal(absent.save({round:{roundId:'r',questions:[{id:'q'}]},answers:[],strokes}),false);assert.deepEqual(absent.read().strokes,strokes);absent.clear();assert.equal(absent.read(),null);
});
test('demo picks unique learned targets, stores authoritative-shaped receipt, and deduplicates submission',async()=>{
 const demo=createHanziDemo({bank,storage:memory(),key:'demo',gradeWriting:()=>({status:'correct',correct:true})});const started=await demo.request('practice-start',{mode:'reading',lessonIds:['1'],termId:bank.semesterId,count:10,requestId:'stable-start'});assert.equal(started.questions.length,9);assert.equal(new Set(started.questions.map(q=>q.itemId)).size,9);assert.ok(started.questions.every(q=>q.lessonId==='1'));
 const answers=started.questions.map(q=>({questionId:q.id,answer:splitBopomofo(q.bopomofo)}));const result=await demo.request('practice-submit',{roundId:started.roundId,answers});assert.equal(result.run.result.correct,9);assert.equal(resultRows(result.run).length,9);assert.deepEqual(await demo.request('practice-submit',{roundId:started.roundId,answers}),result);
});
test('card-draw uses the real route and carries a stable claim identifier',async()=>{
 let capture;const client=createHanziClient({endpoint:'https://example.test',classId:'main',getSession:()=>({token:'a'.repeat(64),expires:Date.now()+10000}),fetchImpl:async(url,opts)=>{capture={url:String(url),body:JSON.parse(opts.body)};return Response.json({saved:true,character:'star-01-bo'});}});
 const result=await client.request('card-draw',{runId:'run-1',requestId:'hanzi-card-run-1'});assert.equal(capture.url,'https://example.test/hanzi/card-draw');assert.equal(capture.body.runId,'run-1');assert.equal(result.character,'star-01-bo');
});
test('the maximum ten-character handwriting round fits the API limit without changing local ink',()=>{
 const answers=Array.from({length:10},(_,i)=>({questionId:'question-'+i,answer:{strokes:[Array.from({length:2000},()=>({x:.123456789012345,y:.987654321098765,t:86399999.9999,pressure:.87654321}))],inputInterrupted:false}}));
 const serialized=compactAnswers(answers);assert.ok(new TextEncoder().encode(JSON.stringify({classId:'main',roundId:'r',requestId:'r',answers:serialized})).length<1024*1024);assert.equal(answers[0].answer.strokes[0][0].x,.123456789012345);assert.ok(Math.abs(serialized[0].answer.strokes[0][0].x-answers[0].answer.strokes[0][0].x)<.000001);
});
