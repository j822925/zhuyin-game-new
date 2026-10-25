import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {selectAdventureRelease,startAdventureRelease,rememberStableRelease} from '../adventure-release.js';
import {ADVENTURE_RELEASE_POLICY} from '../adventure-release-policy.js';

const student={classId:'main',seat:'115015'};
const candidate={id:'qa-layout2',bundle:'./adventure-candidate-qa-layout2.bundle.js',styles:['./adventure-candidate-qa-layout2.css']};
const policy={...ADVENTURE_RELEASE_POLICY,candidate};
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const select=(options={})=>selectAdventureRelease({student,policy,cryptoImpl:webcrypto,storage:memory(),...options});
function fakeDocument({styleError=false}={}){
  const nodes=[];
  const doc={documentElement:{dataset:{}},createElement:tag=>({tag,style:{},dataset:{},children:[],setAttribute(){},append(...v){this.children.push(...v);},remove(){}})};
  doc.head={append(link){nodes.push(link);queueMicrotask(()=>styleError?link.onerror():link.onload());}};
  doc.body={append(node){nodes.push(node);}};doc.nodes=nodes;return doc;
}

test('release remains stable until an explicit candidate is configured',async()=>{
  const disabledPolicy={...ADVENTURE_RELEASE_POLICY,candidate:null};
  assert.equal(await select({policy:disabledPolicy}),null);
  let stable=0;
  assert.equal(await startAdventureRelease({student,policy:disabledPolicy,loadStable:()=>{stable++;},loadCandidate:()=>assert.fail('disabled candidate loaded')}),'stable');
  assert.equal(stable,1);
});

test('only exact authenticated class and full student identifier select the candidate',async()=>{
  assert.equal((await select()).id,candidate.id);
  for(const identity of [null,{classId:'main',seat:'15'},{classId:'main',seat:115015},{classId:'main',seat:'115016'},{classId:'grade2',seat:'115015'},{classId:'main',seat:'115014'}])assert.equal(await select({student:identity}),null);
  const source=readFileSync(new URL('../adventure-entry.js',import.meta.url),'utf8');
  assert(source.indexOf('await connectForestStudent')<source.indexOf('await startAdventureRelease'));
  assert.match(source,/if\(globalThis\.ForestStudent\)await startAdventureRelease/);
  assert(!readFileSync(new URL('../adventure-release.js',import.meta.url),'utf8').includes('URLSearchParams'));
});

test('malformed, cross-origin and mutable shared assets never become candidate paths',async()=>{
  for(const patch of [{id:'../../escape'},{bundle:'https://elsewhere.test/game.js'},{bundle:'./adventure-play.bundle.js'},{styles:['./adventure-home.css']},{styles:['//elsewhere.test/a.css']},{styles:['./adventure-candidate-qa-layout2.css?overwrite=1']},{styles:null}])assert.equal(await select({policy:{...policy,candidate:{...candidate,...patch}}}),null);
  assert.equal(await select({cryptoImpl:null}),null);
  assert.equal(await select({storage:null}),null);
  assert.equal(await select({storage:{getItem(){throw Error('blocked');},setItem(){}}}),null);
  assert.equal(await select({storage:{getItem(){return null;},setItem(){throw Error('readonly');}}}),null);
});

test('return to stable is scoped to candidate version and authenticated identity',async()=>{
  const storage=memory(),release=await select({storage});
  assert(rememberStableRelease(release,storage));assert.equal(await select({storage}),null);
  const next={id:'qa-layout3',bundle:'./adventure-candidate-qa-layout3.bundle.js',styles:[]};
  assert.equal((await select({storage,policy:{...policy,candidate:next}})).id,'qa-layout3');
  assert.equal(rememberStableRelease(release,{setItem(){throw Error('blocked');}}),false);
});

test('candidate styles and module failures reload stable without double initialization',async()=>{
  for(const styleError of [true,false]){
    const storage=memory(),doc=fakeDocument({styleError});let candidateLoads=0,reloads=0,stable=0;
    const result=await startAdventureRelease({student,policy,cryptoImpl:webcrypto,storage,documentImpl:doc,loadStable:()=>{stable++;},loadCandidate:()=>{candidateLoads++;throw Error('failed halfway');},reload:()=>{reloads++;}});
    assert.equal(result,'recovering');assert.equal(reloads,1);assert.equal(stable,0);assert.equal(candidateLoads,styleError?0:1);assert.equal(await select({storage}),null);
  }
});

test('test banner saves before returning, and a rejected save does not leave the game',async()=>{
  const doc=fakeDocument(),storage=memory();let saved=false,reloads=0;
  assert.equal(await startAdventureRelease({student:{...student,flush:async()=>saved},policy,cryptoImpl:webcrypto,storage,documentImpl:doc,loadStable:()=>assert.fail('stable loaded'),loadCandidate:async()=>{},reload:()=>{reloads++;}}),'candidate');
  const banner=doc.nodes.find(n=>n.id==='adventure-test-release'),[label,button]=banner.children;
  assert.equal(label.textContent,'老師測試版');assert.equal(button.textContent,'回正式版');
  await button.onclick();assert.equal(reloads,0);assert.equal(button.disabled,false);assert.equal(label.textContent,'請先完成保存');
  saved=true;await button.onclick();assert.equal(reloads,1);assert.equal(await select({storage}),null);
});
