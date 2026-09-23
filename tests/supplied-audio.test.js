import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audioSource} from '../audio-source.js';
import {SUPPLIED_SYLLABLE_AUDIO,SUPPLIED_TUTOR_AUDIO} from '../data/supplied-audio.js';
import {createCatalog,BASE,COMPOUNDS} from '../core.js';
import {tutorClips} from '../little-teacher.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const report=JSON.parse(read('data/supplied-audio-report.json'));
const catalog=createCatalog(JSON.parse(read('data/syllables.json')));
test('provided assets are byte-identical and only 89 needed files are shipped',()=>{
 assert.equal(report.files.length,89);
 for(const row of report.files){assert.equal(createHash('sha256').update(read(row.path)).digest('hex'),row.sha256,row.file);assert.ok(row.seconds>0&&row.seconds<5);}
});
test('33 exact question replacements preserve tone IDs and all 326 fallbacks',()=>{
 assert.equal(Object.keys(SUPPLIED_SYLLABLE_AUDIO).length,33);
 assert.equal(report.syllables.filter(r=>!r.available).length,326);
 assert.equal(catalog.filter(q=>q.enabled).length,352);
 for(const q of catalog){const row=report.syllables.find(r=>r.id===q.id);assert.equal(row.label,q.displayLabel);assert.equal(row.enabled,q.enabled);
 if(row.available){assert.equal(audioSource(q.audio),row.path);assert.equal(audioSource(q.audio+'?x=1#part'),row.path+'?x=1#part');assert.equal(audioSource(audioSource(q.audio)),row.path);assert.equal(report.files.find(a=>a.path===row.path).label,q.displayLabel);}
 else assert.equal(audioSource(q.audio),q.id==='s141'?q.audio+'?v=20260920-le4':q.audio);
 }
 assert.equal(audioSource('https://other.invalid/audio/syllable-clear/s53.wav'),'https://other.invalid/audio/syllable-clear/s53.wav');
});
test('tutor uses 37 base plus 19 compound recordings; missing three still work',()=>{
 assert.equal(Object.keys(SUPPLIED_TUTOR_AUDIO).length,56);
 assert.deepEqual(report.units.filter(r=>!r.available).map(r=>r.label),['ㄩㄢ','ㄩㄣ','ㄩㄥ']);
 for(const q of catalog){const clips=tutorClips(q);assert.equal(clips[0],SUPPLIED_TUTOR_AUDIO[q.initial]);assert.equal(clips[2],q.audio);
 const expected=SUPPLIED_TUTOR_AUDIO[q.final]||'audio/compound/c'+String(COMPOUNDS.indexOf(q.final)+1).padStart(2,'0')+'.mp3';
 assert.equal(clips[1],expected);for(const clip of clips)assert.ok(existsSync(new URL('../'+clip,import.meta.url)),clip);
 }
});
test('listening mode sounds remain untouched and public preview cannot write scores',()=>{
 for(let i=1;i<=37;i++)assert.equal(audioSource('audio/audio_F'+i+'.WAV'),'audio/audio_F'+i+'.WAV');
 for(let i=1;i<=22;i++){const p='audio/compound/c'+String(i).padStart(2,'0')+'.mp3';assert.equal(audioSource(p),p+'?v=20260922-compound-level1');}
 assert.doesNotMatch(read('supplied-audio.js').toString(),/saveScore|authenticate|submit|workers.dev/);
 assert.equal(report.extraSyllables.length,75);
});
