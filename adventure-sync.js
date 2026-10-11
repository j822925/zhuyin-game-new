export const forestSaveKey=(classId,seat)=>'zhuyin.forest.student.v1:'+classId+':'+seat;
export const FOREST_SYNC_INTERVAL=60000;
const copy=s=>JSON.parse(JSON.stringify(s));
// One immutable operation is kept until the server acknowledges it. No tokens in storage.
export async function openForestSync({send,storage,key,fresh,onStatus=()=>{},onBalance=()=>{}}){
 let journal=null;try{journal=JSON.parse(storage.getItem(key)||'null');}catch{}
 let remote;
 if(journal?.operation){remote=await send({kind:'forest-save',...journal.operation});if(remote.error)throw Error(remote.error);journal=null;storage.removeItem(key);}
 remote??=await send({kind:'forest-load'});if(remote.error)throw Error(remote.error);
 if(!remote.enabled)throw Error('forest_closed');
 let current=remote.state||fresh(),revision=remote.revision,baseStars=remote.stars,pending=null,timer=null,running=null;
 current={...current,stars:baseStars};
 if(journal?.dirty){if(journal.revision!==revision)throw Error('forest_conflict');current=journal.state;current.stars=baseStars+(journal.state.stars-journal.baseStars);if(current.stars<0)throw Error('insufficient_stars');}
 else journal=null;
 const persist=()=>storage.setItem(key,JSON.stringify({revision,baseStars,state:current,dirty:true,...(pending?{operation:pending}:{})}));
 // Start once at the first change, not after the last click: continuous play still saves.
 const schedule=()=>{if(!timer)timer=setTimeout(()=>void flush(),FOREST_SYNC_INTERVAL);};
 async function flush(){
  clearTimeout(timer);timer=null;if(running)return running;
  if(!journal&&!pending)return true;
  running=(async()=>{onStatus('saving');
   try{
    pending??={operationId:crypto.randomUUID(),revision,delta:current.stars-baseStars,state:copy(current)};
    persist();const snapshotStars=pending.state.stars,result=await send({kind:'forest-save',...pending});if(result.error)throw Error(result.error);
    const extra=current.stars-snapshotStars;revision=result.revision;baseStars=result.stars;current.stars=baseStars+extra;pending=null;journal=null;
    storage.setItem(key,JSON.stringify({revision,baseStars,state:current,dirty:false}));onBalance(current.stars);onStatus('saved');return true;
   }catch(e){onStatus('error',e.message);return false;}finally{running=null;}
  })();return running;
 }
 if(journal?.dirty)schedule();
 return {state:copy(current),cards:remote.cards||['rabbit'],key,flush,
  save(next){if(pending||running){onStatus('error','pending_save');return false;}
   if(JSON.stringify(next)===JSON.stringify(current))return true;
   const before=current,oldJournal=journal;current=copy(next);journal=true;
   try{persist();}catch{current=before;journal=oldJournal;onStatus('error','storage_unavailable');return false;}
   // Currency commits immediately; other changes share one minute's local batch.
   if(next.stars!==baseStars)void flush();else schedule();
   return true;
  },get busy(){return !!pending||!!running;}
 };
}
