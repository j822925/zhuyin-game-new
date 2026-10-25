import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE,freshState,sanitizeState,canPlaceFurniture,placeFurniture,layoutFor,ROOM_ENTRY,canReachInterior} from '../adventure-model.js';
import {HOME_FLOOR,HOME_DOOR_SPACE,floorPosition,placementBlocksDoor,spatialFootprint,spatialFloorValid} from '../home-spatial-model.js';
import {wallPosition,wallPlacementValid} from '../data/home-wall-furniture.js';
import {freeSurfacePosition,attachedPosition} from '../furniture-surfaces.js';
const item=id=>FURNITURE.find(f=>f.id===id);
const owned=()=>({...freshState(),furnitureOwned:FURNITURE.map(f=>f.id),layout:[],kitchenLayout:[],bedroomLayout:[],bathroomLayout:[]});

test('side-mounted cabinets stop before actual room doorways, leaving the opposite wall usable',()=>{
 const f=item('collection-moon-kitchen-base'),left=floorPosition({x:200,y:700},f,{area:'kitchen'}),right=floorPosition({x:1080,y:700},f,{area:'kitchen'});
 assert(left.y+f.surfaceWidth/2<=HOME_DOOR_SPACE.start-HOME_DOOR_SPACE.margin);
 assert(right.y>left.y+100,'the kitchen has no door on the right wall');
 assert(right.y+f.surfaceWidth/2<=HOME_FLOOR.front-5);
 for(const area of ['room','bedroom','kitchen','bathroom'])for(const side of ['left','right']){
  const p=floorPosition({x:side==='left'?200:1080,y:700},f,{area});
  assert(!placementBlocksDoor(f,p,area));assert(spatialFloorValid(f,p));if(f.areas.includes(area))assert(canPlaceFurniture(owned(),f.id,p,area));
 }
});

test('door keep-clear applies to new floor objects and wall cabinets but never deletes a legacy free layout',()=>{
 const s=owned(),id='moon-complete-cabinet',f=item(id),blocked={x:250,y:680,facing:'front'};
 assert(placementBlocksDoor(f,blocked,'room'));assert(!canPlaceFurniture(s,id,blocked,'room'));
 assert(!placeFurniture(s,id,blocked,ROOM_ENTRY,'room'));
 s.layout=[{id,...blocked}];const restored=sanitizeState(s);
 assert.deepEqual(restored.layout,s.layout,'keep the previously purchased and placed cabinet');
 assert.deepEqual(restored.furnitureOwned,s.furnitureOwned);
 assert.deepEqual(sanitizeState(restored).layout,restored.layout);
 const cabinet=item('collection-moon-kitchen-wall');
 for(const area of ['room','bedroom','kitchen','bathroom'])for(const side of ['left','right']){
  const p=wallPosition({x:side==='left'?160:1120,y:470},cabinet,area);
  assert(!placementBlocksDoor(cabinet,p,area));assert(wallPlacementValid(cabinet,p,area));if(cabinet.areas.includes(area))assert(canPlaceFurniture(s,cabinet.id,p,area));
 }
});

test('painted upper cabinets leave a visible door-frame gap only on walls with doors',()=>{
 const f=item('collection-moon-kitchen-wall'),left={x:160,y:470,mount:'left'},right={x:1120,y:470,mount:'right'};
 assert.equal(wallPosition(left,f,'kitchen').y,310);
 assert.equal(wallPosition(right,f,'kitchen').y,470,'the door-free kitchen wall keeps its full hanging range');
 assert.equal(wallPosition(right,f,'bathroom').y,310);
 assert.equal(wallPosition(left,f,'bathroom').y,470,'the bathroom has no left door');
 for(const area of ['room','bedroom'])for(const p of [left,right])assert.equal(wallPosition(p,f,area).y,310);
 const tooClose={x:165,y:330,mount:'left',facing:'left'};
 assert(placementBlocksDoor(f,tooClose,'kitchen'));
 assert(!canPlaceFurniture(owned(),f.id,tooClose,'kitchen'),'legacy coordinate tolerance is not a new-placement bypass');
});

test('corner kitchens leave the full door approach clear in both orientations',()=>{
 for(const style of ['daisy','fox','moon','honey','ocean','berry']){
  const f=item('spatial-'+style+'-corner-kitchen');
  for(const x of [180,1100]){
   const s=owned(),p=floorPosition({x,y:700},f,{area:'kitchen'}),r=spatialFootprint(f,p);
   assert(r.y+r.h<=550);assert(r.y+r.h+40<=HOME_DOOR_SPACE.start);
   assert(!placementBlocksDoor(f,p,'kitchen'));assert(placeFurniture(s,f.id,p,ROOM_ENTRY,'kitchen'));
   assert(canReachInterior(s,ROOM_ENTRY,'kitchen'));
  }
 }
});

test('an oven on the far right countertop remains reachable and keeps its chosen facing after reload',()=>{
 const s=owned(),base=item('collection-moon-kitchen-base'),host={id:base.id,...floorPosition({x:1080,y:730},base,{area:'kitchen'})};
 s.kitchenLayout=[host];
 const p={...freeSurfacePosition('collection-port-3',host,0,s.kitchenLayout,FURNITURE),facing:'left'};
 assert(p.x>1100,'the sprite is above the side counter, outside the floor walking corridor');
 assert(placeFurniture(s,'collection-port-3',p,ROOM_ENTRY,'kitchen'));
 assert(canReachInterior(s,ROOM_ENTRY,'kitchen'));
 const restored=sanitizeState(s),child=layoutFor(restored,'kitchen').find(p=>p.id==='collection-port-3');
 assert.equal(child.facing,'left');assert.equal(child.on,base.id);
 assert.deepEqual(attachedPosition(child,restored.kitchenLayout,FURNITURE),Object.fromEntries(Object.entries(child).filter(([k])=>k!=='id')));
});

test('shortening a legacy L return keeps every owned item, uses a free worktop first, and never drifts',()=>{
 for(const right of [false,true]){
  const s=owned(),id='spatial-moon-corner-kitchen';
  s.kitchenLayout=[
   {id:'collection-port-3',x:0,y:0,on:id,surface:1,offsetX:20,facing:'left'},
   {id:'plush-0',x:0,y:0,on:id,surface:1,offsetX:0,facing:'right'},
   {id,x:right?900:380,y:545,mount:right?'corner-right':'corner-left',facing:right?'right':'left'}
  ];
  const restored=sanitizeState(s),oven=restored.kitchenLayout.find(p=>p.id==='collection-port-3'),plush=restored.kitchenLayout.find(p=>p.id==='plush-0');
  assert.equal(restored.kitchenLayout.length,3);
  assert.equal(plush.surface,1);assert.equal(plush.offsetX,0,'valid existing placement claims its original space');
  assert.equal(oven.surface,2,'the larger left workspace takes an oven; the narrow right cabinet cannot');
  assert.equal(oven.on,id);assert.equal(oven.facing,'left');assert.equal(plush.facing,'right');
  assert.deepEqual(restored.furnitureOwned,s.furnitureOwned);
  assert.deepEqual(sanitizeState(restored).kitchenLayout,restored.kitchenLayout);
 }
});

test('a former return item stays visible on the floor when all new worktops are full',()=>{
 const s=owned(),id='spatial-moon-corner-kitchen';
 s.kitchenLayout=[
  {id,x:380,y:545,mount:'corner-left',facing:'left'},
  {id:'collection-port-3',x:0,y:0,on:id,surface:0,offsetX:-65},
  {id:'collection-port-4',x:0,y:0,on:id,surface:0,offsetX:10},
  {id:'collection-port-8',x:0,y:0,on:id,surface:0,offsetX:75},
  {id:'plush-0',x:0,y:0,on:id,surface:1,offsetX:0},
  {id:'collection-port-2',x:0,y:0,on:id,surface:1,offsetX:20,facing:'right'}
 ];
 const restored=sanitizeState(s),child=restored.kitchenLayout.find(p=>p.id==='collection-port-2');
 assert.equal(restored.kitchenLayout.length,s.kitchenLayout.length);
 assert(child);assert(!child.on,'full surfaces do not overlap or erase the former attachment');
 assert.equal(child.facing,'right');assert(canPlaceFurniture(restored,child.id,child,'kitchen'));
 assert.deepEqual(restored.furnitureOwned,s.furnitureOwned);
 assert.deepEqual(sanitizeState(restored).kitchenLayout,restored.kitchenLayout);
});
