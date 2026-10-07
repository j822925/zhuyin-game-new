import {BattleSprite} from './battle-sprite.js?v=20261007-ipad1';
const controls=new WeakMap();
export function mountMonster(el,id){
 const previous=controls.get(el);if(previous?.id===id&&(el.dataset.rigStatus==='retry'||!previous.rig?.disposed))return;
 previous?.rig?.dispose();clearTimeout(previous?.retryTimer);
 const control={id,rig:null,action:'idle',attempts:0,retryTimer:0};controls.set(el,control);
 const canvas=el.querySelector('.monster-canvas');el.classList.remove('monster-battle-ready');
 // Remove the previous role's CSS scale and identity before starting any load.
 for(const key of ['ready','side','renderer','pose','face','bounds','facing','action'])delete canvas.dataset[key];
 canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
 let status=el.querySelector('.monster-motion-status');
 if(!status){status=document.createElement('button');status.type='button';status.className='monster-motion-status';status.setAttribute('aria-live','polite');el.querySelector('.opponent-art').append(status);}
 const current=()=>controls.get(el)===control&&el.dataset.monster===id;
 async function load(){
  if(!current())return;clearTimeout(control.retryTimer);control.attempts++;
  control.rig?.dispose();el.classList.remove('monster-battle-ready');
  status.hidden=false;status.disabled=true;status.textContent='正在準備怪物動作…';el.dataset.rigStatus='loading';
  const rig=new BattleSprite(canvas,{side:'enemy'});control.rig=rig;
  try{
   await rig.character(id);
   if(!current()||rig!==control.rig||rig.disposed||canvas.dataset.ready!==id)return;
   rig.play(control.action);rig.draw(0,0);
   el.classList.add('monster-battle-ready');el.dataset.rigStatus='ready';status.hidden=true;
  }catch{
   rig.dispose();if(!current()||rig!==control.rig)return;
   el.dataset.rigStatus='retry';status.disabled=false;status.textContent='動作還沒載入，點我再試一次';
   if(control.attempts<2)control.retryTimer=setTimeout(()=>{if(el.isConnected&&current())load();},1500);
  }
 }
 status.onclick=()=>{if(current()){control.attempts=0;load();}};load();
}
export function playMonster(el,action){const control=controls.get(el);if(!control)return;control.action=action;control.rig?.play(action);}
