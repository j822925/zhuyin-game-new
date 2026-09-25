import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {createCatalog} from '../core.js';import {audioSource} from '../audio-source.js';import {samplePage} from '../teacher-audio.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const report=JSON.parse(read('data/supplied-audio-report.json'));
const all=createCatalog(JSON.parse(read('data/syllables.json'))).filter(q=>audioSource(q.audio).startsWith('audio/processed-'));
test('family catalogue contains every supplied syllable and all 1450 audio paths remain available',()=>{
 assert.equal(all.length,1391);assert.equal(new Set([...all.map(q=>audioSource(q.audio)),...report.units.map(q=>q.path)]).size,1450);
 for(const a of report.files)assert.ok(existsSync(new URL('../'+a.path,import.meta.url)),a.path);
 assert.equal(all.filter(q=>q.preferredAudio).length,77);
});
test('combined family filters support symbols, words, alternate recordings, page bounds and empty results',()=>{
 assert.equal(samplePage(all,'',0,'母').items[0].displayLabel,'ㄇㄨˇ');
 assert.equal(samplePage(all,'ㄧㄚ',0,'ㄧㄚˊ').total,2);
 assert.equal(samplePage(all,'ㄅ',0,'ㄩㄣ').total,0);
 assert.equal(samplePage(all,'',999,'不存在').page,0);
 assert.deepEqual(samplePage(all,'',0,'一ㄚ').items,samplePage(all,'',0,'ㄧㄚ').items);
 const seen=[];for(let i=0;i<samplePage(all).pages;i++)seen.push(...samplePage(all,'',i).items.map(q=>audioSource(q.audio)));
 assert.equal(seen.length,1391);assert.equal(new Set(seen).size,1391);
});
test('standalone supplement page and entry are removed; family playback remains read-only',()=>{
 for(const p of ['supplied-audio.html','supplied-audio.js'])assert.equal(existsSync(new URL('../'+p,import.meta.url)),false);
 for(const p of ['teacher-audio.js','parents.html','parents.js','teacher.html','teacher.js'])assert.doesNotMatch(read(p),/supplied-audio\.html|小老師新錄音與補檔清單/);
 assert.match(read('parents.html'),/1,450/);assert.doesNotMatch(read('teacher-audio.js'),/saveScore|authenticate|submit|workers.dev/);
});
