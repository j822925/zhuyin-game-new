import test from 'node:test';
import assert from 'node:assert/strict';
import {ANNUAL_API_ORIGIN,productionContext,createAnnualTransport,annualQuestionKey,annualScopeKey,createStationPoller,annualRequestData,annualTimeout} from '../annual-challenge-production.js';

test('only the existing Worker admin path selects teacher authentication',()=>{
 assert.equal(productionContext({href:ANNUAL_API_ORIGIN+'/admin/annual/annual-challenge.html?class=main'}).teacher,true);
 assert.equal(productionContext({href:'https://j822925.github.io/zhuyin-game-new/annual-challenge.html?role=organizer'}).teacher,false);
 assert.equal(productionContext({href:ANNUAL_API_ORIGIN+'/annual-challenge.html?role=organizer'}).teacher,false);
});
test('student requests keep bearer credentials out of the URL and cannot choose a class or admin action',async()=>{
 const calls=[],send=createAnnualTransport({context:{origin:ANNUAL_API_ORIGIN,teacher:false,classId:'main'},getToken:()=>Promise.resolve('test-secret'),fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({ok:true})};}});
 await send('command',{classId:'grade2',seat:'990001',year:2026,type:'answer'});
 assert.equal(calls[0].url,ANNUAL_API_ORIGIN+'/annual/api/command');assert.equal(calls[0].options.headers.Authorization,'Bearer test-secret');
 assert.equal(JSON.parse(calls[0].options.body).classId,'main');assert.equal(calls[0].options.credentials,'omit');assert.doesNotMatch(calls[0].url,/test-secret|990001/);
 await assert.rejects(send('config',{}),/關主/);await assert.rejects(send('unlock',{}),/找不到/);assert.equal(calls.length,1);
});
test('teacher requests use the admin route and permission rejection retains its status',async()=>{
 let called='';const send=createAnnualTransport({context:{origin:ANNUAL_API_ORIGIN,teacher:true,classId:'main'},getToken:async()=> 'test-secret',fetchImpl:async(url)=>{called=url;return {ok:false,status:403,json:async()=>({error:'teacher_forbidden'})};}});
 await assert.rejects(send('session',{year:2026}),error=>error.status===403&&/關主權限/.test(error.message));assert.equal(called,ANNUAL_API_ORIGIN+'/admin/annual/api/session');
});
test('configuration uses the private patch envelope and excludes fixed curriculum fields',()=>{
 assert.deepEqual(annualRequestData('config',{year:2026,revision:4,enabled:true,mode:'rehearsal',startsAt:null,endsAt:null,actionCount:3,listenCount:10,spellCount:10,tonePolicy:'lexical',role:'organizer'}),{year:2026,patch:{revision:4,enabled:true,mode:'rehearsal',startsAt:null,endsAt:null,actionCount:3}});
});
test('a stalled startup promise has a finite timeout and cancels its underlying request',async()=>{
 let aborted=false;await assert.rejects(annualTimeout(new Promise(()=>{}),5,'登入準備逾時',()=>{aborted=true;}),/登入準備逾時/);assert.equal(aborted,true);
 assert.equal(await annualTimeout(Promise.resolve('ready'),100,'timeout'),'ready');
});
test('token refresh timeout never sends a mutation and remains an uncertain retry rather than a 4xx rejection',async()=>{
 let calls=0,resolveToken;const token=new Promise(resolve=>resolveToken=resolve);
 const send=createAnnualTransport({context:{origin:ANNUAL_API_ORIGIN,teacher:true,classId:'main'},getToken:()=>token,tokenTimeoutMs:5,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({ok:true})};}});
 await assert.rejects(send('command',{requestId:'original-request',type:'award'}),error=>/登入確認逾時/.test(error.message)&&error.status===undefined);
 resolveToken('late-test-token');await Promise.resolve();assert.equal(calls,0);
});
const card=()=>({event:{classId:'main',year:2026},mode:'rehearsal',rehearsalRound:1,seat:'990001',attempts:{spell:{index:0,rounds:[{selected:0,options:[{text:'蜂蜜'}],result:null},{selected:0,options:[{text:'蝴蝶'}],result:null}]}}});
test('draft identity changes for equal-length questions, new rehearsals, students and answer states',()=>{
 const initial=card(),key=annualQuestionKey(initial,'spell');assert.equal(key,annualQuestionKey(structuredClone(initial),'spell'));
 for(const change of [c=>c.attempts.spell.index=1,c=>c.rehearsalRound=2,c=>c.seat='990002',c=>c.attempts.spell.rounds[0].result={answered:true},c=>c.mode='official']){const next=structuredClone(initial);change(next);assert.notEqual(key,annualQuestionKey(next,'spell'));}
 const next=card();next.rehearsalRound=2;assert.notEqual(annualScopeKey(initial),annualScopeKey(next));
});
test('polling skips inactive pages, never overlaps reads and stops after logout',async()=>{
 let active=false,reads=0,finish;const timers=new Map();let sequence=0;
 const poller=createStationPoller({eligible:()=>active,read:async()=>{reads++;await new Promise(resolve=>finish=resolve);},setTimer:(fn,delay)=>{timers.set(++sequence,{fn,delay});return sequence;},clearTimer:id=>timers.delete(id)});
 const run=async()=>{const [id,{fn}]=timers.entries().next().value;timers.delete(id);return fn();};
 poller.start();await run();assert.equal(reads,0);active=true;const waiting=run();assert.equal(reads,1);poller.wake();assert.equal(timers.size,0);finish();await waiting;assert.equal(timers.size,1);
 poller.stop();assert.equal(timers.size,0);poller.wake();assert.equal(timers.size,0);
});
test('poll failures back off and a successful retry returns to three seconds',async()=>{
 const timers=new Map();let sequence=0,fail=true,errors=0;
 const poller=createStationPoller({eligible:()=>true,read:async()=>{if(fail)throw Error('offline');},onError:()=>errors++,setTimer:(fn,delay)=>{timers.set(++sequence,{fn,delay});return sequence;},clearTimer:id=>timers.delete(id)});
 const run=async()=>{const [id,{fn}]=timers.entries().next().value;timers.delete(id);await fn();};
 poller.start();await run();assert.equal(timers.values().next().value.delay,6000);await run();assert.equal(timers.values().next().value.delay,12000);fail=false;await run();assert.equal(timers.values().next().value.delay,3000);assert.equal(errors,2);poller.stop();
});
