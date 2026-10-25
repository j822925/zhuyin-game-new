import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE,freshState,sanitizeState,placeFurniture,placementState,furnitureSurfacePlan,furniturePreviewLayout} from '../adventure-model.js';
import {floorPosition} from '../home-spatial-model.js';
import {furnitureSurfaces,surfaceAnchor,surfaceItemWidth,attachedPosition,freeSurfacePosition,planSurfacePlacement,surfaceCapacityReport,surfaceCapacityText} from '../furniture-surfaces.js';

const find=id=>FURNITURE.find(f=>f.id===id),ids=['collection-port-3','collection-port-4','collection-port-8'];
function fragmented(side='front',style='moon'){
 const f=find('collection-'+style+'-kitchen-base'),host={id:f.id,...floorPosition({x:side==='front'?600:side==='left'?200:1080,y:side==='front'?385:490},f,{area:'kitchen'})};
 const s={...freshState(),furnitureOwned:[...new Set([...freshState().furnitureOwned,host.id,...ids])],layout:[],kitchenLayout:[host],bedroomLayout:[],bathroomLayout:[]};
 for(const [id,offsetX]of [[ids[0],side==='front'?-25:-10],[ids[2],side==='front'?50:25]])s.kitchenLayout.push({id,...attachedPosition({id,on:host.id,surface:0,offsetX,facing:side},s.kitchenLayout,FURNITURE)});
 return {s,host,side};
}
function assertRow(layout,host,catalog=FURNITURE){
 const surface=furnitureSurfaces(catalog.find(f=>f.id===host.id),host)[0],row=layout.filter(p=>p.on===host.id).sort((a,b)=>a.offsetX-b.offsetX);
 let edge=-surface.width/2-3;
 for(const p of row){const width=surfaceItemWidth(catalog.find(f=>f.id===p.id),p,host,surface);assert(p.offsetX-width/2>=edge+3-1e-6,'physical footprints have a real gap');assert(p.offsetX+width/2<=surface.width/2+1e-6,'no overflow past painted edge');edge=p.offsetX+width/2;}
}

for(const side of ['front','left','right'])test(side+' fragmented worktop previews and commits three different appliances atomically',()=>{
 const {s,host}=fragmented(side),before=structuredClone(s),surface=furnitureSurfaces(find(host.id),host)[0],at=surfaceAnchor(host,surface);
 assert.equal(freeSurfacePosition(ids[1],host,0,s.kitchenLayout,FURNITURE,at,{facing:side}),null,'reproduce fragmented space failure');
 const p={id:ids[1],x:at.x,y:at.y,on:host.id,surface:0,offsetX:0,facing:side},plan=furnitureSurfacePlan(s,p.id,p,'kitchen');
 assert(plan.ok&&plan.moved>0);assert.equal(plan.capacity.required,161);assertRow([host,...plan.changes],host);
 assert.equal([...plan.changes].sort((a,b)=>a.offsetX-b.offsetX).map(p=>p.id).join(','),ids.join(','),'pointer between appliances keeps the cooker in the middle');
 const preview=placementState(s,p.id,p,'kitchen');assert.deepEqual(s,before,'preview does not mutate saved state');
 const rendered=furniturePreviewLayout(s,p,'kitchen');for(const item of preview.kitchenLayout)assert.deepEqual(rendered.find(q=>q.id===item.id),item,'canvas uses exactly the staged coordinates');
 assert(placeFurniture(s,p.id,p,undefined,'kitchen'));assert.deepEqual(s.kitchenLayout,preview.kitchenLayout);assertRow(s.kitchenLayout,host);
 assert.deepEqual(s.furnitureOwned,before.furnitureOwned);assert.deepEqual(sanitizeState(s).kitchenLayout,s.kitchenLayout);
 assert(s.kitchenLayout.filter(p=>p.on).every(p=>p.facing===side));
});

test('an existing usable gap is used without touching any neighbours',()=>{
 const {s,host}=fragmented(),surface=furnitureSurfaces(find(host.id))[0],at=surfaceAnchor(host,surface);
 for(const p of s.kitchenLayout.filter(p=>p.on))Object.assign(p,attachedPosition({...p,offsetX:p.id===ids[0]?-55:72.5},s.kitchenLayout,FURNITURE));
 const plan=planSurfacePlacement(ids[1],host,0,s.kitchenLayout,FURNITURE,{x:at.x+17.5,y:at.y},{facing:'front'});
 assert(plan.ok);assert.equal(plan.moved,0);assert.equal(plan.position.offsetX,17.5);assert.equal(plan.changes.length,1);
});

test('every surface derives capacity from its own usable width and the selected item footprint',()=>{
 const rows=surfaceCapacityReport(FURNITURE),table=rows.find(r=>r.id==='table'&&r.view==='front'),wide=rows.find(r=>r.id==='collection-moon-kitchen-base'&&r.view==='front'),side=rows.find(r=>r.id==='collection-moon-kitchen-base'&&r.view==='left'),shelf=rows.find(r=>r.id==='display-ocean-bookcase'&&r.view==='front');
 assert(table&&shelf&&wide&&side);assert.equal(wide.width,180);assert.equal(side.width,180);assert(side.projectedSpan<side.physicalWidth);
 assert(wide.examples[0].count>wide.examples[2].count);assert.notEqual(table.examples[0].count,wide.examples[0].count);assert(wide.mixed.fits&&side.mixed.fits);
 for(const row of rows)for(const sample of row.examples){assert(sample.count*(sample.width+row.gap)-row.gap<=row.width+1e-7);assert((sample.count+1)*(sample.width+row.gap)-row.gap>row.width,'next item really exceeds capacity');}
});

test('small, medium and large counters reject exact physical overflow, without resizing items',()=>{
 for(const width of [35,69,100,180,240]){
  const catalog=[{id:'host',name:'檯面',height:100,fw:width,surfaceKind:'table',surfaceWidth:width},...ids.map(find)],host={id:'host',x:600,y:500},row=[host];
  let added=0;
  for(const id of ids){const plan=planSurfacePlacement(id,host,0,row,catalog);if(!plan.ok){assert(['surface-full','item-too-wide'].includes(plan.reason));assert(!plan.changes.length);continue;}for(const p of plan.changes){const old=row.find(q=>q.id===p.id);if(old)Object.assign(old,p);else row.push(p);}added++;}
  assert.equal(row.length,added+1);assertRow(row,host,catalog);assert.deepEqual(catalog.slice(1),ids.map(find));
 }
});

test('full preview and stale confirmation cannot move or remove any saved item',()=>{
 const {s,host}=fragmented('left','daisy'),p={id:ids[1],on:host.id,surface:0,offsetX:0,facing:'front',x:600,y:400};s.furnitureOwned.push('collection-port-2');s.kitchenLayout.push({id:'collection-port-2',on:host.id,surface:0,offsetX:0,facing:'left',x:600,y:400});const before=structuredClone(s);
 const plan=furnitureSurfacePlan(s,p.id,p,'kitchen');assert(!plan.ok);assert.match(surfaceCapacityText(plan),/空間不足/);assert.equal(placementState(s,p.id,p,'kitchen'),s);
 assert.equal(placeFurniture(s,p.id,p,undefined,'kitchen'),false);assert.deepEqual(s,before);
});

test('rotating a calibrated host preserves capacity and does not detach its contents',()=>{
 const {s,host}=fragmented('front','daisy'),at=surfaceAnchor(host,furnitureSurfaces(find(host.id))[0]),p={id:ids[1],on:host.id,surface:0,offsetX:0,facing:'front',...at};
 assert(placeFurniture(s,p.id,p,undefined,'kitchen'));const before=structuredClone(s),side=floorPosition({x:200,y:490},find(host.id),{area:'kitchen'});
 assert.equal(placeFurniture(s,host.id,side,undefined,'kitchen'),true);assert.deepEqual(s.furnitureOwned,before.furnitureOwned);assert.equal(s.kitchenLayout.filter(p=>p.on===host.id).length,3);assertRow(s.kitchenLayout,s.kitchenLayout.find(p=>p.id===host.id));
});

test('compact L migrates an old wide countertop into separate real spans without filling its sink',()=>{
 for(const side of ['left','right'])for(const reverse of [false,true]){
  const f=find('spatial-moon-corner-kitchen'),host={id:f.id,x:side==='left'?410:870,y:500,facing:side,mount:'corner-'+side};
  const s={...freshState(),furnitureOwned:[...new Set([...freshState().furnitureOwned,host.id,...ids])],layout:[],kitchenLayout:[host,...ids.map((id,i)=>({id,x:0,y:0,on:host.id,surface:0,offsetX:[-55,17.5,72.5][i],facing:'front'}))],bedroomLayout:[],bathroomLayout:[]};
  if(reverse)s.kitchenLayout.reverse();const before=structuredClone(s),restored=sanitizeState(s),children=restored.kitchenLayout.filter(p=>p.on===host.id),current=restored.kitchenLayout.find(p=>p.id===host.id);
  assert.equal(children.length,3);assert.equal(children.find(p=>p.id===ids[0]).surface,2);assert.equal(children.find(p=>p.id===ids[1]).surface,0);assert.equal(children.find(p=>p.id===ids[2]).surface,1);
  for(const p of children){assert(attachedPosition(p,restored.kitchenLayout,FURNITURE));assert.equal(p.facing,'front');const surface=furnitureSurfaces(f,current)[p.surface];assert(find(p.id).fw<=surface.width,'each appliance stays within its actual cabinet');}
  assert.deepEqual(restored.furnitureOwned,before.furnitureOwned);assert.deepEqual(s,before);assert.deepEqual(sanitizeState(restored).kitchenLayout,restored.kitchenLayout);
 }
});
