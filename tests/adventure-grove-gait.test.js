import test from 'node:test';
import assert from 'node:assert/strict';
import {newEncounter,advanceEncounters,deepGroveWalkable} from '../adventure-exploration-model.js';
import {drawExploration} from '../adventure-exploration-art.js';

test('both clouds hover over a fixed shadow even at rest, and reduced motion holds a neutral pose',()=>{
  function pose(id,art,time,reduced,moving=false){
    const image={naturalWidth:1512,naturalHeight:752},result={};
    const ctx={
      drawImage(source,...args){if(source===image)result.sprite=args;},
      translate(x,y){result.anchor=[x,y];},
      fillRect(...args){result.shadow=args;},
      createRadialGradient(){return {addColorStop(){}};},
      save(){},restore(){},scale(){},beginPath(){},arc(){},fill(){}
    };
    const monster={id,art,x:120,y:140,visible:true,level:id.endsWith('-chief')?2:1,moving,walkDistance:14};
    const scene={area:'grove',encounters:[monster],player:{x:0,y:0},camera:{x:0,y:0},reduced:{matches:reduced},drawPlayer(){}};
    drawExploration(ctx,{exploration:{grove:{},[id]:image}},{},scene,time,false,()=>{});
    return result;
  }
  for(const id of ['cloud','cloud-chief']){
    const start=pose(id,'cloud',0,false),high=pose(id,'cloud',800,false);
    assert.notEqual(start.sprite[0],high.sprite[0]);
    assert.ok(high.sprite[5]<start.sprite[5]);
    assert.deepEqual(start.anchor,high.anchor);
    assert.deepEqual(start.shadow,high.shadow);
    assert.deepEqual(high,pose(id,'cloud',800,false,true));
    assert.deepEqual(pose(id,'cloud',0,true),pose(id,'cloud',800,true,true));
  }
  for(const art of ['acorn','mushroom']){
    assert.deepEqual(pose(art,art,0,false),pose(art,art,800,false));
    assert.notDeepEqual(pose(art,art,0,false),pose(art,art,0,false,true));
  }
});

test('grove patrol advances the gait by actual ground distance and freezes it during a challenge',()=>{
  const group=[0,1,2].map(i=>newEncounter(i,()=>.5));
  const headings=new Set();
  for(const m of group)m.wait=0;
  for(let i=0;i<2400;i++){
    const before=group.map(m=>[m.x,m.y,m.walkDistance||0]);
    advanceEncounters(group,1/60);
    group.forEach((m,j)=>{
      const [x,y,d]=before[j],step=Math.hypot(m.x-x,m.y-y);
      assert.ok(step<=24/60+1e-8);
      assert.ok(Math.abs((m.walkDistance||0)-d-step)<1e-8);
      assert.ok(deepGroveWalkable(m.x,m.y));
      if(m.moving)headings.add([m.direction===3,!!m.away].join('/'));
    });
  }
  assert.equal(headings.size,4);
  const pose=group.map(m=>[m.x,m.y,m.walkDistance]);
  advanceEncounters(group,1,true);
  assert.deepEqual(group.map(m=>[m.x,m.y,m.walkDistance]),pose);
  assert.ok(group.every(m=>!m.moving));
});
