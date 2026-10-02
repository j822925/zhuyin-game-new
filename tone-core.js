export const TONES=[{value:1,name:'一聲',mark:'─'},{value:2,name:'二聲',mark:'ˊ'},{value:3,name:'三聲',mark:'ˇ'},{value:4,name:'四聲',mark:'ˋ'},{value:5,name:'輕聲',mark:'˙'}];
export function validateBank(bank){
 if(!bank||typeof bank.version!=='string'||!Array.isArray(bank.questions)||!Array.isArray(bank.disabledIds))throw Error('題庫格式有誤');
 const ids=new Set();
 for(const q of bank.questions){
  if(!/^word-[a-f0-9-]+$/.test(q.id)||ids.has(q.id)||typeof q.text!=='string'||q.text.length<2||q.text.length>6)throw Error('題目資料有誤');
  ids.add(q.id);
  for(const name of ['lexicalTones','surfaceTones'])if(!Array.isArray(q[name])||q[name].length!==[...q.text].length||q[name].some(t=>!Number.isInteger(t)||t<1||t>5))throw Error('聲調答案有誤');
  const changed=q.lexicalTones.some((t,i)=>t!==q.surfaceTones[i]);
  if(q.mode!==(changed?'sandhi':'basic')||!/^audio\/tone-stage-[0-9]+\/word-[a-f0-9-]+\.mp3$/.test(q.audioUrl)||typeof q.enabled!=='boolean')throw Error('題目音檔或分類有誤');
 }
 return bank;
}
export function poolFor(bank,mode='basic',length='all'){
 if(!['basic','sandhi','all'].includes(mode)||!['short','medium','all'].includes(length))return [];
 return bank.questions.filter(q=>q.enabled&&!bank.disabledIds.includes(q.id)&&(mode==='all'||q.mode===mode)&&(length==='all'||(length==='short'?q.text.length===2:q.text.length>=3)));
}
export function makeDeck(pool,rng=Math.random){
 const deck=[...new Map(pool.map(q=>[q.id,q])).values()];
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return deck.slice(0,10);
}
export function grade(q,answers){
 // Every mode assesses written, original tones; surface tones only classify audio.
 if(answers.length!==q.lexicalTones.length||answers.some(t=>!Number.isInteger(t)||t<1||t>5))throw Error('請先選完每個字的聲調');
 const correct=q.lexicalTones.map((t,i)=>t===answers[i]);return {id:q.id,answers:[...answers],correct,wholeCorrect:correct.every(Boolean)};
}
export function summarize(results){const valid=results.filter(r=>!r.skipped);return {whole:valid.filter(r=>r.wholeCorrect).length,total:valid.length,characters:valid.reduce((n,r)=>n+r.correct.length,0),correct:valid.reduce((n,r)=>n+r.correct.filter(Boolean).length,0),skipped:results.filter(r=>r.skipped).length};}
