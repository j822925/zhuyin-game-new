export const SOCIAL_ACTIONS=Object.freeze({
 wave:{label:'👋 揮手',row:0,duration:2600,frames:[0,1,0,1,0,1,0]},
 hug:{label:'🤗 擁抱',row:1,duration:3400,frames:[0,0,1,1,2,2,2,1,0],paired:true},
 dance:{label:'💃 一起跳舞',row:2,duration:4800,frames:[0,1,2,1,0,1,2,1,0,1,2,1],paired:true},
 kiss:{label:'😘 飛吻',row:3,duration:2700,frames:[0,0,0,1,1,2,2,2]}
});
const rooms=['forest','room','bedroom','kitchen','bathroom'];
export function cleanSocialEvent(m){
 if(!m||m.v!==1||!['solo','invite','accept','decline','start','cancel'].includes(m.type)||!Object.hasOwn(SOCIAL_ACTIONS,m.action)||!rooms.includes(m.room)||typeof m.id!=='string'||!/^[-a-zA-Z0-9]{1,60}$/.test(m.id))return null;
 const paired=SOCIAL_ACTIONS[m.action].paired;
 if(m.type==='solo'&&paired||['invite','accept','decline','start'].includes(m.type)&&!paired)return null;
 const target=typeof m.target==='string'?m.target:'';
 if(paired&&!/^\d{1,6}$/.test(target))return null;
 return {v:1,type:m.type,id:m.id,action:m.action,room:m.room,target:paired?target:''};
}
export function socialFrame(action,elapsed,reduced=false){
 const a=SOCIAL_ACTIONS[action];if(!a||!Number.isFinite(elapsed)||elapsed<0||elapsed>=a.duration)return null;
 return {row:a.row,column:reduced?(action==='hug'?2:0):a.frames[Math.min(a.frames.length-1,Math.floor(elapsed/a.duration*a.frames.length))],progress:elapsed/a.duration};
}
export function canPair(a,b){return !!a&&!!b&&a.room===b.room&&!a.moving&&!b.moving&&Math.hypot(a.x-b.x,a.y-b.y)<=170;}

// Ephemeral device-to-device state only: never stored in a student's save or wallet.
export function createSocialSession({seat,getPose,getPeers,send,onPrompt=()=>{},onMessage=()=>{},now=()=>performance.now(),makeId=()=>crypto.randomUUID()}){
 const motions=new Map(),offers=new Map();let pending=null,lastAction=-Infinity;
 const peers=()=>getPeers();
 const key=(from,id)=>from+':'+id;
 const emit=e=>send({...e,v:1});
 function clearPrompt(){pending=null;onPrompt(null);}
 function start(from,e){
  const at=now()+250,actors=[from,e.target];
  for(const [i,actor]of actors.entries())motions.set(actor,{id:e.id,action:e.action,room:e.room,started:at,partner:actors[1-i],side:i?1:-1});
  if(actors.includes(seat))clearPrompt();
 }
 function cancel(){
  const m=motions.get(seat);if(m){emit({type:'cancel',id:m.id,action:m.action,room:m.room,target:m.partner||''});motions.delete(seat);if(m.partner)motions.delete(m.partner);}
  if(pending){emit({...pending.event,type:'cancel',target:pending.from===seat?pending.event.target:pending.from});offers.delete(key(pending.from,pending.event.id));clearPrompt();}
 }
 function perform(action,target=''){
  const a=SOCIAL_ACTIONS[action],p=getPose();if(!a||!p||now()-lastAction<650)return false;
  if(a.paired&&!canPair(p,peers().get(target))){onMessage('先走到朋友身旁，再邀請一起玩。');return false;}
  cancel();lastAction=now();const e={v:1,type:a.paired?'invite':'solo',id:makeId(),action,room:p.room,target:a.paired?target:''};
  if(a.paired){pending={from:seat,event:e,until:now()+30000};offers.set(key(seat,e.id),{from:seat,event:e,accepted:false,until:pending.until});onPrompt({outgoing:true,target,action});emit(e);}
  else {motions.set(seat,{id:e.id,action,room:p.room,started:now(),side:1});emit(e);}
  return true;
 }
 function answer(accept){
  if(!pending||pending.from===seat)return;
  const {from,event:e}=pending,valid=accept&&now()<pending.until&&canPair(getPose(),peers().get(from));
  const offer=offers.get(key(from,e.id));if(offer)offer.accepted=!!valid;
  emit({...e,type:valid?'accept':'decline',target:from});
  if(valid){pending.until=now()+8000;onPrompt({waiting:true,target:from,action:e.action});}else clearPrompt();
 }
 function receive(from,input){
  const e=cleanSocialEvent(input);if(!e||from===seat||!/^\d{1,6}$/.test(from)||!peers().has(from))return;
  if(e.type==='solo'){const p=peers().get(from);if(p.room!==e.room)return;motions.set(from,{id:e.id,action:e.action,room:e.room,started:now(),side:1});return;}
  if(e.type==='cancel'){const m=motions.get(from);if(m?.id===e.id){motions.delete(from);if(m.partner)motions.delete(m.partner);}if(pending?.event.id===e.id&&(pending.from===from||pending.event.target===from))clearPrompt();offers.delete(key(from,e.id));offers.delete(key(e.target,e.id));return;}
  if(e.type==='invite'){
   if(from===e.target||peers().get(from).room!==e.room)return;
   if(offers.has(key(from,e.id)))return;
   if(offers.size>=40)offers.delete(offers.keys().next().value);
   offers.set(key(from,e.id),{from,event:e,accepted:false,until:now()+30000});
   if(e.target===seat){
    if(pending||motions.has(seat)||!canPair(getPose(),peers().get(from))){emit({...e,type:'decline',target:from});return;}
    pending={from,event:e,until:now()+30000};onPrompt({target:from,action:e.action});
   }
   return;
  }
  if(e.type==='accept'||e.type==='decline'){
   const offer=offers.get(key(e.target,e.id));
   if(!offer||offer.event.target!==from||offer.event.action!==e.action||offer.until<=now())return;
   if(e.type==='decline'){offers.delete(key(e.target,e.id));if(pending?.event.id===e.id){clearPrompt();onMessage('邀請已結束，繼續一起逛逛吧！');}return;}
   offer.accepted=true;
   if(e.target===seat&&pending?.event.id===e.id){
    if(!canPair(getPose(),peers().get(from))){cancel();return;}
    const begin={...offer.event,type:'start'};start(seat,begin);emit(begin);
   }
   return;
  }
  if(e.type==='start'){
   const offer=offers.get(key(from,e.id));
   if(!offer?.accepted||offer.until<=now()||offer.event.target!==e.target||offer.event.action!==e.action||offer.event.room!==e.room)return;
   if(e.target===seat&&(!pending||pending.event.id!==e.id||!canPair(getPose(),peers().get(from))))return;
   const a=from===seat?getPose():peers().get(from),b=e.target===seat?getPose():peers().get(e.target);
   if(!canPair(a,b))return;
   start(from,e);offers.delete(key(from,e.id));
  }
 }
 function tick(){
  const t=now(),p=getPose();
  if(pending&&(pending.until<=t||p?.moving||p?.room!==pending.event.room)){if(pending.until<=t)onMessage('朋友還沒回應，等等可以再邀請。');cancel();}
  const own=motions.get(seat);if(own&&(p?.moving||p?.room!==own.room||own.partner&&!peers().has(own.partner)))cancel();
  for(const [actor,m]of motions)if(t-m.started>=SOCIAL_ACTIONS[m.action].duration)motions.delete(actor);
  for(const [id,o]of offers)if(t>=o.until)offers.delete(id);
 }
 function reset(){motions.clear();offers.clear();clearPrompt();}
 return {perform,answer,receive,cancel,tick,reset,motions,depart(actor){const m=motions.get(actor);if(m?.partner)motions.delete(m.partner);motions.delete(actor);if(pending&&(pending.from===actor||pending.event.target===actor))clearPrompt();}};
}
