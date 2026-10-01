import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('tone practice puts secondary information below questions and restores it on other screens',()=>{
 const source=read('tone.js'),show=source.slice(source.indexOf('function show('),source.indexOf('function validSeat('));
 const elements=Object.fromEntries(['entry','intro','play','result','catalog','entry-back','error','stage-information'].map(id=>[id,{}]));
 let placement,playing,scrolls=0;
 elements['stage-information'].parentElement={append:e=>{assert.equal(e,elements['stage-information']);placement='bottom';},prepend:e=>{assert.equal(e,elements['stage-information']);placement='top';}};
 const context=vm.createContext({$:id=>elements[id],document:{body:{classList:{toggle:(name,value)=>{assert.equal(name,'is-playing');playing=value;}}}},window:{scrollTo:(x,y)=>{assert.equal(x,0);assert.equal(y,0);scrolls++;}}});
 vm.runInContext(show,context);
 for(const name of ['entry','play','play','result','catalog','intro','entry']){
  vm.runInContext(`show('${name}')`,context);assert.equal(placement,name==='play'?'bottom':'top');assert.equal(playing,name==='play');assert.equal(elements[name].hidden,false);assert.equal(elements['entry-back'].hidden,name==='entry');
 }
 assert.equal(scrolls,7);
 const html=read('tone.html');assert(html.indexOf('id="round-information"')>html.indexOf('class="companion"'));assert.match(html,/tone.css\?v=20261001-layout1/);assert.match(html,/tone.js\?v=20261001-layout1/);
});
