import {laneContains,laneRoute} from '../adventure-district-paths.js';
import {battleStageLayout} from '../adventure-battle-layout.js';
import {ISLAND_ROUTES,DESTINATIONS,islandWalkable} from '../adventure-exploration-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {ZONES} from '../data/adventure-zones.js';
import {neighborhoods,neighborhoodArt,regionalBattleArt} from '../data/island-neighborhoods.js';
import {districtLayout} from '../data/neighborhood-landmarks.js';
import {fieldWalkable,fieldPoint} from '../adventure-expedition-field.js';

test('each expedition has a unique community, resident and three distinct landscapes',()=>{
 const names=new Set(),residents=new Set(),sources=new Set();
 for(const {id} of ZONES){
  const {name,sprite,lines}=neighborhoods[id];
  names.add(name);residents.add(sprite);assert.equal(lines.length,2);
  assert(existsSync(new URL('../assets/neighborhoods/resident-'+sprite+'.webp',import.meta.url)));
  for(const src of [neighborhoodArt(id),neighborhoodArt(id,true),regionalBattleArt(id)]){
   const data=readFileSync(new URL('../'+src,import.meta.url));
   assert.equal(data.toString('ascii',8,12),'WEBP');sources.add(data.toString('base64',0,1024));
  }
 }
 assert.equal(names.size,10);assert.equal(residents.size,10);assert.equal(sources.size,30);
});

test('every shop, guardian clearing and residential gate has a reachable approach',()=>{
 for(const {id} of ZONES){
  const layout=districtLayout(id);
  for(const [x,y] of [layout.shop,layout.boss,layout.gate,layout.entry]){
   const p=fieldPoint(id,{x,y});
   assert(fieldWalkable(id,p));assert(Math.hypot(x-p.x,y-p.y)<3.5,id);
  }
  assert(fieldWalkable(id,{x:layout.gateApproach[0],y:layout.gateApproach[1]}));
 }
});


test('signed thresholds are walkable, building faces are solid and trails bypass the arches',()=>{
 for(const d of DESTINATIONS){
  assert(islandWalkable(d.entry.x,d.entry.y),d.id);
  if(d.id!=='harbor')assert(!islandWalkable(d.x,d.y),d.id);
 }
 for(const line of ISLAND_ROUTES)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6);
  for(let j=0;j<=steps;j++)assert(islandWalkable(a.x+(b.x-a.x)*j/steps,a.y+(b.y-a.y)*j/steps));
 }
});
test('ground navigation reaches every resident and shop',()=>{
 const point=([x,y])=>({x,y});
 for(const {id} of ZONES){
  const l=districtLayout(id);
  for(const [a,b,village] of [[l.spawn,l.shop,false],[l.spawn,l.boss,false],[l.spawn,l.gate,false],[l.villageSpawn,l.resident,true]]){
   const path=laneRoute(l,point(a),point(b),village);assert(path.length,id);
   assert(path.every(p=>laneContains(l,p,village)),id);
  }
 }
});
test('regional sparring keeps the far enemy and near hero above the answer panel',()=>{
 for(const [w,h] of [[1024,768],[768,1024],[844,390]]){
  const {foe,player}=battleStageLayout(w,h,h*.54,h*.12);
  assert(foe.x+foe.width<player.x-player.width/2);
  assert(foe.y>=h*.12&&foe.y+foe.height<player.y&&player.y<h*.54);
 }
});
