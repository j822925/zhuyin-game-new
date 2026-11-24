import {createRoundStore} from './hanzi-client.js?v=20261119-stars';
// Each exam keeps its own draft. Legacy data is removed only after a durable copy succeeds.
export function createExamRoundStore({storage,key,getOwner}){
 const legacy=createRoundStore({storage,key,getOwner}),buckets=new Map(),indexes=new Map();
 const bucket=id=>{const k=key+':exam:'+encodeURIComponent(getOwner())+':'+encodeURIComponent(id);if(!buckets.has(k))buckets.set(k,createRoundStore({storage,key:k,getOwner}));return buckets.get(k);};
 const indexKey=()=>key+':exams:'+encodeURIComponent(getOwner());
 function ids(){const k=indexKey();if(indexes.has(k))return indexes.get(k);let list=[];try{const value=JSON.parse(storage?.getItem(k)||'[]');if(Array.isArray(value))list=value.filter(x=>typeof x==='string');}catch{}indexes.set(k,list);return list;}
 function remember(id){const list=ids().filter(x=>x!==id);list.push(id);indexes.set(indexKey(),list);try{if(!storage)return false;storage.setItem(indexKey(),JSON.stringify(list));return true;}catch{return false;}}
 function migrate(){const old=legacy.read(),id=old?.activeTask?.kind==='exam'?old.activeTask.id:null;if(!id)return;const existing=bucket(id).read();const saved=bucket(id).save(existing||old);const indexed=remember(id);if(saved&&indexed)legacy.clear();}
 function list(){migrate();const values=ids().map(id=>bucket(id).read()).filter(Boolean),old=legacy.read();if(old&&!values.some(x=>x.round.roundId===old.round.roundId))values.unshift(old);return values;}
 return {list,read(task){migrate();if(arguments.length){if(task?.kind==='exam')return bucket(task.id).read()||(legacy.read()?.activeTask?.id===task.id?legacy.read():null);const old=legacy.read();return old?.activeTask?.kind==='exam'?null:old;}return list().at(-1)||null;},
 save(value){migrate();if(value.activeTask?.kind==='exam'){const saved=bucket(value.activeTask.id).save(value),indexed=remember(value.activeTask.id);return saved&&indexed;}return legacy.save(value);},
 clear(roundId){migrate();const old=legacy.read();if(old?.round.roundId===roundId)legacy.clear();for(const id of ids())if(bucket(id).read()?.round.roundId===roundId)bucket(id).clear();}
 };
}
