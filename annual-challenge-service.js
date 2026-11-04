// Integration boundary: identities must come from existing verified student/admin auth.
// A durable adapter must implement atomic transaction(key, callback), not get-then-put.
import {STATIONS,active,defaultEvent,optionsFor,gradeAnswer,validateAward,shuffle,LISTEN_POLICY,LISTEN_OUTCOMES,makeListeningRounds,listeningSummary} from './annual-challenge-core.js';
const copy=v=>structuredClone(v);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function createMemoryStore(){const data=new Map();return {async transaction(key,fn){const draft=copy(data.get(key)||null);const result=fn(draft);if(result?.value!==undefined)data.set(key,copy(result.value));return copy(result?.out);}};}
export function createAnnualChallengeService({store,bank,studentExists=()=>false,now=Date.now,rng=Math.random}){
 function identity(who){if(!who||!['student','teacher','organizer'].includes(who.role)||typeof who.classId!=='string'||!/^[-a-zA-Z0-9_]{1,40}$/.test(who.classId)||who.role==='student'&&(typeof who.seat!=='string'||!/^\d{6}$/.test(who.seat)))fail('請先登入',401);if(who.expiresAt!==undefined&&(!Number.isFinite(who.expiresAt)||who.expiresAt<=now()))fail('關主授權已到期，請重新驗證',401);}
 const prefix=(who,year)=>{identity(who);if(!Number.isInteger(year)||year<2020||year>2100)fail('活動年度有誤');if(who.yearScope!==undefined&&who.yearScope!==year)fail('關主授權僅限本次年度',403);return who.classId+':'+year;};
 const canStation=(who,id)=>who.role==='organizer'||who.role==='teacher'&&Array.isArray(who.stations)&&who.stations.includes(id);
 function seatFor(who,seat){identity(who);if(who.role==='student'){if(seat&&seat!==who.seat)fail('只能查看自己的闖關卡',403);return who.seat;}if(typeof seat!=='string'||!/^\d{6}$/.test(seat))fail('請選擇學生');if(who.seatScope&&who.seatScope!==seat)fail('關主授權僅限眼前這位孩子',403);return seat;}
 function modeFor(who,mode){if(!['rehearsal','official'].includes(mode))fail('活動模式有誤');if(who.modeScope&&who.modeScope!==mode)fail('活動模式已切換，請關主重新驗證',403);return mode;}
 function roundFor(who,event,mode,requestedRound){if(mode!=='rehearsal')return null;const round=requestedRound??event.rehearsalRound;if(!Number.isSafeInteger(round)||round<1||round>event.rehearsalRound)fail('預演輪次有誤');if(who.rehearsalRoundScope!==undefined&&who.rehearsalRoundScope!==round)fail('預演已重新開始，請關主重新驗證',403);return round;}
 const cardKey=(who,year,mode,round,seat)=>prefix(who,year)+':'+mode+(mode==='rehearsal'&&round>1?':r'+round:'')+':'+seat;
 async function config(who,year){return store.transaction(prefix(who,year)+':event',value=>({out:{...defaultEvent(who.classId,year),...value}}));}
 async function card(who,year,seat,requestedMode,requestedRound){const s=seatFor(who,seat);const event=await config(who,year);const mode=modeFor(who,requestedMode||event.mode),rehearsalRound=roundFor(who,event,mode,requestedRound);return store.transaction(cardKey(who,year,mode,rehearsalRound,s),value=>{
  const attempts=value||{};const visible=copy(attempts);
  if(who.role==='student')for(const a of Object.values(visible)){delete a.receipts;delete a.previousListen;a.rounds=a.rounds.map(r=>({selected:r.selected===null?null:0,options:r.selected===null||a.station==='listen'?[]:[{text:r.options[r.selected].text,audioUrl:a.station==='tone'?r.options[r.selected].audioUrl:undefined,zhuyin:a.station==='action'?r.options[r.selected].zhuyin:undefined}],result:r.result?{answered:true}:null}));}
  if(who.role==='teacher')for(const [id,a]of Object.entries(visible))if(!canStation(who,id))visible[id]={station:id,award:a.award?{score:a.award.score,stamp:a.award.stamp}:null};
  return {out:{event,mode,rehearsalRound,seat:s,attempts:visible}};
 });}
 return {
  config,card,
  async configure(who,year,patch){if(who?.role!=='organizer')fail('只有活動管理老師能設定',403);const key=prefix(who,year)+':event';return store.transaction(key,value=>{
   const event={...defaultEvent(who.classId,year),...value};if(patch.revision!==event.revision)fail('設定已更新，請重新讀取',409);
   const next={...event};for(const name of ['enabled','mode','startsAt','endsAt','tonePolicy','listenCount','spellCount','actionCount'])if(name in patch)next[name]=patch[name];
   if(typeof next.enabled!=='boolean'||!['rehearsal','official'].includes(next.mode)||next.tonePolicy!=='lexical'||next.listenCount!==10||next.spellCount!==10||!Number.isInteger(next.actionCount)||next.actionCount<1||next.actionCount>8||['startsAt','endsAt'].some(k=>next[k]!==null&&!Number.isFinite(next[k]))||next.startsAt&&next.endsAt&&next.endsAt<=next.startsAt)fail('活動設定有誤；聽音與拼音固定十題，聲調選原本聲調');
   next.revision++;return {value:next,out:next};
  });},
  async resetRehearsal(who,year,request){
   if(who?.role!=='organizer')fail('只有活動管理老師能重置全班預演',403);const key=prefix(who,year)+':event';
   return store.transaction(key,value=>{
    const event={...defaultEvent(who.classId,year),...value};
    if(!request||typeof request.requestId!=='string'||!/^[-a-zA-Z0-9_]{8,80}$/.test(request.requestId))fail('請重新操作');
    if(event.lastRehearsalReset?.id===request.requestId){if(event.lastRehearsalReset.revision!==request.revision)fail('重試內容不同',409);return {out:event};}
    if(request.revision!==event.revision)fail('活動設定已更新，請重新讀取',409);
    if(!active(event,now())||event.mode!=='rehearsal')fail('請先開啟預演，再開始新一輪',403);
    const next={...event,rehearsalRound:event.rehearsalRound+1,revision:event.revision+1,lastRehearsalReset:{id:request.requestId,revision:request.revision}};
    return {value:next,out:next};
   });
  },
  async command(who,year,seat,station,command){
   prefix(who,year);const s=seatFor(who,seat);if(!STATIONS.some(v=>v.id===station))fail('找不到關卡');
   if(!await studentExists({classId:who.classId,seat:s}))fail('找不到這個班級的學生',404);
   const teacher=canStation(who,station);if(who.role!=='student'&&!teacher)fail('這不是您負責的關卡',403);
   const event=await config(who,year);const mode=modeFor(who,command?.mode||'official');if(!active(event,now())||mode!==event.mode)fail(mode==='official'?'正式闖關尚未開放':'預演尚未開放',403);
   const rehearsalRound=roundFor(who,event,mode,mode==='rehearsal'?(command?.rehearsalRound??1):null);if(mode==='rehearsal'&&rehearsalRound!==event.rehearsalRound)fail('預演已重置，請更新進度再操作',409);
   const key=cardKey(who,year,mode,rehearsalRound,s);
   return store.transaction(key,value=>{
    const attempts=value||{};let a=attempts[station];
    if(!command||typeof command.requestId!=='string'||!/^[-a-zA-Z0-9_]{8,80}$/.test(command.requestId))fail('請重新操作');
    const receipt=a?.receipts?.find(r=>r.id===command.requestId);
    if(receipt){if(receipt.body!==JSON.stringify(command))fail('重試內容不同，請重新讀取',409);return {out:{ok:true,revision:a.revision}};}
    if((a?.revision||0)!==command.revision)fail('闖關進度已更新，請重新讀取',409);
    const type=command.type;
    if(type==='start'||type==='listen-replan'){
     if(!teacher)fail('請關主開始闖關',403);if(type==='start'&&a)fail('這一關已經開始，請接續原進度',409);
     if(type==='listen-replan'&&(station!=='listen'||!a||a.award||a.listenPolicy&&a.rounds.some(r=>r.result)))fail('已評量或已簽章的題目不能改選',409);
     const count=station==='listen'?event.listenCount:station==='spell'?event.spellCount:station==='action'?(command.count??event.actionCount):10;
     if(station==='action'&&(!Number.isInteger(count)||count<1||count>8))fail('動作題數請選一至八題');
     const previous=a;
     a={station,revision:previous?.revision||0,index:0,rounds:station==='listen'?makeListeningRounds(command.symbols):optionsFor(bank,station,count,rng),award:null,tonePolicy:event.tonePolicy,receipts:previous?.receipts||[]};
     if(station==='listen'){a.listenPolicy=LISTEN_POLICY;if(previous?.previousListen)a.previousListen=previous.previousListen;else if(previous&&!previous.listenPolicy)a.previousListen={rounds:previous.rounds,index:previous.index};}
     attempts[station]=a;
    }else{
     if(!a)fail('請先開始闖關');if(a.award)fail('這一關已完成，不能再次覆寫',409);
     const round=a.rounds[a.index];
     if(type==='listen-rate'){
      if(!teacher||station!=='listen')fail('請由聽音關主評量',403);if(a.listenPolicy!==LISTEN_POLICY)fail('請先改用自由選題');
      if(!Number.isInteger(command.index)||command.index<0||command.index>=10)fail('請點選要評量的符號');
      const outcome=LISTEN_OUTCOMES.find(v=>v.id===command.outcome);if(command.outcome!==null&&!outcome)fail('請選擇通過、提示後通過或未通過');
      a.rounds[command.index].result=outcome?{outcome:outcome.id,points:outcome.points,correct:outcome.id==='pass'}:null;
     }else if(type==='select'){
      if(!teacher)fail('請由關主選題',403);if(round.selected!==null)fail('已選定題目，不能重抽',409);
      if(!Number.isInteger(command.option)||command.option<0||command.option>=round.options.length)fail('請選擇題目');round.selected=command.option;
     }else if(type==='answer'){
      if(who.role!=='student')fail('請孩子作答',403);if(round.selected===null||round.result)fail('請等待關主出題',409);
      round.result=gradeAnswer(station,round.options[round.selected],command.answer,a.tonePolicy);
     }else if(type==='observe'){
      if(!teacher||!['listen','action'].includes(station))fail('請由關主評量',403);
      if(station==='listen'&&a.listenPolicy)fail('請使用二／一／零分評量');
      if(round.selected===null||round.result)fail('請先選題',409);
      if(typeof command.correct!=='boolean')fail('請選擇表現');round.result={correct:command.correct};
     }else if(type==='draw'){
      if(station!=='read'||who.role!=='student'||round.result)fail('請孩子抽課',409);const lesson=shuffle([1,2,3,4,5,6,7,8,9],rng)[0];round.options=[{id:'R'+lesson,text:'第'+lesson+'課',lesson}];round.selected=0;round.result={lesson};
     }else if(type==='next'){
      if(station==='listen'&&a.listenPolicy)fail('請直接點選要評量的符號');
      if(!teacher||!round.result||a.index>=a.rounds.length-1)fail('請完成目前這一題');a.index++;
     }else if(type==='award'){
      if(!teacher)fail('請由關主評分簽章',403);if(!a.rounds.every(r=>r.result))fail('請先完成所有題目');
      if(station==='listen'&&a.listenPolicy&&(listeningSummary(a).assessed!==10||command.award?.score!==listeningSummary(a).points))fail('聽音辨識分數必須依十題二／一／零分加總');
      a.award={...validateAward(command.award),teacherId:who.id||'teacher',savedAt:now()};
     }else fail('不支援的操作');
    }
    a.revision++;a.receipts=[...a.receipts,{id:command.requestId,body:JSON.stringify(command)}].slice(-100);return {value:attempts,out:{ok:true,revision:a.revision}};
   });
  }
 };
}
