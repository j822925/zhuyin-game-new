import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDictationTrial} from '../reading-dictation-trial.js';
function setup(){
 const nodes=new Map(),events=new Map(),trigger={};let stops=0;
 const dialog={open:false,setAttribute(){},querySelector(key){if(!nodes.has(key))nodes.set(key,{value:'',blur(){},focus(){}});return nodes.get(key);},showModal(){this.open=true;},close(){this.open=false;this.onclose();}};
 const doc={hidden:false,body:{append(){}},createElement:()=>dialog,addEventListener:(type,fn)=>events.set(type,fn)},win={addEventListener:(type,fn)=>events.set(type,fn)};
 mountDictationTrial({trigger,doc,win,beforeOpen:()=>{stops++;}});
 return {dialog,doc,events,trigger,q:key=>nodes.get(key),stops:()=>stops};
}
test('trial opens before login, stops prior page capture and requires nonempty input',()=>{
 const h=setup();h.trigger.onclick();assert.equal(h.stops(),1);assert(h.dialog.open);assert.equal(h.q('[data-word]').textContent,'蘋果');assert(h.q('[data-next]').disabled);
 h.q('[data-next]').onclick();assert.equal(h.q('[data-word]').textContent,'蘋果');h.q('input').value=' ';h.q('input').oninput();assert(h.q('[data-next]').disabled);
});
test('five inputs advance independently of correctness and clear the text each time',()=>{
 const h=setup();h.trigger.onclick();
 for(let n=0;n<5;n++){h.q('input').value=n===2?'不同的詞':'測試文字';h.q('input').oninput();assert(!h.q('[data-next]').disabled);h.q('[data-next]').onclick();assert.equal(h.q('input').value,'');}
 assert.match(h.q('[data-step]').textContent,/五次輸入（未判分）/);assert(h.q('input').hidden);assert(h.q('[data-next]').hidden);
 h.q('[data-retry]').onclick();assert.equal(h.q('[data-word]').textContent,'蘋果');assert(!h.q('input').hidden);
});
test('unfinished keyboard composition cannot advance, retry preserves current word',()=>{
 const h=setup();h.trigger.onclick();h.q('input').value='ㄆ';h.q('input').oncompositionstart();h.q('input').oninput();h.q('[data-next]').onclick();assert.equal(h.q('[data-word]').textContent,'蘋果');
 h.q('input').oncompositionend();assert(!h.q('[data-next]').disabled);h.q('[data-retry]').onclick();assert.equal(h.q('input').value,'');assert(h.q('[data-next]').disabled);assert.equal(h.q('[data-word]').textContent,'蘋果');
});
test('close, page hiding and returning clear all entered text and restart from first word',()=>{
 for(const reason of ['close','visibilitychange','pagehide']){
  const h=setup();h.trigger.onclick();h.q('input').value='不能保存的文字';h.q('input').oninput();
  if(reason==='close')h.q('[data-close]').onclick();else{h.doc.hidden=true;h.events.get(reason)();}
  assert.equal(h.q('input').value,'');assert(!h.dialog.open);h.doc.hidden=false;h.trigger.onclick();assert.equal(h.q('[data-word]').textContent,'蘋果');assert(h.q('[data-next]').disabled);
 }
});
