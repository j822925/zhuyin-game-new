import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {READING_WORDS,readingDecision,readingStars,validReadingRound} from '../reading-core.js';

// Exercise the actual page answer handler with a small DOM and battle spy.
const source=fs.readFileSync(new URL('../reading.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('function answer(text){'),source.indexOf('async function refreshLesson(){'));
function harness(words){
 const nodes=new Map(),battles=[];
 const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='next',disabled:false,textContent:''});return nodes.get(id);};
 const context=vm.createContext({$,readingDecision,Date,Math,locked:false,rows:[],deck:words.map(text=>READING_WORDS.find(w=>w.word===text)),questionStarted:Date.now(),readingBattle:{answer(...args){battles.push(args);}}});
 vm.runInContext(handler,context);
 return {context,$,battles,answer(text){context.answer(text);}};
}
test('reported ASR substitutions and invented subtitle text leave the original question ungraded',()=>{
 for(const [word,text] of [['栗子','律子'],['蠟燭','拉茲'],['企鵝','雞雞'],['叉子','叉子，使用繁體中文字幕。'],['叉子','使用繁體中文字幕。'],['木馬','Múma']]){
  const h=harness([word]);h.answer(text);h.answer(text);
  assert.equal(h.context.rows.length,0);assert.equal(h.context.locked,false);assert.equal(h.battles.length,0);
  assert.equal(h.context.deck[0].word,word);assert.equal(h.$('next').hidden,true);assert.equal(h.$('tap-record').disabled,false);
  assert.match(h.$('feedback').textContent,/不扣分/);assert.ok(!h.$('feedback').textContent.includes(text));
  h.answer(word);assert.equal(h.context.rows.length,1);assert.equal(h.context.rows[0].firstCorrect,true);assert.equal(h.battles.length,1);
  h.answer(word);assert.equal(h.context.rows.length,1,'duplicate result must not score twice');
 }
});
test('retries across all five questions preserve one score per question and three-star completion',()=>{
 const h=harness(['蠟燭','叉子','企鵝','梨子','木馬']);
 for(const heard of ['蠟燭','叉子','企鵝','離子','木麻']){
  h.context.locked=false;h.$('next').hidden=true;
  const count=h.context.rows.length;h.answer('這是一段額外的字幕內容');assert.equal(h.context.rows.length,count);
  h.answer(heard);assert.equal(h.context.rows.length,count+1);
 }
 assert.equal(h.battles.length,5);assert.equal(readingStars(h.context.rows.filter(r=>r.firstCorrect).length),3);
 assert.equal(validReadingRound({kind:'round',mode:'reading',total:5,mistakes:0,results:h.context.rows}),true);
 assert.equal(h.$('next').textContent,'看看我的星星 →');
});
test('late results after leaving the play page cannot change scores',()=>{
 const h=harness(['叉子']);h.$('play').hidden=true;h.answer('叉子');assert.equal(h.context.rows.length,0);assert.equal(h.battles.length,0);
});
