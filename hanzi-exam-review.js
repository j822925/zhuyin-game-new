// Read-only views of the submitted snapshot; never replace original ink with a reference.
export function scoreLabel(result){if(!result)return '尚未交卷';if(result.pending||result.score==null)return '待判定';return result.score+' 分';}
export function reviewItems(run){return (run.snapshot?.questions||[]).map((question,i)=>{const row=(run.answers||[]).find(a=>a.questionId===question.id);const correct=row?.teacherReview?.correct??row?.grade?.correct;return {number:i+1,question,answer:row?.answer,correct,status:correct===true?'correct':correct===false?'incorrect':'pending',review:row?.teacherReview};});}
export function inkPaths(answer){const raw=answer?.strokes;if(!Array.isArray(raw))return [];const paths=raw.map(s=>(Array.isArray(s)?s:s?.points||[]).map(p=>({x:Number(Array.isArray(p)?p[0]:p.x),y:Number(Array.isArray(p)?p[1]:p.y)})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).filter(s=>s.length);const max=Math.max(1,...paths.flatMap(s=>s.flatMap(p=>[p.x,p.y]))),frame=answer.frame||answer,width=Number(frame.width||frame.canvasWidth)||(max<=1.5?1:max<=1024?1024:max),height=Number(frame.height||frame.canvasHeight)||width;return paths.map(s=>s.map(p=>({x:p.x/width,y:p.y/height})));}

export function mountExamReview(host,run,{loadReference}={}){
 const doc=host.ownerDocument,node=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;},cleanups=[];let disposed=false;
 const root=node('div');root.className='exam-ink-review';host.replaceChildren(root);
 const filters=node('div');filters.className='exam-review-actions';const all=node('button','全部題目'),wrong=node('button','只看錯題');all.type=wrong.type='button';filters.append(all,wrong);root.append(filters);
 const list=node('div');root.append(list);const rows=reviewItems(run),cards=[];
 for(const r of rows){const card=node('article');card.className='exam-ink-card';card.dataset.status=r.status;const q=r.question;
 card.append(node('h3','第 '+r.number+' 題 · '+q.word+' · '+q.bopomofo),node('p',r.status==='correct'?'✓ 答對':r.status==='incorrect'?'↻ 答錯':'◷ 尚未完成判定'));
 if(r.review)card.append(node('p','老師已複核：'+(r.review.correct?'答對':'答錯')));
 if(run.mode==='writing'){
 const details=node('details'),summary=node('summary','查看我原本寫的字與筆順');details.append(summary);card.append(details);let built=false;
 details.addEventListener('toggle',()=>{if(!details.open||built||disposed)return;built=true;const paths=inkPaths(r.answer),columns=node('div');columns.className='exam-ink-columns';details.append(columns);
 const addBoard=(label,initial)=>{const col=node('section');col.append(node('h4',label));const canvas=node('canvas');canvas.width=canvas.height=480;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label+'：第 '+r.number+' 題');col.append(canvas);const controls=node('div');controls.className='exam-review-actions';col.append(controls);const status=node('p');status.setAttribute('role','status');col.append(status);columns.append(col);const ctx=canvas.getContext('2d');let data=initial,token=0,index=initial.length;
 function draw(n){ctx.clearRect(0,0,480,480);ctx.fillStyle='#fff';ctx.fillRect(0,0,480,480);ctx.strokeStyle='#dbe4d9';ctx.lineWidth=1;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(240,0);ctx.lineTo(240,480);ctx.moveTo(0,240);ctx.lineTo(480,240);ctx.stroke();ctx.setLineDash([]);ctx.lineWidth=7;ctx.lineCap=ctx.lineJoin='round';for(const stroke of data.slice(0,n)){ctx.strokeStyle=ctx.fillStyle='#263d35';ctx.beginPath();if(stroke.length===1){ctx.arc(stroke[0].x*480,stroke[0].y*480,3.5,0,Math.PI*2);ctx.fill();}else{stroke.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x*480,p.y*480));ctx.stroke();}}status.textContent=data.length?'第 '+n+'／'+data.length+' 筆':'';index=n;}
 const btn=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;controls.append(b);return b;};
 const stop=()=>{token++;};async function replay(){const own=++token;draw(0);for(let n=1;n<=data.length;n++){await new Promise(resolve=>setTimeout(resolve,450));if(disposed||own!==token||!details.open||doc.hidden)return;draw(n);}}
 draw(index);cleanups.push(stop);return {col,controls,status,draw,stop,replay,btn,set(paths){stop();data=paths;draw(data.length);},previous(){stop();draw(Math.max(0,index-1));},next(){stop();draw(Math.min(data.length,index+1));},complete(){stop();draw(data.length);}};
 };
 const original=addBoard('我原本寫的字',paths);if(paths.length){original.btn('重播我的筆畫',original.replay);original.btn('上一筆',original.previous);original.btn('下一筆',original.next);original.btn('看完整筆跡',original.complete);}else original.status.textContent='這份紀錄沒有保存原始筆跡，無法還原當時寫的字。';
 const reference=addBoard('正確筆順示範',[]);const play=reference.btn('看正確筆順',async()=>{if(play.disabled)return;play.disabled=true;reference.status.textContent='讀取筆順…';try{const ref=await loadReference?.(q.character);if(disposed)return;if(!ref?.strokes?.length)throw Error('unavailable');reference.set(ref.strokes.map(s=>s.map(p=>({x:p[0],y:p[1]}))));reference.status.textContent='正確筆順示範';await reference.replay();}catch{if(!disposed)reference.status.textContent='筆順暫時讀取不到，原始筆跡仍可查看。請再試一次。';}finally{play.disabled=false;}});
 details.addEventListener('toggle',()=>{if(!details.open){original.stop();reference.stop();}});
 });
 }else{const answer=r.answer;card.append(node('p','我當時選的注音：'+(answer?[answer.initial,answer.rime??answer.final,({'1':'一聲','2':'ˊ','3':'ˇ','4':'ˋ','5':'˙'})[answer.tone]||answer.tone].filter(x=>x!==undefined&&x!=='').join(' ')||'未作答':'未作答')));}
 list.append(card);cards.push(card);}
 const empty=node('p','這場沒有錯題。');empty.hidden=true;root.append(empty);
 const filter=only=>{cards.forEach(card=>card.hidden=only&&card.dataset.status!=='incorrect');empty.hidden=!only||cards.some(card=>!card.hidden);all.setAttribute('aria-pressed',String(!only));wrong.setAttribute('aria-pressed',String(only));cleanups.forEach(stop=>stop());};all.onclick=()=>filter(false);wrong.onclick=()=>filter(true);filter(false);
 const stop=()=>cleanups.forEach(fn=>fn());doc.addEventListener('visibilitychange',stop);doc.defaultView?.addEventListener('pagehide',stop);
 return ()=>{disposed=true;stop();doc.removeEventListener('visibilitychange',stop);doc.defaultView?.removeEventListener('pagehide',stop);root.remove();};
}

export function createExamHistory({host,request,loadReference}){
 const doc=host.ownerDocument,node=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;};let version=0,dispose=null;
 host.classList.add('exam-history');host.hidden=true;
 const button=(label,fn)=>{const b=node('button',label);b.type='button';b.onclick=fn;return b;};
 function clear(){version++;dispose?.();dispose=null;host.replaceChildren();}
 function close(){clear();host.hidden=true;}
 async function load(){clear();const ticket=version;host.hidden=false;host.append(node('h2','我的國字小考成績'),button('收起紀錄',close),node('p','讀取成績…'));
 try{const out=await request('exam-results');if(ticket!==version)return;host.replaceChildren(node('h2','我的國字小考成績'),node('p','孩子與家長可查看本帳號已交卷的成績和原始答案。'),button('收起紀錄',close));
 if(!out.exams.length)host.append(node('p','目前沒有已交卷的國字小考。'));
 for(const exam of out.exams){const card=node('article');card.className='exam-history-row';const time=exam.result?.completedAt||exam.updatedAt;card.append(node('strong',exam.title),node('p',(exam.mode==='writing'?'看注音寫國字':'看國字拼注音')+' · '+new Date(time).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})),node('strong',scoreLabel(exam.result)),node('p',(exam.result?.correct??0)+'／'+exam.result?.total+' 題答對'),button('查看成績與原始答案',()=>open(exam)));host.append(card);}
 }catch{if(ticket===version)host.replaceChildren(node('p','成績暫時讀取不到，請再試一次。'),button('重新讀取',load),button('收起紀錄',close));}}
 async function open(exam){clear();const ticket=version;host.append(button('返回成績列表',load),node('p','讀取本場紀錄…'));
 try{const out=await request('exam-results',{examId:exam.examId});if(ticket!==version)return;host.replaceChildren(button('返回成績列表',load),node('h2',out.title||exam.title),node('h3',scoreLabel(out.run.result)),node('p',out.run.result.correct+'／'+out.run.result.total+' 題答對。這是已保存的紀錄，查看不會更改成績。'));const details=node('div');host.append(details);dispose=mountExamReview(details,out.run,{loadReference});
 }catch{if(ticket===version)host.replaceChildren(node('p','本場紀錄暫時讀取不到。'),button('重試',()=>open(exam)),button('返回成績列表',load));}}
 return {load,close};
}
