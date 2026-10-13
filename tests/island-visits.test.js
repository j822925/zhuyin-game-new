import test from 'node:test';import assert from 'node:assert/strict';
import {islandSnapshot,cleanVisitPose,changeGift,giftBlocked} from '../island-visits-model.js';
import {openForestSync} from '../adventure-sync.js';
test('public snapshot has only finite approved layout fields and preserves furniture attachments',()=>{
 const s=islandSnapshot({stars:999,life:{private:1},token:'secret',name:'secret',layout:[{id:'doll',x:500,y:490,on:'table',surface:2,offsetX:12,private:42},{id:'<script>'}],wallpaper:'moon'});
 assert.deepEqual(Object.keys(s).sort(),['version','wallpaper','layout','bedroomLayout','kitchenLayout','bathroomLayout'].sort());assert.equal(s.layout.length,1);assert.equal(s.layout[0].on,'table');assert.equal(s.layout[0].surface,2);assert(!JSON.stringify(s).includes('secret'));assert(!JSON.stringify(s).includes('private'));
});
test('peer packets cannot carry free text, arbitrary room names or nonfinite coordinates',()=>{
 assert.equal(cleanVisitPose({room:'admin',x:1,y:1}),null);assert.equal(cleanVisitPose({room:'room',x:NaN,y:1}),null);
 const p=cleanVisitPose({room:'room',x:99999,y:-4,emote:'free chat',token:'secret'});assert.equal(p.x,1240);assert.equal(p.y,120);assert.equal(p.emote,'');assert(!('token'in p));
});
test('gifts preserve unrelated data and protect placed/worn items and duplicate unique holdings',()=>{
 const s={stars:30,life:{seeds:{pumpkin:3}},furnitureOwned:['doll'],layout:[{id:'doll'}],outfit:'dress'};
 assert(giftBlocked(s,{kind:'furniture',id:'doll'}));assert(giftBlocked(s,{kind:'clothes',id:'dress'}));
 const n=changeGift(s,{kind:'seeds',id:'pumpkin'},-2);assert.equal(n.life.seeds.pumpkin,1);assert.equal(s.life.seeds.pumpkin,3);assert.equal(n.stars,30);
 assert.throws(()=>changeGift(s,{kind:'furniture',id:'doll'},1),/gift_owned/);
});
test('publish and adopt advance sync revision without overwriting a gift with an old local save',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const mem=new Map(),storage={getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)};let count=0;
 const a=await openForestSync({key:'fixture',storage,fresh:()=>({version:1}),send:async d=>({state:d.state||null,revision:d.kind==='forest-save'?++count:0,stars:50,enabled:true})});
 await a.publish();assert.equal(count,1);assert.equal(a.revision,1);
 const updated=a.adopt({state:{version:1,life:{seeds:{pumpkin:4}}},revision:2,stars:50});assert.equal(updated.life.seeds.pumpkin,4);assert.equal(a.revision,2);
 a.save(updated);await a.flush();assert.equal(count,1);
 updated.life.seeds.pumpkin=3;a.save(updated);assert.throws(()=>a.adopt({}),/pending_save/);await a.flush();
});
