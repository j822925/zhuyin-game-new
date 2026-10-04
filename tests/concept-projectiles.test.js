import test from 'node:test';
import assert from 'node:assert/strict';
import {conceptAttackEffect} from '../concept-projectiles.js';

test('single thrown card flies continuously toward the opposite actor on either side',()=>{
 for(const side of ['enemy','hero']){
  const origin={x:side==='enemy'?430:530,y:260},direction=side==='enemy'?1:-1;
  const flight=[.43,.47,.55,.65,.74,.78].map(t=>conceptAttackEffect({id:'spade-prince'},t,side,origin));
  for(const card of flight){assert.equal(card.type,'card');assert.equal(card.count,1);assert.ok(direction*(card.target.x-origin.x)>0);assert.equal(card.origin,origin);}
  assert.equal(flight[0].x,origin.x);
  for(let i=1;i<flight.length;i++)assert.ok(direction*(flight[i].x-flight[i-1].x)>0);
  assert.equal(conceptAttackEffect({id:'spade-prince'},.42,side,origin),null);
  assert.equal(conceptAttackEffect({id:'spade-prince'},.8,side,origin),null);
 }
});
test('beam starts at mirror and grows toward opponent before mirror is lowered',()=>{
 for(const side of ['enemy','hero']){
  const origin={x:side==='enemy'?440:520,y:210},direction=side==='enemy'?1:-1;
  const start=conceptAttackEffect({id:'mirror-countess'},.43,side,origin),beam=conceptAttackEffect({id:'mirror-countess'},.55,side,origin);
  assert.deepEqual(start.end,origin);assert.equal(beam.origin,origin);
  assert.ok(direction*(beam.end.x-origin.x)>0);assert.deepEqual(beam.end,beam.target);
  assert.equal(conceptAttackEffect({id:'mirror-countess'},.74,side,origin),null);
 }
});
test('missing weapon origin and unrelated characters do not emit a projectile',()=>{
 assert.equal(conceptAttackEffect({id:'mirror-countess'},.55,'enemy'),null);
 assert.equal(conceptAttackEffect({id:'ember-witch'},.55,'enemy',{x:400,y:200}),null);
});
