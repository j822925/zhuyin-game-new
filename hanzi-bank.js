// Shared, dependency-free curriculum validation and question grading.
// The printed single-character reading is metadata; answers come from the word.
export const BOPOMOFO_INITIALS = Object.freeze([... 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ']);
export const BOPOMOFO_RIMES = Object.freeze([
  'ㄚ','ㄛ','ㄜ','ㄝ','ㄞ','ㄟ','ㄠ','ㄡ','ㄢ','ㄣ','ㄤ','ㄥ','ㄦ','ㄧ','ㄨ','ㄩ',
  'ㄧㄚ','ㄧㄛ','ㄧㄝ','ㄧㄞ','ㄧㄠ','ㄧㄡ','ㄧㄢ','ㄧㄣ','ㄧㄤ','ㄧㄥ',
  'ㄨㄚ','ㄨㄛ','ㄨㄞ','ㄨㄟ','ㄨㄢ','ㄨㄣ','ㄨㄤ','ㄨㄥ','ㄩㄝ','ㄩㄢ','ㄩㄣ','ㄩㄥ'
]);
const INITIALS = new Set(BOPOMOFO_INITIALS);
const RIMES = new Set(BOPOMOFO_RIMES);
const APICAL = new Set([... 'ㄓㄔㄕㄖㄗㄘㄙ']);
const MARKS = { 'ˉ':'1', 'ˊ':'2', 'ˇ':'3', 'ˋ':'4', '˙':'5' };
const TONES = { '1':'', '2':'ˊ', '3':'ˇ', '4':'ˋ', '5':'˙' };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim().length > 0;
const isHanzi = value => typeof value === 'string' && /^\p{Script=Han}$/u.test(value);

/** Tone is always a string 1..5. ㄕˋ has an empty rime; ㄧㄡˋ has no initial. */
export function splitBopomofo(value) {
  if (typeof value !== 'string') throw new TypeError('注音必須是字串');
  const input = value.trim().normalize('NFC');
  const marks = [...input].filter(char => Object.hasOwn(MARKS, char));
  if (marks.length > 1 || !input || /\s/u.test(input)) throw new TypeError('每字只能有一個注音音節和聲調');
  const mark = marks[0] || '';
  if (mark && !(input.endsWith(mark) || (mark === '˙' && input.startsWith(mark)))) {
    throw new TypeError('聲調位置不正確');
  }
  const syllable = mark ? input.replace(mark, '') : input;
  const initial = INITIALS.has(syllable[0]) ? syllable[0] : '';
  const rime = syllable.slice(initial.length);
  if (!(RIMES.has(rime) || (!rime && APICAL.has(initial)))) throw new TypeError('聲符或韻符不正確');
  return { initial, rime, tone: MARKS[mark] || '1' };
}

export function normalizeBopomofo(value) {
  const { initial, rime, tone } = splitBopomofo(value);
  return tone === '5' ? `˙${initial}${rime}` : `${initial}${rime}${TONES[tone]}`;
}

/** Validate teacher-authored data without changing it or discarding bad rows. */
export function validateBank(bank) {
  const errors = [];
  const fail = (path, message) => errors.push(`${path}：${message}`);
  if (!isObject(bank)) return { valid: false, errors: ['題庫必須是物件'] };
  if (!isText(bank.version)) fail('version', '需要題庫版本');
  if (!isText(bank.title)) fail('title', '需要題庫名稱');
  if (!isText(bank.semesterId)) fail('semesterId', '需要預設學期');
  if (!Array.isArray(bank.terms) || !bank.terms.length) fail('terms', '至少需要一個學期');
  if (!Array.isArray(bank.lessons) || !bank.lessons.length) fail('lessons', '至少需要一課');
  if (!Array.isArray(bank.items) || !bank.items.length) fail('items', '至少需要一個國字');
  const terms = new Set();
  for (const [index, term] of (Array.isArray(bank.terms) ? bank.terms : []).entries()) {
    const path = `terms[${index}]`;
    if (!isObject(term)) { fail(path, '學期必須是物件'); continue; }
    if (!isText(term.id) || terms.has(term.id)) fail(`${path}.id`, '學期代碼不得空白或重複');
    else terms.add(term.id);
    if (!isText(term.label) || !isText(term.publisher)) fail(path, '需要學期名稱及版本');
    if (!Number.isInteger(term.grade) || term.grade < 1 || term.grade > 6) fail(`${path}.grade`, '年級須為 1 至 6');
    if (![1, 2].includes(term.semester)) fail(`${path}.semester`, '學期須為 1 或 2');
  }
  if (!terms.has(bank.semesterId)) fail('semesterId', '預設學期不存在');
  const lessons = new Map();
  for (const [index, lesson] of (Array.isArray(bank.lessons) ? bank.lessons : []).entries()) {
    const path = `lessons[${index}]`;
    if (!isObject(lesson)) { fail(path, '課次必須是物件'); continue; }
    if (!isText(lesson.id) || lessons.has(lesson.id)) fail(`${path}.id`, '課次代碼不得空白或重複，跨學期也須唯一');
    else lessons.set(lesson.id, lesson);
    if (!isText(lesson.title)) fail(`${path}.title`, '需要課名');
    if (!terms.has(lesson.termId)) fail(`${path}.termId`, '找不到學期');
    const chars = typeof lesson.characters === 'string' ? [...lesson.characters] : lesson.characters;
    if (!Array.isArray(chars) || !chars.length || chars.some(char => !isHanzi(char)) || new Set(chars).size !== chars.length) {
      fail(`${path}.characters`, '須列出不重複的國字');
    }
  }
  const ids = new Set();
  const lessonCharacters = new Map();
  for (const [index, item] of (Array.isArray(bank.items) ? bank.items : []).entries()) {
    const path = `items[${index}]`;
    if (!isObject(item)) { fail(path, '國字必須是物件'); continue; }
    if (!isText(item.id) || ids.has(item.id)) fail(`${path}.id`, '國字代碼不得空白或重複');
    else ids.add(item.id);
    const lesson = lessons.get(item.lessonId);
    if (!lesson) fail(`${path}.lessonId`, '找不到課次');
    if (!isHanzi(item.character)) fail(`${path}.character`, '目標須是一個國字');
    const allowedCharacters = lesson && (typeof lesson.characters === 'string' || Array.isArray(lesson.characters)) ? [...lesson.characters] : [];
    if (lesson && !allowedCharacters.includes(item.character)) fail(`${path}.character`, '目標字不在該課生字表');
    const key = `${item.lessonId}:${item.character}`;
    if (lessonCharacters.has(key)) fail(path, '同一課的目標字重複');
    lessonCharacters.set(key, true);
    try { splitBopomofo(item.bopomofo); } catch { fail(`${path}.bopomofo`, '單字注音不正確'); }
    if (!Number.isInteger(item.strokeCount) || item.strokeCount < 1 || item.strokeCount > 64) fail(`${path}.strokeCount`, '筆畫數須為 1 至 64');
    if (typeof item.enabled !== 'boolean') fail(`${path}.enabled`, '須明確設定啟用狀態');
    if (!Array.isArray(item.examples) || !item.examples.length) { fail(`${path}.examples`, '至少需要一個詞語'); continue; }
    const words = new Set();
    for (const [exampleIndex, example] of item.examples.entries()) {
      const ep = `${path}.examples[${exampleIndex}]`;
      if (!isObject(example)) { fail(ep, '詞語必須是物件'); continue; }
      const chars = typeof example.word === 'string' ? [...example.word] : [];
      if (chars.length < 2 || chars.length > 12 || chars.some(char => !isHanzi(char))) fail(`${ep}.word`, '詞語須有 2 至 12 個國字');
      if (words.has(example.word)) fail(`${ep}.word`, '同字的詞語不可重複');
      words.add(example.word);
      if (!Number.isInteger(example.targetIndex) || example.targetIndex < 0 || chars[example.targetIndex] !== item.character) fail(`${ep}.targetIndex`, '目標位置須對應該國字');
      if (chars.filter(char => char === item.character).length !== 1) fail(`${ep}.word`, '目標字須只出現一次，避免題面透露答案');
      if (!Array.isArray(example.readings) || example.readings.length !== chars.length) fail(`${ep}.readings`, '詞語的每個字都需要注音');
      else for (const [readingIndex, reading] of example.readings.entries()) {
        try { splitBopomofo(reading); } catch { fail(`${ep}.readings[${readingIndex}]`, '注音不正確'); }
      }
      if (example.hint !== undefined || example.hintReadings !== undefined) {
        const hintChars = typeof example.hint === 'string' ? [...example.hint] : [];
        if (!hintChars.length || hintChars.length > 24 || hintChars.some(char => !isHanzi(char)) || hintChars.includes(item.character)) fail(`${ep}.hint`, '提示須為國字且不可透露目標字');
        if (!Array.isArray(example.hintReadings) || example.hintReadings.length !== hintChars.length) fail(`${ep}.hintReadings`, '提示的每個字都需要注音');
        else for (const reading of example.hintReadings) {
          try { splitBopomofo(reading); } catch { fail(`${ep}.hintReadings`, '提示注音不正確'); }
        }
      }
    }
  }
  for (const lesson of lessons.values()) {
    const chars = typeof lesson.characters === 'string' || Array.isArray(lesson.characters) ? [...lesson.characters] : [];
    for (const char of chars) if (!lessonCharacters.has(`${lesson.id}:${char}`)) fail(`lessons.${lesson.id}`, `${char}缺少國字資料`);
  }
  return { valid: errors.length === 0, errors };
}

/** Empty selection means no questions. Supporting words may include untaught characters. */
export function questionPool(bank, lessonIds, mode = 'reading', options = {}) {
  if (!['reading', 'writing'].includes(mode)) throw new TypeError('未知的國字題型');
  const selected = new Set(Array.isArray(lessonIds) ? lessonIds.map(String) : []);
  if (!selected.size || !Array.isArray(bank?.items) || !Array.isArray(bank?.lessons)) return [];
  const lessons = new Map(bank.lessons.map(lesson => [lesson.id, lesson]));
  return bank.items.flatMap(item => {
    const lesson = lessons.get(item.lessonId);
    if (!item.enabled || !selected.has(item.lessonId) || !lesson || (options.termId && lesson.termId !== options.termId)) return [];
    return item.examples.map((example, index) => ({
      id: `${item.id}:${index}`, itemId: item.id, lessonId: item.lessonId, termId: lesson.termId,
      character: item.character, word: example.word, readings: example.readings.map(normalizeBopomofo),
      targetIndex: example.targetIndex, bopomofo: normalizeBopomofo(example.readings[example.targetIndex]),
      strokeCount: item.strokeCount,
      ...(example.hint ? { hint: example.hint, hintReadings: example.hintReadings.map(normalizeBopomofo) } : {})
    }));
  });
}

/** Grade initial + (possibly compound) rime + tone, including intentional empty parts. */
export function gradeReading(question, answer) {
  const expected = splitBopomofo(question.bopomofo);
  let actual = null;
  if (typeof answer === 'string') {
    try { actual = splitBopomofo(answer); } catch { /* Invalid input is an incorrect answer. */ }
  } else if (isObject(answer)) {
    actual = {
      initial: typeof answer.initial === 'string' ? answer.initial : null,
      rime: typeof answer.rime === 'string' ? answer.rime : null,
      tone: Object.hasOwn(MARKS, answer.tone) ? MARKS[answer.tone] : String(answer.tone ?? '')
    };
  }
  const errors = ['initial', 'rime', 'tone'].filter(part => actual?.[part] !== expected[part])
    .map(part => ({ part, expected: expected[part], actual: actual?.[part] ?? null }));
  return { correct: errors.length === 0, expected, actual, errors };
}
