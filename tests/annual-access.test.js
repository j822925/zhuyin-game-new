import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMemoryStore,createAnnualChallengeService} from '../annual-challenge-service.js';
import {active,normalizeEvent} from '../annual-challenge-core.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const org={role:'organizer',classId:'main',id:'qa'},student=seat=>({role:'student',classId:'main',seat});
let n=0;
function setup(legacySeats=null){const store=createMemoryStore();return {store,s:createAnnualChallengeService({store,bank,studentExists:({seat})=>['990001','990002','990003'].includes(seat),now:()=>1000,legacySeats})};}
const command=(type='start',revision=0,mode='rehearsal',extra={})=>({type,revision,mode,requestId:'access-request-'+(++n),...extra});
test('rehearsal and official each have independent availability and allowlists; selecting a mode does not open it',async()=>{
 const {s}=setup();await s.configure(org,2026,{revision:0,mode:'rehearsal',access:{rehearsal:{enabled:true,allStudents:false,seats:['990001']},official:{enabled:false,allStudents:false,seats:['990002']}}});
 assert.deepEqual(await s.availability(student('990001'),2026),{rehearsal:{enabled:true,allowed:true},official:{enabled:false,allowed:false}});
 assert.deepEqual(await s.availability(student('990002'),2026),{rehearsal:{enabled:true,allowed:false},official:{enabled:false,allowed:true}});
 for(const who of [org,student('990002')])await assert.rejects(s.card(who,2026,'990002','rehearsal'),/尚未開放給/);
 await assert.rejects(s.command(org,2026,'990002','read',command()),/尚未開放給/);
 assert.equal((await s.card(student('990002'),2026,undefined,'official')).event.enabled,false);
 await s.configure(org,2026,{revision:1,mode:'official'});assert.equal((await s.config(org,2026)).enabled,false);await s.command(org,2026,'990001','read',command());
 await s.configure(org,2026,{revision:2,enabled:true});await s.command(org,2026,'990002','read',command('start',0,'official'));assert.equal((await s.availability(student('990001'),2026)).rehearsal.enabled,true);
});
test('students never receive access rosters; teacher config can be read without choosing an allowed student',async()=>{
 const {s}=setup();await s.configure(org,2026,{revision:0,access:{rehearsal:{enabled:true,allStudents:false,seats:['990001','990003']},official:{allStudents:false,seats:['990002']}}});
 const config=await s.config(org,2026);assert.deepEqual(config.access.official.seats,['990002']);
 for(const output of [await s.config(student('990001'),2026),await s.card(student('990001'),2026,undefined,'rehearsal'),await s.availability(student('990001'),2026)]){const json=JSON.stringify(output);assert.ok(!json.includes('990003'));assert.ok(!json.includes('990002'));assert.ok(!json.includes('allStudents'));assert.ok(!json.includes('"seats"'));assert.ok(!json.includes('"access"'));}
 await assert.rejects(s.availability(org,2026),/學生/);await assert.rejects(s.card(student('990099'),2026),/找不到/);await assert.rejects(s.availability(student('990099'),2026),/找不到/);
});
test('legacy event access retains only supplied pilot accounts and never changes cards or persists a migration on read',async()=>{
 const {s,store}=setup(['990001','990002']);const legacy={enabled:true,mode:'rehearsal',revision:1,listenCount:10,spellCount:10,actionCount:3};await store.transaction('main:2026:event',()=>({value:legacy}));
 const c=await s.config(org,2026);assert.equal(c.spellCount,4);assert.equal(c.toneCount,4);assert.deepEqual(c.access.rehearsal.seats,['990001','990002']);assert.equal(c.access.rehearsal.allStudents,false);assert.equal(c.access.rehearsal.enabled,true);assert.equal(c.access.official.enabled,false);assert.deepEqual(c.access.official.seats,[]);await assert.rejects(s.card(student('990001'),2026,undefined,'official'),/尚未開放給/);await assert.rejects(s.card(student('990003'),2026),/尚未開放給/);assert.deepEqual(await store.transaction('main:2026:event',v=>({out:v})),legacy);
 assert.equal(normalizeEvent(legacy).access.rehearsal.allStudents,true);
});
test('time windows and revoking access are checked on every command, while allowed closed cards remain readable',async()=>{
 const {s}=setup();await s.configure(org,2026,{revision:0,access:{rehearsal:{enabled:true,allStudents:false,seats:['990001'],startsAt:1000,endsAt:2000}}});await s.command(org,2026,'990001','read',command());
 await s.configure(org,2026,{revision:1,access:{rehearsal:{endsAt:1000,startsAt:null}}});assert.equal((await s.availability(student('990001'),2026)).rehearsal.enabled,false);await assert.rejects(s.command(student('990001'),2026,'990001','read',command('draw',1)),/預演尚未開放/);assert.ok((await s.card(student('990001'),2026,undefined,'rehearsal')).attempts.read);
 await s.configure(org,2026,{revision:2,access:{rehearsal:{endsAt:null,seats:[]}}});await assert.rejects(s.card(student('990001'),2026,undefined,'rehearsal'),/尚未開放給/);await assert.rejects(s.command(org,2026,'990001','read',command('award',1)),/尚未開放給/);assert.equal(active({enabled:true,endsAt:0},1000),false);
});
test('reset uses rehearsal access even while official is selected; old signatures cannot enter new round',async()=>{
 const {s}=setup();await s.configure(org,2026,{revision:0,mode:'official',access:{rehearsal:{enabled:true},official:{enabled:true}}});await s.command(org,2026,'990001','read',command());await s.command(org,2026,'990001','read',command('start',0,'official'));
 const old=command('draw',1,'rehearsal',{rehearsalRound:1});await s.resetRehearsal(org,2026,{revision:1,requestId:'reset-access-123'});await assert.rejects(s.command(student('990001'),2026,'990001','read',old),/已重置/);assert.deepEqual((await s.card(student('990001'),2026,undefined,'rehearsal')).attempts,{});assert.ok((await s.card(student('990001'),2026,undefined,'official')).attempts.read);assert.ok((await s.card(org,2026,'990001','rehearsal',1)).attempts.read);
});
test('malformed access updates fail without opening another mode or dropping the previous list',async()=>{
 const {s}=setup(['990001']);for(const access of [[],{unknown:{}},{rehearsal:[]},{rehearsal:{enabled:1}},{rehearsal:{allStudents:'true'}},{rehearsal:{seats:['990001','990001']}},{rehearsal:{seats:['1']}},{rehearsal:{startsAt:10,endsAt:5}}])await assert.rejects(s.configure(org,2026,{revision:0,access}),/開放名單或時間/);
 const c=await s.config(org,2026);assert.equal(c.revision,0);assert.equal(c.access.official.enabled,false);assert.deepEqual(c.access.rehearsal.seats,[]);assert.deepEqual(c.access.official.seats,[]);
});
