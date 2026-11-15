export const VERSION='arithmetic-v1';
export const LEVELS=[10,18,99,999,9999];
export const fail=(code,status=400)=>{throw Object.assign(Error(code),{status});};
export const clone=value=>structuredClone(value);
export function config(value={}){
 const c={max:value.max??10,operation:value.operation??'mix',skill:value.skill??'mixed',shape:value.shape??'any',count:value.count??10};
 if(!LEVELS.includes(c.max)||!['add','sub','mix'].includes(c.operation)||!['basic','regroup','mixed'].includes(c.skill)||!['any','large-small','large-large'].includes(c.shape)||![5,10,20].includes(c.count))fail('invalid_config');
 if(c.max<99&&c.shape!=='any')fail('invalid_config');return c;
}
export const answer=q=>q.op==='add'?q.a+q.b:q.a-q.b;
export function regroup(q){let a=q.a,b=q.b;while(a||b){if(q.op==='add'?a%10+b%10>=10:a%10<b%10)return true;a=Math.floor(a/10);b=Math.floor(b/10);}return false;}
export const questionKey=q=>[q.op,q.a,q.b].join('-');
export function validQuestion(q,c){
 if(!q||!['add','sub'].includes(q.op)||!Number.isInteger(q.a)||!Number.isInteger(q.b)||Math.min(q.a,q.b)<0||Math.max(q.a,q.b,answer(q))>c.max||answer(q)<0)return false;
 if(c.operation!=='mix'&&q.op!==c.operation)return false;
 if(c.skill!=='mixed'&&regroup(q)!==(c.skill==='regroup'))return false;
 const floor=10**(String(c.max).length-1);
 if(c.shape==='large-small'&&!(q.a>=floor&&q.b<10))return false;
 if(c.shape==='large-large'&&!(q.a>=floor&&q.b>=floor))return false;
 return true;
}
export function shuffle(values,rng=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function generate(value={},rng=Math.random){
 const c=config(value),ops=c.operation==='mix'?['add','sub']:[c.operation],pool=[];
 const add=(a,b,op)=>{const q={a,b,op};if(validQuestion(q,c))pool.push({...q,id:questionKey(q),regroup:regroup(q)});};
 if(c.max<=99){for(const op of ops)for(let a=0;a<=c.max;a++)for(let b=0;b<=c.max;b++)add(a,b,op);}
 else{for(const op of ops)for(let i=0;i<12000;i++){const a=Math.floor(rng()*(c.max+1)),b=c.shape==='large-small'?Math.floor(rng()*10):Math.floor(rng()*(c.max+1));add(a,b,op);}for(const op of ops)for(const a of [0,1,10,Math.floor(c.max/2),c.max]){add(a,0,op);add(a,a,op);}}
 const unique=[...new Map(pool.map(q=>[q.id,q])).values()],out=[];
 for(let oi=0;oi<ops.length;oi++){
  const op=ops[oi],n=Math.floor(c.count/ops.length)+(oi<c.count%ops.length?1:0),items=shuffle(unique.filter(q=>q.op===op),rng);
  if(items.length<n)fail('scope_too_small');
  const zeros=items.filter(q=>q.a===0||q.b===0||answer(q)===0),zeroCount=Math.min(zeros.length,Math.max(1,Math.floor(n*.2)));
  let selected=zeros.slice(0,zeroCount),rest=items.filter(q=>!selected.some(s=>s.id===q.id)&&q.a!==0&&q.b!==0&&answer(q)!==0);
  // Higher levels favour their actual place value, rather than mostly easy facts.
  if(c.max>=99){const floor=10**(String(c.max).length-1);rest.sort((a,b)=>Number(Math.max(b.a,b.b)>=floor)-Number(Math.max(a.a,a.b)>=floor));}
  selected.push(...rest.slice(0,n-selected.length));if(selected.length<n)selected.push(...items.filter(q=>!selected.some(s=>s.id===q.id)).slice(0,n-selected.length));out.push(...selected);
 }
 return shuffle(out,rng);
}
export function numeric(value){if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=19998)return value;if(typeof value==='string'&&/^\d{1,5}$/.test(value)&&Number(value)<=19998)return Number(value);fail('invalid_answer');}
export function grade(questions,answers,{exam=false}={}){
 if(!Array.isArray(answers)||answers.length!==questions.length||new Set(answers.map(a=>a?.questionId)).size!==questions.length)fail('invalid_answers');
 const rows=questions.map(q=>{const a=answers.find(a=>a?.questionId===q.id);if(!a)fail('invalid_answers');const first=numeric(a.first),final=numeric(a.final),hintUsed=a.hintUsed===true;if(exam&&(hintUsed||final!==first))fail('invalid_answers');const firstCorrect=first===answer(q),corrected=!firstCorrect&&final===answer(q);return {questionId:q.id,question:q,first,final,firstCorrect,corrected,hintUsed,seconds:Math.min(3600,Math.max(0,Number(a.seconds)||0))};});
 const correct=rows.filter(r=>r.firstCorrect).length,assisted=rows.filter(r=>r.hintUsed).length,independent=rows.filter(r=>r.firstCorrect&&!r.hintUsed).length;
 return {rows,result:{total:rows.length,correct,independent,assisted,corrected:rows.filter(r=>r.corrected).length,score:Math.round(correct/rows.length*100),perfect:independent===rows.length}};
}
export function hint(q){
 const a=q.a,b=q.b;
 if(q.op==='add'&&b===0)return '加上 0，數量沒有增加。';
 if(q.op==='sub'&&b===0)return '減去 0，數量沒有減少。';
 if(q.op==='sub'&&a===b)return '全部拿走了，還剩下多少？';
 if(a<=9&&b<=9&&a+b>=10&&q.op==='add'){const need=10-a;return `${a} 再加 ${need} 就是 10，把 ${b} 分成 ${need} 和 ${b-need}，先湊成 10。`;}
 if(q.op==='sub'&&a>10&&a<=18&&b>a-10)return `先從 ${a} 減去 ${a-10}，到 10；再減去剩下的 ${b-(a-10)}。`;
 if(Math.max(a,b)<=18)return q.op==='add'?`先放 ${a} 個，再放 ${b} 個，合起來數一數。`:`有 ${a} 個，拿走 ${b} 個，再數剩下的。`;
 return q.op==='add'?'個位對個位、十位對十位。從個位開始加，滿 10 就往左進 1。':'個位對個位、十位對十位。從個位開始減，不夠減就向左邊借 1。';
}
export const equation=q=>`${q.a} ${q.op==='add'?'＋':'－'} ${q.b}`;
export const configLabel=c=>`${c.max} 以內・${{add:'加法',sub:'減法',mix:'加減混合'}[c.operation]}・${{basic:'不進退位',regroup:'進位／退位',mixed:'綜合'}[c.skill]}`;
export const skillLabel=q=>(q.op==='add'?'加法':'減法')+(regroup(q)?q.op==='add'?'・進位':'・退位':'・基礎');
