import {rebaseChapter,sameForestOutsideChapter} from './adventure-chapter-sync.js';
export const forestSaveKey=(classId,seat)=>'zhuyin.forest.student.v1:'+classId+':'+seat;
export const FOREST_SYNC_INTERVAL=60000;
const copy=s=>JSON.parse(JSON.stringify(s));
// One immutable operation is kept until the server acknowledges it. No tokens in storage.
export async function openForestSync({send,storage,key,fresh,onStatus=()=>{},onBalance=()=>{},onRebased=()=>{}}){
 let journal=null;try{journal=JSON.parse(storage.getItem(key)||'null');}catch{}
 let remote;
 async function recoverChapter(record,latest){
  if(!record?.chapterOnly||record.operation?.delta||!latest?.enabled||!latest.state)return null;
  const merged=rebaseChapter(record.chapterBase,record.state.chapter,latest.state.chapter);if(!merged)return null;
  const state={...latest.state,stars:latest.stars,chapter:merged};
  const operation={operationId:crypto.randomUUID(),revision:latest.revision,delta:0,state};
  storage.setItem(key,JSON.stringify({state,operation,revision:latest.revision,baseStars:latest.stars,dirty:true,chapterOnly:true,chapterBase:latest.state.chapter||null}));
  return send({kind:'forest-save',...operation});
 }
 if(journal?.operation){remote=await send({kind:'forest-save',...journal.operation});if(remote.error==='forest_conflict'&&journal.chapterOnly)remote=await recoverChapter(journal,await send({kind:'forest-load'}))||remote;if(remote.error)throw Error(remote.error);journal=null;storage.removeItem(key);}
 remote??=await send({kind:'forest-load'});if(remote.error)throw Error(remote.error);
 if(!remote.enabled)throw Error('forest_closed');
 let current=remote.state||fresh(),revision=remote.revision,baseStars=remote.stars,pending=null,timer=null,running=null;
 const trialGrant=remote.state?.chapterAccess;
 current={...current,stars:baseStars};delete current.chapterAccess;
 let chapterBase=journal?.chapterBase??current.chapter??null,chapterOnly=journal?.chapterOnly===true;
 if(journal?.dirty&&journal.revision!==revision){const recovered=await recoverChapter(journal,remote);if(!recovered||recovered.error)throw Error(recovered?.error||'forest_conflict');current={...recovered.state,stars:recovered.stars};baseStars=recovered.stars;revision=recovered.revision;journal=null;storage.removeItem(key);}
 if(journal?.dirty){current=journal.state;current.stars=baseStars+(journal.state.stars-journal.baseStars);if(current.stars<0)throw Error('insufficient_stars');}
 else journal=null;
 const persist=()=>storage.setItem(key,JSON.stringify({revision,baseStars,state:current,dirty:true,...(chapterOnly?{chapterOnly,chapterBase}:{}),...(pending?{operation:pending}:{})}));
 // Start once at the first change, not after the last click: continuous play still saves.
 const schedule=()=>{if(!timer)timer=setTimeout(()=>void flush(),FOREST_SYNC_INTERVAL);};
 async function flush(){
  clearTimeout(timer);timer=null;if(running)return running;
  if(!journal&&!pending)return true;
  running=(async()=>{onStatus('saving');
   try{
    pending??={operationId:crypto.randomUUID(),revision,delta:current.stars-baseStars,state:copy(current)};
    persist();const snapshotStars=pending.state.stars;let result=await send({kind:'forest-save',...pending});let rebased=false;
    if(result.error==='forest_conflict'&&chapterOnly){const latest=await send({kind:'forest-load'}),recovered=await recoverChapter({state:current,chapterBase,chapterOnly,operation:pending},latest);if(recovered&&!recovered.error){result=recovered;current={...result.state,stars:result.stars};rebased=true;}}
    if(result.error)throw Error(result.error);
    const extra=rebased?0:current.stars-snapshotStars;revision=result.revision;baseStars=result.stars;current.stars=baseStars+extra;pending=null;journal=null;
    storage.setItem(key,JSON.stringify({revision,baseStars,state:current,dirty:false}));onBalance(current.stars);onStatus('saved');if(rebased)onRebased();return true;
   }catch(e){onStatus('error',e.message);return false;}finally{running=null;}
  })();return running;
 }
 if(journal?.dirty)schedule();
 return {trialGrant,state:copy(current),cards:remote.cards||['rabbit'],key,flush,
  get revision(){return revision;},
  publish(){if(revision===0&&!journal&&!pending){journal=true;persist();}return flush();},
  adopt(result){if(pending||running||journal)throw Error('pending_save');current={...copy(result.state),stars:result.stars};revision=result.revision;baseStars=result.stars;storage.setItem(key,JSON.stringify({revision,baseStars,state:current,dirty:false}));this.state=copy(current);onBalance(current.stars);return copy(current);},
  save(next){if(pending||running){onStatus('error','pending_save');return false;}
   if(JSON.stringify(next)===JSON.stringify(current))return true;
   const before=current,oldJournal=journal,oldOnly=chapterOnly,oldBase=chapterBase;
   if(!journal){chapterBase=current.chapter||null;chapterOnly=!!next.chapter&&sameForestOutsideChapter(current,next);}else chapterOnly=chapterOnly&&sameForestOutsideChapter(current,next);
   current=copy(next);journal=true;
   try{persist();}catch{current=before;journal=oldJournal;chapterOnly=oldOnly;chapterBase=oldBase;onStatus('error','storage_unavailable');return false;}
   // Currency commits immediately; other changes share one minute's local batch.
   if(next.stars!==baseStars)void flush();else schedule();
   return true;
  },get busy(){return !!pending||!!running;}
 };
}
