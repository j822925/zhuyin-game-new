import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createFarmLearningBridge} from '../farm-learning-bridge.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
const launcher=fs.readFileSync(new URL('../school-launch.js',import.meta.url),'utf8');
function launch(href){let moved;vm.runInNewContext(launcher,{URL,location:{href,replace:u=>moved=u},navigator:{standalone:true},matchMedia:()=>({matches:true}),history:{replaceState(){}}});return moved;}
test('reproduces old main farm URL redirect on installed iPad',()=>{
 assert.match(launch('https://example.test/game/index.html?farmLesson=single'),/choose-class/);
});
for(const cls of ['main','grade2'])for(const mode of ['single','spelling','tone','reading'])test(`${cls} ${mode}: farm round-trip is explicit and preserves lesson in standalone`,()=>{
 const tabStorage=store(),b=createFarmLearningBridge({storage:store(),tabStorage,href:'https://example.test/game/adventure-preview.html?class='+cls});
 const href=b.depart(mode),u=new URL(href);assert.equal(u.searchParams.get('class'),cls);assert.equal(u.searchParams.get('farmLesson'),mode);
 const redirected=launch(href);if(redirected){assert(!redirected.includes('choose-class'));const to=new URL(redirected);assert.equal(to.searchParams.get('farmLesson'),mode);assert.equal(to.searchParams.get('class'),cls);assert.equal(launch(redirected),undefined);}
 const back=new URL(b.returnUrl());assert.equal(back.searchParams.get('class'),cls);assert.equal(back.searchParams.get('returnFarm'),'1');
});
test('no-class old forest link is still explicitly main without guessing last device user',()=>{
 const b=createFarmLearningBridge({storage:store(),tabStorage:store(),href:'https://example.test/game/adventure-preview.html'});
 assert.equal(new URL(b.depart('single')).searchParams.get('class'),'main');
});
