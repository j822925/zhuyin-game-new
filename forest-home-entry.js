import {classUrl} from './class-context.js';
// Presentation only: keep lesson nodes/listeners and the existing login guard.
export function mountHomeDestinations(root=document){
 const home=root.querySelector('#home'),worlds=home?.querySelector('.worlds');
 if(!worlds)return;
 const brand=root.querySelector('header a.brand');
 if(brand&&!root.getElementById('learning-header-label')){const label=root.createElement('span');label.id='learning-header-label';label.textContent='學習廣場';brand.after(label);}
 const labels={'single':'聽音辨識','spelling':'拼音工坊','tone-entry':'聲調劇場','reading-entry':'朗讀小舞台'};
 for(const card of worlds.querySelectorAll('.world')){
  if(card.id==='forest-entry')continue;
  const heading=card.querySelector('h3'),art=card.querySelector('.world-art');
  if(!heading||!art)continue;
  const label=labels[card.dataset.mode||card.id];
  if(label&&heading.textContent!==label)heading.textContent=label;
  heading.classList.add('home-level-title');
  if(heading.nextElementSibling!==art)art.before(heading);
 }
 let section=root.getElementById('forest-game-section');
 if(!section){
  section=root.createElement('section');section.id='forest-game-section';
  section.setAttribute('aria-labelledby','forest-game-heading');
  section.innerHTML='<h2 id="forest-game-heading">🎮 注音遊戲</h2>';
 }
 let entry=root.getElementById('forest-entry');
 if(!entry){
  entry=root.createElement('a');entry.id='forest-entry';
  entry.href=classUrl('adventure-preview.html?v=20261020-bo1');
  entry.setAttribute('aria-label','池東注音探險島，進入冒險遊戲');
  entry.textContent='🌳 池東注音探險島　進入冒險 ▶';
 }
 entry.className='forest-game-link';
 entry.removeAttribute('style');
 const nameplate=root.getElementById('island-nameplate');
 if(nameplate&&nameplate.parentElement!==entry){
  const go=root.createElement('span');go.className='forest-game-go';go.textContent='進入冒險 ▶';
  nameplate.append(go);entry.replaceChildren(nameplate);
 }
 if(entry.parentElement!==section)section.append(entry);
 // Outside the learning grid; also keep later-added home sections above it.
 if(home.lastElementChild!==section)home.append(section);
}
if(typeof document!=='undefined'){
 mountHomeDestinations();
 const app=document.getElementById('app');
 if(app)new MutationObserver(()=>mountHomeDestinations()).observe(app,{childList:true,subtree:true});
}
