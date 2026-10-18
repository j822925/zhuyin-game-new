import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {BASE,COMPOUNDS,createCatalog,poolFor,spellingParts} from '../core.js';
import {audioSource} from '../audio-source.js';import {tutorClips} from '../little-teacher.js';
import {TEACHER_AUDIO,TEACHER_SYMBOLS,TEACHER_TONES} from '../data/teacher-recordings.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const report=JSON.parse(read('data/teacher-recordings-report.json')),files=new Map(report.files.map(q=>[q.path,q]));
const catalog=createCatalog(JSON.parse(read('data/syllables.json'))),scope={symbols:BASE,compounds:COMPOUNDS},pool=poolFor('spelling',scope,catalog);
test('all 1402 selected clean MP3s match approved candidate bytes; no pitch conversion or excluded s956',()=>{
 assert.equal(report.files.length,1402);assert.equal(report.variant,'clean');assert.equal(report.pitchShiftSemitones,0);
 assert.equal(new Set(report.files.map(q=>q.id)).size,1402);assert(!report.files.some(q=>q.id==='s956'));
 for(const q of report.files){const bytes=fs.readFileSync(new URL('../'+q.path,import.meta.url));assert.equal(bytes.length,q.bytes,q.id);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),q.sha256,q.id);}
 assert.deepEqual(report.retakes,['s383','s858','s892']);assert.deepEqual(catalog.filter(q=>!q.enabled).map(q=>q.id),['s275','s956']);assert.equal(catalog.length,1392);
});
test('every listening, spelling and toned tutor segment resolves to the correct teacher pronunciation',()=>{
 assert.equal(pool.length,1312);const single=poolFor('single',scope,catalog);assert.equal(single.length,59);
 for(const q of single){const f=files.get(audioSource(q.audio));assert(f,q.label);assert.equal(f.label,q.label);assert.match(f.id,/^L/);}
 for(const q of pool){const f=files.get(audioSource(q.audio));assert(f,q.id);assert.equal(f.label,q.displayLabel,q.id);
  const p=spellingParts(q),clips=tutorClips(p);for(const clip of clips)assert(files.has(audioSource(clip)),q.id+' '+clip);
  let {initial,final,tone}=p;if(!final&&[...BASE.slice(21),...COMPOUNDS].includes(initial)){final=initial;initial='';}
  if(initial)assert.equal(files.get(audioSource(clips[0])).label,initial,q.id);
  if(final){const expected=tone===1?final:tone===5?'˙'+final:final+({2:'ˊ',3:'ˇ',4:'ˋ'}[tone]);assert.equal(files.get(audioSource(clips[initial?1:0])).label,expected,q.id);}
 }
 assert.equal(TEACHER_TONES['ㄨㄞ4'],files.has(TEACHER_TONES['ㄨㄞ4'])?TEACHER_TONES['ㄨㄞ4']:null);
 assert.equal(files.get(TEACHER_TONES['ㄨㄞ2']).id,'R014');assert.equal(Object.keys(TEACHER_SYMBOLS).length,59);
});
test('legacy cache URLs, full classroom URLs and aliases refresh without rewriting external media',()=>{
 for(const [old,fresh] of Object.entries(TEACHER_AUDIO)){assert.equal(audioSource(old+'?v=old#play'),fresh+'?v=old#play');assert.equal(audioSource(fresh),fresh);}
 const root='https://j822925.github.io/zhuyin-game-new/';assert.equal(audioSource(root+'audio/audio_F1.WAV'),root+'audio/teacher-20261018/L001.mp3');
 for(const s of ['__proto__','toString',undefined,'https://other.invalid/audio/audio_F1.WAV','audio/tone-teacher-20261011/T0001.mp3','audio/music.mp3'])assert.equal(audioSource(s),s);
 for(const id of ['s383','s858','s892'])assert.equal(audioSource(catalog.find(q=>q.id===id).audio),'audio/teacher-20261018/'+id+'.mp3');
});
test('all public players and entry dependency chains use the new audio version',()=>{
 for(const f of ['app.js','little-teacher.js','exam-review.js','exam.js','online.js','multiplayer.js','notebook.js','teacher-audio.js','classroom-completion.js','classroom-reliable.js'])assert.match(read(f),/audio-source.js\?v=20261018-teacher1/,f);
 for(const f of ['index.html','grade2.html'])assert.match(read(f),/game-boot.js\?v=20261018-tutorgap1/);
 assert.ok(read('app.js').includes('tutorClips(spellingParts(q)).map(audioSource)'));
 assert.match(read('adventure-entry.js'),/adventure-play.bundle.js\?v=20261018-teacher1/);
 assert.match(read('adventure-preview.html'),/adventure-entry.bundle.js\?v=20261018-teacher1/);
 assert.match(read('adventure-play.bundle.js'),/audio\/teacher-20261018\/L001.mp3/);
});
