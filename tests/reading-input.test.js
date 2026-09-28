import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadingSpeech,supportsReadingAudioTrack} from '../reading-speech.js';

const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
function harness({native=false,reject,late=false,continuous=false,finalGraceMs=0,stopDelayMs=0}={}){
 const requests=[],instances=[],errors=[],diagnostics=[],results=[],inputs=[],states=[],timers=new Map();let id=0,resolve;
 const track={kind:'audio',readyState:'live',label:'Microphone Array',stops:0,stop(){this.stops++;this.readyState='ended';}};
 const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
 class Recognition{
  constructor(){instances.push(this);this.calls=[];}
  start(...args){this.calls.push(args);}
  stop(){this.stopped=true;}
  abort(){this.aborted=true;}
 }
 const speech=createReadingSpeech({Recognition,continuous,finalGraceMs,stopDelayMs,
  getAudioStream:native?undefined:device=>{requests.push(device);return late?new Promise(r=>resolve=r):reject?Promise.reject(reject):Promise.resolve(stream);},
  onState:x=>states.push(x),onInput:x=>inputs.push(x),onError:(x,d)=>{errors.push(x);diagnostics.push(d);},onResult:x=>results.push(x),
  setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:id=>timers.delete(id)});
 return {speech,track,stream,instances,requests,errors,diagnostics,results,inputs,states,timers,resolve:()=>resolve(stream)};
}

const transcript=(r,text,isFinal=true)=>r.onresult({results:[Object.assign([{transcript:text}],{isFinal})]});

test('native send keeps a short audio tail and cancelling it cannot stop the next question',()=>{
 const h=harness({native:true,continuous:true,stopDelayMs:350});h.speech.start();let r=h.instances.at(-1);r.onaudiostart();h.speech.release();
 assert.equal(r.stopped,undefined);assert.equal(h.states.at(-1),'processing');[...h.timers.values()].at(-1)();assert.equal(r.stopped,true);
 transcript(r,'蘋果');r.onend();assert.deepEqual(h.results,['蘋果']);assert.equal(h.timers.size,0);
 h.speech.start();r=h.instances.at(-1);r.onaudiostart();h.speech.release();const oldStop=[...h.timers.values()].at(-1);
 h.speech.cancel();assert.equal(h.timers.size,0);h.speech.start();oldStop();assert.equal(r.stopped,undefined);assert.equal(h.instances.at(-1).stopped,undefined);h.speech.cancel();
});

test('five native questions retain a delayed third final, allow an ungraded retry, and ignore old callbacks',()=>{
 const h=harness({native:true,continuous:true,finalGraceMs:1200});
 for(const [i,word] of ['蘋果','白雲','小朋友','火車','小白兔'].entries()){
  assert.equal(h.speech.start(),true);let r=h.instances.at(-1);
  assert.equal(r.continuous,true);r.onstart();r.onaudiostart();transcript(r,word,false);
  h.speech.release();assert.ok(r.stopped);
  if(i===2){r.onend();assert.equal(h.speech.busy,true);assert.equal(h.speech.start(),false);assert.equal(h.states.at(-1),'processing');transcript(r,word);}
  else if(i===3){
   r.onend();[...h.timers.values()][0]();assert.equal(h.results.length,3);assert.equal(h.errors.at(-1),'no-result');
   assert.deepEqual(h.diagnostics.at(-1),{capturing:true,stopRequested:true,resultEvents:1,hadInterim:true});
   const old=r;assert.equal(h.speech.start(),true);r=h.instances.at(-1);r.onaudiostart();transcript(old,'錯誤舊答案');old.onend();
   h.speech.release();transcript(r,word);r.onend();
  }else {transcript(r,word);if(i===4)r.onerror({error:'aborted'});else r.onend();}
  r.onend();assert.equal(h.speech.busy,false);assert.equal(h.timers.size,0);assert.equal(h.results.length,i+1);
 }
 assert.deepEqual(h.results,['蘋果','白雲','小朋友','火車','小白兔']);assert.deepEqual(h.errors,['no-result']);
});

test('final results are retained across interim-only updates but cancellation never grades them',()=>{
 const h=harness({native:true});h.speech.start();let r=h.instances[0];r.onaudiostart();transcript(r,'蘋果');r.onresult({results:[]});r.onend();assert.deepEqual(h.results,['蘋果']);
 h.speech.start();r=h.instances[1];r.onaudiostart();transcript(r,'白雲');h.speech.cancel();r.onend();assert.deepEqual(h.results,['蘋果']);
});

test('leaving during the native final-result grace period releases the run without grading late text',()=>{
 const h=harness({native:true,continuous:true,finalGraceMs:1200});h.speech.start();const r=h.instances[0];r.onaudiostart();r.onspeechstart();r.onend();
 assert.equal(h.timers.size,1);h.speech.cancel();transcript(r,'蘋果');r.onend();
 assert.equal(h.timers.size,0);assert.equal(h.speech.busy,false);assert.deepEqual(h.results,[]);assert.deepEqual(h.errors,[]);
});
test('explicit audio-track path is restricted to supported desktop engines',()=>{
 assert.equal(supportsReadingAudioTrack({userAgent:'Chrome/135.0.0.0',platform:'Win32'}),true);
 for(const env of [{userAgent:'Chrome/134.0'}, {userAgent:'Android Chrome/150.0'}, {userAgent:'iPad Version/26 Safari/605.1'}, {userAgent:'Macintosh Version/26 Safari/605.1',platform:'MacIntel',maxTouchPoints:5}, {userAgent:'iPhone CriOS/150.0'}, {}])assert.equal(supportsReadingAudioTrack(env),false);
});
test('reading receives the exact selected microphone track and releases it only after recognition ends',async()=>{
 const h=harness();h.speech.start({deviceId:'physical'});await flush();const r=h.instances[0];
 assert.deepEqual(h.requests,['physical']);assert.equal(r.calls[0][0],h.track);assert.deepEqual(h.inputs,['Microphone Array']);assert.equal(r.continuous,false);
 r.onstart();h.speech.release();assert.ok(r.stopped);assert.equal(h.track.stops,0);
 r.onresult({results:[Object.assign([{transcript:'蘋果'}],{isFinal:true})]});r.onend();
 assert.deepEqual(h.results,['蘋果']);assert.equal(h.track.stops,1);assert.equal(h.timers.size,0);
});
test('native Safari path starts synchronously without requesting a competing stream',()=>{
 const h=harness({native:true});h.speech.start();assert.deepEqual(h.instances[0].calls,[[]]);assert.deepEqual(h.requests,[]);h.speech.cancel();
});

test('native service abort before capture is a startup failure, never a graded answer',()=>{
 const h=harness({native:true});h.speech.start();const first=h.instances[0];
 first.onstart();first.onerror({error:'aborted'});first.onend();
 assert.deepEqual(h.errors,['start-aborted']);assert.deepEqual(h.results,[]);
 assert.equal(h.speech.busy,false);assert.equal(h.timers.size,0);
 assert.equal(h.speech.start(),true);const second=h.instances[1];
 first.onend();assert.equal(h.speech.busy,true);
 second.onaudiostart();second.onerror({error:'aborted'});
 assert.deepEqual(h.errors,['start-aborted','aborted']);assert.deepEqual(h.results,[]);
});
test('leaving during permission request stops a late microphone stream without starting recognition',async()=>{
 const h=harness({late:true});h.speech.start();await flush();h.speech.cancel();h.resolve();await flush();
 assert.equal(h.track.stops,1);assert.deepEqual(h.instances[0].calls,[]);assert.deepEqual(h.results,[]);assert.equal(h.timers.size,0);
});
test('cancel before stream acquisition avoids even requesting microphone access',async()=>{
 const h=harness();h.speech.start();h.speech.cancel();await flush();assert.deepEqual(h.requests,[]);
});
test('recognition error and timeout always release the selected microphone',async()=>{
 for(const outcome of ['error','timeout']){
  const h=harness();h.speech.start();await flush();const r=h.instances[0];r.onstart();
  if(outcome==='error')r.onerror({error:'network'});else {h.speech.release();[...h.timers.values()][0]();}
  assert.equal(h.track.stops,1);assert.equal(h.timers.size,0);assert.deepEqual(h.results,[]);assert.equal(h.speech.busy,false);
 }
});
test('unavailable selected device does not silently fall back to a virtual microphone',async()=>{
 const h=harness({reject:{name:'OverconstrainedError'}});h.speech.start({deviceId:'removed'});await flush();
 assert.deepEqual(h.errors,['device-missing']);assert.deepEqual(h.instances[0].calls,[]);assert.equal(h.timers.size,0);
});
