import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {optionsFor,spellingParts,listeningSummary,LISTEN_POLICY,STATION_LIMITS} from '../annual-challenge-core.js';
import {INITIALS,FINALS,COMBINED} from '../annual-challenge-bank.js';
import {STAMPS,stampsForStation} from '../annual-challenge-stamps.js';
import {createMemoryStore,createAnnualChallengeService} from '../annual-challenge-service.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const org={role:'organizer',classId:'main',id:'qa-teacher'},child={role:'student',classId:'main',seat:'990001'};
const symbols=[...INITIALS,...FINALS,...COMBINED];
const signature=[[[.1,.1],[.5,.4],[.9,.2]]];
let counter=0;
async function setup(){const store=createMemoryStore(),service=createAnnualChallengeService({store,bank,studentExists:({seat})=>seat==='990001',rng:()=>.37});await service.configure(org,2026,{revision:0,enabled:true});return {store,service};}
async function attempt(s,station){return (await s.card(org,2026,'990001')).attempts[station];}
async function command(s,station,type,extra={},who=org){const a=await attempt(s,station);return s.command(who,2026,'990001',station,{type,revision:a?.revision||0,requestId:'flex-request-'+(++counter),...extra});}
async function complete(s,station){
 let a=await attempt(s,station);
 if(station==='listen'){for(let i=0;i<a.rounds.length;i++)if(!a.rounds[i].result)await command(s,station,'listen-rate',{index:i,outcome:'pass'});return;}
 while(true){a=await attempt(s,station);const r=a.rounds[a.index];if(!r.result){
  if(station==='read')await command(s,station,'draw',{},child);
  else {if(r.selected===null)await command(s,station,'select',{option:0});const q=r.options[r.selected??0];await command(s,station,station==='action'?'observe':'answer',station==='action'?{correct:true}:{answer:station==='tone'?q.lexicalTones:spellingParts(q)},station==='action'?org:child);}
 }if(a.index===a.rounds.length-1)return;await command(s,station,'next');}
}
test('new tone/spell initial counts are teacher-selected 3–8; tone is basic-only and spelling retains audio',async()=>{
 for(const station of ['tone','spell'])for(const count of [3,4,5,6,7,8]){const {service:s}=await setup();await command(s,station,'start',{count});const a=await attempt(s,station);assert.equal(a.rounds.length,count);
  if(station==='tone'){assert.equal(a.rounds.filter(r=>r.options.some(q=>q.mode!=='basic'||q.hasSandhi===true)).length,0);assert.ok(a.rounds.every(r=>r.options.length===3));}
  else{assert.ok(a.rounds.every(r=>r.options.every(q=>[...q.text].length<=2&&q.audioUrl)));await command(s,station,'select',{option:1});const shown=(await s.card(child,2026)).attempts.spell.rounds[0].options[0];assert.equal(shown.audioUrl,a.rounds[0].options[1].audioUrl);assert.equal(shown.zhuyin,undefined);}
 }
 for(const station of ['tone','spell']){const {service:s}=await setup();for(const count of [2,9,3.5,'5'])await assert.rejects(command(s,station,'start',{count}),/三至八/);await command(s,station,'start');assert.equal((await attempt(s,station)).rounds.length,5);}
});
test('each station can extend only completed work, with teacher authority and idempotent receipts',async()=>{
 for(const station of ['listen','tone','spell','action','read']){const {service:s}=await setup();await command(s,station,'start',station==='listen'?{symbols:symbols.slice(0,10)}:{count:3});await assert.rejects(command(s,station,'extend',{count:1,...(station==='listen'?{symbols:symbols.slice(10,11)}:{})}),/先完成/);await complete(s,station);
  const extra={count:2,...(station==='listen'?{symbols:symbols.slice(10,12)}:{})};await assert.rejects(command(s,station,'extend',extra,child),/關主/);
  const before=await attempt(s,station),request={type:'extend',revision:before.revision,requestId:'retry-extend-'+station,...extra};await s.command(org,2026,'990001',station,request);await s.command(org,2026,'990001',station,request);const after=await attempt(s,station);assert.equal(after.rounds.length,before.rounds.length+2);assert.equal(after.index,before.rounds.length);assert.deepEqual(after.rounds.slice(0,before.rounds.length),before.rounds);await assert.rejects(s.command(org,2026,'990001',station,{...request,count:3}),/重試內容不同/);
  await complete(s,station);const stamp=stampsForStation(station)[4].id;await command(s,station,'choose-stamp',{stamp},child);assert.equal((await s.card(child,2026)).attempts[station].preferredStamp,stamp);await command(s,station,'award',{award:{score:20,stamp,signature,note:''}});await assert.rejects(command(s,station,'extend',extra),/已完成/);
 }
});
test('extensions stay basic-only and avoid reused choices while unused items remain',async()=>{
 for(const station of ['tone','spell','action']){const {service:s}=await setup();await command(s,station,'start',{count:3});await complete(s,station);await command(s,station,'extend',{count:3});const a=await attempt(s,station),ids=a.rounds.flatMap(r=>r.options.map(q=>q.id));assert.equal(new Set(ids).size,ids.length);if(station==='tone')assert.equal(a.rounds.filter(r=>r.options.some(q=>q.mode!=='basic'||q.hasSandhi===true)).length,0);}
});
test('all caps are enforced, reading exhausts nine unique lessons, and listening can assess all 59 symbols',async()=>{
 assert.equal(symbols.length,59);
 for(const station of ['listen','read','action']){const {service:s}=await setup();await command(s,station,'start',station==='listen'?{symbols:symbols.slice(0,10)}:{count:3});await complete(s,station);
  for(const count of [0,6,1.5])await assert.rejects(command(s,station,'extend',{count}),/一至五/);
  let n=(await attempt(s,station)).rounds.length;
  while(n<STATION_LIMITS[station]){const count=Math.min(5,STATION_LIMITS[station]-n);await command(s,station,'extend',{count,...(station==='listen'?{symbols:symbols.slice(n,n+count)}:{})});await complete(s,station);n+=count;}
  const a=await attempt(s,station);assert.equal(a.rounds.length,STATION_LIMITS[station]);await assert.rejects(command(s,station,'extend',{count:1}),/上限/);
  if(station==='read')assert.equal(new Set(a.rounds.map(r=>r.result.lesson)).size,9);
  if(station==='listen'){assert.equal(new Set(a.rounds.map(r=>r.options[0].text)).size,59);assert.equal(listeningSummary(a).points,20);}
 }
 for(const station of ['tone','spell']){const {service:s,store}=await setup();await store.transaction('main:2026:official:990001',()=>({value:{[station]:{station,index:29,revision:1,rounds:Array.from({length:30},()=>({options:[],selected:null,result:{correct:true}})),receipts:[],award:null}}}));await assert.rejects(command(s,station,'extend',{count:1}),/上限/);}
});
test('listening extensions reject duplicates and scale the complete raw points to a rounded total out of twenty',async()=>{
 const {service:s}=await setup();await command(s,'listen','start',{symbols:symbols.slice(0,10)});await complete(s,'listen');
 for(const extra of [{count:1,symbols:[symbols[0]]},{count:2,symbols:[symbols[10],symbols[10]]},{count:2,symbols:[symbols[10]]}])await assert.rejects(command(s,'listen','extend',extra),/尚未考過|不一致/);
 await command(s,'listen','extend',{symbols:symbols.slice(10,13)});await complete(s,'listen');await command(s,'listen','listen-rate',{index:12,outcome:'hint'});await command(s,'listen','listen-rate',{index:11,outcome:'fail'});
 const a=await attempt(s,'listen');assert.deepEqual(listeningSummary(a),{assessed:13,rawPoints:23,points:18,pass:11,hint:1,fail:1,total:13,remaining:0});
 await assert.rejects(command(s,'listen','award',{award:{score:20,stamp:'listen-owl',signature,note:''}}),/換算/);await command(s,'listen','award',{award:{score:18,stamp:'listen-dolphin',signature,note:''}});
});
test('listening scale rounds consistently before and after extensions, including a half-point boundary',()=>{
 for(const [total,rawPoints,expected] of [[10,15,15],[13,24,18],[13,23,18],[16,20,13],[16,19,12],[59,0,0],[59,118,20]]){
  let remaining=rawPoints;const rounds=Array.from({length:total},()=>{const points=Math.min(2,remaining);remaining-=points;return {result:{outcome:points===2?'pass':points===1?'hint':'fail'}};});
  assert.equal(listeningSummary({listenPolicy:LISTEN_POLICY,rounds}).points,expected,`${rawPoints}/${total*2}`);
 }
});
test('student stamp choices and new teacher awards stay within the five station-specific stamps',async()=>{
 assert.equal(STAMPS.length,25);assert.equal(new Set(STAMPS.map(s=>s.id)).size,25);
 for(const station of ['listen','tone','spell','action','read'])assert.equal(stampsForStation(station).length,5);
 const {service:s}=await setup();await command(s,'read','start');await assert.rejects(command(s,'read','choose-stamp',{stamp:'read-cat'},child),/先完成/);await complete(s,'read');await assert.rejects(command(s,'read','choose-stamp',{stamp:'read-cat'}),/孩子/);await assert.rejects(command(s,'read','choose-stamp',{stamp:'tone-rabbit'},child),/這一關/);await command(s,'read','choose-stamp',{stamp:'read-alpaca'},child);await assert.rejects(command(s,'read','award',{award:{score:20,stamp:'tone-rabbit',signature,note:''}}),/這一關/);await command(s,'read','award',{award:{score:20,stamp:'read-lion',signature,note:''}});assert.equal((await attempt(s,'read')).preferredStamp,'read-alpaca');assert.equal((await attempt(s,'read')).award.stamp,'read-lion');
});
test('legacy ten-round work and historical cross-station stamps remain readable without rewriting',async()=>{
 const {service:s,store}=await setup();const rounds=optionsFor(bank,'tone',10,()=>.2),saved={score:13,stamp:'tone-rabbit',signature,note:'舊紀錄'};
 await store.transaction('main:2026:official:990001',()=>({value:{tone:{station:'tone',index:0,revision:1,rounds,award:null,tonePolicy:'lexical',receipts:[]},read:{station:'read',index:0,revision:3,rounds:[{options:[{text:'第1課'}],selected:0,result:{lesson:1}}],award:saved,receipts:[]}}}));
 assert.equal((await attempt(s,'tone')).rounds.length,10);assert.deepEqual((await s.card(child,2026)).attempts.read.award,saved);await complete(s,'tone');await command(s,'tone','award',{award:{score:20,stamp:'tone-chick',signature,note:''}});assert.equal((await attempt(s,'tone')).rounds.length,10);assert.deepEqual((await attempt(s,'read')).award,saved);
});
