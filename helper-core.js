import {BASE, COMPOUNDS, createCatalog, spellingParts} from './core.js?v=20261009-accounts1';
import {COMMON_CHAR_READINGS, COMMON_WORD_READINGS, CONTEXT_SENSITIVE_CHARACTERS} from './helper-common-readings.js?v=20261022-common1';

export const INITIALS = BASE.slice(0, 21);
export const FINALS = [...BASE.slice(21), ...COMPOUNDS];
export const TONES = ['', '', 'ˊ', 'ˇ', 'ˋ', '˙'];
export function soundKey(value) {
  const s = String(value).trim().replaceAll('一', 'ㄧ');
  const tone = s.includes('˙') ? 5 : s.includes('ˋ') ? 4 : s.includes('ˇ') ? 3 : s.includes('ˊ') ? 2 : 1;
  const body = s.replace(/[˙ˋˇˊ]/gu, '');
  return /^[ㄅ-ㄩ]{1,3}$/u.test(body) ? body + TONES[tone] : '';
}
export function displaySound(value) {
  const key = soundKey(value);
  return key.endsWith('˙') ? '˙' + key.slice(0, -1) : key;
}
export function createSoundIndex(rows) {
  const index = new Map();
  for (const q of createCatalog(rows)) {
    if (!q.enabled) continue;
    const key = soundKey(q.displayLabel), old = index.get(key);
    if (!old || q.preferredAudio) index.set(key, spellingParts(q));
  }
  return index;
}
export function boardQuestion(index, initial, final, tone) {
  if ((!initial && !final) || (initial && !INITIALS.includes(initial)) ||
      (final && !FINALS.includes(final)) || !Number.isInteger(tone) || tone < 1 || tone > 5) return null;
  const found = index.get(initial + final + TONES[tone]);
  if (found) return found;
  // The board also teaches individual consonants, which are not full syllables.
  if (initial && !final && tone === 1) return {initial, final:'', tone, displayLabel:initial,
    audio:'audio/audio_F' + (BASE.indexOf(initial) + 1) + '.WAV'};
  return null;
}
export function createWordLookup(pronunciations, syllables, teacherQuestions = []) {
  const teacher = new Map();
  for (const q of teacherQuestions) {
    if (q.enabled === false) continue;
    const sounds = q.zhuyin?.trim().split(/\s+/u).map(soundKey);
    if (!sounds || sounds.length !== Array.from(q.text).length || sounds.some(s => !s)) continue;
    if (q.lexicalTones?.length === sounds.length && q.lexicalTones.every(t => t >= 1 && t <= 5))
      teacher.set(q.text, sounds.map((s, i) => s.replace(/[˙ˋˇˊ]/gu, '') + TONES[q.lexicalTones[i]]));
  }
  function exact(text) {
    if (teacher.has(text)) return [teacher.get(text)];
    if (!Object.hasOwn(pronunciations, text)) return [];
    const result = pronunciations[text].split('|').map(code =>
      code.split('.').map(id => soundKey(syllables[parseInt(id, 36)] || ''))
    ).filter(row => row.length === Array.from(text).length && row.every(Boolean));
    return [...new Map(result.map(row => [row.join(' '), row])).values()];
  }
  const commonWords = new Map(Object.entries(COMMON_WORD_READINGS).map(([word, sounds]) => [word, sounds.split(' ').map(soundKey)]));
  function candidates(part) {
    const rows = exact(part);
    if (teacher.has(part)) return {rows, source:'teacher'};
    const preferred = commonWords.get(part) || (Array.from(part).length === 1 && COMMON_CHAR_READINGS[part] ? [COMMON_CHAR_READINGS[part]] : null);
    if (preferred) return {rows:[preferred, ...rows.filter(row => row.join(' ') !== preferred.join(' '))], preferred:true,
      source:commonWords.has(part) ? 'common-word' : 'common-character'};
    return {rows, source:'dictionary'};
  }
  function segment(text) {
    const whole = candidates(text);
    if (whole.rows.length) return {...whole, choices:whole.rows};
    const chars = Array.from(text), best = Array(chars.length + 1).fill(null);
    best[chars.length] = {rank:[0,0,0], choices:[[]], defaults:[]};
    const compare = (a,b) => { for (let i=0;i<a.length;i++) if (a[i]!==b[i]) return a[i]-b[i]; return 0; };
    for (let start=chars.length-1; start>=0; start--) {
      for (let size=1; size<=chars.length-start; size++) {
        const part=chars.slice(start,start+size).join(''), match=candidates(part), tail=best[start+size];
        // Unknown polyphones never acquire a "first dictionary reading" just
        // to finish a sentence. Evaluate whole paths instead of greedy splitting.
        if (!tail || !match.rows.length || (size===1 && match.rows.length>1 && !match.preferred)) continue;
        const fallback = match.source==='common-character' && exact(part).length>1 ? 1 : 0;
        const rank = [tail.rank[0]+(fallback && CONTEXT_SENSITIVE_CHARACTERS.has(part) ? 2 : fallback ? 1 : 0), tail.rank[1]-(size>1 ? size : 0), tail.rank[2]+1];
        // Ambiguous words such as 好學 must retain both readings, including in
        // a sentence. Do not evade uncertainty by splitting them into defaults.
        const heads=match.preferred ? match.rows.slice(0,1) : match.rows;
        const choices=heads.flatMap(head=>tail.choices.map(row=>[...head,...row])).slice(0,8);
        const defaults=[...(fallback ? [part] : []),...tail.defaults];
        if (!best[start] || compare(rank,best[start].rank)<0) best[start]={rank,choices,defaults};
        else if (!compare(rank,best[start].rank)) best[start].choices = [...new Map([...best[start].choices,...choices].map(row=>[row.join(' '),row])).values()].slice(0,8);
      }
    }
    return best[0] ? {...best[0], segmented:true, source:'segmented'} : {choices:[]};
  }
  return function lookup(raw) {
    // Keep punctuation boundaries: "長，大" is not the word "長大".
    const chunks = String(raw).trim().split(/[，。！？、；：,.!?;:\s\u3000]+/u).filter(Boolean);
    const text = chunks.join('');
    if (!text || Array.from(text).length > 12 || !/^\p{Script=Han}+$/u.test(text))
      return {text, error: '請說或輸入 1～12 個國字。', choices: []};
    const results=chunks.map(segment);
    if (results.some(result=>!result.choices.length)) return {text,choices:[],error:'這句還有不確定的讀音，請換成短一點的詞，或請大人幫忙。'};
    if (results.length===1) return {text,...results[0]};
    let choices=[[]];
    for (const result of results) choices=choices.flatMap(row=>(result.preferred ? result.choices.slice(0,1) : result.choices).map(next=>[...row,...next])).slice(0,8);
    return {text,choices,segmented:true};
  };
}
