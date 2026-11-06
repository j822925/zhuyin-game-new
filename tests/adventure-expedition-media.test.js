import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {preloadGuardianArt} from '../adventure-expedition-media.js';
test('stalled guardian art times out, cancels both images and can retry independently',async()=>{
 const images=[],zone={human:'human.webp',beast:'beast.webp'};let finish;
 await assert.rejects(preloadGuardianArt(zone,{timeoutMs:10,imageFactory:()=>{const image={decode:()=>new Promise(r=>finish=r)};images.push(image);return image;}}),/guardian_image_timeout/);
 assert.deepEqual(images.map(i=>i.src),['','']);
 await preloadGuardianArt(zone,{imageFactory:()=>({decode:async()=>{}})});
 finish();await Promise.resolve();
});
test('a failed image aborts the rest without waiting for the timeout',async()=>{
 const images=[];await assert.rejects(preloadGuardianArt({human:'bad',beast:'slow'},{imageFactory:()=>{const i={decode:()=>i.src==='bad'?Promise.reject(Error('decode_failed')):new Promise(()=>{})};images.push(i);return i;}}),/decode_failed/);
 assert(images.every(i=>i.src===''));
});
const source=readFileSync(new URL('../adventure-expedition-ui.js',import.meta.url),'utf8');
const begin=source.slice(source.indexOf(' async function begin('),source.indexOf(' async function prepareQuestion('));
test('old image failures cannot unlock or overwrite a newly opened region',async()=>{
 let reject,starts=0,renders=0;
 const c={loading:false,generation:1,target:null,keys:new Set(),joystick:null,dialog:{open:true},message:'',z:{id:'bud'},run:()=>({monsters:[{},{},{}]}),preloadGuardianArt:()=>new Promise((_r,j)=>reject=j),transaction:fn=>fn(),startExpeditionBattle:()=>{starts++;return true;},state:()=>({}),render:()=>renders++};
 vm.createContext(c);vm.runInContext(begin,c);const pending=c.begin(3);await Promise.resolve();
 c.generation=2;c.loading=true;c.z={id:'sand'};c.message='新的挑戰';reject(Error('late failure'));await pending;
 assert.equal(c.loading,true);assert.equal(c.message,'新的挑戰');assert.equal(starts,0);assert.equal(renders,0);
});
test('old access checks cannot unlock a new question download',async()=>{
 let resolve;const c={loading:false,generation:1,target:null,keys:new Set(),joystick:null,dialog:{open:true},ForestAccess:{check:()=>new Promise(r=>resolve=r)}};
 vm.createContext(c);vm.runInContext(begin,c);const pending=c.begin(0);c.generation=2;c.loading=true;resolve(true);await pending;assert.equal(c.loading,true);
});
