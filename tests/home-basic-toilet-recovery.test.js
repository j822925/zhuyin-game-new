import test from 'node:test';
import assert from 'node:assert/strict';
import {ForestScene} from '../adventure-art.js';
import {freshState,sanitizeState,FURNITURE,storeFurniture,placeFurniture} from '../adventure-model.js';
import {BASIC_TOILET} from '../data/bathroom-fixtures.js';
import {HOME_COMPLETION_ART} from '../data/home-completion-art.js';
import {restStatus,takeRest,toiletRemaining} from '../adventure-rest-model.js';
const id=BASIC_TOILET.id;
test('free toilet migrates once, can move/store/reload and never respawns',()=>{
 const legacy=freshState();legacy.furnitureOwned=legacy.furnitureOwned.filter(x=>x!==id);legacy.bathroomLayout=[];
 const s=sanitizeState(legacy);assert(s.furnitureOwned.includes(id));assert.deepEqual(s.bathroomLayout,[BASIC_TOILET]);
 assert(placeFurniture(s,id,{x:600,y:500},{x:850,y:600},'bathroom'));assert.equal(sanitizeState(s).bathroomLayout[0].x,600);
 assert(storeFurniture(s,id,'bathroom'));assert.deepEqual(sanitizeState(s).bathroomLayout,[]);assert(sanitizeState(s).furnitureOwned.includes(id));
 assert.equal(restStatus(s,id,'bathroom').reason,'missing');
 assert(placeFurniture(s,id,BASIC_TOILET,{x:850,y:600},'bathroom'));assert.equal(sanitizeState(s).bathroomLayout.length,1);
});
test('purchased toilets and existing rest quota remain unchanged on migration',()=>{
 const raw=freshState();raw.furnitureOwned=raw.furnitureOwned.filter(x=>x!==id);raw.furnitureOwned.push('honey-toilet');raw.bathroomLayout=[{id:'honey-toilet',x:600,y:500}];raw.homeRest.toilet={day:'2026-10-25',count:4};
 const s=sanitizeState(raw);assert.deepEqual(s.bathroomLayout,raw.bathroomLayout);assert.deepEqual(s.homeRest,raw.homeRest);assert(s.furnitureOwned.includes(id));assert.equal(s.stars,raw.stars);
});
test('all bathroom shells draw placed toilet once and no ghost after storage',()=>{
 const state=freshState(),toiletImage={},shell={},atlas={image:toiletImage,cells:HOME_COMPLETION_ART.daisyComplete.cells};
 for(const style of ['daisy','fox','moon','honey','ocean','berry']){
  const draws=[],ctx=new Proxy({},{get:(_,key)=>key==='drawImage'?(...args)=>draws.push(args):()=>{},set:()=>true});
  const scene={area:'bathroom',art:{roomShells:{[style+':bathroom']:shell},daisyComplete:atlas},player:{x:640,y:600},editing:true,reduced:{matches:true}};
  ForestScene.prototype.renderRoom.call(scene,ctx,0,{...state,wallpaper:style});assert.equal(draws.filter(a=>a[0]===toiletImage).length,1);
  draws.length=0;ForestScene.prototype.renderRoom.call(scene,ctx,0,{...state,wallpaper:style,bathroomLayout:[]});assert.equal(draws.filter(a=>a[0]===toiletImage).length,0);
 }
});
test('all toilets share five daily uses even when swapped or reloaded, including at zero energy',()=>{
 const now=Date.now();let state=freshState();state.life.nutrition.energy=0;state.life.nutrition.updatedAt=now;
 state.furnitureOwned.push('honey-toilet');state.bathroomLayout.push({id:'honey-toilet',x:600,y:500});
 for(let i=0;i<5;i++){const result=takeRest(state,i%2?id:'honey-toilet','bathroom',now);assert.equal(result.gain,1);state=sanitizeState(state);}
 assert.equal(state.life.nutrition.energy,5);assert.equal(toiletRemaining(state,now),0);assert.equal(restStatus(state,id,'bathroom',now).reason,'used');assert.equal(toiletRemaining(state,now+86400000),5);
 assert(FURNITURE.find(f=>f.id===id).starter);
});
import {createFarmLearningBridge} from '../farm-learning.bundle.js';
import {SAVE_KEY} from '../adventure-model.js';
test('cached farm bundle preserves stored toilet ownership without putting it back',()=>{
 const s=freshState();s.bathroomLayout=[];s.life.farmUnlocked=true;s.life.plots[0]={crop:'carrot',plantId:'toilet-compat',watered:true,ready:false};
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};storage.setItem(SAVE_KEY,JSON.stringify(s));
 const bridge=createFarmLearningBridge({storage,tabStorage:storage,href:'http://127.0.0.1/adventure-preview.html?class=main'});
 bridge.depart('single',{demo:true});const p={seat:'115901',mode:'single',roundId:'toilet-compat'};assert(bridge.begin(p,{demo:true,verified:true}));
 bridge.complete({...p,total:10,results:Array.from({length:10},()=>({correct:true}))},{demo:true,confirmed:true});
 const restored=sanitizeState(JSON.parse(storage.getItem(SAVE_KEY)));assert(restored.furnitureOwned.includes(id));assert.deepEqual(restored.bathroomLayout,[]);
});
