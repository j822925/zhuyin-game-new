import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE,freshState,sanitizeState,placeFurniture,ROOM_ENTRY,ROOM_KITCHEN_DOOR,ROOM_BEDROOM_DOOR,ROOM_KITCHEN_APPROACH,ROOM_BEDROOM_APPROACH,ROOM_WARDROBE,ROOM_WARDROBE_APPROACH,roomWalkable,findPath} from '../adventure-model.js';
import {HOME_FLOOR,floorPosition,floorWallX,furnitureWallAnchor,furnitureWallDepth,spatialFloorValid} from '../home-spatial-model.js';
import {furnitureSurfaces,freeSurfacePosition,surfaceAnchor,surfaceDistance,surfaceOffsetAt,attachedPosition} from '../furniture-surfaces.js';
import {mountedSolidGeometry} from '../home-furniture-projection.js';
import {wallPosition,wallSide,wallPlacementValid,wallMountDepth,WALL_HANG_HEIGHT} from '../data/home-wall-furniture.js';

const furniture=id=>FURNITURE.find(item=>item.id===id);
const owned=()=>({...freshState(),furnitureOwned:FURNITURE.map(item=>item.id),layout:[],kitchenLayout:[],bedroomLayout:[],bathroomLayout:[]});

test('mixed-width kitchen cabinets, stove, sink and fridge use one back contact line',()=>{
 const ids=['collection-moon-kitchen-base','collection-moon-appliance-counter','moon-stove','moon-complete-sink','moon-complete-fridge'];
 for(const id of ids){
  const f=furniture(id);assert(f,id);assert.equal(furnitureWallDepth(f),65);
  for(const area of ['room','kitchen','bedroom','bathroom']){
   const back=floorPosition({x:600,y:365},f,{area});
   assert.equal(furnitureWallAnchor(f,back).y,HOME_FLOOR.back,id+' back wall');
   for(const x of [210,1070]){
    const p=floorPosition({x,y:550},f,{area}),anchor=furnitureWallAnchor(f,p);
    assert(Math.abs(anchor.x-(x<640?floorWallX(anchor.y):1280-floorWallX(anchor.y)))<=2.5,id+' side wall');
    assert(spatialFloorValid(f,p),id+' valid');
   }
  }
 }
 const positions=ids.map(id=>floorPosition({x:200,y:550},furniture(id)));
 assert.equal(new Set(positions.map(p=>p.x)).size,1,'different widths must not create different wall gaps');
});

test('old mounted layouts align once while free placements and ownership stay intact',()=>{
 const state=owned();
 state.kitchenLayout=[
  {id:'collection-moon-kitchen-base',x:170,y:540,mount:'left',facing:'left'},
  {id:'moon-stove',x:640,y:355,mount:'back',facing:'front'},
  {id:'spatial-moon-corner-kitchen',x:920,y:465,mount:'corner-right',facing:'right'},
  {id:'collection-moon-dining-chair',x:800,y:600,facing:'right'},
  {id:'collection-moon-kitchen-wall',x:160,y:320,mount:'left',facing:'left'}
 ];
 const restored=sanitizeState(state);
 assert.equal(restored.kitchenLayout.length,state.kitchenLayout.length);
 assert.deepEqual(restored.kitchenLayout[3],state.kitchenLayout[3],'free chair retains its exact location');
 assert.deepEqual(restored.kitchenLayout[4],{id:state.kitchenLayout[4].id,...wallPosition(state.kitchenLayout[4],furniture(state.kitchenLayout[4].id))},'side wall cabinet follows the new wall plane');
 const back=restored.kitchenLayout.find(item=>item.id==='moon-stove');assert.equal(back.y,425);
 const side=restored.kitchenLayout.find(item=>item.id==='collection-moon-kitchen-base');assert.equal(side.y,540);assert(Math.abs(furnitureWallAnchor(furniture(side.id),side).x-floorWallX(side.y))<=2.5);
 assert.deepEqual(restored.kitchenLayout.find(item=>item.id==='spatial-moon-corner-kitchen'),{id:'spatial-moon-corner-kitchen',x:900,y:545,mount:'corner-right',facing:'right'});
 for(const item of state.kitchenLayout)assert(restored.furnitureOwned.includes(item.id));
 assert.deepEqual(sanitizeState(restored).kitchenLayout,restored.kitchenLayout,'repeated loads never drift');
});

test('realignment carries existing tabletop contents, is idempotent and never grants unowned objects',()=>{
 const state=owned(),host={id:'collection-moon-kitchen-base',x:600,y:345,mount:'back',facing:'front'};
 state.kitchenLayout=[host];
 for(const [id,offsetX]of [['collection-port-3',-55],['collection-port-4',17.5],['collection-port-8',72.5]]){
  const p=attachedPosition({id,on:host.id,surface:0,offsetX},state.kitchenLayout,FURNITURE);assert(p);state.kitchenLayout.unshift({id,...p});
 }
 const restored=sanitizeState(state),aligned=restored.kitchenLayout.find(item=>item.id===host.id);assert.equal(aligned.y,425);
 for(const child of restored.kitchenLayout.filter(item=>item.on)){
  const old=state.kitchenLayout.find(item=>item.id===child.id);assert.equal(child.y,old.y+80);assert.equal(child.offsetX,old.offsetX);assert.equal(child.on,old.on);
 }
 assert.equal(restored.kitchenLayout.length,4);
 assert.deepEqual(sanitizeState(restored).kitchenLayout,restored.kitchenLayout);
 assert.deepEqual(restored.furnitureOwned,state.furnitureOwned);
 const unowned=freshState();unowned.kitchenLayout=[host];assert(!sanitizeState(unowned).kitchenLayout.some(item=>item.id===host.id));
});

test('rice cooker fits the real gap between an oven and blender, including after save/load',()=>{
 const state=owned(),id='collection-moon-kitchen-base',host={id,x:600,y:425,mount:'back',facing:'front'};
 state.kitchenLayout=[host];
 for(const [id,offsetX] of [['collection-port-3',-55],['collection-port-8',72.5]]){
  const position=attachedPosition({id,on:host.id,surface:0,offsetX},state.kitchenLayout,FURNITURE);
  assert(position);assert(placeFurniture(state,id,position,undefined,'kitchen'));
 }
 const before=structuredClone(state.kitchenLayout);
 const surface=furnitureSurfaces(furniture(host.id))[0],anchor=surfaceAnchor(host,surface);
 const cooker=freeSurfacePosition('collection-port-4',host,0,state.kitchenLayout,FURNITURE,{x:anchor.x+17.5,y:anchor.y});
 assert(cooker,'the old three-candidate search misses this gap');
 assert.equal(cooker.offsetX,17.5);
 assert(placeFurniture(state,'collection-port-4',cooker,undefined,'kitchen'));
 for(const old of before)assert.deepEqual(state.kitchenLayout.find(item=>item.id===old.id),old,'do not move existing appliances');
 const restored=sanitizeState(state);
 assert.equal(restored.kitchenLayout.filter(item=>item.on===host.id).length,3);
 const actual=restored.kitchenLayout.find(item=>item.id==='collection-port-4');
 assert.equal(actual.on,host.id);assert.equal(actual.offsetX,17.5);
});

test('tabletop placement follows the requested point and rejects genuinely full shelves',()=>{
 const host={id:'collection-moon-kitchen-base',x:600,y:425};
 const surface=furnitureSurfaces(furniture(host.id))[0],anchor=surfaceAnchor(host,surface);
 for(const dx of [-30,30]){
  const p=freeSurfacePosition('collection-port-4',host,0,[host],FURNITURE,{x:anchor.x+dx,y:anchor.y+10});
  assert.equal(p.offsetX,dx);
 }
 const crowded=[host,{id:'collection-port-3',on:host.id,surface:0,offsetX:-55},{id:'collection-port-8',on:host.id,surface:0,offsetX:72.5},{id:'collection-port-4',on:host.id,surface:0,offsetX:17.5}];
 assert.equal(freeSurfacePosition('collection-port-2',host,0,crowded,FURNITURE),null);
 assert.equal(surfaceOffsetAt(host,surface,{x:anchor.x+30,y:anchor.y+10}),30);
 assert.equal(surfaceDistance(host,surface,{x:anchor.x+30,y:anchor.y+10}),10);
 assert(surfaceDistance(host,surface,{x:anchor.x+surface.width,y:anchor.y})>40);
});

test('first two automatic placements leave the central space available for a third appliance',()=>{
 const host={id:'collection-moon-kitchen-base',x:600,y:425},layout=[host];
 for(const id of ['collection-port-3','collection-port-8','collection-port-4']){
  const p=freeSurfacePosition(id,host,0,layout,FURNITURE);assert(p,id);layout.push({id,...p});
 }
 const [oven,blender,cooker]=layout.slice(1);
 assert(oven.offsetX<cooker.offsetX&&cooker.offsetX<blender.offsetX);
});

test('both side-wall counters keep all three appliances on the painted countertop and survive reload',()=>{
 for(const side of ['left','right'])for(const targetY of [360,550,730]){
  const state=owned(),f=furniture('collection-moon-kitchen-base'),host={id:f.id,...floorPosition({x:side==='left'?200:1080,y:targetY},f)},g=mountedSolidGeometry(f,host);
  state.kitchenLayout=[host];assert(g);assert(g.near.y<=725);assert(g.far.y>=365);
  for(const rear of [g.rearNear,g.rearFar])assert(Math.abs(rear.x-(side==='left'?floorWallX(rear.y):1280-floorWallX(rear.y)))<=2.5,'back edge follows the painted wall');
  const surface=furnitureSurfaces(f)[0],anchor=surfaceAnchor(host,surface);assert.equal(anchor.x,host.x-g.sign*g.depth/2);assert.equal(anchor.y,host.y-g.height);
  for(const id of ['collection-port-3','collection-port-8','collection-port-4']){
   const p=freeSurfacePosition(id,host,0,state.kitchenLayout,FURNITURE);assert(p);assert(placeFurniture(state,id,p,undefined,'kitchen'),side+' '+id);
   assert(Math.abs((p.x-anchor.x)-g.axis.x*p.offsetX)<.001);assert(Math.abs((p.y-anchor.y)-g.axis.y*p.offsetX)<.001);
   assert(Math.abs(p.offsetX)+furniture(id).fw/2<=g.length/2,'whole footprint remains along the top');
  }
  const restored=sanitizeState(state);assert.equal(restored.kitchenLayout.filter(p=>p.on===host.id).length,3);assert.deepEqual(restored.kitchenLayout,state.kitchenLayout);
 }
});

test('side shelves retain front-plane anchors and L-run surfaces mirror the composed geometry',()=>{
 const shelf=furniture('collection-moon-bookcase');
 for(const side of ['left','right']){
  const host={id:shelf.id,...floorPosition({x:side==='left'?200:1080,y:550},shelf)};
  for(const surface of furnitureSurfaces(shelf))assert.equal(surfaceAnchor(host,surface).x,host.x);
 }
 const f=furniture('spatial-moon-corner-kitchen'),surfaces=furnitureSurfaces(f);
 for(const side of ['left','right']){
  const host={id:f.id,...floorPosition({x:side==='left'?200:1080,y:550},f)},sign=side==='left'?1:-1;
  const back=surfaceAnchor(host,surfaces[0]),wing=surfaceAnchor(host,surfaces[1]);
  assert.equal(back.x,host.x+sign*65);assert.equal(back.y,host.y-225);
  assert.equal(wing.x,host.x-sign*188.5);assert.equal(wing.y,host.y-145);
 }
});

test('side-door approaches lead to the newly painted door bases and bathroom uses the common floor',()=>{
 assert.deepEqual(ROOM_BEDROOM_DOOR,{x:115,y:550});assert.deepEqual(ROOM_KITCHEN_DOOR,{x:1165,y:550});
 const state=owned();for(const target of [ROOM_KITCHEN_APPROACH,ROOM_BEDROOM_APPROACH])assert(findPath(ROOM_ENTRY,target,(x,y)=>roomWalkable(x,y,state,'room')));
 assert(roomWalkable(640,360,state,'bathroom'));assert(!roomWalkable(640,359,state,'bathroom'));
});

test('the built-in wardrobe and its approach move together onto the new floor',()=>{
 assert.equal(ROOM_WARDROBE.y,425);assert(ROOM_WARDROBE.y-55>=HOME_FLOOR.back);
 assert.deepEqual(ROOM_WARDROBE_APPROACH,{x:ROOM_WARDROBE.x,y:ROOM_WARDROBE.y+53});
 const state=owned(),checker=(x,y)=>roomWalkable(x,y,state,'bedroom');
 assert(!checker(ROOM_WARDROBE.x,ROOM_WARDROBE.y),'wardrobe footprint blocks walking through it');
 assert(checker(ROOM_WARDROBE_APPROACH.x,ROOM_WARDROBE_APPROACH.y));assert(findPath(ROOM_ENTRY,ROOM_WARDROBE_APPROACH,checker));
});

test('previously bought generic cabinets keep their top surfaces aligned to their projected solid',()=>{
 for(const id of ['honey-cabinet','moon-complete-cabinet','display-honey-low-cabinet'])for(const side of ['left','right']){
  const f=furniture(id),host={id,...floorPosition({x:side==='left'?200:1080,y:550},f)},g=mountedSolidGeometry(f,host);assert(g,id+' has a solid side view');
  const surface=furnitureSurfaces(f)[0],anchor=surfaceAnchor(host,surface);assert.equal(anchor.y,host.y-g.height,id+' countertop height');
  assert.equal(anchor.x,host.x-g.sign*g.depth/2,id+' center of countertop depth');
  for(const rear of [g.rearNear,g.rearFar])assert(Math.abs(rear.x-(side==='left'?floorWallX(rear.y):1280-floorWallX(rear.y)))<=2.5);
 }
});

test('upper shelves stay inside the bookcase body, rather than becoming its roof',()=>{
 for(const id of ['collection-moon-bookcase','collection-moon-display-cabinet','display-ocean-bookcase']){
  const f=furniture(id),g=mountedSolidGeometry(f,{x:220,y:550,mount:'left'});assert(g,id);
  for(const surface of furnitureSurfaces(f)){assert(-surface.dy<g.height-8,id+' has headroom above each shelf');assert(-surface.dy>0);}
 }
});

test('side wall hangings attach to the painted plane and keep their chosen wall after save',()=>{
 for(const id of ['collection-moon-kitchen-wall','wall-picture','wall-mirror'])for(const side of ['left','right'])for(const y of [220,350,470]){
  const f=furniture(id),p=wallPosition({x:side==='left'?160:1120,y},f),sign=side==='left'?1:-1;
  assert.equal(wallSide(p),-sign);assert(wallPlacementValid(f,p,'kitchen'));assert.deepEqual(wallPosition(p,f),p,'repeated placement does not switch the wall');
  const rear=p.x-sign*wallMountDepth(f),floorY=p.y+WALL_HANG_HEIGHT;assert(Math.abs(rear-(side==='left'?floorWallX(floorY):1280-floorWallX(floorY)))<=2.5);
  if(f.role==='kitchen-wall'){
   const g=mountedSolidGeometry(f,p);assert.equal(g.depth,wallMountDepth(f));
   for(const point of [g.rearNear,g.rearFar])assert(Math.abs(point.x-(side==='left'?floorWallX(point.y+WALL_HANG_HEIGHT):1280-floorWallX(point.y+WALL_HANG_HEIGHT)))<=2.5);
  }
  const state=owned();assert(placeFurniture(state,id,p,undefined,'kitchen'));assert.deepEqual(sanitizeState(state).kitchenLayout.find(item=>item.id===id),{id,...p});
 }
 const f=furniture('wall-picture');assert(wallPlacementValid(f,{x:640,y:350,mount:'back'},'room'));assert(wallPlacementValid(f,{x:160,y:320,mount:'left'},'room'),'legacy side positions still load');
 const old=owned();old.layout=[{id:f.id,x:160,y:320}];const migrated=sanitizeState(old);assert.deepEqual(migrated.layout,[{id:f.id,...wallPosition(old.layout[0],f)}],'pre-facing wall saves also align without losing the hanging');
});

test('the L-run return meets the back cabinet without a gap and each top remains aligned',()=>{
 const f=furniture('spatial-moon-corner-kitchen'),surfaces=furnitureSurfaces(f);
 for(const right of [false,true]){
  const host={id:f.id,...floorPosition({x:right?1080:200,y:550},f)},sign=right?-1:1;
  const wingItem={x:host.x-156*sign,y:host.y-40,mount:right?'right':'left'},wingF={...f,id:'corner-base',corner:false,role:'kitchen-base',height:125,fw:160,fh:65,surfaceWidth:160};
  const wing=mountedSolidGeometry(wingF,wingItem),backEnd={x:host.x+65*sign-187*sign,y:host.y-120};
  assert(Math.hypot(wing.far.x-backEnd.x,wing.far.y-backEnd.y)<.5,'return meets the end of the back run');
  const backTop=surfaceAnchor(host,surfaces[0]),wingTop=surfaceAnchor(host,surfaces[1]);
  assert.equal(backTop.y,backEnd.y-105);assert.equal(wingTop.y,wingItem.y-wing.height);assert.equal(wingTop.x,wingItem.x-sign*wing.depth/2);
 }
});
