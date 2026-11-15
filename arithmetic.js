import {currentClass,classStorageKey,classUrl} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {PROFILE_CHARACTERS} from './student-profile.js?v=20261011-battle1';
import {MONSTERS} from './data/monsters.js?v=20261004-villains1';
import {mountCharacter} from './character-motion.js?v=20261011-battle1';
import {createOpponent,updateOpponent,createBattle} from './character-battle.js?v=20261011-battle1';
import {answer,numeric,grade,hint,equation,configLabel,skillLabel} from './arithmetic-core.js?v=20261115-math2';
import {createArithmeticClient,demoClients,errorText,roundStorage,uid} from './arithmetic-client.js?v=20261115-math2';
import {setupArithmeticAdmin} from './arithmetic-admin.js?v=20261115-math2';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),demo=params.get('demo')==='1',local=['127.0.0.1','localhost'].includes(location.hostname),fixture=local&&params.get('fixture')==='1';
const endpoint=local?location.origin:'https://zhuyin-api.j822925.workers.dev',base=new URL('.',location.href).pathname;
let storage;try{storage=sessionStorage;}catch{}
const sessions=createStudentSession({storage,key:classStorageKey('zhuyin.student-session.v1:'+base+':live')});
let fixtureSession,client,bootstrap,screen='entry',level=10,run=null,rows=[],index=0,input='',first=null,hintUsed=false,tries=0,done=false,secondsAt=Date.now(),busy=false,pending=null,submitId='',resultSaved=false;
const getSession=()=>fixtureSession||sessions.read(),owner=()=>JSON.stringify([currentClass,demo?'demo':fixture?'fixture':'live',demo?'990001':getSession()?.seat||'']);let initialOwner;
const saved=roundStorage({storage,key:classStorageKey('arithmetic.round.v1:'+base+':'+(demo?'demo':fixture?'fixture':'live')),owner});
const opponent=createOpponent();$('opponent-slot').append(opponent);const battle=createBattle(opponent,()=>$('hero'));
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
const button=(text,fn,cls)=>{const b=el('button',text,cls);b.onclick=()=>guard(fn);return b;};
function show(name){battle.reset();screen=name;for(const id of ['entry','play','result'])$(id).hidden=id!==name;$('error').textContent='';window.scrollTo(0,0);}
async function guard(fn){if(busy)return;busy=true;try{if(initialOwner&&owner()!==initialOwner)throw Error('authentication_required');await fn();}catch(e){$('error').textContent=errorText(e);}finally{busy=false;updateInput();}}
function persist(){if(!saved.save({run,rows,index,input,first,hintUsed,tries,done,secondsAt,pending,submitId,resultSaved}))$('storage-warning').textContent='這台裝置暫時無法保留進度，請保持本頁開啟，完成後儲存。';}
async function enter(){bootstrap=await client.request('bootstrap');show('entry');drawLevels();$('resume').hidden=!saved.read();}
function drawLevels(){$('levels').replaceChildren();for(const max of [10,18,99,999,9999]){const b=button('',()=>{level=max;drawLevels();},'level-card');b.dataset.level=max;b.setAttribute('aria-pressed',String(max===level));b.append(el('strong',String(max)),el('span','以內'));$('levels').append(b);}}
function selectedConfig(){return {max:level,operation:$('operation').value,skill:$('skill').value,shape:'any',count:Number($('count').value)};}
async function start(task=null,review=null){if(saved.read()){show('entry');$('resume').hidden=false;$('error').textContent='先接著上次的探險，完成並儲存後就能開始新回合。';return;}
 const data=task?{taskId:task.id}:{config:review?.config||selectedConfig(),...(review?{questionIds:[review.questionId]}:{})};pending={action:task?.kind==='exam'?'exam-start':'practice-start',data:{...data,requestId:uid()}};persist();await continueStart();}
async function continueStart(){const out=await client.request(pending.action,pending.data);run=out.run;if(run.status==='submitted'){saved.clear();resultSaved=true;renderResult(run);return;}pending=null;rows=[];index=0;input='';first=null;hintUsed=false;tries=0;done=false;submitId=uid();resultSaved=false;drawQuestion();}
function q(){return run.questions[index];}
function refreshBattle(){const correct=rows.filter(r=>r.first===answer(run.questions.find(q=>q.id===r.questionId))).length,wrong=rows.length-correct;updateOpponent(opponent,MONSTERS[0],run.questions.length,correct,{requiredLevels:[]});opponent.querySelector('.opponent-remaining').textContent='答對 '+correct+'／'+run.questions.length+' 題';$('hero-hp').max=run.questions.length;$('hero-hp').value=run.questions.length-wrong;}
function clearScratch(){const c=$('scratch');c.getContext('2d').clearRect(0,0,c.width,c.height);}
function drawQuestion(restored=false){show('play');$('play-label').textContent=(run.kind==='exam'?'小考・':run.taskId?'作業・':'')+configLabel(run.config);$('counter').textContent=(index+1)+' / '+run.questions.length;$('progress').max=run.questions.length;$('progress').value=index;$('equation').textContent=equation(q());$('equation').parentElement.dataset.digits=String(run.config.max).length;$('hint-button').hidden=run.kind==='exam';$('scratch-panel').hidden=run.config.max<99;$('scratch-panel').open=false;clearScratch();$('scratch-equation').textContent=String(q().a).padStart(5)+'\n'+(q().op==='add'?'+':'−')+String(q().b).padStart(4)+'\n─────';
 if(!restored){input='';first=null;hintUsed=false;tries=0;done=false;secondsAt=Date.now();}$('feedback').textContent=done?'這一題完成了！':first!==null?'再試一次，慢慢想。':'';$('hint-panel').hidden=!hintUsed;if(hintUsed)drawHint();refreshBattle();updateInput();persist();}
function updateInput(){if(!$('submit'))return;$('answer').textContent=input||'?';$('submit').hidden=done;$('next').hidden=!done;$('next').textContent=run&&index===run.questions.length-1?'完成探險 →':'下一題 →';$('submit').disabled=busy||!input;for(const b of $('keypad').querySelectorAll('button'))b.disabled=done||busy;}
function key(k){if(screen!=='play'||done||busy)return;if(k==='clear')input='';else if(k==='backspace')input=input.slice(0,-1);else if(/^\d$/.test(k)&&input.length<5)input=input==='0'?k:input+k;updateInput();persist();}
for(const k of ['1','2','3','4','5','6','7','8','9','clear','0','backspace']){const b=el('button',k==='clear'?'清除':k==='backspace'?'⌫':k);b.dataset.key=k;b.setAttribute('aria-label',k==='backspace'?'刪除一位':k==='clear'?'清除答案':k);b.onclick=()=>key(k);$('keypad').append(b);}
function record(final){const row={questionId:q().id,first,final,hintUsed,seconds:(Date.now()-secondsAt)/1000};const i=rows.findIndex(x=>x.questionId===q().id);if(i>=0)rows[i]=row;else rows.push(row);}
function submit(){if(done||!input)return;const value=numeric(input),correct=value===answer(q()),initial=first===null;tries++;if(initial)first=value;
 if(initial){record(value);refreshBattle();battle.answer(correct);}
 if(run.kind==='exam'||correct){done=true;record(value);$('feedback').textContent=correct?(initial?'答對了！': '訂正成功！第一次的紀錄會保留。'):'答案已記下，繼續挑戰下一題。';}
 else{hintUsed=true;record(value);drawHint();$('hint-panel').hidden=false;$('feedback').textContent=tries>=2?'答案是 '+answer(q())+'，請再輸入一次，記住這個算法。':'再試一次！可以看看下面的小提示。';input='';}
 updateInput();persist();}
function drawHint(){$('hint-text').textContent=hint(q());$('hint-visual').replaceChildren();if(Math.max(q().a,q().b,answer(q()))<=18){const count=q().op==='add'?q().a+q().b:q().a;for(let i=0;i<count;i++)$('hint-visual').append(el('span','', 'dot'+(q().op==='add'&&i>=q().a?' second':q().op==='sub'&&i>=q().a-q().b?' removed':'')));}}
function showHint(){if(run.kind==='exam')return;hintUsed=true;drawHint();$('hint-panel').hidden=false;if(first!==null)record(rows.find(a=>a.questionId===q().id)?.final??first);persist();}
async function next(){if(!done)return;if(index+1<run.questions.length){index++;drawQuestion();}else{persist();const provisional=grade(run.questions,rows,{exam:run.kind==='exam'});renderResult({...run,result:provisional.result,answers:provisional.rows},false);await save();}}
function renderResult(r,savedResult=true){show('result');const v=r.result;$('result-score').textContent=v.correct+' / '+v.total+' 題';$('reward-status').textContent=savedResult&&v.stars?(demo?'⭐ 試玩獲得 1 顆星':'⭐ 全對！獲得 1 顆星'):'';$('result-detail').textContent='第一次答對 '+v.correct+' 題・獨立答對 '+v.independent+' 題\n使用提示 '+v.assisted+' 題・訂正成功 '+v.corrected+' 題';$('save-status').textContent=savedResult?(demo?'試玩紀錄已儲存在這台裝置。':'學習紀錄已儲存。'):'正在儲存，請保持畫面開啟…';$('retry-save').hidden=savedResult;$('finish').disabled=!savedResult;$('result-rows').replaceChildren();for(const a of r.answers){const row=el('div',undefined,'result-row');row.append(el('b',a.firstCorrect?'✓':'↻'),el('span',equation(a.question)+'＝'+answer(a.question)),el('span','第一次：'+a.first+(a.hintUsed?'・有提示':'')+(a.corrected?'・已訂正':'')));$('result-rows').append(row);}}
async function save(){try{const out=await client.request('submit',{roundId:run.id,requestId:submitId,answers:rows});resultSaved=true;run=out.run;saved.clear();renderResult(run);}catch(e){$('save-status').textContent='還沒有儲存成功，答案已保留，請重試。';$('retry-save').hidden=false;$('finish').disabled=true;persist();throw e;}}
async function resume(){const v=saved.read();if(!v)return;({run,rows,index,input,first,hintUsed,tries,done,secondsAt,pending,submitId,resultSaved}=v);if(pending){await continueStart();return;}if(!run?.questions?.[index]){throw Error('invalid_answers');}if(index===run.questions.length-1&&done&&rows.length===run.questions.length){const g=grade(run.questions,rows,{exam:run.kind==='exam'});renderResult({...run,answers:g.rows,result:g.result},false);await save();}else drawQuestion(true);}
function back(){if(params.get('from')==='exams'||params.get('from')==='notebook'){location.href=classUrl(params.get('from')==='exams'?'exam.html':'notebook.html?mode=arithmetic');return;}if(screen==='entry')location.href=classUrl('./');else guard(enter);}
$('start').onclick=()=>guard(()=>start());$('resume').onclick=()=>guard(resume);$('back').onclick=back;$('finish').onclick=back;$('submit').onclick=submit;$('next').onclick=()=>guard(next);$('hint-button').onclick=showHint;$('retry-save').onclick=()=>guard(save);$('clear-scratch').onclick=clearScratch;
window.addEventListener('keydown',e=>{if(screen!=='play'||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(/^\d$/.test(e.key)){e.preventDefault();key(e.key);}else if(e.key==='Backspace'){e.preventDefault();key('backspace');}else if(e.key==='Enter'&&!busy){e.preventDefault();done?guard(next):submit();}});
let drawing=false;const canvas=$('scratch'),ctx=canvas.getContext('2d');const point=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height];};canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...point(e));};canvas.onpointermove=e=>{if(!drawing)return;ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#294d41';ctx.lineTo(...point(e));ctx.stroke();};canvas.onpointerup=canvas.onpointercancel=()=>drawing=false;
async function boot(){
 $('home-link').href=classUrl('./');$('demo-note').hidden=!demo;
 if(fixture){const r=await fetch('/arithmetic-fixture/session?class='+encodeURIComponent(currentClass));if(!r.ok)throw Error('authentication_required');fixtureSession=await r.json();}
 if(demo){let persistent;try{persistent=localStorage;}catch{}({student:client}=demoClients({storage:persistent,classId:currentClass}));$('identity').textContent='試玩小勇士';}

 else{if(!getSession())throw Error('authentication_required');client=createArithmeticClient({endpoint,classId:currentClass,getSession});$('identity').textContent=getSession().seat+' 號';}
 initialOwner=owner();let hero=PROFILE_CHARACTERS[0];
 if(!demo&&!fixture){const s=getSession();try{const r=await fetch(classUrl(endpoint+'/api'),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({kind:'profile',seat:s.seat,token:s.token})});const p=await r.json();hero=PROFILE_CHARACTERS.find(c=>c.id===p.avatar)||hero;}catch{}}
 mountCharacter($('hero'),hero);
 await enter();$('loading').hidden=true;
 const taskId=params.get('task'),reviewId=params.get('review');
 if(taskId){const task=[...bootstrap.exams,...bootstrap.assignments].find(t=>t.id===taskId);if(!task)throw Error('task_closed');await guard(()=>start(task));}
 else if(reviewId){const data=await client.request('notebook'),item=data.items.find(x=>x.questionId===reviewId);if(!item)throw Error('not_found');await guard(()=>start(null,item));}
}
boot().catch(e=>{$('loading').hidden=true;$('error').textContent=errorText(e);});
