import test from 'node:test';
import assert from 'node:assert/strict';
import {createForestMusic,MUSIC_TRACKS,MUSIC_FADE_OUT_MS} from '../adventure-music.js';

const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,`${message}: ${actual} != ${expected}`);

// AudioParam mock evaluates scheduled ramps at the AudioContext clock, rather
// than reporting the last scheduled endpoint as the instantaneous volume.
class Param{
 constructor(clock){this.clock=clock;this.base=0;this.events=[];this.order=0;}
 get value(){return this.at(this.clock());}
 set value(value){this.base=value;}
 setValueAtTime(value,time){this.add('set',value,time);return this;}
 linearRampToValueAtTime(value,time){this.add('linear',value,time);return this;}
 cancelScheduledValues(time){this.events=this.events.filter(e=>e.time<time);return this;}
 add(kind,value,time){this.events.push({kind,value,time,order:++this.order});this.events.sort((a,b)=>a.time-b.time||a.order-b.order);}
 at(time){let value=this.base,previousTime=0;for(const e of this.events){if(e.time>time){if(e.kind==='linear'&&e.time>previousTime)return value+(e.value-value)*(time-previousTime)/(e.time-previousTime);break;}value=e.value;previousTime=e.time;}return value;}
}

function fixture(){
 let now=0,id=0,creations=0;const timers=new Map(),nodes=[],srcChanges=[];
 const context={state:'suspended',currentTime:0,destination:{},onstatechange:null,
  createGain(){const node={gain:new Param(()=>context.currentTime),connect(){},disconnect(){}};nodes.push(node);return node;},
  createMediaElementSource(){return {connect(){},disconnect(){}};},
  resume(){this.state='running';return Promise.resolve();},
  close(){this.state='closed';return Promise.resolve();}
 };
 class Media extends EventTarget{
  paused=true;currentTime=0;plays=0;_src='';playOverride=null;
  get src(){return this._src;}
  set src(value){srcChanges.push({src:value,at:now,volume:volume()});this._src=value;this.currentTime=0;}
  play(){this.plays++;if(this.playOverride)return this.playOverride();this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  removeAttribute(name){if(name==='src')this._src='';}
  load(){}
 }
 const audio=new Media();
 function volume(){return nodes.reduce((value,node)=>value*node.gain.value,1);}
 const music=createForestMusic({makeAudio:()=>{creations++;return audio;},makeContext:()=>context,
  schedule(fn,ms){const key=++id;timers.set(key,{at:now+ms,fn});return key;},cancel(key){timers.delete(key);}
 });
 function move(next){if(context.state==='running')context.currentTime+=(next-now)/1000;now=next;}
 async function advance(ms){const until=now+ms;await flush();for(;;){let due=null;for(const [key,item]of timers)if(item.at<=until&&(!due||item.at<due.item.at))due={key,item};if(!due)break;move(due.item.at);timers.delete(due.key);due.item.fn();await flush();}move(until);await flush();}
 async function start(area='bud'){music.setArea(area);await flush();await music.unlock();await advance(250);assert.equal(audio.paused,false);near(volume(),.5,'initial volume');}
 return {music,audio,context,nodes,srcChanges,timers,advance,start,volume,created:()=>creations};
}

test('zone transition keeps the old source for 1.5 s and changes source only at zero gain',async()=>{
 assert.equal(MUSIC_FADE_OUT_MS,1500);const f=fixture();await f.start();f.audio.currentTime=19;const before=f.srcChanges.length;
 f.music.setArea('stone');assert.equal(f.music.state().area,'stone');assert.equal(f.music.state().track,'bud');assert.equal(f.music.state().fading,true);assert.equal(f.audio.src,MUSIC_TRACKS.bud);assert.equal(f.audio.currentTime,19);assert.equal(f.audio.paused,false);
 await f.advance(750);near(f.volume(),.25,'midpoint fade');assert.equal(f.srcChanges.length,before);
 await f.advance(749);assert.equal(f.audio.src,MUSIC_TRACKS.bud);assert.ok(f.volume()<.001);
 await f.advance(1);assert.equal(f.audio.src,MUSIC_TRACKS.stone);assert.equal(f.music.state().track,'stone');assert.equal(f.music.state().fading,false);near(f.srcChanges.at(-1).volume,0,'source replacement gain');near(f.volume(),0,'new song starts silent');
 await f.advance(100);near(f.volume(),.25,'new song fade-in midpoint');await f.advance(100);near(f.volume(),.5,'new song target volume');f.music.dispose();
});

test('repeated pointer-like unlock and same-zone render cannot restart or shortcut a fade',async()=>{
 const f=fixture();await f.start();f.music.setArea('stone');await f.advance(500);near(f.volume(),1/3,'before repeated gesture');
 for(let i=0;i<5;i++){await f.music.unlock();f.music.setArea('stone');f.music.setBattle(false);await flush();}
 near(f.volume(),1/3,'gesture keeps current envelope');assert.equal(f.audio.src,MUSIC_TRACKS.bud);
 await f.advance(500);near(f.volume(),1/6,'original fade deadline retained');await f.advance(500);assert.equal(f.audio.src,MUSIC_TRACKS.stone);f.music.dispose();
});

test('rapid A to B to C plays only the final destination at the original deadline',async()=>{
 const f=fixture();await f.start();const count=f.srcChanges.length;f.music.setArea('stone');await f.advance(600);f.music.setArea('sand');await f.advance(899);assert.equal(f.audio.src,MUSIC_TRACKS.bud);
 await f.advance(1);assert.equal(f.audio.src,MUSIC_TRACKS.sand);assert.equal(f.srcChanges.length,count+1);assert.ok(!f.srcChanges.some(x=>x.src===MUSIC_TRACKS.stone));f.music.dispose();
});

test('return to the currently playing region cancels the pending change without reloading it',async()=>{
 const f=fixture();await f.start();const count=f.srcChanges.length;f.audio.currentTime=42;f.music.setArea('stone');await f.advance(600);f.music.setArea('bud');
 assert.equal(f.music.state().fading,false);assert.equal(f.audio.src,MUSIC_TRACKS.bud);assert.equal(f.audio.currentTime,42);await f.advance(2000);assert.equal(f.srcChanges.length,count);assert.equal(f.audio.currentTime,42);near(f.volume(),.5,'restored existing song');f.music.dispose();
});

test('shared village/interior music and repeated zone render never reload the playing source',async()=>{
 const f=fixture();await f.start('forest');f.audio.currentTime=36;const count=f.srcChanges.length;
 for(const area of ['room','bedroom','kitchen','bathroom','farm','forest']){f.music.setArea(area);await f.music.unlock();await f.advance(25);assert.equal(f.audio.currentTime,36);assert.equal(f.music.state().fading,false);}
 assert.equal(f.srcChanges.length,count);f.music.dispose();
});

test('battle half-volume multiplies the fade envelope without resetting its progress',async()=>{
 const f=fixture();await f.start();f.music.setArea('stone');await f.advance(600);near(f.volume(),.3,'field fading');f.music.setBattle(true);near(f.volume(),.15,'battle fading');await f.advance(300);near(f.volume(),.1,'battle continues fading');f.music.setBattle(false);near(f.volume(),.1,'leaving battle does not raise the old song during fade');await f.advance(600);assert.equal(f.audio.src,MUSIC_TRACKS.stone);near(f.volume(),0,'swap stays silent');await f.advance(200);near(f.volume(),.5,'new field song returns to normal volume');f.music.dispose();
});

test('question holds interrupt a fade immediately and resume only the latest area after all releases',async()=>{
 const f=fixture();await f.start();f.music.setArea('stone');await f.advance(500);const a=f.music.hold(),b=f.music.hold();assert.equal(f.audio.paused,true);assert.equal(f.music.state().fading,false);const count=f.srcChanges.length;f.music.setArea('sand');
 await f.advance(2500);assert.equal(f.audio.paused,true);assert.equal(f.srcChanges.length,count);a();a();await f.advance(10);assert.equal(f.audio.paused,true);b();await f.advance(250);assert.equal(f.audio.src,MUSIC_TRACKS.sand);assert.equal(f.audio.paused,false);assert.ok(!f.srcChanges.some(x=>x.src===MUSIC_TRACKS.stone));near(f.volume(),.5,'question completion resumes normally');f.music.dispose();
});

for(const reason of ['mute','hidden','suspended'])test(`${reason} during fading cancels late playback and resumes the latest region`,async()=>{
 const f=fixture();await f.start();f.music.setArea('stone');await f.advance(500);
 if(reason==='mute')f.music.setEnabled(false);else if(reason==='hidden')f.music.setHidden(true);else{f.context.state='suspended';f.context.onstatechange?.();}
 assert.equal(f.audio.paused,true);assert.equal(f.music.state().fading,false);const count=f.srcChanges.length;f.music.setArea('deep');await f.advance(2500);assert.equal(f.audio.paused,true);assert.equal(f.srcChanges.length,count);
 if(reason==='mute')f.music.setEnabled(true);else if(reason==='hidden')f.music.setHidden(false);else await f.music.unlock();
 await f.advance(250);assert.equal(f.audio.src,MUSIC_TRACKS.deep);assert.equal(f.audio.paused,false);near(f.volume(),.5,'latest destination resumes');f.music.dispose();
});

test('dispose cancels the fade and all subsequent late interaction is silent',async()=>{
 const f=fixture();await f.start();f.music.setArea('stone');await f.advance(300);f.music.dispose();const count=f.srcChanges.length,plays=f.audio.plays;assert.equal(f.audio.paused,true);await f.advance(3000);await f.music.unlock();f.music.setArea('deep');assert.equal(f.audio.paused,true);assert.equal(f.srcChanges.length,count);assert.equal(f.audio.plays,plays);assert.equal(f.timers.size,0);
});

test('remembered mute does not create media or download any track on entry',async()=>{
 const f=fixture();f.music.setEnabled(false);f.music.setArea('deep');await f.advance(3000);assert.equal(f.created(),0);assert.equal(f.srcChanges.length,0);f.music.dispose();
});

test('stale play success after a hold cannot restart music while the question is playing',async()=>{
 const f=fixture();await f.start();let resolve;f.audio.pause();f.audio.playOverride=()=>new Promise(done=>{resolve=()=>{f.audio.paused=false;done();};});const opening=f.music.unlock();await flush();assert.equal(typeof resolve,'function');const release=f.music.hold();resolve();await opening;await flush();assert.equal(f.audio.paused,true);f.audio.playOverride=null;release();await f.advance(250);assert.equal(f.audio.paused,false);f.music.dispose();
});

test('delayed context resume cannot play after disposal',async()=>{
 const f=fixture();let resolve;f.context.resume=()=>new Promise(done=>{resolve=()=>{f.context.state='running';done();};});f.music.setArea('bud');await flush();assert.equal(typeof resolve,'function');f.music.dispose();resolve();await flush();assert.equal(f.audio.paused,true);const count=f.srcChanges.length;await f.advance(3000);assert.equal(f.srcChanges.length,count);assert.equal(f.audio.paused,true);
});

test('an area with no music fades out without starting or downloading another track',async()=>{
 const f=fixture();await f.start();const count=f.srcChanges.length;f.music.setArea(null);assert.equal(f.audio.paused,false);await f.advance(750);near(f.volume(),.25,'silent destination midpoint');await f.advance(750);assert.equal(f.audio.paused,true);assert.equal(f.music.state().track,null);assert.equal(f.music.state().fading,false);near(f.volume(),0,'silent destination stopped');assert.equal(f.srcChanges.length,count);await f.music.unlock();assert.equal(f.audio.paused,true);f.music.dispose();
});

test('play rejection is retryable and does not leave a timer that replays an obsolete region',async()=>{
 const f=fixture();await f.start();f.audio.playOverride=()=>Promise.reject(Error('play blocked'));f.music.setArea('stone');await f.advance(1750);assert.equal(f.audio.paused,true);assert.equal(f.music.state().failed,true);assert.equal(f.music.state().needsGesture,true);assert.equal(f.music.state().fading,false);f.music.setEnabled(false);f.music.setArea('deep');await f.advance(2000);assert.equal(f.audio.paused,true);f.audio.playOverride=null;f.music.setEnabled(true);await f.music.unlock();await f.advance(250);assert.equal(f.audio.src,MUSIC_TRACKS.deep);assert.equal(f.audio.paused,false);assert.equal(f.music.state().failed,false);near(f.volume(),.5,'retry volume');f.music.dispose();
});

test('a stale play rejection cannot mark a successful newer song as failed',async()=>{
 const f=fixture();await f.start();let reject;f.audio.pause();f.audio.playOverride=()=>new Promise((_,fail)=>{reject=fail;});const attempt=f.music.unlock();await flush();const release=f.music.hold();f.music.setArea('deep');f.audio.playOverride=null;release();await f.advance(250);assert.equal(f.audio.src,MUSIC_TRACKS.deep);assert.equal(f.audio.paused,false);reject(Error('old play failed'));await attempt;await flush();assert.equal(f.audio.paused,false);assert.equal(f.music.state().failed,false);f.music.dispose();
});

test('initial media play resolving before context resume still fades in after resume completes',async()=>{
 const f=fixture();let resume;f.context.resume=()=>new Promise(done=>{resume=()=>{f.context.state='running';done();};});f.music.setArea('bud');await flush();assert.ok(f.audio.plays>0,'initial play is requested within the gesture');near(f.volume(),0,'suspended context is not made audible');resume();await flush();await f.advance(200);assert.equal(f.audio.paused,false);assert.equal(f.music.state().failed,false);near(f.volume(),.5,'resolved context does not leave the media silent');f.music.dispose();
});

test('an older rejected resume cannot silence a newer successful unlock',async()=>{
 const f=fixture();let reject,attempts=0;f.context.resume=()=>{if(++attempts===1)return new Promise((_,fail)=>{reject=fail;});f.context.state='running';return Promise.resolve();};f.music.setArea('bud');await flush();await f.music.unlock();await f.advance(250);assert.equal(f.audio.paused,false);near(f.volume(),.5,'new unlock is audible');reject(Error('old resume was blocked'));await flush();assert.equal(f.music.state().failed,false);assert.equal(f.audio.paused,false);near(f.volume(),.5,'old rejection does not silence successful unlock');f.music.dispose();
});

test('late play success after suspension cannot bypass pause or strand the next resume at zero gain',async()=>{
 const f=fixture();await f.start();let resolve;f.audio.pause();f.audio.playOverride=()=>new Promise(done=>{resolve=()=>{f.audio.paused=false;done();};});const attempt=f.music.unlock();await flush();f.context.state='suspended';f.context.onstatechange?.();resolve();await attempt;await flush();assert.equal(f.audio.paused,true);near(f.volume(),0,'suspension keeps output silent');f.audio.playOverride=null;await f.music.unlock();await f.advance(250);assert.equal(f.audio.paused,false);near(f.volume(),.5,'next resume is audible');f.music.dispose();
});
