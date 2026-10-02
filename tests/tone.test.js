import test from 'node:test';import assert from 'node:assert/strict';import {readFile,stat} from 'node:fs/promises';
import {validateBank,poolFor,makeDeck,grade,summarize} from '../tone-core.js';import {createToneAudio} from '../tone-audio.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url)));
test('100 archived words, 96 enabled, have exact per-character tones, licensed sources and existing compressed audio',async()=>{
 assert.equal(validateBank(bank),bank);assert.equal(poolFor(bank,'all').length,96);assert.equal(new Set(bank.questions.map(q=>q.text)).size,100);assert.ok(!bank.questions.some(q=>q.text==='不客氣'));
 for(const q of bank.questions){assert.ok(q.creator);assert.ok(q.license);assert.match(q.sourcePage,/^https:\/\/commons.wikimedia.org\//);const file=await stat(new URL('../'+q.audioUrl,import.meta.url));assert.ok(file.size>1000&&file.size<100000);}
 assert.deepEqual(bank.questions.find(q=>q.text==='熱豆漿').surfaceTones,[4,4,1]);
 assert.deepEqual(bank.questions.find(q=>q.text==='綠茶').surfaceTones,[4,2]);
});
test('disabled items are excluded in every mode and deck, with no duplicate padding',()=>{
 const b=structuredClone(bank);b.disabledIds.push(b.questions[0].id);b.questions[1].enabled=false;assert.equal(poolFor(b,'all').length,94);
 assert.equal(makeDeck(poolFor(b,'all')).length,10);assert.equal(makeDeck(poolFor(b,'all').slice(0,3)).length,3);
 for(let i=0;i<20;i++){const d=makeDeck(poolFor(b,'all'));assert.equal(new Set(d.map(q=>q.id)).size,d.length);assert.ok(d.every(q=>q.id!==b.questions[0].id&&q.id!==b.questions[1].id));}
});
test('withdrawn 巧克力、蝙蝠、一杯、一千 cannot enter any challenge pool or random deck',()=>{
 for(const text of ['巧克力','蝙蝠','一杯','一千']){
 const q=bank.questions.find(q=>q.text===text);assert.equal(q.enabled,false);assert.ok(bank.disabledIds.includes(q.id));
 for(const mode of ['basic','sandhi','all'])for(const length of ['short','medium','all']){
  const pool=poolFor(bank,mode,length);assert.ok(!pool.some(item=>item.id===q.id));
  for(let i=0;i<25;i++)assert.ok(!makeDeck(pool).some(item=>item.id===q.id));
 }
 }
});
test('every mode grades original tones, including third-tone sequences and 一、不',()=>{
 for(const q of bank.questions){assert.equal(grade(q,q.lexicalTones).wholeCorrect,true);if(q.mode==='sandhi')assert.equal(grade(q,q.surfaceTones).wholeCorrect,false);}
 for(const text of ['你好','手指','可以','很好'])assert.equal(grade(bank.questions.find(q=>q.text===text),[3,3]).wholeCorrect,true);
 assert.equal(grade(bank.questions.find(q=>q.text==='一些'),[1,1]).wholeCorrect,true);
 assert.equal(grade(bank.questions.find(q=>q.text==='不是'),[4,4]).wholeCorrect,true);
 assert.equal(grade(bank.questions.find(q=>q.text==='一共'),[1,4]).wholeCorrect,true);
 assert.ok(poolFor(bank,'basic').every(q=>q.lexicalTones.every((t,i)=>t===q.surfaceTones[i])));assert.equal(poolFor(bank,'sandhi').length,8);
 assert.ok(poolFor(bank,'basic','short').every(q=>q.text.length===2));assert.equal(poolFor(bank,'oops').length,0);
});
test('instructions, feedback and catalogue all use original tones; old round version is invalidated',async()=>{
 const js=await readFile(new URL('../tone.js',import.meta.url),'utf8'),html=await readFile(new URL('../tone.html',import.meta.url),'utf8');
 assert.doesNotMatch(js,/q\.surfaceTones\[i\]/);assert.match(js,/q\.lexicalTones\[i\]/);assert.match(js,/s\.version!==bank\.version/);assert.equal(bank.version,'20261002-original1');
 assert.match(html,/你 ˇ　好 ˇ/);assert.doesNotMatch(html,/聽到幾聲，就選幾聲|按照錄音中聽到的聲調作答/);assert.match(html,/原本的一聲與四聲/);
});
test('invalid answer/bank data fail closed and skipped questions do not penalize results',()=>{
 assert.throws(()=>grade(bank.questions[0],[null,3]));const b=structuredClone(bank);b.questions[0].surfaceTones=[6,1];assert.throws(()=>validateBank(b));
 const answers=[1,3],r=grade(bank.questions[0],answers);answers[0]=4;assert.equal(r.answers[0],1);
 assert.deepEqual(summarize([r,{id:'skip',skipped:true}]),{whole:1,total:1,characters:2,correct:2,skipped:1});
});
class FakeAudio extends EventTarget{pause(){}play(){return Promise.resolve();}}
test('audio is pitch-preserving, supports replay, rejects failure, cancellation and stale completion',async()=>{
 const element=new FakeAudio(),a=createToneAudio({element,timeoutMs:100});const first=a.play('a.mp3',.75);assert.equal(element.preservesPitch,true);assert.equal(element.playbackRate,1);element.dispatchEvent(new Event('ended'));await first;
 const second=a.play('b.mp3');const rejected=assert.rejects(second,/已停止/);a.stop();await rejected;
 const third=a.play('c.mp3');element.dispatchEvent(new Event('error'));await assert.rejects(third,/尚未載入/);
 const fourth=a.play('d.mp3');element.dispatchEvent(new Event('ended'));await fourth;
});
test('play rejection and timeout are not mistaken for a finished recording',async()=>{
 const element=new FakeAudio();element.play=()=>Promise.reject(Error());const a=createToneAudio({element});await assert.rejects(a.play('a'),/再聽一次/);
 const b=createToneAudio({element:new FakeAudio(),timeoutMs:10});await assert.rejects(b.play('b'),/逾時/);
});
