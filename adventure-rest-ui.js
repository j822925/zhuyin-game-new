import {completeAction} from './adventure-action-feedback.js';
import {FURNITURE,layoutFor,isInterior} from './adventure-model.js';
import {restFurniture,restKind,toiletRemaining,restStatus,takeRest} from './adventure-rest-model.js';
import {hasEnergy} from './adventure-food-model.js';
let musicContext;
function music(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;musicContext??=new Audio();void musicContext.resume();[523.25,659.25,783.99,659.25].forEach((hz,i)=>{const o=musicContext.createOscillator(),g=musicContext.createGain(),t=musicContext.currentTime+i*.18;o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.32);o.connect(g);g.connect(musicContext.destination);o.start(t);o.stop(t+.34);});}catch{}}
export function createHomeRest(api){
 const box=document.getElementById('home-actions'),s=()=>api.state(),scene=()=>api.scene();
 const items=()=>layoutFor(s(),scene().area);
 function cancel(){if(scene())scene().homeRest=null;}
 function message(result){return result.reason==='used'?(result.kind==='toilet'?'🚽 今天已經上過 5 次囉，明天再來！':'🌙 今天已經休息過了，明天再來'):result.reason==='full'?'✨ 體力滿滿！今天的次數先保留':'請先擺好家具';}
 function use(id){
  if(api.blocked()||scene().homeRest)return;const area=scene().area,item=items().find(p=>p.id===id),f=restFurniture(id);if(!item||!f||!s().furnitureOwned.includes(id))return;
  if(f.dining){if(area==='room')api.dine?.(id);else api.toast('把餐桌放在客廳，就可以在桌邊吃飯。');return;}
  if(f.play){if(!hasEnergy(s())){api.toast('🥄 先吃點東西，或躺床休息');return;}api.stop();scene().homePlay={item:{...item},kind:f.play,start:performance.now(),duration:2200};if(f.play==='music')music();return;}
  const status=restStatus(s(),id,area);if(!status.ok){api.toast(message(status));return;}
  const target={x:Math.max(190,Math.min(1090,item.x)),y:Math.max(area==='bathroom'?445:300,Math.min(715,item.y+38))};
  api.walkTo(target,()=>{
   if(scene().area!==area||api.blocked())return;api.stop();
   const before={nutrition:structuredClone(s().life.nutrition),homeRest:structuredClone(s().homeRest)},result=takeRest(s(),id,area);
   if(!result.ok){api.toast(message(result));return;}
   if(!api.save()){s().life.nutrition=before.nutrition;s().homeRest=before.homeRest;api.changed();api.toast('💾 還沒儲存，今天的次數沒有使用');return;}
   scene().homeRest={item:{...item},kind:result.kind,gain:result.gain,remaining:result.remaining,area,start:performance.now(),duration:scene().reduced.matches?900:3000};
   api.changed();update();
  })||api.toast('再走近一點試試看');
 }
 function update(){box.replaceChildren();if(!scene()||!isInterior(scene().area))return;
  for(const item of items()){const f=restFurniture(item.id),kind=restKind(f);if(!kind&&!f?.play&&!f?.dining)continue;
   const b=document.createElement('button');b.className='home-action';b.dataset.item=item.id;b.setAttribute('aria-label',f.name+(f.dining?'，吃東西':kind==='sleep'?'，睡覺，每日體力加10':kind==='bath'?'，洗澡，每日體力加5':kind==='toilet'?'，上廁所，體力加1，今天還有'+toiletRemaining(s())+'次':'，點一下互動'));b.title=b.ariaLabel;
   // Decorative toys remain tappable without a badge covering their artwork.
   const icon=f.dining?'🍽️':kind==='sleep'?'💤':kind==='bath'?'🫧':kind==='toilet'?'🚽':'';
   if(icon)b.innerHTML='<span>'+icon+'</span>';b.onclick=()=>use(item.id);box.append(b);
  }position();
 }
 function position(){if(!scene())return;const scale=scene().camera.scale;for(const b of box.children){const item=items().find(p=>p.id===b.dataset.item);if(!item){b.hidden=true;continue;}const f=restFurniture(item.id),at=scene().toScreen(item.x,item.y);b.hidden=scene().editing||!!scene().homeRest||api.blocked();b.style.left=at.x+'px';b.style.top=at.y+'px';b.style.width=Math.max(64,f.fw*scale)+'px';b.style.height=Math.max(64,f.height*scale)+'px';b.style.zIndex=Math.round(item.y);}}
 function tick(now){const e=scene()?.homeRest;if(e&&(e.area!==scene().area||now-e.start>=e.duration)){cancel();if(e.area===scene().area)completeAction(e.kind,{detail:'⚡ +'+e.gain+(e.kind==='toilet'?'　🚽 '+e.remaining+'/5':'　✓ 今日完成')});update();}const play=scene()?.homePlay;if(play&&now-play.start>play.duration){scene().homePlay=null;completeAction(play.kind);}}
 return {update,position,tick,cancel,use,get busy(){return !!scene()?.homeRest;}};
}
