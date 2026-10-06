// Retry the same command ID, never create a second answer or advance a second question.
export function reliableCommands({getState,getSocket,onChange,onError,storage,key,now=Date.now}){
 const pending=new Map();let timer=null;
 const persist=()=>{try{const answers=[...pending.values()].filter(p=>p.d.kind==='answer').map(p=>({d:p.d,code:p.code}));storage?.setItem(key,JSON.stringify(answers));}catch{}};
 const valid=(p,s)=>s&&p.code===s.code&&p.d.index===s.index&&(p.d.kind==='answer'?['question','paused'].includes(s.phase):p.d.kind==='ready'?s.phase==='lobby':p.d.kind==='heard'?s.phase==='listening':p.d.phase===s.phase&&p.d.controlVersion===(s.controlVersion||0));
 function transmit(p){const w=getSocket(),s=getState();if(w?.readyState!==1||!valid(p,s))return;if(p.d.kind==='answer'&&(s.phase!=='question'||s.serverNow> s.deadline))return;try{w.send(JSON.stringify(p.d));p.sent=now();}catch{}}
 function sync(){const w=getSocket();if(w?.readyState===1)try{w.send(JSON.stringify({kind:'sync'}));}catch{}}
 function tick(){const s=getState();for(const [id,p]of pending){if(!valid(p,s)){pending.delete(id);persist();onChange();continue;}if(now()-p.sent>=2500){if(p.acked){p.sent=now();sync();}else transmit(p);}}}
 function submit(kind,more={}){const s=getState();if(!s)throw Error('network');const existing=[...pending.values()].find(p=>p.code===s.code&&p.d.index===s.index&&p.d.kind===kind);if(existing)return existing.d.id;
 const d={kind,id:crypto.randomUUID(),version:s.version,controlVersion:s.controlVersion||0,phase:s.phase,index:s.index,...more},p={d,code:s.code,sent:0,acked:false};pending.set(d.id,p);persist();transmit(p);onChange();return d.id;}
 function state(s){for(const [id,p]of pending){const me=s.players?.find(p=>p.seat===s.seat);const done=p.d.kind==='answer'?s.mine?.answer!==null&&s.mine?.answer!==undefined:p.d.kind==='ready'?me?.ready:p.d.kind==='heard'?me?.heard:false;if(!valid(p,s)||done)pending.delete(id);}persist();tick();}
 function receive(d){const p=pending.get(d.id);if(!p)return;if(d.type==='ack'){p.acked=true;p.sent=now();sync();}else if(d.type==='error'){pending.delete(d.id);persist();onError(Error(d.error));onChange();}}
 function restore(code){try{for(const p of JSON.parse(storage?.getItem(key)||'[]'))if(p.code===code&&p.d?.kind==='answer'&&typeof p.d.value==='string'&&typeof p.d.id==='string')pending.set(p.d.id,{...p,sent:0,acked:false});}catch{}}
 return {submit,state,receive,restore,sync,answer:()=>[...pending.values()].find(p=>p.d.kind==='answer')?.d,control:()=>[...pending.values()].find(p=>!['answer','ready','heard'].includes(p.d.kind))?.d,hostPending:()=>[...pending.values()].some(p=>!['answer','ready','heard'].includes(p.d.kind)),start(){if(!timer)timer=setInterval(tick,1000);},stop(){clearInterval(timer);timer=null;}};
}
// Download once per device and reuse the exact bytes for playback (including Safari).
export function audioStore({fetcher=fetch,timeout=12000}={}){
 const files=new Map(),urls=new Set();let disposed=false;
 async function load(url){if(files.has(url))return files.get(url);const task=(async()=>{for(let attempt=0;attempt<3;attempt++){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const r=await fetcher(url,{cache:'force-cache',signal:controller.signal});if(!r.ok)throw Error('audio');const blob=await r.blob();if(!blob.size)throw Error('audio');if(disposed)throw Error('disposed');const local=URL.createObjectURL(blob);urls.add(local);return local;}catch(e){if(disposed||attempt===2)throw e;await new Promise(r=>setTimeout(r,300+attempt*500));}finally{clearTimeout(timer);}}})();files.set(url,task);try{return await task;}catch(e){files.delete(url);throw e;}}
 return {load,dispose(){disposed=true;for(const u of urls)URL.revokeObjectURL(u);urls.clear();files.clear();}};
}
