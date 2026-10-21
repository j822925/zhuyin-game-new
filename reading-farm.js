import {beginFarmRound,settleFarmRound,farmRoundScore,CROP_ACCURACY} from './adventure-life-model.js';

// Safari and the installed iPad app do not share a reliable local save or tab.
// Use the existing authenticated forest API, never an account/token in a URL.
export function createReadingFarm({href,storage,request,uuid=()=>crypto.randomUUID()}){
 const url=new URL(href),classId=url.searchParams.get('class')||'main';
 const active=url.searchParams.get('farmLesson')==='reading'&&url.searchParams.get('demo')!=='1';
 const back=new URL('adventure-preview.html',url);back.searchParams.set('class',classId);back.searchParams.set('returnFarm','1');
 const key=p=>'zhuyin.reading-farm.v1:'+JSON.stringify([classId,String(p.seat),p.roundId]);
 const owner=p=>JSON.stringify([classId,'live',String(p.seat)]);
 const valid=p=>p?.mode==='reading'&&/^\d{1,6}$/.test(String(p.seat))&&typeof p.roundId==='string'&&/^[-a-zA-Z0-9]{8,80}$/.test(p.roundId);
 function read(p){try{return JSON.parse(storage.getItem(key(p))||'null');}catch{return null;}}
 function write(p,value){try{storage.setItem(key(p),JSON.stringify(value));}catch{throw Error('farm_storage');}}
 async function send(p,data){const r=await request({...data,seat:p.seat});if(!r||r.error)throw Error(r?.error||'farm_response');return r;}
 async function load(p){const r=await send(p,{kind:'forest-load'});if(!Number.isSafeInteger(r.revision)||!Number.isSafeInteger(r.stars))throw Error('farm_response');return r;}
 function eligibleState(state){return state?.life?.farmUnlocked&&Array.isArray(state.life.plots);}
 function saveResult(p,j,result){j.result=result;delete j.operation;write(p,j);return result;}
 return {active,returnUrl:back.href,
  async begin(p){
   if(!active)return false;if(!valid(p))throw Error('farm_identity');
   const prior=read(p);if(prior?.ticket?.owner===owner(p))return true;
   const remote=await load(p);if(!remote.enabled)throw Error('forest_closed');
   if(!eligibleState(remote.state))throw Error('farm_not_ready');
   const ticket=beginFarmRound(remote.state,{...p,owner:owner(p),allowClaim:true});
   if(!ticket)throw Error('farm_not_ready');
   write(p,{ticket});return true;
  },
  has(p){return valid(p)&&read(p)?.ticket?.owner===owner(p);},
  async complete(p,{confirmed=false}={}){
   if(!confirmed)return {status:'pending',grown:0};
   if(!valid(p))throw Error('farm_identity');
   const j=read(p);if(!j?.ticket||j.ticket.owner!==owner(p))throw Error('farm_unlinked');
   if(j.result)return j.result;
   const score=farmRoundScore(p);if(!score)throw Error('farm_incomplete');
   if(score.correct*100<score.total*CROP_ACCURACY)return saveResult(p,j,{status:'practice',grown:0,...score});
   for(let attempt=0;attempt<3;attempt++){
    // A response may have been lost after the server saved. Replay the exact
    // immutable operation ID first; never overwrite with an older snapshot.
    if(j.operation){
     try{const out=await send(p,{kind:'forest-save',...j.operation});
      if(out.saved!==true&&out.duplicate!==true)throw Error('farm_unconfirmed');
      return saveResult(p,j,{status:'qualified',grown:j.grown,...score});
     }catch(e){if(e.message!=='forest_conflict')throw e;delete j.operation;write(p,j);}
    }
    const remote=await load(p),state=remote.state;
    if(!eligibleState(state))return saveResult(p,j,{status:'changed',grown:0,...score});
    if(state.life.learningOwner&&state.life.learningOwner!==owner(p))throw Error('farm_owner');
    state.life.learningOwner=owner(p);
    const grown=settleFarmRound(state,j.ticket,p);
    if(!grown)return saveResult(p,j,{status:'changed',grown:0,...score});
    // Merge only the matching planting IDs into the latest full state. The
    // round endpoint already issued stars; this save must never issue them again.
    j.grown=grown;j.operation={operationId:uuid(),revision:remote.revision,delta:0,state};write(p,j);
   }
   throw Error('forest_conflict');
  }
 };
}

export function renderReadingFarm(result,back,root=document.getElementById('result')){
 if(!root)return;
 let panel=document.getElementById('reading-farm-result');
 if(!panel){panel=document.createElement('aside');panel.id='reading-farm-result';panel.className='panel';root.insertBefore(panel,root.querySelector('#return-guide'));}
 panel.replaceChildren();const text=document.createElement('p');text.setAttribute('role','status');
 text.textContent=result.grown?'🥬 萵苣長大了！':result.status==='practice'?'🌱 再練一次，答對 4 題就能長大。':'🌱 回農場查看作物';
 const a=document.createElement('a');a.className='primary';a.href=back;a.textContent=result.grown?'🥬 回農場收成':'🌱 回農場';panel.append(text,a);
}
