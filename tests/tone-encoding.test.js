import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {audioSource} from '../audio-source.js';
test('reference-board tone 40 is fourth; 41 is third, not numerical tone order',()=>{
 assert.equal(audioSource('audio/syllable-clear/s141.wav'),'audio/supplied-20260925/m_8_27_40.mp3');
 const rows=JSON.parse(readFileSync(new URL('../data/supplied-audio-report.json',import.meta.url)));
 for(const [label,file] of [['ㄇㄨˇ','m_3_23_41.mp3'],['ㄊㄜˋ','m_6_27_40.mp3'],['ㄆㄡˇ','m_2_32_41.mp3'],['ㄇㄧㄝˋ','m_3_44_40.mp3']])assert.equal(rows.syllables.find(q=>q.label===label).expected,file);
 assert.deepEqual(rows.syllables.filter(q=>!q.available).map(q=>q.label),['ㄔㄨㄚˇ']);
});
