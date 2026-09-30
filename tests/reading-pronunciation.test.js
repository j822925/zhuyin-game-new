import test from 'node:test';
import assert from 'node:assert/strict';
import {READING_WORDS,readingDecision,matchesReading} from '../reading-core.js';
import {pronunciationDecision} from '../reading-pronunciation.js';
import {PRONUNCIATIONS,PRONUNCIATION_SYLLABLES,PRONUNCIATION_METADATA} from '../reading-pronunciation-data.js';
const word=text=>{const w=READING_WORDS.find(w=>w.word===text);assert.ok(w,text);return w;};

test('whole syllables and tones accept homophones beyond handwritten exceptions',()=>{
 for(const [target,heard] of [['木馬','牧瑪'],['木馬','牧玛'],['公園','工圓'],['公園','工圆'],['香蕉','香交'],['西瓜','吸刮'],['電風扇','店封善'],['開開心心','揩揩新新'],['湖泊','壺博']]){
  assert.equal(readingDecision(word(target),heard),'correct',target+' / '+heard);
  assert.equal(matchesReading(word(target),heard),true);
  assert.equal(word(target).word,target);
 }
});

test('different syllables and tones do not pass just because characters sound similar',()=>{
 for(const [target,heard] of [['木馬','木麻'],['木馬','母馬'],['湖泊','胡波'],['湖泊','虎博'],['老師','勞師'],['公園','公怨'],['學校','學生']])assert.equal(readingDecision(word(target),heard),'incorrect',target+' / '+heard);
});

test('known words constrain polyphonic characters before per-character comparison',()=>{
 assert.equal(pronunciationDecision({zhuyin:'ㄧㄣˊ ㄏㄤˊ'},'銀行'),'correct');
 assert.equal(pronunciationDecision({zhuyin:'ㄧㄣˊ ㄒㄧㄥˊ'},'銀行'),'incorrect');
 assert.equal(pronunciationDecision({zhuyin:'ㄓㄨㄥ ㄒㄧㄣ'},'重心'),'incorrect');
 assert.equal(pronunciationDecision({zhuyin:'ㄧㄣ ㄌㄜˋ'},'音樂'),'incorrect');
});

test('unknown characters and unresolved polyphonic spellings retry without inventing a reading',()=>{
 assert.equal(pronunciationDecision({zhuyin:'ㄇㄨˋ ㄇㄚˇ'},'𰻞馬'),'retry');
 assert.equal(pronunciationDecision({zhuyin:'ㄒㄧㄥˊ ㄇㄚˇ'},'行瑪'),'retry');
 assert.equal(readingDecision(word('木馬'),'Múma'),'retry');
 assert.equal(readingDecision(word('木馬'),'mu4 ma3'),'retry');
});

test('neutral tones and syllable order remain meaningful',()=>{
 assert.equal(pronunciationDecision({zhuyin:'ㄇㄚ ㄇㄚ˙'},'媽媽'),'correct');
 assert.equal(pronunciationDecision({zhuyin:'ㄇㄚ ㄇㄚ'},'媽媽'),'incorrect');
 assert.equal(pronunciationDecision({zhuyin:'ㄇㄚ ˙ㄇㄚ'},'媽媽'),'correct');
 assert.equal(readingDecision(word('木馬'),'瑪牧'),'incorrect');
 for(const heard of ['牧','牧瑪牧瑪','這是牧瑪'])assert.equal(readingDecision(word('木馬'),heard),'incorrect');
});

test('every indexed pronunciation decodes to the exact recorded syllable sequence',()=>{
 let count=0;for(const [text,codes] of Object.entries(PRONUNCIATIONS))for(const code of codes.split('|')){
  const syllables=code.split('.').map(id=>PRONUNCIATION_SYLLABLES[parseInt(id,36)]);
  assert.equal(syllables.length,Array.from(text).length,text);
  assert.ok(syllables.every(s=>/^[ㄅ-ㄩ]{1,3}[ˊˇˋ˙]?$/.test(s)),text);
  assert.equal(pronunciationDecision({zhuyin:syllables.join(' ')},text),'correct',text);count++;
 }
 assert.ok(count>80000);assert.equal(PRONUNCIATION_METADATA.spellings,Object.keys(PRONUNCIATIONS).length);
});
