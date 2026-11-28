import {drawClassRewards} from './data/guided-rewards.js?v=20261129-classprizes2';
import {judge,score} from './guided-grading.js';
const questions=[
 {mode:'copy',character:'三',reading:'ㄙㄢ',word:'三'},
 {mode:'write',character:'左',reading:'ㄗㄨㄛˇ',word:'左手',context:'□手'},
 {mode:'read',character:'山',reading:'ㄕㄢ'},
 {mode:'math',op:'add',a:5,b:3},
 {mode:'listen',character:'人',word:'人',reading:'ㄖㄣˊ'}
];
const key='guided-practice.teacher-demo.v2',title='生字、注音與加法試寫';
function load(){try{return JSON.parse(sessionStorage.getItem(key))||null;}catch{return null;}}
async function view(r){
 const q=questions[r.position],question=q?{...q}:null;
 if(q&&['copy','write'].includes(q.mode)){const file='data/hanzi-'+(q.mode==='copy'?'copy':'strokes')+'/U'+q.character.codePointAt(0).toString(16).toUpperCase()+'.json';const res=await fetch(file);if(!res.ok)throw Error('無法載入試玩字，請重試。');question.reference=await res.json();}
 return {...r,total:questions.length,title,completed:!q,score:score(questions.length,r.mistakes),question};
}
export async function trial(op,d){
 let r=load();
 if(op==='list')return {plans:[{id:'teacher-demo',title,total:5,position:r?.position??null}]};
 if(!r||op==='start'&&r.position===5)r={position:0,revision:0,mistakes:{},feedback:null};
 const result=await view(r);if(op==='start')return result;
 if(d.revision!==r.revision||d.position!==r.position||!result.question)return result;
 const g=judge(result.question,d.answer,result.question.reference);
 if(g.correct===null)return {...result,notice:g.tip};
 r.feedback={...g,position:r.position};if(g.correct)r.position++;else{const i=r.position;r.mistakes[i]={count:(r.mistakes[i]?.count||0)+1};}
 if(r.position===questions.length)r.reward={version:2,items:drawClassRewards(!Object.keys(r.mistakes).length)};
 r.revision++;sessionStorage.setItem(key,JSON.stringify(r));return view(r);
}
