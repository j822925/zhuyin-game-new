import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ForestScene} from '../adventure-art.js';
import {freshState,FURNITURE} from '../adventure-model.js';
import {BASIC_TOILET} from '../data/bathroom-fixtures.js';
import {HOME_COMPLETION_ART} from '../data/home-completion-art.js';
import {restStatus,takeRest,toiletRemaining} from '../adventure-rest-model.js';

test('all six new bathroom shells draw one free toilet without creating owned furniture',()=>{
 const state=freshState();state.bathroomLayout=[];const original=structuredClone(state);
 const toiletImage={},shell={},background={},atlas={image:toiletImage,cells:HOME_COMPLETION_ART.daisyComplete.cells};
 for(const style of ['daisy','fox','moon','honey','ocean','berry']){
  const draws=[],positions=[],ctx=new Proxy({},{get:(_,key)=>key==='drawImage'?(...args)=>draws.push(args):key==='translate'?(...args)=>positions.push(args):()=>{},set:()=>true});
  const scene={area:'bathroom',art:{roomShells:{[style+':bathroom']:shell},daisyComplete:atlas},player:{x:640,y:600},editing:true,reduced:{matches:true}};
  ForestScene.prototype.renderRoom.call(scene,ctx,0,{...state,wallpaper:style});
  const actual=draws.filter(args=>args[0]===toiletImage);assert.equal(actual.length,1,style);
  assert.equal(actual[0].at(-1),BASIC_TOILET.height);assert(positions.some(([x,y])=>x===BASIC_TOILET.x&&y===BASIC_TOILET.y));
  draws.length=0;scene.art={bathroomGround:background,daisyComplete:atlas};
  ForestScene.prototype.renderRoom.call(scene,ctx,0,state);
  assert.equal(draws.filter(args=>args[0]===toiletImage).length,0,'legacy illustrated toilet is not drawn twice');
 }
 assert.deepEqual(state,original);
 const sprite=FURNITURE.find(f=>f.id==='daisy-complete-toilet');
 for(const key of ['height','fw','fh'])assert.equal(BASIC_TOILET[key],sprite[key],'hit area follows the rendered sprite');
});

test('free toilet still grants one energy at zero energy, at most five uses per Taipei day',()=>{
 const now=Date.parse('2026-10-25T04:00:00Z'),state=freshState(),owned=[...state.furnitureOwned];
 state.bathroomLayout=[];state.life.nutrition.energy=0;state.life.nutrition.updatedAt=now;
 assert.equal(toiletRemaining(state,now),5);assert.equal(restStatus(state,BASIC_TOILET.id,'room',now).reason,'missing');
 for(let count=0;count<5;count++){
  assert.equal(restStatus(state,BASIC_TOILET.id,'bathroom',now).ok,true);
  const result=takeRest(state,BASIC_TOILET.id,'bathroom',now);assert.equal(result.gain,1);assert.equal(result.remaining,4-count);
 }
 assert.equal(state.life.nutrition.energy,5);assert.equal(restStatus(state,BASIC_TOILET.id,'bathroom',now).reason,'used');
 assert.equal(toiletRemaining(state,now),0);assert.equal(toiletRemaining(state,now+86400000),5);
 assert.deepEqual(state.furnitureOwned,owned);assert.deepEqual(state.bathroomLayout,[]);
});

test('empty bathroom loads the fixed toilet art on entry, restore and read-only visits',()=>{
 const preview=readFileSync(new URL('../adventure-preview.js',import.meta.url),'utf8');
 const visits=readFileSync(new URL('../island-visits-ui.js',import.meta.url),'utf8');
 assert.match(preview,/area==='bathroom'\?\['daisyComplete'\]/);
 assert.match(preview,/scene\.area==='bathroom'\?\['daisyComplete'\]/);
 assert.match(visits,/id==='bathroom'\?\['daisyComplete'\]/);
});
