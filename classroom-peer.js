import {addPlayer,advance,hostCommand,playerCommand,roomView,pause} from './classroom-peer-engine.js?v=20261007-peer1';
export const DIRECT_ICE={iceServers:[{urls:'stun:stun.cloudflare.com:3478'}],iceTransportPolicy:'all'};
// No TURN credentials, media tracks, frame streaming, or automatic cloud relay.
export class LocalCoordinator{
 constructor({room,emit,checkpoint=()=>{},now=Date.now,timer=(fn,ms)=>globalThis.setTimeout(fn,ms),clear=id=>globalThis.clearTimeout(id)}){this.room=room;this.emit=emit;this.checkpoint=checkpoint;this.now=now;this.timer=timer;this.clear=clear;this.online=new Set();this.deadlineTimer=null;}
 view(seat){return {...roomView(this.room,seat?{role:'student',seat}:{role:'host'},['host',...this.online],this.now()),transport:'peer',preview:true,recordsPending:false,rewardsPending:false};}
 publish(){this.checkpoint(this.room);this.emit('host',{type:'state',state:this.view()});for(const seat of this.online)this.emit(seat,{type:'state',state:this.view(seat)});this.schedule();}
 attach(seat,device){const p=addPlayer(this.room,seat,device,true);this.online.add(p.seat);this.publish();return p.seat;}
 detach(seat){this.online.delete(seat);if(['listening','question'].includes(this.room.phase))pause(this.room,this.now());this.publish();}
 command(seat,d){const id=d.id;try{if(d.kind==='sync'){this.emit(seat||'host',{type:'state',state:this.view(seat)});return;}if(!seat&&['start','resume','open'].includes(d.kind)&&this.room.players.some(p=>!this.online.has(p.seat)))throw Error('peer_players_not_connected');const out=seat?playerCommand(this.room,seat,d,this.now()):hostCommand(this.room,d,this.now());if(!seat&&d.kind==='remove'){this.online.delete(d.seat);this.emit(d.seat,{type:'replaced'});}this.emit(seat||'host',{type:'ack',id,...out});this.publish();}catch(e){this.emit(seat||'host',{type:'error',id,error:e.message});}}
 schedule(){this.clear(this.deadlineTimer);const s=this.room;if(s.phase!=='question')return;this.deadlineTimer=this.timer(()=>{if(advance(s,this.now()))this.publish();else this.schedule();},Math.max(10,s.deadline-this.now()+1));}
 pause(){pause(this.room,this.now());this.publish();}
 close(){this.clear(this.deadlineTimer);}
}
async function gathered(pc,ms=5000){if(pc.iceGatheringState==='complete')return;await new Promise(resolve=>{const done=()=>{clearTimeout(t);pc.removeEventListener('icegatheringstatechange',check);resolve();},check=()=>{if(pc.iceGatheringState==='complete')done();},t=setTimeout(done,ms);pc.addEventListener('icegatheringstatechange',check);check();});}
export function directClassroomSocket({host,info,base,api,onStatus=()=>{},storage=globalThis.sessionStorage,PC=globalThis.RTCPeerConnection,WS=globalThis.WebSocket,ice=DIRECT_ICE}){
 if(!PC)throw Error('peer_unsupported');if(ice.iceServers?.some(s=>[s.urls].flat().some(u=>!/^stun:/.test(u))))throw Error('paid_relay_disabled');
 let alive=true,signal=null,signalIntentional=false,signalGeneration=0,coordinator=null,guest=null,peerId='',finishTask=null,startingReported=false,closedReported=false,signalingTimer=null;
 const links=new Map(),seats=new Map(),stats={cloudSignals:0,directSent:0,directReceived:0},savedKey='zhuyin.peer.host:'+info.code;
 const adapter={readyState:0,onopen:null,onmessage:null,onclose:null,onerror:null,stats,synced:false,syncFailed:false,
  send(raw){if(raw==='ping'){if(host)deliver({raw:'pong'});else guest?.channel?.send('ping');return;}const d=JSON.parse(raw);if(d.type==='auth')return;if(host){if(['start','open','resume'].includes(d.kind)&&[...links.values()].some(l=>!l.disposing&&l.channel?.readyState!=='open')){deliver({type:'error',id:d.id,error:'peer_players_not_connected'});return;}coordinator.command(null,d);}else if(guest?.channel?.readyState==='open'){guest.channel.send(raw);stats.directSent++;}else throw Error('peer_disconnected');},
  close(){if(!alive)return;alive=false;adapter.readyState=3;clearTimeout(signalingTimer);if(host)coordinator.pause();coordinator?.close();signalIntentional=true;signal?.close();for(const link of links.values())dispose(link);if(guest)dispose(guest);},
  reopen:async()=>{const out=await api(host?'/peer/host':'/peer/student-join',host?{code:info.code}:{code:info.code,device:info.device},host);openSignaling(out.ticket);},
  retryFinish:()=>{finishTask=null;return finish();}
 };
 function deliver(data){queueMicrotask(()=>{if(alive)adapter.onmessage?.({data:data.raw||JSON.stringify(data)});});}
 function dispose(link){clearTimeout(link.timeout);clearTimeout(link.disconnectedTimer);link.disposing=true;try{link.channel?.close();link.pc.close();}catch{}}
 function failed(link,error='peer_connection_failed'){
  if(link.disposing||!alive)return;dispose(link);
  if(host){links.delete(link.id);if(seats.get(link.seat)===link){seats.delete(link.seat);coordinator.detach(link.seat);}onStatus(error);}
  else{adapter.readyState=3;deliver({type:'error',error});adapter.onclose?.({reason:error});}
 }
 function makeLink(id,seat){const pc=new PC(ice),link={pc,id,seat,channel:null,disposing:false};link.timeout=setTimeout(()=>failed(link),22000);pc.onconnectionstatechange=()=>{clearTimeout(link.disconnectedTimer);if(pc.connectionState==='failed'||pc.connectionState==='closed')failed(link);else if(pc.connectionState==='disconnected'){if(host)coordinator.pause();link.disconnectedTimer=setTimeout(()=>failed(link),6000);}};
  pc.oniceconnectionstatechange=()=>{if(pc.iceConnectionState==='failed')failed(link);};return link;
 }
 function bind(link,channel){link.channel=channel;channel.onopen=()=>{if(!alive){dispose(link);return;}clearTimeout(link.timeout);
  if(host){const old=seats.get(link.seat);if(old&&old!==link){try{old.channel.send(JSON.stringify({type:'replaced'}));}catch{}dispose(old);links.delete(old.id);}seats.set(link.seat,link);try{coordinator.attach(link.seat,link.id);}catch(e){channel.send(JSON.stringify({type:'error',error:e.message}));failed(link,e.message);}}
  else{adapter.readyState=1;adapter.onopen?.();signalIntentional=true;signal?.close();onStatus('peer_connected');}
 };
  channel.onmessage=e=>{if(typeof e.data!=='string'||e.data.length>16000){failed(link,'invalid_command');return;}stats.directReceived++;
   if(e.data==='ping'){channel.send('pong');return;}if(e.data==='pong'){deliver({raw:'pong'});return;}
   let d;try{d=JSON.parse(e.data);}catch{return;}if(host)coordinator.command(link.seat,d);else deliver(d);
  };
  channel.onclose=()=>failed(link);channel.onerror=()=>failed(link);
 }
 function signalSend(data){if(signal?.readyState!==1)throw Error('peer_signal_lost');signal.send(JSON.stringify(data));stats.cloudSignals++;}
 async function offer(d){if(links.has(d.peerId))return;const link=makeLink(d.peerId,d.seat);links.set(d.peerId,link);bind(link,link.pc.createDataChannel('zhuyin-classroom-v1',{ordered:true}));try{await link.pc.setLocalDescription(await link.pc.createOffer());await gathered(link.pc);if(alive&&!link.disposing)signalSend({type:'signal',to:d.peerId,description:link.pc.localDescription});}catch{failed(link);}}
 async function description(d){
  if(host){const link=links.get(d.from);if(!link||d.description.type!=='answer')return;await link.pc.setRemoteDescription(d.description);}
  else{if(d.description.type!=='offer')return;if(guest)dispose(guest);guest=makeLink(d.from,info.seat);guest.pc.ondatachannel=e=>bind(guest,e.channel);await guest.pc.setRemoteDescription(d.description);await guest.pc.setLocalDescription(await guest.pc.createAnswer());await gathered(guest.pc);signalSend({type:'signal',description:guest.pc.localDescription});}
 }
 function openSignaling(ticket){if(!alive)return;const gen=++signalGeneration;signalIntentional=true;signal?.close();signalIntentional=false;const u=new URL(base+'/peer/socket',location.href);u.protocol=u.protocol==='https:'?'wss:':'ws:';const w=signal=new WS(u);
  clearTimeout(signalingTimer);signalingTimer=setTimeout(()=>{if(gen===signalGeneration&&!host&&adapter.readyState!==1){onStatus('peer_connection_failed');w.close();if(guest)failed(guest);else{adapter.readyState=3;adapter.onclose?.();}}},25000);
  w.onopen=()=>{if(gen===signalGeneration)signalSend({type:'auth',ticket});};
  w.onmessage=e=>{if(gen!==signalGeneration||!alive)return;let d;try{d=JSON.parse(e.data);}catch{return;}
   if(d.type==='welcome'){peerId=d.peerId;if(host){clearTimeout(signalingTimer);onStatus('peer_waiting');}return;}
   if(d.type==='peer-joined'&&host)offer(d).catch(()=>onStatus('peer_connection_failed'));
   if(d.type==='signal')description(d).catch(()=>host?onStatus('peer_connection_failed'):guest&&failed(guest));
   if(d.type==='replaced'){deliver(d);adapter.close();}
   if(d.type==='error'){deliver(d);onStatus(d.error);}
  };
  w.onclose=()=>{if(gen!==signalGeneration||signalIntentional||!alive)return;if(host)onStatus('peer_signal_lost');else if(adapter.readyState!==1){adapter.readyState=3;adapter.onclose?.();}};
  w.onerror=()=>onStatus('peer_signal_lost');
 }
 function checkpoint(s){try{storage?.setItem(savedKey,JSON.stringify(s));}catch{}}
 function broadcast(to,data){if(to==='host'){
   deliver(data);if(data.type==='state'){
    if(!['lobby','finished','closed'].includes(data.state.phase)&&!startingReported){startingReported=true;signalIntentional=true;signal?.close();api('/peer/started',{code:info.code},true).catch(()=>{onStatus('peer_metadata_pending');});}
    if(data.state.phase==='closed'&&!closedReported){closedReported=true;signalIntentional=true;signal?.close();api('/peer/close',{code:info.code},true).catch(()=>{onStatus('peer_metadata_pending');});}
    if(data.state.phase==='finished')finish().catch(()=>{});
   }
  }else{const link=seats.get(to);if(link?.channel?.readyState==='open')try{link.channel.send(JSON.stringify(data));stats.directSent++;if(data.type==='replaced'){dispose(link);links.delete(link.id);seats.delete(to);}}catch{failed(link);}}
 }
 async function finish(){if(!host||coordinator.room.phase!=='finished'||adapter.synced)return;if(finishTask)return finishTask;
  finishTask=(async()=>{const s=coordinator.room,payload={code:info.code,activityId:s.activityId,players:s.players.map(p=>({seat:p.seat,correct:p.correct,score:p.score}))};
   try{const out=await api('/peer/finish',payload,true);adapter.synced=out.synced===true;adapter.syncFailed=false;onStatus('peer_summary_saved');coordinator.publish();}
   catch(e){adapter.syncFailed=true;onStatus('peer_summary_pending');coordinator.publish();throw e;}
  })();return finishTask;
 }
 if(host){let room=info.room,restored=false;try{const saved=JSON.parse(storage?.getItem(savedKey)||'null');if(saved?.activityId===room.activityId&&saved.classId===room.classId&&saved.owner===room.owner){room=saved;restored=true;if(['question','listening'].includes(room.phase))pause(room);}}catch{}if(info.phase&&info.phase!=='lobby'&&!restored)throw Error('peer_checkpoint_missing');
  coordinator=new LocalCoordinator({room,emit:broadcast,checkpoint});adapter.coordinator=coordinator;
  queueMicrotask(()=>{if(!alive)return;adapter.readyState=1;adapter.onopen?.();coordinator.publish();});
 }
 queueMicrotask(()=>openSignaling(info.ticket));return adapter;
}
