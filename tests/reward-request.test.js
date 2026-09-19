import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmReward} from '../reward-request.js';
const request={kind:'gacha',seat:'01',roundId:'fixed-recovery-id',category:'animal'};
test('confirmed Cloudflare prize needs no additional query before reveal',async()=>{
 const out=await confirmReward(request,{post:async()=>({saved:true,character:'rabbit',duplicate:true}),query:()=>assert.fail('unnecessary query')});assert.equal(out.character,'rabbit');assert.equal(out.duplicate,true);
});
test('lost response recovers saved prize for original seat and transaction',async()=>{
 const out=await confirmReward(request,{post:async()=>{throw Error('network');},query:async r=>{assert.equal(r,request);return {saved:true,character:'fox'};}});assert.equal(out.character,'fox');
});
test('slow post has bounded wait and queries the same saved transaction',async()=>{
 const out=await confirmReward(request,{post:()=>new Promise(()=>{}),postMs:5,queryMs:5,query:async()=>({saved:true,character:'moon'})});assert.equal(out.character,'moon');
});
test('both stalled calls release UI with uncertainty rather than a new transaction',async()=>{
 await assert.rejects(confirmReward(request,{post:()=>new Promise(()=>{}),query:()=>new Promise(()=>{}),postMs:5,queryMs:5}),/request_timeout/);
});
test('definitive insufficient stars stops without extra query',async()=>{
 await assert.rejects(confirmReward(request,{post:async()=>({error:'insufficient_stars'}),query:()=>assert.fail('unnecessary query')}),e=>e.definitive&&e.message==='insufficient_stars');
});
test('unconfirmed query never invents a character',async()=>{
 await assert.rejects(confirmReward(request,{post:async()=>({saved:false}),query:async()=>({saved:false})}),/unconfirmed/);
});
