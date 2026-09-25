import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audioSource} from '../audio-source.js';
import {SUPPLIED_SYLLABLE_AUDIO,SUPPLIED_TUTOR_AUDIO,SUPPLIED_LISTENING_AUDIO} from '../data/supplied-audio.js';
import {createCatalog,BASE,COMPOUNDS} from '../core.js';
import {tutorClips} from '../little-teacher.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const report=JSON.parse(read('data/supplied-audio-report.json'));
const catalog=createCatalog(JSON.parse(read('data/syllables.json')));
test('394 matched recordings are byte-identical and 89 previous files are reused',()=>{
 assert.equal(report.sourceCount,1450);assert.equal(report.previousIdentical,164);assert.deepEqual(report.previousDifferent,[]);
 assert.equal(report.files.length,394);assert.equal(report.files.filter(r=>r.reused).length,89);
 for(const row of report.files){assert.equal(createHash('sha256').update(read(row.path)).digest('hex'),row.sha256,row.file);assert.ok(row.seconds>0&&row.seconds<5);}
});
test('335 exact question replacements preserve tone IDs and 24 fallbacks',()=>{
 assert.equal(Object.keys(SUPPLIED_SYLLABLE_AUDIO).length,335);
 assert.equal(report.syllables.filter(r=>!r.available).length,24);
 assert.equal(report.syllables.filter(r=>!r.available&&r.enabled).length,19);
 assert.equal(catalog.filter(q=>q.enabled).length,352);
 for(const q of catalog){const row=report.syllables.find(r=>r.id===q.id);assert.equal(row.label,q.displayLabel);assert.equal(row.enabled,q.enabled);
 if(row.available){assert.equal(audioSource(q.audio),row.path);assert.equal(audioSource(q.audio+'?x=1#part'),row.path+'?x=1#part');assert.equal(audioSource(audioSource(q.audio)),row.path);assert.equal(report.files.find(a=>a.path===row.path).label,q.displayLabel);}
 else assert.equal(audioSource(q.audio),q.id==='s141'?q.audio+'?v=20260920-le4':q.audio);
 }
 assert.equal(audioSource('https://other.invalid/audio/syllable-clear/s53.wav'),'https://other.invalid/audio/syllable-clear/s53.wav');
});
test('tutor uses all 37 base plus 22 compound recordings',()=>{
 assert.equal(Object.keys(SUPPLIED_TUTOR_AUDIO).length,59);
 assert.deepEqual(report.units.filter(r=>!r.available),[]);
 for(const q of catalog){const clips=tutorClips(q);assert.equal(clips[0],SUPPLIED_TUTOR_AUDIO[q.initial]);assert.equal(clips[2],q.audio);
 const expected=SUPPLIED_TUTOR_AUDIO[q.final]||'audio/compound/c'+String(COMPOUNDS.indexOf(q.final)+1).padStart(2,'0')+'.mp3';
 assert.equal(clips[1],expected);for(const clip of clips)assert.ok(existsSync(new URL('../'+clip,import.meta.url)),clip);
 }
});
test('listening uses 37 base plus 22 compounds by symbol, not source numbering',()=>{
 assert.equal(Object.keys(SUPPLIED_LISTENING_AUDIO).length,59);
 for(let i=1;i<=37;i++){const p='audio/audio_F'+i+'.WAV',expected=SUPPLIED_TUTOR_AUDIO[BASE[i-1]];assert.equal(audioSource(p),expected);assert.equal(audioSource(p+'?v=old#clip'),expected+'?v=old#clip');assert.equal(audioSource(expected),expected);}
 for(let i=1;i<=22;i++){const p='audio/compound/c'+String(i).padStart(2,'0')+'.mp3',expected=SUPPLIED_TUTOR_AUDIO[COMPOUNDS[i-1]]||p+'?v=20260922-compound-level1';assert.equal(audioSource(p),expected);assert.equal(audioSource(expected),expected);}
 assert.equal(audioSource('audio/audio_F22.WAV'),'audio/supplied-20260923/s_25.mp3'); // ㄚ, not source 22 ㄧ
 assert.equal(audioSource('audio/audio_F35.WAV'),'audio/supplied-20260923/s_22.mp3'); // ㄧ, not source 35 ㄤ
 assert.doesNotMatch(read('supplied-audio.js').toString(),/saveScore|authenticate|submit|workers.dev/);
 assert.equal(report.extraSyllables.length,1056);
});
test('game, exam, review, online and family players all load the new resolver',()=>{
 for(const file of ['app.js','exam.js','exam-review.js','online.js','little-teacher.js','teacher-audio.js'])assert.match(read(file).toString(),/audio-source.js\?v=20260925-recordings1/,file);
 for(const file of ['index.html','exam.html','online.html','parents.html','teacher.html'])assert.match(read(file).toString(),/20260925-recordings1/,file);
});
