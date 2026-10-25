import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE,freshState,sanitizeState,placeFurniture} from '../adventure-model.js';
import {floorPosition,floorWallX,floorWallRightX} from '../home-spatial-model.js';
import {wallPosition} from '../data/home-wall-furniture.js';
import {HOME_PERSPECTIVE_ART} from '../data/home-perspective-art.js';
import {paintedFurnitureBounds,paintedFurnitureSprite} from '../home-painted-furniture.js';
import {nativeCabinetGeometry,NATIVE_CABINET_LANDMARKS,NATIVE_CABINET_LANDMARKS_BY_STYLE} from '../home-native-cabinet-geometry.js';
import {furnitureSurfaces,surfaceAnchor,freeSurfacePosition,surfaceCapacityReport,attachedPosition,surfaceOffsetAt} from '../furniture-surfaces.js';
const f=id=>FURNITURE.find(p=>p.id===id);
const art={perspective:Object.fromEntries(Object.entries(HOME_PERSPECTIVE_ART).map(([key,v])=>[key,{cells:v.cells}]))};

test('dedicated base and wall cutouts leave the other three painted cells intact',()=>{
 for(const style of ['moon','daisy','fox','honey','ocean','berry'])for(const name of ['base','wall'])assert.equal(paintedFurnitureSprite(art,f(`collection-${style}-kitchen-${name}`),{facing:'left'}).atlas,art.perspective[style+'Cabinet'],style+' '+name);
 for(const id of ['collection-moon-bookcase','moon-stove','moon-complete-fridge'])assert.equal(paintedFurnitureSprite(art,f(id),{facing:'left'}).atlas,art.perspective.moonSide);
 assert.match(HOME_PERSPECTIVE_ART.moonCabinet.src,/-[a-f0-9]{12}\.webp$/);
});

test('base cutout has one scale, rear feet meet the actual wall and tabletop markers drive attachment coordinates',()=>{
 const item=f('collection-moon-kitchen-base'),m=NATIVE_CABINET_LANDMARKS.base;
 for(const side of ['left','right']){
  const host={id:item.id,...floorPosition({x:side==='left'?200:1080,y:490},item,{area:'kitchen'})},g=nativeCabinetGeometry(item,host),b=paintedFurnitureBounds(art,item,host),surface=furnitureSurfaces(item,host)[0];
  assert.equal(b.w/m.width,b.h/m.height);assert(Math.abs((m.backNear.y-m.topNear.y)*g.scale-105)<1,'near face height matches the front cabinet');
  assert(m.nearDepth*g.scale>55&&m.nearDepth*g.scale<70,'real near-end depth accommodates an appliance; a thin-panel cutout must fail');
  for(const foot of [m.backNear,m.backFar]){const point={x:b.x+(side==='left'?foot.x:m.width-foot.x)*g.scale,y:b.y+foot.y*g.scale},wall=side==='left'?floorWallX(point.y):floorWallRightX(point.y);assert(Math.abs(point.x-wall)<3.2,'near foot and inferred far rear contact follow the skirting');}
  assert.deepEqual(surfaceAnchor(host,surface),{x:g.top.x,y:g.top.y});assert.equal(surface.width,180);assert.equal(surface.physicalWidth,180);assert(Math.abs(surface.projectedSpan-140.75)<1e-8);
  assert(Math.abs(surface.axis.y*surface.width+surface.projectedSpan)<1e-8);assert(Math.abs(surface.axis.x/surface.axis.y+372/935)<1e-10);
 }
});

test('wall cabinet fixes its real near back corner to the wall rather than its centre',()=>{
 const item=f('collection-moon-kitchen-wall'),m=NATIVE_CABINET_LANDMARKS.wall;
 for(const side of ['left','right']){
  const p={id:item.id,...wallPosition({x:side==='left'?160:1120,y:310},item,'kitchen')},g=nativeCabinetGeometry(item,p),b=paintedFurnitureBounds(art,item,p),backX=b.x+(side==='left'?m.backNear.x:m.width-m.backNear.x)*g.scale,backY=b.y+m.backNear.y*g.scale;
  assert.equal(b.w/m.width,b.h/m.height);assert(Math.abs(backY-(p.y+g.length/2))<1e-7);assert(Math.abs(backX-(side==='left'?floorWallX(backY+180):floorWallRightX(backY+180)))<1e-7);
  assert(b.y>45);assert(b.y+b.h<450);
 }
});

test('front and calibrated side keep identical physical capacity and all three original-size appliances survive reload',()=>{
 const rows=surfaceCapacityReport(FURNITURE).filter(p=>p.id==='collection-moon-kitchen-base'),front=rows.find(p=>p.view==='front');
 for(const r of rows){assert.equal(r.physicalWidth,180);assert.deepEqual(r.examples,front.examples);assert.equal(r.mixed.required,161);assert(r.mixed.fits);}
 const base=f('collection-moon-kitchen-base'),ids=['collection-port-3','collection-port-4','collection-port-8'];
 const before=ids.map(id=>({id,height:f(id).height,fw:f(id).fw}));
 for(const side of ['left','right']){
  const host={id:base.id,...floorPosition({x:side==='left'?200:1080,y:490},base,{area:'kitchen'})},s={...freshState(),furnitureOwned:[...freshState().furnitureOwned,base.id,...ids],layout:[],kitchenLayout:[host],bedroomLayout:[],bathroomLayout:[]};
  for(const id of ids){const position=freeSurfacePosition(id,host,0,s.kitchenLayout,FURNITURE,undefined,{facing:side});assert(position);assert(placeFurniture(s,id,position,undefined,'kitchen'));}
  assert.equal(s.kitchenLayout.filter(p=>p.on===host.id).length,3);assert.deepEqual(sanitizeState(s).kitchenLayout,s.kitchenLayout);
 }
 assert.deepEqual(ids.map(id=>({id,height:f(id).height,fw:f(id).fw})),before,'no image or footprint was made smaller to fit');
});

test('every style has true endpoint depth and uses its own source proportions without changing physical capacity',()=>{
 const rows=surfaceCapacityReport(FURNITURE);
 for(const [style,marks]of Object.entries(NATIVE_CABINET_LANDMARKS_BY_STYLE)){
  const base=f(`collection-${style}-kitchen-base`),p={id:base.id,...floorPosition({x:200,y:490},base,{area:'kitchen'})},g=nativeCabinetGeometry(base,p),front=rows.find(r=>r.id===base.id&&r.view==='front');
  assert(Math.abs(g.w/g.h-marks.base.width/marks.base.height)<1e-12);assert(Math.abs(g.scale*marks.base.nearTopHeight-105)<1e-7);
  assert(marks.base.nearDepth*g.scale>55&&marks.base.nearDepth*g.scale<75,style+' has a genuinely deep painted worktop');
  for(const row of rows.filter(r=>r.id===base.id)){assert.equal(row.physicalWidth,180);assert.deepEqual(row.examples,front.examples);assert(row.mixed.fits);assert.equal(row.mixed.required,161);}
  const wall=f(`collection-${style}-kitchen-wall`),wallGeometry=nativeCabinetGeometry(wall,{id:wall.id,facing:'left',...wallPosition({x:150,y:310},wall,'kitchen')});
  assert(Math.abs(wallGeometry.w/wallGeometry.h-marks.wall.width/marks.wall.height)<1e-12);assert(Math.abs(wallGeometry.scale*marks.wall.nearTopHeight-wall.height)<1e-7);
 }
});

test('freestanding left and right cabinets retain the real painted tabletop and durable attached poses',()=>{
 const base=f('collection-moon-kitchen-base'),ids=['collection-port-3','collection-port-4','collection-port-8'];
 for(const side of ['left','right']){
  const host={id:base.id,x:650,y:600,facing:side},s={...freshState(),furnitureOwned:[...freshState().furnitureOwned,base.id,...ids],layout:[],kitchenLayout:[host],bedroomLayout:[],bathroomLayout:[]};
  const surface=furnitureSurfaces(base,host)[0],g=nativeCabinetGeometry(base,host),anchor=surfaceAnchor(host,surface);
  assert.deepEqual(anchor,{x:g.top.x,y:g.top.y});assert.equal(surface.width,180);
  for(const id of ids){const p=freeSurfacePosition(id,host,0,s.kitchenLayout,FURNITURE,undefined,{facing:side});assert(p);assert(Math.abs(surfaceOffsetAt(host,surface,p)-p.offsetX)<1e-7);assert(placeFurniture(s,id,p,undefined,'kitchen'));}
  assert(s.kitchenLayout.filter(p=>p.on).every(p=>p.facing===side));
  const expected=s.kitchenLayout.filter(p=>p.on).map(p=>({id:p.id,...attachedPosition(p,s.kitchenLayout,FURNITURE)}));
  assert.deepEqual(s.kitchenLayout.filter(p=>p.on),expected);assert.deepEqual(sanitizeState(s).kitchenLayout,s.kitchenLayout);
 }
});
