import test from 'node:test';import assert from 'node:assert/strict';import {openVisitPeer} from '../island-visits-peer.js';
test('social channel is capability-gated, reliable, stamped and never sends animations to the cloud',async()=>{
 const originals={WebSocket:globalThis.WebSocket,RTCPeerConnection:globalThis.RTCPeerConnection};let socket,pc;const seen=[];
 class Channel{constructor(label,options){this.label=label;this.options=options;this.readyState='open';this.bufferedAmount=0;this.sent=[];}send(s){this.sent.push(JSON.parse(s));}close(){this.readyState='closed';}}
 globalThis.WebSocket=class{constructor(){socket=this;this.readyState=1;this.sent=[];}send(s){this.sent.push(JSON.parse(s));}close(){this.readyState=3;this.onclose?.();}};
 globalThis.RTCPeerConnection=class{constructor(){pc=this;this.channels=[];}createDataChannel(l,o){const c=new Channel(l,o);this.channels.push(c);return c;}async createOffer(){return {type:'offer',sdp:'fixture'};}async setLocalDescription(d){this.localDescription=d;}close(){}};
 const peer=openVisitPeer({socketUrl:'ws://fixture.invalid',ticket:'fake',seat:'990001',hosting:true,onStatus(){},onInvitation(){},onPose(){},onLeave(){},onSocial:(seat,event)=>seen.push({seat,event})});
 try{
  await socket.onmessage({data:JSON.stringify({type:'paired',seat:'990002',offer:true})});
  assert.equal(pc.channels.length,1,'old peers get only their original channel');const movement=pc.channels[0];movement.onopen();
  movement.onmessage({data:'null'});
  movement.onmessage({data:JSON.stringify({type:'social-cap',v:1})});assert.equal(pc.channels.length,2);
  const reliable=pc.channels[1];assert.equal(reliable.label,'island-social-v1');assert.equal(reliable.options,undefined,'WebRTC defaults ordered and fully reliable');
  movement.onmessage({data:JSON.stringify({type:'social-cap',v:1})});assert.equal(pc.channels.length,2);
  movement.onmessage({data:JSON.stringify({type:'pose',seat:'999999',pose:{room:'room',x:500,y:600,direction:0,character:'fox',outfit:'fox-stars'}})});
  const event={v:1,type:'solo',id:'motion-1',action:'wave',room:'room',target:''};
  reliable.onmessage({data:JSON.stringify({type:'social',seat:'999999',event})});assert.equal(seen[0].seat,'990002');
  reliable.onmessage({data:JSON.stringify({type:'social',event:{...event,action:'free-text'}})});assert.equal(seen.length,1);
  const cloudCount=socket.sent.length;peer.sendSocial(event);assert.equal(reliable.sent.at(-1).event.action,'wave');assert.equal(socket.sent.length,cloudCount);
 }finally{peer.close();Object.assign(globalThis,originals);}
});
