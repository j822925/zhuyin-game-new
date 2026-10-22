import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWordLookup, soundKey, TONES} from '../helper-core.js';
import {COMMON_CHAR_READINGS, COMMON_WORD_READINGS} from '../helper-common-readings.js';
import {PRONUNCIATIONS, PRONUNCIATION_SYLLABLES} from '../reading-pronunciation-data.js';
import {ELEMENTARY_HELPER_CASES} from './helper-elementary-cases.js';

const bank = JSON.parse(await readFile(new URL('../tone-questions.json', import.meta.url)));
const enabledTeacherQuestions = bank.questions.filter(q => q.enabled !== false);
const lookup = createWordLookup(PRONUNCIATIONS, PRONUNCIATION_SYLLABLES, bank.questions);

// Independent, human-reviewed holdouts. Do not copy these sentences into the
// runtime dictionary merely to pass the tests; add justified local word rules.
const ADDITIONAL_CASES = [
  ['我在學校畫畫', 'ㄨㄛˇ ㄗㄞˋ ㄒㄩㄝˊ ㄒㄧㄠˋ ㄏㄨㄚˋ ㄏㄨㄚˋ'],
  ['弟弟對星星很好奇', 'ㄉㄧˋ ㄉㄧ˙ ㄉㄨㄟˋ ㄒㄧㄥ ㄒㄧㄥ˙ ㄏㄣˇ ㄏㄠˋ ㄑㄧˊ'],
  ['他在銀行工作', 'ㄊㄚ ㄗㄞˋ ㄧㄣˊ ㄏㄤˊ ㄍㄨㄥ ㄗㄨㄛˋ'],
  ['小樹長得很快', 'ㄒㄧㄠˇ ㄕㄨˋ ㄓㄤˇ ㄉㄜ˙ ㄏㄣˇ ㄎㄨㄞˋ'],
  ['我要重新開始', 'ㄨㄛˇ ㄧㄠˋ ㄔㄨㄥˊ ㄒㄧㄣ ㄎㄞ ㄕˇ'],
  ['老師要求先排隊', 'ㄌㄠˇ ㄕ ㄧㄠ ㄑㄧㄡˊ ㄒㄧㄢ ㄆㄞˊ ㄉㄨㄟˋ'],
  ['弟弟還沒還書', 'ㄉㄧˋ ㄉㄧ˙ ㄏㄞˊ ㄇㄟˊ ㄏㄨㄢˊ ㄕㄨ'],
  ['爸爸背著背包', 'ㄅㄚˋ ㄅㄚ˙ ㄅㄟ ㄓㄜ˙ ㄅㄟ ㄅㄠ'],
  ['他好吃懶做', 'ㄊㄚ ㄏㄠˋ ㄔ ㄌㄢˇ ㄗㄨㄛˋ'],
  ['他寫得好也跑得快', 'ㄊㄚ ㄒㄧㄝˇ ㄉㄜ˙ ㄏㄠˇ ㄧㄝˇ ㄆㄠˇ ㄉㄜ˙ ㄎㄨㄞˋ'],
  ['老師教我數數字', 'ㄌㄠˇ ㄕ ㄐㄧㄠ ㄨㄛˇ ㄕㄨˇ ㄕㄨˋ ㄗˋ'],
  ['空地旁的空氣很好', 'ㄎㄨㄥˋ ㄉㄧˋ ㄆㄤˊ ㄉㄜ˙ ㄎㄨㄥ ㄑㄧˋ ㄏㄣˇ ㄏㄠˇ'],
];

// These two are covered by the user's explicit 一/不 policy, not by claiming
// that they occur among the 998 recorded teacher questions.
const USER_APPROVED_WORD_READINGS = {
  一種:'ㄧˋ ㄓㄨㄥˇ',
  不要:'ㄅㄨˊ ㄧㄠˋ',
};

function teacherSounds(q) {
  return q.zhuyin.trim().split(/\s+/u).map((sound, i) =>
    soundKey(sound).replace(/[˙ˋˇˊ]/gu, '') + TONES[q.lexicalTones[i]]);
}
const teacherReadings = new Map(enabledTeacherQuestions.map(q => [q.text, teacherSounds(q)]));
function dictionaryReadings(word) {
  if (!Object.hasOwn(PRONUNCIATIONS, word)) return [];
  return PRONUNCIATIONS[word].split('|').map(code =>
    code.split('.').map(id => soundKey(PRONUNCIATION_SYLLABLES[parseInt(id, 36)] || ''))
  ).filter(row => row.length === Array.from(word).length && row.every(Boolean));
}
function trustedReadings(word) {
  if (teacherReadings.has(word)) return [teacherReadings.get(word)];
  if (Object.hasOwn(USER_APPROVED_WORD_READINGS, word))
    return [USER_APPROVED_WORD_READINGS[word].split(' ')];
  return dictionaryReadings(word);
}
function firstReadingFailures(cases) {
  return cases.flatMap(([text, expected]) => {
    const result = lookup(text), actual = result.choices[0]?.join(' ');
    return actual === expected ? [] : [{text, expected, actual:actual || null, error:result.error || null}];
  });
}

test('64 elementary examples have aligned, unique data and the reviewed first reading', () => {
  assert.equal(ELEMENTARY_HELPER_CASES.length, 64);
  assert.equal(new Set(ELEMENTARY_HELPER_CASES.map(c => c.text)).size, 64);
  for (const {text, sounds, focus} of ELEMENTARY_HELPER_CASES) {
    assert.ok(focus, text);
    assert.ok(Array.from(text).length <= 12, text);
    assert.equal(sounds.split(' ').length, Array.from(text).length, text);
    assert.ok(sounds.split(' ').every(sound => soundKey(sound) === sound), text);
    assert.ok(!Object.hasOwn(COMMON_WORD_READINGS, text), `${text}: complete evaluation sentence entered as a word`);
  }
  assert.deepEqual(firstReadingFailures(ELEMENTARY_HELPER_CASES.map(c => [c.text, c.sounds])), []);
});

test('12 additional context examples give the reviewed reading or safely decline unsupported constructions', () => {
  const originals = new Set(ELEMENTARY_HELPER_CASES.map(c => c.text));
  const mayNeedMoreContext = new Set(['小樹長得很快','爸爸背著背包','老師教我數數字']);
  for (const [text, sounds] of ADDITIONAL_CASES) {
    assert.ok(!originals.has(text), text);
    assert.ok(Array.from(text).length <= 12, text);
    assert.equal(sounds.split(' ').length, Array.from(text).length, text);
    assert.ok(!Object.hasOwn(COMMON_WORD_READINGS, text), `${text}: complete holdout sentence entered as a word`);
  }
  const failures = firstReadingFailures(ADDITIONAL_CASES).filter(({text}) => {
    if (!mayNeedMoreContext.has(text)) return true;
    const result = lookup(text);
    // A clear refusal is safer than forcing an unsupported local phrase. Keep
    // the expected reading as a regression guard whenever an answer is given.
    return !(typeof result.error === 'string' && result.error.length > 0 && result.choices.length === 0);
  });
  assert.deepEqual(failures, []);
});

test('要 and 要求 can appear in new sentences and in the same sentence', () => {
  assert.deepEqual(firstReadingFailures([
    ['我要吃稀飯', 'ㄨㄛˇ ㄧㄠˋ ㄔ ㄒㄧ ㄈㄢˋ'],
    ['我要求', 'ㄨㄛˇ ㄧㄠ ㄑㄧㄡˊ'],
    ['我要要求他', 'ㄨㄛˇ ㄧㄠˋ ㄧㄠ ㄑㄧㄡˊ ㄊㄚ'],
  ]), []);
});

test('teacher 好吃 does not override the larger dictionary word 好吃懶做', () => {
  assert.deepEqual(lookup('好吃').choices[0], ['ㄏㄠˇ','ㄔ']);
  assert.deepEqual(lookup('好吃懶做').choices[0], ['ㄏㄠˋ','ㄔ','ㄌㄢˇ','ㄗㄨㄛˋ']);
  assert.deepEqual(lookup('他好吃懶做').choices[0], ['ㄊㄚ','ㄏㄠˋ','ㄔ','ㄌㄢˇ','ㄗㄨㄛˋ']);
});

test('punctuation and spaces prevent words from crossing an explicit boundary', () => {
  assert.deepEqual(lookup('長大').choices[0], ['ㄓㄤˇ','ㄉㄚˋ']);
  for (const separator of ['，','。','！','？','、','；','：',',','.','!','?',';',':',' ','\n','\u3000']) {
    assert.deepEqual(lookup(`長${separator}大`).choices[0], ['ㄔㄤˊ','ㄉㄚˋ'], separator);
  }
  assert.deepEqual(lookup('音樂').choices[0], ['ㄧㄣ','ㄩㄝˋ']);
  assert.deepEqual(lookup('音 樂').choices[0], ['ㄧㄣ','ㄌㄜˋ']);
  assert.deepEqual(lookup('好吃，懶做').choices[0], ['ㄏㄠˇ','ㄔ','ㄌㄢˇ','ㄗㄨㄛˋ']);
  assert.deepEqual(lookup('快樂。').choices, lookup('快樂').choices);
});

test('unknown characters and unsupported polyphonic names are not silently guessed', () => {
  for (const text of ['𠮷𠮷','樂𠮷','123','']) {
    const result = lookup(text);
    assert.ok(result.error, text);
    assert.deepEqual(result.choices, [], text);
  }
  const single = lookup('單');
  assert.ok(single.choices.length > 1);
  assert.notEqual(single.preferred, true);
  for (const text of ['阿單','我姓單']) {
    const result = lookup(text);
    assert.ok(result.error || result.choices.length > 1,
      `${text}: unknown name must not select a dictionary-first reading`);
  }
});

test('a common first reading does not erase other direct-query readings', () => {
  for (const word of ['要','樂','便宜','好學']) {
    const actual = lookup(word).choices.map(row => row.join(' '));
    for (const reading of dictionaryReadings(word))
      assert.ok(actual.includes(reading.join(' ')), `${word}: discarded ${reading.join(' ')}`);
  }
});

test('ambiguous 好學 context retains the easy-to-learn reading', () => {
  for (const [text, expected] of [
    ['這首歌很好學', 'ㄓㄜˋ ㄕㄡˇ ㄍㄜ ㄏㄣˇ ㄏㄠˇ ㄒㄩㄝˊ'],
    ['這首歌好學', 'ㄓㄜˋ ㄕㄡˇ ㄍㄜ ㄏㄠˇ ㄒㄩㄝˊ'],
  ]) {
    const result = lookup(text);
    assert.ok(result.error || result.choices.some(row => row.join(' ') === expected),
      `${text}: 好學 must not be presented as exclusively ㄏㄠˋ ㄒㄩㄝˊ in an easy-to-learn context`);
    if (!result.error && result.choices[0].join(' ') !== expected)
      assert.ok(result.choices.length > 1, 'an unresolved preference must retain a choice');
  }
});

test('a carrying phrase must not force the same 背著 reading when keeping a secret', () => {
  const result = lookup('背著別人');
  assert.ok(result.error || result.choices.some(row => row.join(' ') === 'ㄅㄟˋ ㄓㄜ˙ ㄅㄧㄝˊ ㄖㄣˊ'),
    '背著別人 needs ㄅㄟˋ or an uncertainty response, not only the carrying ㄅㄟ');
});

test('joining punctuated chunks does not erase a word that still needs pronunciation confirmation', () => {
  const result = lookup('好學，音樂');
  if (result.error) return; // An explicit uncertainty response is acceptable.
  const actual = result.choices.map(row => row.join(' '));
  assert.ok(actual.includes('ㄏㄠˇ ㄒㄩㄝˊ ㄧㄣ ㄩㄝˋ'));
  assert.ok(actual.includes('ㄏㄠˋ ㄒㄩㄝˊ ㄧㄣ ㄩㄝˋ'));
});

test('all 998 enabled teacher answers retain their approved lexical tones', () => {
  assert.equal(enabledTeacherQuestions.length, 998);
  const failures = enabledTeacherQuestions.flatMap(q => {
    const expected = teacherSounds(q), result = lookup(q.text);
    return result.choices.length === 1 && result.choices[0].join(' ') === expected.join(' ')
      ? [] : [{id:q.id, text:q.text, expected, actual:result.choices, error:result.error || null}];
  });
  assert.deepEqual(failures, []);
});

test('reviewed neutral tones, consecutive third tones, and 一/不 policy remain distinct', () => {
  assert.deepEqual(firstReadingFailures([
    ['寶寶', 'ㄅㄠˇ ㄅㄠ˙'], ['耳朵', 'ㄦˇ ㄉㄨㄛ˙'], ['嘴巴', 'ㄗㄨㄟˇ ㄅㄚ˙'],
    ['底下', 'ㄉㄧˇ ㄒㄧㄚˋ'], ['星星', 'ㄒㄧㄥ ㄒㄧㄥ˙'],
    ['你好', 'ㄋㄧˇ ㄏㄠˇ'], ['種子', 'ㄓㄨㄥˇ ㄗˇ'],
    ['一杯', 'ㄧˋ ㄅㄟ'], ['一起', 'ㄧˋ ㄑㄧˇ'], ['不是', 'ㄅㄨˊ ㄕˋ'],
    ...Object.entries(USER_APPROVED_WORD_READINGS),
  ]), []);
});

test('common character defaults are backed by dictionary readings or an explicit contextual example', () => {
  // 個's neutral tone appears in the dictionary compound 這個; the isolated
  // character entry instead lists lexical tones. Do not pretend those are equal.
  const contextualEvidence = {個:'這個'};
  const failures = [];
  for (const [char, sound] of Object.entries(COMMON_CHAR_READINGS)) {
    assert.equal(Array.from(char).length, 1, char);
    assert.equal(soundKey(sound), sound, char);
    const exactEvidence = dictionaryReadings(char).some(row => row[0] === sound);
    const word = contextualEvidence[char], index = word ? Array.from(word).indexOf(char) : -1;
    const contextEvidence = word && trustedReadings(word).some(row => row[index] === sound);
    if (!exactEvidence && !contextEvidence) failures.push({char, sound});
  }
  assert.deepEqual(failures, []);
});

test('common word readings have source support without using the common table as its own evidence', () => {
  // This validates sound/lexical provenance only. Character-supported productive
  // phrases still need the context examples above; provenance is not a language model.
  const failures = [];
  for (const [word, written] of Object.entries(COMMON_WORD_READINGS)) {
    const chars = Array.from(word), sounds = written.split(' ');
    assert.equal(sounds.length, chars.length, word);
    assert.ok(sounds.every(sound => soundKey(sound) === sound), word);
    const exact = trustedReadings(word);
    if (exact.length) {
      if (!exact.some(row => row.join(' ') === written)) failures.push({word, written, reason:'not a supported word reading'});
      continue;
    }
    const reachable = new Set([0]);
    for (let start = 0; start < chars.length; start++) {
      if (!reachable.has(start)) continue;
      for (let end = start + 1; end <= chars.length; end++) {
        const part = chars.slice(start, end).join(''), expected = sounds.slice(start, end).join(' ');
        if (trustedReadings(part).some(row => row.join(' ') === expected)) reachable.add(end);
      }
    }
    if (!reachable.has(chars.length)) failures.push({word, written, reason:'no dictionary/teacher/user-policy decomposition'});
  }
  assert.deepEqual(failures, []);
});
