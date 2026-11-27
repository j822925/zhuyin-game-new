import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {ZONES} from '../data/adventure-zones.js';
import {neighborhoods,neighborhoodArt} from '../data/island-neighborhoods.js';
import {districtLayout} from '../data/neighborhood-landmarks.js';
import {fieldWalkable,fieldPoint} from '../adventure-expedition-field.js';

test('each expedition has a unique community, resident and two separate landscape images',()=>{
 const names=new Set(),residents=new Set(),sources=new Set();
 for(const {id} of ZONES){
  const {name,sprite,lines}=neighborhoods[id];
  names.add(name);residents.add(sprite);assert.equal(lines.length,2);
  assert(existsSync(new URL('../assets/neighborhoods/resident-'+sprite+'.webp',import.meta.url)));
  for(const village of [false,true]){
   const data=readFileSync(new URL('../'+neighborhoodArt(id,village),import.meta.url));
   assert.equal(data.toString('ascii',8,12),'WEBP');sources.add(data.toString('base64',0,1024));
  }
 }
 assert.equal(names.size,10);assert.equal(residents.size,10);assert.equal(sources.size,20);
});

test('every shop, guardian clearing and residential gate has a reachable approach',()=>{
 for(const {id} of ZONES){
  const layout=districtLayout(id);
  for(const [x,y] of [layout.shop,layout.boss,layout.gate,layout.entry]){
   const p=fieldPoint(id,{x,y});
   assert(fieldWalkable(id,p));assert(Math.hypot(x-p.x,y-p.y)<3.5,id);
  }
  assert(fieldWalkable(id,{x:layout.gate[0],y:layout.gate[1]+7}));
 }
});

