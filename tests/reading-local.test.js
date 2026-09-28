import test from 'node:test';import assert from 'node:assert/strict';
import {prepareLocalAudio,createLocalRecorder} from '../reading-local-core.js';
test('silence, tiny blips, very short and oversized clips never reach recognition',()=>{
 assert.throws(()=>prepareLocalAudio([new Float32Array(16000)],16000),/silence/);
 const blip=new Float32Array(16000);blip.fill(.5,400,800);assert.throws(()=>prepareLocalAudio([blip],16000),/silence/);
 assert.throws(()=>prepareLocalAudio([new Float32Array(100)],16000),/too-short/);
 assert.throws(()=>prepareLocalAudio([new Float32Array(16000*13)],16000),/too-long/);
});
test('realistic 48k stereo becomes padded 16k mono and non-finite values cannot reach model',()=>{
 const left=Float32Array.from({length:48000},(_,i)=>i>10000&&i<30000?.1*Math.sin(i*.1):0);left[0]=NaN;
 const pcm=prepareLocalAudio([left,left],48000);assert.ok(pcm.length>16000&&pcm.length<24000);assert.ok(pcm.every(Number.isFinite));assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);
});
function harness({pending=false}={}){
 const states=[],clips=[],errors=[],timers=new Map();let resolve,rec,seq=0;const track={stopped:0,stop(){this.stopped++;}},stream={getTracks:()=>[track]};
 class Recorder{static isTypeSupported(t){return t==='audio/mp4';}constructor(s,opts){this.mimeType=opts.mimeType;rec=this;}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['audio'])});this.onstop();}}
 const recording=createLocalRecorder({getUserMedia:()=>pending?new Promise(r=>resolve=r):Promise.resolve(stream),Recorder,onState:s=>states.push(s),onClip:b=>clips.push(b),onError:e=>errors.push(e),setTimer:fn=>{timers.set(++seq,fn);return seq;},clearTimer:id=>timers.delete(id)});
 return {recording,states,clips,errors,track,timers,get rec(){return rec;},resolve:()=>resolve(stream)};
}
test('tap stop emits one clip, releases tracks, and repeated sends do nothing',async()=>{const h=harness();await h.recording.start();h.recording.stop();h.recording.stop();assert.equal(h.clips.length,1);assert.equal(h.clips[0].type,'audio/mp4');assert.equal(h.track.stopped,1);assert.equal(h.timers.size,0);});
test('cancel while permission is pending releases late stream without recording',async()=>{const h=harness({pending:true});const p=h.recording.start();h.recording.cancel();h.resolve();await p;assert.equal(h.track.stopped,1);assert.equal(h.rec,undefined);assert.equal(h.clips.length,0);});
test('cancel drops the previous recording callbacks even after another question starts',async()=>{const h=harness();await h.recording.start();const old=h.rec;h.recording.cancel();await h.recording.start();old.onstop();assert.equal(h.clips.length,0);h.recording.stop();assert.equal(h.clips.length,1);});
test('automatic duration limit stops the microphone and delivers a single clip',async()=>{const h=harness();await h.recording.start();[...h.timers.values()][0]();assert.equal(h.clips.length,1);assert.equal(h.recording.busy,false);assert.equal(h.track.stopped,1);});
test('permission timeout releases a later grant and cannot emit a clip',async()=>{const h=harness({pending:true});const p=h.recording.start();[...h.timers.values()][0]();h.resolve();await p;assert.deepEqual(h.errors,['permission-timeout']);assert.equal(h.clips.length,0);assert.equal(h.track.stopped,1);});
