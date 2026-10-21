import test from 'node:test';
import assert from 'node:assert/strict';
import {islandCamera,islandZoomLimits,zoomIsland,createMapGesture} from '../adventure-map-zoom.js';
import {ISLAND_WORLD} from '../adventure-exploration-model.js';
test('full island fits landscape and portrait, with centered margins and bounded detail zoom',()=>{
 for(const [w,h] of [[1024,768],[768,1024],[390,844],[1920,1080]]){
  const {min,max}=islandZoomLimits(w,h),c=islandCamera({scale:0,x:99999,y:-99999},w,h);
  assert.equal(c.scale,min);assert.ok(ISLAND_WORLD.width*min<=w);assert.ok(ISLAND_WORLD.height*min<=h);
  assert.ok(-c.x*min>=0);assert.ok(-c.y*min>=0);
  assert.ok((ISLAND_WORLD.width-c.x)*min<=w+.001);assert.ok((ISLAND_WORLD.height-c.y)*min<=h+.001);
  const close=islandCamera({scale:99,x:99999,y:-99999},w,h);assert.equal(close.scale,max);assert.equal(close.y,0);assert.equal(close.x,ISLAND_WORLD.width-w/max);
 }
});
test('pinch preserves world point below moving midpoint and clamps at shoreline without empty overscroll',()=>{
 const c={scale:.7,x:1100,y:900},from={x:410,y:280},to={x:450,y:310};
 const z=zoomIsland(c,1024,768,1.2,from,to);
 assert.ok(Math.abs((c.x+from.x/c.scale-z.x)*z.scale-to.x)<1e-8);
 assert.ok(Math.abs((c.y+from.y/c.scale-z.y)*z.scale-to.y)<1e-8);
 const edge=zoomIsland(c,1024,768,100,from,{x:-1e6,y:1e6});assert.equal(edge.y,0);assert.ok(edge.x+1024/edge.scale<=3840);
 const rotated=islandCamera(z,768,1024);assert.ok(rotated.y+1024/rotated.scale<=2400);
});
function fixture(){const calls=[];const api={camera:()=>({scale:1,x:500,y:500}),stop:()=>calls.push('stop'),start:()=>calls.push('pinch'),tap:(p,t)=>calls.push(['tap',t]),zoom:(...a)=>calls.push(['zoom',...a])};return {calls,g:createMapGesture(api)};}
test('touch tap waits for release; adding second finger never walks or opens a shop',()=>{
 const {g,calls}=fixture();g.down(1,{x:100,y:100},'shop');assert.equal(calls.filter(x=>Array.isArray(x)).length,0);
 g.down(2,{x:200,y:100},'map');g.move(2,{x:300,y:100});assert.equal(calls.at(-1)[2],2);
 g.up(1);g.move(2,{x:400,y:200});g.up(2);assert.equal(calls.filter(x=>x[0]==='tap').length,0);assert.equal(g.active,false);
 g.down(3,{x:100,y:100},'shop');g.up(3);assert.deepEqual(calls.at(-1),['tap','shop']);
});
test('cancel, third finger, drag and interrupted sequences cannot cause phantom taps',()=>{
 const {g,calls}=fixture();g.down(1,{x:1,y:1},'map');g.up(1,true);
 g.down(2,{x:1,y:1},'map');g.move(2,{x:40,y:40});g.up(2);
 g.down(3,{x:100,y:100},'map');g.down(4,{x:200,y:100},'shop');g.down(5,{x:300,y:100},'map');g.up(4);g.move(5,{x:350,y:100});g.up(3);g.up(5);
 g.down(6,{x:1,y:1},'shop');g.reset();g.up(6);
 assert.equal(g.active,false);assert.equal(calls.filter(x=>x[0]==='tap').length,0);
});
