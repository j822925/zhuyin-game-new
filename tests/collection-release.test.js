import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {COLLECTION_CROPS,COLLECTION_FISH,COLLECTION_RECIPES,COLLECTION_SHOP_FOODS} from '../data/collection-foods.js';
import {freshState,SAVE_KEY} from '../adventure-model.js';
import {createFarmLearningBridge} from '../farm-learning.bundle.js';
import {createReadingFarm} from '../reading-farm.bundle.js';
import {readingLaunchPlan} from '../reading-launch.js';
import {audioSource} from '../audio-source.js';
import {Round,createCatalog,questionDeck} from '../core.js';
import {tutorClips} from '../little-teacher.js';
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const decode=text=>text.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi,(_,a,b)=>String.fromCodePoint(parseInt(a||b,16)));
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};};
const version='20261022-collection1';

test('all four shipped bundles carry the complete new crop, fish and food catalogs',()=>{
 for(const file of ['adventure-entry.bundle.js','adventure-play.bundle.js','farm-learning.bundle.js','reading-farm.bundle.js']){
  const built=decode(source(file));
  for(const catalog of [COLLECTION_CROPS,COLLECTION_FISH,COLLECTION_RECIPES,COLLECTION_SHOP_FOODS])for(const item of Object.values(catalog))assert(built.includes(item.name),file+' missing '+item.name);
 }
});

test('home, farm, Safari and shortcut entry chains refresh the collection reading bundle',()=>{
 const refs={
  'index.html':['game-boot.js'],'grade2.html':['game-boot.js'],
  'game-boot.js':['app.js','reading-entry.js'],'reading-entry.js':['reading-launch.js'],
  'reading-shortcut.html':['reading-launch.js'],'reading.html':['reading-bootstrap.js'],
  'reading-bootstrap.js':['reading-launch.js','reading.js'],
  'reading.js':['farm-learning.bundle.js','reading-farm.bundle.js'],
  'app.js':['farm-learning.bundle.js'],'tone.js':['farm-learning.bundle.js'],
  'adventure-preview.html':['adventure-entry.bundle.js'],'adventure-entry.js':['adventure-play.bundle.js'],
 };
 for(const [file,imports]of Object.entries(refs))for(const name of imports){
  const expected=['adventure-entry.bundle.js','adventure-play.bundle.js'].includes(name)?'20261024-supplies1':['game-boot.js','app.js'].includes(name)?'20261023-zonemusic1':['reading-entry.js','reading-launch.js','reading-bootstrap.js','reading.js'].includes(name)?'20261023-life1':version;
  assert(source(file).includes(name+'?v='+expected),file+' -> '+name);
 }
 const ipad={userAgent:'iPad CPU OS 17_0 Version/17.0 Safari/605.1',standalone:true};
 for(const classId of ['main','grade2'])for(const page of ['reading.html?farmLesson=reading&','reading-shortcut.html?farmLesson=reading&','index.html?']){
  const plan=readingLaunchPlan('https://j822925.github.io/zhuyin-game-new/'+page+'class='+classId,ipad);
  for(const link of [plan.browserUrl,plan.safariUrl,plan.shortcutUrl]){const url=new URL(link);assert.equal(url.searchParams.get('v'),'20261023-life1');assert.equal(url.searchParams.get('class'),classId);assert.equal(url.searchParams.get('farmLesson'),page.includes('farmLesson')?'reading':null);}
 }
});

test('shipped farm bundle preserves new crops and only counts original questions when the helper adds review',()=>{
 const pool=createCatalog([['ㄅ','ㄠ','包'],['ㄇ','ㄧ','咪']]);
 for(const correct of [6,7]){
  const state=freshState();state.life.farmUnlocked=true;state.life.plots[0]={crop:'wheat',plantId:'release-wheat',watered:true,ready:false};
  const storage=memory(),tabStorage=memory();storage.setItem(SAVE_KEY,JSON.stringify(state));
  const bridge=createFarmLearningBridge({storage,tabStorage,href:'http://127.0.0.1/adventure-preview.html?class=main'});bridge.depart('spelling',{demo:true});
  const payload={seat:'115901',mode:'spelling',roundId:'release-helper-'+correct};assert(bridge.begin(payload,{demo:true,verified:true}));
  const round=new Round(questionDeck(pool,10));round.useTutor(pool,()=>0);let originals=0;
  while(round.current){if(!round.current.tutorReviewOf&&!round.current.tutorSpacer&&originals++>=correct)round.answer('錯');round.answer(round.current.label);round.next();}
  const result=bridge.complete({...payload,total:round.deck.length,results:round.rows},{demo:true,confirmed:true});
  assert.equal(result.correct,correct);assert.equal(result.total,10);assert.equal(result.grown,correct===7?1:0);assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).life.plots[0].ready,correct===7);
 }
});

test('shipped reading bundle matures all new reading crops across both isolated class routes',async()=>{
 for(const classId of ['main','grade2']){
  const state=freshState();state.life.farmUnlocked=true;state.life.learningOwner=JSON.stringify([classId,'live','115901']);
  const ids=Object.entries(COLLECTION_CROPS).filter(([,crop])=>crop.lesson==='reading').map(([id])=>id);
  ids.forEach((crop,i)=>state.life.plots[i]={crop,plantId:'release-'+crop,watered:true,ready:false});
  let remote={state,stars:77,revision:1,enabled:true};const calls=[];
  const farm=createReadingFarm({href:'https://example.test/reading.html?class='+classId+'&farmLesson=reading',storage:memory(),uuid:()=> 'release-operation',request:async data=>{calls.push(data);if(data.kind==='forest-load')return structuredClone(remote);assert.equal(data.delta,0);assert.equal(data.revision,1);remote={...remote,state:structuredClone(data.state),revision:2};return {saved:true};}});
  const payload={seat:'115901',mode:'reading',roundId:'release-reading-'+classId,total:5,results:Array.from({length:5},(_,i)=>({firstCorrect:i<4}))};
  assert(await farm.begin(payload));assert.equal((await farm.complete(payload,{confirmed:true})).grown,3);assert(remote.state.life.plots.slice(0,3).every(p=>p.ready));assert.equal(remote.stars,77);assert.equal(calls.filter(c=>c.kind==='forest-save').length,1);
  await farm.complete(payload,{confirmed:true});assert.equal(calls.filter(c=>c.kind==='forest-save').length,1);
 }
 assert(decode(source('reading-farm.bundle.js')).includes('作物長大了！'));assert(!decode(source('reading-farm.bundle.js')).includes('萵苣長大了！'));
});

test('collection release retains the approved single bo audio and helper audio mapping',()=>{
 const old='audio/processed-20260925/s_1.mp3',fresh='audio/teacher-20261020/L001.mp3';
 assert.equal(audioSource(old),fresh);assert(existsSync(new URL('../'+fresh,import.meta.url)));
 const clips=tutorClips({initial:'ㄅ',final:'ㄠ',tone:1,audio:'audio/syllable-clear/s1.wav'}).map(audioSource);assert.equal(clips[0],fresh);
 assert(source('app.js').includes("./audio-source.js?v=20261020-bo1"));assert(source('app.js').includes("./little-teacher.js?v=20261020-bo1"));
 assert(source('little-teacher.js').includes('voice.src=audioSource(clips[step])'));
});
