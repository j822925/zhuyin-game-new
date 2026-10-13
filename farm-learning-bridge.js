import {forestSaveKey} from './adventure-sync.js';
import {SAVE_KEY,sanitizeState} from './adventure-model.js';
import {CROPS,CROP_LESSONS,CROP_ACCURACY,beginFarmRound,settleFarmRound,farmRoundScore} from './adventure-life-model.js';

const TICKETS='zhuyin.farm-learning-rounds.v1',TRIP='zhuyin.farm-learning-trip.v1';
export function isLegacyFarmUpgrade(previous,next){
 try{const a=JSON.parse(previous),b=JSON.parse(next);return Array.isArray(a)&&Array.isArray(b)&&a.length===3&&b.length===3&&a[0]===b[0]&&a[1]===b[1]&&/^\d{1,3}$/.test(a[2])&&/^\d{6}$/.test(b[2]);}catch{return false;}
}
// No student answers or credentials are copied into the farm save. Tickets only
// identify the planting batch present when a real island round begins.
export function createFarmLearningBridge({storage,tabStorage,href}){
 const url=new URL(href),classId=url.searchParams.get('class')||'main';
 const read=(key,fallback)=>{try{return JSON.parse(storage.getItem(key))??fallback;}catch{return fallback;}};
 const trip=()=>{try{return JSON.parse(tabStorage.getItem(TRIP));}catch{return null;}};
 const owner=(seat,demo)=>JSON.stringify([classId,demo?'demo':'live',String(seat)]);
 function begin(payload,{demo=false,verified=false,confirmLegacyUpgrade=()=>false}={}){
  if(!verified||!/^\d{1,6}$/.test(String(payload.seat))||!payload.roundId||!Object.hasOwn(CROP_LESSONS,payload.mode))return false;
  const recordKey=demo?SAVE_KEY:forestSaveKey(classId,String(payload.seat)),record=read(recordKey,null),raw=demo?record:record?.state;if(!raw)return false;
  const state=sanitizeState(raw),intent=trip(),identity=owner(payload.seat,demo),tickets=read(TICKETS,{});
  const key=identity+':'+payload.roundId;if(tickets[key])return true;
  const explicitTrip=intent?.classId===classId&&intent?.demo===demo&&intent?.mode===payload.mode;
  // Never treat a different modern account as the owner of this local farm.
  // Legacy transfers require a deliberate farm departure and an explicit local confirmation.
  if(explicitTrip&&isLegacyFarmUpgrade(state.life.learningOwner,identity)&&confirmLegacyUpgrade()===true)state.life.learningOwner=identity;
  const ticket=beginFarmRound(state,{...payload,owner:identity,allowClaim:intent?.classId===classId&&intent?.demo===demo});
  if(!ticket)return false;
  try{storage.setItem(recordKey,JSON.stringify(demo?state:{...record,state,dirty:true}));storage.setItem(TICKETS,JSON.stringify(Object.fromEntries([...Object.entries(tickets),[key,ticket]].slice(-200))));return true;}catch{return false;}
 }
 function complete(payload,{demo=false,confirmed=false}={}){
  if(!confirmed)return {grown:0,status:'pending'};
  const identity=owner(payload.seat,demo),ticket=read(TICKETS,{})[identity+':'+payload.roundId];
  if(!ticket)return {grown:0,status:'unlinked'};
  const recordKey=demo?SAVE_KEY:forestSaveKey(classId,String(payload.seat)),record=read(recordKey,null),raw=demo?record:record?.state;if(!raw)return {grown:0,status:'unlinked'};
  const state=sanitizeState(raw),score=farmRoundScore(payload);if(!score)return {grown:0,status:'incomplete'};
  const cropIds=[...new Set(state.life.plots.filter(p=>p&&!p.ready&&ticket.plantIds.includes(p.plantId)).map(p=>p.crop))];
  const grown=settleFarmRound(state,ticket,payload);
  if(grown)try{storage.setItem(recordKey,JSON.stringify(demo?state:{...record,state,dirty:true}));}catch{return {grown:0,status:'storage-error'};}
  return {grown,crops:grown?cropIds:[],status:score.correct*100>=score.total*CROP_ACCURACY?'qualified':'practice',...score};
 }
 function depart(mode,{demo=false}={}){
  if(!Object.hasOwn(CROP_LESSONS,mode))return null;
  const destination=new URL(CROP_LESSONS[mode].page,url),back=new URL('adventure-preview.html',url);
  // iPad standalone treats an unlabelled main-class link as an old home icon.
  // Keep class explicit in both directions, alongside the lesson and trip.
  for(const u of [destination,back])u.searchParams.set('class',classId);
  destination.searchParams.set('farmLesson',mode);if(demo)destination.searchParams.set('demo','1');
  back.searchParams.set('v','20261011-items7');back.searchParams.set('returnFarm','1');
  const character=url.searchParams.get('character');if(character)back.searchParams.set('character',character);
  if(demo)back.searchParams.set('demo','1');
  try{tabStorage.setItem(TRIP,JSON.stringify({classId,demo,mode,returnUrl:back.href}));return destination.href;}catch{return null;}
 }
 function returnUrl(){const t=trip();if(t?.classId!==classId)return null;try{const back=new URL(t.returnUrl);return back.origin===url.origin&&back.pathname===new URL('adventure-preview.html',url).pathname?back.href:null;}catch{return null;}}
 return {begin,complete,depart,returnUrl};
}
let instance;
function bridge(){try{return instance??=createFarmLearningBridge({storage:localStorage,tabStorage:sessionStorage,href:location.href});}catch{return null;}}
export function beginIslandFarmRound(payload,options){try{const linked=bridge()?.begin(payload,{...options,confirmLegacyUpgrade:()=>window.confirm('這是改用學號前，你原本的農場嗎？\n按「確定」沿用這座農場，原有作物與物品都會保留。\n如果這是其他同學的農場，請按「取消」。')});if(linked===false&&bridge()?.returnUrl()){const notice=document.getElementById('farm-learning-status');if(notice)notice.textContent='這回合尚未連結農場，原有作物仍保留。請回農場確認登入與澆水後，再進入關卡。';}return linked;}catch{return false;}}
export function completeIslandFarmRound(payload,options){
 let result;try{result=bridge()?.complete(payload,options);}catch{result={grown:0,status:'storage-error'};}if(!result)return result;
 const crops=(result.crops||[]).map(id=>CROPS[id].name).join('、');
 const message=result.grown?'🌱 你的'+crops+'長大了！回農場收成吧。':result.status==='practice'?'這次第一次答對 '+result.correct+'／'+result.total+' 題。達到 70% 就能收成，再練一次也可以。':result.status==='storage-error'?'農場進度暫時無法保存，請保持此頁開啟並重新儲存。':result.status==='pending'?'正在保存這回合，保存完成後再回農場。':result.status==='qualified'?'這回合已達標，可以回農場看看。':result.status==='unlinked'?'這回合沒有連結到農場，原有作物仍保留。請回農場重新進入對應關卡，再完成一回合。':'這回合還沒完成，完成後再回農場看看。';
 const notice=document.getElementById('farm-learning-status');if(notice)notice.textContent=message;
 const back=bridge()?.returnUrl(),resultRoot=document.querySelector('#result .result-card')||document.getElementById('result');
 if(back&&resultRoot){let panel=document.getElementById('farm-result-notice');if(!panel){panel=document.createElement('aside');panel.id='farm-result-notice';panel.style.cssText='margin:22px 0;padding:20px;border-radius:20px;background:#edf3df;color:#36593e;text-align:center';resultRoot.append(panel);}panel.replaceChildren();const line=document.createElement('p');line.setAttribute('role','status');line.textContent=message;panel.append(line);
  if(!['storage-error','pending'].includes(result.status)){const link=document.createElement('a');link.id='farm-result-return';link.href=back;link.textContent=result.grown?'回農場收成 →':'回農場 →';link.style.cssText='display:inline-block;margin-top:12px;padding:13px 22px;border-radius:15px;background:#365c48;color:#fffbed;font-weight:bold;text-decoration:none';panel.append(link);}
 }
 return result;
}
// Reuse the existing, verified tab session and original lesson card.
export function resumeFarmLesson(auth){
 const mode=new URL(location.href).searchParams.get('farmLesson'),card=document.querySelector('[data-mode="'+mode+'"]');
 if(!bridge()?.returnUrl()||!['single','spelling'].includes(mode)||!card)return;
 const notice=document.getElementById('farm-learning-status');if(notice)notice.textContent='🌱 已登入 '+auth.currentSeat()+' 號，直接開始'+CROP_LESSONS[mode].name+'。';
 const start=document.getElementById('farm-start-lesson');if(start){start.disabled=card.disabled;document.getElementById('farm-start-status').textContent=card.disabled?(card.querySelector('.world-status')?.textContent||'等待老師開放這個關卡'):'';}
}
export async function departForIslandLesson(mode,{demo=false}={}){try{if(globalThis.ForestStudent&&!await globalThis.ForestStudent.flush())return false;const next=bridge()?.depart(mode,{demo});if(next)location.assign(next);return !!next;}catch{return false;}}
export function mountFarmReturn(){const back=bridge()?.returnUrl();if(!back||document.getElementById('farm-learning-return'))return;
 const panel=document.createElement('aside');panel.id='farm-learning-return';panel.style.cssText='margin:12px auto;padding:12px 18px;max-width:980px;border-radius:16px;background:#edf3df;color:#36593e;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap';
 const wanted=new URL(location.href).searchParams.get('farmLesson'),lesson=CROP_LESSONS[wanted];
 const text=document.createElement('span');text.id='farm-learning-status';text.textContent=lesson?`🌱 玩「${lesson.name}」，第一次答對至少 ${Math.ceil(lesson.questions*.7)}／${lesson.questions} 題，作物就會長大。`:'🌱 玩平常的關卡，第一次作答正確率達 70%，再回農場收成。';
 const a=document.createElement('a');a.href=back;a.textContent='回森林農場 →';a.style.cssText='color:#36593e;font-weight:bold;padding:10px;white-space:nowrap';panel.append(text,a);document.querySelector('header')?.after(panel);
 if(['single','spelling'].includes(wanted)){
  const card=document.querySelector(`[data-mode="${wanted}"]`);if(!card)return;
  const gate=document.createElement('dialog');gate.id='farm-lesson-start';gate.setAttribute('aria-label',lesson.name);gate.style.cssText='width:min(520px,90vw);box-sizing:border-box;border:3px solid #bbcb9e;border-radius:28px;background:#fffbed;color:#36593e;text-align:center;padding:32px';
  const title=document.createElement('h1');title.textContent=(wanted==='single'?'👂 ':'🧩 ')+lesson.name;
  const status=document.createElement('p');status.id='farm-start-status';status.setAttribute('role','status');status.textContent='正在準備關卡…';
  const start=document.createElement('button');start.id='farm-start-lesson';start.type='button';start.className='primary';start.textContent='▶ 開始';start.disabled=true;start.style.cssText='font-size:28px;padding:18px 48px;margin:18px';
  start.onclick=async()=>{if(card.disabled)return;start.disabled=true;status.textContent='正在準備…';document.getElementById('solo')?.click();try{await card.onclick();if(!document.getElementById('game').hidden){gate.close();return;}status.textContent=document.getElementById('home-message')?.textContent||'請確認登入後再開始。';}catch{status.textContent='連線暫時不穩，請再按開始。';}finally{start.disabled=card.disabled;}};
  const backLink=a.cloneNode(true);backLink.style.display='block';gate.append(title,start,status,backLink);document.body.append(gate);gate.showModal();
  const observer=new MutationObserver(()=>{const error=document.getElementById('home-message')?.textContent;if(error&&start.disabled){status.textContent=error;}});observer.observe(document.getElementById('home-message'),{childList:true,subtree:true,characterData:true});
 }
}
