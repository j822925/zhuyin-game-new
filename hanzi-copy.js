import {showRoundOutcome} from './round-outcome.js?v=20261127-defeat1';
import {createFarmLessonLink} from './farm-lesson-link.js?v=20261122-farm6';
import {COPY_MODES,COPY_RULE,COPY_REWARD_RULE,gradeCopy,copyFeedback} from './hanzi-copy-core.js?v=20261119-stars';
import {gradeStrokes} from './hanzi-stroke-core.js';
import {createHandwriting} from './hanzi-handwriting.js?v=20261127-alltrace1';
import {currentClass,classStorageKey,classUrl} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),demo=params.get('demo')==='1',mode=COPY_MODES[params.get('mode')]?params.get('mode'):'copy',rule=COPY_MODES[mode];
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname),endpoint=local?location.origin:'https://zhuyin-api.j822925.workers.dev';
let storage;try{storage=sessionStorage;}catch{}
const sessions=createStudentSession({storage,key:classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live')});
const reviewChar=params.get('review'),session=sessions.read(),owner=demo?'demo':session?.seat,key=classStorageKey('zhuyin.copy-name.v1:'+new URL('.',location.href).pathname+':'+owner+':'+mode+(reviewChar?':review:'+reviewChar:'')+(demo?':demo':''));
const completionReward=mode!=='name-writing'&&!reviewChar;
const farm=createFarmLessonLink({family:'copy',demo,getSession:()=>sessions.read(),excluded:()=>!!reviewChar});
let state,board,busy=false,drawing=false,interrupted=false,tooComplex=false,epoch=0,restoring=false;
const uid=()=>crypto.randomUUID(),q=()=>state?.run.snapshot.questions[state.index];
$('title').textContent=rule.label;document.title=rule.label+'｜池東探險島';$('preview').hidden=!demo;
$('reward-rule').textContent=reviewChar?'錯題本訂正：寫對即可完成，不另發星星。':mode==='copy'?'每完成 1 個字得 2 顆星，完成一輪 5 個字得 10 顆星；每日最多 10 顆星。':mode==='name-copy'?'每完成 1 個字得 2 顆星，兩字姓名得 4 顆、三字姓名得 6 顆；累計最多 1200 顆星，沒有每日上限。':'姓名首次全部寫對得 3 顆星，累計最多 900 顆星。';
for(const[id,file]of [['home','index.html'],['camp','hanzi.html'],['daily','daily.html']]){const u=new URL(classUrl(file));if(demo)u.searchParams.set('demo','1');$(id).href=u.href;}
function persist(){try{storage?.setItem(key,JSON.stringify(state));}catch{$('error').textContent='此裝置無法保存未完成進度，請保持本頁開啟。';}}
function failure(e){$('error').textContent=e.userMessage||({'authentication_required':'請回學習廣場登入。',name_not_ready:'老師還沒設定你的姓名練習。',template_unavailable:'筆順尚未準備好。'})[e.message]||'暫時無法儲存，請再試一次。';}
async function api(action,payload={}){if(!session||session.expires<=Date.now()||sessions.read()?.seat!==owner||sessions.read()?.token!==session.token)throw Error('authentication_required');const control=new AbortController(),timer=setTimeout(()=>control.abort(),20000);try{const r=await fetch(new URL('/hanzi/copy/'+action,endpoint),{method:'POST',cache:'no-store',credentials:'omit',signal:control.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify({...payload,classId:currentClass})});const out=await r.json();if(!r.ok)throw Object.assign(Error(out.code),{userMessage:out.error});return out;}finally{clearTimeout(timer);}}
async function demoRun(){let chars=mode==='copy'?[...'手上下左右']:[...'李子'],readings=mode==='copy'?['ㄕㄡˇ','ㄕㄤˋ','ㄒㄧㄚˋ','ㄗㄨㄛˇ','ㄧㄡˋ']:['ㄌㄧˇ','ㄗˇ'];if(reviewChar){const i=chars.indexOf(reviewChar);if([...reviewChar].length!==1||(mode==='name-writing'&&i<0))throw Error('template_unavailable');chars=[reviewChar];readings=[i<0?'':readings[i]];}const questions=await Promise.all(chars.map(async(c,i)=>{const r=await fetch('data/hanzi-copy/U'+c.codePointAt(0).toString(16).toUpperCase()+'.json');if(!r.ok)throw Error('template_unavailable');return{id:uid(),character:c,bopomofo:readings[i],reference:await r.json(),nameIndex:i,nameLength:chars.length};}));return {id:uid(),mode,status:'started',snapshot:{questions,mode,rule:COPY_RULE,rewardRule:mode==='name-writing'?COPY_RULE:COPY_REWARD_RULE}};}
function setBusy(value){busy=value;update();}
const isTracing=()=>board?.isTracePractice()===true;
const controlsLocked=()=>busy||restoring||['passed','demo','answered'].includes(state?.phase);
const canContinue=()=>state?.phase==='passed'||(completionReward&&state?.phase==='answered'&&!!state.answers[state.index]);
function update(){
 const tracing=isTracing();
 const done=canContinue();
 $('trace-toggle').hidden=!board||$('practice').hidden;
 $('practice').closest('.copy-shell').classList.toggle('trace-session',!$('trace-toggle').hidden);
 $('trace-toggle').textContent=tracing?'關閉底字，回到挑戰':'開啟淡色底字';
 $('trace-toggle').setAttribute('aria-pressed',String(tracing));
 $('trace-note').hidden=!tracing;
 $('reward-rule').hidden=tracing;
 $('feedback').hidden=tracing;
 $('demo').disabled=busy||state?.phase==='passed';
 $('demo').hidden=tracing||(mode==='name-writing'&&state?.phase!=='demo');
 $('demo').textContent=state?.phase==='demo'?'▶ 看完筆順，再重寫':state?.phase==='answered'?'▶ 看筆順，再練一次':'▶ 看筆順';
 $('submit').hidden=tracing||done;
 $('next').hidden=tracing||!done;
 $('next').disabled=busy;
 $('next').textContent=state?.index+1===state?.run?.snapshot.questions.length?'完成練習 ★':'下一個字 →';
 updateButtonsOnly();
 board?.setDisabled(controlsLocked());
}
function showAnswerFeedback(){const answered=state.phase==='answered';$('feedback').textContent=state.phase==='passed'?'寫對了！':answered?copyFeedback(grade(state.answers[state.index].final.strokes))+(state.index+1===state.run.snapshot.questions.length?' 也可以完成練習。':' 也可以繼續下一個字。'):state.phase==='demo'?'看完正確筆順，再寫一次。':'';$('feedback').dataset.correct=String(state.phase==='passed');}
function renderReference(ref){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1 1');svg.setAttribute('role','img');svg.setAttribute('aria-label',ref.character+'的田字格範例');const grid=document.createElementNS(ns,'path');grid.setAttribute('d','M .5 0 V 1 M 0 .5 H 1');grid.setAttribute('class','grid');svg.append(grid);for(const d of ref.outlines||ref.strokes.map(s=>'M '+s.map(p=>p.join(' ')).join(' L '))){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class',ref.outlines?'glyph':'line');svg.append(path);}$('reference').replaceChildren(svg);}
async function draw(){farm.show('play');const version=++epoch;restoring=true;board?.destroy();board=null;drawing=false;interrupted=false;tooComplex=false;$('writing').replaceChildren();$('practice').hidden=false;$('result').hidden=true;$('loading').hidden=true;const item=q(),n=state.run.snapshot.questions.length;
 $('progress-label').textContent=(state.index+1)+' / '+n;$('progress').max=n;$('progress').value=state.index;$('prompt').textContent=mode==='name-writing'?item.bopomofo:'';const show=mode!=='name-writing'||state.first?.[state.index]?.grade.correct===false;$('reference-panel').hidden=!show;$('boards').classList.toggle('single',!show);renderReference(item.reference);
 const instance=createHandwriting($('writing'),{allowDemo:true,traceFeedbackElement:$('trace-note'),loadReference:async()=>item.reference,onChange:info=>{if(restoring||board!==instance||version!==epoch)return;drawing=info.isDrawing;interrupted=info.inputInterrupted;tooComplex=info.inputTooComplex;state.ink=info.strokes;state.interrupted=info.inputInterrupted||info.isDrawing;persist();updateButtonsOnly();}});board=instance;await board.load(item.character);if(version!==epoch)return;if(state.ink?.length){const restored=board.restoreStrokes(state.ink,{inputInterrupted:!!state.interrupted});interrupted=restored&&!!state.interrupted;if(!restored){state.ink=[];state.interrupted=false;persist();}}
 // Old drafts stored a rejected copy in ink/first, but only stored answers after correction.
 if(completionReward&&state.phase==='demo'){const answer={strokes:board.getStrokes(),inputInterrupted:interrupted,inputTooComplex:tooComplex},g=grade(answer.strokes);if(state.first[state.index]&&g.status!=='pending'){state.answers[state.index]={questionId:item.id,first:state.first[state.index].answer,final:answer};state.phase=g.correct?'passed':'answered';}else state.phase='write';persist();}
 if(state.phase==='answered'&&!state.answers[state.index]){state.phase='write';persist();}
 $('progress').value=state.index+(canContinue()?1:0);showAnswerFeedback();restoring=false;update();window.scrollTo(0,0);
}
// setDisabled triggers onChange; keep that callback free of recursive setDisabled.
function updateButtonsOnly(){
 const locked=controlsLocked()||drawing;
 $('undo').disabled=locked;
 $('clear').disabled=locked;
 $('submit').disabled=locked||isTracing()||!board?.getStrokes().length||interrupted||tooComplex;
 $('trace-toggle').disabled=locked||!board||state?.phase!=='write';
}
$('trace-toggle').onclick=()=>{
 if(!board||state?.phase!=='write'||controlsLocked()||drawing)return;
 board.setTracePractice(!isTracing());
 $('feedback').textContent='';
 delete $('feedback').dataset.correct;
 update();
};
function grade(strokes){const opts={inputInterrupted:interrupted||drawing,inputTooComplex:tooComplex};return mode==='name-writing'?gradeStrokes(strokes,q().reference,{...opts,gradingPolicy:'automatic-v1'}):gradeCopy(strokes,q().reference,opts);}
$('submit').onclick=()=>{if(!board||controlsLocked()||drawing||isTracing()||state.phase!=='write')return;const answer={strokes:board.getStrokes(),inputInterrupted:interrupted||drawing,inputTooComplex:tooComplex},g=grade(answer.strokes);$('feedback').textContent=copyFeedback(g);$('feedback').dataset.correct=String(g.correct===true);if(g.status==='pending')return;if(!state.first[state.index])state.first[state.index]={answer,grade:g};if(g.correct||completionReward){state.answers[state.index]={questionId:q().id,first:state.first[state.index].answer,final:answer};state.phase=g.correct?'passed':'answered';$('progress').value=state.index+1;showAnswerFeedback();}else{state.phase='demo';$('reference-panel').hidden=false;$('boards').classList.remove('single');}persist();update();};
$('clear').onclick=()=>{if(!busy&&state.phase==='write')board.clear();};$('undo').onclick=()=>{if(!busy&&state.phase==='write')board.undo();};
$('demo').onclick=async()=>{if(!board||restoring||busy||isTracing()||state.phase==='passed')return;const version=epoch;setBusy(true);try{const complete=await board.showDemo();if(!complete||version!==epoch)return;if(['demo','answered'].includes(state.phase)){state.phase='write';board.clear();state.ink=[];state.interrupted=false;$('feedback').textContent='換你再寫一次。';persist();}}finally{setBusy(false);}};
$('next').onclick=async()=>{if(busy||restoring||isTracing()||!canContinue())return;if(state.index+1===state.run.snapshot.questions.length){state.finished=true;persist();await finish();}else{state.index++;state.phase='write';state.ink=[];state.interrupted=false;persist();await draw();}};
async function finish(){board?.destroy();board=null;$('practice').hidden=true;$('result').hidden=false;$('again').disabled=true;$('retry').hidden=true;$('save-status').textContent='正在儲存…';setBusy(true);try{let run;if(reviewChar&&!demo){const out=await api('review',{mode,character:reviewChar,updatedAt:state.reviewAt,answer:state.answers[0].final});if(!out.correct)throw Object.assign(Error('correction_required'),{userMessage:'請重新完成訂正。'});run={result:{correct:1,total:1,stars:0,review:true,graduated:out.graduated,quota:{remaining:0}}};}else if(demo){const correct=state.first.filter(x=>x.grade.correct).length,total=state.answers.length,requested=reviewChar?0:mode==='name-writing'?(correct===total?rule.stars:0):total*rule.starsPerCharacter,stars=Math.min(requested,rule.limit),period=rule.period==='lifetime'?'lifetime':new Date(Date.now()+28800000).toISOString().slice(0,10);run={...state.run,status:'submitted',answers:state.answers.map((a,i)=>({questionId:a.questionId,firstGrade:state.first[i].grade})),result:{rewardRule:mode==='name-writing'?COPY_RULE:COPY_REWARD_RULE,correct,total,stars,requested,...(reviewChar?{review:true}:{}),quota:{mode,period,earned:stars,remaining:reviewChar?0:rule.limit-stars,limit:rule.limit,capped:stars<requested}}};}else run=(await api('submit',{runId:state.run.id,requestId:state.submitId,answers:state.answers})).run;state.result=run.result;state.farmGrades=run.answers?.map(a=>({questionId:a.questionId,firstGrade:{correct:a.firstGrade?.correct,status:a.firstGrade?.status}}));state.saved=true;persist();renderResult(run.result);}catch(e){failure(e);$('save-status').textContent='答案已保留，請按重新儲存。';$('retry').hidden=false;}finally{setBusy(false);}}
function quotaMessage(r){if(r.review)return demo?'教師試玩，不會更動正式錯題本。':r.graduated?'這個字已從錯題本畢業。':'已完成這次訂正；較新的錯題仍保留。';const quota=r.quota;if(mode==='name-copy'&&(quota.limit===10||(quota.period&&quota.period!=='lifetime')||(r.rewardRule!==COPY_REWARD_RULE&&quota.period!=='lifetime')))return '這是先前的每日獎勵紀錄，星星不會重算；新的姓名模仿採累計 1200 顆上限。';if(rule.period==='day')return quota.capped?'已達本練習每日上限，本次獲得 '+r.stars+' 顆星。':'今天還能獲得 '+quota.remaining+' 顆星。';return (mode==='name-copy'?'姓名模仿累計獎勵':'姓名寫字獎勵')+'還剩 '+quota.remaining+' / '+(quota.limit||rule.limit)+' 顆星。';}
function renderResult(r){farm.show('result');showRoundOutcome($('result'),r.correct,r.total,state.run.id);$('practice').hidden=true;$('result').hidden=false;$('loading').hidden=true;$('result-text').textContent=r.review?'訂正完成！':(mode==='name-writing'?'':'完成 '+r.total+' 個字，')+'首次寫對 '+r.correct+' / '+r.total+' 字，獲得 '+r.stars+' 顆'+(demo?'試玩':'')+'星星。';$('quota-text').textContent=quotaMessage(r);$('save-status').textContent=demo?'教師試玩，不會變動學生的星星。':'已儲存';$('retry').hidden=true;$('again').disabled=false;$('again').textContent=r.review?'↩ 返回錯題本':'再練一次';$('daily').hidden=params.get('return')!=='daily';if(state.farmGrades)farm.complete({...state.run,status:'submitted',answers:state.farmGrades,result:r});}
$('retry').onclick=finish;$('again').onclick=async()=>{if(busy)return;state=null;storage?.removeItem(key);if(reviewChar){location.href=classUrl('notebook.html?mode=hanzi');return;}await begin();};
async function begin(){setBusy(true);$('error').textContent='';$('loading').hidden=false;try{if(!demo&&!session)throw Error('authentication_required');if(!state){try{state=JSON.parse(storage?.getItem(key)||'null');}catch{state=null;}}if(state?.mode!==mode)state=null;if(state?.saved&&state.result){renderResult(state.result);return;}if(!state){state={mode,startId:uid(),submitId:uid(),index:0,phase:'write',first:[],answers:[],ink:[],finished:false};persist();}if(!state.run){if(reviewChar&&!demo){const item=(await api('notebook')).items.find(x=>x.mode===mode&&x.character===reviewChar);if(!item)throw Object.assign(Error('already_corrected'),{userMessage:'這個字已經訂正，可以返回錯題本。'});state.reviewAt=item.updated_at;state.run={id:uid(),mode,snapshot:{questions:[item.question]}};}else {state.run=demo?await demoRun():(await api('start',{mode,requestId:state.startId})).run;farm.start(state.run);}persist();}if(state.finished){await finish();return;}await draw();}catch(e){failure(e);$('loading').hidden=true;}finally{setBusy(false);}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state)persist();board?.cancelDemo();}});window.addEventListener('pagehide',()=>{if(state)persist();board?.cancelDemo();});
if(!demo)window.addEventListener('focus',()=>{if(sessions.read()?.seat!==owner||sessions.read()?.token!==session?.token){epoch++;board?.destroy();$('practice').hidden=true;$('result').hidden=true;state=null;storage?.removeItem(key);failure(Error('authentication_required'));}});
farm.mount();
await begin();
