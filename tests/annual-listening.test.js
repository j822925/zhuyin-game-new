import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {INITIALS,FINALS,COMBINED} from '../annual-challenge-bank.js';
import {LISTEN_POLICY,makeListeningRounds,listeningSummary,optionsFor} from '../annual-challenge-core.js';
import {createAnnualChallengeService,createMemoryStore} from '../annual-challenge-service.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const teacher={role:'teacher',id:'listen-teacher',stations:['listen'],classId:'main'},org={role:'organizer',id:'org',classId:'main'},child={role:'student',seat:'990001',classId:'main'};
const symbols=['ㄅ','ㄆ','ㄇ','ㄈ','ㄚ','ㄛ','ㄜ','ㄧㄚ','ㄨㄛ','ㄩㄝ'];
const award={score:15,stamp:'listen-owl',signature:[[[.1,.1],[.3,.5]]],note:''};
let number=0;const payload=(type,revision,extra={})=>({type,revision,requestId:'listen-test-'+(++number),...extra});
async function setup(store=createMemoryStore()){const s=createAnnualChallengeService({bank,store,studentExists:({seat})=>['990001','990002'].includes(seat)});await s.configure(org,2026,{revision:0,enabled:true});return s;}
test('teacher can choose any ten distinct symbols from all three existing groups, preserving order',()=>{
 const rounds=makeListeningRounds(symbols);assert.deepEqual(rounds.map(r=>r.options[0].text),symbols);assert.equal(INITIALS.length+FINALS.length+COMBINED.length,59);
 assert.equal(makeListeningRounds(INITIALS.slice(0,10)).length,10);
 for(const value of [null,[],symbols.slice(0,9),[...symbols,'ㄐ'],[...symbols.slice(0,9),'ㄅ'],[...symbols.slice(0,9),'ㄅˇ']])assert.throws(()=>makeListeningRounds(value),/十個不同/);
});
test('start requires the actual ten chosen symbols and unauthorized users cannot plan or rate',async()=>{
 const s=await setup();await assert.rejects(s.command(teacher,2026,'990001','listen',payload('start',0)),/十個不同/);
 await assert.rejects(s.command(child,2026,'990001','listen',payload('start',0,{symbols})),/關主/);
 await s.command(teacher,2026,'990001','listen',payload('start',0,{symbols}));
 await assert.rejects(s.command(child,2026,'990001','listen',payload('listen-rate',1,{index:0,outcome:'pass'})),/關主/);
 await assert.rejects(s.command({...teacher,stations:['tone']},2026,'990001','listen',payload('listen-rate',1,{index:0,outcome:'pass'})),/負責/);
 const card=await s.card(child,2026);assert.equal(card.attempts.listen.receipts,undefined);assert.ok(card.attempts.listen.rounds.every(r=>r.options.length===0));
});
test('2/1/0 results sum to twenty at most and editing/clearing replaces results rather than adding',async()=>{
 const s=await setup();let rev=(await s.command(teacher,2026,'990001','listen',payload('start',0,{symbols}))).revision;
 const rate=async(index,outcome)=>{rev=(await s.command(teacher,2026,'990001','listen',payload('listen-rate',rev,{index,outcome,points:999}))).revision;};
 await rate(3,'pass');await rate(3,'hint');let a=(await s.card(teacher,2026,'990001')).attempts.listen;assert.equal(listeningSummary(a).points,1);assert.equal(a.rounds[3].result.points,1);
 await rate(3,'fail');assert.equal(listeningSummary((await s.card(teacher,2026,'990001')).attempts.listen).assessed,1);await rate(3,null);assert.equal(listeningSummary((await s.card(teacher,2026,'990001')).attempts.listen).assessed,0);
 for(let i=0;i<10;i++)await rate(i,i<6?'pass':i<9?'hint':'fail');
 a=(await s.card(teacher,2026,'990001')).attempts.listen;assert.deepEqual(listeningSummary(a),{assessed:10,points:15,pass:6,hint:3,fail:1,remaining:0});
 await assert.rejects(s.command(teacher,2026,'990001','listen',payload('award',rev,{award:{...award,score:20}})),/加總/);
 const save=payload('award',rev,{award});await s.command(teacher,2026,'990001','listen',save);await s.command(teacher,2026,'990001','listen',save);
 assert.equal((await s.card(child,2026)).attempts.listen.award.score,15);
 await assert.rejects(s.command(teacher,2026,'990001','listen',payload('listen-rate',rev+1,{index:0,outcome:'fail'})),/完成/);
 assert.deepEqual((await s.card(child,2026,undefined,'rehearsal')).attempts,{});
});
test('unrated is distinct from zero; incomplete, invalid and stale updates cannot become a signed score',async()=>{
 const s=await setup();await s.command(teacher,2026,'990001','listen',payload('start',0,{symbols}));
 await assert.rejects(s.command(teacher,2026,'990001','listen',payload('award',1,{award:{...award,score:0}})),/所有題目/);
 for(const value of [{index:10,outcome:'pass'},{index:0,outcome:'unknown'}])await assert.rejects(s.command(teacher,2026,'990001','listen',payload('listen-rate',1,value)));
 const update=payload('listen-rate',1,{index:0,outcome:'fail'});await s.command(teacher,2026,'990001','listen',update);await s.command(teacher,2026,'990001','listen',update);
 const a=(await s.card(teacher,2026,'990001')).attempts.listen;assert.equal(a.revision,2);assert.equal(listeningSummary(a).remaining,9);
 await assert.rejects(s.command(teacher,2026,'990001','listen',payload('listen-rate',1,{index:1,outcome:'hint'})),/已更新/);
 await assert.rejects(s.command(teacher,2026,'990001','listen',payload('observe',2,{correct:true})),/二／一／零/);
});
test('plan can be changed before grading; a legacy unfinished attempt is explicitly archived before replacement',async()=>{
 const store=createMemoryStore(),s=await setup(store);const old={station:'listen',revision:4,index:1,rounds:optionsFor(bank,'listen',10),award:null,receipts:[]};old.rounds[0].result={correct:true};
 await store.transaction('main:2026:official:990001',()=>({value:{listen:old}}));
 await s.command(teacher,2026,'990001','listen',payload('listen-replan',4,{symbols}));let a=(await s.card(teacher,2026,'990001')).attempts.listen;
 assert.equal(a.listenPolicy,LISTEN_POLICY);assert.deepEqual(a.previousListen.rounds,old.rounds);assert.equal((await s.card(child,2026)).attempts.listen.previousListen,undefined);
 await s.command(teacher,2026,'990001','listen',payload('listen-replan',5,{symbols:[...symbols].reverse()}));
 assert.deepEqual((await s.card(teacher,2026,'990001')).attempts.listen.previousListen.rounds,old.rounds);
 await s.command(teacher,2026,'990001','listen',payload('listen-rate',6,{index:0,outcome:'pass'}));
 await assert.rejects(s.command(teacher,2026,'990001','listen',payload('listen-replan',7,{symbols})),/不能改選/);
});
