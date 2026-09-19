import test from 'node:test';
import assert from 'node:assert/strict';
import {playToEnd,createExamReview} from '../exam-review.js';
class AudioFake extends EventTarget{play(){this.plays=(this.plays||0)+1;return Promise.resolve();}pause(){this.pauses=(this.pauses||0)+1;}}
const tick=()=>new Promise(r=>setTimeout(r,0));
test('play promise does not count as hearing: only ended resolves; timeout releases waiting',async()=>{
 const a=new AudioFake();let completed=false;const p=playToEnd(a,{timeoutMs:100}).then(()=>completed=true);await tick();assert.equal(completed,false);a.dispatchEvent(new Event('ended'));await p;assert.equal(completed,true);
 await assert.rejects(playToEnd(a,{timeoutMs:5}),/audio_failed/);
});
test('review requires two ended events, retry preserves completed count, cannot double start',async()=>{
 const a=new AudioFake(),button={},status={};let advanced=0;
 const ui=createExamReview({audio:a,button,status,onDone:async()=>{advanced++;}});ui.show({index:0,audio:'local.wav'});
 button.onclick();assert.equal(a.plays,1);a.dispatchEvent(new Event('ended'));await tick();assert.equal(a.plays,2);assert.equal(advanced,0);
 a.dispatchEvent(new Event('error'));await tick();assert.equal(button.disabled,false);assert.match(button.textContent,/第 2 遍/);
 button.onclick();assert.equal(a.plays,3);a.dispatchEvent(new Event('ended'));await tick();assert.equal(advanced,1);ui.stop();
});
test('autoplay rejection keeps review locked; abort never advances',async()=>{
 const a=new AudioFake();a.play=()=>Promise.reject(Error('NotAllowedError'));const button={},status={};let advanced=0;const ui=createExamReview({audio:a,button,status,onDone:()=>advanced++});ui.show({index:1,audio:'local.wav'});await tick();assert.equal(advanced,0);assert.equal(button.disabled,false);assert.match(status.textContent,/沒有播完/);ui.stop();
 const b=new AudioFake(),controller=new AbortController();const p=playToEnd(b,{signal:controller.signal});controller.abort();await assert.rejects(p,/cancelled/);
});
