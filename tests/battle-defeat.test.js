import test from 'node:test';
import assert from 'node:assert/strict';
import {battlePose} from '../battle-sprite.js';
import {BATTLE_META} from '../data/battle-catalog.js';

test('Cotton Rabbit loses with a sad pose, while the reward still holds a star',()=>{
 for(const reduced of [false,true])for(const t of [0,.5,1]){
  const lost=battlePose('rabbit','defeated',t,reduced);
  assert.equal(lost.frame,4);
  assert.equal(lost.face,1);
  assert.equal(battlePose('rabbit','star',t,reduced).frame,7);
 }
});

test('All authored allies avoid the reward pose when defeated and retain their explicit override',()=>{
 const allies=Object.entries(BATTLE_META).filter(([,meta])=>!meta.enemy&&!meta.concept);
 assert.ok(allies.length>=60);
 for(const [id,meta] of allies)for(const reduced of [false,true]){
  const lost=battlePose(id,'defeated',1,reduced);
  assert.equal(lost.frame,meta.defeatedFrame??4,id);
  assert.notEqual(lost.frame,battlePose(id,'star',1,reduced).frame,id);
 }
});

test('Enemies keep their authored defeat pose and victory remains separate',()=>{
 for(const [id,meta] of Object.entries(BATTLE_META).filter(([,meta])=>meta.enemy&&!meta.concept)){
  assert.equal(battlePose(id,'defeated',1).frame,meta.defeatedFrame??7,id);
  assert.equal(battlePose(id,'victory',1).frame,6,id);
 }
});
