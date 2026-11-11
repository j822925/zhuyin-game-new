import {INITIALS,FINALS,COMBINED,ACTIONS} from './annual-challenge-bank.js?v=20261106-v2';
import {stampById,isStampForStation} from './annual-challenge-stamps.js?v=20261106-v2';
export const STATIONS=[
 {id:'listen',name:'聽音辨識',animal:'listen-owl',icon:'🦉',short:'聽一聽，指一指',description:'老師讀出聲符、韻符或結合韻，請用愛的小手指出黑板上的符號。'},
 {id:'tone',name:'先聲奪人',animal:'tone-rabbit',icon:'🐰',short:'聽詞語，選聲調',description:'關主選詞後，聽一聽，再選出每個字原本的聲調。目前不出變音題。'},
 {id:'spell',name:'東拼西湊',animal:'spell-fox',icon:'🦊',short:'注音小幫手，拼一拼',description:'關主選字詞，請用聲符、韻符、結合韻和聲調拼出來。'},
 {id:'action',name:'照做不誤',animal:'action-monkey',icon:'🐵',short:'看注音，做動作',description:'讀一讀注音，做出動作。讓關主看看你的本領！'},
 {id:'read',name:'書聲琅琅',animal:'read-cat',icon:'🐱',short:'轉一轉，讀一課',description:'轉動九課幸運輪，抽出一課，再拿課本讀給老師聽。'}
];
export const TONES=[{value:1,mark:'─',name:'一聲'},{value:2,mark:'ˊ',name:'二聲'},{value:3,mark:'ˇ',name:'三聲'},{value:4,mark:'ˋ',name:'四聲'},{value:5,mark:'˙',name:'輕聲'}];
export const LISTEN_POLICY='teacher-chosen-2-1-0-v1';
export const ANSWER_POLICY='first-error-character-direct-v1';
export const SCALED_ANSWER_POLICY='first-error-character-scaled-v1';
export const LISTEN_OUTCOMES=[{id:'pass',label:'通過',icon:'✓',points:2},{id:'hint',label:'提示後通過',icon:'💡',points:1},{id:'fail',label:'未通過',icon:'✕',points:0}];
export function makeListeningRounds(symbols,{min=10,max=10,used=[],offset=0}={}){
 const allowed=new Set([...INITIALS,...FINALS,...COMBINED]);
 if(!Array.isArray(symbols)||symbols.length<min||symbols.length>max||new Set(symbols).size!==symbols.length||symbols.some(s=>typeof s!=='string'||!allowed.has(s)||used.includes(s)))throw Error(min===10&&max===10?'請選擇十個不同的聲符、韻符或結合韻':'加題請選一至五個尚未考過的注音符號');
 return symbols.map((text,i)=>({options:[{id:'L'+(offset+i+1),text}],selected:0,result:null}));
}
export function listeningSummary(attempt){
 const total=attempt?.rounds?.length||10,result={assessed:0,rawPoints:0,points:0,pass:0,hint:0,fail:0,total,remaining:total};
 for(const round of attempt?.rounds||[]){const outcome=LISTEN_OUTCOMES.find(v=>v.id===round.result?.outcome);if(outcome){result.assessed++;result.rawPoints+=outcome.points;result[outcome.id]++;}}
 result.remaining=total-result.assessed;result.points=Math.round(result.rawPoints/(2*total)*20);return result;
}
export function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function active(event,now=Date.now()){return !!event?.enabled&&(event.startsAt==null||now>=event.startsAt)&&(event.endsAt==null||now<event.endsAt);}
export function defaultEvent(classId='main',year=2026){return {id:'zhuyin-'+year,classId,year,title:year+' 注音闖關',enabled:false,mode:'official',rehearsalRound:1,startsAt:null,endsAt:null,tonePolicy:'lexical',listenCount:10,spellCount:4,toneCount:4,actionCount:3,revision:0};}
export const STATION_LIMITS=Object.freeze({listen:59,tone:30,spell:30,action:30,read:9});
export const ACTIVITY_MODES=Object.freeze(['rehearsal','official']);
const accessKeys=['enabled','allStudents','seats','startsAt','endsAt'];
export function validateAccess(access){
 if(!access||typeof access!=='object'||Array.isArray(access)||Object.keys(access).some(k=>!accessKeys.includes(k))||typeof access.enabled!=='boolean'||typeof access.allStudents!=='boolean'||!Array.isArray(access.seats)||access.seats.length>500||new Set(access.seats).size!==access.seats.length||access.seats.some(s=>typeof s!=='string'||!/^\d{6}$/.test(s))||['startsAt','endsAt'].some(k=>access[k]!==null&&(!Number.isFinite(access[k])||access[k]<0))||access.startsAt!==null&&access.endsAt!==null&&access.endsAt<=access.startsAt)throw Error('活動開放名單或時間有誤');
 return {...access,seats:[...access.seats]};
}
export function normalizeEvent(value,classId='main',year=2026,legacySeats=null){
 const event={...defaultEvent(classId,year),...value},blank=()=>({enabled:false,allStudents:legacySeats===null,seats:[],startsAt:null,endsAt:null});
 if(!ACTIVITY_MODES.includes(event.mode))event.mode='official';
 const access={rehearsal:blank(),official:blank()};
 if(value?.access){if(typeof value.access!=='object'||Array.isArray(value.access)||Object.keys(value.access).some(k=>!ACTIVITY_MODES.includes(k)))throw Error('活動開放名單或時間有誤');for(const mode of ACTIVITY_MODES)access[mode]=validateAccess({...blank(),...value.access[mode]});}
 else access[event.mode]=validateAccess({...access[event.mode],seats:value&&legacySeats!==null?[...legacySeats]:[],enabled:event.enabled,startsAt:event.startsAt,endsAt:event.endsAt});
 event.access=access;
 // A legacy ten-question attempt is left untouched; only new decks use 3–8.
 for(const key of ['spellCount','toneCount'])if(!Number.isInteger(event[key])||event[key]<3||event[key]>8)event[key]=4;
 return effectiveEvent(event,event.mode);
}
export function effectiveEvent(event,mode=event.mode,includeAccess=true){
 const slot=event.access[mode],out={...event,mode,enabled:slot.enabled,startsAt:slot.startsAt,endsAt:slot.endsAt};
 if(includeAccess)out.access=structuredClone(event.access);else delete out.access;
 return out;
}
export const accessAllowed=(event,mode,seat)=>!!event.access?.[mode]&&(event.access[mode].allStudents||event.access[mode].seats.includes(seat));
export function isBasicToneQuestion(q){return q?.mode==='basic'&&q.hasSandhi!==true&&typeof q.text==='string'&&q.text.length>0&&q.text.length<=3&&!/[一不]/.test(q.text);}
export function optionsFor(bank,station,count=10,rng=Math.random,{usedIds=[]}={}){
 if(!Number.isInteger(count)||count<1||count>30)throw Error('題數有誤');
 const enabled=bank.questions.filter(q=>q.enabled&&!bank.disabledIds.includes(q.id));
 const unusedFirst=items=>[...shuffle(items.filter(q=>!usedIds.includes(q.id)),rng),...shuffle(items.filter(q=>usedIds.includes(q.id)),rng)];
 if(station==='tone'){
  const basic=unusedFirst(enabled.filter(isBasicToneQuestion));
  if(basic.length<count*3)throw Error('題庫不足');
  return Array.from({length:count},(_,i)=>({options:basic.slice(i*3,i*3+3),selected:null,result:null}));
 }
 if(station==='spell'){
  const pool=unusedFirst(enabled.filter(q=>[...q.text].length>=1&&[...q.text].length<=2&&q.zhuyin&&typeof q.audioUrl==='string'&&q.audioUrl));if(pool.length<count*3)throw Error('題庫不足');
  return Array.from({length:count},(_,i)=>({options:pool.slice(i*3,i*3+3),selected:null,result:null}));
 }
 if(station==='listen'){
  const groups=[shuffle(INITIALS,rng),shuffle(FINALS,rng),shuffle(COMBINED,rng)];
  return Array.from({length:count},(_,i)=>({options:[{id:'L'+i,text:groups[i%3].pop()}],selected:0,result:null}));
 }
 if(station==='action'){
  const pool=unusedFirst(ACTIONS);if(count*3>pool.length)throw Error('動作題庫不足，請選一至八題');
  return Array.from({length:count},(_,i)=>({options:pool.slice(i*3,i*3+3),selected:null,result:null}));
 }
 if(station==='read')return Array.from({length:count},()=>({options:[],selected:null,result:null}));
 throw Error('找不到關卡');
}
export function normalizeSyllable(value){return String(value).normalize('NFC').replace(/[\s─]/g,'').replace(/^˙(.+)$/,'$1˙');}
export function spellingParts(q){return q.zhuyin.trim().split(/[\s　]+/).map(normalizeSyllable);}
// Older completed records have no completion flag and remain completed.
export function roundComplete(round){return !!round?.result&&round.result.completed!==false;}
export function gradeAnswer(station,q,answer,policy='lexical'){
 const feedback=matches=>{const wrongCharacterIndices=matches.flatMap((correct,i)=>correct?[]:[i]);return {answer:structuredClone(answer),correct:wrongCharacterIndices.length===0,wrongCharacterIndices,wrongCharacterCount:wrongCharacterIndices.length};};
 if(station==='tone'){
  const expected=policy==='surface'?q.surfaceTones:q.lexicalTones;
  if(!Array.isArray(answer)||answer.length!==expected.length||answer.some(n=>!Number.isInteger(n)||n<1||n>5))throw Error('請選完每個字的聲調');
  return feedback(answer.map((n,i)=>n===expected[i]));
 }
 if(station==='spell'){
  const expected=spellingParts(q);if(!Array.isArray(answer)||answer.length!==expected.length||answer.some(v=>!String(v).trim()||String(v).length>10))throw Error('請拼完每個字');
  return feedback(answer.map((v,i)=>normalizeSyllable(v)===expected[i]));
 }
 throw Error('這一關由老師評量');
}
export function answerSummary(attempt){
 const rounds=attempt?.rounds||[],out={total:rounds.length,completed:0,remaining:rounds.length,answered:0,corrected:0,totalCharacters:0,firstWrongCharacterCount:0,wrongCharacters:0,initialWrongCharacterCount:0,extraWrongCharacterCount:0,deductedPoints:0,rawPoints:0,maxRawPoints:0,points:0};
 for(const round of rounds){
  if(roundComplete(round))out.completed++;
  const q=round.selected===null?null:round.options?.[round.selected],characters=typeof q?.text==='string'?[...q.text].length:0;
  out.totalCharacters+=characters;if(!round.result)continue;out.answered++;
  let wrong=round.result.firstWrongCharacterCount;
  // Historical first submissions can be scored when their own answer survives.
  // Missing old answers are never treated as errors or rewritten on a read.
  if(!Number.isInteger(wrong))try{wrong=gradeAnswer(attempt.station,q,round.result.firstAnswer??round.result.answer,attempt.tonePolicy).wrongCharacterCount;}catch{wrong=0;}
  wrong=Math.max(0,Math.min(characters,wrong));out.firstWrongCharacterCount+=wrong;
  // Only newly added questions explicitly opt into the smaller deduction.
  // Missing historical metadata keeps its original two-point deduction.
  const penalty=(round.result.firstErrorPenalty??round.firstErrorPenalty)===1?1:2;
  out.deductedPoints+=wrong*penalty;out[penalty===1?'extraWrongCharacterCount':'initialWrongCharacterCount']+=wrong;
  if(wrong&&roundComplete(round)&&round.result.correct===true)out.corrected++;
 }
 out.remaining=out.total-out.completed;out.wrongCharacters=out.firstWrongCharacterCount;out.maxRawPoints=2*out.totalCharacters;out.rawPoints=out.maxRawPoints-out.deductedPoints;
 // Keep the historical raw counters for readers of older cards. New cards
 // deduct from twenty directly; signed historical cards retain their policy.
 out.points=attempt?.answerPolicy===ANSWER_POLICY?Math.max(0,20-out.deductedPoints):(out.maxRawPoints?Math.round(out.rawPoints/out.maxRawPoints*20):0);return out;
}
export function validateSignature(lines){
 if(!Array.isArray(lines)||lines.length<1||lines.length>100||lines.some(line=>!Array.isArray(line)||line.length<1||line.length>2000||line.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))))return false;
 return lines.some(line=>line.length>=2&&line.some(p=>Math.hypot(p[0]-line[0][0],p[1]-line[0][1])>.01));
}
export function validateAward(value,station){
 if(!value||typeof value!=='object')throw Error('請填寫零至二十分的整數');
 if(!Number.isInteger(value.score)||value.score<0||value.score>20)throw Error('請填寫零至二十分的整數');
 if(station?!isStampForStation(value.stamp,station):!stampById(value.stamp))throw Error('請選擇這一關的印章');
 if(!validateSignature(value.signature))throw Error('請關主手寫簽名');
 if(typeof value.note!=='string'||value.note.length>200)throw Error('建議請在二百字以內');
 return {score:value.score,stamp:value.stamp,signature:structuredClone(value.signature),note:value.note};
}
export function summary(attempts){const awards=Object.values(attempts).filter(a=>a.award);return {complete:awards.length,total:awards.reduce((n,a)=>n+a.award.score,0)};}
