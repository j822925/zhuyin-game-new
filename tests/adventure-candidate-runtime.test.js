import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {startAdventureRelease} from '../adventure-release.js';
import {candidateDescriptor,CANDIDATE_ID,PREVIOUS_CANDIDATE_ID} from '../tools/build-adventure-candidate.mjs';
import {ADVENTURE_RELEASE_POLICY} from '../adventure-release-policy.js';
import {openForestSync,forestSaveKey} from '../adventure-sync.js';
import {freshState,FURNITURE,SAVE_KEY,sanitizeState} from '../adventure-model.js';
import {encodeHomeSurfaceState} from '../home-surface-storage.js';
import {floorPosition} from '../home-spatial-model.js';
import {freeSurfacePosition,furnitureSurfaces,surfaceAnchor} from '../furniture-surfaces.js';
import {createFarmLearningBridge} from '../farm-learning.bundle.js';

const release={id:'qa-perspective',bundle:'./adventure-candidate-qa-perspective.bundle.js',styles:['./adventure-candidate-qa-perspective.css']};
const policy={...ADVENTURE_RELEASE_POLICY,candidate:release};
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
function documentFixture(){
 const nodes=[],doc={documentElement:{dataset:{}},createElement:tag=>({tag,style:{},dataset:{},children:[],setAttribute(){},append(...items){this.children.push(...items);},remove(){}})};
 doc.head={append(node){nodes.push(node);queueMicrotask(()=>node.onload());}};doc.body={append(node){nodes.push(node);}};return {doc,nodes};
}
function kitchenState(right=false){
 const state=freshState(),f=FURNITURE.find(f=>f.id==='spatial-moon-corner-kitchen');
 const host={id:f.id,...floorPosition({x:right?1080:200,y:500},f,{area:'kitchen'})};state.kitchenLayout=[host];
 const surfaces=furnitureSurfaces(f),oven=freeSurfacePosition('collection-port-3',host,2,state.kitchenLayout,FURNITURE,surfaceAnchor(host,surfaces[2]));
 assert(oven);state.kitchenLayout.push({id:'collection-port-3',...oven,facing:'front'});
 for(const [id,surface]of [['collection-port-4',0],['collection-port-8',1]]){const pos=freeSurfacePosition(id,host,surface,state.kitchenLayout,FURNITURE);assert(pos);state.kitchenLayout.push({id,...pos,facing:surface===1?(right?'right':'left'):'front'});}
 state.furnitureOwned=[...new Set([...state.furnitureOwned,...state.kitchenLayout.map(p=>p.id)])];state.stars=321;return JSON.parse(JSON.stringify(state));
}

test('real runtime selector loads only stable for every non-target account, with no candidate CSS or DOM',async()=>{
 const identities=[...Array.from({length:20},(_,index)=>({classId:'main',seat:String(115001+index)})).filter(s=>s.seat!=='115015'),{classId:'grade2',seat:'115015'},null];
 for(const student of identities){
  const {doc,nodes}=documentFixture(),storage=memory();let stable=0,candidate=0,reloads=0;
  const result=await startAdventureRelease({student,policy,cryptoImpl:webcrypto,storage,documentImpl:doc,loadStable:async()=>{stable++;},loadCandidate:async()=>{candidate++;},reload:()=>{reloads++;}});
  assert.equal(result,'stable');assert.equal(stable,1);assert.equal(candidate,0);assert.equal(reloads,0);assert.deepEqual(nodes,[]);assert.deepEqual(doc.documentElement.dataset,{});
 }
});

test('teacher return flushes a real local save operation once and then runtime selects stable',async()=>{
 const original=kitchenState(),storage=memory(),selectorStorage=memory(),calls=[];let remote={enabled:true,state:structuredClone(original),stars:321,revision:7};
 const store=await openForestSync({key:forestSaveKey('main','115015'),storage,fresh:freshState,send:async data=>{calls.push(structuredClone(data));if(data.kind==='forest-load')return structuredClone(remote);assert.equal(data.kind,'forest-save');assert.equal(data.delta,0);remote={...remote,state:structuredClone(data.state),revision:8};return {stars:321,revision:8};}});
 store.classId='main';store.seat='115015';const {doc,nodes}=documentFixture();let loads=0,reloads=0,stable=0;
 assert.equal(await startAdventureRelease({student:store,policy,cryptoImpl:webcrypto,storage:selectorStorage,documentImpl:doc,loadStable:()=>{stable++;},loadCandidate:async()=>{loads++;},reload:()=>{reloads++;}}),'candidate');
 assert.equal(loads,1);assert.equal(calls.length,1,'selector has made no extra server requests');
 const changed=kitchenState(true);assert(store.save(encodeHomeSurfaceState(changed,FURNITURE)));
 const banner=nodes.find(n=>n.id==='adventure-test-release');assert(banner);await banner.children[1].onclick();
 assert.equal(reloads,1);assert.equal(calls.length,2);assert.equal(remote.stars,321);assert.deepEqual(remote.state.furnitureOwned,original.furnitureOwned);assert.deepEqual(sanitizeState(remote.state).kitchenLayout,changed.kitchenLayout);
 assert.deepEqual(remote.state.kitchenLayout,encodeHomeSurfaceState(changed,FURNITURE).kitchenLayout);
 assert.equal(await startAdventureRelease({student:store,policy,cryptoImpl:webcrypto,storage:selectorStorage,documentImpl:documentFixture().doc,loadStable:()=>{stable++;},loadCandidate:()=>assert.fail('bypassed candidate loaded')}),'stable');assert.equal(stable,1);
 assert.equal(JSON.parse(storage.getItem(store.key)).dirty,false);
});

test('published stable farm bundle retains candidate left/right kitchen attachments and ownership',()=>{
 for(const right of [false,true]){
  const state=kitchenState(right),storage=memory(),tabStorage=memory();state.life.farmUnlocked=true;state.life.plots[0]={crop:'corn',plantId:'candidate-fixture',watered:true,ready:false};
  storage.setItem(SAVE_KEY,JSON.stringify(encodeHomeSurfaceState(state,FURNITURE)));const bridge=createFarmLearningBridge({storage,tabStorage,href:'http://127.0.0.1/adventure-preview.html?class=main'});bridge.depart('single',{demo:true});
  const payload={seat:'115901',mode:'single',roundId:'candidate-'+right,total:10,results:Array.from({length:10},()=>({firstCorrect:true}))};assert(bridge.begin(payload,{demo:true,verified:true}));assert.equal(bridge.complete(payload,{demo:true,confirmed:true}).grown,1);
  const stored=JSON.parse(storage.getItem(SAVE_KEY)),saved=sanitizeState(stored);assert.equal(saved.stars,321);assert.deepEqual(saved.furnitureOwned,state.furnitureOwned);
  assert.deepEqual(stored.kitchenLayout.map(p=>p.id),state.kitchenLayout.map(p=>p.id),'the published bundle must retain every placed item');
  const relationships=layout=>layout.map(({x,y,...fields})=>{assert(Number.isFinite(x)&&Number.isFinite(y));return fields;});
  assert.deepEqual(relationships(saved.kitchenLayout),relationships(state.kitchenLayout));
 }
});

test('returning to stable from the first candidate does not opt the teacher out of the second candidate',async()=>{
 const storage=memory(),student={classId:'main',seat:'115015',flush:async()=>true};let stable=0,reloads=0;
 for(const id of [PREVIOUS_CANDIDATE_ID,CANDIDATE_ID]){
  const selectedPolicy={...ADVENTURE_RELEASE_POLICY,candidate:candidateDescriptor(id)},fixture=documentFixture(),loaded=[];
  const args={student,policy:selectedPolicy,cryptoImpl:webcrypto,storage,documentImpl:fixture.doc,loadStable:()=>{stable++;},loadCandidate:async url=>loaded.push(url),reload:()=>{reloads++;}};
  assert.equal(await startAdventureRelease(args),'candidate');assert.deepEqual(loaded,[candidateDescriptor(id).bundle]);
  const banner=fixture.nodes.find(node=>node.id==='adventure-test-release');await banner.children[1].onclick();
  assert.equal(await startAdventureRelease({...args,documentImpl:documentFixture().doc,loadCandidate:()=>assert.fail('returned version loaded')}),'stable');
 }
 assert.equal(reloads,2);assert.equal(stable,2);
});
