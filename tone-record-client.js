// One request after a completed round. Keep unsent answers in this student's tab;
// retries use the same round ID so an uncertain response never creates two rounds.
export function createToneRecorder({demo,storage,key,send,status}){
 const memory=new Map();let pending=null;
 function read(){if(memory.has(key()))return memory.get(key());try{const list=JSON.parse(storage.getItem(key())||'[]');return Array.isArray(list)?list:[];}catch{return [];}}
 function write(list){memory.set(key(),list);try{if(list.length)storage.setItem(key(),JSON.stringify(list));else storage.removeItem(key());}catch{}}
 async function flush(){if(demo){status('教師試玩，不記正式成績。',false);return;}if(pending)return pending;if(!read().length)return;
  pending=(async()=>{let list=read();if(!list.length)return;status('正在保存練習紀錄…',false);try{while(list.length){const out=await send(list[0]);if(out.error||!out.saved)throw Error(out.error||'network');const id=list[0].roundId;list=read().filter(p=>p.roundId!==id);write(list);status(out.taskCounted?'已保存，計入聲調任務 1 回合。':'已保存已答題目的紀錄；有跳過題目，不計完整回合。',false);}}catch(e){status(e.message==='authentication_required'?'登入已到期，請回首頁登入後再回來保存。':'尚未確認保存，請保留此分頁並按「再試保存」。',true);}finally{pending=null;}})();return pending;
 }
 return {flush,enqueue(payload){if(demo){status('教師試玩，不記正式成績。',false);return;}if(payload.results.every(r=>r.skipped)){status('本回合全部跳過，沒有新增紀錄。',false);return;}const list=read();if(!list.some(p=>p.roundId===payload.roundId))list.push(payload);write(list);void flush();}};
}

