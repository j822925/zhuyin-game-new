import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {audioSource} from '../audio-source.js';
import {createCatalog} from '../core.js';
import {SUPPLIED_LISTENING_AUDIO} from '../data/supplied-audio.js';
test('le4 uses 樂 without changing saved question identity or tone',()=>{
 const rows=JSON.parse(readFileSync(new URL('../data/syllables.json',import.meta.url)));
 const q=createCatalog(rows)[140];
 assert.equal(q.id,'s141');assert.equal(q.word,'樂');assert.equal(q.displayLabel,'ㄌㄜˋ');assert.equal(q.tone,4);
 const wav=readFileSync(new URL('../'+q.audio,import.meta.url));
 assert.equal(wav.subarray(0,4).toString(),'RIFF');assert.equal(wav.subarray(8,12).toString(),'WAVE');assert.ok(wav.length>40000);
});
test('saved old le4 audio paths bypass cache; unrelated sounds stay unchanged',()=>{
 const file='audio/syllable-clear/s141.wav',fresh=file+'?v=20260920-le4';
 assert.equal(audioSource(file),fresh);assert.equal(audioSource(fresh),fresh);
 assert.equal(audioSource(file+'?v=old&x=1#part'),file+'?v=20260920-le4&x=1#part');
 for(const other of ['audio/syllable-clear/s14.wav','audio/syllable-clear/s142.wav','audio/audio_F0.WAV','toString','__proto__',undefined])assert.equal(audioSource(other),other);
});
test('all game, tutor, sample and exam audio players use the corrected cache version',()=>{
 for(const [file,assignment] of [['app.js','audio.src=audioSource(q.audio)'],['little-teacher.js','voice.src=audioSource(clips[step])'],['teacher-audio.js','player.src=audioSource(file)'],['exam.js','audio.src=audioSource(out.question.audio)'],['exam-review.js','audio.src=audioSource(value.audio)']]){
  const code=readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.ok(code.includes(assignment),file);
 }
});

test('all 22 compound recordings refresh cached and saved paths without changing question IDs',()=>{
 for(let i=1;i<=22;i++){
  const file='audio/compound/c'+String(i).padStart(2,'0')+'.mp3',supplied=SUPPLIED_LISTENING_AUDIO[file],fresh=supplied||file+'?v=20260922-compound-level1';
  assert.equal(audioSource(file),fresh);assert.equal(audioSource(fresh),fresh);
  assert.equal(audioSource(file+'?x=1&v=old#play'),supplied?supplied+'?x=1&v=old#play':file+'?x=1&v=20260922-compound-level1#play');
 }
 for(const other of ['audio/compound/c00.mp3','audio/compound/c23.mp3','audio/compound/c1.mp3','https://example.com/audio/compound/c01.mp3'])assert.equal(audioSource(other),other);
});
