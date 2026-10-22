import {playerStats} from './adventure-expedition-model.js';
import {completeAction} from './adventure-action-feedback.js';
import {canUseStove,FURNITURE} from './adventure-model.js';
import {MAX_ENERGY,RAW_FOOD,RECIPES,INGREDIENT_NAMES,ingredientCount,canCook,cookMeal,decayEnergy,hasEnergy} from './adventure-food-model.js';
import {CROPS} from './adventure-life-model.js';
import {lifeStamp} from './adventure-life-art.js';
import {ensureHomeArt} from './adventure-home-art.js';
import {diningSpot,restoreDiningTable,availableFood,beginDining,diningFrame} from './adventure-dining.js';

export function createKitchen(api){
 const $=id=>document.getElementById(id);let tab='bag',message='',lastSecond=-1,stationId=null,travelling=false,diningRun=0,tableId=null,foodArtRun=0;
 const hud=document.createElement('button');hud.id='energy-open';hud.className='energy-hud';hud.type='button';hud.innerHTML='<span>體力 <strong id="energy-value"></strong></span><meter id="energy-meter" min="0" max="100" low="20" optimum="100"></meter><span class="combat-stats" aria-label="攻擊力與防禦力"><span>⚔ <b id="attack-value">10</b></span><span>🛡 <b id="defense-value">3</b></span></span><small id="energy-hint">吃東西，補充體力</small>';$('map-stage').append(hud);
 const dialog=document.createElement('dialog');dialog.id='food-dialog';dialog.setAttribute('aria-labelledby','food-title');dialog.innerHTML='<div class="wardrobe-header"><div><p class="eyebrow">把今天的收穫，變成明天的力氣</p><h2 id="food-title">我的食物籃</h2></div><button id="food-close" class="close" aria-label="收起食物籃">✕</button></div><div class="food-content"><p id="food-energy"></p><nav class="food-tabs" aria-label="食物與料理"><button id="food-bag-tab">吃東西</button><button id="food-cook-tab" hidden>料理食譜</button></nav><p id="food-message" role="status" aria-live="polite"></p><div id="food-list"></div><p class="food-footnote">每小時自然減少 1 體力，離線期間也會計算。散步不扣體力，每次戰鬥需要 8 體力。釣魚和農作不扣體力。體力歸零時仍能農作、玩注音、釣魚、做料理、吃東西，以及每日睡覺（+10）和洗澡（+5）；購買、布置、換裝與戰鬥先暫停，仍可以散步逛店。</p></div>';document.body.append(dialog);
 const nutrition=()=>api.state().life.nutrition;
 const save=()=>{api.save();api.renderState();};
 function update(){const stats=playerStats(api.state().expedition.level);$('attack-value').textContent=stats.attack;$('defense-value').textContent=stats.defense;$('attack-value').parentElement.setAttribute('aria-label','攻擊力 '+stats.attack);$('defense-value').parentElement.setAttribute('aria-label','防禦力 '+stats.defense);const n=nutrition();decayEnergy(n);document.body.dataset.exhausted=String(n.energy===0);$('world').dataset.energy=String(n.energy);$('energy-value').textContent=`${n.energy} / ${MAX_ENERGY}`;$('energy-meter').value=n.energy;hud.dataset.low=String(n.energy<20);hud.setAttribute('aria-label',`體力 ${n.energy}／${MAX_ENERGY}，${n.energy<20?'肚子餓了，':'點選'}吃東西補充體力`);$('energy-hint').textContent=n.energy<20?'肚子餓了，吃點東西吧':'吃東西，補充體力';}
 function open(next='bag',notice='',station=null){if(api.blocked())return;if(next==='cook'&&!canUseStove(api.state(),station,api.scene()?.area))return;api.stopMoving();stationId=next==='cook'?station:null;tab=next;message=notice;render();dialog.show();const token=++foodArtRun;const keys=[...new Set([...Object.entries(RECIPES).filter(([id,r])=>!r.buyOnly||nutrition().meals[id]>0).map(([,r])=>r.atlas),...Object.values(CROPS).map(r=>r.atlas)].filter(Boolean))];void ensureHomeArt(api.art(),keys).then(()=>{if(token===foodArtRun&&dialog.open)render();}).catch(()=>api.toast('部分食物圖片尚未載入，重新打開食物籃可以再試。'));if(api.scene())api.scene().foodTrayHeight=dialog.getBoundingClientRect().height;}
 function cookAtHome(){dialog.close();if(api.scene()?.area==='kitchen'){api.toast('點料理爐，就可以做料理；如果收起來了，按椅子圖示擺回。');return;}if(api.scene()?.area==='room'){api.toast('走進客廳右側的小門，就是廚房。');return;}api.switchArea('room',()=>api.toast('帶著收穫回家了！走進客廳右側的小門，到廚房找料理爐。'));}
 const cookingContext=()=>({stationId,area:api.scene()?.area});
 function canvasCard(id,title,count,energy,draw,action,label,disabled){const card=document.createElement('article');card.className='food-card';card.innerHTML=`<canvas width="180" height="140" aria-hidden="true"></canvas><h3>${title}</h3><p>${count}</p><small aria-label="補充 ${energy} 體力">⚡ +${energy}</small>`;draw(card.querySelector('canvas').getContext('2d'));const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=action;card.append(b);return card;}
 function tableNotice(){
  tab='bag';stationId=null;message='🪑 先在客廳擺一張小桌子。已有的可以擺回，新桌子在探險島地圖的家具行購買。';render();if(!dialog.open)dialog.show();
 }
 async function atTable(){
  if(travelling||api.scene()?.dining)return false;
  if(!diningSpot(api.state(),tableId)){tableNotice();return false;}
  const run=++diningRun;travelling=true;document.body.classList.add('dining');api.stopMoving();dialog.close();
  try{
   if(api.scene()?.area!=='room'&&!await api.switchArea('room'))return false;
   if(run!==diningRun)return false;
   const spot=diningSpot(api.state(),tableId);if(!spot){tableNotice();return false;}
   api.scene().player={...api.scene().player,...spot.player};api.scene().marker=null;return true;
  }finally{if(run===diningRun){travelling=false;document.body.classList.remove('dining');}}
 }
 async function eatAtHome(id=null){tableId=id;if(await atTable())open('bag');}
 async function eat(id,cooked){
  const foodAtlas=(cooked?RECIPES[id]:CROPS[id])?.atlas;if(foodAtlas){try{await ensureHomeArt(api.art(),[foodAtlas]);}catch{api.toast('食物圖片暫時沒載入，請再試一次。');return;}}
  if(!availableFood(api.state(),id,cooked)||!await atTable())return;
  const gained=beginDining(api.state(),api.scene(),id,cooked,performance.now(),tableId);if(!gained)return;
  save();document.body.classList.add('dining');$('world').dataset.dining='eating';
 }
 function render(){dialog.classList.add('food-tray');const s=api.state(),n=nutrition(),art=api.art();if(!art)return;
  $('food-title').textContent=tab==='cook'?(FURNITURE.find(f=>f.id===stationId)?.name||'料理食譜'):'我的食物籃';$('food-energy').textContent=`現在體力 ${n.energy} / ${MAX_ENERGY}`;$('food-message').textContent=message||(tab==='cook'?'把收穫做成料理，吃下去能補更多體力。':'蔬菜可以直接吃；料理補得更多，體力全滿時會幫你留著食物。');
  $('food-cook-tab').hidden=!stationId;
  $('food-message').hidden=!message;
  $('food-bag-tab').setAttribute('aria-pressed',String(tab==='bag'));$('food-cook-tab').setAttribute('aria-pressed',String(tab==='cook'));
  const list=$('food-list');list.replaceChildren();list.className=tab==='cook'?'recipe-list':'food-grid';
  let tableAction=$('food-table-action');if(!tableAction){tableAction=document.createElement('button');tableAction.id='food-table-action';list.before(tableAction);}
  tableAction.hidden=!!diningSpot(s);tableAction.textContent=hasEnergy(s)?'🪑 布置小屋':'🪑 擺回小桌子';
  tableAction.onclick=async()=>{
   if(!hasEnergy(api.state())){if(restoreDiningTable(api.state())){save();await eatAtHome();}return;}
   dialog.close();if(api.scene().area==='room'||await api.switchArea('room'))api.decorate();
  };
  if(tab==='bag'){
   for(const [id,r]of Object.entries(RECIPES).filter(([id,r])=>!r.buyOnly||n.meals[id]>0))list.append(canvasCard('eat-'+id,r.name,`已做好 ${n.meals[id]} 份`,r.energy,c=>lifeStamp(c,art[r.atlas||'cooking'],r.art,90,133,116,166),()=>eat(id,true),'吃一份',!n.meals[id]||n.energy===MAX_ENERGY));
   for(const [id,r]of Object.entries(RAW_FOOD)){const crop=CROPS[id];list.append(canvasCard('eat-raw-'+id,r.name,`籃子裡 ${s.life.harvest[id]} 份`,r.energy,c=>{if(art[crop.atlas||'life'])lifeStamp(c,art[crop.atlas||'life'],crop.art,90,133,116,166);else{c.font='64px sans-serif';c.textAlign='center';c.fillText(crop.icon,90,105);}},()=>eat(id,false),'直接吃',!s.life.harvest[id]||n.energy===MAX_ENERGY));}
   const note=document.createElement('p');note.className='ingredient-note';note.textContent=`魚 ${ingredientCount(s,'fish')} 尾。馬鈴薯、地瓜、洋蔥、花椰菜、茄子、稻米、小麥、南瓜和魚可用來做料理；向日葵留作收藏。`;list.append(note);
  }else for(const [id,r]of Object.entries(RECIPES).filter(([,r])=>!r.buyOnly)){
   const card=canvasCard('cook-'+id,r.name,r.description,r.energy,c=>lifeStamp(c,art[r.atlas||'cooking'],r.art,90,133,116,166),()=>{if(!cookMeal(s,id,cookingContext()))return;save();message=`${r.name}做好了！已放進食物籃，可以現在吃或留著。`;render();completeAction('cook',{detail:r.name+' +1'});},'做一份',!canCook(s,id,cookingContext()));
   const ingredients=document.createElement('p');ingredients.className='recipe-ingredients';ingredients.setAttribute('aria-label',Object.entries(r.ingredients).map(([key,amount])=>`${INGREDIENT_NAMES[key]}，有 ${ingredientCount(s,key)}，需要 ${amount}`).join('；'));ingredients.textContent=Object.entries(r.ingredients).map(([key,amount])=>`${({carrot:'🥕',tomato:'🍅',corn:'🌽',pumpkin:'🎃',fish:'🐟'})[key]||INGREDIENT_NAMES[key]} ${ingredientCount(s,key)} / ${amount}`).join(' ＋ ');card.querySelector('button').before(ingredients);
   if(n.meals[id]>0){const eatButton=document.createElement('button');eatButton.className='quiet';eatButton.id='serve-'+id;eatButton.textContent=`吃一份（有 ${n.meals[id]} 份）`;eatButton.disabled=n.energy===MAX_ENERGY;eatButton.onclick=()=>eat(id,true);card.append(eatButton);}
   list.append(card);
  }

 }
 dialog.addEventListener('close',()=>{if(api.scene())api.scene().foodTrayHeight=0;});
 $('food-close').onclick=()=>{api.stopMoving();dialog.close();};
 hud.onclick=()=>open();$('food-bag-tab').onclick=()=>eatAtHome();$('food-cook-tab').onclick=()=>{if(!canUseStove(api.state(),stationId,api.scene()?.area))return;tab='cook';message='';render();};
 function cancelDining(){diningRun++;travelling=false;if(api.scene())api.scene().dining=null;document.body.classList.remove('dining');$('world').dataset.dining='idle';}
 function tick(now){
  const effect=api.scene()?.dining;if(effect){const frame=diningFrame(effect,now);$('world').dataset.dining=frame.t<.25?'table':frame.t<.5?'hand':frame.t<.85?'mouth':'satisfied';if(frame.done){cancelDining();completeAction('eat',{detail:'⚡ +'+effect.gained});}}
  if(api.scene())api.scene().foodTrayHeight=dialog.open?dialog.getBoundingClientRect().height:0;
  const second=Math.floor(now/1000);if(second===lastSecond)return;lastSecond=second;const elapsed=decayEnergy(nutrition());if(elapsed)save();update();if(elapsed&&dialog.open)render();
 }
 return {open,eatAtHome,cookAtHome,cancelDining,useStation:id=>open('cook','',id),update,tick,get busy(){return dialog.open||travelling||!!api.scene()?.dining;}};
}
