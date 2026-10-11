import test from 'node:test';import assert from 'node:assert/strict';import {openForestSync,forestSaveKey} from '../adventure-sync.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('uses real balance without trial grant; pending identical operation survives lost reply/reload',async()=>{
 const storage=memory(),key=forestSaveKey('main','115001');let cloud={state:null,revision:0,stars:38,cards:['rabbit'],enabled:true},seen=new Set(),lose=true,ids=[];
 const send=async d=>{if(d.kind==='forest-load')return structuredClone(cloud);ids.push(d.operationId);if(!seen.has(d.operationId)){seen.add(d.operationId);cloud={...cloud,state:d.state,revision:d.revision+1,stars:cloud.stars+d.delta};}if(lose){lose=false;throw Error('network_error');}return structuredClone(cloud);};
 const a=await openForestSync({send,storage,key,fresh:()=>({version:1,stars:12})});assert.equal(a.state.stars,38);a.state.stars-=10;assert.equal(a.save(a.state),true);assert.equal(await a.flush(),false);assert.ok(JSON.parse(storage.getItem(key)).operation);assert.equal(cloud.stars,28);
 const b=await openForestSync({send,storage,key,fresh:()=>({version:1})});assert.equal(b.state.stars,28);assert.equal(ids[0],ids[1]);assert.equal(seen.size,1);assert.notEqual(key,forestSaveKey('grade2','115001'));assert.notEqual(key,forestSaveKey('main','115002'));
});
test('battle answers initially persist locally; reload reconciles newly earned learning stars',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const storage=memory(),key=forestSaveKey('main','115001');let calls=0;const send=async d=>{calls++;return {state:null,revision:0,stars:100,enabled:true}};
 const a=await openForestSync({send,storage,key,fresh:()=>({version:1})});a.state.expedition={active:'bud',runs:{bud:{battle:{turn:1}}}};a.save(a.state);a.state.expedition.runs.bud.battle.turn++;a.save(a.state);assert.equal(calls,1);
 const b=await openForestSync({send:async()=>({state:null,revision:0,stars:103,enabled:true}),storage,key,fresh:()=>({version:1})});assert.equal(b.state.stars,103);assert.equal(b.state.expedition.runs.bud.battle.turn,2);
});
test('ordinary changes batch every minute without debounce starvation or idle requests',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory();let saves=[];
 const a=await openForestSync({storage,key:'test',fresh:()=>({version:1}),send:async d=>{if(d.kind==='forest-save')saves.push(d);return {state:null,revision:saves.length,stars:100,enabled:true};}});
 assert(a.save(a.state));t.mock.timers.tick(60000);await Promise.resolve();assert.equal(saves.length,0);
 a.state.room='one';a.save(a.state);assert.equal(JSON.parse(storage.getItem('test')).state.room,'one');
 t.mock.timers.tick(30000);a.state.room='two';a.save(a.state);t.mock.timers.tick(29999);assert.equal(saves.length,0);
 t.mock.timers.tick(1);await a.flush();assert.equal(saves.length,1);assert.equal(saves[0].state.room,'two');
 t.mock.timers.tick(600000);assert.equal(saves.length,1);
 a.save(a.state);t.mock.timers.tick(60000);assert.equal(saves.length,1);
 a.state.room='three';a.save(a.state);await a.flush();assert.equal(saves.length,2);t.mock.timers.tick(60000);assert.equal(saves.length,2);
});
test('currency change immediately commits the latest local batch; no later duplicate',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let saves=[];const a=await openForestSync({storage:memory(),key:'test',fresh:()=>({version:1}),send:async d=>{if(d.kind==='forest-save')saves.push(d);return {revision:saves.length,stars:d.kind==='forest-save'?90:100,enabled:true};}});
 a.state.room='one';a.save(a.state);t.mock.timers.tick(1000);a.state.stars=90;a.save(a.state);await a.flush();
 assert.equal(saves.length,1);assert.equal(saves[0].delta,-10);assert.equal(saves[0].state.room,'one');t.mock.timers.tick(60000);assert.equal(saves.length,1);
});
test('failed background save keeps recovery operation and does not retry in a loop',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory();let calls=0;const a=await openForestSync({storage,key:'test',fresh:()=>({version:1}),send:async d=>{if(d.kind==='forest-save'){calls++;throw Error('network_error');}return {revision:0,stars:100,enabled:true};}});
 a.state.room='one';a.save(a.state);t.mock.timers.tick(60000);assert.equal(await a.flush(),false);assert.equal(calls,1);assert(JSON.parse(storage.getItem('test')).operation);
 t.mock.timers.tick(600000);assert.equal(calls,1);
});
test('clean reloaded journal causes no exit write; unsent local changes resume one-minute timer',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory();let saves=[];const state={version:1,stars:100,room:'one'};
 const send=async d=>{if(d.kind==='forest-save')saves.push(d);return {state,revision:saves.length+2,stars:100,enabled:true};};
 storage.setItem('test',JSON.stringify({state,revision:2,baseStars:100,dirty:false}));
 const a=await openForestSync({storage,key:'test',send});await a.flush();t.mock.timers.tick(60000);assert.equal(saves.length,0);
 storage.setItem('test',JSON.stringify({state:{...state,room:'two'},revision:2,baseStars:100,dirty:true}));
 const b=await openForestSync({storage,key:'test',send});assert.equal(b.state.room,'two');t.mock.timers.tick(60000);await b.flush();assert.equal(saves.length,1);assert.equal(saves[0].state.room,'two');
});
