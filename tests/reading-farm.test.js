import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadingFarm} from '../reading-farm.js';
import {readingLaunchPlan} from '../reading-launch.js';
import {freshState} from '../adventure-model.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const round=(correct=5)=>({kind:'round',mode:'reading',seat:'115901',roundId:'test-round-0001',total:5,mistakes:5-correct,results:Array.from({length:5},(_,i)=>({firstCorrect:i<correct}))});
function fixture(cls='main'){
 const state=freshState();state.life.farmUnlocked=true;state.life.learningOwner=JSON.stringify([cls,'live','115901']);
 state.life.plots[0]={crop:'lettuce',plantId:'plant-before-reading',watered:true,ready:false};
 state.futureField={keep:'yes'};
 let remote={enabled:true,state,revision:7,stars:100},failAfter=false,conflict=false;const calls=[],receipts=new Map(),storage=memory();
 const request=async data=>{calls.push(clone(data));assert.equal(data.seat,'115901');
  if(data.kind==='forest-load')return clone(remote);
  assert.equal(data.kind,'forest-save');assert.equal(data.delta,0);
  if(receipts.has(data.operationId)){assert.deepEqual(data,receipts.get(data.operationId));return {...clone(remote),duplicate:true};}
  if(conflict){conflict=false;remote.revision++;remote.state.futureField={keep:'new concurrent change'};return {error:'forest_conflict'};}
  if(data.revision!==remote.revision)return {error:'forest_conflict'};
  receipts.set(data.operationId,clone(data));remote={...remote,state:clone(data.state),revision:remote.revision+1};
  if(failAfter){failAfter=false;throw Error('network_error');}
  return {...clone(remote),saved:true};
 };
 const options={href:'https://game.example/reading.html?class='+cls+'&farmLesson=reading',storage,request};
 return {make:()=>createReadingFarm(options),options,calls,get remote(){return remote;},failOnce(){failAfter=true;},conflictOnce(){conflict=true;}};
}
test('standalone handoff preserves only reading farm intent through Safari and shortcut',()=>{
 for(const cls of ['main','grade2'])for(const major of ['26','16']){
  const env={userAgent:'iPad CPU OS '+major+'_0 Version/'+major,standalone:true};
  const p=readingLaunchPlan('https://game.example/reading.html?class='+cls+'&farmLesson=reading&seat=115901&token=secret&returnUrl=https://evil.test/#secret',env);
  for(const link of [p.browserUrl,p.shortcutUrl,...(p.safariUrl?[p.safariUrl]:[])]){const u=new URL(link);assert.equal(u.searchParams.get('farmLesson'),'reading');assert.equal(u.searchParams.get('class'),cls);assert.equal(u.hash,'');assert.equal(u.searchParams.has('seat'),false);assert.equal(u.searchParams.has('token'),false);assert.equal(u.searchParams.has('returnUrl'),false);}
  assert.equal(new URL(readingLaunchPlan(p.shortcutUrl).browserUrl).searchParams.get('farmLesson'),'reading');
 }
 assert.equal(new URL(readingLaunchPlan('https://game.example/reading.html?farmLesson=evil').browserUrl).searchParams.has('farmLesson'),false);
});
test('fresh Safari storage grows the original cloud lettuce in both classes without changing wallet or unrelated state',async()=>{
 for(const cls of ['main','grade2']){const f=fixture(cls),b=f.make(),p=round();assert.equal(await b.begin(p),true);assert.equal(f.calls.length,1);assert.equal(f.remote.state.life.plots[0].ready,false);
  const out=await b.complete(p,{confirmed:true});assert.equal(out.grown,1);assert.equal(f.remote.state.life.plots[0].ready,true);assert.equal(f.remote.stars,100);assert.deepEqual(f.remote.state.futureField,{keep:'yes'});
  assert.equal(new URL(b.returnUrl).searchParams.get('class'),cls);assert.equal(new URL(b.returnUrl).searchParams.get('returnFarm'),'1');
  const calls=f.calls.length;await b.complete(p,{confirmed:true});assert.equal(f.calls.length,calls);
 }
});
test('unconfirmed or three correct never matures; four correct qualifies',async()=>{
 for(const n of [3,4]){const f=fixture(),b=f.make(),p=round(n);await b.begin(p);assert.equal((await b.complete(p)).status,'pending');assert.equal(f.calls.length,1);const result=await b.complete(p,{confirmed:true});assert.equal(result.grown,n===4?1:0);assert.equal(f.remote.state.life.plots[0].ready,n===4);}
});
test('lost save reply resumes across reload with identical operation and no duplicate growth or star delta',async()=>{
 const f=fixture(),b=f.make(),p=round();await b.begin(p);f.failOnce();await assert.rejects(b.complete(p,{confirmed:true}),/network_error/);
 assert.equal(f.remote.revision,8);const out=await f.make().complete(p,{confirmed:true});assert.equal(out.grown,1);assert.equal(f.remote.revision,8);assert.equal(f.calls.filter(c=>c.kind==='forest-save').length,2);
});
test('concurrent save is reloaded and unrelated changes survive',async()=>{
 const f=fixture(),b=f.make(),p=round();await b.begin(p);f.conflictOnce();assert.equal((await b.complete(p,{confirmed:true})).grown,1);assert.deepEqual(f.remote.state.futureField,{keep:'new concurrent change'});
});
test('old round never grows a replanted crop; other class or student cannot reuse ticket',async()=>{
 const f=fixture(),b=f.make(),p=round();await b.begin(p);f.remote.state.life.plots[0].plantId='new-batch';assert.equal((await b.complete(p,{confirmed:true})).grown,0);assert.equal(f.remote.state.life.plots[0].ready,false);
 const other=createReadingFarm({...f.options,href:'https://game.example/reading.html?class=grade2&farmLesson=reading'});await assert.rejects(other.complete(p,{confirmed:true}),/unlinked/);assert.equal(b.has({...p,seat:'115902'}),false);
});
test('unwatered, other owner and disabled farms cannot start; non-farm/demos do not make cloud requests',async()=>{
 for(const change of [f=>f.remote.state.life.plots[0].watered=false,f=>f.remote.state.life.learningOwner='other',f=>f.remote.enabled=false]){const f=fixture();change(f);await assert.rejects(f.make().begin(round()));}
 for(const href of ['https://game.example/reading.html','https://game.example/reading.html?farmLesson=reading&demo=1']){const f=fixture();assert.equal(await createReadingFarm({...f.options,href}).begin(round()),false);assert.equal(f.calls.length,0);}
});
test('blocked storage prevents starting and missing tickets cannot credit a round retroactively',async()=>{
 const f=fixture(),b=createReadingFarm({...f.options,storage:{getItem:()=>null,setItem:()=>{throw Error('denied');}}});await assert.rejects(b.begin(round()),/farm_storage/);await assert.rejects(b.complete(round(),{confirmed:true}),/farm_unlinked/);assert.equal(f.remote.state.life.plots[0].ready,false);
});
