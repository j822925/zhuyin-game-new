import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {BASE,COMPOUNDS,createCatalog,poolFor,spellingChoices,Round} from '../core.js';
import {tutorClips} from '../little-teacher.js';
import {TUTOR_TONES} from '../data/tutor-tones.js';
import {gameSamples} from '../teacher-audio.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const catalog=createCatalog(JSON.parse(read('data/syllables.json')));
const fixed=catalog.find(q=>q.id==='s441');
const pool=poolFor('spelling',{symbols:BASE,compounds:COMPOUNDS},catalog);

test('s441 keeps its ID but requires ㄏ + ㄜ and second tone, with existing full he2 audio',()=>{
 assert.equal(catalog.length,1392);
 assert.equal(fixed.initial,'ㄏ');assert.equal(fixed.final,'ㄜ');assert.equal(fixed.tone,2);
 assert.equal(fixed.label,'ㄏㄜ');assert.equal(fixed.displayLabel,'ㄏㄜˊ');
 assert.equal(fixed.audio,catalog.find(q=>q.id==='s420').audio);
 assert.ok(existsSync(new URL('../'+fixed.audio,import.meta.url)));
 const round=new Round([fixed]);assert.equal(round.answer('ㄏ').correct,false);assert.equal(round.answer('ㄏㄜ').correct,true);
 assert.ok(spellingChoices(fixed,pool).final.includes('ㄜ'));
 const clips=tutorClips(fixed);assert.equal(clips.length,3);assert.equal(clips[1],TUTOR_TONES['ㄜ2']);assert.equal(clips[2],fixed.audio);
});
test('practice and parent audio bank never offer ㄏˊ and do not duplicate ㄏㄜˊ',()=>{
 for(const rows of [pool,gameSamples(catalog)]){
  assert.equal(rows.length,1312);assert.equal(rows.filter(q=>q.displayLabel==='ㄏㄜˊ').length,1);
  assert.ok(!rows.some(q=>q.displayLabel==='ㄏˊ'));
 }
 assert.ok(!poolFor('spelling',{symbols:['ㄏ'],compounds:[]},catalog).some(q=>q.id==='s441'));
 assert.ok(poolFor('spelling',{symbols:['ㄏ','ㄜ'],compounds:[]},catalog).some(q=>q.displayLabel==='ㄏㄜˊ'));
});
test('both grade entries and parent audio refresh the corrected bank',()=>{
 for(const page of ['index.html','grade2.html'])assert.ok(read(page).includes('game-boot.js?v=20261020-bo1'));
 assert.ok(read('game-boot.js').includes('app.js?v=20261020-bo1'));
 for(const file of ['app.js','teacher-audio.js'])assert.ok(read(file).includes('data/syllables.json?v=20261018-teacher1'));
});
