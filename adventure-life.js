import {completeAction} from './adventure-action-feedback.js';
import {FREE_SEEDS} from './adventure-exploration-model.js';
import {fishingEffect,fishingStage} from './adventure-fishing-feedback.js';
import {hasEnergy} from './adventure-food-model.js';
import {drawFieldDetail} from './adventure-terrain.js';
import {departForIslandLesson} from './farm-learning-bridge.js';
import {ACTIVITY_PRICES,CROPS,CROP_LESSONS,CROP_ACCURACY,FISH,FARM_GATE,POND_BANK,FARM_PLOTS,unlockActivity,plotStage,plantCrop,waterCrop,harvestCrop,castLine,reelFish} from './adventure-life-model.js';
import {lifeStamp,drawFish,drawSeedling} from './adventure-life-art.js';
import {farmEffect,farmProgress} from './adventure-farm-feedback.js';
const $=id=>document.getElementById(id);
export function createLife(api){
 const dialog=$('life-dialog'),body=$('life-body');let mode=null,plotId=0,selectedCrop='carrot',lastTick=0,lastStage='',result=null;
 const state=()=>api.state(),scene=()=>api.scene();
 const save=()=>{api.save();api.renderState();};
 function chime(){try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;const ctx=new Audio();[523,659,784].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.1;o.frequency.value=f;g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.23);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.24);});setTimeout(()=>ctx.close(),700);}catch{}}

 function show(next){
  api.stopMoving();const modal=next!=='plot'&&next!=='pond';
  // show() does not promote an already open dialog into the modal top layer.
  // Reopen when switching between the pond/field strip and the basket.
  if(dialog.open&&dialog.matches(':modal')!==modal)dialog.close();
  mode=next;result=null;dialog.classList.toggle('farm-panel',next==='plot');dialog.classList.toggle('fishing-panel',next==='pond');
  if(scene()){scene().fishingView=next==='pond';if(next!=='pond')scene().fishingEffect=null;}
  render();if(!dialog.open){if(modal)dialog.showModal();else dialog.show();}
 }
 function resetClosed(){if(dialog.open)return;if(scene()){scene().fishingView=false;scene().fishingEffect=null;}mode=null;$('world').focus({preventScroll:true});}
 function close(){dialog.close();resetClosed();}
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'&&(dialog.classList.contains('farm-panel')||dialog.classList.contains('fishing-panel'))){e.preventDefault();close();}});
 // A close event is queued: ignore an old one after the next view has opened.
 dialog.addEventListener('close',resetClosed);$('life-close').onclick=close;
 function routeToVillage(callback){if(api.blocked())return;if(scene().area==='forest')callback();else api.switchArea('forest',callback);}
 function visit(id){if(api.blocked())return;if(!state().life[id+'Unlocked']){show('unlock-'+id);return;}if(id==='farm')api.switchArea('farm');else routeToVillage(()=>{api.stopMoving();Object.assign(scene().player,POND_BANK,{direction:1});api.arrived();show('pond');});}
 function plot(index){if(api.blocked()||scene().area!=='farm'||!state().life.farmUnlocked)return;const field=FARM_PLOTS[index];api.walkTo({x:field.x+135,y:field.y+100},()=>{
  plotId=index;scene().player.direction=2;const p=state().life.plots[index],stage=plotStage(p);scene().farmFocus={x:field.x,y:field.y};
  if(stage==='seed'){if(waterCrop(state(),index)){save();farmEffect(scene(),'water',field,p.crop,p.plantId);api.toast('澆好水了，小芽冒出來囉！再玩一次'+CROP_LESSONS[CROPS[p.crop].lesson].name+'，達到 70% 就會長大。');}}
  else if(stage==='ready'){const crop=harvestCrop(state(),index);if(crop){save();farmEffect(scene(),'harvest',field,crop,p.plantId);chime();api.toast('拔起來了！'+CROPS[crop].name+' +1，放進小竹籃。');}}
  else show('plot');
 });}
 function enterFarm(){const ready=state().life.plots.map((p,i)=>({p,i})).filter(({p})=>p?.ready&&!p.growthSeen);for(const {p,i}of ready)farmEffect(scene(),'grow',FARM_PLOTS[i],p.crop,p.plantId,performance.now(),350+i*100);if(ready.length){scene().farmFocus=null;api.toast('練習完成！看，這批作物正在長大。');}}
 function btn(text,fn,{primary=false,disabled=false,id=''}={}){const b=document.createElement('button');b.textContent=text;b.className=primary?'primary':'';b.disabled=disabled;if(id)b.id=id;b.onclick=fn;$('life-actions').append(b);return b;}
 function base(title,kicker){$('life-title').textContent=title;$('life-kicker').textContent=kicker;body.innerHTML='<canvas id="life-picture" width="600" height="300" role="img"></canvas><p id="life-message" role="status" aria-live="polite"></p><div id="life-choices"></div><div id="life-actions"></div><p id="life-note"></p>';}
 function render(){
 if(!mode)return;
 if(mode.startsWith('unlock-')){const id=mode.slice(7),isFarm=id==='farm',price=ACTIVITY_PRICES[id],owned=state().life[id+'Unlocked'];base(isFarm?'通往農場的小路':'池邊的小小釣魚會',owned?'已經開放，隨時歡迎你':'一份星幣，打開新的日常');$('life-picture').setAttribute('aria-label',isFarm?'可愛的農場小屋':'池塘木棧台');
 $('life-message').textContent=owned?'開放好了！釣竿、種子和水都準備好了。':`開放需要 ${price} 星幣，你現在有 ${state().stars} 星幣。`;
 btn(owned?(isFarm?'沿著小路去農場 →':'走到池塘釣魚 →'):`用 ${price} 星幣開放`,()=>{if(owned){close();visit(id);}else if(unlockActivity(state(),id)){save();render();completeAction('unlock',{host:dialog,detail:'只付一次，以後自由進出'});}},{primary:true,disabled:!owned&&state().stars<price,id:'life-unlock'});
 $('life-note').textContent=owned?'這是原本小屋裡的新活動，收穫會跟著小屋一起保存。':state().stars<price?`再收集 ${price-state().stars} 星幣就可以開放。`:'只付一次，之後自由進出。';
 }else if(mode==='pond'){
 base('微光池塘','🪱 魚餌 '+(state().life.bait?.basic||0));const stage=fishingStage(state().life.fishing,scene().fishingEffect),busy=stage==='casting'||stage==='reeling';lastStage=stage;
 $('life-picture').hidden=true;
 $('life-message').textContent=stage==='caught'?`🐟 ${FISH[result||scene().fishingEffect.fish].name} +1`:stage==='ready'?'🐟 ！':stage==='waiting'?'⋯':stage==='casting'?'🎣 💦':stage==='reeling'?'🐟 ↑':'🎣';
 const label=stage==='ready'?'拉起釣竿':stage==='casting'?'拋竿中':stage==='reeling'?'拉魚中':stage==='waiting'?'等小魚靠近…':'拋下釣竿';
 btn(label,()=>{
  const before=structuredClone(state()),current=fishingStage(state().life.fishing,scene().fishingEffect);
  if(['casting','reeling','waiting'].includes(current))return;
  if(state().life.fishing){const caught=reelFish(state());if(!caught)return;result=caught;fishingEffect(scene(),'reel',caught);chime();}
  else{if(!castLine(state()))return;result=null;fishingEffect(scene(),'cast');}
  if(!api.save()){Object.assign(state(),before);result=null;scene().fishingEffect=null;api.toast('儲存失敗，魚餌已保留。');}api.renderState();render();
 },{primary:true,disabled:busy||stage==='waiting'||(!state().life.fishing&&!(state().life.bait?.basic>0)),id:'life-fish-action'});
 const basket=btn('🧺',()=>show('collection'));basket.setAttribute('aria-label','查看釣到的魚');
 $('life-note').hidden=false;$('life-note').textContent='🪱 魚餌在種子商店購買，每個 1 星幣。';
 }else if(mode==='plot'){
 const p=state().life.plots[plotId],stage=plotStage(p);lastStage=stage;base(p?CROPS[p.crop].name+'田':'在田裡種一點東西',stage==='empty'?'想種一點什麼呢？':CROPS[p.crop].name+'的一天');$('life-picture').setAttribute('aria-label',p?CROPS[p.crop].name+'的生長狀態':'等待播種的田地');
 if(stage==='empty'){
 if(!FREE_SEEDS.includes(selectedCrop)&&!state().life.seeds?.[selectedCrop])selectedCrop='carrot';
 for(const [id,crop]of Object.entries(CROPS).filter(([id])=>FREE_SEEDS.includes(id)||state().life.seeds?.[id]>0)){const b=document.createElement('button');b.innerHTML=`<span>${crop.icon}</span>${crop.name}<small>${CROP_LESSONS[crop.lesson].name} · 70%</small>`;b.setAttribute('aria-pressed',String(selectedCrop===id));b.onclick=()=>{selectedCrop=id;render();};$('life-choices').append(b);}
 $('life-message').textContent='🥕 🍅 🌽 免費種子；其他種子到探險島地圖的 🌱 店購買。';btn('種下'+CROPS[selectedCrop].name+'',()=>{if(plantCrop(state(),plotId,selectedCrop)){const p=state().life.plots[plotId];save();close();farmEffect(scene(),'seed',FARM_PLOTS[plotId],selectedCrop,p.plantId);api.toast('種下'+CROPS[selectedCrop].name+'了！點這片田幫它澆水。');}},{primary:true,id:'life-plant'});
 }else if(stage==='seed'){$('life-message').textContent='種子住進土裡了，澆完水就可以去玩平常的注音關卡。';btn('澆水 💧',()=>{if(waterCrop(state(),plotId)){save();close();farmEffect(scene(),'water',FARM_PLOTS[plotId],p.crop,p.plantId);}},{primary:true,id:'life-water'});
 }else if(stage==='growing'){
 const task=CROP_LESSONS[CROPS[p.crop].lesson],mode=CROPS[p.crop].lesson;let owner=null;try{owner=JSON.parse(state().life.learningOwner);}catch{}
 const demo=owner?owner[1]==='demo':new URL(location.href).searchParams.get('demo')==='1',batch=state().life.plots.filter(q=>q?.crop===p.crop&&plotStage(q)==='growing').length;
 $('life-message').textContent=`這批已有 ${batch} 處${CROPS[p.crop].name}澆好水。直接去玩平常的「${task.name}」，第一次答對至少 ${Math.ceil(task.questions*CROP_ACCURACY/100)}／${task.questions} 題，回來就能一起採收。不用老師另外指派。`;
 const go=trial=>{save();if(!departForIslandLesson(mode,{demo:trial}))api.toast('暫時無法保存往返進度，請確認瀏覽器允許儲存。');};
 btn('去玩'+task.name+(demo?'（試玩）':''),()=>go(demo),{primary:true,id:'life-study'});
 }else{$('life-message').textContent=CROPS[p.crop].name+'長好了！收下來放進小竹籃吧。';btn('採收'+CROPS[p.crop].name,()=>{const crop=harvestCrop(state(),plotId);if(crop){save();close();farmEffect(scene(),'harvest',FARM_PLOTS[plotId],crop,p.plantId);chime();}},{primary:true,id:'life-harvest'});}
 $('life-note').textContent='完成原有關卡，第一次作答達到 70%，回來就能收成。';
 const steps=document.createElement('div');steps.className='farm-steps';const current=['empty','seed','growing','ready'].indexOf(stage);['播種','澆水','玩注音','收成'].forEach((label,i)=>{const step=document.createElement('span');step.textContent=(i<current?'✓ ':i===current?'現在：':'')+label;if(i===current)step.setAttribute('aria-current','step');steps.append(step);});$('life-picture').before(steps);
 }else if(mode==='harvest'){
 base('收成了！',CROPS[result].name+'長大了');$('life-picture').classList.add('harvest-glow');$('life-picture').setAttribute('aria-label','剛採收的'+CROPS[result].name);$('life-message').textContent='收到 1 份'+CROPS[result].name+'，已放進小竹籃。';
 btn('繼續照顧田地',close);btn('帶收穫回家',()=>{close();api.cook();},{primary:true,id:'harvest-cook'});$('life-note').textContent='作物直接吃補得少，做成料理再吃補得更多。向日葵可以收藏。';
 }else if(mode==='collection'){

 base('我的小竹籃','收下每一次小小發現');$('life-picture').hidden=true;$('life-message').textContent='魚圖鑑與農場收穫，都保存在這個小屋裡。';const grid=document.createElement('div');grid.className='life-collection';
 for(const [id,fish]of Object.entries(FISH)){const item=document.createElement('div');item.className='collection-fish';item.innerHTML=`<canvas width="120" height="72" aria-hidden="true"></canvas><strong>${fish.name}</strong><span>食材 ${state().life.fish[id]} 尾 · 曾釣到 ${state().life.fishFound[id]} 尾</span>`;lifeStamp(item.querySelector('canvas').getContext('2d'),api.art().fish,Object.keys(FISH).indexOf(id),60,65,58);grid.append(item);}
 for(const [id,crop]of Object.entries(CROPS)){const item=document.createElement('div');item.innerHTML=`<span class="crop-symbol">${crop.icon}</span><strong>${crop.name}</strong><span>${state().life.harvest[id]} 份</span>`;grid.append(item);}$('life-choices').append(grid);btn('🥄 吃東西',()=>{close();api.food();},{primary:true,id:'life-eat'});btn('🎣 返回釣魚',()=>{close();visit('pond');},{id:'life-return-pond'});$('life-note').textContent='魚可以做成料理，吃完也會保留釣魚圖鑑記錄。';
 }if(mode==='plot'){$('life-picture').hidden=true;$('life-note').hidden=true;const p=state().life.plots[plotId],crop=p&&CROPS[p.crop];$('life-message').dataset.picture=crop?`${({single:'👂',spelling:'🧩',tone:'🎵',reading:'🎤'})[crop.lesson]} → ✅ ${crop.lesson==='reading'?'4/5':'7/10'} → ${crop.icon}`:'🌱 ↓';}paint();
 }
 function paint(){const el=$('life-picture'),art=api.art();if(!el||el.hidden||!art?.life)return;const c=el.getContext('2d');c.clearRect(0,0,600,300);const g=c.createLinearGradient(0,0,0,300);g.addColorStop(0,'#eaf0d8');g.addColorStop(1,'#cbd9ad');c.fillStyle=g;c.fillRect(0,0,600,300);
 if(mode==='pond'||mode==='unlock-pond'){
 c.fillStyle='#aec7b0';c.beginPath();c.ellipse(315,164,272,125,0,0,Math.PI*2);c.fill();c.fillStyle='#9ac7bb';c.beginPath();c.ellipse(315,158,257,110,0,0,Math.PI*2);c.fill();c.strokeStyle='#e4edce';c.lineWidth=3;c.beginPath();c.ellipse(350,164,80,18,0,0,Math.PI*2);c.stroke();lifeStamp(c,art.life,1,120,293,157);
 const t=scene()?.reduced.matches?0:performance.now()/1000;for(let i=0;i<3;i++)drawFish(c,230+i*100+Math.sin(t+i)*14,126+(i%2)*75,19,FISH[Object.keys(FISH)[i]].color);
 if(state().life.fishing){c.strokeStyle='#f8efc9';c.lineWidth=2;c.beginPath();c.moveTo(145,180);c.quadraticCurveTo(210,40,335,153);c.stroke();const ready=Date.now()>=state().life.fishing.biteAt;c.fillStyle=ready?'#d17d60':'#fbefcb';c.beginPath();c.ellipse(335,153+Math.sin(t*4)*3,8,10,0,0,Math.PI*2);c.fill();if(ready){c.fillStyle='#6e7150';c.font='bold 28px sans-serif';c.fillText('!',331,129);}}
 if(result){c.fillStyle='#fffae9ee';c.beginPath();c.roundRect(221,49,242,184,35);c.fill();lifeStamp(c,art.fish,Object.keys(FISH).indexOf(result),343,220,158);}
 }else if(mode==='unlock-farm'){lifeStamp(c,art.life,0,300,285,259);lifeStamp(c,art.life,3,87,279,100);lifeStamp(c,art.life,5,496,279,127);
 }else if(mode==='harvest'){drawFieldDetail(c,art);lifeStamp(c,art[CROPS[result].atlas||'life'],CROPS[result].art,300,263,216);
 }else if(mode==='plot'){
  drawFieldDetail(c,art);const p=state().life.plots[plotId],stage=plotStage(p);
  for(const y of [136,262])for(const x of [128,300,472]){
   if(stage==='ready')lifeStamp(c,art[CROPS[p.crop].atlas||'life'],CROPS[p.crop].art,x,y,p.crop==='carrot'?120:145);
   else if(stage==='growing')drawSeedling(c,art,x,y,2);
   else if(stage==='seed'){c.fillStyle='#edd3a0';for(const dx of [-12,0,12]){c.beginPath();c.ellipse(x+dx,y-8,4,2,0,0,Math.PI*2);c.fill();}}
  }
 }
 }
 function position(now){const s=scene();if(!s)return;let changed=false;for(const [id,e]of s.farmEffects||[]){if(farmProgress(e,now)<1)continue;s.farmEffects.delete(id);if(s.area==='farm')completeAction(e.type,{detail:e.type==='harvest'?CROPS[e.crop].name+' +1':e.type==='water'?'👂 → ✅ 70% → 🧺':undefined});if(e.type==='grow'){const p=state().life.plots[id];if(p?.plantId===e.plantId&&p.ready&&!p.growthSeen){p.growthSeen=true;changed=true;}}}if(changed)save();
 const fishEffect=s.fishingEffect;if(s.fishingView&&fishEffect&&!fishEffect.feedbackDone&&now-fishEffect.start>=fishEffect.duration){fishEffect.feedbackDone=true;completeAction(fishEffect.type==='reel'?'fish':'cast',{detail:fishEffect.fish?FISH[fishEffect.fish].name+' +1':undefined});}
 if(!dialog.open&&!s.farmEffects?.size)s.farmFocus=null;if(!s.fishingView)$('world').dataset.fishing='idle';
 $('world').dataset.farmEffect=[...(s.farmEffects?.values()||[])].map(e=>e.type).join(',');
 const blocked=api.blocked();for(const [id,x,y,visible]of [['pond-sign',925,570,s.area==='forest'],['farm-sign',450,678,s.area==='forest'],['farm-exit',625,746,s.area==='farm']]){const el=$(id),at=s.toScreen(x,y);const edge=id==='farm-exit';el.style.left=(edge?Math.max(44,Math.min(s.width-44,at.x)):at.x)+'px';el.style.top=(edge?Math.max(150,Math.min(s.height-110,at.y)):at.y)+'px';el.hidden=!visible||blocked||(!edge&&(at.x<40||at.x>s.width-40||at.y<145||at.y>s.height-100));}
 FARM_PLOTS.forEach(p=>{const el=$('farm-plot-'+p.id),at=s.toScreen(p.x,p.y+60);el.style.left=at.x+'px';el.style.top=at.y+'px';el.hidden=s.area!=='farm'||blocked||at.x<35||at.x>s.width-35||at.y<140||at.y>s.height-140;const planted=state().life.plots[p.id],stage=plotStage(planted);el.textContent=stage==='empty'?'＋':stage==='seed'?'💧':stage==='growing'?'♫':'🧺';el.dataset.ready=String(stage==='ready');el.setAttribute('aria-label',`田裡第 ${p.id+1} 處：${stage==='empty'?'播種':stage==='seed'?'澆水':stage==='growing'?'玩注音':'採收'}`);});
 if(now-lastTick<200)return;lastTick=now;if(!dialog.open)return;if(mode==='pond'){const stage=fishingStage(state().life.fishing,s.fishingEffect,now);$('world').dataset.fishing=stage;if(stage!==lastStage)render();}else if(mode==='plot'){const p=state().life.plots[plotId],stage=plotStage(p);if(stage!==lastStage)render();}
 }
 $('pond-sign').onclick=()=>visit('pond');$('farm-sign').onclick=()=>visit('farm');$('farm-exit').onclick=()=>{if(api.blocked())return;api.switchArea('forest');};
 for(const p of FARM_PLOTS){const b=document.createElement('button');b.id='farm-plot-'+p.id;b.className='plot-hotspot';b.hidden=true;b.onclick=()=>plot(p.id);$('map-stage').append(b);}
 for(const id of ['pond','farm'])$('trail-'+id).onclick=()=>{$('trail-dialog').close();visit(id);};$('trail-basket').onclick=()=>{$('trail-dialog').close();show('collection');};
 function menu(){for(const id of ['pond','farm'])$('trail-'+id).textContent=state().life[id+'Unlocked']?(id==='pond'?'去釣魚 →':'去農場 →'):`✦ ${ACTIVITY_PRICES[id]} 開放`;if(api.art()?.life){for(const [id,index]of [['pond-postcard',1],['farm-postcard',0]]){const c=$(id).getContext('2d');c.fillStyle='#e4ebcf';c.fillRect(0,0,360,240);if(index===1){c.fillStyle='#a1cbbb';c.beginPath();c.ellipse(240,124,165,102,0,0,Math.PI*2);c.fill();}lifeStamp(c,api.art().life,index,180,224,index===1?159:215);}}}
 return {get busy(){return dialog.open||!!scene()?.farmEffects?.size;},visit,position,menu,close,enterFarm};
}


