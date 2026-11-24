import {mountExamReview,createExamHistory,scoreLabel} from './hanzi-exam-review.js?v=20261124-review1';
import {createExamRoundStore} from './hanzi-session-store.js?v=20261124-exams1';
import {showRoundOutcome} from './round-outcome.js?v=20261123-starenvoys1';
import {createFarmLessonLink,requestedFarmLesson} from './farm-lesson-link.js?v=20261122-farm6';
import {attachCopyEntries} from './hanzi-copy-entry.js?v=20261121-week1';
import {PRACTICE_RULE,bonusQuestion} from './hanzi-practice.js?v=20261115-hanzi2';
import {HANZI_AUDIO} from './data/hanzi-teacher-audio.js?v=20261115-hanzi2';
import {currentClass,classStorageKey,classUrl} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {validateBank,questionPool,splitBopomofo,gradeReading} from './hanzi-bank.js';
import {createHanziClient,createHanziDemo,resultRows,taskState,compactAnswers} from './hanzi-client.js?v=20261124-review1';
import {createHandwriting} from './hanzi-handwriting.js?v=20261115-hanzi2';
import {gradeStrokes} from './hanzi-stroke-core.js';
import {mountCharacter} from './character-motion.js?v=20261123-starenvoys1';
import {createOpponent,updateOpponent,createBattle} from './character-battle.js?v=20261123-starenvoys1';
import {PROFILE_CHARACTERS} from './student-profile.js?v=20261123-starenvoys1';
import {MONSTERS} from './data/monsters.js?v=20261004-villains1';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),demo=params.get('demo')==='1';
const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname),fixture=local&&params.get('fixture')==='1';
const endpoint=local?location.origin:'https://zhuyin-api.j822925.workers.dev';
let tabStorage;try{tabStorage=globalThis.sessionStorage;}catch{}
const sessionKey=classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live');
const sessions=createStudentSession({storage:tabStorage,key:sessionKey});
const initials=['','ㄅ','ㄆ','ㄇ','ㄈ','ㄉ','ㄊ','ㄋ','ㄌ','ㄍ','ㄎ','ㄏ','ㄐ','ㄑ','ㄒ','ㄓ','ㄔ','ㄕ','ㄖ','ㄗ','ㄘ','ㄙ'];
const rimes=['','ㄧ','ㄨ','ㄩ','ㄚ','ㄛ','ㄜ','ㄝ','ㄞ','ㄟ','ㄠ','ㄡ','ㄢ','ㄣ','ㄤ','ㄥ','ㄦ','ㄧㄚ','ㄧㄛ','ㄧㄝ','ㄧㄞ','ㄧㄠ','ㄧㄡ','ㄧㄢ','ㄧㄣ','ㄧㄤ','ㄧㄥ','ㄨㄚ','ㄨㄛ','ㄨㄞ','ㄨㄟ','ㄨㄢ','ㄨㄣ','ㄨㄤ','ㄨㄥ','ㄩㄝ','ㄩㄢ','ㄩㄣ','ㄩㄥ'];
const tones=[['1','一聲'],['2','ˊ'],['3','ˇ'],['4','ˋ'],['5','˙']],labels={initial:'聲符',rime:'韻符／結合韻',tone:'聲調'};
const messages={authentication_required:'登入已過期，請回池東探險島重新登入。',empty_scope:'請先勾選至少一課，或請老師設定學習範圍。',request_timeout:'網路稍慢，紀錄仍保留在這個分頁，請再試一次。',exam_closed:'這份小考已截止，請找老師協助。',already_submitted:'這份小考已經繳交。',invalid_response:'暫時無法讀取國字服務，請稍後再試。',http_error:'國字服務暫時無法連線，請稍後再試。'};
let client,bank,bootstrap,round=null,index=0,answers=[],feedbacks=[],currentAnswer={},activePart='initial',submitted=false,busy=false,screen='entry',hintUsed=false,ink,alternatives=[],inputInterrupted=false,activeTask=null,submitRequestId='',localSession=null;
let hero=PROFILE_CHARACTERS[0],heroName='棉花兔',correctCount=0,wrongCount=0,draftStrokes=[],restoringInk=false,storageHealthy=true,pendingStart=null,inputTooComplex=false;
let correctionPhase='none',hintBeforeFirst=false,audioCancel=null;const correctionAudio=new Audio();correctionAudio.preload='none';
let questionGeneration=0,questionLoading=false,referenceReady=false,demoPlaying=false;
const templates=new Map();
const owner=()=>JSON.stringify([currentClass,demo?'demo':fixture?'fixture':'live',(localSession||sessions.read())?.seat||'']);
const roundStore=createExamRoundStore({storage:tabStorage,key:classStorageKey('zhuyin.hanzi.round.v1:'+new URL('.',location.href).pathname+':'+(demo?'demo':fixture?'fixture':'live')),getOwner:owner});
const farm=createFarmLessonLink({family:'hanzi',demo,getSession:()=>localSession||sessions.read(),excluded:()=>!!activeTask||params.has('review')||params.has('task')});
const opponent=createOpponent();$('opponent-slot').append(opponent);const battle=createBattle(opponent,()=>$('hero'));
const fail=error=>{$('error').textContent=error.userMessage||messages[error.message]||'目前無法完成這個動作，請稍後再試。';console.warn('hanzi',error.message);};
let reviewDispose=null,examHistory=null;
function show(name){reviewDispose?.();reviewDispose=null;if(name!=='entry')examHistory?.close();screen=name;farm.show(name);for(const id of ['entry','play','result'])$(id).hidden=id!==name;$('back-entry').hidden=name==='entry';$('error').textContent='';document.body.classList.toggle('is-writing',name==='play'&&questionMode()==='writing');window.scrollTo(0,0);}
function question(){return round?.questions[index];}
function questionMode(){return question()?.mode||round?.mode||activeTask?.mode||'reading';}
function isExam(){return activeTask?.kind==='exam';}
function getLessons(){return [...(bootstrap.scope?.lessonIds||[])];}
function modernPractice(){return !isExam()&&(round?.run?.snapshot||round?.snapshot)?.practiceRule===PRACTICE_RULE;}
function stopCorrectionAudio(){audioCancel?.();audioCancel=null;correctionAudio.pause();correctionAudio.removeAttribute('src');correctionAudio.load();}
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function pronounce(value){const out=node('span',undefined,'zhuyin-stack'),symbols=node('span',value.replace(/[ˊˇˋ˙]/g,''),'symbols');out.setAttribute('aria-label',value);out.append(symbols);const tone=value.match(/[ˊˇˋ˙]/)?.[0];if(tone)out.append(node('span',tone,tone==='˙'?'neutral':'tone'));return out;}
function renderWord(q,reveal=false){$('word').replaceChildren();[...q.word].forEach((ch,i)=>{const unit=node('span',undefined,'word-unit'+(i===q.targetIndex?' target':''));if(i===q.targetIndex&&questionMode()==='writing'&&!reveal){const box=node('span',undefined,'target-pronunciation');box.append(pronounce(q.readings[i]));unit.append(box);}else{unit.append(node('span',ch,'word-char'));if(i!==q.targetIndex||reveal)unit.append(pronounce(q.readings[i]));}$('word').append(unit);});}

async function template(char){
  if(!templates.has(char)){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    const promise=fetch(new URL('./data/hanzi-strokes/U'+char.codePointAt(0).toString(16).toUpperCase()+'.json',import.meta.url),{signal:controller.signal})
      .then(r=>{if(!r.ok)throw Error('no_reference');return r.json();})
      .then(ref=>{if(ref?.character!==char||!Array.isArray(ref.strokes)||!ref.strokes.length||ref.strokes.length!==ref.strokeCount||ref.strokes.some(s=>!Array.isArray(s)||s.length<2||s.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||p[0]<0||p[0]>1||p[1]<0||p[1]>1)))throw Error('no_reference');return ref;})
      .catch(()=>{templates.delete(char);return null;}).finally(()=>clearTimeout(timer));
    templates.set(char,promise);
  }
  return templates.get(char);
}
async function alternativeTemplates(q){const chars=[...new Set(bank.items.filter(x=>x.strokeCount===q.strokeCount&&x.character!==q.character).map(x=>x.character))].slice(0,6);return (await Promise.all(chars.map(template))).filter(Boolean);}
async function gradeInk(q,answer,{exam=false}={}){const ref=await template(q.character);const other=await alternativeTemplates(q);return gradeStrokes(answer.strokes,ref,{mode:exam?'exam':'practice',gradingPolicy:'automatic-v1',alternatives:other,inputInterrupted:answer.inputInterrupted});}
function drawScope(){scopeCount();}
function scopeCount(){const ids=getLessons();$('scope-description').textContent=ids.length?'':'老師還沒有開放課次。';document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=!ids.length||busy);}

function persist(){if(restoringInk)return;if(round){storageHealthy=roundStore.save({round,index,answers,feedbacks,submitted,currentAnswer,correctionPhase,hintBeforeFirst,strokes:ink?.getStrokes()||draftStrokes,hintUsed,inputInterrupted,inputTooComplex,activeTask,submitRequestId,correctCount,wrongCount});if(!storageHealthy)$('storage-warning').textContent='這台裝置暫時無法保存進度。請保持本頁開啟，完成後送出；重新整理會遺失未送出的答案。';}}
function renderSavedRounds(){
 const saved=roundStore.list();$('resume').hidden=!saved.length;$('resume').textContent=saved.length?'繼續：'+(saved.at(-1).activeTask?.title||'上次練習'): '繼續上次練習';
 let list=$('saved-rounds');if(!list){list=node('div');list.id='saved-rounds';$('resume').after(list);}list.replaceChildren();
 for(const draft of saved.slice(0,-1)){const b=node('button','繼續：'+(draft.activeTask?.title||'上次練習'));b.onclick=()=>resumeRound(draft);list.append(b);}
 const other=node('a','選擇其他小考 →');other.href=classUrl('exam.html');list.append(other);
}
function enter(){questionGeneration++;stopCorrectionAudio();questionLoading=false;restoringInk=false;referenceReady=false;demoPlaying=false;battle.reset();ink?.destroy();ink=null;show('entry');renderSavedRounds();if(bank)scopeCount();updateSubmit();}
async function start(mode,task=null,questionIds=null){if(busy||questionLoading)return;const saved=roundStore.read(task);if(saved){await resumeRound(saved);return;}busy=true;scopeCount();updateSubmit();try{
  const lessons=task?.lessonIds||getLessons(),termId=task?.termId||bootstrap.scope?.termId,allPool=questionPool(bank,lessons,mode,{termId}),pool=mode==='writing'&&bootstrap.writingReadyItemIds?allPool.filter(q=>bootstrap.writingReadyItemIds.includes(q.itemId)):allPool;
  const count=task?.kind==='assignment'?task.count:questionIds?.length||5;
  const base=task?.kind==='exam'?{examId:task.id}:{mode,lessonIds:lessons,termId,count,practiceRule:PRACTICE_RULE,...(task?.kind==='assignment'?{assignmentId:task.id}:{}),...(questionIds?{questionIds}:{})};
  const signature=JSON.stringify(base);if(!pendingStart||pendingStart.signature!==signature)pendingStart={signature,requestId:crypto.randomUUID()};const payload={...base,requestId:pendingStart.requestId};
  round=await client.request(task?.kind==='exam'?'exam-start':'practice-start',payload);pendingStart=null;if(round.run?.status&&round.run.status!=='started'){roundStore.clear(round.run.id);renderResult(round.run);return;}if(!round.questions?.length)throw Error('empty_scope');round.mode=round.run?.mode||round.mode||mode;round.roundId=round.roundId||round.run?.id;activeTask=task;index=0;answers=[];feedbacks=[];correctCount=0;wrongCount=0;submitted=false;correctionPhase='none';hintBeforeFirst=false;currentAnswer={};draftStrokes=[];submitRequestId=crypto.randomUUID();
  if(round.run?.status&&round.run.status!=='started'){renderResult(round.run);return;}
  farm.start(round.run||{...round,id:round.roundId,kind:'practice',status:'started'});
  persist();await drawQuestion();
}catch(e){fail(e);}finally{busy=false;if(screen==='entry')scopeCount();updateSubmit();}}
function refreshBattle(){const max=round.questions.length;updateOpponent(opponent,MONSTERS[0],max,correctCount,{requiredLevels:[]});opponent.querySelector('.opponent-remaining').textContent='再答對 '+Math.max(0,max-correctCount)+' 題';$('hero-hp').max=max;$('hero-hp').value=Math.max(0,max-wrongCount);}
async function drawQuestion(restored=false){
  const generation=++questionGeneration,activeRound=round,activeIndex=index;
  let board=null;
  const current=()=>generation===questionGeneration&&round===activeRound&&index===activeIndex&&screen==='play'&&(!board||ink===board);
  stopCorrectionAudio();questionLoading=true;restoringInk=true;referenceReady=false;demoPlaying=false;alternatives=[];
  ink?.destroy();ink=null;battle.reset();show('play');
  try{
    const q=question(),writing=questionMode()==='writing';
    if(!q)throw Error('invalid_response');
    $('instruction').textContent=writing?'看注音，寫國字':'看國字，拼注音';$('progress-label').textContent=(index+1)+' / '+round.questions.length;$('progress').max=round.questions.length;$('progress').value=index;
    $('reading-input').hidden=writing;$('writing-input').hidden=!writing;$('feedback').textContent='';$('feedback').removeAttribute('data-state');$('next').hidden=true;$('submit').hidden=false;$('submit').textContent='送出';$('correction-demo').hidden=true;

    if(!restored){correctionPhase='none';hintBeforeFirst=false;currentAnswer={};activePart='initial';submitted=false;hintUsed=false;inputInterrupted=false;draftStrokes=[];inputTooComplex=false;}
    renderWord(q);refreshBattle();updateSubmit();
    if(writing){
      const restoreInterrupted=inputInterrupted,restoreInk=restored?(draftStrokes.length?draftStrokes:currentAnswer.strokes||[]):[];
      $('handwriting').style.pointerEvents='';$('handwriting').replaceChildren();$('demo-ink').hidden=isExam();$('demo-ink').textContent=hintBeforeFirst?'再看筆順':modernPractice()?'看筆順 ＋1題':'看筆順';
      board=createHandwriting($('handwriting'),{allowDemo:!isExam(),disabled:true,loadReference:template,onChange:info=>{
        // The factory may call onChange before assignment; stale boards and
        // older question loads must never persist into the new question.
        if(!board||!current())return;
        inputInterrupted=!!info.inputInterrupted||!!info.isDrawing;inputTooComplex=!!info.inputTooComplex;
        updateInkStatus(info);if(!submitted)persist();updateSubmit();
      }});
      ink=board;updateInkStatus({strokeCount:0});
      const ref=await board.load(q.character);if(!current())return false;
      referenceReady=!!ref;
      if(ref){const candidates=await alternativeTemplates(q);if(!current())return false;alternatives=candidates;}
      if(restoreInk.length&&!board.restoreStrokes(restoreInk,{inputInterrupted:restoreInterrupted}))$('error').textContent='上次這題的筆跡未能恢復，已完成的題目仍保留，請重新寫這一題。';
      board.setDisabled(submitted||correctionPhase==='watch'||!referenceReady);
    }else renderReading();
    if(submitted&&feedbacks[index])displayFeedback(feedbacks[index],false);else if(correctionPhase==='watch'||correctionPhase==='retry')correctionUI();
    return true;
  }catch(error){
    if(current()){referenceReady=false;board?.setDisabled(true);fail(error);}
    return false;
  }finally{
    if(current()){
      questionLoading=false;restoringInk=false;
      if(board)updateInkStatus({strokeCount:board.getStrokes().length,inputInterrupted,inputTooComplex});
      updateSubmit();persist();
    }
  }
}
function updateInkStatus(info){$('ink-status').textContent=questionLoading?'正在準備書寫資料…':!referenceReady?'書寫資料暫時無法讀取，請回營地再接續。':info.inputTooComplex?'請按重寫，再寫一次。':info.inputInterrupted?'這一筆中斷了，請按上一筆或重寫。':'';}

function renderReading(){
  $('answer-slots').replaceChildren();for(const part of ['initial','rime','tone']){const button=node('button',undefined,'answer-slot');button.setAttribute('aria-pressed',String(part===activePart));button.setAttribute('aria-label','選擇'+labels[part]);const answer=currentAnswer[part];button.append(node('small',labels[part]),node('strong',answer===undefined?'？':answer===''?'—':part==='tone'?tones.find(t=>t[0]===answer)?.[1]:answer));button.onclick=()=>{activePart=part;renderReading();};button.disabled=submitted||correctionPhase==='watch'||demoPlaying;$('answer-slots').append(button);}
  $('symbol-palette').replaceChildren();const choices=activePart==='initial'?initials.map(x=>[x,x||'不用聲符']):activePart==='rime'?rimes.map(x=>[x,x||'不用韻符']):tones;
  for(const[value,label]of choices){const button=node('button',label,'symbol-key'+(!value?' none':''));button.setAttribute('aria-pressed',String(currentAnswer[activePart]===value));button.disabled=submitted||correctionPhase==='watch'||demoPlaying;button.onclick=()=>{currentAnswer[activePart]=value;if(activePart==='initial')activePart='rime';else if(activePart==='rime')activePart='tone';renderReading();persist();updateSubmit();};$('symbol-palette').append(button);}
}
function updateSubmit(){
 const loading=busy||questionLoading||restoringInk,locked=submitted||demoPlaying||correctionPhase==='watch',ready=questionMode()==='writing'?referenceReady&&!!ink?.getStrokes().length&&!inputInterrupted&&!inputTooComplex:['initial','rime','tone'].every(k=>currentAnswer[k]!==undefined);
 $('submit').disabled=loading||locked||!ready;for(const id of ['undo-ink','clear-ink'])$(id).disabled=locked||loading;
 $('next').disabled=loading||!submitted||demoPlaying;$('resume').disabled=loading;$('back-entry').disabled=loading;
 $('demo-ink').disabled=loading||locked||isExam()||!referenceReady||inputInterrupted||correctionPhase!=='none';
 $('correction-demo').disabled=loading||demoPlaying;
}
function feedbackText(result){return result.correct===true?'答對了！':result.correct===null?'筆跡沒有讀完整，請重寫。':'再練一次。';}
function displayFeedback(result,animate=true){
 const correct=result.correct===true;$('feedback').textContent=correctionPhase==='done'?'訂正完成！':feedbackText(result);$('feedback').dataset.state=correct||correctionPhase==='done'?'correct':'incorrect';
 $('submit').hidden=true;$('next').hidden=false;$('correction-demo').hidden=true;$('next').textContent=index+1===round.questions.length?'完成 →':'下一題 →';renderWord(question(),true);
 if(animate)battle.answer(correct);if(questionMode()==='reading')renderReading();ink?.setDisabled(true);updateSubmit();
}
function correctionUI(){
 const watching=correctionPhase==='watch',writing=questionMode()==='writing';
 $('next').hidden=true;$('submit').hidden=watching;$('submit').textContent='送出訂正';$('correction-demo').hidden=!watching;
 $('correction-demo').textContent=writing?'▶ 看完整筆順':'▶ 播放老師錄音';
 $('feedback').textContent=watching?(writing?'先看完筆順，再重寫。':'先聽老師錄音，再拼一次。'):(writing?'請重寫一次。':'請重新拼一次。');$('feedback').dataset.state='incorrect';
 renderWord(question(),watching);ink?.setDisabled(watching);if(!writing)renderReading();updateSubmit();
}
async function demonstrateCorrection(){
 if(correctionPhase!=='watch'||demoPlaying||questionLoading)return;const generation=questionGeneration,board=ink,writing=questionMode()==='writing';demoPlaying=true;updateSubmit();if(!writing)renderReading();
 try{
  let complete=false;
  if(writing)complete=await board.showDemo();
  else{const sound=HANZI_AUDIO[question().bopomofo.replace('˙','')+(question().bopomofo.includes('˙')?'˙':'')];if(!sound)throw Error('missing_recording');
   complete=await new Promise((resolve,reject)=>{let timer;const clear=()=>{clearTimeout(timer);correctionAudio.onended=null;correctionAudio.onerror=null;audioCancel=null;};audioCancel=()=>{clear();resolve(false);};correctionAudio.onended=()=>{clear();resolve(true);};correctionAudio.onerror=()=>{clear();reject(Error('audio_unavailable'));};timer=setTimeout(()=>{clear();correctionAudio.pause();reject(Error('audio_unavailable'));},20000);correctionAudio.src=new URL(sound,import.meta.url).href;correctionAudio.play().catch(e=>{clear();reject(e);});});
  }
  if(generation!==questionGeneration||screen!=='play')return;
  if(complete){correctionPhase='retry';currentAnswer={};activePart='initial';draftStrokes=[];ink?.clear();inputInterrupted=false;inputTooComplex=false;correctionUI();persist();}
 }catch(e){if(generation===questionGeneration)$('feedback').textContent=writing?'請再按一次，完整看完筆順。':'請按播放老師錄音，聽完再作答。';}
 finally{if(generation===questionGeneration){demoPlaying=false;if(!writing)renderReading();updateSubmit();}}
}
$('correction-demo').onclick=demonstrateCorrection;
$('submit').onclick=async()=>{
 if(busy||submitted||correctionPhase==='watch'||demoPlaying||questionLoading)return;busy=true;updateSubmit();let showCorrection=false;
 try{
  const q=question(),writing=questionMode()==='writing',answer=writing?{strokes:ink.getStrokes(),inputInterrupted}:structuredClone(currentAnswer);
  const result=writing?ink.grade({mode:isExam()?'exam':'practice',gradingPolicy:'automatic-v1',alternatives}):gradeReading(q,answer);result.status=result.status||(result.correct?'correct':'incorrect');
  if(result.correct===null){$('feedback').textContent=feedbackText(result);$('feedback').dataset.state='pending';return;}
  if(correctionPhase==='retry'){
   if(result.correct){answers[index].correction={answer,demonstrationComplete:true};correctionPhase='done';submitted=true;currentAnswer=answer;persist();displayFeedback(feedbacks[index],false);}
   else{correctionPhase='watch';persist();correctionUI();showCorrection=true;}
  }else{
   currentAnswer=answer;answers[index]={questionId:q.id,answer,hintUsed,hintBeforeFirst};feedbacks[index]=result;
   if(result.correct)correctCount++;else wrongCount++;refreshBattle();
   if(!result.correct&&modernPractice()){correctionPhase='watch';submitted=false;persist();battle.answer(false);correctionUI();showCorrection=true;}
   else{submitted=true;persist();displayFeedback(result);}
  }
 }catch(e){fail(e);}finally{busy=false;updateSubmit();if(showCorrection)void demonstrateCorrection();}
};
$('next').onclick=async()=>{if(busy||questionLoading||!submitted||screen!=='play'||demoPlaying)return;if(index+1===round.questions.length){await finish();return;}busy=true;updateSubmit();try{index++;await drawQuestion();}catch(e){fail(e);}finally{busy=false;updateSubmit();}};
$('undo-ink').onclick=()=>{if(!submitted&&!busy&&!questionLoading&&!demoPlaying&&correctionPhase!=='watch')ink?.undo();};
$('clear-ink').onclick=()=>{if(!submitted&&!busy&&!questionLoading&&!demoPlaying&&correctionPhase!=='watch')ink?.clear();};
$('demo-ink').onclick=async()=>{
 const board=ink,generation=questionGeneration;if(isExam()||!board||busy||submitted||questionLoading||demoPlaying||!referenceReady||inputInterrupted||correctionPhase!=='none')return;
 hintUsed=true;if(modernPractice()&&!hintBeforeFirst){hintBeforeFirst=true;const snapshot=round.run?.snapshot||round.snapshot,number=round.questions.length-snapshot.baseQuestions.length+1;round.questions.push(bonusQuestion(snapshot,number));$('progress-label').textContent=(index+1)+' / '+round.questions.length;$('progress').max=round.questions.length;refreshBattle();$('feedback').textContent='多練 1 題';}
 $('demo-ink').textContent='再看筆順';persist();demoPlaying=true;updateSubmit();try{await board.showDemo();}catch(e){if(generation===questionGeneration)fail(e);}finally{if(generation===questionGeneration&&ink===board){demoPlaying=false;updateSubmit();}}
};

function summaryRows(rows){$('result-answers').replaceChildren();rows.forEach(r=>{const q=r.question,status=r.status||(r.correct?'correct':'incorrect'),card=node('div',undefined,'answer-review');card.append(node('strong',(status==='correct'?'✓ ':['pending','pending_review'].includes(status)?'◷ ':'↻ ')+q.word+' · '+q.bopomofo));const desc=['pending','pending_review'].includes(status)?'這份舊紀錄尚未完成判定。':status==='correct'?'這一題答對了。':'這一題可以再練習一次。';card.append(node('p',desc+(r.hintUsed?'（曾看筆順提示）':'')));$('result-answers').append(card);});}
function renderResult(run){
  $('result').querySelector('h1').textContent=run.kind==='exam'?'我的小考成績':'練習完成！';const rows=resultRows(run),result=run.result;questionGeneration++;ink?.destroy();ink=null;round=null;show('result');const base=rows.filter(row=>!row.question.id?.includes('.bonus.'));if(!result.pending)showRoundOutcome($('result'),base.filter(row=>row.correct===true).length,base.length,run.id,hero.id,opponent.dataset.monster);$('reward-status').textContent=result.stars?'⭐ '+(result.correct===result.total?'全對！':'')+(demo?'試玩':'')+'獲得 '+result.stars+' 顆星'+(result.dailyReward?.capped?'（今天已達 150 星）':''):result.dailyReward?.capped?'今天已達 150 星，這回合仍有保存成績。':'';$('result-score').textContent=result.pending?'還有 '+result.pending+' 題未完成判定':scoreLabel(result)+' · '+result.correct+' / '+result.total+' 題答對';$('result-detail').textContent=result.corrected?'已完成 '+result.corrected+' 題訂正，成績保留第一次作答。':result.pending?'部分舊紀錄尚未完成判定。':'';$('save-status').textContent=demo?'試玩紀錄已留在這個分頁；不會送到正式班級。':'紀錄已儲存，老師可以在後台查看。';summaryRows(rows);if(run.kind==='exam')reviewDispose=mountExamReview($('result-answers'),run,{loadReference:template});$('again').disabled=false;$('again').textContent=params.get('from')==='daily'?'↩ 返回每日任務':params.get('from')==='notebook'?'↩ 返回錯題本':params.get('from')==='exams'?'↩ 返回老師小考':'↶ 返回營地';$('retry-save').hidden=true;$('card-reward').replaceChildren();
  if(run.kind==='exam'&&run.snapshot.rewardCardIds?.length){const box=$('card-reward');if(result.perfect){const button=node('button','✦ 領取小考卡片','primary');button.onclick=async()=>{button.disabled=true;try{const reward=await client.request('card-draw',{runId:run.id,requestId:'hanzi-card-'+run.id});box.replaceChildren();if(reward.complete){box.append(node('p','這份小考的卡片已經收齊了！'));return;}const card=PROFILE_CHARACTERS.find(c=>c.id===reward.character);if(card){const image=document.createElement('img');image.src=card.cardImage||card.image;image.alt=card.name;box.append(image,node('p',card.name+' 已加入收藏，可以回首頁選為角色！'));}else box.append(node('p','卡片已加入收藏！'));}catch(e){fail(e);button.disabled=false;}};box.append(node('p','這次小考全對，獲得領卡資格！'),button);}else box.append(node('p','小考全對、沒有使用提示，就能領取老師設定的卡片。'));}
  farm.complete(run);
}
async function finish(){stopCorrectionAudio();show('result');$('reward-status').textContent='';$('result-score').textContent='正在整理探險筆記…';$('result-detail').textContent='';$('save-status').textContent='正在儲存這一回合…';$('retry-save').hidden=true;$('again').disabled=true;busy=true;persist();try{
  const out=await client.request(isExam()?'exam-submit':'practice-submit',{roundId:round.roundId,attemptId:round.attemptId||round.roundId,...(isExam()?{examId:activeTask.id}:{}),requestId:submitRequestId,answers:compactAnswers(answers)});
  roundStore.clear(out.run.id);renderResult(out.run);
}catch(e){fail(e);$('result-score').textContent=storageHealthy?'答案已保留':'請保持本頁開啟';$('result-detail').textContent='還沒確認儲存成功，請留在這個分頁重試。';$('save-status').textContent='重試會使用同一份紀錄，不會重複計分。';$('retry-save').hidden=false;$('again').disabled=true;}finally{busy=false;}}
$('retry-save').onclick=()=>{if(!busy)finish();};$('again').onclick=()=>{if(busy||questionLoading)return;if(params.get('from')==='daily'){location.href=classUrl('daily.html');return;}if(['notebook','exams'].includes(params.get('from'))){location.href=classUrl(params.get('from')==='notebook'?'notebook.html?mode=hanzi':'exam.html');return;}round=null;enter();};
async function resumeRound(saved){if(busy||questionLoading)return;if(!saved){enter();return;}busy=true;updateSubmit();try{({round,index,answers,feedbacks,submitted,currentAnswer,hintUsed,inputInterrupted,activeTask,submitRequestId,correctCount,wrongCount}=saved);correctionPhase=saved.correctionPhase||'none';hintBeforeFirst=!!saved.hintBeforeFirst;inputTooComplex=!!saved.inputTooComplex;draftStrokes=saved.strokes||[];currentAnswer=currentAnswer||{};await drawQuestion(true);}catch(e){enter();fail(e);}finally{busy=false;if(screen==='entry')scopeCount();updateSubmit();}}
$('resume').onclick=()=>resumeRound(roundStore.read());


$('back-entry').onclick=()=>{if(busy||questionLoading||restoringInk)return;if(screen==='play')$('leave-dialog').showModal();else if(screen==='result'&&round){$('error').textContent='請先重新儲存這回合，避免遺失紀錄。';}else enter();};$('stay').onclick=()=>$('leave-dialog').close();$('leave').onclick=()=>{if(busy||questionLoading||restoringInk)return;persist();$('leave-dialog').close();enter();};
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>start(button.dataset.mode));
async function launchFromPlaza(){
 const taskId=params.get('task'),review=params.get('review');
 if(params.get('from')==='exam-history'){await examHistory?.load();$('exam-history').scrollIntoView({block:'start'});return;}
 if(taskId){const [a,e]=await Promise.all([client.request('assignments'),client.request('exams')]);const tasks=[...(a.assignments||[]).map(t=>({...t,kind:'assignment'})),...(e.exams||[]).map(t=>({...t,kind:'exam'}))],task=tasks.find(t=>t.id===taskId);if(!task)throw Error('exam_closed');if(task.kind==='exam'&&task.attempt?.status&&task.attempt.status!=='started'){const out=await client.request('exam-results',{examId:task.id});roundStore.clear(out.run.id);renderResult(out.run);}else await start(task.mode,task);}
 else if(params.get('from')==='daily'&&['reading','writing'].includes(params.get('mode'))){await start(params.get('mode'));}
 else if(review){const out=await client.request('notebook'),item=out.items.find(r=>r.questionId===review&&r.mode===params.get('mode'));if(!item)throw Error('review_unavailable');const q=item.question;await start(item.mode,{kind:'notebook',lessonIds:[q.lessonId],termId:q.termId,count:1},[q.id]);}
 else {const farmMode=requestedFarmLesson('hanzi',params.get('farmLesson'));if(farmMode)await start(farmMode);}
}
window.addEventListener('pagehide',()=>{persist();stopCorrectionAudio();ink?.cancelDemo();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCorrectionAudio();ink?.cancelDemo();persist();}});

async function boot(){
  farm.mount();
  $('home-link').href=classUrl('./'+(demo?'?demo=1':''));$('preview-note').hidden=!(demo||fixture);if(fixture)$('preview-note').textContent='教師本機測試 · 使用虛構學生與獨立測試紀錄';
  if(fixture){const response=await fetch('/hanzi-fixture/session',{cache:'no-store'});if(!response.ok)throw Error('authentication_required');localSession=await response.json();}
  if(demo){const response=await fetch('data/hanzi-curriculum.json?v=20261115-1');if(!response.ok)throw Error('invalid_response');bank=await response.json();const valid=validateBank(bank);if(!valid.valid)throw Error('invalid_bank');client=createHanziDemo({bank,storage:tabStorage,key:classStorageKey('zhuyin.hanzi.demo.v1:'+new URL('.',location.href).pathname),gradeWriting:gradeInk});}
  else{if(!(localSession||sessions.read()))throw Error('authentication_required');client=createHanziClient({endpoint,classId:currentClass,getSession:()=>localSession||sessions.read()});}
  bootstrap=await client.request('bootstrap');bank=bootstrap.catalog||bank;if(!bank||!validateBank(bank).valid)throw Error('invalid_bank');
  if(!demo){const session=localSession||sessions.read();try{const response=await fetch(classUrl(endpoint+'/api'),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({kind:'profile',seat:session.seat,token:session.token})});const p=await response.json();if(p.error)throw Error(p.error);hero=PROFILE_CHARACTERS.find(c=>c.id===p.avatar)||hero;heroName=p.nickname||p.name||hero.name;}catch{heroName=hero.name;}}
  mountCharacter($('hero'),hero);$('hero-name').textContent=heroName;drawScope();$('loading').hidden=true;enter();if(!demo){examHistory=createExamHistory({host:$('exam-history'),request:(op,data)=>client.request(op,data),loadReference:template});$('my-exam-results').hidden=false;$('my-exam-results').onclick=async()=>{await examHistory.load();$('exam-history').scrollIntoView({block:'start'});};}void attachCopyEntries({host:$('entry'),endpoint,classId:currentClass,classUrl,session:localSession||sessions.read(),demo});await launchFromPlaza();
}
boot().catch(e=>{$('loading').hidden=true;fail(e);});
