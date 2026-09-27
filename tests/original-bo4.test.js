import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {audioSource} from '../audio-source.js';import {tutorClips} from '../little-teacher.js';import {TUTOR_TONES} from '../data/tutor-tones.js';import {createCatalog} from '../core.js';import {gameSamples} from '../teacher-audio.js';
const fresh='audio/original-bo4-20260928.wav';
test('whole bo4 uses the approved original-pitch sample including saved question paths',()=>{
 for(const old of ['audio/processed-20260925/m_1_26_40.mp3','audio/supplied-20260923/m_1_26_40.mp3','audio/supplied-20260925/m_1_26_40.mp3',fresh]){
  assert.equal(audioSource(old),fresh);assert.equal(audioSource(old+'?x=1#part'),fresh+'?x=1#part');
 }
 assert(fs.existsSync(new URL('../'+fresh,import.meta.url)));
 for(const other of ['audio/processed-20260925/m_3_26_40.mp3','audio/processed-20260925/m_1_26_41.mp3',TUTOR_TONES['ㄛ4']])assert.equal(audioSource(other),other);
 const clips=tutorClips({initial:'ㄅ',final:'ㄛ',tone:4,audio:'audio/processed-20260925/m_1_26_40.mp3'}).map(audioSource);assert.equal(clips[1],TUTOR_TONES['ㄛ4']);assert.equal(clips[2],fresh);
});
test('parent samples retain bo4 after the original-pitch exception',()=>{
 const qs=createCatalog(JSON.parse(fs.readFileSync(new URL('../data/syllables.json',import.meta.url))));assert(gameSamples(qs).some(q=>q.displayLabel==='ㄅㄛˋ'));
});
