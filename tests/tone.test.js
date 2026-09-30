import test from 'node:test';import assert from 'node:assert/strict';import {readFile,stat} from 'node:fs/promises';
import {validateBank,poolFor,makeDeck,grade,summarize} from '../tone-core.js';import {createToneAudio} from '../tone-audio.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url)));
test('100 unique enabled words have exact per-character tones, licensed sources and existing compressed audio',async()=>{
 assert.equal(validateBank(bank),bank);assert.equal(poolFor(bank,'all').length,100);assert.equal(new Set(bank.questions.map(q=>q.text)).size,100);assert.ok(!bank.questions.some(q=>q.text==='不客氣'));
 for(const q of bank.questions){assert.ok(q.creator);assert.ok(q.license);assert.match(q.sourcePage,/^https:\/\/commons.wikimedia.org\//);const file=await stat(new URL('../'+q.audioUrl,import.meta.url));assert.ok(file.size>1000&&file.size<100000);}
 assert.deepEqual(bank.questions.find(q=>q.text==='熱豆漿').surfaceTones,[4,4,1]);
 assert.deepEqual(bank.questions.find(q=>q.text==='綠茶').surfaceTones,[4,2]);
});
test('disabled items are excluded in every mode and deck, with no duplicate padding',()=>{
 const b=structuredClone(bank);b.disabledIds=[b.questions[0].id];b.questions[1].enabled=false;assert.equal(poolFor(b,'all').length,98);
 assert.equal(makeDeck(poolFor(b,'all')).length,10);assert.equal(makeDeck(poolFor(b,'all').slice(0,3)).length,3);
 for(let i=0;i<20;i++){const d=makeDeck(poolFor(b,'all'));assert.equal(new Set(d.map(q=>q.id)).size,d.length);assert.ok(d.every(q=>q.id!==b.questions[0].id&&q.id!==b.questions[1].id));}
});
test('sandhi scoring uses surface tones, basic does not rewrite speech to dictionary tones',()=>{
 const nihao=bank.questions.find(q=>q.text==='你好');assert.equal(grade(nihao,[2,3]).wholeCorrect,true);assert.equal(grade(nihao,[3,3]).wholeCorrect,false);
 assert.ok(poolFor(bank,'basic').every(q=>q.lexicalTones.every((t,i)=>t===q.surfaceTones[i])));assert.equal(poolFor(bank,'sandhi').length,10);
 assert.ok(poolFor(bank,'basic','short').every(q=>q.text.length===2));assert.equal(poolFor(bank,'oops').length,0);
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
