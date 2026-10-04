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

test('ink and coin bursts launch at the weapon and travel continuously toward either opponent',()=>{
 for(const [id,type,count] of [['ink-book-spirit','ink',9],['coin-mimic','coins',7]])for(const side of ['enemy','hero']){
  const origin={x:side==='enemy'?460:500,y:280},d=side==='enemy'?1:-1;
  const at=t=>conceptAttackEffect({id},t,side,origin);
  assert.equal(at(.42),null);assert.equal(at(.91),null);assert.equal(conceptAttackEffect({id},.55,side),null);
  const start=at(.43);assert.equal(start.particles.length,1);assert.equal(start.particles[0].x,origin.x);assert.equal(start.particles[0].y,origin.y);
  const burst=at(.58);assert.equal(burst.type,type);assert.equal(burst.origin,origin);assert.equal(burst.particles.length,count);
  assert.ok(d*(burst.target.x-origin.x)>0);
  for(const t of [.47,.55,.64,.72]){const a=at(t),b=at(t+.01);for(const p of a.particles){const next=b.particles.find(n=>n.index===p.index);if(next)assert.ok(d*(next.x-p.x)>0,'particle must advance without teleporting');}}
  for(const p of burst.particles){assert.ok(p.alpha>=0&&p.alpha<=1);assert.ok(d*(p.x-origin.x)>=0);assert.ok(p.radius>0);}
  assert.deepEqual(at(.58),at(.58),'deterministic burst positions avoid flicker');
 }
});
