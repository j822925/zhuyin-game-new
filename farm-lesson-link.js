import {beginIslandFarmRound,completeIslandFarmRound,mountFarmReturn,getIslandFarmContext} from './farm-learning.bundle.js?v=20261122-farm6';
import {farmLessonStart,farmLessonCompletion,requestedFarmLesson} from './farm-lesson-results.js?v=20261122-farm6';

export {requestedFarmLesson};
export function createFarmLessonLink({family,demo,getSession,excluded=()=>false}){
 let receipt=null,restoring=false;
 const pendingKey='zhuyin.farm-pending-receipts.v1';
 let storage;try{storage=sessionStorage;}catch{}
 const pending=()=>{try{const rows=JSON.parse(storage?.getItem(pendingKey)||'[]');return Array.isArray(rows)?rows:[];}catch{return [];}};
 const scope=()=>getIslandFarmContext()?.returnUrl;
 function remember(payload,keep){const back=scope();if(!back)return;try{const rows=pending().filter(r=>!(r.back===back&&r.demo===demo&&r.payload?.seat===payload.seat&&r.payload?.roundId===payload.roundId));if(keep)rows.push({back,demo,payload});storage?.setItem(pendingKey,JSON.stringify(rows.slice(-20)));}catch{}}
 const verified=()=>{if(demo){const context=getIslandFarmContext();return context?.demo?{seat:context.seat,expires:Infinity}:null;}const s=getSession();return s&&s.expires>Date.now()?s:null;};
 const farmInput=(run,session)=>({family,run:demo?{...run,seat:session.seat}:run,seat:session.seat,excluded:excluded()});
 function settle(){
  if(!receipt)return;
  const s=verified();if(!s||String(s.seat)!==receipt.seat)return;
  const result=completeIslandFarmRound(receipt,{demo,confirmed:true});
  remember(receipt,result?.status==='storage-error');
  document.getElementById('farm-result-retry')?.remove?.();
  if(result?.status==='storage-error'){
   const resultPanel=document.getElementById('farm-result-notice');
   const panel=resultPanel?.closest?.('[hidden]')?document.getElementById('farm-learning-return'):resultPanel;if(!panel)return;
   const retry=document.createElement('button');retry.id='farm-result-retry';retry.type='button';retry.textContent='重新儲存農場';retry.className='primary';
   retry.onclick=()=>{retry.disabled=true;settle();};panel.append(retry);
  }
 }
 function restore(){
  const context=getIslandFarmContext(),s=verified();if(restoring||!context||!s||excluded())return;
  restoring=true;try{for(const row of pending()){
   const p=row.payload;if(row.back!==context.returnUrl||row.demo!==demo||p?.seat!==String(s.seat)||p.mode!==context.mode||p.kind!=='solo'||p.completed!==true||p.total!==p.expectedTotal||!Array.isArray(p.results)||p.results.length!==p.total||p.results.some(r=>typeof r?.firstCorrect!=='boolean'))continue;
   receipt=p;settle();
  }}finally{restoring=false;}
 }
 return {
  mount(){if(getIslandFarmContext())mountFarmReturn();restore();},
  show(screen){const panel=document.getElementById('farm-learning-return');if(panel)panel.hidden=screen==='play';if(screen!=='play')restore();},
  start(run){
   receipt=null;document.getElementById('farm-result-notice')?.remove();
   const session=verified();if(!session)return false;
   const payload=farmLessonStart(farmInput(run,session));
   return payload?beginIslandFarmRound(payload,{demo,verified:true}):false;
  },
  complete(run){
   const session=verified();if(!session)return;
   receipt=farmLessonCompletion(farmInput(run,session));
   settle();
  }
 };
}
