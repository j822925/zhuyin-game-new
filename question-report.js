// Reporting is independent of answering: never advances or edits a round.
export function createQuestionReport({parent,getQuestion,request,demo=false}){
 const area=document.createElement('div');area.className='question-report';
 const button=document.createElement('button');button.type='button';button.id='question-report';button.textContent='🙋 題目回報';
 const status=document.createElement('span');status.id='question-report-status';status.setAttribute('role','status');area.append(button,status);parent.append(area);
 const sent=new Set(),pending=new Set();let current='',generation=0;
 const key=q=>q?JSON.stringify([q.seat,q.mode,q.questionId]):'';
 function refresh(){const q=getQuestion();current=key(q);generation++;button.disabled=!q||sent.has(current)||pending.has(current);button.textContent=sent.has(current)?'✓ 已回報':pending.has(current)?'回報中…':'🙋 題目回報';status.textContent='';}
 button.onclick=async()=>{
  const q=getQuestion(),id=key(q);if(!q||pending.has(id)||sent.has(id))return;
  if(demo){status.textContent='試玩不送出回報';return;}
  pending.add(id);button.disabled=true;button.textContent='回報中…';const revision=generation;
  try{const out=await request({kind:'question-report',...q,bankVersion:q.mode==='single'?'listening-v1':'spelling-v1'});if(out.reported!==true)throw Error('unconfirmed');sent.add(id);}
  catch{if(revision===generation&&current===id)status.textContent='回報失敗，請再按一次';}
  finally{pending.delete(id);if(current===id){button.disabled=sent.has(id);button.textContent=sent.has(id)?'✓ 已回報':'🙋 題目回報';}}
 };
 return {refresh};
}
