import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAnnualChallengeService,createMemoryStore} from '../annual-challenge-service.js';
import {createBrowserPreview} from '../annual-challenge-browser-preview.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const org={role:'organizer',id:'organizer',classId:'main'},teacher={role:'teacher',id:'read-teacher',stations:['read'],classId:'main'},child={role:'student',seat:'990001',classId:'main'};
const award={score:18,stamp:'read-cat',signature:[[[.1,.2],[.4,.5]]],note:''};let sequence=0;
const cmd=(type,revision,extra={})=>({type,revision,requestId:'rehearsal-test-'+(++sequence),...extra});
function setup(){return createAnnualChallengeService({bank,store:createMemoryStore(),studentExists:({seat})=>['990001','990002'].includes(seat)});}
async function finish(s,seat,mode,rehearsalRound,score){let rev=(await s.command(org,2026,seat,'read',cmd('start',0,{mode,rehearsalRound}))).revision;rev=(await s.command({...child,seat},2026,seat,'read',cmd('draw',rev,{mode,rehearsalRound}))).revision;await s.command(org,2026,seat,'read',cmd('award',rev,{mode,rehearsalRound,award:{...award,score}}));}
test('whole-class reset starts new blank rehearsal cards while preserving old rounds and official scores',async()=>{
 const s=setup();await s.configure(org,2026,{revision:0,enabled:true});await finish(s,'990001','official',null,20);
 await s.configure(org,2026,{revision:1,mode:'rehearsal'});await finish(s,'990001','rehearsal',1,18);await finish(s,'990002','rehearsal',1,16);
 const reset={revision:2,requestId:'reset-class-once'};await s.resetRehearsal(org,2026,reset);await s.resetRehearsal(org,2026,reset);
 for(const seat of ['990001','990002']){const card=await s.card({...child,seat},2026);assert.equal(card.rehearsalRound,2);assert.deepEqual(card.attempts,{});}
 assert.equal((await s.card(child,2026,undefined,'rehearsal',1)).attempts.read.award.score,18);
 assert.equal((await s.card({...child,seat:'990002'},2026,undefined,'rehearsal',1)).attempts.read.award.score,16);
 assert.equal((await s.card(child,2026,undefined,'official')).attempts.read.award.score,20);
 await finish(s,'990001','rehearsal',2,19);await s.resetRehearsal(org,2026,{revision:3,requestId:'reset-class-twice'});
 assert.equal((await s.card(child,2026)).rehearsalRound,3);assert.deepEqual((await s.card(child,2026)).attempts,{});assert.equal((await s.card(child,2026,undefined,'rehearsal',2)).attempts.read.award.score,19);
 assert.equal((await s.config({...org,classId:'grade2'},2026)).rehearsalRound,1);
});
test('stale rehearsal requests and temporary teacher grants cannot write into a new round',async()=>{
 const s=setup();await s.configure(org,2026,{revision:0,enabled:true,mode:'rehearsal'});
 const grant={...teacher,seatScope:'990001',yearScope:2026,modeScope:'rehearsal',rehearsalRoundScope:1};
 await s.command(grant,2026,'990001','read',cmd('start',0,{mode:'rehearsal',rehearsalRound:1}));await s.resetRehearsal(org,2026,{revision:1,requestId:'reset-before-answer'});
 await assert.rejects(s.card(grant,2026,'990001'),/重新開始/);
 await assert.rejects(s.command(child,2026,'990001','read',cmd('draw',1,{mode:'rehearsal',rehearsalRound:1})),/預演已重置/);
 await assert.rejects(s.command(org,2026,'990001','read',cmd('start',0,{mode:'rehearsal'})),/預演已重置/);
 assert.deepEqual((await s.card(child,2026)).attempts,{});await s.command(org,2026,'990001','read',cmd('start',0,{mode:'rehearsal',rehearsalRound:2}));
});
test('only an organizer in an open rehearsal can reset, with revision and retry protection',async()=>{
 const s=setup();await assert.rejects(s.resetRehearsal(child,2026,{revision:0,requestId:'reset-not-teacher'}),/只有活動管理/);await assert.rejects(s.resetRehearsal(teacher,2026,{revision:0,requestId:'reset-not-admin'}),/只有活動管理/);
 await assert.rejects(s.resetRehearsal(org,2026,{revision:0,requestId:'reset-closed-event'}),/先開啟預演/);await s.configure(org,2026,{revision:0,enabled:true});
 await assert.rejects(s.resetRehearsal(org,2026,{revision:1,requestId:'reset-in-official'}),/先開啟預演/);await s.configure(org,2026,{revision:1,mode:'rehearsal'});
 await assert.rejects(s.resetRehearsal(org,2026,{revision:1,requestId:'reset-stale-event'}),/已更新/);
 await s.resetRehearsal(org,2026,{revision:2,requestId:'reset-valid-retry'});await assert.rejects(s.resetRehearsal(org,2026,{revision:1,requestId:'reset-valid-retry'}),/重試內容不同/);assert.equal((await s.config(org,2026)).rehearsalRound,2);
});
test('browser-only reset gateway updates the child and requires the new rehearsal round when unlocking',async()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},api=createBrowserPreview({bank,storage,tabStorage:storage,year:2026,uuid:()=>`local-reset-${++sequence}`});
 const childSession=await api.request('login',null,{role:'student',classId:'main',seat:'990001'}),admin=await api.request('login',null,{role:'organizer',classId:'main'});
 const first=await api.request('card?year=2026&seat=990001',childSession.token);await api.request('reset-rehearsal',admin.token,{year:2026,revision:first.event.revision,requestId:'local-reset-round'});
 assert.equal((await api.request('card?year=2026&seat=990001',childSession.token)).rehearsalRound,2);
 await assert.rejects(api.request('unlock',childSession.token,{year:2026,mode:'rehearsal',station:'read',rehearsalRound:1}),/已重置/);
 const grant=await api.request('unlock',childSession.token,{year:2026,mode:'rehearsal',station:'read',rehearsalRound:2});assert.equal(grant.rehearsalRoundScope,2);
});
