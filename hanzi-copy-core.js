import {gradeStrokes} from './hanzi-stroke-core.js';

export const COPY_RULE='hanzi-copy-name-20261116-v1';
export const COPY_REWARD_RULE='copy-per-character-20261117-v3';
export const COPY_TOLERANCE=Object.freeze({offset:.09,scale:.17});
export const COPY_MODES=Object.freeze({copy:{label:'生字模仿',starsPerCharacter:2,limit:10,period:'day'},'name-writing':{label:'看注音，寫姓名',stars:3,limit:900,period:'lifetime'},'name-copy':{label:'姓名模仿',starsPerCharacter:2,limit:1200,period:'lifetime'}});
const point=p=>Array.isArray(p)?{x:p[0],y:p[1]}:p;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function sample(raw,n=32){const s=raw.map(point),lengths=[0];for(let i=1;i<s.length;i++)lengths.push(lengths.at(-1)+distance(s[i-1],s[i]));let j=1;return Array.from({length:n},(_,i)=>{const d=lengths.at(-1)*i/(n-1);while(j<lengths.length-1&&lengths[j]<d)j++;const a=s[Math.max(0,j-1)],b=s[Math.min(j,s.length-1)],t=(d-(lengths[j-1]||0))/Math.max(.000001,(lengths[j]||0)-(lengths[j-1]||0));return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};});}
function box(strokes){const p=strokes.flat().map(point);return [Math.min(...p.map(p=>p.x)),Math.min(...p.map(p=>p.y)),Math.max(...p.map(p=>p.x)),Math.max(...p.map(p=>p.y))];}
// Keep page coordinates: a small or displaced copy must not pass after centering.
// Tolerances permit a child's natural pen movement, not pixel-identical tracing.
export function gradeCopy(strokes,reference,options={}){
 const grade=gradeStrokes(strokes,reference,{gradingPolicy:'automatic-v1',inputInterrupted:options.inputInterrupted===true,inputTooComplex:options.inputTooComplex===true,automaticThresholds:{meanDistance:.105,maxStrokeDistance:.22,reverseDirectionMargin:.018}});
 grade.modelVersion=COPY_RULE;
 if(grade.correct!==true)return grade;
 const actual=box(strokes),expected=box(reference.strokes),ac={x:(actual[0]+actual[2])/2,y:(actual[1]+actual[3])/2},ec={x:(expected[0]+expected[2])/2,y:(expected[1]+expected[3])/2};
 const dx=ac.x-ec.x,dy=ac.y-ec.y,scale=Math.max(actual[2]-actual[0],actual[3]-actual[1])/Math.max(expected[2]-expected[0],expected[3]-expected[1],.00001);
 const distances=strokes.map((s,i)=>{const a=sample(s).map(p=>({x:ec.x+(p.x-ac.x)/scale,y:ec.y+(p.y-ac.y)/scale})),b=sample(reference.strokes[i]);return a.reduce((n,p,j)=>n+distance(p,b[j]),0)/a.length;});
 const mean=distances.reduce((a,b)=>a+b,0)/distances.length,worst=Math.max(...distances);
 grade.position={correct:Math.abs(dx)<=COPY_TOLERANCE.offset+.000001&&Math.abs(dy)<=COPY_TOLERANCE.offset+.000001&&scale>=1-COPY_TOLERANCE.scale-.000001&&scale<=1+COPY_TOLERANCE.scale+.000001&&mean<=.070&&worst<=.13,dx,dy,scale,mean,worst,tolerance:COPY_TOLERANCE};
 if(!grade.position.correct){grade.correct=false;grade.status='incorrect';grade.reasons.push('grid-position-mismatch');}
 return grade;
}
export function copyFeedback(grade){const r=grade?.reasons||[];if(grade?.correct)return '寫對了！';if(r.includes('stroke-order-mismatch'))return '筆順還要調整，再看一次筆順。';if(r.includes('stroke-direction-mismatch'))return '這一筆的方向反了，再試一次。';if(r.includes('grid-position-mismatch'))return '看看字在格子裡的位置和大小，再試一次。';if(r.includes('missing-strokes'))return '還少了筆畫，再寫一次。';if(r.includes('extra-strokes'))return '多了筆畫，再寫一次。';if(grade?.status==='pending')return '筆跡還沒完成，請重新寫一次。';return '看看字形和筆畫，再試一次。';}
