import test from 'node:test';import assert from 'node:assert/strict';
import {createQuestionLoader} from '../adventure-question-loader.js';
test('coalesces downloads, caches success; malformed and HTTP errors may retry',async()=>{
 let calls=0;const load=createQuestionLoader('bank',x=>x.value,{fetchImpl:async()=>{calls++;return {ok:calls>1,json:async()=>({value:42})};}});
 await assert.rejects(load());assert.equal(await load(),42);assert.equal(await load(),42);assert.equal(calls,2);
 let finish;const other=createQuestionLoader('other',x=>x,{fetchImpl:()=>new Promise(r=>finish=r)});const a=other(),b=other();assert.equal(a,b);finish({ok:true,json:async()=>[1]});assert.deepEqual(await b,[1]);
});
test('times out even when fetch ignores abort; late result cannot poison next attempt',async()=>{
 let calls=0,finish,signal;const load=createQuestionLoader('bank',x=>x,{timeoutMs:20,fetchImpl:async(_url,options)=>{signal=options.signal;if(++calls===1)return new Promise(r=>finish=r);return {ok:true,json:async()=>['new']};}});
 await assert.rejects(load(),/question_timeout/);assert(signal.aborted);assert.deepEqual(await load(),['new']);finish({ok:true,json:async()=>['old']});await Promise.resolve();assert.deepEqual(await load(),['new']);assert.equal(calls,2);
});
