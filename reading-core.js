// Shared fourth-level bank/scoring. The teacher chose lenient pronunciation:
// tones and listed near-sounds may pass; no substring, missing or extra syllables.
import {EXTRA_READING_WORDS} from './reading-words.js?v=20260928-all1';
import {LIFE_READING_WORDS} from './reading-life-words.js?v=20261023-life1';
import {RETIRED_READING_WORDS} from './reading-retired-words.js?v=20261023-life1';
import {READING_SCRIPT_FORMS} from './reading-script-forms.js?v=20260930-script1';
import {pronunciationDecision} from './reading-pronunciation.js?v=20261008-safari2';
export const LEGACY_READING_WORDS = [
 ['apple','蘋果','ㄆㄧㄥˊ ㄍㄨㄛˇ','苹果'],
 ['watermelon','西瓜','ㄒㄧ ㄍㄨㄚ'],
 ['banana','香蕉','ㄒㄧㄤ ㄐㄧㄠ'],
 ['grape','葡萄','ㄆㄨˊ ㄊㄠˊ'],
 ['bread','麵包','ㄇㄧㄢˋ ㄅㄠ','面包'],
 ['milk','牛奶','ㄋㄧㄡˊ ㄋㄞˇ'],
 ['school','學校','ㄒㄩㄝˊ ㄒㄧㄠˋ','学校'],
 ['teacher','老師','ㄌㄠˇ ㄕ','老师'],
 ['rainbow','彩虹','ㄘㄞˇ ㄏㄨㄥˊ'],
 ['sun','太陽','ㄊㄞˋ ㄧㄤˊ','太阳'],
 ['rabbit','白兔','ㄅㄞˊ ㄊㄨˋ'],
 ['elephant','大象','ㄉㄚˋ ㄒㄧㄤˋ'],
 ['giraffe','長頸鹿','ㄔㄤˊ ㄐㄧㄥˇ ㄌㄨˋ','长颈鹿'],
 ['tomato','番茄','ㄈㄢ ㄑㄧㄝˊ'],
 ['bicycle','腳踏車','ㄐㄧㄠˇ ㄊㄚˋ ㄔㄜ','脚踏车'],
 ['slide','溜滑梯','ㄌㄧㄡ ㄏㄨㄚˊ ㄊㄧ'],
 ['playground','遊樂場','ㄧㄡˊ ㄌㄜˋ ㄔㄤˇ','游乐场'],
 ['library','圖書館','ㄊㄨˊ ㄕㄨ ㄍㄨㄢˇ','图书馆'],
 ['icecream','冰淇淋','ㄅㄧㄥ ㄑㄧˊ ㄌㄧㄣˊ','冰琪淋'],
 ['sunflower','向日葵','ㄒㄧㄤˋ ㄖˋ ㄎㄨㄟˊ'],
 ['firefly','螢火蟲','ㄧㄥˊ ㄏㄨㄛˇ ㄔㄨㄥˊ','萤火虫'],
 ['strawberry','草莓','ㄘㄠˇ ㄇㄟˊ'],
 ['happy','開開心心','ㄎㄞ ㄎㄞ ㄒㄧㄣ ㄒㄧㄣ','开开心心'],
 ['safe','平平安安','ㄆㄧㄥˊ ㄆㄧㄥˊ ㄢ ㄢ'],
 ['serious','認認真真','ㄖㄣˋ ㄖㄣˋ ㄓㄣ ㄓㄣ','认认真真'],
 ['neat','整整齊齊','ㄓㄥˇ ㄓㄥˇ ㄑㄧˊ ㄑㄧˊ','整整齐齐'],
 ['together','同心協力','ㄊㄨㄥˊ ㄒㄧㄣ ㄒㄧㄝˊ ㄌㄧˋ','同心协力'],
 ['colorful','五顏六色','ㄨˇ ㄧㄢˊ ㄌㄧㄡˋ ㄙㄜˋ','五颜六色'],
 ['rain','下雨','ㄒㄧㄚˋ ㄩˇ'],
 ['book','書本','ㄕㄨ ㄅㄣˇ','书本'],
].map(([id,word,zhuyin,...aliases])=>({id,word,zhuyin,aliases})).concat(EXTRA_READING_WORDS);
// Selection is separate from validation: retired words never enter new rounds,
// while offline/unfinished old rounds retain their original IDs and targets.
export const ALL_READING_WORDS=LEGACY_READING_WORDS.concat(LIFE_READING_WORDS);
export const READING_WORDS=ALL_READING_WORDS.filter(w=>[2,3].includes(w.word.length)&&!RETIRED_READING_WORDS.has(w.word));
// Speech cannot distinguish identical pronunciations (e.g. 姊姊 / 姐姐).
// Accept only known whole-word spellings with exactly the same tones/syllables.
const homophones=new Map();
// Reviewed ASR spellings with identical syllables AND tones. Keep these tied
// to the full pronunciation, never to a similar spelling or partial match.
// 湖泊 / 胡博 = ㄏㄨˊ ㄅㄛˊ (MOE); see READING_SCRIPT_RELEASE.md.
const reviewedHomophones=new Map([['ㄏㄨˊ ㄅㄛˊ',['胡博','胡泊','湖博']]]);
for(const w of ALL_READING_WORDS)w.aliases=[...w.aliases,...(reviewedHomophones.get(w.zhuyin)||[])];
for(const w of ALL_READING_WORDS)w.aliases=[...new Set([...w.aliases,...[w.word,...w.aliases].flatMap(s=>READING_SCRIPT_FORMS[s]||[])])];
for(const w of ALL_READING_WORDS){if(!homophones.has(w.zhuyin))homophones.set(w.zhuyin,new Set());for(const text of [w.word,...w.aliases])homophones.get(w.zhuyin).add(text);}
for(const w of ALL_READING_WORDS)w.aliases=[...homophones.get(w.zhuyin)].filter(text=>text!==w.word);
export const READING_TOTAL=5;
export function normalizeSpeech(text){return String(text??'').normalize('NFKC').replace(/[\s\p{P}]/gu,'');}
function matchesSpelling(word,value){return [word.word,...word.aliases].some(s=>normalizeSpeech(s)===value);}
export function matchesReading(word,text){return readingDecision(word,text)==='correct';}
// Keep the teacher's Han-only recognition policy: undecodable Latin letters,
// digits and mixed scripts retry without grading rather than inventing readings.
export function readingDecision(word,text){
 const value=normalizeSpeech(text);
 if(!value||!/^[\p{Script=Han}]+$/u.test(value))return 'retry';
 return matchesSpelling(word,value)?'correct':pronunciationDecision(word,value);
}
// Safari practice grades all decodable different readings, including words
// outside our question bank. Unknown/ambiguous pronunciations still retry.
export function readingAttemptDecision(word,text){
 return readingDecision(word,text);
}
export function readingStars(correct){return correct===5?3:correct>=3&&correct<5?1:0;}
export function readingDeck(rng=Math.random){
 const shuffled=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 // Three short words and two three-character words; no retired questions.
 const seen=new Set(),unique=shuffled(READING_WORDS).filter(w=>{if(seen.has(w.zhuyin))return false;seen.add(w.zhuyin);return true;});
 const groups=[2,3].map(n=>unique.filter(w=>w.word.length===n));
 return shuffled([...groups[0].slice(0,3),...groups[1].slice(0,2)]);
}
export function validReadingRound(d){
 if(d?.mode!=='reading'||(d.kind!==undefined&&d.kind!=='round')||d.competition||d.total!==5||!Array.isArray(d.results)||d.results.length!==5)return false;
 if(new Set(d.results.map(r=>r?.wordId)).size!==5)return false;
 return Number.isInteger(d.mistakes)&&d.results.filter(r=>r?.firstCorrect===false).length===d.mistakes&&d.results.every(r=>{
  const word=ALL_READING_WORDS.find(w=>w.id===r?.wordId);
  return word&&r.target===word.zhuyin&&typeof r.firstCorrect==='boolean'&&!r.tutorUsed&&!r.tutorReviewOf&&!r.tutorSpacer;
 });
}
// The requested fixed award has no extra perseverance bonus or daily truncation.
export function readingAward(correct){const stars=readingStars(correct);return {stars,baseStars:stars,perfectStars:stars,perseveranceStars:0,competitionStars:0};}
