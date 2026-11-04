import {INITIALS,FINALS,COMBINED,ACTIONS} from './annual-challenge-bank.js';
export const STATIONS=[
 {id:'listen',name:'聽音辨識',animal:'listen-owl',icon:'🦉',short:'聽一聽，指一指',description:'老師讀出聲符、韻符或結合韻，請用愛的小手指出黑板上的符號。'},
 {id:'tone',name:'先聲奪人',animal:'tone-rabbit',icon:'🐰',short:'聽詞語，選聲調',description:'關主選詞後，聽一聽，再選出每個字的聲調。共十題，其中一題有變音。'},
 {id:'spell',name:'東拼西湊',animal:'spell-fox',icon:'🦊',short:'注音小幫手，拼一拼',description:'關主選字詞，請用聲符、韻符、結合韻和聲調拼出來。'},
 {id:'action',name:'照做不誤',animal:'action-monkey',icon:'🐵',short:'看注音，做動作',description:'讀一讀注音，做出動作。讓關主看看你的本領！'},
 {id:'read',name:'書聲琅琅',animal:'read-cat',icon:'🐱',short:'轉一轉，讀一課',description:'轉動九課幸運輪，抽出一課，再拿課本讀給老師聽。'}
];
export const TONES=[{value:1,mark:'─',name:'一聲'},{value:2,mark:'ˊ',name:'二聲'},{value:3,mark:'ˇ',name:'三聲'},{value:4,mark:'ˋ',name:'四聲'},{value:5,mark:'˙',name:'輕聲'}];
export const LISTEN_POLICY='teacher-chosen-2-1-0-v1';
export const LISTEN_OUTCOMES=[{id:'pass',label:'通過',icon:'✓',points:2},{id:'hint',label:'提示後通過',icon:'💡',points:1},{id:'fail',label:'未通過',icon:'✕',points:0}];
export function makeListeningRounds(symbols){
 const allowed=new Set([...INITIALS,...FINALS,...COMBINED]);
 if(!Array.isArray(symbols)||symbols.length!==10||new Set(symbols).size!==10||symbols.some(s=>typeof s!=='string'||!allowed.has(s)))throw Error('請選擇十個不同的聲符、韻符或結合韻');
 return symbols.map((text,i)=>({options:[{id:'L'+(i+1),text}],selected:0,result:null}));
}
export function listeningSummary(attempt){
 const result={assessed:0,points:0,pass:0,hint:0,fail:0,remaining:10};
 for(const round of attempt?.rounds||[]){const outcome=LISTEN_OUTCOMES.find(v=>v.id===round.result?.outcome);if(outcome){result.assessed++;result.points+=outcome.points;result[outcome.id]++;}}
 result.remaining=10-result.assessed;return result;
}
export function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function active(event,now=Date.now()){return !!event?.enabled&&(!event.startsAt||now>=event.startsAt)&&(!event.endsAt||now<event.endsAt);}
export function defaultEvent(classId='main',year=2026){return {id:'zhuyin-'+year,classId,year,title:year+' 注音闖關',enabled:false,mode:'official',rehearsalRound:1,startsAt:null,endsAt:null,tonePolicy:'lexical',listenCount:10,spellCount:10,actionCount:3,revision:0};}
export function optionsFor(bank,station,count=10,rng=Math.random){
 const enabled=bank.questions.filter(q=>q.enabled&&!bank.disabledIds.includes(q.id));
 if(station==='tone'){
  const basic=shuffle(enabled.filter(q=>q.mode==='basic'&&q.text.length<=3&&!/[一不]/.test(q.text)),rng),sandhi=shuffle(enabled.filter(q=>q.mode==='sandhi'&&q.text.length<=3),rng);
  if(basic.length<27||sandhi.length<3)throw Error('題庫不足');
  const special=Math.min(9,Math.floor(rng()*10));let b=0;
  return Array.from({length:10},(_,i)=>({options:i===special?sandhi.slice(0,3):basic.slice(b,b+=3),selected:null,result:null}));
 }
 if(station==='spell'){
  const pool=shuffle(enabled.filter(q=>q.text.length<=3&&q.zhuyin),rng);if(pool.length<count*3)throw Error('題庫不足');
  return Array.from({length:count},(_,i)=>({options:pool.slice(i*3,i*3+3),selected:null,result:null}));
 }
 if(station==='listen'){
  const groups=[shuffle(INITIALS,rng),shuffle(FINALS,rng),shuffle(COMBINED,rng)];
  return Array.from({length:count},(_,i)=>({options:[{id:'L'+i,text:groups[i%3].pop()}],selected:0,result:null}));
 }
 if(station==='action'){
  const pool=shuffle(ACTIONS,rng);if(count*3>pool.length)throw Error('動作題庫不足，請選一至八題');
  return Array.from({length:count},(_,i)=>({options:pool.slice(i*3,i*3+3),selected:null,result:null}));
 }
 if(station==='read')return [{options:[],selected:null,result:null}];
 throw Error('找不到關卡');
}
export function normalizeSyllable(value){return String(value).normalize('NFC').replace(/[\s─]/g,'').replace(/^˙(.+)$/,'$1˙');}
export function spellingParts(q){return q.zhuyin.trim().split(/[\s　]+/).map(normalizeSyllable);}
export function gradeAnswer(station,q,answer,policy='lexical'){
 if(station==='tone'){
  const expected=policy==='surface'?q.surfaceTones:q.lexicalTones;
  if(!Array.isArray(answer)||answer.length!==expected.length||answer.some(n=>!Number.isInteger(n)||n<1||n>5))throw Error('請選完每個字的聲調');
  return {answer,correct:answer.every((n,i)=>n===expected[i])};
 }
 if(station==='spell'){
  const expected=spellingParts(q);if(!Array.isArray(answer)||answer.length!==expected.length||answer.some(v=>!String(v).trim()||String(v).length>10))throw Error('請拼完每個字');
  return {answer,correct:answer.every((v,i)=>normalizeSyllable(v)===expected[i])};
 }
 throw Error('這一關由老師評量');
}
export function validateSignature(lines){
 if(!Array.isArray(lines)||lines.length<1||lines.length>100||lines.some(line=>!Array.isArray(line)||line.length<1||line.length>2000||line.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))))return false;
 return lines.some(line=>line.length>=2&&line.some(p=>Math.hypot(p[0]-line[0][0],p[1]-line[0][1])>.01));
}
export function validateAward(value){
 if(!Number.isInteger(value.score)||value.score<0||value.score>20)throw Error('請填寫零至二十分的整數');
 if(!STATIONS.some(s=>s.animal===value.stamp))throw Error('請選一枚印章');
 if(!validateSignature(value.signature))throw Error('請關主手寫簽名');
 if(typeof value.note!=='string'||value.note.length>200)throw Error('建議請在二百字以內');
 return {score:value.score,stamp:value.stamp,signature:structuredClone(value.signature),note:value.note};
}
export function summary(attempts){const awards=Object.values(attempts).filter(a=>a.award);return {complete:awards.length,total:awards.reduce((n,a)=>n+a.award.score,0)};}
