// Integration boundary: identities must come from existing verified student/admin auth.
// A durable adapter must implement atomic transaction(key, callback), not get-then-put.
import {STATIONS,active,normalizeEvent,effectiveEvent,accessAllowed,validateAccess,ACTIVITY_MODES,STATION_LIMITS,optionsFor,isBasicToneQuestion,gradeAnswer,validateAward,shuffle,LISTEN_POLICY,LISTEN_OUTCOMES,makeListeningRounds,listeningSummary,ANSWER_POLICY,roundComplete,answerSummary} from './annual-challenge-core.js?v=20261111-retry2';
import {isStampForStation} from './annual-challenge-stamps.js?v=20261106-v2';
const copy=v=>structuredClone(v);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function createMemoryStore(){const data=new Map();return {async transaction(key,fn){const draft=copy(data.get(key)||null);const result=fn(draft);if(result?.value!==undefined)data.set(key,copy(result.value));return copy(result?.out);}};}
export function createAnnualChallengeService({store,bank,studentExists=()=>false,now=Date.now,rng=Math.random,legacySeats=null}){
 // Read views do not write a migration. A stable virtual revision makes old
 // selections/answers stale; the next valid command for this station persists it.
 function projectAnswerAttempt(attempt,key){
  if(!attempt||attempt.award||!['tone','spell'].includes(attempt.station))return attempt;
  const adoptPolicy=attempt.answerPolicy!==ANSWER_POLICY&&!attempt.rounds.every(roundComplete);
  const pending=attempt.station==='tone'?attempt.rounds.map((round,index)=>!round.result&&round.options.some(q=>!isBasicToneQuestion(q))?index:-1).filter(index=>index>=0):[];
  if(!pending.length&&!adoptPolicy)return attempt;
  const projected=copy(attempt);
  if(adoptPolicy)projected.answerPolicy=ANSWER_POLICY;
  if(pending.length){
  const seed=key+':basic-tone-v1:'+attempt.revision+':'+attempt.rounds.map(r=>r.options.map(q=>q.id||q.text).join(',')).join('|');
  let state=2166136261;for(let i=0;i<seed.length;i++){state^=seed.charCodeAt(i);state=Math.imul(state,16777619);}
  const deterministic=()=>{state=(state+0x6D2B79F5)|0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
  const replacements=optionsFor(bank,'tone',pending.length,deterministic,{usedIds:attempt.rounds.flatMap(r=>r.options.map(q=>q.id))});
  pending.forEach((index,i)=>{projected.rounds[index]=replacements[i];});
  }
  projected.revision++;
  return projected;
 }
 function studentResult(attempt,round){
  if(!round.result)return null;
  if(!['tone','spell'].includes(attempt.station))return {answered:true};
  const result=round.result,out={answered:true,completed:roundComplete(round),correct:result.correct===true,tries:Number.isInteger(result.tries)?result.tries:1,firstErrorPenalty:(result.firstErrorPenalty??round.firstErrorPenalty)===1?1:2};
  for(const field of ['answer','firstAnswer','wrongCharacterIndices','wrongCharacterCount','firstWrongCharacterIndices','firstWrongCharacterCount'])if(result[field]!==undefined)out[field]=copy(result[field]);
  if(!Number.isInteger(out.firstWrongCharacterCount))out.firstWrongCharacterCount=answerSummary({...attempt,rounds:[round]}).firstWrongCharacterCount;
  return out;
 }
 function identity(who){if(!who||!['student','teacher','organizer'].includes(who.role)||typeof who.classId!=='string'||!/^[-a-zA-Z0-9_]{1,40}$/.test(who.classId)||who.role==='student'&&(typeof who.seat!=='string'||!/^\d{6}$/.test(who.seat)))fail('請先登入',401);if(who.expiresAt!==undefined&&(!Number.isFinite(who.expiresAt)||who.expiresAt<=now()))fail('關主授權已到期，請重新驗證',401);}
 const prefix=(who,year)=>{identity(who);if(!Number.isInteger(year)||year<2020||year>2100)fail('活動年度有誤');if(who.yearScope!==undefined&&who.yearScope!==year)fail('關主授權僅限本次年度',403);return who.classId+':'+year;};
 const canStation=(who,id)=>who.role==='organizer'||who.role==='teacher'&&Array.isArray(who.stations)&&who.stations.includes(id);
 function seatFor(who,seat){identity(who);if(who.role==='student'){if(seat&&seat!==who.seat)fail('只能查看自己的闖關卡',403);return who.seat;}if(typeof seat!=='string'||!/^\d{6}$/.test(seat))fail('請選擇學生');if(who.seatScope&&who.seatScope!==seat)fail('關主授權僅限眼前這位孩子',403);return seat;}
 function modeFor(who,mode){if(!['rehearsal','official'].includes(mode))fail('活動模式有誤');if(who.modeScope&&who.modeScope!==mode)fail('活動模式已切換，請關主重新驗證',403);return mode;}
 function roundFor(who,event,mode,requestedRound){if(mode!=='rehearsal')return null;const round=requestedRound??event.rehearsalRound;if(!Number.isSafeInteger(round)||round<1||round>event.rehearsalRound)fail('預演輪次有誤');if(who.rehearsalRoundScope!==undefined&&who.rehearsalRoundScope!==round)fail('預演已重新開始，請關主重新驗證',403);return round;}
 const cardKey=(who,year,mode,round,seat)=>prefix(who,year)+':'+mode+(mode==='rehearsal'&&round>1?':r'+round:'')+':'+seat;
 async function fullConfig(who,year){return store.transaction(prefix(who,year)+':event',value=>({out:normalizeEvent(value,who.classId,year,legacySeats)}));}
 async function config(who,year){const event=await fullConfig(who,year);return effectiveEvent(event,event.mode,who.role!=='student');}
 async function requireStudent(who,seat){if(!await studentExists({classId:who.classId,seat}))fail('找不到這個班級的學生',404);}
 function requireAccess(event,mode,seat){if(!accessAllowed(event,mode,seat))fail('這個活動尚未開放給這位學生',403);}
 async function availability(who,year){prefix(who,year);if(who.role!=='student')fail('請使用學生身分查看自己的開放狀態',403);await requireStudent(who,who.seat);const event=await fullConfig(who,year);return Object.fromEntries(ACTIVITY_MODES.map(mode=>[mode,{enabled:active(event.access[mode],now()),allowed:accessAllowed(event,mode,who.seat)}]));}
 async function card(who,year,seat,requestedMode,requestedRound){const s=seatFor(who,seat);await requireStudent(who,s);const full=await fullConfig(who,year);const mode=modeFor(who,requestedMode||full.mode);requireAccess(full,mode,s);const rehearsalRound=roundFor(who,full,mode,requestedRound),event=effectiveEvent(full,mode,who.role!=='student');return store.transaction(cardKey(who,year,mode,rehearsalRound,s),value=>{
  const attempts=value||{};const visible=copy(attempts);for(const station of ['tone','spell'])if(visible[station])visible[station]=projectAnswerAttempt(visible[station],cardKey(who,year,mode,rehearsalRound,s));
  if(who.role==='student')for(const a of Object.values(visible)){delete a.receipts;delete a.previousListen;a.rounds=a.rounds.map(r=>({selected:r.selected===null?null:0,...(['tone','spell'].includes(a.station)?{firstErrorPenalty:(r.result?.firstErrorPenalty??r.firstErrorPenalty)===1?1:2}:{}),options:r.selected===null||a.station==='listen'?[]:[{text:r.options[r.selected].text,audioUrl:['tone','spell'].includes(a.station)?r.options[r.selected].audioUrl:undefined,zhuyin:a.station==='action'?r.options[r.selected].zhuyin:undefined}],result:studentResult(a,r)}));}
  if(who.role==='teacher')for(const [id,a]of Object.entries(visible))if(!canStation(who,id))visible[id]={station:id,award:a.award?{score:a.award.score,stamp:a.award.stamp}:null};
  return {out:{event,mode,rehearsalRound,seat:s,attempts:visible}};
 });}
 return {
  config,card,availability,
  async configure(who,year,patch){if(who?.role!=='organizer')fail('只有活動管理老師能設定',403);const key=prefix(who,year)+':event';return store.transaction(key,value=>{
   const event=normalizeEvent(value,who.classId,year,legacySeats);if(!patch||patch.revision!==event.revision)fail('設定已更新，請重新讀取',409);
   const next=copy(event);for(const name of ['mode','tonePolicy','listenCount','spellCount','toneCount','actionCount'])if(name in patch)next[name]=patch[name];
   if(!ACTIVITY_MODES.includes(next.mode)||next.tonePolicy!=='lexical'||next.listenCount!==10||['spellCount','toneCount'].some(k=>!Number.isInteger(next[k])||next[k]<3||next[k]>8)||!Number.isInteger(next.actionCount)||next.actionCount<1||next.actionCount>8)fail('活動設定有誤；聽音固定十題，拼音與聲調三至八題，聲調選原本聲調');
   if(patch.access!==undefined){
    if(!patch.access||typeof patch.access!=='object'||Array.isArray(patch.access)||Object.keys(patch.access).some(k=>!ACTIVITY_MODES.includes(k)))fail('活動開放名單或時間有誤');
    for(const mode of ACTIVITY_MODES)if(mode in patch.access){const change=patch.access[mode];if(!change||typeof change!=='object'||Array.isArray(change))fail('活動開放名單或時間有誤');next.access[mode]=validateAccess({...next.access[mode],...change});}
   }
   const legacyPatch={};for(const k of ['enabled','startsAt','endsAt'])if(k in patch)legacyPatch[k]=patch[k];
   next.access[next.mode]=validateAccess({...next.access[next.mode],...legacyPatch});
   next.revision++;const saved=effectiveEvent(next,next.mode);return {value:saved,out:saved};
  });},
  async resetRehearsal(who,year,request){
   if(who?.role!=='organizer')fail('只有活動管理老師能重置全班預演',403);const key=prefix(who,year)+':event';
   return store.transaction(key,value=>{
    const event=normalizeEvent(value,who.classId,year,legacySeats);
    if(!request||typeof request.requestId!=='string'||!/^[-a-zA-Z0-9_]{8,80}$/.test(request.requestId))fail('請重新操作');
    if(event.lastRehearsalReset?.id===request.requestId){if(event.lastRehearsalReset.revision!==request.revision)fail('重試內容不同',409);return {out:event};}
    if(request.revision!==event.revision)fail('活動設定已更新，請重新讀取',409);
    if(!active(event.access.rehearsal,now()))fail('請先開啟預演，再開始新一輪',403);
    const next={...event,rehearsalRound:event.rehearsalRound+1,revision:event.revision+1,lastRehearsalReset:{id:request.requestId,revision:request.revision}};
    return {value:next,out:next};
   });
  },
  async command(who,year,seat,station,command){
   prefix(who,year);const s=seatFor(who,seat);if(!STATIONS.some(v=>v.id===station))fail('找不到關卡');
   await requireStudent(who,s);
   const teacher=canStation(who,station);if(who.role!=='student'&&!teacher)fail('這不是您負責的關卡',403);
   const event=await fullConfig(who,year);const mode=modeFor(who,command?.mode||'official');requireAccess(event,mode,s);if(!active(event.access[mode],now()))fail(mode==='official'?'正式闖關尚未開放':'預演尚未開放',403);
   const rehearsalRound=roundFor(who,event,mode,mode==='rehearsal'?(command?.rehearsalRound??1):null);if(mode==='rehearsal'&&rehearsalRound!==event.rehearsalRound)fail('預演已重置，請更新進度再操作',409);
   const key=cardKey(who,year,mode,rehearsalRound,s);
   return store.transaction(key,value=>{
    const attempts=value||{};let a=attempts[station];
    if(!command||typeof command.requestId!=='string'||!/^[-a-zA-Z0-9_]{8,80}$/.test(command.requestId))fail('請重新操作');
    const receipt=a?.receipts?.find(r=>r.id===command.requestId);
    if(receipt){if(receipt.body!==JSON.stringify(command))fail('重試內容不同，請重新讀取',409);return {out:{ok:true,revision:a.revision}};}
    if(['tone','spell'].includes(station)&&a){a=projectAnswerAttempt(a,key);attempts[station]=a;}
    if((a?.revision||0)!==command.revision)fail('闖關進度已更新，請重新讀取',409);
    const type=command.type;
    if(type==='start'||type==='listen-replan'){
     if(!teacher)fail('請關主開始闖關',403);if(type==='start'&&a)fail('這一關已經開始，請接續原進度',409);
     if(type==='listen-replan'&&(station!=='listen'||!a||a.award||a.listenPolicy&&a.rounds.some(r=>r.result)))fail('已評量或已簽章的題目不能改選',409);
     const count=station==='listen'?10:station==='spell'?(command.count??event.spellCount):station==='tone'?(command.count??4):station==='action'?(command.count??event.actionCount):1;
     if(station==='action'&&(!Number.isInteger(count)||count<1||count>8))fail('動作題數請選一至八題');
     if(['tone','spell'].includes(station)&&(!Number.isInteger(count)||count<3||count>8))fail('拼音與聲調題數請選三至八題');
     const previous=a;
     a={station,revision:previous?.revision||0,index:0,rounds:station==='listen'?makeListeningRounds(command.symbols):optionsFor(bank,station,count,rng),award:null,tonePolicy:event.tonePolicy,preferredStamp:previous?.preferredStamp||null,receipts:previous?.receipts||[]};
     if(['tone','spell'].includes(station)){a.answerPolicy=ANSWER_POLICY;for(const round of a.rounds)round.firstErrorPenalty=2;}
     if(station==='listen'){a.listenPolicy=LISTEN_POLICY;if(previous?.previousListen)a.previousListen=previous.previousListen;else if(previous&&!previous.listenPolicy)a.previousListen={rounds:previous.rounds,index:previous.index};}
     attempts[station]=a;
    }else{
     if(!a)fail('請先開始闖關');if(a.award)fail('這一關已完成，不能再次覆寫',409);
     const round=a.rounds[a.index];
     if(type==='extend'){
      if(!teacher)fail('請由關主加題',403);if(!a.rounds.every(roundComplete))fail('請先完成目前所有題目，再加題');
      const count=command.count??(station==='listen'&&Array.isArray(command.symbols)?command.symbols.length:undefined);
      if(!Number.isInteger(count)||count<1||count>5)fail('每次請增加一至五題');
      if(a.rounds.length+count>STATION_LIMITS[station])fail('這一關已達可加題的上限');
      let extra;
      if(station==='listen'){
       if(!a.listenPolicy)fail('請先改用自由選題');
       if(command.symbols?.length!==count)fail('加題數量與選取的符號不一致');
       extra=makeListeningRounds(command.symbols,{min:1,max:5,used:a.rounds.map(r=>r.options[0].text),offset:a.rounds.length});
      }else extra=optionsFor(bank,station,count,rng,{usedIds:a.rounds.flatMap(r=>r.options.map(q=>q.id))});
      if(['tone','spell'].includes(station)){a.answerPolicy=ANSWER_POLICY;for(const round of extra)round.firstErrorPenalty=1;}
      a.index=a.rounds.length;a.rounds.push(...extra);
     }else if(type==='choose-stamp'){
      if(who.role!=='student')fail('請讓孩子選擇喜歡的印章',403);
      if(!a.rounds.every(roundComplete))fail('請先完成所有題目，再選印章');
      if(!isStampForStation(command.stamp,station))fail('請選擇這一關的印章');a.preferredStamp=command.stamp;
     }else if(type==='listen-rate'){
      if(!teacher||station!=='listen')fail('請由聽音關主評量',403);if(a.listenPolicy!==LISTEN_POLICY)fail('請先改用自由選題');
      if(!Number.isInteger(command.index)||command.index<0||command.index>=a.rounds.length)fail('請點選要評量的符號');
      const outcome=LISTEN_OUTCOMES.find(v=>v.id===command.outcome);if(command.outcome!==null&&!outcome)fail('請選擇通過、提示後通過或未通過');
      a.rounds[command.index].result=outcome?{outcome:outcome.id,points:outcome.points,correct:outcome.id==='pass'}:null;
     }else if(type==='select'){
      if(!teacher)fail('請由關主選題',403);if(round.selected!==null)fail('已選定題目，不能重抽',409);
      if(!Number.isInteger(command.option)||command.option<0||command.option>=round.options.length)fail('請選擇題目');round.selected=command.option;
     }else if(type==='answer'){
      if(who.role!=='student')fail('請孩子作答',403);if(round.selected===null||roundComplete(round))fail('請等待關主出題',409);
      const graded=gradeAnswer(station,round.options[round.selected],command.answer,a.tonePolicy),previous=round.result;
      round.result={...graded,completed:graded.correct,firstAnswer:copy(previous?.firstAnswer??graded.answer),firstWrongCharacterIndices:copy(previous?.firstWrongCharacterIndices??graded.wrongCharacterIndices),firstWrongCharacterCount:previous?.firstWrongCharacterCount??graded.wrongCharacterCount,firstErrorPenalty:(previous?.firstErrorPenalty??round.firstErrorPenalty)===1?1:2,tries:(previous?.tries||0)+1};
     }else if(type==='observe'){
      if(!teacher||!['listen','action'].includes(station))fail('請由關主評量',403);
      if(station==='listen'&&a.listenPolicy)fail('請使用二／一／零分評量');
      if(round.selected===null||round.result)fail('請先選題',409);
      if(typeof command.correct!=='boolean')fail('請選擇表現');round.result={correct:command.correct};
     }else if(type==='draw'){
      if(station!=='read'||who.role!=='student'||round.result)fail('請孩子抽課',409);const used=a.rounds.map(r=>r.result?.lesson),lesson=shuffle([1,2,3,4,5,6,7,8,9].filter(v=>!used.includes(v)),rng)[0];if(!lesson)fail('九課都已抽過，不能再抽課');round.options=[{id:'R'+lesson,text:'第'+lesson+'課',lesson}];round.selected=0;round.result={lesson};
     }else if(type==='next'){
      if(station==='listen'&&a.listenPolicy)fail('請直接點選要評量的符號');
      if(!teacher||!roundComplete(round)||a.index>=a.rounds.length-1)fail('請完成目前這一題');a.index++;
     }else if(type==='award'){
      if(!teacher)fail('請由關主評分簽章',403);if(!a.rounds.every(roundComplete))fail('請先完成所有題目');
      if(station==='listen'&&a.listenPolicy&&(listeningSummary(a).assessed!==a.rounds.length||command.award?.score!==listeningSummary(a).points))fail('聽音辨識分數必須依逐題加總並換算為二十分');
      if(['tone','spell'].includes(station)&&a.answerPolicy===ANSWER_POLICY&&command.award?.score!==answerSummary(a).points)fail('聲調與拼音分數必須依首次錯字比例換算為二十分');
      a.award={...validateAward(command.award,station),teacherId:who.id||'teacher',savedAt:now()};
     }else fail('不支援的操作');
    }
    a.revision++;a.receipts=[...a.receipts,{id:command.requestId,body:JSON.stringify(command)}].slice(-100);return {value:attempts,out:{ok:true,revision:a.revision}};
   });
  }
 };
}
