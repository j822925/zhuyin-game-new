import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE,freshState,placeFurniture,sanitizeState} from '../adventure-model.js';
import {floorPosition} from '../home-spatial-model.js';
import {nativeBookcaseGeometry,NATIVE_BOOKCASE_LANDMARKS} from '../home-native-cabinet-geometry.js';
import {furnitureSurfaces,surfaceAnchor,surfaceOffsetAt,freeSurfacePosition,surfaceCapacity} from '../furniture-surfaces.js';
import {paintedFurnitureBounds} from '../home-painted-furniture.js';
import {HOME_PERSPECTIVE_ART} from '../data/home-perspective-art.js';
const find=id=>FURNITURE.find(f=>f.id===id),styles=Object.keys(NATIVE_BOOKCASE_LANDMARKS);
const art={perspective:Object.fromEntries(Object.entries(HOME_PERSPECTIVE_ART).map(([key,v])=>[key,{cells:v.cells}]))};
const objects=['collection-deep-10','collection-deep-4','collection-deep-5'];
const owned=()=>({...freshState(),furnitureOwned:FURNITURE.map(f=>f.id),layout:[],kitchenLayout:[],bedroomLayout:[],bathroomLayout:[]});

test('all six native bookcases and display cabinets use three painted inner bearing edges',()=>{
 for(const style of styles)for(const role of ['bookcase','display-cabinet'])for(const side of ['left','right'])for(const mounted of [true,false]){
  const f=find(`collection-${style}-${role}`),host={id:f.id,...(mounted?floorPosition({x:side==='left'?200:1080,y:490},f,{area:'room'}):{x:650,y:600,facing:side})},g=nativeBookcaseGeometry(f,host),bounds=paintedFurnitureBounds(art,f,host),surfaces=furnitureSurfaces(f,host);
  for(const key of ['x','y','w','h'])assert(Math.abs(g[key]-bounds[key])<1e-8,'render and shelf geometry share the same complete-cutout bounds');
  assert.equal(surfaces.length,3);assert(g.shelves[0].y<g.shelves[1].y&&g.shelves[1].y<g.shelves[2].y);
  for(let i=0;i<3;i++){
   const surface=surfaces[i],edge=g.shelves[i],anchor=surfaceAnchor(host,surface),state=owned();state.layout=[host];
   assert.equal(surface.width,f.surfaceWidth);assert.deepEqual(anchor,{x:edge.x,y:edge.y});
   assert(edge.y>g.y+g.h*.25&&edge.y<g.y+g.h*.9,'the supporting line belongs to an inner shelf, never the roof or feet');
   assert(edge.near.x>=g.x&&edge.near.x<=g.x+g.w&&edge.far.x>=g.x&&edge.far.x<=g.x+g.w);
   for(const id of objects){
    const p=freeSurfacePosition(id,host,i,state.layout,FURNITURE,undefined,{facing:side});assert(p);assert(placeFurniture(state,id,p,undefined,'room'));
    assert(Math.abs(surfaceOffsetAt(host,surface,p)-p.offsetX)<1e-7);
    const t=(p.offsetX+surface.width/2)/surface.width;
    assert(Math.abs(p.x-(edge.near.x+(edge.far.x-edge.near.x)*t))<1e-7);
    assert(Math.abs(p.y-(edge.near.y+(edge.far.y-edge.near.y)*t))<1e-7);
   }
   assert.deepEqual(sanitizeState(state).layout,state.layout,'books and cups retain every attachment and direction after reload');
   const extra=surfaceCapacity('collection-deep-12',host,i,state.layout,FURNITURE,{facing:side});assert(!extra.fits,'full physical shelf cannot accept a large additional book');
  }
 }
});

test('legacy shelf coordinates are reattached to matching levels without losing inventory or changing front views',()=>{
 for(const style of styles)for(const role of ['bookcase','display-cabinet'])for(const side of ['left','right']){
  const f=find(`collection-${style}-${role}`),host={id:f.id,...floorPosition({x:side==='left'?200:1080,y:490},f,{area:'room'})},s=owned();
  s.layout=[host,...objects.map((id,i)=>({id,x:123,y:456,on:host.id,surface:i,offsetX:i*5-5,facing:i===0?'front':side}))];
  const saved=sanitizeState(s);assert.deepEqual(saved.furnitureOwned,s.furnitureOwned);assert.equal(saved.layout.length,4);
  for(let i=0;i<3;i++){const p=saved.layout.find(p=>p.id===objects[i]);assert.equal(p.surface,i);assert.equal(p.offsetX,i*5-5);assert.equal(p.facing,i===0?'front':side);}
  assert.deepEqual(sanitizeState(saved).layout,saved.layout);
  const front=furnitureSurfaces(f,{id:f.id,x:640,y:450,facing:'front',mount:'back'});
  assert.deepEqual(front.map(p=>p.dy),f.surfaceLevels.map(level=>-Math.round(f.height*level)));assert(front.every(p=>!p.nativeSideSurface));
 }
});
