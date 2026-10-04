import {monsterProgress,monsterLevel,monsterLevelLabel,MONSTER_LEVELS,monsterRequirements} from './data/monster-collection-rules.js?v=20261004-levels1';
import {MONSTERS,randomMonster} from './data/monsters.js?v=20261004-villains1';
import {classStorageKey} from './class-context.js?v=20260928-all1';
import {within} from './reward-request.js?v=20260928-all1';
export function monsterCard(c,{locked=false,victories=0,preview=false,levels=[],requiredLevels=monsterRequirements(c)}={}){
 const card=document.createElement('article');card.className='monster-card monster-'+c.theme+(locked?' locked':'');
 if(c.theme==='concept'){card.dataset.frame=c.frame;card.style.setProperty('--monster-color',c.color);card.style.setProperty('--monster-accent',c.accent);}
 const badge=document.createElement('span');badge.className='monster-card-mark';badge.textContent=c.mark;
 const type=document.createElement('p');type.className='monster-card-kind';type.textContent=c.kind;
 const stage=document.createElement('div');stage.className='monster-card-stage';const img=document.createElement('img');img.src=c.image;img.alt=c.name;img.loading='lazy';stage.append(img);
 const title=document.createElement('h3');title.textContent=c.name;
 const line=document.createElement('p');line.className='monster-card-lore';line.textContent=c.line;
 const state=document.createElement('p');state.className='monster-card-state';const count=requiredLevels.length?requiredLevels.filter(id=>levels.includes(id)).length:Math.min(3,victories),needed=requiredLevels.length||3;state.textContent=preview?(requiredLevels.length?'每個關卡整回合全對，才能收藏':'整回合全對 3 次後可收藏'):locked?(requiredLevels.length?'不同關卡全對 ':'全對擊敗 ')+count+'／'+needed+(requiredLevels.length?' 關':' 次')+'・尚未收服':'已收服・可在「我的角色」選用';
 const progress=document.createElement('div');progress.className='monster-card-progress';progress.setAttribute('aria-label','收服進度 '+count+'／'+needed);if(requiredLevels.length&&(locked||preview||count===needed)){progress.classList.add('monster-level-progress');for(const id of requiredLevels){const badge=document.createElement('span');badge.textContent=(levels.includes(id)?'✓ ':'○ ')+monsterLevelLabel(id);badge.className=levels.includes(id)?'complete':'';progress.append(badge);}}else if(requiredLevels.length){progress.textContent='✓ 已收服';progress.setAttribute('aria-label','已收服，保留原規則收藏');}else progress.textContent=Array.from({length:3},(_,i)=>i<victories?'◆':'◇').join('　');
 card.append(badge,type,stage,title,line,progress,state);return card;
}
export function showMonsterReward(root,award){
 const c=MONSTERS.find(c=>c.id===award.monsterId);if(!c)return;
 const required=award.monsterRequiredLevels||monsterRequirements(c),levels=award.monsterLevels||[],scene=document.createElement('section');scene.className='monster-earned';const h=document.createElement('h3');
 h.textContent=(award.seat?award.seat+' 號・':'')+(award.monsterUnlocked?'收服成功！反派加入你的夥伴！':award.monsterRepeatLevel?'這一關已全對過，挑戰其他關卡吧！':award.monsterSuccess?'整回合全對！':'完成練習，下次挑戰全對！');
 const card=monsterCard(c,{locked:!award.monsterCard,victories:award.monsterWins||0,levels,requiredLevels:required});scene.append(h,card);
 if(!award.monsterCard){const state=card.querySelector('.monster-card-state'),missing=required.filter(id=>!levels.includes(id)).map(monsterLevelLabel);if(required.length)state.textContent=(!award.monsterSuccess?'本回合未全對・':'')+'還需要：'+missing.join('、')+'整回合全對';else if(!award.monsterSuccess)state.textContent='本回合未全對・收服進度維持 '+(award.monsterWins||0)+'／3';}root.append(scene);
}
const demoKey=seat=>classStorageKey('zhuyin.demo.monsters.v2.'+seat),memory=new Map();
export function demoMonsters(seat){let w;try{w=JSON.parse(localStorage.getItem(demoKey(seat)));}catch{}w||=memory.get(demoKey(seat))||{progress:[],receipts:{},encounters:{},cursor:0};w.owned=w.progress.filter(p=>p.acquired!==null);return w;}
function saveDemo(seat,w){memory.set(demoKey(seat),w);try{localStorage.setItem(demoKey(seat),JSON.stringify(w));}catch{}}
export function startDemoMonster(seat,encounter,mode=null){const w=demoMonsters(seat);w.encounterLevels||={};const level=monsterLevel(mode);if(w.encounterLevels[encounter]&&level&&w.encounterLevels[encounter]!==level)throw Error('encounter_level_conflict');if(!w.encounters[encounter])w.encounters[encounter]=randomMonster().id;if(level)w.encounterLevels[encounter]=level;saveDemo(seat,w);const id=w.encounters[encounter];return {monsterId:id,...monsterProgress(MONSTERS.find(c=>c.id===id),w.progress.find(p=>p.monster===id)||{})};}
export function creditDemoMonster(seat,encounter,perfect,mode=null){
 const w=demoMonsters(seat);if(w.receipts[encounter])return w.receipts[encounter];const id=w.encounters[encounter];if(!id)return {};
 const level=monsterLevel(mode);if(w.encounterLevels?.[encounter]&&w.encounterLevels[encounter]!==level)throw Error('encounter_level_conflict');
 const c=MONSTERS.find(c=>c.id===id),old=w.progress.find(x=>x.monster===id),before=monsterProgress(c,old||{}),distinct=before.monsterRequiredLevels.length>0,credit=perfect&&(!distinct||before.monsterRequiredLevels.includes(level)),next={monster:id,victories:(old?.victories||0)+Number(credit),acquired:old?.acquired??null,level_mask:(old?.level_mask||0)|(credit?(MONSTER_LEVELS.find(x=>x.id===level)?.bit||0):0)},progress=monsterProgress(c,next),unlocked=credit&&old?.acquired==null&&progress.monsterWins>=progress.monsterRequiredWins;
 if(unlocked)next.acquired=Date.now();const acquired=next.acquired!=null,award={seat,monsterId:id,...progress,monsterCollected:acquired,monsterCard:acquired?id:null,monsterUnlocked:unlocked,monsterSuccess:perfect,monsterDuplicate:credit&&old?.acquired!=null,monsterLevel:level,monsterLevelAdded:distinct&&credit&&!before.monsterLevels.includes(level),monsterRepeatLevel:distinct&&credit&&before.monsterLevels.includes(level)};
 if(credit){if(old)Object.assign(old,next);else w.progress.push(next);}w.receipts[encounter]=award;saveDemo(seat,w);return award;
}
export function setupMonsterCollection({parent,getSeat,request,demo=false}){
 const button=document.createElement('button');button.type='button';button.className='monster-collection-button';button.textContent='可愛反派收藏';button.setAttribute('aria-haspopup','dialog');parent.append(button);
 const dialog=document.createElement('dialog');dialog.className='monster-collection-dialog';dialog.setAttribute('aria-label','怪物卡片收藏');const close=document.createElement('button');close.type='button';close.className='monster-collection-close';close.textContent='回遊戲 ✕';close.onclick=()=>dialog.close();
 const title=document.createElement('h2');title.textContent='可愛反派收藏';const status=document.createElement('p');status.setAttribute('role','status');const grid=document.createElement('div');grid.className='monster-card-grid';const retry=document.createElement('button');retry.type='button';retry.textContent='重新讀取收藏';retry.className='monster-collection-retry';dialog.append(close,title,status,retry,grid);document.body.append(dialog);let generation=0;
 button.onclick=async()=>{const seat=getSeat();if(!dialog.open)dialog.showModal();const gen=++generation;grid.replaceChildren();if(!seat){status.textContent='請先選擇自己的座號並登入。';return;}status.textContent='正在讀取你的收藏…';try{const data=demo?demoMonsters(seat):await within(Promise.resolve().then(()=>request({kind:'monster-list',seat})),12000);if(data.error)throw Error(data.error);if(gen!==generation||seat!==getSeat())return;status.textContent=seat+' 號・已收集 '+data.owned.length+'／'+MONSTERS.length+' 種。新反派須在'+(data.monsterToneRequired?'聽音、拼音、朗讀、聲調四':'聽音、拼音、朗讀三')+'個關卡各完成一次整回合全對，同一關重複不累計。原有四位反派仍累積全對 3 次。收服後可在「我的角色」選用。每次新遊玩隨機出現怪物，可能再次遇見同一隻。';for(const c of MONSTERS){const own=data.owned.find(x=>x.monster===c.id),progress=(data.progress||[]).find(x=>x.monster===c.id);grid.append(monsterCard(c,{locked:!own,victories:progress?.victories||0,levels:progress?.monsterLevels||monsterProgress(c,progress||{}).monsterLevels,requiredLevels:progress?.monsterRequiredLevels||monsterRequirements(c,{tone:!!data.monsterToneRequired})}));}}catch{if(gen===generation)status.textContent='尚未讀取到收藏，請按重新讀取；若登入過期，請回遊戲重新登入。';}};
 retry.onclick=()=>button.onclick();
 dialog.addEventListener('close',()=>generation++);return {button,dialog};
}
