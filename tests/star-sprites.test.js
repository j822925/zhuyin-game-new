import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {STAR_CARDS} from '../data/star-cards.js';
import {STAR_SPRITES} from '../data/star-sprites.js';
import {PROFILE_CHARACTERS} from '../student-profile.js';
import {portrait} from '../characters.js';
test('every earned star has independent full-body art for daily play without changing collectible art',()=>{
 assert.deepEqual(Object.keys(STAR_SPRITES).sort(),STAR_CARDS.map(c=>c.id).sort());
 for(const c of STAR_CARDS){
  const p=PROFILE_CHARACTERS.find(p=>p.id===c.id);assert.equal(p.image,STAR_SPRITES[c.id]);assert.notEqual(p.image,c.image);
  assert.match(c.image,/star-envoy-cards\//);assert.match(portrait(p),/star-envoy-sprites\//);
  assert.ok(existsSync(new URL('../'+p.image,import.meta.url)),p.image);
  const png=readFileSync(new URL('../'+p.image,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6,'RGBA transparent sprite '+c.id);
 }
});
test('collection and full-score prize still use the original card art',()=>{
 const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 assert.match(read('star-prize.js'),/image.src=c.image/);assert.match(read('star-cards-ui.js'),/img.src=c.image/);
 assert.doesNotMatch(read('star-cards-ui.js'),/STAR_SPRITES/);
 assert.match(read('app.js'),/student-profile.js\?v=20260920-sprites1/);
 assert.match(read('exam.js'),/student-profile.js\?v=20260920-sprites1/);
});
