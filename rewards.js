import {CHARACTERS,STARTERS,DRAW_COST,REDEEM_COST,portrait,drawCharacter,redeemCharacter} from './characters.js?v=20260913-heroes1';
import {cappedRoundAward,rewardParticipants,taipeiDay} from './learning-rewards.js?v=20260913-tutor1';
import {startGachaAnimation} from './gacha-animation.js?v=20260913-ipad1';
import {createStarPrize} from './star-prize.js?v=20260919-egg1';
import {confirmReward,within} from './reward-request.js?v=20260919-egg1';
export function createRewards({demo,getConfig,getSeat,getSeats,jsonGet,post,onChange}){
 const $=id=>document.getElementById(id),cache=new Map(),refreshVersions=new Map();let category='animal',busy=false,activeSeat='',previewPersistent=true,revealed=false,prize=null;
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
 function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{previewPersistent=false;return false;}}
 const key=seat=>'zhuyin.demo.wallet.v1.'+seat;
 const pendingKey=seat=>'zhuyin.gacha.pending.'+seat;
 const pending=()=>!demo&&read(pendingKey(activeSeat),null);
 async function transaction(fresh){
  const requestKey=pendingKey(activeSeat),request=read(requestKey,null)||fresh;
  if(!store(requestKey,request))throw new Error('storage');
  let status;try{status=await confirmReward(request,{post,query:r=>jsonGet('?api=draw-status&seat='+encodeURIComponent(r.seat)+'&id='+encodeURIComponent(r.roundId))});}
  catch(error){if(error.definitive)store(requestKey,null);throw error;}
  const character=CHARACTERS.find(c=>c.id===status.character);if(!character)throw new Error('missing-character');
  // Preserve the last confirmed result even if a later wallet refresh fails.
  store(requestKey,null);return {character,duplicate:status.duplicate===true};
 }
 function defaultWallet(){return {stars:0,candies:0,owned:[...STARTERS],credited:[],practiceRounds:0,spellingRounds:0};}
 function wallet(seat){if(!cache.has(seat))cache.set(seat,demo?read(key(seat),defaultWallet()):defaultWallet());return cache.get(seat);}
 const button=document.createElement('button');button.id='open-collection';button.className='collection-button';button.setAttribute('aria-label','我的星星與角色');button.innerHTML='🥚 <span>★ 0</span>';
 document.querySelector('.top-actions').prepend(button);
 const dialog=document.createElement('dialog');dialog.id='collection-dialog';dialog.innerHTML=`<div class="collection-top"><strong id="wallet-stars">★ 0</strong><strong id="wallet-candies">🍬 0</strong><button id="collection-close" class="icon-button" aria-label="回到遊戲">✕</button></div><div class="gacha-pools"><button id="pool-animal" aria-label="動物轉蛋" aria-pressed="true">🐾</button><button id="pool-fairy" aria-label="精靈轉蛋" aria-pressed="false">🧚</button><button id="pool-hero" aria-label="冒險小隊轉蛋" aria-pressed="false">🗡️</button></div><div id="gacha-reveal" class="gacha-reveal" aria-live="polite">🥚</div><button id="draw-character" class="primary" aria-label="花五顆星星抽角色，重複得一顆糖果">★ ${DRAW_COST} → 🥚</button><p id="gacha-message" role="status"></p><div id="character-gallery" class="character-gallery"></div>`;
 document.body.append(dialog);
 const exchange=document.createElement('dialog');exchange.className='exchange-dialog';exchange.innerHTML='<div id="exchange-character"></div><p>🍬 50 → 🎁</p><button class="primary" id="exchange-confirm" aria-label="確認花五十顆糖果兌換角色">✓</button> <button class="secondary" id="exchange-cancel" aria-label="取消兌換">✕</button>';document.body.append(exchange);let exchangeId=null;
 $('exchange-cancel').onclick=()=>exchange.close();exchange.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 function render(){const seat=activeSeat||getSeat(),w=wallet(seat);$('wallet-stars').textContent='★ '+w.stars;$('wallet-candies').textContent='🍬 '+(w.candies||0);button.querySelector('span').textContent='★ '+w.stars;
  $('pool-animal').setAttribute('aria-pressed',String(category==='animal'));$('pool-fairy').setAttribute('aria-pressed',String(category==='fairy'));
  $('pool-animal').disabled=busy;$('pool-fairy').disabled=busy;$('pool-hero').disabled=busy;$('pool-hero').hidden=!demo&&!getConfig()?.heroWrites;$('pool-hero').setAttribute('aria-pressed',String(category==='hero'));$('collection-close').disabled=busy;
  const available=CHARACTERS.filter(c=>c.category===category&&c.enabled!==false);
  $('draw-character').disabled=busy||(!revealed&&!pending()&&(w.stars<DRAW_COST||!available.length||(!demo&&!getConfig()?.rewardsWrites)));
  $('draw-character').textContent=revealed?'✓ 收好角色':pending()?'↻ 🥚 恢復上次開蛋':'★ '+DRAW_COST+' → 🥚';$('draw-character').setAttribute('aria-label',revealed?'收好角色，回到轉蛋':pending()?'恢復上次開蛋，不會重複扣星星':'花五顆星星抽角色，重複得一顆糖果');
  $('character-gallery').innerHTML=CHARACTERS.filter(c=>c.category===category&&c.enabled!==false).map(c=>`<button class="character-card ${w.owned.includes(c.id)?'owned':'locked'}" data-character="${c.id}" aria-label="${c.name}${w.owned.includes(c.id)?'，已收集':'，五十顆糖果兌換'}" ${busy||(!w.owned.includes(c.id)&&(w.candies||0)<REDEEM_COST)?'disabled':''}>${portrait(c)}<span>${w.owned.includes(c.id)?'✓':(w.candies||0)>=REDEEM_COST?'🍬 50':'🔒'}</span><small>${c.name}</small></button>`).join('');
  dialog.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{const c=CHARACTERS.find(c=>c.id===b.dataset.character);if(!w.owned.includes(c.id)){exchangeId=c.id;$('exchange-character').innerHTML=portrait(c);exchange.showModal();return;}$('gacha-reveal').innerHTML=portrait(c);$('gacha-message').textContent='想使用這個角色？請回首頁點自己的頭貼，在「我的角色」選擇並儲存。';});
 }
 async function refresh(){
  const seats=[...new Set(getSeats().filter(Boolean))];
  if(!demo&&getConfig()?.rewardsWrites){await Promise.all(seats.map(async seat=>{const v=(refreshVersions.get(seat)||0)+1;refreshVersions.set(seat,v);try{const data=await within(jsonGet('?api=wallet&seat='+encodeURIComponent(seat)),5000);if(refreshVersions.get(seat)===v&&data&&Number.isInteger(data.stars)&&Array.isArray(data.owned))cache.set(seat,data);}catch{}}));}
  if(getSeat()){if(!dialog.open)activeSeat=getSeat();render();}onChange?.();
 }
 button.onclick=async()=>{if(!getSeat()){document.getElementById('seat').focus();document.getElementById('home-message').textContent='👆 🔢';return;}activeSeat=getSeat();revealed=false;$('gacha-reveal').textContent='🥚';$('gacha-message').textContent=demo?'':getConfig()?.rewardsWrites?'':'老師提醒：正式星星紀錄尚未開放，目前可在老師試玩體驗。';render();dialog.showModal();await refresh();};
 $('collection-close').onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 for(const value of ['animal','fairy','hero'])$('pool-'+value).onclick=()=>{if(busy)return;category=value;revealed=false;$('gacha-reveal').textContent='🥚';$('gacha-message').textContent='';render();};
 $('draw-character').onclick=async()=>{
  if(busy||!activeSeat)return;if(revealed){revealed=false;$('gacha-reveal').textContent='🥚';render();return;}busy=true;render();$('gacha-message').textContent='';
  const animation=startGachaAnimation($('gacha-reveal'));
  prize??=createStarPrize({ordinary:true});prize.start();
  try{
   let c,duplicate=false;
   if(demo){const result=drawCharacter(wallet(activeSeat),category);if(result.error)throw new Error('insufficient_stars');cache.set(activeSeat,result.wallet);store(key(activeSeat),result.wallet);c=result.character;duplicate=result.duplicate;}
   else{
    const result=await transaction({kind:'gacha',seat:activeSeat,category,roundId:crypto.randomUUID()});c=result.character;duplicate=result.duplicate;
   }
   if(!c)throw new Error('missing-character');
   await animation.open();animation.finish();revealed=true;$('gacha-reveal').innerHTML=portrait(c)+(duplicate?'<strong class="candy-bonus">🍬 +1</strong>':'<strong class="candy-bonus">✨</strong>');$('gacha-reveal').classList.remove('reveal-pop');void $('gacha-reveal').offsetWidth;$('gacha-reveal').classList.add('reveal-pop');
   void refresh();await prize.reveal(c,{duplicate});onChange?.();if(!previewPersistent)$('gacha-message').textContent='老師提醒：此瀏覽器無法保存試玩角色，關閉後可能遺失。';
  }catch(error){const message=error.message==='insufficient_stars'?'星星不足五顆，這次沒有扣星星。':error.message==='storage'?'瀏覽器無法保存開蛋進度，這次沒有送出抽獎。請找老師協助。':error.message==='authentication_required'?'登入已過期，請回首頁重新登入，再恢復上次開蛋。':error.definitive?'這次未完成抽取，請重新讀取星星或找老師協助。':'📶 尚未確認抽取結果，請連線後按「恢復上次開蛋」，不會重複扣星星。';$('gacha-message').textContent=message;prize.message(message);}
  finally{animation.finish();if(!revealed)$('gacha-reveal').textContent='🥚';busy=false;render();}
 };
 $('exchange-confirm').onclick=async()=>{
  if(busy||!exchangeId)return;busy=true;$('exchange-confirm').disabled=true;$('exchange-cancel').disabled=true;
  try{
   let c;
   if(demo){const result=redeemCharacter(wallet(activeSeat),exchangeId);if(result.error)return;cache.set(activeSeat,result.wallet);store(key(activeSeat),result.wallet);c=result.character;}
   else{if(pending())throw new Error('pending_draw');const result=await transaction({kind:'redeem',seat:activeSeat,character:exchangeId,roundId:crypto.randomUUID()});c=result.character;void refresh();}
   if(c)$('gacha-reveal').innerHTML=portrait(c)+'<strong class="candy-bonus">🎁</strong>';exchange.close();onChange?.();
  }catch{exchange.close();$('gacha-message').textContent='請先按「恢復上次開蛋」確認未完成的獎勵，不會重複扣星星或糖果。';}
  finally{busy=false;$('exchange-confirm').disabled=false;$('exchange-cancel').disabled=false;render();}
 };
 return {
  refresh,
  previewBonus(){if(!demo||!getSeat())return;const w=wallet(getSeat());w.stars+=20;w.candies=(w.candies||0)+50;store(key(getSeat()),w);refresh();},
  owned:seat=>wallet(seat).owned,
  avatar(seat){return CHARACTERS.find(c=>c.id===read('zhuyin.avatar.'+seat,STARTERS[0])&&wallet(seat).owned.includes(c.id))||CHARACTERS[0];},
  credit(results){if(!demo)return [];const awards=[];for(const result of results){
    for(const {seat,baseStars} of rewardParticipants(result)){const w=wallet(seat);if(w.credited.includes(result.roundId))continue;const counter=result.mode==='spelling'?'spellingRounds':'practiceRounds',day=taipeiDay();if(w.dailyRewards?.day!==day)w.dailyRewards={day,modes:{}};const usage=w.dailyRewards.modes[result.mode]||{perfectStars:0,perseveranceStars:0};const award=cappedRoundAward(w[counter],baseStars,result.mode,usage,result.kind==='race'||!!result.competition);w.dailyRewards.modes[result.mode]={perfectStars:usage.perfectStars+award.perfectStars,perseveranceStars:usage.perseveranceStars+award.perseveranceStars};w.stars+=award.stars;w[counter]=award.completedRounds;w.credited.push(result.roundId);store(key(seat),w);awards.push({seat,...award});}
   }refresh();return awards;
  }
 };
}
