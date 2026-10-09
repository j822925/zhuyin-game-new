// Presentation only. Keep the original nodes, listeners, authentication and URLs.
export function mountIslandNames(root=document){
 const home=root.getElementById('home');
 if(!home||home.querySelector('#island-nameplate'))return;
 const make=(tag,className,text)=>{const node=root.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
 const nameplate=make('div','island-nameplate');nameplate.id='island-nameplate';
 const icon=make('span','island-name-icon','🌳');icon.setAttribute('aria-hidden','true');
 nameplate.append(icon,make('h1','island-name-title','注音探險島'));home.prepend(nameplate);
 const hero=home.querySelector('.hero'),setup=home.querySelector('.setup');
 if(hero)nameplate.after(hero);
 if(setup&&hero)hero.after(setup);
 const learning=home.querySelector('.section-heading');
 if(learning){
  learning.classList.add('island-section-heading');
  const heading=learning.querySelector('h2');heading.textContent='學習廣場';heading.id='learning-plaza-title';
  const eyebrow=learning.querySelector('.eyebrow');if(eyebrow)eyebrow.hidden=true;
  const worlds=home.querySelector('.worlds');worlds?.setAttribute('aria-labelledby',heading.id);
  const destinations=[...home.querySelectorAll(':scope > .special-destinations')].filter(n=>n.id!=='classroom-home-entry');
  let anchor=learning;for(const panel of destinations){anchor.after(panel);anchor=panel;}
 }
 const classroom=home.querySelector('#classroom-home-entry');
 if(classroom){
  const challenge=make('section','island-challenge');challenge.id='island-challenge';challenge.setAttribute('aria-labelledby','challenge-title');
  const title=make('h2','island-section-title','一起挑戰');title.id='challenge-title';challenge.append(title);
  (setup||hero||nameplate).after(challenge);
  // Demo's two-player controls select local practice; do not relocate or relabel them.
  if(new URLSearchParams(location.search).get('demo')!=='1'){
   const row=make('div','island-battle-links');
   for(const [id,emoji,label] of [['duo','🤝','輪流答題'],['race','⚡','搶答對戰']]){
    const button=root.getElementById(id);if(!button)continue;
    const picture=make('span','island-battle-icon',emoji);picture.setAttribute('aria-hidden','true');
    button.replaceChildren(picture,make('span','',label));button.setAttribute('aria-label','好友對戰：'+label);row.append(button);
   }
   challenge.append(row);
   const solo=root.getElementById('solo');if(solo?.parentElement.classList.contains('segmented'))solo.parentElement.hidden=true;
  }
  challenge.append(classroom);
 }
 home.classList.add('island-named-home');
}
if(typeof document!=='undefined')mountIslandNames();
