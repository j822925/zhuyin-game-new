import {gradeStrokes} from './hanzi-stroke-core.js';
import {gradeCopy} from './hanzi-copy-core.js';
import {gradeReading} from './hanzi-bank.js';
import {answer as mathAnswer,hint} from './arithmetic-core.js';
export const labels={write:'看注音寫國字',copy:'生字仿寫',read:'看國字寫注音',math:'加減法',listen:'聽國字拼注音'};
const reasons={'stroke-order-mismatch':'筆順','stroke-direction-mismatch':'下筆方向','shape-mismatch':'筆畫形狀','grid-position-mismatch':'位置或大小','missing-strokes':'少了筆畫','extra-strokes':'多了筆畫','alternative-character-closer':'字形'};
const point=p=>Array.isArray(p)?p:[p.x,p.y];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function samples(line){
 const pts=line.map(point),lengths=[0];
 for(let i=1;i<pts.length;i++)lengths.push(lengths[i-1]+dist(pts[i],pts[i-1]));
 return Array.from({length:12},(_,k)=>{
  const target=lengths.at(-1)*k/11,i=lengths.findIndex(n=>n>=target);
  if(i<=0)return pts[0];
  const t=(target-lengths[i-1])/Math.max(1e-8,lengths[i]-lengths[i-1]);
  return pts[i].map((v,a)=>pts[i-1][a]+t*(v-pts[i-1][a]));
 });
}
function mismatch(a,b){return Math.min(...[b,[...b].reverse()].map(path=>a.reduce((v,p,i)=>v+dist(p,path[i]),0)/a.length));}
export function strokeFeedback(ink,ref,grade){
 const a=ink.map(samples),b=ref.strokes.map(samples),bad=new Set([...(grade.order?.wrongPositions||[]),...(grade.order?.reversedStrokes||[])]);
 const missing=[],costs=a.map(line=>b.map(path=>mismatch(line,path)));
 // Align by spatial shape so a missing middle stroke does not mark every later stroke wrong.
 if(a.length!==b.length){
  const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0)),gap=.20;
  for(let i=0;i<=a.length;i++)for(let j=0;j<=b.length;j++){
   dp[i][j]=!i||!j?gap*(i+j):Math.min(dp[i-1][j-1]+costs[i-1][j-1],dp[i-1][j]+gap,dp[i][j-1]+gap);
  }
  let i=a.length,j=b.length;
  while(i||j){
   if(i&&j&&dp[i][j]===dp[i-1][j-1]+costs[i-1][j-1]){if(costs[i-1][j-1]>.14)bad.add(i);i--;j--;}
   else if(i&&dp[i][j]===dp[i-1][j]+gap){bad.add(i--);}else missing.push(j--);
  }
 }else if(grade.shape?.status==='incorrect'||grade.position?.correct===false){
  const errors=costs.map((row,i)=>row[i]),largest=Math.max(...errors);
  errors.forEach((v,i)=>{if(v>=Math.min(.13,largest)&&v>0)bad.add(i+1);});
 }
 return {bad:[...bad].sort((x,y)=>x-y),missing:missing.sort((x,y)=>x-y)};
}
export function judge(q,input,ref){
 if(q.mode==='math'){
  if(typeof input!=='string'||!/^\d{1,5}$/.test(input))return {correct:null,tip:'請先填入一個數字。'};
  return {correct:Number(input)===mathAnswer(q),parts:['算式'],given:input,tip:hint(q)};
 }
 if(q.mode==='read'||q.mode==='listen'){
  if(typeof input!=='string'||!/^˙?[ㄅ-ㄩ]{1,3}[ˉˊˇˋ˙]?$/.test(input))return {correct:null,tip:'請選注音和聲調。'};
  const result=gradeReading({bopomofo:q.reading},input.replace(/ˉ$/,''));
  const parts=result.errors.map(e=>({initial:'聲母',rime:'韻母',tone:'聲調'}[e.part]));
  return {correct:result.correct,parts,given:input,tip:'聽一聽，再看看'+parts.join('、')+'。正確讀音是 '+q.reading+'。'};
 }
 if(!ref||!Array.isArray(input)||input.length>64||!input.length||input.some(s=>!Array.isArray(s)||!s.length)||input.reduce((n,s)=>n+s.length,0)>2000||
  input.some(s=>s.some(p=>!p||![p.x,p.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))))return {correct:null,tip:'筆跡還不完整，請再寫一次。'};
 const grade=q.mode==='copy'?gradeCopy(input,ref):gradeStrokes(input,ref,{gradingPolicy:'automatic-v1'});
 if(grade.correct==null)return {correct:null,tip:'筆跡還不完整，這次不扣分。請重寫一次。'};
 if(grade.correct)return {correct:true};
 const {bad,missing}=strokeFeedback(input,ref,grade),parts=grade.reasons.map(r=>reasons[r]||'字形');
 return {correct:false,bad,missing,parts,tip:[...new Set(parts)].join('、')+'需要調整。'+(bad.length?'看紅色的第 '+bad.join('、')+' 筆。':'')+(missing.length?'還少了第 '+missing.join('、')+' 筆。':'')};
}
export function score(total,mistakes){
 const lost=Object.values(mistakes).reduce((n,m)=>n+Math.min(m.count,4),0);
 return Math.round((4*total-lost)*10000/(4*total))/100;
}
