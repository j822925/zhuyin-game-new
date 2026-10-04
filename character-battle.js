import {BATTLE_META} from './data/battle-catalog.js?v=20261004-villains1';
import {MONSTERS} from './data/monsters.js?v=20261004-villains1';
import {reactCharacter} from './character-motion.js?v=20261004-villains1';
import {startBattleEffects} from './battle-effects.js?v=20261004-villains1';
import {mountMonster,playMonster} from './monster-motion.js?v=20261004-villains1';

export function createOpponent(){
 const el=document.createElement('aside');el.className='practice-opponent';el.setAttribute('aria-label','陪你挑戰的小怪物');
 el.innerHTML='<div class="opponent-art"><img class="monster-sprite" alt=""><canvas class="monster-canvas" aria-hidden="true"></canvas><span class="opponent-hit" aria-hidden="true">✦</span></div><span class="opponent-caption"></span><progress class="opponent-hp" max="10" value="10" aria-label="怪物剩餘挑戰能量"></progress><span class="opponent-remaining"></span>';
 updateOpponent(el,MONSTERS[0],10,0);
 return el;
}

export function updateOpponent(el,c,total,completed,{wins=0,perfect=true}={}){const img=el.querySelector('.monster-sprite');if(el.dataset.monster!==c.id){el.dataset.monster=c.id;img.src=c.image;img.alt=c.name;}mountMonster(el,c.id);const left=Math.max(0,total-completed);el.querySelector('.opponent-caption').textContent=left?c.name:'成功擊敗 '+c.name;const hp=el.querySelector('progress');hp.max=Math.max(1,total);hp.value=left;hp.setAttribute('aria-valuetext','還有 '+left+' 題');el.querySelector('.opponent-remaining').textContent='全對收服 '+wins+'／3 次'+(left?'・剩 '+left+' 題':perfect?'・全對！等待保存':'・下次挑戰全對');el.dataset.roundComplete=String(left===0);if(left)el.dataset.defeated='false';}

// One controller per visible question arena. New answers replace old effects;
// moving on cancels everything so late effects cannot hit the next player.
export const BATTLE_TIMING={windup:340,flight:420,impact:760,celebrate:1250,settle:1900};
export function createBattle(opponent,getHero){
 let generation=0,timers=[],effects=null,lastHero=null;
 function reset(){generation++;timers.forEach(clearTimeout);timers=[];effects?.dispose();effects=null;opponent.dataset.action='idle';opponent.dataset.defeated='false';playMonster(opponent,'idle');if(lastHero?.isConnected){lastHero.querySelector('.character-motion')?.classList.remove('character-strike');reactCharacter(lastHero,'idle');}lastHero=null;}
 function answer(correct){
  reset();const gen=generation,hero=getHero(),actor=hero?.querySelector('.character-motion');if(!actor)return;lastHero=hero;
  const attackingId=correct?actor.dataset.rig:opponent.dataset.monster,timing=BATTLE_META[attackingId]?.concept?{windup:774,flight:612,impact:1386,celebrate:1800,settle:2400}:BATTLE_TIMING;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,valid=()=>gen===generation&&actor.isConnected;
  const later=(fn,delay)=>timers.push(setTimeout(()=>{if(valid())fn();},delay));
  opponent.dataset.action=correct?'bracing':'attack';if(correct){reactCharacter(hero,'attack');if(BATTLE_META[opponent.dataset.monster]?.concept)playMonster(opponent,'guard');}else playMonster(opponent,'attack');
  const impact=()=>{if(!valid())return;opponent.dataset.action=correct?'hit':'idle';if(correct){playMonster(opponent,'hurt');later(()=>{if(opponent.dataset.roundComplete==='true'){opponent.dataset.defeated='true';playMonster(opponent,'defeated');}},reduced?0:320);}else reactCharacter(hero,'defeat');};
  if(correct)later(()=>reactCharacter(hero,'victory'),timing.celebrate);
  later(()=>{opponent.dataset.action='idle';},timing.settle);
  if(reduced){impact();return;}
  effects=startBattleEffects({actor,opponent,correct,timing});
  later(impact,timing.impact);
 }
 return {answer,reset};
}
