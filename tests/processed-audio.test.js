import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {audioSource} from '../audio-source.js';
const report=JSON.parse(readFileSync(new URL('../data/supplied-audio-report.json',import.meta.url)));
test('all 1450 files use -0.5 semitone at original tempo; 1322 demonstrations are cropped and 59 unit sounds stay whole',()=>{
 assert.equal(report.files.length,1450);assert.equal(report.files.filter(a=>a.cropStart>0).length,1322);
 assert.equal(report.files.filter(a=>a.file.startsWith('s_')).length,59);
 for(const a of report.files){assert.equal(a.pitchSemitones,-.5);assert.equal(a.tempo,1);assert.match(a.sourceSHA256,/^[a-f0-9]{64}$/);assert.notEqual(a.sha256,a.sourceSHA256);
  assert.ok(a.seconds>.4&&a.seconds<1.6,a.file);assert.ok(Math.abs(a.sourceSeconds-a.cropStart-a.seconds)<.001,a.file);assert.ok(a.peakAfterEncoding<=.9,a.file);
  if(a.file.startsWith('s_'))assert.equal(a.cropStart,0);
 }
});
test('saved original source paths refresh to processed files and query/hash suffixes survive',()=>{
 for(const a of report.files)for(const date of ['20260923','20260925']){
  const old='audio/supplied-'+date+'/'+a.file;assert.equal(audioSource(old),a.path);assert.equal(audioSource(old+'?v=old#sound'),a.path+'?v=old#sound');assert.equal(audioSource(a.path),a.path);
 }
 for(const path of ['https://other.invalid/audio/supplied-20260925/m_42.mp3','audio/supplied-20260925/m_9999.mp3','__proto__'])assert.equal(audioSource(path),path);
});
