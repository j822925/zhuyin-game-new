import {COPY_MODES} from './hanzi-copy-core.js?v=20261116-copy1';
export async function renderCopyNotebook(host,{session,endpoint,classId,classUrl,current=()=>true}){
 const section=document.createElement('section');section.className='copy-notebook';host.append(section);
 try{const r=await fetch(new URL('/hanzi/copy/notebook',endpoint),{method:'POST',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify({classId})});if(!r.ok)throw Error();const data=await r.json();if(!current())return 0;
  for(const item of data.items){const row=document.createElement('div');row.className='math-review-row';const text=document.createElement('div'),strong=document.createElement('strong'),label=document.createElement('p');strong.textContent=item.character+' · '+item.question.bopomofo;label.textContent=COPY_MODES[item.mode].label;text.append(strong,label);const a=document.createElement('a');a.className='math-review-start';a.textContent='再練一次 →';const u=new URL(classUrl('hanzi-copy.html'),location.href);u.searchParams.set('mode',item.mode);u.searchParams.set('review',item.character);a.href=u.href;row.append(text,a);section.append(row);}return data.items.length;
 }catch{if(current()){section.textContent='書寫練習錯題暫時無法讀取，請重新連線。';}return null;}
}
