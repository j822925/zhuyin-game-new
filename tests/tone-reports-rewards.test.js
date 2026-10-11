import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createToneRecorder} from '../tone-record-client.js';
test('tone UI reports without skipping, uses authoritative saved award, compact entry',()=>{
 const html=readFileSync(new URL('../tone.html',import.meta.url),'utf8'),js=readFileSync(new URL('../tone.js',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="skip"|id="hint"|本關不發星星|新關卡開放練習|每個字，都有自己的聲音表情/);
 assert.match(html,/id="report"/);assert.match(html,/entry-actions/);assert.match(js,/rewardRule:REWARD_RULE/);
 const report=js.slice(js.indexOf("$('report').onclick"),js.indexOf("$('browse').onclick"));assert.doesNotMatch(report,/advance\(|results\.push|skipped:true/);assert.match(report,/if\(demo\)/);
});
test('saved award callback only after successful retry, same round ID and no success explanation',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},status=[],awards=[],sent=[];let fail=true;
 const recorder=createToneRecorder({storage,key:()=> 'fixture',status:(s,retry)=>status.push([s,retry]),onSaved:(p,out)=>awards.push([p.roundId,out.stars]),send:async p=>{sent.push(p);if(fail)throw Error('network');return {saved:true,stars:2,taskCounted:true};}});
 const p={roundId:'same-round',rewardRule:'tone-stars-20261011-v1',results:[{id:'T0001',answers:[1,1]}]};recorder.enqueue(p);await recorder.flush();assert.equal(awards.length,0);assert.equal(map.size,1);fail=false;await recorder.flush();assert.deepEqual(awards,[['same-round',2]]);assert.equal(sent[0].roundId,sent[1].roundId);assert.equal(map.size,0);assert.deepEqual(status.at(-1),['',false]);await recorder.flush();assert.equal(awards.length,1);
 const demo=createToneRecorder({demo:true,storage,key:()=> 'demo',status:()=>{},send:()=>{throw Error('no demo writes');},onSaved:()=>{throw Error('no demo award');}});demo.enqueue(p);await demo.flush();assert.equal(map.size,0);
});
