import test from 'node:test';import assert from 'node:assert/strict';import {openForestSync,forestSaveKey} from '../adventure-sync.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('uses real balance without trial grant; pending identical operation survives lost reply/reload',async()=>{
 const storage=memory(),key=forestSaveKey('main','115001');let cloud={state:null,revision:0,stars:38,cards:['rabbit'],enabled:true},seen=new Set(),lose=true,ids=[];
 const send=async d=>{if(d.kind==='forest-load')return structuredClone(cloud);ids.push(d.operationId);if(!seen.has(d.operationId)){seen.add(d.operationId);cloud={...cloud,state:d.state,revision:d.revision+1,stars:cloud.stars+d.delta};}if(lose){lose=false;throw Error('network_error');}return structuredClone(cloud);};
 const a=await openForestSync({send,storage,key,fresh:()=>({version:1,stars:12})});assert.equal(a.state.stars,38);a.state.stars-=10;assert.equal(a.save(a.state),true);assert.equal(await a.flush(),false);assert.ok(JSON.parse(storage.getItem(key)).operation);assert.equal(cloud.stars,28);
 const b=await openForestSync({send,storage,key,fresh:()=>({version:1})});assert.equal(b.state.stars,28);assert.equal(ids[0],ids[1]);assert.equal(seen.size,1);assert.notEqual(key,forestSaveKey('grade2','115001'));assert.notEqual(key,forestSaveKey('main','115002'));
});
test('battle answers only persist locally; reload reconciles newly earned learning stars',async()=>{
 const storage=memory(),key=forestSaveKey('main','115001');let calls=0;const send=async d=>{calls++;return {state:null,revision:0,stars:100,enabled:true}};
 const a=await openForestSync({send,storage,key,fresh:()=>({version:1})});a.state.expedition={active:'bud',runs:{bud:{battle:{turn:1}}}};a.save(a.state);a.state.expedition.runs.bud.battle.turn++;a.save(a.state);assert.equal(calls,1);
 const b=await openForestSync({send:async()=>({state:null,revision:0,stars:103,enabled:true}),storage,key,fresh:()=>({version:1})});assert.equal(b.state.stars,103);assert.equal(b.state.expedition.runs.bud.battle.turn,2);
});
