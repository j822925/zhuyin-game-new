import test from 'node:test';import assert from 'node:assert/strict';
import {spellingParts,spellingChoices,Round} from '../core.js';
const pool=[{id:'x',initial:'ㄑ',final:'ㄧ',label:'ㄑㄧ'}, {id:'y',initial:'ㄓ',final:'',label:'ㄓ'}, {id:'z',initial:'ㄚ',final:'',label:'ㄚ'}, {id:'c',initial:'ㄩㄣ',final:'',label:'ㄩㄣ'}];
test('two semantic slots: consonant first, standalone vowel or compound second',()=>{
 assert.deepEqual(spellingParts(pool[2]),{...pool[2],initial:'',final:'ㄚ'});
 assert.deepEqual(spellingParts(pool[3]),{...pool[3],initial:'',final:'ㄩㄣ'});
 assert.deepEqual(spellingParts(pool[1]),pool[1]);
 assert.deepEqual(spellingParts(spellingParts(pool[2])),spellingParts(pool[2]));
});
test('blank can distract for 七, and is required for a missing part; no untaught symbols',()=>{
 for(const q of pool)for(const rng of [()=>0,()=>.999]){
  const choices=spellingChoices(q,pool,rng),p=spellingParts(q);
  for(const k of ['initial','final']){assert(choices[k].includes(p[k]));assert.equal(new Set(choices[k]).size,choices[k].length);assert(choices[k].length<=4);}
  assert(choices.initial.every(x=>['','ㄑ','ㄓ'].includes(x)));
  assert(choices.final.every(x=>['','ㄧ','ㄚ','ㄩㄣ'].includes(x)));
 }
 assert(spellingChoices(pool[0],pool,()=>0).final.includes(''));
 assert(!spellingChoices(pool[0],pool,()=>.999).final.includes(''));
 const r=new Round([pool[0]]);assert.equal(r.answer('ㄑ').correct,false);assert.equal(r.answer('ㄑㄧ').correct,true);
 const vowel=new Round([spellingParts(pool[2])]);assert.equal(vowel.useTutor(pool).ignored,undefined);
});
