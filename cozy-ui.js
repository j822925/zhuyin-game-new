import {CHARACTERS,portrait} from './characters.js?v=20260913-heroes1';
export function setupCozyUI(){
 document.body.classList.add('cozy-ui');
 document.querySelector('.top-actions').append(document.getElementById('voice-help'));
 const character=id=>CHARACTERS.find(c=>c.id===id);
 const hero=document.querySelector('.hero');
 hero.querySelector('h1').classList.add('sr-only');
 hero.querySelector('.mascot').innerHTML=portrait(character('rabbit'));
 const friend=document.createElement('div');friend.className='cozy-friend';friend.setAttribute('aria-hidden','true');friend.innerHTML=portrait(character('fox'));hero.append(friend);
 for(const [mode,id,symbol] of [['single','rabbit','ㄅ・ㄠ・ㄧㄠ'],['spelling','star','ㄅ＋ㄠ']]){
  const card=document.querySelector(`[data-mode="${mode}"]`);card.setAttribute('aria-label',({single:'聽音辨識：聲符、韻符與結合韻',spelling:'拼音練習'})[mode]);
  card.querySelector('.world-art').innerHTML=portrait(character(id))+`<i>${symbol}</i>`;
 }
 for(const [id,characterId] of [['pool-animal','fox'],['pool-fairy','moon'],['pool-hero','swordsman']])document.getElementById(id).innerHTML=portrait(character(characterId));
}
