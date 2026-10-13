import {cleanVisitPose} from './island-visits-model.js';
import {cleanSocialEvent} from './social-motion-model.js';
export function openVisitPeer({socketUrl,ticket,seat,hosting,onStatus,onInvitation,onPose,onLeave,onSocial=()=>{}}){
 const socket=new WebSocket(socketUrl),peers=new Map(),poses=new Map();let closed=false,lastPose=null,lastSend=0,invitationTimer=null;
 const send=m=>{if(socket.readyState===1)socket.send(JSON.stringify(m));};
 const write=(channel,m)=>{if(channel?.readyState==='open'&&channel.bufferedAmount<32000)channel.send(JSON.stringify(m));};
 const broadcast=(m,except)=>{for(const [id,p]of peers)if(id!==except)write(p.channel,m);};
 const socialBroadcast=(m,except)=>{for(const [id,p]of peers)if(id!==except)write(p.socialChannel,m);};
 function socialChannel(id,ch){
  const p=peers.get(id);if(!p||p.socialChannel){ch.close();return;}p.socialChannel=ch;
  ch.onmessage=e=>{
   if(typeof e.data!=='string'||e.data.length>700)return;
   const now=performance.now();if(now-(p.socialWindow||0)>1000){p.socialWindow=now;p.socialCount=0;}if((p.socialCount=(p.socialCount||0)+1)>12)return;
   let m;try{m=JSON.parse(e.data);}catch{return;}if(!m||m.type!=='social')return;
   const event=cleanSocialEvent(m.event),who=hosting?id:String(m.seat||'');
   if(!event||!/^\d{1,6}$/.test(who)||who===seat||!poses.has(who))return;
   onSocial(who,event);if(hosting)socialBroadcast({type:'social',seat:who,event},id);
  };
 }
 function remove(id,signal=true){const p=peers.get(id);if(!p)return;peers.delete(id);clearTimeout(p.timer);clearTimeout(p.capTimer);p.pc.close();poses.delete(id);onLeave(id);if(hosting)broadcast({type:'left',seat:id});if(signal)send({type:'leave-peer',seat:id});}
 function channel(id,ch){
  const p=peers.get(id);p.channel=ch;ch.onopen=()=>{clearTimeout(p.timer);onStatus('connected');let tries=0;const capability=()=>{if(closed||p.socialCap||!peers.has(id))return;write(ch,{type:'social-cap',v:1});if(++tries<4)p.capTimer=setTimeout(capability,1000);};capability();if(lastPose)write(ch,{type:'pose',seat,pose:lastPose});if(hosting)for(const [who,pose]of poses)if(who!==id)write(ch,{type:'pose',seat:who,pose});};
  ch.onclose=()=>{remove(id);if(!hosting)onStatus('offline');};
  ch.onmessage=e=>{
   if(typeof e.data!=='string'||e.data.length>1800)return;
   const now=performance.now();if(now-(p.window||0)>1000){p.window=now;p.count=0;}if((p.count=(p.count||0)+1)>25){remove(id);return;}
   let m;try{m=JSON.parse(e.data);}catch{return;}if(!m)return;
   if(m.type==='social-cap'&&m.v===1){clearTimeout(p.capTimer);if(!p.socialCap){p.socialCap=true;write(ch,{type:'social-cap',v:1});}if(p.offer&&!p.socialChannel)socialChannel(id,p.pc.createDataChannel('island-social-v1'));return;}
   if(!hosting&&m.type==='left'&&typeof m.seat==='string'){poses.delete(m.seat);onLeave(m.seat);return;}
   if(m.type!=='pose')return;const pose=cleanVisitPose(m.pose),who=hosting?id:String(m.seat||'');
   if(!pose||!/^\d{1,6}$/.test(who)||who===seat)return;
   poses.set(who,pose);onPose(who,pose);if(hosting)broadcast({type:'pose',seat:who,pose},id);
  };
 }
 async function pair(id,offer){
  clearTimeout(invitationTimer);
  remove(id,false);const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]}),p={pc,offer,candidates:[],timer:setTimeout(()=>{remove(id);onStatus('offline');},25000)};peers.set(id,p);
  pc.onicecandidate=e=>{if(e.candidate)send({type:'signal',seat:id,signal:{candidate:e.candidate.toJSON()}});};
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState)){remove(id);onStatus('offline');}};
  pc.ondatachannel=e=>{if(e.channel.label==='island-social-v1')socialChannel(id,e.channel);else if(e.channel.label==='island')channel(id,e.channel);else e.channel.close();};
  // Both versions still exchange poses on the original channel. Social invitations
  // use a reliable ordered channel so consent is never sent as a lossy movement frame.
  if(offer){channel(id,pc.createDataChannel('island',{ordered:false,maxRetransmits:0}));await pc.setLocalDescription(await pc.createOffer());send({type:'signal',seat:id,signal:{description:pc.localDescription}});}
 }
 socket.onopen=()=>send({type:'auth',ticket});
 socket.onmessage=async e=>{let m;try{m=JSON.parse(e.data);if(m.type==='ready'){onStatus(hosting?'hosting':'requesting');if(!hosting)send({type:'invite'});}
  else if(m.type==='invitation'&&hosting)onInvitation(m.seat,accept=>send({type:'answer',seat:m.seat,accept}));
  else if(m.type==='paired')await pair(m.seat,m.offer);
  else if(m.type==='signal'){const p=peers.get(m.seat);if(!p)return;const s=m.signal;if(s?.description){await p.pc.setRemoteDescription(s.description);for(const c of p.candidates)await p.pc.addIceCandidate(c);p.candidates=[];if(s.description.type==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());send({type:'signal',seat:m.seat,signal:{description:p.pc.localDescription}});}}else if(s?.candidate){if(p.pc.remoteDescription)await p.pc.addIceCandidate(s.candidate);else if(p.candidates.length<50)p.candidates.push(s.candidate);}}
  else if(m.type==='left'){remove(m.seat,false);if(!hosting)onStatus('offline');}
  else if(['offline','waiting','declined'].includes(m.type)){onStatus(m.type);if(m.type==='waiting')invitationTimer=setTimeout(()=>{socket.close();onStatus('offline');},45000);}
 }catch{onStatus('offline');if(m?.seat)remove(m.seat);}};
  socket.onerror=()=>onStatus('offline');socket.onclose=()=>{clearTimeout(invitationTimer);for(const id of [...peers.keys()])remove(id,false);if(!closed)onStatus('offline');};
 const connectTimeout=setTimeout(()=>{if(socket.readyState!==1){socket.close();onStatus('offline');}},12000);
 return {sendSocial(event){if(closed)return;const clean=cleanSocialEvent(event);if(!clean)return;if(hosting)socialBroadcast({type:'social',seat,event:clean});else for(const p of peers.values())write(p.socialChannel,{type:'social',event:clean});},sendPose(pose){if(closed)return;const now=performance.now();if(now-lastSend<100)return;lastSend=now;const clean=cleanVisitPose(pose);if(!clean||JSON.stringify(clean)===JSON.stringify(lastPose))return;lastPose=clean;if(hosting)broadcast({type:'pose',seat,pose:clean});else for(const p of peers.values())write(p.channel,{type:'pose',pose:clean});},close(){closed=true;clearTimeout(connectTimeout);for(const id of [...peers.keys()])remove(id,false);socket.close();}};
}
