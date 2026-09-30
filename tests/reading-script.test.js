import test from 'node:test';import assert from 'node:assert/strict';
import {READING_WORDS,readingDecision,matchesReading,readingStars} from '../reading-core.js';
import {READING_SCRIPT_FORMS} from '../reading-script-forms.js';
const word=text=>{const w=READING_WORDS.find(w=>w.word===text);assert.ok(w,text);return w;};
test('every generated traditional/simplified/mixed spelling preserves exact whole-word acceptance',()=>{
 let checked=0;for(const w of READING_WORDS){assert.equal(readingDecision(w,w.word),'correct');for(const form of READING_SCRIPT_FORMS[w.word]||[]){assert.equal(readingDecision(w,form),'correct',w.word+' / '+form);checked++;}}
 assert.ok(checked>=1000);assert.equal(READING_WORDS.length,1237);
});
test('expanded vocabulary accepts simplified forms without changing displayed targets',()=>{
 for(const [target,heard] of [['電風扇','电风扇'],['圖書館','图书馆'],['頭髮','头发'],['腳踏車','脚踏车'],['學校','学校']]){const w=word(target);assert.equal(readingDecision(w,heard),'correct');assert.equal(w.word,target);}
 assert.equal(readingDecision(word('圖書館'),'「图書馆」。'),'correct');
});
test('the reported Múma case and other romanization are ungraded retries, never automatic passes',()=>{
 for(const text of ['Múma','Muma','mù mǎ','mu4 ma3','Ｍｕｍａ','木ma','5颜6色','ㄇㄨˋ ㄇㄚˇ','',null])assert.equal(readingDecision(word('木馬'),text),'retry');
 assert.equal(matchesReading(word('木馬'),'Múma'),false);assert.equal(readingDecision(word('木馬'),'木马'),'correct');
});
test('different Chinese words, extra speech and wrong tones in Chinese spelling do not gain credit',()=>{
 for(const text of ['木瓜','媽媽','木麻','这是木马','木马木马'])assert.equal(readingDecision(word('木馬'),text),'incorrect');
 assert.equal(readingDecision(word('學校'),'学生'),'incorrect');assert.deepEqual([readingStars(5),readingStars(3),readingStars(2)],[3,1,0]);
});
