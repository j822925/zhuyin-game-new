import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../adventure-model.js';
import {commitLifeChange} from '../adventure-life-transaction.js';
import {plantCrop,waterCrop,harvestCrop,unlockActivity} from '../adventure-life-model.js';
import {cookMeal} from '../adventure-food-model.js';
import {beginDining} from '../adventure-dining.js';

test('a failed plant preserves its paid seed and retry consumes it exactly once',()=>{
 const s=freshState();s.life.farmUnlocked=true;s.life.seeds.pumpkin=1;
 const before=structuredClone(s);
 assert.equal(commitLifeChange(s,()=>plantCrop(s,0,'pumpkin'),()=>false),null);
 assert.deepEqual(s,before);
 assert.equal(commitLifeChange(s,()=>plantCrop(s,0,'pumpkin'),()=>true),true);
 assert.equal(s.life.seeds.pumpkin,0);assert.equal(s.life.plots[0].crop,'pumpkin');
});
test('failed watering and harvest preserve the growing batch; successful harvest yields six once',()=>{
 const s=freshState();s.life.farmUnlocked=true;plantCrop(s,0,'carrot');
 assert.equal(commitLifeChange(s,()=>waterCrop(s,0),()=>false),null);
 assert.equal(s.life.plots[0].watered,false);
 waterCrop(s,0);s.life.plots[0].ready=true;const before=structuredClone(s);
 assert.equal(commitLifeChange(s,()=>harvestCrop(s,0),()=>{throw Error('quota');}),null);
 assert.deepEqual(s,before);
 assert.equal(commitLifeChange(s,()=>harvestCrop(s,0),()=>true),'carrot');
 assert.equal(s.life.harvest.carrot,6);assert.equal(s.life.plots[0],null);
 assert.equal(commitLifeChange(s,()=>harvestCrop(s,0),()=>assert.fail('no duplicate save')),false);
});
test('cooking at zero energy rolls ingredients back on failure and retries once',()=>{
 const s=freshState();s.life.nutrition.energy=0;s.life.harvest.carrot=1;s.life.harvest.tomato=1;
 const context={area:'kitchen',stationId:'daisy-stove'},before=structuredClone(s);
 assert.equal(commitLifeChange(s,()=>cookMeal(s,'soup',context),()=>false),null);
 assert.deepEqual(s,before);
 assert.equal(commitLifeChange(s,()=>cookMeal(s,'soup',context),()=>true),true);
 assert.equal(s.life.nutrition.meals.soup,1);assert.equal(s.life.harvest.carrot,0);assert.equal(s.life.harvest.tomato,0);
});
test('dining rollback preserves food and energy; a retry consumes exactly one serving',()=>{
 const s=freshState();s.life.nutrition.energy=0;s.life.harvest.carrot=2;
 const scene={area:'room',player:{},reduced:{matches:true},dining:null},before=structuredClone(s);
 assert.equal(commitLifeChange(s,()=>beginDining(s,scene,'carrot',false,1),()=>false),null);
 assert.deepEqual(s,before);
 // The kitchen controller clears its transient animation after a rejected save.
 scene.dining=null;
 assert.equal(commitLifeChange(s,()=>beginDining(s,scene,'carrot',false,2),()=>true),8);
 assert.equal(s.life.harvest.carrot,1);assert.equal(s.life.nutrition.energy,8);
});
test('failed activity opening refunds stars and never claims it is unlocked',()=>{
 const s=freshState();s.stars=30;
 assert.equal(commitLifeChange(s,()=>unlockActivity(s,'farm'),()=>false),null);
 assert.equal(s.stars,30);assert.equal(s.life.farmUnlocked,false);
 assert.equal(commitLifeChange(s,()=>unlockActivity(s,'farm'),()=>true),true);
 assert.equal(s.stars,20);assert.equal(s.life.farmUnlocked,true);
});
