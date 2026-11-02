import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {audioSource} from '../audio-source.js';
import {TEACHER_SYMBOLS} from '../data/teacher-recordings.js';
import {tutorClips} from '../little-teacher.js';
const fresh='audio/teacher-20261102/L022.mp3',original='audio/teacher-20261018/L022.mp3';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url));
test('new standalone a is used by legacy listening, saved URLs and the tutor, retaining other sounds',()=>{
 for(const old of ['audio/audio_F22.WAV','audio/processed-20260925/s_25.mp3','audio/supplied-20260923/s_25.mp3','audio/supplied-20260925/s_25.mp3',original]){
  assert.equal(audioSource(old),fresh,old);
  assert.equal(audioSource(old+'?v=old#play'),fresh+'?v=old#play');
  const root='https://j822925.github.io/zhuyin-game-new/';
  assert.equal(audioSource(root+old),root+fresh);
 }
 assert.equal(TEACHER_SYMBOLS['ㄚ'],fresh);
 assert(tutorClips({initial:'ㄅ',final:'ㄚ',tone:1}).map(audioSource).includes(fresh));
 assert.equal(audioSource(fresh),fresh);
 assert.equal(audioSource('https://other.invalid/'+original),'https://other.invalid/'+original);
 assert.equal(crypto.createHash('sha256').update(read(original)).digest('hex'),'de84e679af7ad40a7742b82f3be1fa6e9f62836e087a6f969c6d99d99f1326df');
 assert.equal(audioSource('audio/processed-20260925/s_27.mp3'),'audio/teacher-20261018/L024.mp3');
});
