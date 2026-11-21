import {cards} from './weekly-hanzi-bank.js';
const firstChange = Date.parse('2026-11-29T00:00:00+08:00'), week = 7 * 86400000;
function permute(items, seed) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const j = Math.floor(seed / 4294967296 * (i+1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function weeklySet(now = Date.now()) {
  const index = Math.max(0, 1 + Math.floor((now - firstChange) / week));
  const pool = permute(cards, 781035).filter((_, i) => i % 2 === index % 2);
  const block = Math.floor(index / 8), offset = Math.floor(index % 8 / 2) * 7;
  const deck = permute(pool, 180983 + Math.imul(block, 34877) + index % 2);
  return {weekId:'v1-'+index, changesAt:firstChange + index * week, cards:deck.slice(offset, offset+7)};
}
export function scoreRound(set, answers) {
  if (!Array.isArray(answers) || answers.length !== 7) throw Error('invalid_answers');
  const entries = new Map(answers.map(a=>[a?.char,a?.reading]));
  if (entries.size!==7 || !set.cards.every(c=>typeof entries.get(c.char)==='string' && /^[ㄅ-ㄩ˙ˉˊˇˋ]{1,5}$/.test(entries.get(c.char)))) throw Error('invalid_answers');
  return set.cards.filter(c=>entries.get(c.char).replace(/ˉ$/,'')===c.reading).length;
}
