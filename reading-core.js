// Shared word bank and scoring for the fourth level. No fuzzy/substring matching:
// a longer sentence or a similar-sounding word must not earn a correct answer.
export const READING_WORDS = [
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
].map(([id,word,zhuyin,...aliases])=>({id,word,zhuyin,aliases}));
export const READING_TOTAL=5;
export function normalizeSpeech(text){return String(text??'').normalize('NFKC').replace(/[\s\p{P}]/gu,'');}
export function matchesReading(word,text){const value=normalizeSpeech(text);return !!value&&[word.word,...word.aliases].some(s=>normalizeSpeech(s)===value);}
export function readingStars(correct){return correct===5?3:correct>=3&&correct<5?1:0;}
export function readingDeck(rng=Math.random){
 const shuffled=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 // Every round includes 2-, 3- and 4-character vocabulary, without repeats.
 const groups=[2,3,4].map(n=>shuffled(READING_WORDS.filter(w=>w.word.length===n)));
 return shuffled([...groups[0].slice(0,2),...groups[1].slice(0,2),groups[2][0]]);
}
export function validReadingRound(d){
 if(d?.mode!=='reading'||(d.kind!==undefined&&d.kind!=='round')||d.competition||d.total!==5||!Array.isArray(d.results)||d.results.length!==5)return false;
 if(new Set(d.results.map(r=>r?.wordId)).size!==5)return false;
 return Number.isInteger(d.mistakes)&&d.results.filter(r=>r?.firstCorrect===false).length===d.mistakes&&d.results.every(r=>{
  const word=READING_WORDS.find(w=>w.id===r?.wordId);
  return word&&r.target===word.zhuyin&&typeof r.firstCorrect==='boolean'&&!r.tutorUsed&&!r.tutorReviewOf&&!r.tutorSpacer;
 });
}
// The requested fixed award has no extra perseverance bonus or daily truncation.
export function readingAward(correct){const stars=readingStars(correct);return {stars,baseStars:stars,perfectStars:stars,perseveranceStars:0,competitionStars:0};}
