import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {audioSource} from '../audio-source.js';import {SUPPLIED_TUTOR_AUDIO} from '../data/supplied-audio.js';
test('standalone ㄦ reverts byte-for-byte to original recording, including stored exam paths',()=>{
 const fresh='audio/original-er-20260925.wav';
 assert.deepEqual(readFileSync(new URL('../'+fresh,import.meta.url)),readFileSync(new URL('../audio/audio_F34.WAV',import.meta.url)));
 assert.equal(SUPPLIED_TUTOR_AUDIO['ㄦ'],fresh);
 for(const p of ['audio/audio_F34.WAV','audio/processed-20260925/s_37.mp3','audio/supplied-20260923/s_37.mp3','audio/supplied-20260925/s_37.mp3',fresh]){
  assert.equal(audioSource(p),fresh);assert.equal(audioSource(p+'?x=1#part'),fresh+'?x=1#part');
 }
 assert.equal(audioSource('audio/audio_F22.WAV'),'audio/processed-20260925/s_25.mp3');
 assert.equal(audioSource('audio/processed-20260925/m_37_40.mp3'),'audio/processed-20260925/m_37_40.mp3');
});
