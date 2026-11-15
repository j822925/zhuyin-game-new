import {currentClass,classStorageKey,classUrl} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {validateBank,questionPool,splitBopomofo,gradeReading} from './hanzi-bank.js';
import {createHanziClient,createHanziDemo,createRoundStore,resultRows,taskState,compactAnswers} from './hanzi-client.js';
import {createHandwriting} from './hanzi-handwriting.js';
import {gradeStrokes} from './hanzi-stroke-core.js';
import {mountCharacter} from './character-motion.js?v=20261011-battle1';
import {createOpponent,updateOpponent,createBattle} from './character-battle.js?v=20261011-battle1';
import {PROFILE_CHARACTERS} from './student-profile.js?v=20261011-battle1';
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
let questionGeneration=0,questionLoading=false,referenceReady=false,demoPlaying=false;
const templates=new Map();
const owner=()=>JSON.stringify([currentClass,demo?'demo':fixture?'fixture':'live',(localSession||sessions.read())?.seat||'']);
const roundStore=createRoundStore({storage:tabStorage,key:classStorageKey('zhuyin.hanzi.round.v1:'+new URL('.',location.href).pathname+':'+(demo?'demo':fixture?'fixture':'live')),getOwner:owner});
const opponent=createOpponent();$('opponent-slot').append(opponent);const battle=createBattle(opponent,()=>$('hero'));
const fail=error=>{$('error').textContent=error.userMessage||messages[error.message]||'目前無法完成這個動作，請稍後再試。';console.warn('hanzi',error.message);};
function show(name){screen=name;for(const id of ['entry','play','result','tasks','notebook'])$(id).hidden=id!==name;$('back-entry').hidden=name==='entry';$('error').textContent='';document.body.classList.toggle('is-writing',name==='play'&&questionMode()==='writing');window.scrollTo(0,0);}
function question(){return round?.questions[index];}
function questionMode(){return question()?.mode||round?.mode||activeTask?.mode||'reading';}
function isExam(){return activeTask?.kind==='exam';}
function getLessons(){return [...document.querySelectorAll('#lesson-options input:checked')].map(x=>x.value);}
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function pronounce(value){const out=node('span',undefined,'zhuyin-stack'),symbols=node('span',value.replace(/[ˊˇˋ˙]/g,''),'symbols');out.setAttribute('aria-label',value);out.append(symbols);const tone=value.match(/[ˊˇˋ˙]/)?.[0];if(tone)out.append(node('span',tone,tone==='˙'?'neutral':'tone'));return out;}
function renderWord(q,reveal=false){$('word').replaceChildren();[...q.word].forEach((ch,i)=>{const unit=node('span',undefined,'word-unit'+(i===q.targetIndex?' target':''));if(i===q.targetIndex&&questionMode()==='writing'&&!reveal){const box=node('span',undefined,'target-pronunciation');box.append(pronounce(q.readings[i]));unit.append(box);}else{unit.append(node('span',ch,'word-char'));if(i!==q.targetIndex||reveal)unit.append(pronounce(q.readings[i]));}$('word').append(unit);});$('word-hint').replaceChildren();if(q.hint)[...q.hint].forEach((ch,i)=>{const unit=node('span',undefined,'hint-unit');unit.append(node('span',ch));if(q.hintReadings?.[i])unit.append(pronounce(q.hintReadings[i]));$('word-hint').append(unit);});}
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
async function alternativeTemplates(q){const chars=[...new Set(bank.items.filter(x=>x.strokeCount===q.strokeCount&&x.character!==q.character).map(x=>x.character))];return (await Promise.all(chars.map(template))).filter(Boolean);}
async function gradeInk(q,answer,{exam=false}={}){const ref=await template(q.character);const other=await alternativeTemplates(q);return gradeStrokes(answer.strokes,ref,{mode:exam?'exam':'practice',gradingPolicy:'automatic-v1',alternatives:other,inputInterrupted:answer.inputInterrupted});}
function drawScope(){
  const scope=bootstrap.scope||{},term=bank.terms.find(t=>t.id===scope.termId)||bank.terms[0];
  $('term-label').textContent=term?.label||bank.title;
  const permitted=bank.lessons.filter(l=>(!scope.termId||l.termId===scope.termId)&&(demo||(scope.lessonIds||[]).includes(l.id)));
  $('lesson-options').replaceChildren();$('scope-chips').replaceChildren();
  for(const lesson of permitted){const label=node('label'),check=document.createElement('input');check.type='checkbox';check.value=lesson.id;check.checked=true;check.onchange=scopeCount;label.append(check,node('span',(lesson.id==='0'?'預備課':/^\d+$/.test(lesson.id)?'第 '+lesson.id+' 課':'')+' '+lesson.title));$('lesson-options').append(label);$('scope-chips').append(node('span',lesson.id==='0'?'國字真簡單':lesson.title));}
  if(!permitted.length)$('scope-description').textContent='老師還沒有開放課次，請先找老師。';else scopeCount();
  $('lesson-details').open=false;
}
function scopeCount(){const ids=getLessons(),chars=bank.items.filter(x=>ids.includes(x.lessonId)&&x.enabled!==false&&(!bootstrap.scope?.termId||x.termId===bootstrap.scope.termId||bank.lessons.some(l=>l.id===x.lessonId&&l.termId===bootstrap.scope.termId)));$('scope-description').textContent='今天選了 '+ids.length+' 課 · '+chars.length+' 個國字';document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=!ids.length||busy);}
function persist(){if(restoringInk)return;if(round){storageHealthy=roundStore.save({round,index,answers,feedbacks,submitted,currentAnswer,strokes:ink?.getStrokes()||draftStrokes,hintUsed,inputInterrupted,inputTooComplex,activeTask,submitRequestId,correctCount,wrongCount});if(!storageHealthy)$('storage-warning').textContent='這台裝置暫時無法保存進度。請保持本頁開啟，完成後送出；重新整理會遺失未送出的答案。';}}
function enter(){questionGeneration++;questionLoading=false;restoringInk=false;referenceReady=false;demoPlaying=false;battle.reset();ink?.destroy();ink=null;show('entry');$('resume').hidden=!roundStore.read();if(bank)scopeCount();updateSubmit();}
async function start(mode,task=null,questionIds=null){if(busy||questionLoading)return;if(roundStore.read()){const resume=$('resume');resume.hidden=false;resume.textContent='先接著上次的探險 →';resume.focus();$('error').textContent='還有一回合未完成，先完成並儲存，再開始新回合。';return;}busy=true;scopeCount();updateSubmit();try{
  const lessons=task?.lessonIds||getLessons(),termId=task?.termId||bootstrap.scope?.termId,allPool=questionPool(bank,lessons,mode,{termId}),pool=mode==='writing'&&bootstrap.writingReadyItemIds?allPool.filter(q=>bootstrap.writingReadyItemIds.includes(q.itemId)):allPool;
  const count=task?.kind==='assignment'?task.count:questionIds?.length||Math.min(Number($('count').value),mode==='writing'?10:30,new Set(pool.map(q=>q.itemId)).size);
  const base=task?.kind==='exam'?{examId:task.id}:{mode,lessonIds:lessons,termId,count,...(task?.kind==='assignment'?{assignmentId:task.id}:{}),...(questionIds?{questionIds}:{})};
  const signature=JSON.stringify(base);if(!pendingStart||pendingStart.signature!==signature)pendingStart={signature,requestId:crypto.randomUUID()};const payload={...base,requestId:pendingStart.requestId};
  round=await client.request(task?.kind==='exam'?'exam-start':'practice-start',payload);pendingStart=null;if(!round.questions?.length)throw Error('empty_scope');round.mode=round.run?.mode||round.mode||mode;round.roundId=round.roundId||round.run?.id;activeTask=task;index=0;answers=[];feedbacks=[];correctCount=0;wrongCount=0;submitted=false;currentAnswer={};draftStrokes=[];submitRequestId=crypto.randomUUID();
  if(round.run?.status&&round.run.status!=='started'){renderResult(round.run);return;}
  persist();await drawQuestion();
}catch(e){fail(e);}finally{busy=false;if(screen==='entry')scopeCount();updateSubmit();}}
function refreshBattle(){const max=round.questions.length;updateOpponent(opponent,MONSTERS[0],max,correctCount,{requiredLevels:[]});opponent.querySelector('.opponent-remaining').textContent='再答對 '+Math.max(0,max-correctCount)+' 題';$('hero-hp').max=max;$('hero-hp').value=Math.max(0,max-wrongCount);}
async function drawQuestion(restored=false){
  const generation=++questionGeneration,activeRound=round,activeIndex=index;
  let board=null;
  const current=()=>generation===questionGeneration&&round===activeRound&&index===activeIndex&&screen==='play'&&(!board||ink===board);
  questionLoading=true;restoringInk=true;referenceReady=false;demoPlaying=false;alternatives=[];
  ink?.destroy();ink=null;battle.reset();show('play');
  try{
    const q=question(),writing=questionMode()==='writing';
    if(!q)throw Error('invalid_response');
    $('mode-label').textContent=(isExam()?'小考 · ':activeTask?.kind==='assignment'?'作業 · ':'')+(writing?'02 / 書寫探險':'01 / 看字拼音');$('instruction').textContent=writing?'看注音，寫出空格的國字':'看國字，拼出注音';$('context-label').textContent=writing?'看詞語線索，把這個字寫在大格子裡':'拼出橘色國字的注音';$('progress-label').textContent=(index+1)+' / '+round.questions.length;$('progress').max=round.questions.length;$('progress').value=index;
    $('reading-input').hidden=writing;$('writing-input').hidden=!writing;$('feedback').textContent='';$('feedback').removeAttribute('data-state');$('next').hidden=true;$('submit').hidden=false;$('submit').textContent=writing?'寫好了，送出！':'拼好了，送出！';$('battle-message').textContent='想好了再出招！';
    if(!restored){currentAnswer={};activePart='initial';submitted=false;hintUsed=false;inputInterrupted=false;draftStrokes=[];inputTooComplex=false;}
    renderWord(q);refreshBattle();updateSubmit();
    if(writing){
      const restoreInterrupted=inputInterrupted,restoreInk=restored?(draftStrokes.length?draftStrokes:currentAnswer.strokes||[]):[];
      $('handwriting').style.pointerEvents='';$('handwriting').replaceChildren();$('demo-ink').hidden=isExam();
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
      board.setDisabled(submitted||!referenceReady);
    }else renderReading();
    if(submitted&&feedbacks[index])displayFeedback(feedbacks[index],false);
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
function updateInkStatus(info){$('ink-status').textContent=questionLoading?'正在準備書寫資料…':!referenceReady?'書寫資料暫時無法讀取，請返回營地，再接著這回合。':info.inputTooComplex?'筆跡太複雜，請按「重寫」後再寫一次。':info.isDrawing?'正在寫第 '+info.strokeCount+' 筆…':info.inputInterrupted?'這一筆被中斷了，請按「上一筆」或重寫。':info.strokeCount?'已寫 '+info.strokeCount+' 筆':'用手指或觸控筆，在白色大格子裡寫。';}
function renderReading(){
  $('answer-slots').replaceChildren();for(const part of ['initial','rime','tone']){const button=node('button',undefined,'answer-slot');button.setAttribute('aria-pressed',String(part===activePart));button.setAttribute('aria-label','選擇'+labels[part]);const answer=currentAnswer[part];button.append(node('small',labels[part]),node('strong',answer===undefined?'？':answer===''?'—':part==='tone'?tones.find(t=>t[0]===answer)?.[1]:answer));button.onclick=()=>{activePart=part;renderReading();};button.disabled=submitted;$('answer-slots').append(button);}
  $('symbol-palette').replaceChildren();const choices=activePart==='initial'?initials.map(x=>[x,x||'不用聲符']):activePart==='rime'?rimes.map(x=>[x,x||'不用韻符']):tones;
  for(const[value,label]of choices){const button=node('button',label,'symbol-key'+(!value?' none':''));button.setAttribute('aria-pressed',String(currentAnswer[activePart]===value));button.disabled=submitted;button.onclick=()=>{currentAnswer[activePart]=value;if(activePart==='initial')activePart='rime';else if(activePart==='rime')activePart='tone';renderReading();persist();updateSubmit();};$('symbol-palette').append(button);}
}
function updateSubmit(){const loading=busy||questionLoading||restoringInk,ready=questionMode()==='writing'?referenceReady&&!!ink?.getStrokes().length&&!inputInterrupted&&!inputTooComplex:['initial','rime','tone'].every(k=>currentAnswer[k]!==undefined);$('submit').disabled=loading||submitted||demoPlaying||!ready;for(const id of ['undo-ink','clear-ink'])$(id).disabled=submitted||loading||demoPlaying;$('next').disabled=loading||!submitted;$('resume').disabled=loading;$('back-entry').disabled=loading;$('demo-ink').disabled=loading||demoPlaying||isExam()||!referenceReady||inputInterrupted;}
function feedbackText(result,q){if(result.status==='correct'||result.correct===true)return hintUsed?'跟著提示完成了！下次試試自己寫。':'答對了！夥伴向前出招！';if(result.status==='pending'||result.correct===null)return '這次筆跡沒有讀完整，請重寫一次。';if(questionMode()==='reading')return '再記一次：'+q.character+' 的注音是 '+q.bopomofo+'。';if(result.reasons?.includes('missing-strokes'))return '可能少了一筆，看看正確寫法。';if(result.reasons?.includes('extra-strokes'))return '可能多了一筆，看看哪些筆要連著寫。';if(result.order?.status==='incorrect')return '字寫出來了，再留意筆順或下筆方向。';return '再看看這個字的位置和形狀，下次會更熟悉。';}
function displayFeedback(result,animate=true){const state=result.status||(result.correct?'correct':'incorrect');$('feedback').textContent=feedbackText(result,question());$('feedback').dataset.state=state;$('submit').hidden=true;$('next').hidden=false;$('next').textContent=index+1===round.questions.length?'完成探險 →':'下一題 →';renderWord(question(),true);$('battle-message').textContent=state==='correct'?'答對了，出招！':state==='incorrect'?'沒關係，再記住一次！':'請重新寫一次。';if(animate&&state!=='pending')battle.answer(state==='correct');if(questionMode()==='reading')renderReading();$('demo-ink').disabled=isExam();ink?.setDisabled(true);updateSubmit();}
$('submit').onclick=async()=>{if(busy||submitted)return;busy=true;updateSubmit();try{const q=question(),writing=questionMode()==='writing';let result;const answer=writing?{strokes:ink.getStrokes(),inputInterrupted}:structuredClone(currentAnswer);if(writing)result=ink.grade({mode:isExam()?'exam':'practice',gradingPolicy:'automatic-v1',alternatives});else{result=gradeReading(q,answer);result.status=result.correct?'correct':'incorrect';}if(result.correct===null){$('feedback').textContent=feedbackText(result,q);$('feedback').dataset.state='pending';return;}submitted=true;currentAnswer=answer;answers[index]={questionId:q.questionId||q.id,answer,hintUsed};feedbacks[index]=result;if(result.correct===true)correctCount++;else if(result.correct===false)wrongCount++;persist();refreshBattle();displayFeedback(result);}catch(e){fail(e);}finally{busy=false;updateSubmit();}};
$('next').onclick=async()=>{if(busy||questionLoading||!submitted||screen!=='play')return;if(index+1===round.questions.length){await finish();return;}busy=true;updateSubmit();try{index++;$('handwriting').style.pointerEvents='';await drawQuestion();}catch(error){fail(error);}finally{busy=false;updateSubmit();}};
$('undo-ink').onclick=()=>{if(!submitted&&!busy&&!questionLoading&&!demoPlaying)ink?.undo();};$('clear-ink').onclick=()=>{if(!submitted&&!busy&&!questionLoading&&!demoPlaying)ink?.clear();};
$('demo-ink').onclick=async()=>{const board=ink,generation=questionGeneration;if(isExam()||!board||busy||questionLoading||demoPlaying||!referenceReady||inputInterrupted)return;hintUsed=true;persist();demoPlaying=true;updateSubmit();try{await board.showDemo();}catch(error){if(generation===questionGeneration&&ink===board)fail(error);}finally{if(generation===questionGeneration&&ink===board){demoPlaying=false;updateSubmit();}}};
function summaryRows(rows){$('result-answers').replaceChildren();rows.forEach(r=>{const q=r.question,status=r.status||(r.correct?'correct':'incorrect'),card=node('div',undefined,'answer-review');card.append(node('strong',(status==='correct'?'✓ ':['pending','pending_review'].includes(status)?'◷ ':'↻ ')+q.word+' · '+q.bopomofo));const desc=['pending','pending_review'].includes(status)?'這份舊紀錄尚未完成判定。':status==='correct'?'這一題答對了。':'這一題可以再練習一次。';card.append(node('p',desc+(r.hintUsed?'（曾看筆順提示）':'')));$('result-answers').append(card);});}
function renderResult(run){
  const rows=resultRows(run),result=run.result;show('result');$('result-score').textContent=result.pending?'還有 '+result.pending+' 題未完成判定':result.correct+' / '+result.total+' 題答對';$('result-detail').textContent=result.pending?'已完成判定：'+result.correct+' 題正確。':'你又多記住一些國字了！';$('save-status').textContent=demo?'試玩紀錄已留在這個分頁；不會送到正式班級。':'紀錄已儲存，老師可以在後台查看。';summaryRows(rows);$('again').disabled=false;$('retry-save').hidden=true;$('card-reward').replaceChildren();
  if(run.kind==='exam'&&run.snapshot.rewardCardIds?.length){const box=$('card-reward');if(result.perfect){const button=node('button','✦ 領取小考卡片','primary');button.onclick=async()=>{button.disabled=true;try{const reward=await client.request('card-draw',{runId:run.id,requestId:'hanzi-card-'+run.id});box.replaceChildren();if(reward.complete){box.append(node('p','這份小考的卡片已經收齊了！'));return;}const card=PROFILE_CHARACTERS.find(c=>c.id===reward.character);if(card){const image=document.createElement('img');image.src=card.image;image.alt=card.name;box.append(image,node('p',card.name+' 已加入收藏，可以回首頁選為角色！'));}else box.append(node('p','卡片已加入收藏！'));}catch(e){fail(e);button.disabled=false;}};box.append(node('p','這次小考全對，獲得領卡資格！'),button);}else box.append(node('p','小考全對、沒有使用提示，就能領取老師設定的卡片。'));}
}
async function finish(){show('result');$('result-score').textContent='正在整理探險筆記…';$('result-detail').textContent='';$('save-status').textContent='正在儲存這一回合…';$('retry-save').hidden=true;$('again').disabled=true;busy=true;persist();try{
  const out=await client.request(isExam()?'exam-submit':'practice-submit',{roundId:round.roundId,attemptId:round.attemptId||round.roundId,...(isExam()?{examId:activeTask.id}:{}),requestId:submitRequestId,answers:compactAnswers(answers)});
  renderResult(out.run);roundStore.clear();
}catch(e){fail(e);$('result-score').textContent=storageHealthy?'答案已保留':'請保持本頁開啟';$('result-detail').textContent='還沒確認儲存成功，請留在這個分頁重試。';$('save-status').textContent='重試會使用同一份紀錄，不會重複計分。';$('retry-save').hidden=false;$('again').disabled=true;}finally{busy=false;}}
$('retry-save').onclick=()=>{if(!busy)finish();};$('again').onclick=()=>{if(busy||questionLoading)return;round=null;enter();};
$('resume').onclick=async()=>{if(busy||questionLoading)return;const saved=roundStore.read();if(!saved){enter();return;}busy=true;updateSubmit();try{({round,index,answers,feedbacks,submitted,currentAnswer,hintUsed,inputInterrupted,activeTask,submitRequestId,correctCount,wrongCount}=saved);inputTooComplex=!!saved.inputTooComplex;draftStrokes=saved.strokes||[];currentAnswer=currentAnswer||{};if(answers.length===round.questions.length){await finish();return;}if(submitted){index++;submitted=false;currentAnswer={};draftStrokes=[];hintUsed=false;inputInterrupted=false;inputTooComplex=false;}await drawQuestion(true);}catch(error){enter();fail(error);}finally{busy=false;if(screen==='entry')scopeCount();updateSubmit();}};
$('back-entry').onclick=()=>{if(busy||questionLoading||restoringInk)return;if(screen==='play')$('leave-dialog').showModal();else if(screen==='result'&&roundStore.read()){$('error').textContent='請先重新儲存這回合，避免遺失紀錄。';}else enter();};$('stay').onclick=()=>$('leave-dialog').close();$('leave').onclick=()=>{if(busy||questionLoading||restoringInk)return;persist();$('leave-dialog').close();enter();};
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>start(button.dataset.mode));
async function tasks(){show('tasks');$('task-list').textContent='正在讀取任務…';try{const[a,e]=await Promise.all([client.request('assignments'),client.request('exams')]);$('task-list').replaceChildren();const list=[...(a.assignments||[]).map(x=>({...x,kind:'assignment'})),...(e.exams||[]).map(x=>({...x,kind:'exam'}))];if(!list.length)$('task-list').textContent=demo?'這裡會顯示老師指派的作業與小考。試玩版目前沒有任務。':'目前沒有作業或小考，先自由練習吧！';for(const t of list){const card=node('article',undefined,'task-card'),state=taskState(t);card.append(node('p',t.kind==='exam'?'小考':'作業','eyebrow'),node('h2',t.title||'國字挑戰'),node('p',(t.mode==='writing'?'寫國字':'看字拼音')+' · '+t.count+' 題'));if(t.kind==='assignment')card.append(node('p','已完成 '+(t.completedRounds||0)+' / '+(t.requiredRounds||1)+' 回'));if(t.endsAt)card.append(node('p','截止：'+new Date(t.endsAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})));if(t.attempt?.result)card.append(node('p',t.attempt.result.pending?'舊紀錄尚未完成判定':t.attempt.result.correct+' / '+t.attempt.result.total+' 題答對'));const button=node('button',state==='completed'?'已完成':state==='submitted'?'查看成績與卡片':state==='started'?'繼續小考':'開始挑戰','primary');button.disabled=state==='completed';button.onclick=()=>start(t.mode||'reading',t);card.append(button);$('task-list').append(card);}}catch(e){fail(e);$('task-list').textContent='暫時讀不到任務，請回營地再試。';}}
$('tasks-button').onclick=tasks;
$('notebook-button').onclick=async()=>{show('notebook');$('notebook-list').textContent='正在翻開錯題本…';try{const out=await client.request('notebook'),items=out.items||[];$('notebook-list').replaceChildren();if(!items.length)$('notebook-list').textContent='目前沒有錯題，繼續累積本領吧！';for(const item of items){const q=item.question||item,card=node('article',undefined,'task-card');card.append(node('h2',q.word||q.character),node('p',q.bopomofo||''),node('p','可以再練一次'));const button=node('button','練習這一題');button.onclick=()=>start(item.mode||'reading',{kind:'notebook',lessonIds:[q.lessonId],termId:q.termId,count:1},[q.questionId||q.id||item.questionId]);card.append(button);$('notebook-list').append(card);}if(out.limited)$('notebook-list').append(node('p','這裡顯示最近 100 回合的錯題。'));}catch(e){fail(e);}};

async function boot(){
  $('home-link').href=classUrl('./'+(demo?'?demo=1':''));$('preview-note').hidden=!(demo||fixture);if(fixture)$('preview-note').textContent='教師本機測試 · 使用虛構學生與獨立測試紀錄';if(fixture)$('teacher-link').href='/admin/hanzi-fixture.html';
  if(fixture){const response=await fetch('/hanzi-fixture/session',{cache:'no-store'});if(!response.ok)throw Error('authentication_required');localSession=await response.json();}
  if(demo){const response=await fetch('data/hanzi-curriculum.json?v=20261115-1');if(!response.ok)throw Error('invalid_response');bank=await response.json();const valid=validateBank(bank);if(!valid.valid)throw Error('invalid_bank');client=createHanziDemo({bank,storage:tabStorage,key:classStorageKey('zhuyin.hanzi.demo.v1:'+new URL('.',location.href).pathname),gradeWriting:gradeInk});}
  else{if(!(localSession||sessions.read()))throw Error('authentication_required');client=createHanziClient({endpoint,classId:currentClass,getSession:()=>localSession||sessions.read()});}
  bootstrap=await client.request('bootstrap');bank=bootstrap.catalog||bank;if(!bank||!validateBank(bank).valid)throw Error('invalid_bank');
  if(!demo){const session=localSession||sessions.read();$('identity').textContent=session.seat+' 號';try{const response=await fetch(classUrl(endpoint+'/api'),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({kind:'profile',seat:session.seat,token:session.token})});const p=await response.json();if(p.error)throw Error(p.error);hero=PROFILE_CHARACTERS.find(c=>c.id===p.avatar)||hero;heroName=p.nickname||hero.name;}catch{heroName=hero.name;}}
  else $('identity').textContent='老師試玩';mountCharacter($('hero'),hero);$('hero-name').textContent=heroName;drawScope();$('loading').hidden=true;enter();
}
boot().catch(e=>{$('loading').hidden=true;fail(e);});
