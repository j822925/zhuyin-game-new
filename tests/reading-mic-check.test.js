import test from 'node:test';
import assert from 'node:assert/strict';
import {createMicCheck,clearMicPlayback} from '../reading-mic-check.js';

test('question cleanup does not touch an unused iPad media session',()=>{
 const calls=[],player={paused:true,hidden:false,hasAttribute:()=>false,pause:()=>calls.push('pause'),load:()=>calls.push('load')};
 clearMicPlayback(player,'');clearMicPlayback(player,'');
 assert.deepEqual(calls,[]);assert.equal(player.hidden,true);
});
test('a recorded playback is stopped and released once, with later cleanup inert',()=>{
 const calls=[];let src='blob:local';
 const player={paused:false,hasAttribute:()=>!!src,pause(){this.paused=true;calls.push('pause');},removeAttribute(){src='';calls.push('remove');},load:()=>calls.push('load')};
 clearMicPlayback(player,'blob:local',url=>calls.push(url));clearMicPlayback(player,'');
 assert.deepEqual(calls,['pause','remove','load','blob:local']);assert.equal(player.hidden,true);
});
function harness({pending=false,error}={}){
 const states=[],clips=[],requests=[],streams=[],timers=new Map(),track={stopped:0,stop(){this.stopped++;}},stream={getTracks:()=>[track]};let id=0,resolve,recorder;
 class Recorder {constructor(){recorder=this;this.state='inactive';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['test'],{type:'audio/webm'})});this.onstop?.();}}
 const media=pending?new Promise(r=>resolve=r):error?Promise.reject(error):Promise.resolve(stream);
 const check=createMicCheck({getUserMedia:constraints=>{requests.push(constraints);return media;},Recorder,onState:s=>states.push(s),onClip:c=>clips.push(c),onStream:s=>streams.push(s),setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:id=>timers.delete(id)});
 return {check,states,clips,requests,streams,timers,track,resolve:()=>resolve(stream),get recorder(){return recorder;}};
}
test('four-second microphone check releases tracks and returns only an in-memory playable clip',async()=>{
 const h=harness();await h.check.start();assert.equal(h.states.at(-1),'recording');[...h.timers.values()][0]();assert.equal(h.states.at(-1),'ready');assert.equal(h.clips.length,1);assert.equal(h.clips[0].type,'audio/webm');assert.ok(h.track.stopped);assert.equal(h.check.busy,false);assert.equal(h.timers.size,0);
});
test('cancel while permission is pending discards late stream and never records',async()=>{
 const h=harness({pending:true}),started=h.check.start();h.check.cancel();h.resolve();await started;assert.equal(h.track.stopped,1);assert.equal(h.recorder,undefined);assert.deepEqual(h.clips,[]);assert.equal(h.timers.size,0);
});
test('cancelled recording cannot produce playback or retain the microphone',async()=>{
 const h=harness();await h.check.start();h.check.cancel();assert.equal(h.check.busy,false);assert.equal(h.recorder.state,'inactive');assert.equal(h.track.stopped,1);assert.deepEqual(h.clips,[]);
});
test('permission denial is a device error, not a failed reading answer',async()=>{
 const h=harness({error:{name:'NotAllowedError'}});await h.check.start();assert.deepEqual(h.states,['permission','denied']);assert.equal(h.check.busy,false);assert.deepEqual(h.clips,[]);assert.equal(h.timers.size,0);
});
test('selected microphone is requested exactly instead of silently recording a virtual default',async()=>{
 const h=harness();await h.check.start({deviceId:'physical-microphone'});assert.deepEqual(h.requests,[{audio:{deviceId:{exact:'physical-microphone'}}}]);assert.equal(h.streams.length,1);h.check.cancel();
});
test('missing selected microphone reports an error without falling back to the default',async()=>{
 const h=harness({error:{name:'OverconstrainedError'}});await h.check.start({deviceId:'disconnected'});assert.deepEqual(h.states,['permission','missing']);assert.equal(h.requests.length,1);assert.deepEqual(h.clips,[]);assert.deepEqual(h.streams,[]);
});
