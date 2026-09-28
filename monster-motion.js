import {BattleSprite,BATTLE_DURATIONS} from './battle-sprite.js?v=20260928-size1';
const controls=new WeakMap();
export function mountMonster(el,id){
 let control=controls.get(el);if(control?.id===id&&!control.rig.disposed)return;
 control?.rig.dispose();el.classList.remove('monster-battle-ready');
 const canvas=el.querySelector('.monster-canvas'),rig=new BattleSprite(canvas);
 control={id,rig,action:'idle',started:performance.now()};controls.set(el,control);el.dataset.rigStatus='loading';
 rig.character(id).then(()=>{
  if(controls.get(el)!==control||rig.disposed)return;
  rig.play(control.action);rig.started=control.started;
  const duration=BATTLE_DURATIONS[control.action];rig.draw(duration?Math.min(1,(performance.now()-control.started)/duration):0,0);
  el.classList.add('monster-battle-ready');el.dataset.rigStatus='ready';
 }).catch(()=>{if(controls.get(el)!==control)return;rig.dispose();el.dataset.rigStatus='fallback';});
}
export function playMonster(el,action){const control=controls.get(el);if(!control)return;control.action=action;control.started=performance.now();control.rig.play(action);}
