import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_KEY} from '../adventure-model.js';
import {forestSaveKey} from '../adventure-sync.js';
import {CROPS,beginFarmRound,farmRoundScore,settleFarmRound,harvestCrop} from '../adventure-life-model.js';
import {CROP_LESSONS} from '../data/farm-lessons.js';
import {LESSON_CROPS} from '../data/lesson-harvest-foods.js';
import {createFarmLearningBridge} from '../farm-learning-bridge.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};};
const ids=Object.keys(LESSON_CROPS);
const round=(mode,total,correct=total)=>({mode,total,expectedTotal:total,completed:true,kind:'solo',seat:'115901',roundId:'farm-six-'+mode,results:Array.from({length:total},(_,i)=>({firstCorrect:i<correct}))});
const plot=crop=>({crop,plantId:'p-'+crop,watered:true,ready:false});
function fixture(classId='main',demo=false){
 const state=freshState();state.life.farmUnlocked=true;state.life.plots=ids.map(plot);state.stars=77;
 state.kitchenLayout=[{id:'spatial-moon-corner-kitchen',x:955,y:500,facing:'right',mount:'corner-right'}];
 const storage=memory(),tabStorage=memory(),key=demo?SAVE_KEY:forestSaveKey(classId,'115901');
 storage.setItem(key,JSON.stringify(demo?state:{state,revision:4,baseStars:77,dirty:false}));
 const bridge=createFarmLearningBridge({storage,tabStorage,href:'https://example.test/game/adventure-preview.html?class='+classId});
 return {state,storage,tabStorage,key,bridge,read:()=>{const r=JSON.parse(storage.getItem(key));return demo?r:r.state;}};
}
test('six links target the exact matching activity and preserve class, demo and return path',()=>{
 for(const classId of ['main','grade2'])for(const demo of [false,true])for(const crop of ids){
  const mode=CROPS[crop].lesson,f=fixture(classId,demo),link=new URL(f.bridge.depart(mode,{demo})),expected=new URL(CROP_LESSONS[mode].page,'https://example.test/game/');
  assert.equal(link.pathname,expected.pathname);assert.equal(link.searchParams.get('mode'),expected.searchParams.get('mode'));
  assert.equal(link.searchParams.get('class'),classId);assert.equal(link.searchParams.get('farmLesson'),mode);assert.equal(link.searchParams.get('demo'),demo?'1':null);
  const back=new URL(f.bridge.returnUrl());assert.equal(back.searchParams.get('class'),classId);assert.equal(back.searchParams.get('returnFarm'),'1');assert.equal(back.searchParams.has('seat'),false);assert.equal(back.searchParams.has('token'),false);
 }
});
test('each qualifying lesson grows only its matching planted crop; preserves the other five and yields six once',()=>{
 for(const classId of ['main','grade2'])for(const demo of [false,true])for(const crop of ids){
  const f=fixture(classId,demo),mode=CROPS[crop].lesson,total=mode.startsWith('name-')?3:5,p=round(mode,total,Math.ceil(total*.7));
  f.bridge.depart(mode,{demo});assert.equal(f.bridge.begin(p,{demo,verified:true}),true);
  assert.equal(f.bridge.complete(p,{demo}).status,'pending');assert.equal(f.read().life.plots.find(p=>p.crop===crop).ready,false);
  assert.equal(f.bridge.complete(p,{demo,confirmed:true}).grown,1);const saved=f.read();
  assert.equal(saved.life.plots.filter(p=>p.ready).length,1);assert.equal(saved.life.plots.find(p=>p.crop===crop).ready,true);
  assert.equal(saved.stars,77);assert.deepEqual(saved.kitchenLayout,f.state.kitchenLayout);
  assert.equal(f.bridge.complete(p,{demo,confirmed:true}).grown,0);assert.equal(harvestCrop(saved,ids.indexOf(crop)),crop);assert.equal(saved.life.harvest[crop],6);assert.equal(harvestCrop(saved,ids.indexOf(crop)),false);
 }
});
test('return context requires this class, matching activity and demo mode, and reuses only the same demo owner',()=>{
 const f=fixture('grade2',true);let state=f.read();state.life.learningOwner=JSON.stringify(['grade2','demo','119901']);f.storage.setItem(f.key,JSON.stringify(state));
 const link=f.bridge.depart('name-copy',{demo:true});
 const context=href=>createFarmLearningBridge({storage:f.storage,tabStorage:f.tabStorage,href}).context();
 assert.deepEqual(context(link),{mode:'name-copy',demo:true,seat:'119901',returnUrl:f.bridge.returnUrl()});
 for(const href of [link.replace('grade2','main'),link.replace('demo=1','demo=0'),link.replace('farmLesson=name-copy','farmLesson=name-writing'),link.replace('hanzi-copy.html','arithmetic.html')])assert.equal(context(href),null);
 state.life.learningOwner=JSON.stringify(['main','live','119902']);f.storage.setItem(f.key,JSON.stringify(state));assert.equal(context(link).seat,'01');
});
test('first-answer 70 percent uses actual 1–5 character, 2–6 name and 5/10/20 arithmetic round lengths',()=>{
 for(const mode of ['hanzi-reading','hanzi-writing','hanzi-copy','name-writing','name-copy','arithmetic']){
  const totals=mode==='arithmetic'?[5,10,20]:mode.startsWith('name-')?[2,3,4,5,6]:[1,2,3,4,5];
  for(const total of totals){const crop=ids.find(id=>CROPS[id].lesson===mode),s=freshState();s.life.farmUnlocked=true;s.life.plots[0]=plot(crop);
   const good=round(mode,total,Math.ceil(total*.7)),ticket=beginFarmRound(s,{...good,owner:'owner',allowClaim:true});assert(ticket);
   assert.equal(settleFarmRound(s,ticket,round(mode,total,Math.ceil(total*.7)-1)),0);
   assert.equal(settleFarmRound(s,ticket,good),1);
  }
 }
});
test('unfinished, wrong kind, partial and inflated snapshot results cannot grow a field',()=>{
 const p=round('hanzi-reading',5),s=freshState();s.life.farmUnlocked=true;s.life.plots[0]=plot('cabbage');
 const ticket=beginFarmRound(s,{...p,owner:'owner',allowClaim:true});
 for(const bad of [{...p,completed:false},{...p,kind:'exam'},{...p,kind:'assignment'},{...p,kind:'notebook'},{...p,kind:'race'},{...p,results:p.results.slice(1)},{...p,total:4},{...p,expectedTotal:4},{...p,results:[...p.results.slice(1),{firstCorrect:true,bonus:true}]},{...p,results:[...p.results.slice(1),{firstCorrect:null}]}])assert.equal(farmRoundScore(bad),null);
 assert.equal(settleFarmRound(s,ticket,round('hanzi-reading',4)),0);
 assert.equal(beginFarmRound(s,{...p,total:20,expectedTotal:20,owner:'owner',allowClaim:true}),null);
 assert.equal(settleFarmRound(s,ticket,{...p,roundId:'not-the-started-round'}),0);
 assert.equal(s.life.plots[0].ready,false);
});
test('tickets reject wrong identity, unverified login, later planting and cross-class replay',()=>{
 const f=fixture(),p=round('hanzi-reading',5);f.bridge.depart(p.mode);
 assert.equal(f.bridge.begin(p),false);assert.equal(f.bridge.begin({...p,seat:'115902'},{verified:true}),false);
 assert.equal(f.bridge.begin(p,{verified:true}),true);
 assert.equal(f.bridge.begin({...p,total:4,expectedTotal:4},{verified:true}),false);
 const r=JSON.parse(f.storage.getItem(f.key));r.state.life.plots[0]= {...plot('cabbage'),plantId:'new-after-start'};f.storage.setItem(f.key,JSON.stringify(r));
 assert.equal(f.bridge.complete(p,{confirmed:true}).grown,0);
 const other=createFarmLearningBridge({storage:f.storage,tabStorage:f.tabStorage,href:'https://example.test/game/hanzi.html?class=grade2'});
 assert.equal(other.complete(p,{confirmed:true}).status,'unlinked');assert.equal(other.returnUrl(),null);
});
test('failed farm save can retry after grade is saved without duplicate harvest or rewards',()=>{
 const f=fixture(),p=round('hanzi-copy',5);f.bridge.depart(p.mode);assert(f.bridge.begin(p,{verified:true}));
 const write=f.storage.setItem;f.storage.setItem=()=>{throw Error('quota');};
 assert.equal(f.bridge.complete(p,{confirmed:true}).status,'storage-error');assert(f.read().life.plots.every(p=>!p.ready));
 f.storage.setItem=write;assert.equal(f.bridge.complete(p,{confirmed:true}).grown,1);assert.equal(f.bridge.complete(p,{confirmed:true}).grown,0);assert.equal(f.read().stars,77);
});
test('lessons preserve future inventory and unknown crop slots while touching only their captured plants',()=>{
 const f=fixture(),r=JSON.parse(f.storage.getItem(f.key));r.state.futureRoom={style:'keep'};r.state.life.seeds['future-seed']=9;r.state.life.harvest['future-crop']=12;r.state.life.nutrition.meals['future-meal']=3;r.state.life.plots[5]={crop:'future-crop',plantId:'future',watered:true,ready:false};f.storage.setItem(f.key,JSON.stringify(r));
 const p=round('hanzi-reading',5);f.bridge.depart(p.mode);assert(f.bridge.begin(p,{verified:true}));assert.equal(f.bridge.complete(p,{confirmed:true}).grown,1);
 const saved=f.read();assert.deepEqual(saved.futureRoom,r.state.futureRoom);assert.equal(saved.life.seeds['future-seed'],9);assert.equal(saved.life.harvest['future-crop'],12);assert.equal(saved.life.nutrition.meals['future-meal'],3);assert.deepEqual(saved.life.plots[5],r.state.life.plots[5]);
});
