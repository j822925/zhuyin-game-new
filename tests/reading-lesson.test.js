import test from 'node:test';import assert from 'node:assert/strict';
import {BASE,COMPOUNDS} from '../core.js';
import {READING_WORDS,validReadingRound} from '../reading-core.js';
import {readingTaughtSymbols,readingRequirements,readingPool,readingLessonDeck} from '../reading-lesson.js';
const word=text=>READING_WORDS.find(w=>w.word===text);
test('initials, standalone finals and apical consonants are parsed without inventing extra symbols',()=>{
 assert.deepEqual(readingRequirements(word('老師')),['ㄌ','ㄠ','ㄕ']);
 assert.deepEqual(readingRequirements(word('香蕉')),['ㄒ','ㄧㄤ','ㄐ','ㄧㄠ']);
 assert.deepEqual(readingRequirements(word('爸爸')),['ㄅ','ㄚ']);
 assert.equal(readingRequirements({word:'壞題',zhuyin:'ㄅㄅ ㄚ'}),null);
});
test('every part must be explicitly taught; components do not imply a compound final',()=>{
 const banana=word('香蕉');
 assert.deepEqual(readingPool({symbols:['ㄒ','ㄧ','ㄤ','ㄐ','ㄠ']},[banana]),[]);
 assert.deepEqual(readingPool({symbols:['ㄒ','ㄐ'],compounds:['ㄧㄤ','ㄧㄠ']},[banana]),[banana]);
 assert.deepEqual(readingPool({symbols:['ㄒ'],compounds:['ㄧㄤ','ㄧㄠ']},[banana]),[]);
 assert.deepEqual(readingPool({symbols:['ㄅ','ㄚ']},[word('爸爸')]),[word('爸爸')]);
});
test('missing or empty settings fail closed, and legacy combined symbols normalize consistently',()=>{
 for(const config of [undefined,{}, {symbols:[],compounds:[]},{symbols:'ㄅㄚ'}])assert.equal(readingPool(config).length,0);
 assert.deepEqual(readingTaughtSymbols({symbols:[' ㄅ ','一','ㄧㄠ'],compounds:['ㄧㄠ','ㄅ','bogus']}),['ㄅ','ㄧ','ㄧㄠ']);
});
test('fewer than five qualifying readings trigger a full-bank round; five or more stay in range',()=>{
 const all=readingPool({symbols:BASE,compounds:COMPOUNDS});
 for(let n=0;n<5;n++){const d=readingLessonDeck(all.slice(0,n));assert.equal(d.length,5);assert.ok(d.some(w=>!all.slice(0,n).includes(w)));assert.equal(new Set(d.map(w=>w.zhuyin)).size,5);}
 const twos=all.filter(w=>w.word.length===2).slice(0,8);
 for(let i=0;i<30;i++){const deck=readingLessonDeck(twos);assert.equal(deck.length,5);assert.ok(deck.every(w=>twos.includes(w)));assert.equal(new Set(deck.map(w=>w.zhuyin)).size,5);}
 assert.equal(readingLessonDeck([word('姐姐'),word('姊姊'),...twos.slice(0,2)]).length,5);
 const exactlyFive=twos.slice(0,5);assert.deepEqual(new Set(readingLessonDeck(exactlyFive)),new Set(exactlyFive));
});
test('current lesson and class changes rebuild pools without leaking words from another selection',()=>{
 const main={symbols:['ㄅ','ㄆ','ㄇ','ㄈ','ㄉ','ㄌ','ㄏ','ㄑ','ㄓ','ㄔ','ㄗ','ㄚ','ㄛ','ㄜ','ㄠ','ㄢ','ㄤ','ㄧ','ㄨ','ㄩ'],compounds:[]};
 const a=readingPool(main),b=readingPool({symbols:[],compounds:[]});assert.ok(a.length>=5);assert.equal(b.length,0);
 for(let i=0;i<30;i++){const d=readingLessonDeck(a);assert.equal(d.length,5);assert.ok(d.every(w=>readingRequirements(w).every(s=>main.symbols.includes(s))));assert.ok(validReadingRound({mode:'reading',total:5,mistakes:0,results:d.map(w=>({wordId:w.id,target:w.zhuyin,firstCorrect:true}))}));}
 const changed=readingPool({symbols:['ㄅ','ㄚ'],compounds:[]});assert.ok(changed.length<a.length);assert.ok(changed.every(w=>readingRequirements(w).every(s=>['ㄅ','ㄚ'].includes(s))));
});
test('full taught set preserves 2/2/1 distribution with distinct phonetic questions',()=>{
 const pool=readingPool({symbols:BASE,compounds:COMPOUNDS});
 assert.equal(pool.length,new Set(READING_WORDS.map(w=>w.zhuyin)).size);
 for(let i=0;i<30;i++){const d=readingLessonDeck(pool);assert.deepEqual([2,3,4].map(n=>d.filter(w=>w.word.length===n).length),[2,2,1]);assert.equal(new Set(d.map(w=>w.zhuyin)).size,5);}
});
