import {MONSTERS,randomMonster} from './data/monsters.js?v=20260928-all1';
import {classStorageKey} from './class-context.js?v=20260928-all1';
import {within} from './reward-request.js?v=20260928-all1';
export function monsterCard(c,{locked=false,victories=0,preview=false}={}){
 const card=document.createElement('article');card.className='monster-card monster-'+c.theme+(locked?' locked':'');
 const badge=document.createElement('span');badge.className='monster-card-mark';badge.textContent=c.mark;
 const type=document.createElement('p');type.className='monster-card-kind';type.textContent=c.kind;
 const stage=document.createElement('div');stage.className='monster-card-stage';const img=document.createElement('img');img.src=c.image;img.alt=c.name;img.loading='lazy';stage.append(img);
 const title=document.createElement('h3');title.textContent=c.name;
 const line=document.createElement('p');line.className='monster-card-lore';line.textContent=c.line;
 const state=document.createElement('p');state.className='monster-card-state';state.textContent=preview?'全對擊敗 3 次後可收藏':locked?'全對擊敗 '+Math.min(3,victories)+'／3 次・尚未收服':'全對擊敗 3／3 次・已加入收藏';
 const progress=document.createElement('div');progress.className='monster-card-progress';progress.setAttribute('aria-label','全對擊敗 '+Math.min(3,victories)+' 次，共需三次');progress.textContent=Array.from({length:3},(_,i)=>i<victories?'◆':'◇').join('　');
 card.append(badge,type,stage,title,line,progress,state);return card;
}
export function showMonsterReward(root,award){const c=MONSTERS.find(c=>c.id===award.monsterId);if(!c)return;const scene=document.createElement('section');scene.className='monster-earned';const h=document.createElement('h3');h.textContent=(award.seat?award.seat+' 號・':'')+(award.monsterUnlocked?'第三次全對！獲得怪物卡片！':award.monsterSuccess?'全對挑戰成功！':'完成練習，下次挑戰全對！');scene.append(h,monsterCard(c,{locked:!award.monsterCard,victories:award.monsterWins||0}));if(!award.monsterSuccess)scene.lastChild.querySelector('.monster-card-state').textContent='本回合未全對・收服進度維持 '+(award.monsterWins||0)+'／3';root.append(scene);}
const demoKey=seat=>classStorageKey('zhuyin.demo.monsters.v2.'+seat),memory=new Map();
export function demoMonsters(seat){let w;try{w=JSON.parse(localStorage.getItem(demoKey(seat)));}catch{}w||=memory.get(demoKey(seat))||{progress:[],receipts:{},encounters:{},cursor:0};w.owned=w.progress.filter(p=>p.acquired!==null);return w;}
function saveDemo(seat,w){memory.set(demoKey(seat),w);try{localStorage.setItem(demoKey(seat),JSON.stringify(w));}catch{}}
export function startDemoMonster(seat,encounter){const w=demoMonsters(seat);if(!w.encounters[encounter])w.encounters[encounter]=randomMonster().id;saveDemo(seat,w);const id=w.encounters[encounter];return {monsterId:id,monsterWins:Math.min(3,w.progress.find(p=>p.monster===id)?.victories||0)};}
export function creditDemoMonster(seat,encounter,perfect){const w=demoMonsters(seat);if(w.receipts[encounter])return w.receipts[encounter];const id=w.encounters[encounter];if(!id)return {};const old=w.progress.find(x=>x.monster===id),wins=(old?.victories||0)+(perfect?1:0),award={seat,monsterId:id,monsterWins:Math.min(3,wins),monsterCard:wins>=3?id:null,monsterUnlocked:perfect&&wins===3,monsterSuccess:perfect,monsterDuplicate:perfect&&wins>3};if(perfect){if(old){old.victories++;if(wins>=3)old.acquired??=Date.now();}else w.progress.push({monster:id,victories:1,acquired:null});}w.receipts[encounter]=award;saveDemo(seat,w);return award;}
export function setupMonsterCollection({parent,getSeat,request,demo=false}){
 const button=document.createElement('button');button.type='button';button.className='monster-collection-button';button.textContent='可愛反派收藏';button.setAttribute('aria-haspopup','dialog');parent.append(button);
 const dialog=document.createElement('dialog');dialog.className='monster-collection-dialog';dialog.setAttribute('aria-label','怪物卡片收藏');const close=document.createElement('button');close.type='button';close.className='monster-collection-close';close.textContent='回遊戲 ✕';close.onclick=()=>dialog.close();
 const title=document.createElement('h2');title.textContent='可愛反派收藏';const status=document.createElement('p');status.setAttribute('role','status');const grid=document.createElement('div');grid.className='monster-card-grid';const retry=document.createElement('button');retry.type='button';retry.textContent='重新讀取收藏';retry.className='monster-collection-retry';dialog.append(close,title,status,retry,grid);document.body.append(dialog);let generation=0;
 button.onclick=async()=>{const seat=getSeat();if(!dialog.open)dialog.showModal();const gen=++generation;grid.replaceChildren();if(!seat){status.textContent='請先選擇自己的座號並登入。';return;}status.textContent='正在讀取你的收藏…';try{const data=demo?demoMonsters(seat):await within(Promise.resolve().then(()=>request({kind:'monster-list',seat})),12000);if(data.error)throw Error(data.error);if(gen!==generation||seat!==getSeat())return;status.textContent=seat+' 號・已收集 '+data.owned.length+'／'+MONSTERS.length+' 種。同一隻怪物累積全對擊敗 3 次，才會加入收藏。每次新遊玩隨機出現怪物，可能再次遇見同一隻。';for(const c of MONSTERS){const own=data.owned.find(x=>x.monster===c.id),progress=(data.progress||[]).find(x=>x.monster===c.id);grid.append(monsterCard(c,{locked:!own,victories:progress?.victories||0}));}}catch{if(gen===generation)status.textContent='尚未讀取到收藏，請按重新讀取；若登入過期，請回遊戲重新登入。';}};
 retry.onclick=()=>button.onclick();
 dialog.addEventListener('close',()=>generation++);return {button,dialog};
}

