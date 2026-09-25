import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {createCatalog,BASE,COMPOUNDS,poolFor} from '../core.js';import {audioSource} from '../audio-source.js';import {samplePage,gameSamples} from '../teacher-audio.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const report=JSON.parse(read('data/supplied-audio-report.json'));
const catalog=createCatalog(JSON.parse(read('data/syllables.json'))),all=gameSamples(catalog);
test('family catalogue contains only game-selected sounds; archived source audio remains recoverable',()=>{
 assert.equal(all.length,1314);assert.equal(new Set([...all.map(q=>audioSource(q.audio)),...report.units.map(q=>q.path)]).size,1373);
 assert.deepEqual(all,poolFor('spelling',{symbols:BASE,compounds:COMPOUNDS},catalog));
 assert.equal(new Set(all.map(q=>q.displayLabel)).size,1314);
 for(const a of report.files)assert.ok(existsSync(new URL('../'+a.path,import.meta.url)),a.path);
 assert.equal(all.filter(q=>q.preferredAudio).length,77);
});
test('combined family filters retain only preferred recordings and support page bounds and empty results',()=>{
 assert.equal(samplePage(all,'',0,'母').items[0].displayLabel,'ㄇㄨˇ');
 assert.equal(samplePage(all,'ㄧㄚ',0,'ㄧㄚˊ').total,1);
 assert.equal(samplePage(all,'ㄅ',0,'ㄩㄣ').total,0);
 assert.equal(samplePage(all,'',999,'不存在').page,0);
 assert.deepEqual(samplePage(all,'',0,'一ㄚ').items,samplePage(all,'',0,'ㄧㄚ').items);
 const seen=[];for(let i=0;i<samplePage(all).pages;i++)seen.push(...samplePage(all,'',i).items.map(q=>audioSource(q.audio)));
 assert.equal(seen.length,1314);assert.equal(new Set(seen).size,1314);
});
test('standalone supplement page and entry are removed; family playback remains read-only',()=>{
 for(const p of ['supplied-audio.html','supplied-audio.js'])assert.equal(existsSync(new URL('../'+p,import.meta.url)),false);
 for(const p of ['teacher-audio.js','parents.html','parents.js','teacher.html','teacher.js'])assert.doesNotMatch(read(p),/supplied-audio\.html|小老師新錄音與補檔清單/);
 assert.match(read('parents.html'),/1,373/);assert.doesNotMatch(read('teacher-audio.js'),/saveScore|authenticate|submit|workers.dev/);
 for(const file of ['parents.html','teacher-audio.js'])assert.doesNotMatch(read(file),/比較原版|另一版錄音|遊戲選用版|待核對，不出題/);
});
test('six teacher-confirmed recordings enabled; missing chua3 still disabled',()=>{
 for(const id of ['s90','s137','s139','s150','s167','s257']){const q=catalog.find(q=>q.id===id);assert(q.enabled);assert.equal(q.reviewRequired,false);assert(all.some(s=>s.displayLabel===q.displayLabel));}
 assert.deepEqual(catalog.filter(q=>!q.enabled).map(q=>q.id),['s275']);
});
