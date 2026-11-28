import {currentClass,classStorageKey,classUrl} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {createHandwriting} from './hanzi-handwriting.js?v=20261127-alltrace1';
import {writingPrompt,syllable,phoneticFeedback} from './guided-prompt.js';
import {showRewardPictures} from './guided-reward-view.js?v=20261129-classprizes2';
import {HANZI_AUDIO} from './data/hanzi-teacher-audio.js?v=20261115-hanzi2';
const $=id=>document.getElementById(id), labels={copy:'照著範例寫',write:'看注音寫國字',read:'看國字寫注音',listen:'聽國字拼注音',math:'算算看'};
const endpoint=['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'https://zhuyin-api.j822925.workers.dev';
const sessions=createStudentSession({storage:sessionStorage,key:classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live')});
const preview=new URL(location.href).searchParams.get('demo')==='1';
const owner=sessions.read(),audio=new Audio(),ns='http://www.w3.org/2000/svg';
let inkBusy=false,inkInterrupted=false,inkComplex=false;
let visit,activitySeq=0,lastActivity;
let plan,state,board,input='',tone='',busy=false,frame=0,replayId=0,lastInk=null,waiting=false,pending=null,generation=0,soundId=0;
$('home').href=classUrl(currentClass==='grade2'?'grade2.html':'index.html');
async function api(op,data={}){
 if(preview){const {trial}=await import('./guided-trial.js?v=20261129-classprizes2');return trial(op,data);}
 const session=sessions.read();
 if(!owner||session?.seat!==owner.seat||session?.token!==owner.token||session.expires<=Date.now())throw Error('請回學習廣場登入，再進入課堂練習。');
 const res=await fetch(new URL('/hanzi/guided-'+op,endpoint),{method:'POST',cache:'no-store',keepalive:op==='activity',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({...data,classId:currentClass}),signal:AbortSignal.timeout(16000)});
 const v=await res.json();if(!res.ok)throw Error(v.error||'暫時無法儲存，請再試一次。');return v;
}
function element(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
function screen(id){for(const n of ['plans','exercise','result'])$(n).hidden=n!==id;$('list').hidden=id!=='exercise';}
function stopSound(){soundId++;audio.onerror=null;audio.pause();window.speechSynthesis?.cancel();}
function stopReplay(){replayId++;cancelAnimationFrame(frame);$('replay').setAttribute('hidden','');$('ink').hidden=false;}
function clean(){generation++;stopSound();stopReplay();board?.destroy();board=null;lastInk=null;pending=null;waiting=false;}
function say(q){
 stopSound();const key=soundId;
 function voice(){if(key!==soundId)return;if(!window.speechSynthesis){$('notice').textContent='無法播放，請檢查聲音後再點聽一遍。';return;}
 const u=new SpeechSynthesisUtterance(q.character);u.lang='zh-TW';u.rate=.8;speechSynthesis.speak(u);}
 if(!HANZI_AUDIO[q.reading]){voice();return;}
 let used=false;const fallback=()=>{if(!used&&key===soundId){used=true;voice();}};
 audio.onerror=fallback;audio.src=new URL(HANZI_AUDIO[q.reading],import.meta.url);audio.play().catch(fallback);
}
function retry(error,again){$('status').replaceChildren(document.createTextNode((error.message||'連線中斷')+' '));const b=element('button','再試一次');b.onclick=again;$('status').append(b);}
async function listing(){
 if(busy)return;activity('away');visit=null;clean();screen('plans');$('status').textContent='';$('plans').replaceChildren();busy=true;
 try{const {plans}=await api('list');if(!plans.length)$('plans').append(element('p','老師目前還沒有開放課堂練習。'));
 for(const p of plans){const b=element('button',p.title+'　'+(p.position===null?'開始練習':p.position===p.total?'已完成，查看成績':'繼續第 '+(p.position+1)+' 題')+'　／共 '+p.total+' 題');b.className='plan';b.onclick=()=>start(p.id);$('plans').append(b);}
 }catch(e){retry(e,listing);}finally{busy=false;}
}
async function start(id){
 if(busy)return;busy=true;plan=id;visit=crypto.randomUUID();activitySeq=0;lastActivity='here';try{$('status').textContent='';state=await api('start',{id,visit});await render();}
 catch(e){retry(e,()=>start(id));}finally{busy=false;controls();}
}
function makePath(points,color,width){
 const path=document.createElementNS(ns,'path');path.setAttribute('d',points.map((p,i)=>(i?'L':'M')+(p.x??p[0])+' '+(p.y??p[1])).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width',width);path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');return path;
}
function example(q){const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1 1');svg.setAttribute('aria-label',q.character+'的範例');for(const s of q.reference.strokes)svg.append(makePath(s,'#315646',.025));return svg;}
function replay(){
 if(!lastInk||busy||waiting||!board||board.isTracePractice())return;
 stopReplay();const id=replayId,svg=$('replay'),{ink,feedback,ref}=lastInk;
 svg.replaceChildren();svg.removeAttribute('hidden');$('ink').hidden=true;
 const paths=ink.map((line,i)=>{const p=makePath(line,feedback.bad?.includes(i+1)?'#be2026':'#294b40',.018);p.setAttribute('pathLength','1');p.style.strokeDasharray='1';p.style.strokeDashoffset='1';svg.append(p);return p;});
 const start=performance.now(),step=Math.min(420,4500/Math.max(1,paths.length));
 function draw(now){if(id!==replayId)return;const t=(now-start)/step;
 paths.forEach((p,i)=>p.style.strokeDashoffset=String(1-Math.max(0,Math.min(1,t-i))));
 if(t<paths.length)frame=requestAnimationFrame(draw);
 else for(const idx of feedback.missing||[]){const line=ref.strokes[idx-1];if(line){const p=makePath(line,'#be2026',.012);p.setAttribute('stroke-dasharray','.025 .015');svg.append(p);}}
 }frame=requestAnimationFrame(draw);controls();
}
function keys(){
 const area=$('other');const out=element('output','請選注音和聲調');area.append(out);
 const pad=element('div','');pad.className='keys';area.append(pad);
 const show=()=>out.replaceChildren(input||tone?syllable(input+tone):'請選注音和聲調');
 for(const k of 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦˉˊˇˋ˙'){
  const b=element('button',k==='ˉ'?'一聲':k);b.onclick=()=>{if(locked())return;if('ˉˊˇˋ˙'.includes(k))tone=k;else if(input.length<3)input+=k;show();};pad.append(b);}
 const erase=element('button','退一格');erase.onclick=()=>{if(locked())return;if(tone)tone='';else input=input.slice(0,-1);show();};area.append(erase);
}
function traceFeedback({correct}){
 $('notice').className=correct?'ok':'trace-retry';
}
function locked(){return busy||waiting||!!pending;}
function controls(){
 const trace=board?.isTracePractice()===true,showing=!$('replay').hasAttribute('hidden');
 $('submit').hidden=trace||waiting||showing;$('submit').disabled=busy;$('submit').textContent=pending?'重新送出':'送出答案';
 $('next').hidden=!waiting;$('next').textContent=state?.completed?'看成績':'下一題 →';
 $('trace').hidden=!board||waiting;$('trace').disabled=locked();$('trace').setAttribute('aria-pressed',String(trace));$('trace').textContent=trace?'關閉底字，自己寫':'開啟淡色底字';
 $('demo').hidden=!board||waiting||trace;$('demo').disabled=locked();
 $('againReplay').hidden=!lastInk||trace||waiting;$('clear').hidden=!board||waiting;
 $('clear').textContent=showing?'換我再寫一次':trace?'重新描一次':'重寫';$('list').disabled=busy;
}
function top(){ $('title').textContent=state.title;$('progress').textContent='第 '+Math.min(state.position+1,state.total)+'／'+state.total+' 題';$('score').textContent='目前可得 '+state.score+' 分';}
async function render(){
 clean();$('status').textContent='';if(state.completed){screen('result');$('final').textContent='練習完成！ '+state.score+' 分';const reward=state.reward;
 const awards=(reward?.items||[]).map(item=>item.kind==='meal'?'完成獎：'+item.name+'（補 '+item.energy+'% 體力）':'滿分加贈：'+item.name);
 if(!awards.length&&reward?.name)awards.push('滿分禮物：'+reward.name);
 if(awards.length)awards.push(preview?'教師試玩，獎品僅供示範。':reward.mail?'到探險島的禮物信箱領取。':'已放進探險島的收藏。');
 $('gift').textContent=awards.join('　');showRewardPictures($('reward-pictures'),reward);return;}
 screen('exercise');top();input='';tone='';const q=state.question;
 $('other').replaceChildren();$('model').replaceChildren();$('ink').replaceChildren();$('notice').className='';
 $('notice').replaceChildren(phoneticFeedback(state.feedback?.correct===false&&state.feedback.position===state.position?state.feedback.tip:''));
 $('exercise').dataset.mode=q.mode;
 $('context').textContent='';$('prompt').replaceChildren();
 const phrases={write:['看注音','寫國字'],read:['看國字','寫注音'],listen:['聽國字','拼注音'],copy:['看範例','寫一寫']}[q.mode];
 if(phrases){for(const phrase of phrases)$('prompt').append(element('span',phrase));}else $('prompt').textContent=labels[q.mode];$('sound').hidden=q.mode!=='listen';$('sound').onclick=()=>say(q);
 if(q.mode==='write'||q.mode==='copy'){
  if(q.mode==='copy')$('model').append(example(q));else $('context').append(writingPrompt(q));
  inkBusy=inkInterrupted=inkComplex=false;
  board=createHandwriting($('ink'),{loadReference:async()=>q.reference,traceFeedbackElement:$('notice'),onTraceFeedback:traceFeedback,onChange:i=>{inkBusy=i.isDrawing;inkInterrupted=i.inputInterrupted;inkComplex=i.inputTooComplex;}});await board.load(q.character);
 }else if(q.mode==='math'){
  $('context').textContent=q.a+(q.op==='add'?' ＋ ':' － ')+q.b+' ＝ ?';
  const field=element('input','');field.type='text';field.inputMode='numeric';field.maxLength=5;field.setAttribute('aria-label','我的答案');field.oninput=()=>input=field.value.trim();$('other').append(field);
 }else{if(q.mode==='read')$('context').textContent=q.character;keys();if(q.mode==='listen')say(q);}
 controls();
}
async function send(){
 if(busy||waiting||board?.isTracePractice())return;
 if(!pending){const q=state.question;let answer=input;
 if(board){if(inkBusy||inkInterrupted||inkComplex){$('notice').textContent='這一筆還沒寫完整，請重寫。這次不扣分。';return;}answer=board.getStrokes();if(!answer.length){$('notice').textContent='請先自己寫一次。';return;}}
 if(['read','listen'].includes(q.mode)){if(!input||!tone){$('notice').textContent='請選注音和聲調，一聲也要點。';return;}answer=tone==='˙'?'˙'+input:input+tone;}
 if(q.mode==='math'&&!/^\d{1,5}$/.test(answer)){$('notice').textContent='請先填入數字。';return;}
 pending={id:plan,requestId:crypto.randomUUID(),revision:state.revision,position:state.position,answer};}
 const sent=pending,q=state.question;busy=true;board?.setDisabled(true);controls();
 try{const updated=await api('answer',sent);pending=null;$('status').textContent='';
 if(updated.notice){$('notice').textContent=updated.notice;return;}
 if(updated.revision!==sent.revision+1||updated.feedback?.position!==sent.position){state=updated;await render();return;}
 state=updated;$('score').textContent='目前可得 '+state.score+' 分';const g=updated.feedback;
 if(g.correct){waiting=true;$('notice').className='ok';$('notice').textContent='答對了！';}
 else{
  const left=Math.max(0,4-state.mistakes[sent.position].count);
  $('notice').className='';$('notice').replaceChildren(phoneticFeedback('再試一次。'+g.tip+(left?' 這題還能拿原來的'+['','四分之一','一半','四分之三'][left]+'分數。':' 這題已扣到零分，自己答對就能繼續。')));
  if(board){lastInk={ink:sent.answer,feedback:g,ref:q.reference};board.clear();}else{input='';tone='';$('other').querySelector('input')&&($('other').querySelector('input').value='');const o=$('other').querySelector('output');if(o)o.textContent='再選一次';}
 }
 }catch(e){retry(e,send);}finally{busy=false;board?.setDisabled(waiting||!!pending);controls();}
 if(lastInk&&!waiting&&!pending)replay();
}
$('trace').onclick=()=>{if(locked()||!board)return;stopReplay();board.setTracePractice(!board.isTracePractice());$('notice').className='';$('notice').textContent=board.isTracePractice()?'從第一筆開始，跟著淡色字描寫。':'換你自己從空白格寫一次。';controls();};
$('clear').onclick=()=>{if(locked())return;stopReplay();board?.clear();if(board?.isTracePractice()){$('notice').className='';$('notice').textContent='從第一筆開始描。';}controls();};
$('demo').onclick=async()=>{if(locked()||!board||board.isTracePractice())return;stopReplay();busy=true;controls();try{await board.showDemo();}finally{busy=false;controls();}};
$('againReplay').onclick=replay;$('submit').onclick=send;$('next').onclick=async()=>{if(waiting&&!busy)await render();};$('list').onclick=listing;$('done').onclick=listing;
function activity(value){
 if(preview||!visit||!state||state.completed||value===lastActivity)return;
 lastActivity=value;void api('activity',{id:plan,visit,seq:++activitySeq,activity:value}).catch(()=>{});
}
document.addEventListener('visibilitychange',()=>activity(document.hidden?'away':'here'));
window.addEventListener('pagehide',()=>{activity('away');stopReplay();stopSound();});
window.addEventListener('pageshow',e=>{if(e.persisted)void listing();});
if(preview)document.querySelector('header h1').textContent='課堂練習 · 教師試玩';
void listing();
