import {playerStats,nextXP} from './adventure-expedition-model.js';

export function battleSnapshot(state){
 const {level,hp,xp}=state.expedition;
 return {level,hp,xp,stats:playerStats(level),energy:state.life.nutrition.energy,stars:state.stars};
}

function element(tag,text,className){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(className)node.className=className;
 return node;
}
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createBattlePresentation(){
 const css=element('link');css.rel='stylesheet';css.href=new URL('./adventure-battle-presentation.css?v=20261128-spar1',import.meta.url);document.head.append(css);
 const report=element('dialog',undefined,'spar-report');
 report.setAttribute('aria-labelledby','spar-report-title');
 const curtain=element('dialog',undefined,'spar-curtain');
 curtain.setAttribute('aria-label','切換場景');
 curtain.addEventListener('cancel',e=>e.preventDefault());
 document.body.append(report,curtain);
 let switching=false,advance=null;
 report.addEventListener('cancel',e=>{e.preventDefault();advance?.();});
 async function changeScene(change,src){
  if(switching)return;
  switching=true;
  const fade=async(from,to)=>{curtain.style.opacity=String(to);if(!reduced()&&curtain.animate)await curtain.animate([{opacity:from},{opacity:to}],{duration:190,easing:'ease-in-out'}).finished;};
  try{
   curtain.style.opacity='0';curtain.showModal();
   const ready=src?new Image():null;
   if(ready)ready.src=src;
   await fade(0,1);
   if(ready){let timer;try{await Promise.race([ready.decode().catch(()=>{}),new Promise(resolve=>{timer=setTimeout(resolve,1800);})]);}finally{clearTimeout(timer);}}
   await change();
   // A newly opened battle dialog sits above the curtain in the browser top layer.
   curtain.close();curtain.showModal();await fade(1,0);
  }finally{curtain.close();switching=false;}
 }
 function show({before,after,result,enemy,place,keepsake,drawHero,onReturn,returnHint}){
  const leveled=after.level>before.level;
  const delta=(a,b)=>b>a?'　+'+(b-a):'';
  function row(grid,icon,label,value){
   const tile=element('div');tile.append(element('span',icon+' '+label),element('strong',value));grid.append(tile);
  }
  function page(celebrating){
   report.replaceChildren();report.dataset.page=celebrating?'level':'summary';
   const article=element('article'),heading=element('h2',celebrating?'升級了！':result.won?'切磋成功！':'切磋結束');heading.id='spar-report-title';
   article.append(element('small',place+' · '+enemy),heading);
   if(celebrating){
    const crown=element('div','✦　♛　✦','spar-crown');crown.ariaHidden='true';article.append(crown);
    const hero=element('canvas');hero.width=156;hero.height=156;hero.ariaHidden='true';drawHero(hero);article.append(hero,element('strong','Lv.'+before.level+' → Lv.'+after.level,'spar-new-level'));
   }else{
    const prizes=element('div',undefined,'spar-prizes');
    prizes.append(element('b','⭐ 星幣 +'+(result.stars||0)),element('b','🌱 經驗 +'+(result.xp||0)));article.append(prizes);
   }
   const grid=element('div',undefined,'spar-stats');
   if(!celebrating){
    row(grid,'🌟','等級','Lv.'+after.level+delta(before.level,after.level));
    row(grid,'🌱','經驗進度',nextXP(after.level)?after.xp+' / '+nextXP(after.level):'最高等級');
    row(grid,'⭐','持有星幣',after.stars);
    row(grid,'🥄','體力',after.energy+' / 100');
   }
   row(grid,'♥',celebrating?'生命上限':'生命',celebrating?before.stats.hp+' → '+after.stats.hp:after.hp+' / '+after.stats.hp);
   row(grid,'⚔','攻擊力',celebrating?before.stats.attack+' → '+after.stats.attack:after.stats.attack);
   row(grid,'🛡','防禦力',celebrating?before.stats.defense+' → '+after.stats.defense:after.stats.defense);article.append(grid);
   if(!celebrating&&keepsake)article.append(element('p',keepsake));
   if(returnHint)article.append(element('p',returnHint));
   const next=element('button',leveled&&!celebrating?'🌟 看升級':'繼續 →');
   advance=()=>{if(!advance)return;advance=null;if(leveled&&!celebrating){page(true);return;}void changeScene(()=>{report.close();return onReturn();});};
   next.onclick=()=>advance?.();article.append(next);report.append(article);if(!report.open)report.showModal();next.focus({preventScroll:true});
  }
  page(false);
 }
 return {changeScene,show,close(){report.close();advance=null;},get busy(){return switching||report.open;}};
}
