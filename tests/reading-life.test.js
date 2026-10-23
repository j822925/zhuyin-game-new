import test from 'node:test';
import assert from 'node:assert/strict';
import {READING_WORDS,LEGACY_READING_WORDS,ALL_READING_WORDS,readingDeck,validReadingRound,readingDecision,readingStars} from '../reading-core.js';
import {LIFE_READING_WORDS} from '../reading-life-words.js';
import {RETIRED_READING_WORDS} from '../reading-retired-words.js';
import {readingRequirements,readingLessonDeck,readingPool} from '../reading-lesson.js';
import {BASE,COMPOUNDS} from '../core.js';
const payload=words=>({mode:'reading',kind:'round',total:5,mistakes:0,results:words.map(w=>({wordId:w.id,target:w.zhuyin,firstCorrect:true}))});
test('exactly 300 genuinely new everyday terms, valid syllables and stable unique IDs',()=>{
 assert.equal(LIFE_READING_WORDS.length,300);
 const oldWords=new Set(LEGACY_READING_WORDS.map(w=>w.word));
 assert.equal(new Set(ALL_READING_WORDS.map(w=>w.id)).size,ALL_READING_WORDS.length);
 assert.equal(new Set(ALL_READING_WORDS.map(w=>w.word)).size,ALL_READING_WORDS.length);
 for(const w of LIFE_READING_WORDS){assert(!oldWords.has(w.word),w.word);assert(READING_WORDS.some(q=>q.id===w.id));assert(readingRequirements(w),w.word);assert.equal(readingDecision(w,w.word),'correct',w.word);}
 assert.equal(new Set(LIFE_READING_WORDS.map(w=>w.category)).size,10);
});
test('all 159 four-character and 46 less familiar words are excluded only from new rounds',()=>{
 assert.equal(LEGACY_READING_WORDS.length,1237);
 assert.equal(LEGACY_READING_WORDS.filter(w=>w.word.length===4).length,159);
 assert.equal(RETIRED_READING_WORDS.size,46);
 assert.equal(READING_WORDS.length,1332);
 for(const word of RETIRED_READING_WORDS){assert(LEGACY_READING_WORDS.some(w=>w.word===word));assert(!READING_WORDS.some(w=>w.word===word));}
 assert(READING_WORDS.every(w=>w.word.length===2||w.word.length===3));
 const archived=LEGACY_READING_WORDS.filter(w=>!READING_WORDS.includes(w));
 assert(validReadingRound(payload(archived.slice(0,5))),'old pending rounds still save');
 assert.equal(readingRequirements(archived.find(w=>w.word.length===4)),null);
});
test('many full-bank and sparse-selection rounds contain five different active readings only',()=>{
 const active=new Set(READING_WORDS.map(w=>w.id));let state=200;
 const rng=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<200;i++)for(const deck of [readingDeck(rng),readingLessonDeck([],rng),readingLessonDeck(LEGACY_READING_WORDS,rng)]){
  assert.equal(deck.length,5);assert.equal(new Set(deck.map(w=>w.zhuyin)).size,5);assert(deck.every(w=>active.has(w.id)));assert(validReadingRound(payload(deck)));
 }
});
test('new vocabulary obeys teacher symbol selection and all 300 can be submitted in five-word rounds',()=>{
 const pool=readingPool({symbols:BASE,compounds:COMPOUNDS});
 for(let i=0;i<LIFE_READING_WORDS.length;i+=5)assert(validReadingRound(payload(LIFE_READING_WORDS.slice(i,i+5))));
 const narrow=readingPool({symbols:['ㄒ','ㄧ','ㄇ','ㄠ','ㄍ','ㄡ','ㄠ','ㄨ'],compounds:['ㄧㄠ']});
 assert(!narrow.some(w=>w.word==='小黃瓜'));
 for(const w of LIFE_READING_WORDS)assert(pool.some(q=>q.zhuyin===w.zhuyin));
 const d=payload(LIFE_READING_WORDS.slice(0,5));d.results[0].target='ㄘㄨㄛˋ';assert.equal(validReadingRound(d),false);
 assert.deepEqual([0,1,2,3,4,5].map(readingStars),[0,0,0,1,1,3]);
});
