import test from 'node:test';import assert from 'node:assert/strict';import {readFile,stat} from 'node:fs/promises';
import {validateBank,poolFor,makeDeck,grade,summarize} from '../tone-core.js';import {createToneAudio} from '../tone-audio.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url)));
test('998 teacher recordings preserve stable IDs and exclude both pizza questions',async()=>{
 assert.equal(validateBank(bank),bank);assert.equal(poolFor(bank,'all').length,998);
 assert.equal(new Set(bank.questions.map(q=>q.id)).size,998);
 assert.deepEqual(bank.disabledIds,['T0171','T0908']);
 for(const q of bank.questions){assert.ok(!q.text.includes('披薩'));assert.ok(q.creator);assert.match(q.audioUrl,new RegExp('/'+q.id+'\\.mp3$'));const f=await stat(new URL('../'+q.audioUrl,import.meta.url));assert.ok(f.size>1000&&f.size<150000);}
 for(const id of ['T0288','T0291','T0579','T0843'])assert.ok(poolFor(bank,'all').some(q=>q.id===id));
});
test('all classifications depend only on adjacent written third tones, not 一 or 不',()=>{
 assert.equal(poolFor(bank,'sandhi').length,142);assert.equal(poolFor(bank,'basic').length,856);
 for(const q of bank.questions){const third=q.lexicalTones.some((v,i)=>v===3&&q.lexicalTones[i+1]===3);assert.equal(q.mode,third?'sandhi':'basic');assert.equal(grade(q,q.lexicalTones).wholeCorrect,true);}
 for(const [text,tones] of [['一杯',[4,1]],['一千',[4,1]],['不是',[2,4]],['一共',[2,4]]]){const q=bank.questions.find(q=>q.text===text);assert.deepEqual(q.lexicalTones,tones);assert.equal(q.mode,'basic');}
 const q=bank.questions.find(q=>q.text==='你好');assert.deepEqual(q.lexicalTones,[3,3]);assert.equal(grade(q,[2,3]).wholeCorrect,false);
});
test('latest four teacher corrections and newly recorded former withdrawn words are available',()=>{
 for(const [id,tones] of [['T0035',[3,5]],['T0057',[3,5]],['T0059',[3,5]],['T0718',[3,4]]])assert.deepEqual(bank.questions.find(q=>q.id===id).lexicalTones,tones);
 for(const text of ['筆記本','一杯','一千'])assert.ok(poolFor(bank,'all').some(q=>q.text===text));
});
test('decks never pad duplicates or use disabled questions; lengths support up to six characters',()=>{
 const b=structuredClone(bank);b.disabledIds.push(b.questions[0].id);b.questions[1].enabled=false;assert.equal(poolFor(b,'all').length,996);
 for(const mode of ['basic','sandhi','all'])for(const length of ['short','medium','all'])for(let i=0;i<20;i++){
 const pool=poolFor(b,mode,length),d=makeDeck(pool);assert.equal(d.length,10);assert.equal(new Set(d.map(q=>q.id)).size,10);assert.ok(d.every(q=>q.id!==b.questions[0].id&&q.id!==b.questions[1].id));}
 assert.equal(makeDeck(bank.questions.slice(0,3)).length,3);assert.ok(poolFor(bank,'all','short').every(q=>q.text.length===2));assert.ok(poolFor(bank,'all','medium').some(q=>q.text.length===6));assert.equal(poolFor(bank,'oops').length,0);
});
test('invalid answers and bank data fail closed; skipped items are not wrong',()=>{
 const q=bank.questions[0];assert.throws(()=>grade(q,[null]));const b=structuredClone(bank);b.questions[0].surfaceTones=[6,1];assert.throws(()=>validateBank(b));
 const answers=[...q.lexicalTones],r=grade(q,answers);answers[0]=0;assert.notEqual(r.answers[0],0);
 assert.deepEqual(summarize([r,{id:'skip',skipped:true}]),{whole:1,total:1,characters:q.text.length,correct:q.text.length,skipped:1});
});
test('UI uses stable teacher IDs, bounded catalogue and new version; no old recordings',async()=>{
 const js=await readFile(new URL('../tone.js',import.meta.url),'utf8'),html=await readFile(new URL('../tone.html',import.meta.url),'utf8');
 assert.match(js,/s\.version!==bank\.version/);assert.equal(bank.version,'20261011-teacher1');assert.match(js,/items\.slice\(catalogPage\*30/);assert.doesNotMatch(js,/bank.questions.(findIndex|indexOf)/);
 assert.match(html,/老師原速（預設）/);assert.match(html,/一杯.*四聲、一聲/);assert.match(html,/3～6/);assert.doesNotMatch(JSON.stringify(bank),/tone-stage-20260930|wikimedia/);
});
class FakeAudio extends EventTarget{pause(){}play(){return Promise.resolve();}}
test('audio preserves pitch at selected rate, defaults to teacher original, supports replay',async()=>{
 const element=new FakeAudio(),a=createToneAudio({element,timeoutMs:100});const first=a.play('a.mp3',.75);assert.equal(element.preservesPitch,true);assert.equal(element.playbackRate,.75);element.dispatchEvent(new Event('ended'));await first;
 const second=a.play('b.mp3');assert.equal(element.playbackRate,1);const rejected=assert.rejects(second,/已停止/);a.stop();await rejected;
 const third=a.play('c.mp3');element.dispatchEvent(new Event('error'));await assert.rejects(third,/尚未載入/);
 const fourth=a.play('d.mp3');element.dispatchEvent(new Event('ended'));await fourth;
});
test('play rejection and timeout never mark a recording complete',async()=>{
 const element=new FakeAudio();element.play=()=>Promise.reject(Error());const a=createToneAudio({element});await assert.rejects(a.play('a'),/再聽一次/);
 const b=createToneAudio({element:new FakeAudio(),timeoutMs:10});await assert.rejects(b.play('b'),/逾時/);
});
