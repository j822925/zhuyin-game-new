import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {tutorClips} from '../little-teacher.js';import {audioSource} from '../audio-source.js';
const source=fs.readFileSync(new URL('../little-teacher.js',import.meta.url),'utf8').split('export function createLittleTeacher')[1];
function fixture(){
 const node=()=>({classList:{add(){},remove(){},toggle(){}},setAttribute(){},textContent:''});
 const parts=[node(),node()],answer=node(),status=node(),replay=node(),back=node(),timers=new Map(),delays=[];let next=0,voice;
 const dialog={...node(),open:false,querySelector:s=>({'[data-tutor-replay]':replay,'[data-tutor-return]':back,'.tutor-answer':answer,'.tutor-status':status}[s]),querySelectorAll:()=>parts,showModal(){this.open=true;},close(){this.open=false;},addEventListener(){}};
 class AudioFake{constructor(){voice=this;this.plays=[];this.playing=false;}play(){assert.equal(this.playing,false,'previous sound must end before next starts');this.playing=true;this.plays.push(this.src);return Promise.resolve();}pause(){this.playing=false;}end(){this.playing=false;this.onended?.();}}
 const ctx={document:{createElement:()=>dialog,body:{append(){}}},Audio:AudioFake,tutorClips,audioSource,setVerticalSymbols(){},showSpellingTone(){},setTimeout(fn,ms){const id=++next;timers.set(id,fn);delays.push(ms);return id;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(ctx);vm.runInContext('function createLittleTeacher'+source,ctx);const ui=ctx.createLittleTeacher({onReturn(){}});
 return {ui,voice,delays,timers,replay,status,flush(){const entries=[...timers];timers.clear();for(const [,fn]of entries)fn();}};
}
const gen={initial:'ㄍ',final:'ㄣ',tone:1,audio:'complete.mp3'};
test('consonant to final is only 60ms shorter; final to whole syllable stays 150ms and never overlaps',async()=>{
 const f=fixture();f.ui.show(gen);assert.equal(f.voice.plays.length,1);await Promise.resolve();assert.equal(f.timers.size,0,'play resolution must not start timer');
 f.voice.end();assert.deepEqual(f.delays,[90]);assert.equal(f.voice.plays.length,1);f.flush();assert.equal(f.voice.plays.length,2);
 f.voice.end();assert.deepEqual(f.delays,[90,150]);f.flush();assert.equal(f.voice.plays.length,3);f.voice.end();assert.equal(f.timers.size,0);
});
test('single-unit and no-consonant syllables retain the original interval',()=>{
 for(const q of [{initial:'ㄍ',final:'',tone:1,audio:'g.mp3'},{initial:'',final:'ㄣ',tone:1,audio:'en.mp3'},{initial:'ㄨㄞ',final:'',tone:4,audio:'wai.mp3'}]){const f=fixture();f.ui.show(q);f.voice.end();assert.deepEqual(f.delays,[150]);f.flush();assert.equal(f.voice.plays.length,2);}
});
test('closing cancels queued syllables; replay stops previous voice and uses the shortened first gap again',()=>{
 const f=fixture();f.ui.show(gen);f.voice.end();f.ui.close();f.flush();assert.equal(f.voice.plays.length,1);
 f.ui.show(gen);f.replay.onclick();assert.equal(f.voice.plays.length,3);f.voice.end();f.flush();assert.equal(f.voice.plays.length,4);assert.equal(f.delays.at(-1),90);
});
test('audio error or rejected playback cannot advance into another sound',async()=>{
 const f=fixture();f.ui.show(gen);f.voice.onerror();f.flush();assert.equal(f.voice.plays.length,1);assert.equal(f.timers.size,0);
 const g=fixture();g.voice.play=()=>Promise.reject(Error('blocked'));g.ui.show(gen);await new Promise(resolve=>setImmediate(resolve));assert.equal(g.timers.size,0);assert.match(g.status.textContent,/重試/);
});
