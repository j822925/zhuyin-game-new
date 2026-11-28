import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE,freshState,placeFurniture,sanitizeState} from '../adventure-model.js';
import {freeSurfacePosition} from '../furniture-surfaces.js';
import {floorPosition} from '../home-spatial-model.js';
import {wallPosition} from '../data/home-wall-furniture.js';
import {islandSnapshot} from '../island-visits-model.js';
test('all purchased pieces retain eight directions through placement, reload and a visit snapshot',()=>{
 for(const f of FURNITURE){
  const s=freshState(),area=f.areas?.[0]||'room',key={room:'layout',bedroom:'bedroomLayout',kitchen:'kitchenLayout',bathroom:'bathroomLayout'}[area];s.furnitureOwned.push(f.id);
  for(let turn=0;turn<8;turn++){
   const pos=f.wall?wallPosition({x:640,y:240},f,area):f.corner?floorPosition({x:330,y:460},f):{x:640,y:570};
   assert(placeFurniture(s,f.id,{...pos,turn},undefined,area),f.id+' '+turn);
   const restored=sanitizeState(s),saved=islandSnapshot(restored)[key].find(x=>x.id===f.id);
   assert.equal(saved?.turn,f.corner?undefined:turn,f.id);
  }
 }
});
test('turning a TV stand keeps its television on top with its own selected view',()=>{
 const s=freshState(),stand='collection-moon-tv-stand',tv='collection-port-1';s.furnitureOwned.push(stand,tv);
 assert(placeFurniture(s,stand,{x:620,y:570,turn:7}));const host=s.layout.find(x=>x.id===stand);
 const pos=freeSurfacePosition(tv,host,0,s.layout,FURNITURE);assert(placeFurniture(s,tv,{...pos,turn:3}));
 assert(placeFurniture(s,stand,{x:640,y:550,turn:1}));const item=sanitizeState(s).layout.find(x=>x.id===tv);
 assert.equal(item.on,stand);assert.equal(item.turn,3);
});

test('ordinary saves from the stable game preserve each unchanged pilot piece independently', async () => {
 const {retainTurnsInStableBuild}=await import('../home-turn-compat.js');
 const chair={id:'collection-moon-dining-chair',x:510,y:480,turn:1};
 const second={...chair,id:chair.id+'__2',x:760,turn:5};
 let stored;const student={state:{layout:[chair,second]},save:s=>{stored=s;return true;}};
 retainTurnsInStableBuild(student);
 const oldView=p=>({id:p.id,x:p.x,y:p.y});
 student.save({layout:[oldView(chair),oldView(second)]});
 assert.deepEqual(stored.layout,[chair,second]);
 student.save({layout:[oldView(chair),{...oldView(second),x:600}]});
 assert.equal(stored.layout[0].turn,1);assert.equal(stored.layout[1].turn,undefined);
});