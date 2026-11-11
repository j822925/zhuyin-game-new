import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {optionsFor,isBasicToneQuestion} from '../annual-challenge-core.js';
import {createMemoryStore,createAnnualChallengeService} from '../annual-challenge-service.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const org={role:'organizer',classId:'main',id:'test-organizer'},teacher={role:'teacher',classId:'main',id:'test-teacher',stations:['tone']},child={role:'student',classId:'main',seat:'990001'};
const key='main:2026:official:990001',sandhi=bank.questions.filter(q=>q.enabled&&q.mode==='sandhi').slice(0,3);
const receiptCommand={type:'answer',revision:6,requestId:'legacy-answer-1',answer:sandhi[0].lexicalTones};
const award={score:18,stamp:'tone-rabbit',signature:[[[.1,.1],[.5,.7]]],note:'保留紀錄'};
const legacy=()=>({tone:{station:'tone',revision:7,index:1,tonePolicy:'lexical',preferredStamp:null,award:null,receipts:[{id:receiptCommand.requestId,body:JSON.stringify(receiptCommand)}],rounds:[
 {options:structuredClone(sandhi),selected:0,result:{answer:sandhi[0].lexicalTones,correct:true}},
 {options:structuredClone(sandhi),selected:1,result:null},
 {options:structuredClone(sandhi),selected:null,result:null},
 ...optionsFor(bank,'tone',1,()=>.3)
]},read:{station:'read',revision:4,index:0,rounds:[{options:[{text:'第3課'}],selected:0,result:{lesson:3}}],award:{...award,stamp:'read-cat'},receipts:[]}});
async function fixture(saved=legacy()){
 const memory=createMemoryStore();let writes=0;
 const store={transaction:(key,fn)=>memory.transaction(key,value=>{const result=fn(value);if(result?.value!==undefined)writes++;return result;})};
 const make=(rng=()=>.2,now=()=>1900000000000)=>createAnnualChallengeService({store,bank,rng,now,studentExists:({seat})=>seat==='990001'});
 const service=make();await service.configure(org,2026,{revision:0,enabled:true});if(saved)await store.transaction(key,()=>({value:saved}));
 return {service,make,store,writes:()=>writes,raw:()=>store.transaction(key,value=>({out:value}))};
}
async function tone(service){return (await service.card(org,2026,'990001')).attempts.tone;}
let requestNumber=0;
async function command(service,type,extra={},who=org){const a=await tone(service);return service.command(who,2026,'990001','tone',{type,revision:a?.revision||0,requestId:'basic-request-'+(++requestNumber),...extra});}
async function finish(service){
 for(;;){const a=await tone(service),r=a.rounds[a.index];if(!r.result){if(r.selected===null)await command(service,'select',{option:0});const chosen=(await tone(service)).rounds[a.index];await command(service,'answer',{answer:chosen.options[chosen.selected].lexicalTones},child);}if(a.index===a.rounds.length-1)return;await command(service,'next');}
}

test('all initial counts and legacy callers generate basic-only choices, including a defensive hasSandhi flag',()=>{
 const marked={...bank.questions.find(isBasicToneQuestion),id:'flagged-basic',hasSandhi:true};
 const amended={...bank,questions:[marked,...bank.questions]};
 for(const count of [3,4,5,6,7,8,10])for(const seed of [0,.2,.75,.999]){
  const rounds=optionsFor(amended,'tone',count,()=>seed,{includeSandhi:true});assert.equal(rounds.length,count);
  assert.ok(rounds.every(r=>r.options.length===3&&r.options.every(q=>isBasicToneQuestion(q)&&q.id!==marked.id&&!q.hasSandhi)));
  assert.equal(new Set(rounds.flatMap(r=>r.options.map(q=>q.id))).size,count*3);
 }
});

test('all one-to-five extensions contain no sandhi and preserve the completed rounds',async()=>{
 for(const count of [1,2,3,4,5]){const {service}=await fixture(null);await command(service,'start',{count:3});await finish(service);const before=await tone(service);await command(service,'extend',{count});const after=await tone(service);assert.equal(after.rounds.length,3+count);assert.deepEqual(after.rounds.slice(0,3),before.rounds);assert.ok(after.rounds.slice(3).every(r=>r.options.length===3&&r.options.every(isBasicToneQuestion)));}
});

test('legacy pending projection is stable, identity/time/random independent, and every card read stays read-only',async()=>{
 const original=legacy(),f=await fixture(original),writes=f.writes();
 const first=(await f.service.card(org,2026,'990001')).attempts.tone;
 assert.equal(first.revision,8);assert.equal(first.index,original.tone.index);assert.equal(first.rounds.length,4);
 assert.deepEqual(first.rounds[0],original.tone.rounds[0]);assert.deepEqual(first.rounds[3],original.tone.rounds[3]);
 for(const i of [1,2]){assert.equal(first.rounds[i].selected,null);assert.equal(first.rounds[i].result,null);assert.equal(first.rounds[i].options.length,3);assert.ok(first.rounds[i].options.every(isBasicToneQuestion));}
 assert.deepEqual((await f.service.card(teacher,2026,'990001')).attempts.tone,first);
 assert.deepEqual((await f.make(()=>{throw Error('projection must not use random');},()=>1).card(org,2026,'990001')).attempts.tone,first);
 const childView=(await f.service.card(child,2026)).attempts.tone;assert.equal(childView.revision,8);assert.equal(childView.rounds[1].selected,null);assert.deepEqual(childView.rounds[1].options,[]);
 assert.deepEqual(await f.raw(),original);assert.equal(f.writes(),writes);
 const ids=first.rounds.slice(1).flatMap(r=>r.options.map(q=>q.id));assert.equal(new Set(ids).size,ids.length);
});

test('stale old select and answer are rejected; a projected selection persists atomically and retries only once',async()=>{
 const f=await fixture(),before=await f.raw(),writes=f.writes();
 for(const [who,extra] of [[teacher,{type:'select',option:0}],[child,{type:'answer',answer:sandhi[1].lexicalTones}]])await assert.rejects(f.service.command(who,2026,'990001','tone',{revision:7,requestId:'stale-'+extra.type,...extra}),error=>error.status===409);
 assert.deepEqual(await f.raw(),before);assert.equal(f.writes(),writes);
 const projected=await tone(f.service),select={type:'select',option:1,revision:8,requestId:'projected-select-1'};
 await f.service.command(teacher,2026,'990001','tone',select);const stored=await f.raw();assert.equal(stored.tone.revision,9);assert.equal(stored.tone.rounds[1].selected,1);assert.deepEqual(stored.tone.rounds[1].options,projected.rounds[1].options);assert.deepEqual(stored.tone.rounds[0],before.tone.rounds[0]);assert.deepEqual(stored.read,before.read);
 const afterWrites=f.writes();await f.service.command(teacher,2026,'990001','tone',select);assert.equal(f.writes(),afterWrites);assert.deepEqual(await f.raw(),stored);
 await assert.rejects(f.service.command(teacher,2026,'990001','tone',{...select,option:2}),/重試內容不同/);
 await command(f.service,'answer',{answer:stored.tone.rounds[1].options[1].lexicalTones},child);assert.equal((await tone(f.service)).rounds[1].result.correct,true);
});

test('receipt recovery precedes projection and other-station commands never migrate tone data',async()=>{
 const f=await fixture(),original=await f.raw(),writes=f.writes();await f.service.command(child,2026,'990001','tone',receiptCommand);assert.equal(f.writes(),writes);assert.deepEqual(await f.raw(),original);
 await f.service.command(org,2026,'990001','action',{type:'start',count:1,revision:0,requestId:'unrelated-action-1'});assert.deepEqual((await f.raw()).tone,original.tone);
});

test('awarded and fully answered historical tone work remains byte-for-byte unchanged',async()=>{
 for(const awarded of [false,true]){const saved=legacy();if(awarded)saved.tone.award=award;else for(const round of saved.tone.rounds){round.selected=0;round.result={answer:round.options[0].lexicalTones,correct:true};}
  const f=await fixture(saved),writes=f.writes();assert.deepEqual((await f.service.card(org,2026,'990001')).attempts,saved);assert.deepEqual(await f.raw(),saved);assert.equal(f.writes(),writes);
 }
});
