import {cards} from './weekly-hanzi-bank.js?v=20261122-textbook';
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
// The launch edition was promised through November 28, including in-progress rounds.
const launch = [...'手花耳天羊冬窗'];
// Kang Hsuan, grade 1 first semester, including its preparatory counting unit.
const textbook = '一二三四五六七八九十拍手左右你他也上下這是誰的我分好了啊多個秋千和玩陪高山到大海朋友們起子小課兩人拉看找隻青蛙開心比門裡外有什麼不同早晚王主又路長白花紅走在向說朵從頭那';
const cardByChar = new Map(cards.map(c=>[c.char,c]));
export function weeklyPeriod(now=Date.now()) {
  const index=Math.max(0,1+Math.floor((now-firstChange)/week));
  return {index,weekId:'v1-'+index,changesAt:firstChange+index*week};
}
export function weeklySet(now=Date.now(), additional=[], previous=[]) {
  const {index,weekId,changesAt}=weeklyPeriod(now);
  if(index===0)return {weekId,changesAt,cards:launch.map(ch=>cardByChar.get(ch))};
  const excluded=new Set([...textbook,...additional]);
  const eligible=permute(cards,781035).filter(c=>!excluded.has(c.char));
  if(eligible.length<7)throw Error('weekly_pool_small');
  // Place the still-eligible launch cards in the second half to avoid repeats on the first change.
  const ranked=[...eligible.filter(c=>!launch.includes(c.char)),...eligible.filter(c=>launch.includes(c.char))];
  const half=Math.floor(ranked.length/2), turn=index-1;
  const pool=half<7?ranked:turn%2?ranked.slice(half):ranked.slice(0,half);
  const other=half<7?[]:turn%2?ranked.slice(0,half):ranked.slice(half);
  const draw=half<7?turn:Math.floor(turn/2);
  const groupSize=Math.ceil(pool.length/7), block=Math.floor(draw/groupSize);
  const deck=permute(pool,180983+Math.imul(block,34877)+(turn%2));
  const offset=draw%groupSize*7;
  const order=[...deck.slice(offset),...deck.slice(0,offset),...other];
  const recent=new Set(index===1?launch:previous);
  const preferred=order.filter(c=>!recent.has(c.char));
  return {weekId,changesAt,cards:[...preferred,...order.filter(c=>recent.has(c.char))].slice(0,7)};
}
export function scoreRound(set, answers) {
  if (!Array.isArray(answers) || answers.length !== 7) throw Error('invalid_answers');
  const entries = new Map(answers.map(a=>[a?.char,a?.reading]));
  if (entries.size!==7 || !set.cards.every(c=>typeof entries.get(c.char)==='string' && /^[ㄅ-ㄩ˙ˉˊˇˋ]{1,5}$/.test(entries.get(c.char)))) throw Error('invalid_answers');
  return set.cards.filter(c=>entries.get(c.char).replace(/ˉ$/,'')===c.reading).length;
}
