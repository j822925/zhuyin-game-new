import {forestMusic} from './adventure-music.js';
import {appendToneTarget} from './adventure-tone-question.js';
import {ZONE_STOREFRONTS} from './data/zone-storefront-art.js';
import {zoneShop} from './data/zone-shops.js';
import {FURNITURE} from './data/home-furniture.js';
import {fieldLayout,fieldWalkable,fieldPoint,makeFieldActors,stepFieldActors} from './adventure-expedition-field.js';
import {mountSparring,mountGuardian} from './adventure-expedition-motion.js';
import {battleStageLayout} from './adventure-battle-layout.js';
import {completeAction} from './adventure-action-feedback.js';
import {ZONES,zoneById,MINIONS} from './data/adventure-zones.js';
import {bossIsFriend,expeditionZone,enterLocalEncounter,playerStats,nextXP,enemyStats,enterExpedition,leaveExpedition,startExpeditionBattle,currentEnemy,answerExpedition,acknowledgeTransform,expeditionFood} from './adventure-expedition-model.js';
import {encounterDeck} from './adventure-encounters.js';
import {spellingChoices,spellingParts} from './core.js';
import {audioSource} from './audio-source.js';
import {RAW_FOOD,RECIPES} from './adventure-food-model.js';
export function createExpedition(api){
 const dialog=document.createElement('dialog');dialog.id='expedition';dialog.setAttribute('aria-label','區域遠征');document.body.append(dialog);
 let z=null,view='field',message='',generation=0,loading=false,questionFailed=false,audio=null,raf=0,position={x:50,y:77},target=null,last=0;
 let motion=null,fieldMotion=null,resolving=false;
 let local=false,localWon=null,actors=[],keys=new Set(),joystick=null,shopArrivalHeld=false,exitArrivalHeld=true;
 const state=()=>api.state(),exp=()=>state().expedition,run=()=>exp().runs[z?.id];
 const transaction=fn=>{const before=structuredClone(state()),result=fn();if(!result||result.ok===false)return false;if(!api.save()){Object.assign(state(),before);message='💾 儲存失敗，這次操作未扣款。請再試一次。';return false;}api.changed();return result;};
 function fitBattle(){
  if(!dialog.open||local||view!=='battle')return;
  const foe=dialog.querySelector('.exp-foe'),player=dialog.querySelector('.exp-player'),panel=dialog.querySelector('.exp-panel'),header=dialog.querySelector('.exp-header');if(!foe||!player||!panel)return;
  const box=dialog.getBoundingClientRect(),layout=battleStageLayout(box.width,box.height,panel.getBoundingClientRect().top-box.top,header.getBoundingClientRect().bottom-box.top);
  Object.assign(foe.style,{left:layout.foe.x+'px',right:'auto',top:layout.foe.y+'px',width:layout.foe.width+'px',height:layout.foe.height+'px'});
  Object.assign(player.style,{left:layout.player.x+'px',top:layout.player.y+'px',width:layout.player.width+'px',height:layout.player.height+'px'});
 }
 const layoutObserver=new ResizeObserver(fitBattle);layoutObserver.observe(dialog);
 let releaseQuestionMusic=null,releaseSpeechMusic=null;
 function stopAudio(){audio?.pause();audio=null;releaseQuestionMusic?.();releaseQuestionMusic=null;releaseSpeechMusic?.();releaseSpeechMusic=null;if(globalThis.speechSynthesis?.speaking)speechSynthesis.cancel();}
 function close(){forestMusic.setBattle(false);motion?.dispose();motion=null;fieldMotion?.dispose();fieldMotion=null;resolving=false;generation++;loading=false;keys.clear();joystick=null;stopAudio();cancelAnimationFrame(raf);dialog.close();if(local&&api.scene())api.scene().castAt=0;api.stop();}
 function depart(suspend=false){if(resolving)return;if(!local&&run()&&!transaction(()=>leaveExpedition(state(),{suspend}))){api.toast('💾 還沒存好，請再試一次');return;}close();if(suspend)completeAction('saved');}
 dialog.addEventListener('cancel',e=>{e.preventDefault();depart();});
 function button(label,action,cls=''){const b=document.createElement('button');b.textContent=label;b.className=cls;b.onclick=action;return b;}
 dialog.addEventListener('keydown',event=>{if(view!=='field'||event.target.closest('button'))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(event.key)){event.preventDefault();keys.add(event.key);}});dialog.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();joystick=null;});
 function drawPlayer(now){
  if(!dialog.open)return;const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(document.hidden){last=now;raf=requestAnimationFrame(drawPlayer);return;}
  if(local&&api.scene().castAt&&now-api.scene().castAt>1050)api.scene().castAt=0;
  const cv=dialog.querySelector('.exp-player'),world=dialog.querySelector('.exp-world');
  if(world){const width=Math.max(dialog.clientWidth,dialog.clientHeight*1.5),height=width/1.5;world.style.width=width+'px';world.style.height=height+'px';world.style.left=(view==='field'?Math.min(0,Math.max(dialog.clientWidth-width,dialog.clientWidth/2-position.x/100*width)):(dialog.clientWidth-width)/2)+'px';world.style.top=(view==='field'?Math.min(0,Math.max(dialog.clientHeight-height,dialog.clientHeight*.62-position.y/100*height)):(dialog.clientHeight-height)/2)+'px';}
  if(cv&&!local&&!(view==='battle'&&motion)){let moving=false,dx=0,dy=0;
   if(view==='field'){dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);if(joystick){dx=joystick.x;dy=joystick.y;}if(dx||dy){target=null;const len=Math.hypot(dx,dy),p={x:position.x+dx/len*dt*16,y:position.y+dy/len*dt*22};if(fieldWalkable(z.id,p)){position=p;moving=true;}}else if(target){dx=target.x-position.x;dy=target.y-position.y;const d=Math.hypot(dx,dy);if(d>.3){const step=Math.min(d,dt*18),p={x:position.x+dx/d*step,y:position.y+dy/d*step};if(fieldWalkable(z.id,p)){position=p;moving=true;}else target=null;}else target=null;}
    const [sx,sy]=fieldLayout(z.id).shop,doorway=fieldPoint(z.id,{x:sx,y:sy}),distance=Math.hypot(position.x-doorway.x,position.y-doorway.y);if(distance>7)shopArrivalHeld=false;if(api.openShop&&moving&&distance<3.5&&!shopArrivalHeld){void visitShop();return;}
    const [ex,ey]=fieldLayout(z.id).entry,exitDistance=Math.hypot(position.x-ex,position.y-ey);if(exitDistance>6)exitArrivalHeld=false;if(moving&&exitDistance<3.5&&!exitArrivalHeld){depart();return;}
    stepFieldActors(z.id,actors,dt);dialog.querySelectorAll('[data-mob]').forEach(el=>{const a=actors[Number(el.dataset.mob)];el.style.left=a.x+'%';el.style.top=a.y+'%';el.style.zIndex=Math.round(a.y);el.querySelector('img').style.transform='translateY('+Math.sin(a.clock*10)*1.3+'px)';});
   }
    const boss=dialog.querySelector('.exp-boss');if(boss){const floor=fieldLayout(z.id).boss,wh=world.getBoundingClientRect(),head=dialog.querySelector('.exp-header').getBoundingClientRect();boss.style.top=Math.max(floor[1],(head.bottom+12+boss.offsetHeight-wh.top)/wh.height*100)+'%';}
   if(view!=='battle'){cv.style.left=position.x+'%';cv.style.top=position.y+'%';}cv.style.zIndex=Math.round(view==='battle'?54:position.y);const c=cv.getContext('2d');c.clearRect(0,0,180,200);api.scene().drawPlayer(c,api.art(),{x:90,y:192,height:166,outfit:state().outfit,wand:state().wand,direction:dx<0?3:dx>0?1:dy<0?2:0,walking:moving,phase:now/100});
   dialog.dataset.playerX=position.x.toFixed(1);dialog.dataset.playerY=position.y.toFixed(1);
  }else if(cv&&local){const at=api.scene().toScreen(api.scene().player.x,api.scene().player.y);cv.style.left=at.x+'px';cv.style.top=at.y+'px';}
  raf=requestAnimationFrame(drawPlayer);
 }
 function shell(){
  forestMusic.setBattle(!!run()?.battle);
  motion?.dispose();motion=null;fieldMotion?.dispose();fieldMotion=null;dialog.dataset.resolving=String(resolving);stopAudio();dialog.setAttribute('aria-label',local?'原地挑戰':'區域遠征');dialog.classList.toggle('exp-local',local);dialog.dataset.view=view;dialog.innerHTML='<header class="exp-header"><div></div><nav></nav></header><main class="exp-field"><div class="exp-world"><canvas class="exp-player" width="180" height="200" aria-label="我的角色"></canvas><div class="exp-monsters"></div></div></main><section class="exp-panel" aria-live="polite"></section>';
  layoutObserver.disconnect();layoutObserver.observe(dialog);layoutObserver.observe(dialog.querySelector('.exp-panel'));layoutObserver.observe(dialog.querySelector('.exp-header'));
  if(!local)dialog.style.setProperty('--zone-scene',`url("${z.id==='bud'?api.art().terrain.village.src:'assets/expedition/'+z.scene+'.webp'}")`);
  const e=exp(),p=playerStats(e.level),head=dialog.querySelector('header div');head.innerHTML=`<strong>${z.icon} ${z.name}</strong><span>Lv.${e.level}　♥ ${e.hp}/${p.hp}　⚔ ${p.attack}　🛡 ${p.defense}</span><small>✦ ${state().stars}　🥄 ${state().life.nutrition.energy}/100　EXP ${e.xp}/${nextXP(e.level)||'MAX'}</small>`;
  const nav=dialog.querySelector('nav');nav.append(button('🎒',()=>{view='food';render();}),button('🃏',()=>{view='cards';render();}),button('💾 ↩',()=>depart(true)));nav.children[0].ariaLabel='遠征食物';nav.children[1].ariaLabel='守護者好友卡';nav.children[2].ariaLabel=local?'儲存並離開挑戰':'存檔休息，下次繼續這次遠征';
  const musicButton=button(forestMusic.state().enabled?'♫ 音樂':'♫ 靜音',()=>{document.getElementById('forest-music-toggle')?.click();musicButton.textContent=forestMusic.state().enabled?'♫ 音樂':'♫ 靜音';});musicButton.ariaLabel='背景音樂開關';nav.append(musicButton);
  const field=dialog.querySelector('.exp-field');field.onclick=event=>{if(event.target.closest('button')||view!=='field'||local)return;const b=field.querySelector('.exp-world').getBoundingClientRect();target=fieldPoint(z.id,{x:(event.clientX-b.left)/b.width*100,y:(event.clientY-b.top)/b.height*100});dialog.focus({preventScroll:true});};
  if(!local&&view==='field'){const stick=button('✿',()=>{},'exp-stick');stick.ariaLabel='區域移動搖桿';field.append(stick);const move=e=>{const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;joystick=Math.hypot(x,y)>6?{x,y}:null;};stick.onpointerdown=e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);move(e);};stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))move(e);};for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,()=>joystick=null);}
  cancelAnimationFrame(raf);raf=requestAnimationFrame(drawPlayer);
 }
 function portrait(src,name,cls=''){const img=document.createElement('img');img.src=src;img.alt=name;img.className=cls;img.onerror=()=>{message='圖片暫時載入失敗，可離開後再進入。';};return img;}
 function render(){
  if(!dialog.open||!z)return;shell();const panel=dialog.querySelector('.exp-panel'),r=run(),e=exp();if(!r)return;const b=r.battle;
  if(view==='cards'){panel.classList.add('exp-library');panel.innerHTML='<h2>🃏 守護者好友</h2>';for(const zone of ZONES){const c=e.cards[zone.id],tile=document.createElement('article');tile.className='boss-card';if(c){let beast=false;const img=portrait(zone.human,zone.boss);tile.append(img,button('人形 ⇄ 獸形',()=>{beast=!beast;img.src=beast?zone.beast:zone.human;}));tile.insertAdjacentHTML('beforeend',`<strong>${zone.boss}</strong><small>${zone.name} · 🤝 好友 · 切磋成功 ${c.wins} 次</small>`);}else tile.innerHTML=`<span class="locked-card">🔒</span><strong>${zone.name}</strong>`;panel.append(tile);}panel.append(button('↩',()=>{view=b?'battle':'field';render();}));return;}
  if(view==='food'){panel.innerHTML='<h2>🎒 遠征食物</h2><small>料理補一半生命；原食材補一成。戰鬥中吃東西會用掉攻擊回合。</small>';for(const cooked of [false,true])for(const [id,f] of Object.entries(cooked?RECIPES:RAW_FOOD)){const n=(cooked?state().life.nutrition.meals:state().life.harvest)[id]||0;if(!n)continue;panel.append(button(`${cooked?'🍲':'🥕'} ${f.name} ×${n}`,()=>{if(transaction(()=>expeditionFood(state(),id,cooked))){message='🍽️ 補充好了';view=b?'battle':'field';render();completeAction('eat',{host:dialog,anchor:'.exp-player'});}else{message=b&&b.phase!=='attack'?'🛡 防禦後才能吃東西':'已經補滿了';const hint=document.createElement('p');hint.textContent=message;panel.append(hint);}}));}panel.append(button('↩',()=>{view=b?'battle':'field';render();}));return;}
  if(b){view='battle';dialog.dataset.view='battle';const enemy=currentEnemy(state()),area=dialog.querySelector('.exp-field');if(!local){const hero=dialog.querySelector('.exp-player'),foe=portrait(enemy.art,enemy.name,'exp-foe');area.append(foe,hero);api.scene().drawPlayer(hero.getContext('2d'),api.art(),{x:90,y:192,height:166,outfit:state().outfit,wand:state().wand,direction:1,walking:false,phase:0});motion=mountSparring({hero,foe,characterId:state().companions.active,zone:z,beast:b.transformed,boss:enemy.boss});requestAnimationFrame(fitBattle);}panel.innerHTML=`${local?'<small>Lv.'+e.level+'　♥ '+e.hp+'/'+playerStats(e.level).hp+'　EXP '+e.xp+'/'+nextXP(e.level)+'</small>':''}<strong>${enemy.boss?'👑 ':''}${enemy.name} · Lv.${enemy.level}</strong><label>♥ ${b.hp}/${enemy.hp}<progress max="${enemy.hp}" value="${b.hp}"></progress></label><p>${message}</p>`;
   if(b.phase==='transform'){area.classList.add('exp-transform');panel.append(button('🔊',()=>speak(z.transform)),Object.assign(document.createElement('p'),{className:'guardian-speech',textContent:z.transform}),button('🛡 準備好了',()=>{if(transaction(()=>acknowledgeTransform(state()))){message='獸形：攻擊提升、防禦降低';render();}}));panel.querySelector('.guardian-speech')?.setAttribute('data-forest-dialogue','');fitBattle();return;}
   panel.insertAdjacentHTML('beforeend',`<h2>${b.phase==='attack'?'⚔ 我方攻擊':'🛡 守住這一回合'}</h2>`);
   if(b.question?.mode==='tone'&&!b.question.sourceId)b.question=null;
   if(b.question)showQuestion(panel,b);else{panel.append(button('👂 載入題目',()=>{questionFailed=false;void prepareQuestion();}));if(!questionFailed)void prepareQuestion();}fitBattle();return;
  }
  if(local){close();return;}view='field';const exit=button('🗺️ ↩',()=>depart(),'exp-return');exit.ariaLabel='離開區域，下次三隻小怪重新出現';const [ex,ey]=fieldLayout(z.id).entry;exit.style.left=ex+'%';exit.style.top=ey+'%';dialog.querySelector('.exp-world').append(exit);
  const regional=zoneShop(z.id);if(regional&&api.openShop){const door=button('',()=>void visitShop(),'exp-shop-entry'),[sx,sy]=fieldLayout(z.id).shop,at=fieldPoint(z.id,{x:sx,y:sy});door.append(portrait(ZONE_STOREFRONTS[z.id].src,regional.name));const caption=document.createElement('small');caption.textContent=regional.icon+' '+regional.name;door.append(caption);door.ariaLabel='進入'+regional.name;door.style.left=at.x+'%';door.style.top=at.y+'%';dialog.querySelector('.exp-world').append(door);}const done=r.monsters.filter(m=>m.done).length;panel.innerHTML=`<strong>${r.complete?'🤝 切磋成功！守護者還在這裡':`小怪 ${done}/${r.monsters.length}　${done===r.monsters.length?'👑 BOSS 出現了':'🔒 BOSS'}`}</strong><p>${message}</p>`;
  if(r.complete){panel.append(button('🃏 看收藏卡',()=>{view='cards';render();}),button('🗺️ 回地圖',()=>depart()));}
  const area=dialog.querySelector('.exp-monsters');
  for(let i=0;i<r.monsters.length;i++){const m=r.monsters[i];if(m.done)continue;const mob=button('',()=>void begin(i),'exp-mob');mob.dataset.mob=String(i);mob.setAttribute('aria-label','挑戰'+MINIONS[m.art].name);mob.style.left=actors[i].x+'%';mob.style.top=actors[i].y+'%';mob.append(portrait(`assets/expedition/minions-${m.art}.webp`,MINIONS[m.art].name));mob.insertAdjacentHTML('beforeend',`<small>${['single','spelling','tone'].indexOf(m.mode)===0?'👂':m.mode==='tone'?'♫':'🧩'} ${MINIONS[m.art].name}</small>`);area.append(mob);}
  if(done===r.monsters.length){const boss=button('',()=>{view='intro';renderIntro();},'exp-mob exp-boss');const [bx,by]=fieldLayout(z.id).boss;boss.style.left=bx+'%';boss.style.top=by+'%';boss.style.zIndex=Math.round(by);boss.ariaLabel=(bossIsFriend(state(),z.id)?'找好友切磋：':'與守護者切磋：')+z.boss;boss.append(portrait(z.human,z.boss));boss.insertAdjacentHTML('beforeend',`<small>${bossIsFriend(state(),z.id)?'🤝':'👑'} ${z.boss}</small>`);area.append(boss);fieldMotion=mountGuardian(boss.querySelector('img'),{zone:z});}
 }
 async function visitShop(){if(!api.openShop||local||view!=='field'||run()?.battle)return;shopArrivalHeld=true;const token=++generation;target=null;keys.clear();joystick=null;fieldMotion?.dispose();fieldMotion=null;cancelAnimationFrame(raf);stopAudio();dialog.close();api.stop();const restore=()=>{if(token!==generation)return;dialog.showModal();view='field';last=performance.now();render();};try{if(await api.openShop(z.id,restore)===false)restore();}catch{restore();message='商店暫時沒開好，請再試一次';render();}}
 function renderIntro(){const r=run();view='intro';render();view='intro';const panel=dialog.querySelector('.exp-panel'),s=enemyStats(z,true),intro=bossIsFriend(state(),z.id)?z.friendIntro:z.intro;panel.innerHTML=`<h2>👑 ${z.boss}</h2><p data-forest-dialogue>${intro}</p><small>♥ ${s.hp}　⚔ ${s.attack}　🛡 ${s.defense}　· 獸形不回滿生命</small>`;panel.append(button('🔊',()=>speak(intro)),button('🤝 開始切磋',()=>void begin(r.monsters.length)),button('↩',()=>{view='field';render();}));}
 function speak(text){if(!('speechSynthesis'in window))return;const release=forestMusic.hold();stopAudio();releaseSpeechMusic=release;const u=new SpeechSynthesisUtterance(text);u.lang='zh-TW';u.rate=.85;u.onend=u.onerror=release;try{speechSynthesis.speak(u);}catch{release();}}
 async function begin(slot){if(loading)return;target=null;keys.clear();joystick=null;const token=generation;loading=true;const allowed=await (globalThis.ForestAccess?.check()??true);loading=false;if(!allowed||token!==generation||!dialog.open)return;if(slot===run().monsters.length){loading=true;try{await Promise.all([z.human,z.beast].map(async src=>{const img=new Image();img.src=src;await img.decode();}));}catch{message='圖片還沒載入，請再點一次挑戰。';loading=false;if(dialog.open)render();return;}loading=false;if(token!==generation||!dialog.open)return;}
  if(transaction(()=>startExpeditionBattle(state(),slot))){view='battle';message='';render();}else{message='🥄 每場需要 8 體力，可以先吃東西。';render();}}
 async function prepareQuestion(){
  const b=run()?.battle;if(!b||b.question||loading||b.phase==='transform')return;loading=true;const token=generation;
  try{const mode=currentEnemy(state()).mode,{deck,pool}=await encounterDeck({mode,level:z.index===0?1:2,hp:1}),q=deck[0];
   if(token!==generation||run()?.battle!==b)return;
   let choices,answer;if(mode==='tone'){choices=[1,2,3,4,5].map((n,i)=>({label:['—','ˊ','ˇ','ˋ','˙'][i],value:String(n)}));answer=String(q.tone);}
   else{answer=q.label;const others=[...new Set(pool.map(x=>x.label).filter(x=>x!==answer))].sort(()=>Math.random()-.5).slice(0,3);choices=[answer,...others].sort(()=>Math.random()-.5).map(x=>({label:x,value:x}));}
   let extra=mode==='tone'?{sourceId:q.sourceId,bankVersion:q.bankVersion,targetIndex:q.targetIndex,targetCharacter:q.targetCharacter}:{};if(mode==='spelling'){const parts=spellingParts(q),pick=spellingChoices(q,pool);choices=pick.initial.map(x=>({label:x||'∅',value:x}));answer=parts.initial;extra={part:'initial',initial:parts.initial,finalAnswer:parts.final,finalChoices:pick.final.map(x=>({label:x||'∅',value:x}))};}
   if(!transaction(()=>{b.question={mode,audio:q.audio,label:q.label,answer,choices,...extra};return true;}))questionFailed=true;
  }catch{questionFailed=true;message='題目暫時載入失敗，按 👂 再試一次。';}finally{if(token===generation){loading=false;if(dialog.open)render();}}
 }
 function showQuestion(panel,b){
  const q=b.question,listen=button('🔊 聽題目',()=>{const release=forestMusic.hold();stopAudio();const current=new Audio(audioSource(q.audio));audio=current;const finish=forestMusic.protect(current);releaseQuestionMusic=finish;release();current.play().then(()=>{if(audio!==current){current.pause();finish();}}).catch(()=>{finish();if(audio!==current)return;message='音訊未播放，請再點一次喇叭。';const hint=document.createElement('p');hint.textContent=message;panel.append(hint);});});panel.append(listen);
  if(q.mode==='tone')appendToneTarget(panel,q);
  if(q.mode==='spelling')panel.append(document.createTextNode((q.part==='final'?(q.initial||'∅'):'□')+' ＋ □'));
  const grid=document.createElement('div');grid.className='exp-answers';panel.append(grid);
  for(const choice of q.choices)grid.append(button(choice.label,async()=>{
   if(resolving||run()?.battle!==b||b.question!==q)return;
   if(q.mode==='spelling'&&q.part==='initial'&&choice.value===q.answer){if(transaction(()=>{q.part='final';q.answer=q.finalAnswer;q.choices=q.finalChoices;return true;}))render();return;}
   const previousLevel=exp().level,previousPhase=b.phase;const result=transaction(()=>answerExpedition(state(),choice.value===q.answer));if(!result)return;
   if(motion){resolving=true;dialog.dataset.resolving='true';dialog.focus({preventScroll:true});dialog.scrollTop=0;dialog.querySelectorAll('button').forEach(el=>el.disabled=true);const token=generation;const completed=await motion.play(result);resolving=false;dialog.dataset.resolving='false';if(!completed||token!==generation||!dialog.open)return;}
   message=result.correct?(result.won?`🎉 ✦ +${result.stars}　EXP +${result.xp}`:'✓ 很棒！'):`再聽一次：${q.answer}`;
   if(result.lost){close();api.defeated();return;}if(local&&result.won){const callback=localWon;close();callback?.();completeAction(exp().level>previousLevel?'level':'win',{detail:'✦ +'+result.stars+'　EXP +'+result.xp});return;}if(local&&result.correct&&previousPhase==='attack')api.scene().castAt=performance.now();if(result.newFriend)message='🤝 '+z.boss+' 成為好友了！好友卡已加入收藏。';else if(result.friend)message='🤝 切磋成功！下次再一起練習吧。';if(result.gift)message+=' 🎁 '+FURNITURE.find(f=>f.id===result.gift)?.name+'，已放入家具收藏！';else if(result.giftOwned)message+=' 🎁 這份紀念品已收藏。';view=run().battle?'battle':'field';render();completeAction(result.card?'card':result.friend?'spar':result.won?(exp().level>previousLevel?'level':'win'):result.correct?(previousPhase==='attack'?'attack':'defend'):'retry',{host:dialog,anchor:'.exp-player',detail:result.won?'✦ +'+result.stars+'　EXP +'+result.xp+(exp().level>previousLevel?'　Lv.'+exp().level:''):undefined});
  }));
 }
 async function open(id,{approved=false}={}){
  if(api.blocked())return;local=false;localWon=null;dialog.classList.remove('exp-local');z=zoneById(id);if(!z)return;generation++;message='';questionFailed=false;api.stop();
  // Show a local confirmation before entering an over-level area, without charging.
  if(!approved&&exp().level+2<z.level){dialog.showModal();dialog.innerHTML=`<section class="exp-warning"><h2>${z.icon} ${z.name}</h2><p>建議 Lv.${z.level}～${z.maxLevel}，你目前 Lv.${exp().level}。</p><p>這裡的敵人很強，記得帶料理。</p></section>`;const box=dialog.querySelector('section');box.append(button('⚔ 仍要前往',chooseVisit),button('↩',close));}else chooseVisit();
 }
 function chooseVisit(){
  const r=run();if(r&&!r.complete&&(r.battle||!r.visitClosed&&r.monsters.some(m=>m.done))){
   if(!dialog.open)dialog.showModal();dialog.dataset.view='resume';dialog.innerHTML=`<section class="exp-warning"><h2>💾 上次的探險</h2><p>已完成 ${r.monsters.filter(m=>m.done).length}／${r.monsters.length} 隻小怪</p>${r.battle?'<p>繼續挑戰不會重扣體力；重新探險會放棄這場進度。</p>':''}</section>`;
   const box=dialog.querySelector('section');box.append(button('▶ 繼續上次',()=>enter()),button('🌱 重新探險・三隻小怪',()=>enter(true)),button('↩',close));return;
  }enter();
 }
 function enter(restart=false){if(!transaction(()=>enterExpedition(state(),z.id,Math.random,{restart}))){api.toast('🥄 先吃點東西');close();return;}if(!dialog.open)dialog.showModal();view=run().battle?'battle':'field';const [px,py]=fieldLayout(z.id).spawn;position=fieldPoint(z.id,{x:px,y:py});exitArrivalHeld=true;shopArrivalHeld=false;actors=makeFieldActors(z.id,run().monsters.length);target=null;render();}
 async function openEncounter(area,id,onWon){if(api.blocked())return;if(!(await(globalThis.ForestAccess?.check()??true))||api.blocked())return;message='';questionFailed=false;local=true;localWon=onWon;
   if(!transaction(()=>enterLocalEncounter(state(),area,id))){local=false;api.toast('🥄 先補充體力；未完成的挑戰可點原來的小怪繼續。');return;}
   z=expeditionZone(exp());generation++;api.stop();view='battle';dialog.showModal();render();
  }
 return {open,openEncounter,close,get localBattle(){return dialog.open&&local;},get busy(){return dialog.open;}};
}
