import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVisitRoomLayouts} from '../island-visits-ui.js';
import {FURNITURE} from '../adventure-model.js';
import {canonicalMountedPosition} from '../home-spatial-model.js';
import {wallPosition} from '../data/home-wall-furniture.js';
import {attachedPosition} from '../furniture-surfaces.js';

test('visitors see old mounted furniture and attached appliances aligned without changing the snapshot',()=>{
 const source={wallpaper:'moon',layout:[],bedroomLayout:[],bathroomLayout:[],kitchenLayout:[
  {id:'collection-port-4',x:500,y:200,on:'collection-moon-kitchen-base',surface:0,offsetX:10},
  {id:'collection-moon-kitchen-base',x:500,y:345,mount:'back',facing:'front'},
  {id:'collection-moon-kitchen-wall',x:160,y:260,mount:'left',facing:'left'},
  {id:'collection-moon-dining-chair',x:700,y:600,facing:'left'},
 ]},before=structuredClone(source),result=normalizeVisitRoomLayouts(source);
 const host=result.kitchenLayout.find(item=>item.id==='collection-moon-kitchen-base'),wall=result.kitchenLayout.find(item=>item.id==='collection-moon-kitchen-wall'),child=result.kitchenLayout[0];
 assert.deepEqual(host,{id:host.id,...canonicalMountedPosition(source.kitchenLayout[1],FURNITURE.find(f=>f.id===host.id))});
 assert.deepEqual(wall,{id:wall.id,...wallPosition(source.kitchenLayout[2],FURNITURE.find(f=>f.id===wall.id))});
 assert.deepEqual(child,{id:child.id,...attachedPosition(child,result.kitchenLayout,FURNITURE)});assert.notEqual(child.y,before.kitchenLayout[0].y);
 assert.deepEqual(result.kitchenLayout[3],before.kitchenLayout[3]);assert.deepEqual(source,before);
 assert(!('furnitureOwned' in result));assert(!('stars' in result));assert.deepEqual(normalizeVisitRoomLayouts(result),result);
});

test('display normalization neither invents starter items nor changes ownership or free placements',()=>{
 const source={furnitureOwned:['unrelated'],stars:73,layout:[{id:'table',x:620,y:500}],bedroomLayout:[],kitchenLayout:[],bathroomLayout:[]},before=structuredClone(source),result=normalizeVisitRoomLayouts(source);
 assert.deepEqual(result,before);assert.deepEqual(source,before);assert.notEqual(result.layout,source.layout);assert.notEqual(result.layout[0],source.layout[0]);
 assert.deepEqual(normalizeVisitRoomLayouts({kitchenLayout:[{id:'unknown',x:1,y:2}]}).kitchenLayout,[]);
});
