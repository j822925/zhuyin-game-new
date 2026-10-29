import test from 'node:test';
import assert from 'node:assert/strict';
import {readSpeechAutoFinish,saveSpeechAutoFinish,speechDiagnostic} from '../reading-speech-mode.js';
test('automatic preference defaults off, persists on this browser and can be reversed',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 assert.equal(readSpeechAutoFinish(storage),false);assert(saveSpeechAutoFinish(true,storage));assert.equal(readSpeechAutoFinish(storage),true);
 assert(saveSpeechAutoFinish(false,storage));assert.equal(readSpeechAutoFinish(storage),false);assert.deepEqual([...data.values()],['off']);
});
test('restricted browser storage never blocks recording mode selection',()=>{
 const storage={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.equal(readSpeechAutoFinish(storage),false);assert.equal(saveSpeechAutoFinish(true,storage),false);
});
test('adult diagnostics distinguish no text from provisional text without exposing it',()=>{
 const text=speechDiagnostic('aborted',{autoFinish:true,capturing:true,stopRequested:false,resultEvents:2,hadInterim:true,transcript:'secret'});
 assert.match(text,/停頓後送出/);assert.match(text,/已按送出：否/);assert.match(text,/文字回報：2次/);assert(!text.includes('secret'));
});
