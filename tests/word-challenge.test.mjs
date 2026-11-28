import test from 'node:test';
import assert from 'node:assert/strict';
import bank from '../data/word-challenge-bank.json' with {type:'json'};
import teachers from '../tone-questions.json' with {type:'json'};
import {wordSpeaker} from '../word-challenge-audio.js';
import {expectedReading} from '../word-challenge-core.js';

test('dictionary readings align with every character and use every matching approved whole-word teacher clip',()=>{
  const keys=s=>s.trim().split(/\s+/).map(expectedReading).join(' ');
  const exact=new Map(teachers.questions.filter(q=>q.enabled&&!teachers.disabledIds.includes(q.id)&&q.creator==='老師親自錄製').map(q=>[q.text+' '+keys(q.zhuyin),q.id]));
  assert.equal(new Set(bank.map(r=>r[0])).size,bank.length);
  for(const [word,reading,id] of bank){
    assert.equal(Array.from(word).length,reading.trim().split(/\s+/).length);
    assert.equal(id,exact.get(word+' '+keys(reading)),word);
  }
});
test('play the exact teacher clip, speak the whole word on missing or failed audio, and discard cancelled callbacks',async()=>{
  const spoken=[],urls=[],notes=[],synth={cancel(){},getVoices:()=>[{lang:'zh-TW'}],speak:u=>spoken.push([u.text,u.voice.lang])};
  class Utterance{constructor(text){this.text=text;}}
  let fail=false,reject;
  const player={stop(){},play(url){urls.push(url);return fail?Promise.reject(Error()):Promise.resolve();}};
  const speaker=wordSpeaker(s=>notes.push(s),{player,synth,Utterance});
  await speaker.play({word:'筆記本',clip:'T0001'});assert.match(urls[0],/T0001\.mp3$/);assert.deepEqual(spoken,[]);
  await speaker.play({word:'潮汐'});fail=true;await speaker.play({word:'吃飯',clip:'T0002'});
  assert.deepEqual(spoken,[['潮汐','zh-TW'],['吃飯','zh-TW']]);
  player.play=()=>new Promise((_,r)=>{reject=r;});const pending=speaker.play({word:'吃飯',clip:'T0002'});
  speaker.stop();reject(Error());await pending;assert.equal(spoken.length,2);assert.deepEqual(notes,[]);
});
