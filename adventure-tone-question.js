import {validateBank,poolFor} from './tone-core.js';
let bankJob;
export function toneTargetQuestion(q,index,version){
 const chars=[...q.text];
 if(!Number.isInteger(index)||index<0||index>=chars.length)throw Error('聲調字位有誤');
 return {id:q.id+':'+index,sourceId:q.id,bankVersion:version,label:q.text,audio:q.audioUrl+'?v='+encodeURIComponent(q.audioVersion||version),tone:q.lexicalTones[index],targetIndex:index,targetCharacter:chars[index]};
}
export async function teacherToneDeck(count=1,rng=Math.random){
 if(!bankJob)bankJob=fetch('tone-questions.json?v=20261011-teacher1').then(r=>{if(!r.ok)throw Error('老師題庫尚未載入');return r.json();}).then(validateBank).catch(e=>{bankJob=null;throw e;});
 const bank=await bankJob,pool=poolFor(bank,'all','all');
 if(!pool.length)throw Error('沒有可用的老師聲調題');
 const deck=[];
 for(let i=0;i<count;i++){const q=pool[Math.floor(rng()*pool.length)];deck.push(toneTargetQuestion(q,Math.floor(rng()*[...q.text].length),bank.version));}
 return {deck,pool};
}
export function appendToneTarget(host,q){
 host.classList.add('forest-tone-panel');
 const line=document.createElement('div');line.className='forest-tone-target';
 [...q.label].forEach((char,i)=>{const node=document.createElement(i===q.targetIndex?'mark':'span');node.textContent=char;line.append(node);});
 const hint=document.createElement('small');hint.textContent='選「'+q.targetCharacter+'」的聲調';
 host.append(line,hint);
}
