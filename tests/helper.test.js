import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {createSoundIndex, createWordLookup, boardQuestion, soundKey, displaySound} from '../helper-core.js';
import {PRONUNCIATIONS, PRONUNCIATION_SYLLABLES} from '../reading-pronunciation-data.js';
import {tutorClips} from '../little-teacher.js';
import {audioSource} from '../audio-source.js';
import {createHelperPlayer} from '../helper-player.js';
const rows = JSON.parse(await readFile(new URL('../data/syllables.json', import.meta.url)));
const bank = JSON.parse(await readFile(new URL('../tone-questions.json', import.meta.url)));
const index = createSoundIndex(rows);
const lookup = createWordLookup(PRONUNCIATIONS, PRONUNCIATION_SYLLABLES, bank.questions);
test('whole words resolve polyphony by context', () => {
  assert.deepEqual(lookup('快樂').choices, [['ㄎㄨㄞˋ','ㄌㄜˋ']]);
  assert.deepEqual(lookup('音樂').choices, [['ㄧㄣ','ㄩㄝˋ']]);
  assert.deepEqual(lookup('銀行').choices, [['ㄧㄣˊ','ㄏㄤˊ']]);
});
test('teacher-reviewed written tones override dictionary', () => {
  for (const [word, expected] of [['寶寶',[3,5]],['耳朵',[3,5]],['嘴巴',[3,5]],['底下',[3,4]]]) {
    const sounds = lookup(word).choices[0];
    assert.deepEqual(sounds.map(s => s.includes('˙') ? 5 : s.includes('ˋ') ? 4 : s.includes('ˇ') ? 3 : s.includes('ˊ') ? 2 : 1), expected);
  }
  assert.deepEqual(lookup('你好').choices[0], ['ㄋㄧˇ','ㄏㄠˇ']);
});
test('unknown, invalid, and ambiguous queries are not guessed', () => {
  assert.ok(lookup('123').error);
  assert.ok(lookup('𠮷𠮷').error);
  assert.ok(lookup('樂').choices.length > 1);
  assert.ok(lookup('樂𠮷').error);
  assert.deepEqual(lookup('快樂。').choices, lookup('快樂').choices);
});
test('tone notation and valid board recordings', () => {
  assert.equal(soundKey('˙ㄇㄚ'), 'ㄇㄚ˙');
  assert.equal(displaySound('ㄇㄚ˙'), '˙ㄇㄚ');
  assert.ok(boardQuestion(index,'ㄎ','ㄨㄞ',4));
  assert.ok(boardQuestion(index,'','ㄚ',1));
  assert.ok(boardQuestion(index,'ㄓ','',1));
  assert.equal(audioSource(boardQuestion(index,'ㄅ','',1).audio), 'audio/teacher-20261020/L001.mp3');
  assert.equal(boardQuestion(index,'ㄏ','',2), null);
  assert.equal(boardQuestion(index,'ㄅ','ㄩ',1), null);
  assert.equal(boardQuestion(index,'','',1), null);
  assert.equal(boardQuestion(index,'','ㄝ',2), null); // removed s956
});
test('every playable catalog tutor clip resolves to a real teacher recording', async () => {
  const paths = new Set();
  for (const q of index.values()) {
    for (const clip of tutorClips(q)) {
      const path = audioSource(clip);
      assert.match(path, /^audio\/teacher-202610(?:18|20)\//, `${q.id}: ${path}`);
      paths.add(path);
    }
  }
  await Promise.all([...paths].map(path => access(new URL('../' + path, import.meta.url))));
});
function fakeVoice() {
  return {src:'', playCalls:[], pause(){}, removeAttribute(){}, load(){},
    play(){this.playCalls.push(this.src);return Promise.resolve();}, onended:null,onerror:null};
}
test('player waits for ended and never overlaps segments', async () => {
  const voice = fakeVoice(), p = createHelperPlayer(voice);
  const result = p.play([{src:'one',gap:5},{src:'two'}]);
  assert.deepEqual(voice.playCalls,['one']);
  voice.onended();
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.deepEqual(voice.playCalls,['one','two']);
  voice.onended();
  assert.equal(await result, true);
});
test('stop during gap prevents stale next clip', async () => {
  const voice = fakeVoice(), p = createHelperPlayer(voice);
  const result = p.play([{src:'old',gap:50},{src:'stale'}]);
  voice.onended();
  await Promise.resolve(); p.stop();
  assert.equal(await result, false);
  assert.deepEqual(voice.playCalls,['old']);
});
test('late rejection of canceled play cannot cancel new playback', async () => {
  const voice = fakeVoice(); let rejectOld;
  voice.play = () => voice.src === 'old' ? new Promise((_,reject)=>{rejectOld=reject;}) : Promise.resolve();
  const p = createHelperPlayer(voice);
  const old = p.play([{src:'old'}]);
  const current = p.play([{src:'new'}]);
  rejectOld(new Error('late rejection'));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(typeof voice.onended,'function');
  voice.onended();
  assert.equal(await old,false);
  assert.equal(await current,true);
});
test('audio failure and timeout release playback', async () => {
  const voice = fakeVoice(), p = createHelperPlayer(voice,{timeoutMs:10});
  const result = p.play([{src:'broken'}]); voice.onerror();
  await assert.rejects(result);
  await assert.rejects(p.play([{src:'timeout'}]));
});
