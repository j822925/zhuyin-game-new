import {laneContains,laneRoute} from '../adventure-district-paths.js';
import {battleStageLayout} from '../adventure-battle-layout.js';
import {ISLAND_ROUTES,DESTINATIONS,islandWalkable} from '../adventure-exploration-model.js';
import {islandMapPoint} from '../data/island-map-space.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {AREA_EXITS,createExitProximity} from '../adventure-exits.js';
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


test('open passages are reachable, shops stay solid and all painted routes connect',()=>{
 for(const d of DESTINATIONS){
  assert(islandWalkable(d.entry.x,d.entry.y),d.id);
  if(d.threshold)assert(islandWalkable(d.threshold.x,d.threshold.y),d.id);
  else if(d.id!=='harbor')assert(!islandWalkable(d.x,d.y),d.id);
 }
 for(const line of ISLAND_ROUTES)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6);
  for(let j=0;j<=steps;j++)assert(islandWalkable(a.x+(b.x-a.x)*j/steps,a.y+(b.y-a.y)*j/steps));
 }
});
test('sandcastle lanes and dry beach stay open while painted obstacles stay solid',()=>{
 const feet=(x,y)=>{const p=islandMapPoint(x,y);return islandWalkable(p.x,p.y);};
 for(const [x,y] of [[696,625],[941,707],[980,711],[737,416],[536,554],[567,564],[582,569]])assert(feet(x,y),[x,y].join(','));
 // Sand towers, trees, flowers, lighthouse and shop roofs, and the house beyond the bridge.
 for(const [x,y] of [[719,620],[828,625],[917,580],[974,635],[843,699],[647,527],[640,727],[677,383],[927,430],[853,310],[1070,114],[1490,54],[974,743]])assert(!feet(x,y),[x,y].join(','));
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

test('walking into a district opens it once, with a separate landing on return',()=>{
 for(const d of DESTINATIONS){
  const exit=AREA_EXITS.island.find(e=>e.id===d.id);
  if(!d.zone){assert.equal(exit.interaction,'offer');continue;}
  const tracker=createExitProximity();
  tracker.reset('island',d.entry);
  assert.equal(tracker.poll('island',d.entry),null,d.id);
  assert.equal(tracker.poll('island',d.threshold)?.id,d.id);
  assert.equal(tracker.poll('island',d.threshold),null,d.id);
 }
});
