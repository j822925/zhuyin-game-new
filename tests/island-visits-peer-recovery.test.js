import test from 'node:test';
import assert from 'node:assert/strict';
import {openVisitPeer} from '../island-visits-peer.js';

function fixture(t,{hosting=false}={}){
 const originals={WebSocket:globalThis.WebSocket,RTCPeerConnection:globalThis.RTCPeerConnection},pcs=[],left=[],seen=[],status=[];let socket;
 class Channel{
  constructor(label,options){this.label=label;this.options=options;this.readyState='open';this.bufferedAmount=0;this.sent=[];}
  send(s){this.sent.push(JSON.parse(s));}
  close(){this.readyState='closed';this.onclose?.();}
  receive(m){this.onmessage?.({data:JSON.stringify(m)});}
 }
 globalThis.WebSocket=class{
  constructor(){socket=this;this.readyState=1;this.sent=[];}
  send(s){this.sent.push(JSON.parse(s));}
  close(){this.readyState=3;this.onclose?.();}
 };
 globalThis.RTCPeerConnection=class{
  constructor(){pcs.push(this);this.channels=[];this.connectionState='new';}
  createDataChannel(label,options){const ch=new Channel(label,options);this.channels.push(ch);return ch;}
  async createOffer(){return {type:'offer',sdp:'fixture'};}
  async setLocalDescription(d){this.localDescription=d;}
  close(){this.connectionState='closed';}
 };
 const peer=openVisitPeer({socketUrl:'ws://fixture.invalid',ticket:'not-real',seat:'990001',hosting,onStatus:s=>status.push(s),onInvitation(){},onPose:(id,p)=>seen.push([id,p]),onLeave:id=>left.push(id)});
 t.after(()=>{peer.close();Object.assign(globalThis,originals);});
 const message=m=>socket.onmessage({data:JSON.stringify(m)});
 async function pair(id='990002'){
  await message({type:'paired',seat:id,offer:true});const pc=pcs.at(-1),ch=pc.channels[0];ch.onopen();return {pc,ch};
 }
 const pose=(ch,id)=>ch.receive({type:'pose',seat:id,pose:{room:'room',x:520,y:600,character:'rabbit',outfit:'daisy'}});
 return {peer,pcs,left,seen,status,pair,message,pose,Channel,get socket(){return socket;}};
}

test('guest uplink loss removes the host and every relayed visitor, so no ghost remains selectable',async t=>{
 const f=fixture(t),{pc,ch}=await f.pair();f.pose(ch,'990002');f.pose(ch,'990003');f.pose(ch,'990004');
 assert.equal(f.seen.length,3);pc.connectionState='failed';pc.onconnectionstatechange();
 assert.deepEqual(f.left.sort(),['990002','990003','990004']);
 assert.equal(f.status.at(-1),'offline');
 const after=f.seen.length;f.pose(ch,'990003');assert.equal(f.seen.length,after,'late movement is ignored');
});

test('host losing one guest preserves other guests and notifies only that departure',async t=>{
 const f=fixture(t,{hosting:true}),a=await f.pair('990002'),b=await f.pair('990003');
 f.pose(a.ch,'990002');f.pose(b.ch,'990003');a.pc.connectionState='failed';a.pc.onconnectionstatechange();
 assert.deepEqual(f.left,['990002']);assert.equal(b.pc.connectionState,'new');assert.equal(f.status.at(-1),'hosting','other visitors can still join');
 assert.deepEqual(b.ch.sent.at(-1),{type:'left',seat:'990002'});
 f.pose(b.ch,'990003');assert.equal(f.seen.at(-1)[0],'990003');
});

test('a full four-player room can relay 30 movement frames per second without disconnecting guests',async t=>{
 const f=fixture(t),{pc,ch}=await f.pair();
 for(let frame=0;frame<10;frame++)for(const id of ['990002','990003','990004'])f.pose(ch,id);
 assert.equal(f.seen.length,30);assert.deepEqual(f.left,[]);assert.equal(pc.connectionState,'new');
});

test('the host still limits an individual visitor flooding movement packets',async t=>{
 const f=fixture(t,{hosting:true}),{pc,ch}=await f.pair();
 for(let frame=0;frame<26;frame++)f.pose(ch,'990002');
 assert.deepEqual(f.left,['990002']);assert.equal(pc.connectionState,'closed');assert.equal(f.seen.length,25);
});

test('old connection callbacks cannot remove a replacement connection or republish old poses',async t=>{
 const f=fixture(t),old=await f.pair(),current=await f.pair();
 f.left.length=0;const statusCount=f.status.length,seenCount=f.seen.length;
 old.pc.onconnectionstatechange();old.ch.onclose();old.ch.onopen();f.pose(old.ch,'990003');
 old.pc.onicecandidate({candidate:{toJSON:()=>({candidate:'stale'})}});
 const extra=new f.Channel('island');old.pc.ondatachannel({channel:extra});
 assert.equal(extra.readyState,'closed');assert.deepEqual(f.left,[]);assert.equal(f.status.length,statusCount);assert.equal(f.seen.length,seenCount);
 f.pose(current.ch,'990002');assert.equal(f.seen.at(-1)[0],'990002');assert.equal(current.pc.connectionState,'new');
 assert(!f.socket.sent.some(m=>m.signal?.candidate?.candidate==='stale'));
});

test('closing a visit ignores delayed pairing and a pending WebRTC answer rejection',async t=>{
 const f=fixture(t),{pc}=await f.pair();let reject;
 pc.setRemoteDescription=()=>new Promise((_,r)=>{reject=r;});
 const pending=f.message({type:'signal',seat:'990002',signal:{description:{type:'offer',sdp:'delayed'}}});
 const replacement=await f.pair();f.left.length=0;const count=f.status.length;
 reject(Error('old connection closed'));await pending;
 assert.deepEqual(f.left,[]);assert.equal(f.status.length,count);assert.equal(replacement.pc.connectionState,'new');
 f.peer.close();const connections=f.pcs.length;await f.message({type:'paired',seat:'990003',offer:true});
 assert.equal(f.pcs.length,connections);
});
