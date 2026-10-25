import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE,freshState,sanitizeState,placeFurniture} from '../adventure-model.js';
import {floorPosition} from '../home-spatial-model.js';
import {furnitureSurfaces,surfaceAnchor,freeSurfacePosition,surfaceItemWidth,attachedPosition} from '../furniture-surfaces.js';
import {HOME_PERSPECTIVE_ART} from '../data/home-perspective-art.js';
import {paintedFurnitureBounds} from '../home-painted-furniture.js';
const styles=['moon','daisy','fox','honey','ocean','berry'];
const item=id=>FURNITURE.find(f=>f.id===id);
const owned=()=>({...freshState(),furnitureOwned:FURNITURE.map(f=>f.id),layout:[],kitchenLayout:[],bedroomLayout:[],bathroomLayout:[]});
const art={perspective:Object.fromEntries(Object.entries(HOME_PERSPECTIVE_ART).map(([key,v])=>[key,{cells:v.cells}]))};
const byId=layout=>Object.fromEntries(layout.map(p=>[p.id,p]));

test('all six native side worktops and three appliance foot spans lie inside their painted endpoints',()=>{
 for(const style of styles)for(const side of ['left','right']){
  const s=owned(),f=item(`collection-${style}-kitchen-base`),host={id:f.id,...floorPosition({x:side==='left'?200:1080,y:490},f,{area:'kitchen'})};
  s.kitchenLayout=[host];
  const bounds=paintedFurnitureBounds(art,f,host),surface=furnitureSurfaces(f,host)[0],anchor=surfaceAnchor(host,surface),sign=side==='left'?1:-1;
  // The marked native atlas top endpoints, measured before model integration.
  // This deliberately does not equate painted length with the old fw/surfaceWidth.
  const near={x:bounds.x+bounds.w*(side==='left'?.232:1-.232),y:bounds.y+bounds.h*.445};
  const far={x:bounds.x+bounds.w*(side==='left'?.874:1-.874),y:bounds.y+bounds.h*.035};
  assert(Math.abs(anchor.x-(near.x+far.x)/2)<1);assert(Math.abs(anchor.y-(near.y+far.y)/2)<1);
  assert.equal(surface.width,80);assert(f.surfaceWidth>surface.width);
  for(const id of ['collection-port-3','collection-port-8','collection-port-4']){
   const p=freeSurfacePosition(id,host,0,s.kitchenLayout,FURNITURE,undefined,{facing:side});assert(p,id);
   assert(placeFurniture(s,id,p,undefined,'kitchen'));
   const half=surfaceItemWidth(item(id),p,host,surface)/2;
   for(const offset of [p.offsetX-half,p.offsetX+half]){
    const point={x:anchor.x+sign*.914*offset,y:anchor.y-offset};
    assert(point.y>=far.y+3&&point.y<=near.y-3,'footprint stays within painted top ends');
    const ratio=(point.y-far.y)/(near.y-far.y),lineX=far.x+(near.x-far.x)*ratio;
    assert(Math.abs(point.x-lineX)<1,'footprints follow the native painted line');
   }
  }
  const intervals=s.kitchenLayout.filter(p=>p.on).map(p=>{const half=surfaceItemWidth(item(p.id),p,host,surface)/2;return [p.offsetX-half,p.offsetX+half];}).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<intervals.length;i++)assert(intervals[i][0]-intervals[i-1][1]>=2.999,'at least 3 units between side-facing feet');
  assert.deepEqual(sanitizeState(s).kitchenLayout,s.kitchenLayout);
 }
});

test('choosing the front view keeps the full appliance width and refuses an overcrowded native top',()=>{
 const f=item('collection-moon-kitchen-base'),host={id:f.id,...floorPosition({x:200,y:490},f,{area:'kitchen'})},surface=furnitureSurfaces(f,host)[0];
 assert.equal(surfaceItemWidth(item('collection-port-3'),{facing:'front'},host,surface),70);
 assert.equal(surfaceItemWidth(item('collection-port-3'),{facing:'left'},host,surface),31.5);
 const p=freeSurfacePosition('collection-port-3',host,0,[host],FURNITURE,undefined,{facing:'front'});assert(p);assert.equal(p.facing,'front');
 assert.equal(freeSurfacePosition('collection-port-8',host,0,[host,{id:'collection-port-3',...p}],FURNITURE,undefined,{facing:'left'}),null);
});

test('legacy 180-unit side rows reflow all three appliances, preserve directions and become stable native saves',()=>{
 for(const side of ['left','right']){
  const s=owned(),host={id:'collection-moon-kitchen-base',...floorPosition({x:side==='left'?200:1080,y:490},item('collection-moon-kitchen-base'),{area:'kitchen'})};
  s.kitchenLayout=[host,...[['collection-port-3',-55],['collection-port-4',17.5],['collection-port-8',72.5]].map(([id,offsetX])=>({id,x:0,y:0,on:host.id,surface:0,offsetX,facing:side}))];
  const restored=sanitizeState(s),children=restored.kitchenLayout.filter(p=>p.on);
  assert.equal(children.length,3);assert.deepEqual(restored.furnitureOwned,s.furnitureOwned);
  for(const p of children){assert.equal(p.facing,side);assert(attachedPosition(p,restored.kitchenLayout,FURNITURE));assert(Math.abs(p.offsetX)<40);}
  assert.deepEqual(byId(sanitizeState(restored).kitchenLayout),byId(restored.kitchenLayout));
 }
});
