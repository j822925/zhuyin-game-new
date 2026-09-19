// Public schedule only; all attempts/answers still require the student's PIN.
export function setupExamEntry({endpoint,home,demo}){
 if(demo)return;
 const panel=document.createElement('aside');panel.className='notice';panel.setAttribute('aria-label','老師小考');
 const link=document.createElement('a');link.href='exam.html';link.textContent='📝 老師小考（25 題）';panel.append(link);home.prepend(panel);
 async function refresh(){try{const r=await fetch(endpoint+'?api=exams',{cache:'no-store'}),out=await r.json();const active=out.exams?.find(e=>e.starts<=out.serverNow&&e.ends>out.serverNow);link.href=active?'exam.html?id='+encodeURIComponent(active.id):'exam.html';link.textContent=active?'📝 小考進行中：'+active.title+'（25 題）':'📝 老師小考（查看時間／接續）';}catch{link.textContent='📝 老師小考（點此確認時間）';}}
 refresh();setInterval(()=>{if(!document.hidden&&!home.hidden)refresh();},60000);
}
