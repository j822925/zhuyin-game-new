import {PROFILE_CHARACTERS} from './student-profile.js?v=20261007-ipad1';
import {mountCharacter,clearCharacters,awardCharacter,celebrateCharacter} from './character-motion.js?v=20261007-ipad1';
import {createOpponent,createBattle,updateOpponent} from './character-battle.js?v=20261007-ipad1';
import {MONSTERS} from './data/monsters.js?v=20261004-villains1';
import {showMonsterReward} from './monster-cards-ui.js?v=20261007-ipad1';

export function createReadingBattle({play,result}){
 const opponent=createOpponent(),hero=document.createElement('aside'),art=document.createElement('div'),label=document.createElement('strong'),reward=document.createElement('div');
 hero.className='reading-hero';hero.setAttribute('aria-label','陪我朗讀的角色');art.className='reading-hero-art';hero.append(art,label);play.prepend(opponent);play.append(hero);reward.className='reading-reward';result.querySelector('#score').after(reward);
 const battle=createBattle(opponent,()=>art);let character=null,encounter=null;
 return {
  begin(profile,selected){battle.reset();clearCharacters(reward);reward.replaceChildren();encounter=selected;character=PROFILE_CHARACTERS.find(c=>c.id===profile?.avatar)||PROFILE_CHARACTERS.find(c=>c.id==='rabbit');label.textContent=profile?.nickname||profile?.name||character.name;mountCharacter(art,character);this.progress(0,true);},
  progress(completed,perfect){if(encounter)updateOpponent(opponent,MONSTERS.find(c=>c.id===encounter.monsterId),5,completed,{wins:encounter.monsterWins||0,levels:encounter.monsterLevels,requiredLevels:encounter.monsterRequiredLevels,collected:encounter.monsterCollected,perfect});},
  answer(correct,completed,perfect){battle.answer(correct);this.progress(completed,perfect);},
  reset(){battle.reset();},
  result(stars,award){battle.reset();clearCharacters(art);clearCharacters(reward);reward.replaceChildren();if(character){if(stars>0)awardCharacter(reward,character,stars);else celebrateCharacter(reward,character);}if(award)showMonsterReward(reward,award);},
  clear(){battle.reset();clearCharacters(art);clearCharacters(reward);art.replaceChildren();reward.replaceChildren();character=null;encounter=null;}
 };
}
