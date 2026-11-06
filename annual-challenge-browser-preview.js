// Fictional browser-only preview, never a production authentication implementation.
import {createAnnualChallengeService} from './annual-challenge-service.js?v=20261106-v2';
import {STATIONS,active} from './annual-challenge-core.js?v=20261106-v2';
export function createBrowserPreview({bank,assets={},storage=globalThis.localStorage,tabStorage=globalThis.sessionStorage,uuid=()=>crypto.randomUUID(),now=Date.now,year=new Date().getFullYear(),channel=null,lock=null}={}){
 const prefix='annual-review-local-v1:',listeners=new Set(),fallback=new Map(),sessions=new Map();let persistent=true,queue=Promise.resolve();
 const error=(message,status=400)=>{throw Object.assign(Error(message),{status});};
 function read(key){if(!persistent&&fallback.has(key))return JSON.parse(fallback.get(key));try{return JSON.parse(storage?.getItem(prefix+key)||fallback.get(key)||'null');}catch{persistent=false;return JSON.parse(fallback.get(key)||'null');}}
 function write(key,value){const text=JSON.stringify(value);fallback.set(key,text);try{if(!storage)throw Error();storage.setItem(prefix+key,text);}catch{persistent=false;}}
 function notify(){queueMicrotask(()=>{for(const fn of listeners)fn();});channel?.postMessage('changed');}
 const store={transaction(key,fn){const run=async()=>{const result=fn(structuredClone(read(key)));if(result.value!==undefined){write(key,result.value);notify();}return structuredClone(result.out);};const action=queue.then(()=>lock?lock(run):run());queue=action.catch(()=>{});return action;}};
 const service=createAnnualChallengeService({store,bank,now,studentExists:({seat})=>['990001','990002','990003'].includes(seat)});
 const admin={role:'organizer',classId:'main',id:'browser-preview-organizer'};
 const ready=(async()=>{const event=await service.config(admin,year);if(event.revision===0)await service.configure(admin,year,{revision:0,enabled:true,mode:'rehearsal'});})();
 try{for(const [token,who]of JSON.parse(tabStorage?.getItem(prefix+'sessions')||'[]'))if(!who.handoff)sessions.set(token,who);}catch{}
 function saveSessions(){try{tabStorage?.setItem(prefix+'sessions',JSON.stringify([...sessions].filter(([,who])=>!who.handoff)));}catch{}}
 channel?.addEventListener('message',()=>{for(const fn of listeners)fn();});
 const preview={
  assets,
  get persistent(){return persistent;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async request(path,token,input){
   await ready;const url=new URL(path,'https://preview.invalid/'),op=url.pathname.slice(1);
   if(op==='login'){
    if(!['main','grade2'].includes(input.classId)||!['student','teacher','organizer'].includes(input.role))error('示範登入有誤');
    if(input.role==='student'&&!['990001','990002','990003'].includes(input.seat))error('只能使用虛構示範帳號');
    if(input.role==='teacher'&&!STATIONS.some(s=>s.id===input.station))error('請選關卡');
    const key=uuid(),who={role:input.role,classId:input.classId,seat:input.seat,station:input.station,stations:[input.station],id:'browser-preview-'+input.role};sessions.set(key,who);saveSessions();return {...who,token:key};
   }
   const who=sessions.get(token);if(!who||who.expiresAt&&who.expiresAt<=now())error('請重新登入或請關主重新解鎖',401);
   if(op==='config-read'){if(who.role==='student')error('請由老師查看活動設定',403);return service.config(who,Number(input?.year??url.searchParams.get('year')));}
   if(op==='availability')return service.availability(who,Number(input?.year??url.searchParams.get('year')));
   if(op==='roster'){if(who.role==='student')error('請由老師選擇學生',403);return {seats:['990001','990002','990003']};}
   if(op==='card')return service.card(who,Number(url.searchParams.get('year')),url.searchParams.get('seat'),url.searchParams.get('mode')||undefined,url.searchParams.has('round')?Number(url.searchParams.get('round')):undefined);
   if(op==='unlock'){
    if(who.role!=='student'||!STATIONS.some(s=>s.id===input.station))error('請從孩子目前的闖關卡進入',403);
    const {event}=await service.card(who,input.year,who.seat,input.mode);if(!active(event,now()))error('活動模式已改變，請更新進度',403);
    if(input.mode==='rehearsal'&&(input.rehearsalRound??1)!==event.rehearsalRound)error('預演已重置，請更新進度',403);
    const key=uuid(),grant={role:'teacher',classId:who.classId,seatScope:who.seat,station:input.station,stations:[input.station],yearScope:input.year,modeScope:input.mode,rehearsalRoundScope:input.mode==='rehearsal'?event.rehearsalRound:undefined,expiresAt:now()+600000,id:'browser-preview-handoff',handoff:true};sessions.set(key,{...grant,parentToken:token});return {...grant,token:key};
   }
   if(op==='lock'||op==='logout'){sessions.delete(token);for(const [key,value]of sessions)if(value.parentToken===token)sessions.delete(key);saveSessions();return {ok:true};}
   if(op==='configure')return service.configure(who,input.year,input);
   if(op==='reset-rehearsal')return service.resetRehearsal(who,input.year,input);
   if(op==='command')return service.command(who,input.year,input.seat,input.station,input);
   error('找不到試玩操作',404);
  }
 };
 return preview;
}
