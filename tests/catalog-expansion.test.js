import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createCatalog,poolFor,spellingChoices,questionDeck,BASE,COMPOUNDS,Round} from '../core.js';
import {tutorClips} from '../little-teacher.js';import {showSpellingTone} from '../spelling-layout.js';
const report=JSON.parse(readFileSync(new URL('../data/supplied-audio-report.json',import.meta.url))),catalog=createCatalog(JSON.parse(readFileSync(new URL('../data/syllables.json',import.meta.url))));
test('all 1450 recordings are used exactly once in symbol units or exact-tone questions',()=>{
 assert.equal(catalog.length,1392);assert.equal(catalog.filter(q=>q.enabled).length,1385);
 assert.equal(report.files.length,1450);assert.equal(new Set([...report.units,...report.syllables].filter(r=>r.available).map(r=>r.path)).size,1450);
 assert.ok(catalog.filter(q=>!q.final).length>=152);assert.equal(catalog.filter(q=>q.tone===5).length,44);
 assert.deepEqual(report.syllables.filter(q=>!q.available).map(q=>q.id),['s275']);
 assert.equal(new Set(catalog.map(q=>q.displayLabel)).size,1315);
 const pool=poolFor('spelling',{symbols:BASE,compounds:COMPOUNDS},catalog);assert.equal(pool.length,1308);assert.equal(pool.filter(q=>q.preferredAudio).length,77);assert.ok(pool.every(q=>!q.audioVariants));
});
test('77 same-label pairs use one fixed preferred recording, regardless of catalog or shuffle order',()=>{
 const preferred=catalog.filter(q=>q.preferredAudio);assert.equal(preferred.length,77);
 for(const entries of [catalog,[...catalog].reverse()]){
  const pool=poolFor('spelling',{symbols:BASE,compounds:COMPOUNDS},entries);
  for(const q of preferred){const actual=pool.filter(a=>a.displayLabel===q.displayLabel);assert.equal(actual.length,1);assert.equal(actual[0].audio,q.audio);
   for(const rng of [()=>0,()=>.5,()=>.999])assert.ok(questionDeck(actual,5,rng).every(a=>a.audio===q.audio));
  }
 }
});
test('source tone numbers are independent of numbered tone names',()=>{
 const source={38:5,39:2,40:4,41:3};
 for(const q of catalog.slice(359)){const file=q.audio.split('/').at(-1),parts=file.slice(2,-4).split('_'),n=parts.at(-1);assert.equal(q.tone,source[n]||1,q.id);assert.equal(q.word,'');}
});
test('new one-unit or compound questions require explicitly taught units; no empty distractors',()=>{
 for(const scope of [{symbols:['ㄅ','ㄚ'],compounds:[]},{symbols:['ㄧ','ㄝ'],compounds:[]},{symbols:[],compounds:['ㄧㄝ']},{symbols:BASE,compounds:COMPOUNDS}]){
  const pool=poolFor('spelling',scope,catalog),taught=new Set([...scope.symbols,...scope.compounds]);
  for(const q of pool){assert.ok(taught.has(q.initial));assert.ok(!q.final||taught.has(q.final));const choices=spellingChoices(q,pool);
   assert.ok(choices.initial.includes(q.initial));assert.ok(choices.final.includes(q.final));assert.ok(choices.initial.every(Boolean));if(q.final)assert.ok(choices.final.every(Boolean));else assert.deepEqual(choices.final,['']);
   for(const k of ['initial','final']){assert.equal(new Set(choices[k]).size,choices[k].length);for(const v of choices[k])assert.ok(!v||taught.has(v));}
  }
 }
});
test('one-unit tutor plays only symbol and complete sound; neutral dot goes before written syllable',()=>{
 for(const q of catalog){const clips=tutorClips(q);assert.equal(clips.length,q.final?3:2);assert.ok(clips.every(v=>!v.includes('c00')));assert.equal(clips.at(-1),q.audio);}
 const q=catalog.find(q=>q.tone===5&&!q.final),r=new Round([q]);assert.equal(q.displayLabel,'˙'+q.label);assert.equal(r.answer(q.label).correct,true);assert.equal(r.rows[0].target,q.displayLabel);
 const tone={setAttribute(k,v){this[k]=v;}},container={dataset:{},querySelector:()=>tone};showSpellingTone(container,q);assert.equal(tone['aria-label'],'輕聲');assert.equal(container.dataset.neutral,'true');assert.equal(container.dataset.singlePart,'true');
 showSpellingTone(container,catalog[0]);assert.equal(container.dataset.neutral,'false');assert.equal(container.dataset.singlePart,'false');assert.equal(tone.hidden,true);
});
