import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBank, questionPool, splitBopomofo, normalizeBopomofo, gradeReading } from '../hanzi-bank.js';

const bank = JSON.parse(readFileSync(new URL('../data/hanzi-curriculum.json', import.meta.url), 'utf8'));
const copy = () => structuredClone(bank);
const item = character => bank.items.find(value => value.character === character);
const allQuestions = () => questionPool(bank, bank.lessons.map(lesson => lesson.id));

test('reviewed curriculum contains the preparatory unit and exactly the six lesson lists', () => {
  assert.deepEqual(validateBank(bank), { valid: true, errors: [] });
  assert.equal(bank.terms[0].id, bank.semesterId);
  assert.equal(bank.lessons.length, 7);
  assert.deepEqual(bank.lessons.map(lesson => lesson.characters), [
    '一二三四五六七八九十', '拍手左右你他也上下', '這是誰的我分好了啊多個',
    '秋千和玩陪高山到大海朋友們起', '子小課兩人拉看找隻青蛙開心',
    '比門裡外有什麼不同早晚王主又', '路長白花紅走在向說朵從頭那'
  ]);
  assert.equal(bank.items.length, 84);
  assert.equal(new Set(bank.items.map(value => value.character)).size, 84);
  assert.equal(bank.items.filter(value => value.lessonId !== '0').length, 74);
  assert.equal(allQuestions().length, 168);
  assert.ok(bank.items.every(value => value.examples.length === 2));
  assert.equal(item('花').strokeCount, 8, 'Taiwan standard 花 uses eight strokes');
  assert.equal(item('誰').strokeCount, 15);
});

test('teachers select lessons, with no automatic preparatory or future lessons', () => {
  assert.deepEqual(questionPool(bank, []), []);
  assert.deepEqual(questionPool(bank, undefined), []);
  assert.deepEqual(questionPool(bank, ['unknown']), []);
  const result = questionPool(bank, ['1', '6', '6']);
  assert.equal(result.length, 44);
  assert.deepEqual(new Set(result.map(value => value.lessonId)), new Set(['1', '6']));
  assert.ok(result.every(value => value.termId === bank.semesterId));
  const altered = copy();
  altered.items.find(value => value.character === '右').enabled = false;
  assert.equal(questionPool(altered, ['1']).length, 16);
  assert.throws(() => questionPool(bank, ['1'], 'unknown'), TypeError);
});

test('future terms can repeat characters without leaking across term selections', () => {
  const next = copy();
  next.terms.push({ id: 'next-term', label: '下學期', grade: 1, semester: 2, publisher: '康軒' });
  next.lessons.push({ id: 'next-term-l1', title: '複習', termId: 'next-term', characters: '手' });
  next.items.push({ ...structuredClone(item('手')), id: 'next-term-hand', lessonId: 'next-term-l1' });
  assert.equal(validateBank(next).valid, true);
  assert.equal(questionPool(next, ['1', 'next-term-l1'], 'reading', { termId: bank.semesterId }).length, 18);
  assert.equal(questionPool(next, ['1', 'next-term-l1'], 'reading', { termId: 'next-term' }).length, 2);
  next.lessons.at(-1).id = '1';
  assert.equal(validateBank(next).valid, false, 'lesson IDs must be unique across terms');
});

test('word context controls readings, including light tone and 不 sandhi', () => {
  const questions = allQuestions();
  const lookup = (character, word) => questions.find(value => value.character === character && value.word === word);
  assert.equal(item('啊').bopomofo, 'ㄚ');
  assert.equal(lookup('啊', '好啊').bopomofo, '˙ㄚ');
  assert.equal(item('不').bopomofo, 'ㄅㄨˋ');
  assert.equal(lookup('不', '不要').bopomofo, 'ㄅㄨˊ');
  assert.equal(lookup('不', '不同').bopomofo, 'ㄅㄨˋ');
  assert.equal(lookup('和', '和我玩').bopomofo, 'ㄏㄢˋ');
  assert.equal(lookup('子', '個子').bopomofo, '˙ㄗ');
  assert.deepEqual(lookup('你', '你好').readings, ['ㄋㄧˇ', 'ㄏㄠˇ'], 'third tones keep their taught spellings');
  assert.equal(lookup('隻', '一隻鳥').readings[0], 'ㄧˋ');
  assert.equal(lookup('一', '一月').bopomofo, 'ㄧ', 'month names keep the base tone');
});

test('writing prompts allow simple extra vocabulary while keeping the target in scope', () => {
  const questions = questionPool(bank, ['6'], 'writing');
  const longShort = questions.find(value => value.character === '長' && value.word === '長短');
  assert.deepEqual(longShort.readings, ['ㄔㄤˊ', 'ㄉㄨㄢˇ']);
  assert.equal(longShort.targetIndex, 0);
  assert.equal(longShort.bopomofo, 'ㄔㄤˊ');
  assert.ok(!bank.items.some(value => value.character === '短'));
  for (const question of allQuestions()) {
    assert.equal([...question.word].length, question.readings.length);
    assert.equal([...question.word][question.targetIndex], question.character);
    assert.equal([...question.word].filter(char => char === question.character).length, 1);
  }
});

test('homophones remain separate questions, and ambiguous pronouns include readable hints', () => {
  const questions = allQuestions();
  const right = questions.find(value => value.character === '右');
  const again = questions.find(value => value.character === '又');
  assert.equal(right.bopomofo, again.bopomofo);
  assert.notEqual(right.id, again.id);
  for (const question of questions.filter(value => value.character === '你' || (value.character === '他' && value.word === '他們'))) {
    assert.ok(question.hint.includes('男生'));
    assert.equal([...question.hint].length, question.hintReadings.length);
    assert.ok(!question.hint.includes(question.character));
  }
});

test('syllable parsing supports empty initials, compound rimes, apical initials and neutral-dot placement', () => {
  assert.deepEqual(splitBopomofo('ㄧㄡˋ'), { initial: '', rime: 'ㄧㄡ', tone: '4' });
  assert.deepEqual(splitBopomofo('ㄒㄧㄤˋ'), { initial: 'ㄒ', rime: 'ㄧㄤ', tone: '4' });
  assert.deepEqual(splitBopomofo('ㄕˋ'), { initial: 'ㄕ', rime: '', tone: '4' });
  assert.deepEqual(splitBopomofo('˙ㄗ'), { initial: 'ㄗ', rime: '', tone: '5' });
  assert.deepEqual(splitBopomofo('˙ㄚ'), { initial: '', rime: 'ㄚ', tone: '5' });
  assert.equal(normalizeBopomofo('ㄇㄣ˙'), '˙ㄇㄣ');
  assert.equal(normalizeBopomofo('ㄆㄞˉ'), 'ㄆㄞ');
  for (const invalid of ['', 'ㄅ', 'ㄧˋㄡ', 'ㄅㄅ', 'ㄋㄧˇ ㄏㄠˇ', 'ㄅㄚˇˋ', 'ㄧ˙˙', 'hello', null]) {
    assert.throws(() => splitBopomofo(invalid), TypeError);
  }
});

test('reading grades each part and never converts missing input into an intentional empty choice', () => {
  const right = { bopomofo: 'ㄧㄡˋ' };
  assert.equal(gradeReading(right, { initial: '', rime: 'ㄧㄡ', tone: '4' }).correct, true);
  assert.equal(gradeReading(right, { initial: '', rime: 'ㄧㄡ', tone: 'ˋ' }).correct, true);
  assert.equal(gradeReading(right, { rime: 'ㄧㄡ', tone: '4' }).correct, false);
  const wrong = gradeReading(right, { initial: '', rime: 'ㄧㄡ', tone: '3' });
  assert.deepEqual(wrong.errors, [{ part: 'tone', expected: '4', actual: '3' }]);
  assert.equal(gradeReading({ bopomofo: 'ㄕˋ' }, { initial: 'ㄕ', rime: '', tone: 4 }).correct, true);
  assert.equal(gradeReading({ bopomofo: '˙ㄗ' }, 'ㄗ˙').correct, true);
  assert.equal(gradeReading(right, null).correct, false);
  assert.equal(gradeReading(right, 'bad').correct, false);
});

test('validation reports incomplete or unsafe teacher data instead of silently generating partial questions', () => {
  const cases = [
    value => { value.items[0].examples[0].targetIndex = 0; },
    value => { value.items[0].examples[0].readings.pop(); },
    value => { value.items[0].examples[0].readings[0] = 'ㄉㄧˋ ㄧ'; },
    value => { value.items[0].examples[0] = { word: '一一', readings: ['ㄧ', 'ㄧ'], targetIndex: 0 }; },
    value => { value.items[0].examples = []; },
    value => { value.items[0].strokeCount = 0; },
    value => { value.items[0].id = value.items[1].id; },
    value => { value.items[0].lessonId = 'missing'; },
    value => { value.items.splice(0, 1); },
    value => { value.lessons[0].characters = {}; },
    value => { value.terms[0].id = 'missing'; },
    value => { Object.assign(value.items[0].examples[0], { hint: '一個', hintReadings: ['ㄧˊ', 'ㄍㄜˋ'] }); }
  ];
  for (const mutate of cases) {
    const value = copy(); mutate(value);
    const result = validateBank(value);
    assert.equal(result.valid, false, mutate.toString());
    assert.ok(result.errors.length > 0);
  }
  assert.equal(validateBank(null).valid, false);
  assert.equal(validateBank({}).valid, false);
});

test('question pool returns independent readings so a UI cannot mutate bank data', () => {
  const questions = questionPool(bank, ['1']);
  questions[0].readings[0] = 'bad';
  assert.equal(item('拍').examples[0].readings[0], 'ㄆㄞ');
  assert.equal(validateBank(bank).valid, true);
});
