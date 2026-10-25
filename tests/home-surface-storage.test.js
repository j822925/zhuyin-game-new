import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeHomeSurfaceState,decodeHomeSurfaceState} from '../home-surface-storage.js';
import {FURNITURE,freshState,sanitizeState,SAVE_KEY} from '../adventure-model.js';
import {floorPosition} from '../home-spatial-model.js';
import {attachedPosition,furnitureSurfaces,surfaceItemWidth} from '../furniture-surfaces.js';
import {createFarmLearningBridge} from '../farm-learning.bundle.js';
import {forestSaveKey,openForestSync} from '../adventure-sync.js';
import {islandSnapshot} from '../island-visits-model.js';
import {normalizeVisitRoomLayouts} from '../island-visits-ui.js';

const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const corners=FURNITURE.filter(f=>f.corner);
function kitchen(base= corners[0],right=false){
 const state=freshState(),host={id:base.id,...floorPosition({x:right?1080:200,y:500},base,{area:'kitchen'})};state.kitchenLayout=[host];
 for(const [id,surface,offsetX] of [['collection-port-3',2,4],['collection-port-4',0,-3],['collection-port-8',1,6.5]]){
  const item={id,on:host.id,surface,offsetX,facing:surface===1?(right?'right':'left'):'front'},pos=attachedPosition(item,state.kitchenLayout,FURNITURE);assert(pos);state.kitchenLayout.push({id,...pos});
 }
 state.furnitureOwned=[...new Set([...state.furnitureOwned,...state.kitchenLayout.map(p=>p.id)])];state.stars=321;return state;
}
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
const relationships=layout=>layout.map(({x,y,...fields})=>{assert(Number.isFinite(x)&&Number.isFinite(y));return fields;});

test('six styles and both corners survive the actual stable farm bundle in local and student records',()=>{
 assert.equal(corners.length,6);
 for(const base of corners)for(const right of [false,true])for(const demo of [true,false]){
  const state=kitchen(base,right),storage=memory(),tabStorage=memory(),key=demo?SAVE_KEY:forestSaveKey('main','115901');
  state.life.farmUnlocked=true;state.life.plots[0]={crop:'corn',plantId:'storage-fixture',watered:true,ready:false};
  const encoded=encodeHomeSurfaceState(freeze(state),FURNITURE),record=demo?encoded:{revision:7,baseStars:321,state:encoded,dirty:false};storage.setItem(key,JSON.stringify(record));
  const bridge=createFarmLearningBridge({storage,tabStorage,href:'http://127.0.0.1/adventure-preview.html?class=main'});bridge.depart('single',{demo});
  const payload={seat:'115901',mode:'single',roundId:base.id+'-'+right+'-'+demo,total:10,results:Array.from({length:10},()=>({firstCorrect:true}))};
  assert(bridge.begin(payload,{demo,verified:true}));assert.equal(bridge.complete(payload,{demo,confirmed:true}).grown,1);
  const saved=JSON.parse(storage.getItem(key)),wire=demo?saved:saved.state;
  assert.deepEqual(relationships(wire.kitchenLayout),relationships(encoded.kitchenLayout),'old page must retain every placement, not just ownership');
  const restored=sanitizeState(wire);assert.deepEqual(relationships(restored.kitchenLayout),relationships(state.kitchenLayout));
  assert.deepEqual(restored.furnitureOwned,state.furnitureOwned);assert.equal(restored.stars,321);assert.equal(restored.life.plots[0].ready,true);
  assert.deepEqual(sanitizeState(restored),restored,'decoding an in-memory state cannot move a prop twice');
 }
});

test('all fitting small items retain their legal offsets and facings in each encoded worktop span',()=>{
 const host={id:corners[0].id,x:300,y:500,mount:'corner-left',facing:'left'},surfaces=furnitureSurfaces(corners[0],host);
 for(const f of FURNITURE.filter(f=>f.small))for(const surface of [0,1,2])for(const facing of ['front','left','right']){
  const width=surfaceItemWidth(f,{facing},host,surfaces[surface]),limit=(surfaces[surface].width-width)/2;if(limit<0)continue;
  for(const offsetX of [-limit,0,limit]){
   const state={kitchenLayout:[host,{id:f.id,on:host.id,surface,offsetX,facing,x:1,y:2}]},encoded=encodeHomeSurfaceState(state,FURNITURE),wire=encoded.kitchenLayout[1];
   assert(wire.surface<=1);assert(Math.abs(wire.offsetX)+width/2<=(wire.surface===0?105:60)+1e-7,'legacy worktop bounds');
   const decoded=decodeHomeSurfaceState(encoded,FURNITURE).kitchenLayout[1];assert.equal(decoded.surface,surface);assert.equal(decoded.facing,facing);assert(Math.abs(decoded.offsetX-offsetX)<1e-7);
  }
 }
});

test('codec is pure, idempotent, limited to L attachments and preserves invalid legacy layouts for repair',()=>{
 const state=kitchen(),other=[{id:'collection-moon-kitchen-base',x:600,y:450},{id:'collection-port-4',on:'collection-moon-kitchen-base',surface:0,offsetX:77,x:600,y:300},{id:'unknown',on:'missing',surface:2,offsetX:0,x:1,y:1}];
 state.layout=other;state.bedroomLayout=[{id:'bed',x:300,y:500}];const original=structuredClone(state);freeze(state);
 const encoded=encodeHomeSurfaceState(state,FURNITURE);assert.deepEqual(state,original);assert.deepEqual(encoded.layout,other);assert.deepEqual(encoded.bedroomLayout,state.bedroomLayout);
 assert.deepEqual(encodeHomeSurfaceState(encoded,FURNITURE),encoded);assert.deepEqual(decodeHomeSurfaceState(encoded,FURNITURE),state);assert.deepEqual(decodeHomeSurfaceState(state,FURNITURE),state);
 const host=state.kitchenLayout[0];
 for(const invalid of [{surface:0,offsetX:-80},{surface:0,offsetX:-60},{surface:0,offsetX:90},{surface:0,offsetX:30},{surface:0,offsetX:NaN},{surface:5,offsetX:77}]){
  const raw={kitchenLayout:[host,{id:'collection-port-3',on:host.id,x:300,y:300,...invalid}]};assert.deepEqual(decodeHomeSurfaceState(raw,FURNITURE),raw);
 }
 const legacy={...state,kitchenLayout:[host,{id:'collection-port-3',on:host.id,surface:0,offsetX:-60,x:300,y:300}]},repaired=sanitizeState(legacy);
 assert(repaired.kitchenLayout.some(p=>p.id==='collection-port-3'),'existing legacy repair remains active');
});

test('visitor public snapshot and owner sanitizer place encoded items identically, with no save or ownership effects',()=>{
 for(const base of corners)for(const right of [false,true]){
  const state=kitchen(base,right),snapshot=islandSnapshot(encodeHomeSurfaceState(state,FURNITURE)),before=structuredClone(snapshot);freeze(snapshot);
  const visitor=normalizeVisitRoomLayouts(snapshot),owner=sanitizeState(encodeHomeSurfaceState(state,FURNITURE));
  assert.deepEqual(visitor.kitchenLayout,owner.kitchenLayout);assert.deepEqual(snapshot,before);assert(!('stars'in visitor));assert(!('furnitureOwned'in visitor));
  assert.deepEqual(normalizeVisitRoomLayouts(visitor),visitor);
 }
});

test('an old wide row that only partially resembles the wire format never decodes into overlapping bottles',()=>{
 for(const right of [false,true])for(const reverse of [false,true]){
  const state=kitchen(corners[0],right),host=state.kitchenLayout[0],ids=['collection-deep-1','collection-deep-2'];
  state.kitchenLayout=[host,...ids.map((id,i)=>({id,on:host.id,surface:0,offsetX:i?65:0,x:600,y:300,facing:'front'}))];state.furnitureOwned.push(...ids);
  if(reverse)state.kitchenLayout.reverse();const before=structuredClone(state);freeze(state);
  assert.deepEqual(decodeHomeSurfaceState(state,FURNITURE),state,'reject the conflicting host trial as a whole');
  const restored=sanitizeState(state),children=restored.kitchenLayout.filter(p=>p.on===host.id);assert.equal(children.length,2);
  for(const item of children){assert(attachedPosition(item,restored.kitchenLayout,FURNITURE));const peer=children.find(p=>p.id!==item.id&&p.surface===item.surface);if(peer){const a=FURNITURE.find(f=>f.id===item.id),b=FURNITURE.find(f=>f.id===peer.id);assert(Math.abs(item.offsetX-peer.offsetX)>=(a.fw+b.fw)/2+3-1e-7);}}
  assert.deepEqual(state,before);assert.deepEqual(restored.furnitureOwned,state.furnitureOwned);assert.deepEqual(sanitizeState(restored).kitchenLayout,restored.kitchenLayout);
 }
 // Total width can fit while the decoded positions themselves still overlap.
 const state=kitchen(),host=state.kitchenLayout[0],catalog=FURNITURE.map(f=>['collection-deep-1','collection-deep-2'].includes(f.id)?{...f,fw:14}:f);
 state.kitchenLayout=[host,{id:'collection-deep-1',on:host.id,surface:0,offsetX:0},{id:'collection-deep-2',on:host.id,surface:0,offsetX:65}];
 assert.deepEqual(decodeHomeSurfaceState(state,catalog),state,'fit by width alone is insufficient');
});

test('adopted server state decodes once and a further cloud save preserves the same wire placements',async()=>{
 const state=kitchen(corners[0],true),wire=encodeHomeSurfaceState(state,FURNITURE),storage=memory();
 const store=await openForestSync({key:forestSaveKey('main','115901'),storage,fresh:freshState,send:async()=>({enabled:true,revision:7,stars:321,state:wire})});
 const adopted=store.adopt({state:wire,stars:321,revision:8}),live=sanitizeState(adopted);assert.deepEqual(live.kitchenLayout,state.kitchenLayout);
 assert(store.save(encodeHomeSurfaceState(live,FURNITURE)));await store.flush();
 assert.deepEqual(JSON.parse(storage.getItem(store.key)).state.kitchenLayout,wire.kitchenLayout);
});

test('preview uses the same encoded copy for cloud and local save boundaries',()=>{
 const source=readFileSync(new URL('../adventure-preview.js',import.meta.url),'utf8');
 assert.match(source,/function save\(\)\{const stored=encodeHomeSurfaceState\(state,FURNITURE\);if\(globalThis\.ForestStudent\)return globalThis\.ForestStudent\.save\(stored\);try\{localStorage\.setItem\(SAVE_KEY,JSON\.stringify\(stored\)\)/);
});
