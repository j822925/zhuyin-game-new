import {neighborhoods} from './data/island-neighborhoods.js';

function place(node,[x,y]){
 node.style.left=x+'%';
 node.style.top=y+'%';
 return node;
}

export function doorway(name,coords,action,kind){
 const door=document.createElement('button');
 door.type='button';
 door.className='district-door '+kind;
 door.setAttribute('aria-label',name);
 const caption=document.createElement('small');
 caption.textContent=name;
 door.append(caption);
 door.onclick=action;
 return place(door,coords);
}

export function showNeighborhood({id,world,panel,header,nav,layout,leave,stop,speak}){
 const area=neighborhoods[id];
 header.replaceChildren(Object.assign(document.createElement('strong'),{textContent:area.name}));
 nav.replaceChildren();
 const back=document.createElement('button');
 back.type='button';back.textContent='↩ 回野外';back.onclick=leave;nav.append(back);
 world.append(doorway('回野外',layout.return,leave,'village-return'));
 const actor=document.createElement('button');
 actor.type='button';actor.className='district-resident';actor.ariaLabel='和'+area.resident+'說話';
 const art=new Image();art.src='assets/neighborhoods/resident-'+area.sprite+'.webp';art.alt='';
 const name=document.createElement('small');name.textContent='💬 '+area.resident;
 const prop=document.createElement('span');prop.textContent=area.icon;prop.className='work-prop';prop.ariaHidden='true';
 actor.append(art,prop,name);world.append(place(actor,layout.resident));
 panel.hidden=true;
 const tell=index=>{
  stop();
  panel.hidden=false;panel.replaceChildren();
  const title=document.createElement('strong');title.textContent=area.resident+' · '+area.work;
  const line=document.createElement('p');line.textContent=area.lines[index];line.setAttribute('data-forest-dialogue','');
  const listen=document.createElement('button');listen.type='button';listen.textContent='🔊 聽對話';listen.onclick=()=>speak(area.lines[index]);
  const next=document.createElement('button');next.type='button';next.textContent=index?'繼續逛逛':'再聊一句';
  next.onclick=()=>{if(index){stop();panel.hidden=true;panel.replaceChildren();actor.focus({preventScroll:true});}else tell(1);};
  panel.append(title,line,listen,next);next.focus({preventScroll:true});
 };
 actor.onclick=()=>tell(0);
}

