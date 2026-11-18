import {currentClass,classStorageKey,classUrl} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {createHandwriting} from './hanzi-handwriting.js?v=20261115-hanzi2';
import {gradeStrokes} from './hanzi-stroke-core.js';
import {gradeCopy,copyFeedback} from './hanzi-copy-core.js?v=20261118-ink2';
import {gradeReading} from './hanzi-bank.js';
import {phonetic} from './hanzi-covers.js?v=20261118-ink2';

const $=id=>document.getElementById(id),demo=new URLSearchParams(location.search).get('demo')==='1';
const base=new URL('.',location.href).pathname, local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const endpoint=local?location.origin:'https://zhuyin-api.j822925.workers.dev';
const sessions=createStudentSession({storage:sessionStorage,key:classStorageKey('zhuyin.student-session.v1:'+base+':live')});
const owner=sessions.read(), key=classStorageKey('hanzi.classroom:'+base+':'+(demo?'demo':owner?.seat));
const labels={imitate:'生字模仿',write:'看注音寫國字',read:'看國字寫注音'};
const options=new Map();let board,ref,mode,item,pending,busy=false,syllable='',tone=null,interrupted=false,tooComplex=false,drawing=false;
$('camp').href=classUrl('hanzi.html'+(demo?'?demo=1':''));
$('preview').hidden=!demo;$('heading').replaceChildren(phonetic('上課選字'));
function validSession(){const s=sessions.read();return demo||!!owner&&s?.seat===owner.seat&&s.token===owner.token&&s.expires>Date.now();}
async function api(op,data){
  if(!validSession())throw Error('請回學習廣場重新登入。');
  const response=await fetch(new URL('/hanzi/copy/'+op,endpoint),{method:'POST',cache:'no-store',credentials:'omit',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+owner.token},body:JSON.stringify({...data,classId:currentClass})});
  const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error),{code:value.code});return value;
}
function screen(id){for(const p of ['choose','exercise','result'])$(p).hidden=p!==id;$('message').textContent='';}
function updateChoice(){
  item=options.get($('character').value);const can=!!item?.canWrite;
  for(const opt of $('mode').options)opt.disabled=!can&&opt.value!=='read';
  if(!can)$('mode').value='read';$('start').disabled=!item;
  $('availability').textContent=!item?'老師還沒有開放可練習的字。':can?'有筆順，可手寫':item.character+'：缺筆順，暫只能練讀音';
}
function editReading(){const text=(tone==='˙'?'˙':'')+syllable+(!tone||tone==='˙'?'':tone);$('answer').textContent=(text||'請選注音')+(syllable&&tone===null?'（請選聲調）':'');return text;}
function keypad(){
  $('keys').replaceChildren();
  for(const symbol of [...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ','一聲','ˊ','ˇ','ˋ','˙']){
    const b=document.createElement('button');b.textContent=symbol;b.onclick=()=>{if(busy||pending)return;
      if(['一聲','ˊ','ˇ','ˋ','˙'].includes(symbol))tone=symbol==='一聲'?'':symbol;else if(syllable.length<3)syllable+=symbol;editReading();};$('keys').append(b);
  }
}
function example(reference){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1 1');svg.setAttribute('aria-label',item.character+'的仿寫範例');svg.setAttribute('role','img');
  for(const d of reference.outlines||reference.strokes.map(s=>'M '+s.map(p=>p.join(' ')).join(' L '))){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill',reference.outlines?'#274c3c':'none');if(!reference.outlines){path.setAttribute('stroke','#274c3c');path.setAttribute('stroke-width','.025');path.setAttribute('stroke-linecap','round');}svg.append(path);}return svg;
}
async function openExercise(){
  board?.destroy();board=null;mode=$('mode').value;
  interrupted=false;tooComplex=false;drawing=false;syllable='';tone=null;ref=null;
  screen('exercise');$('exercise').dataset.mode=mode;$('instruction').replaceChildren(phonetic(labels[mode]));$('board').replaceChildren();$('model').replaceChildren();
  $('symbols').hidden=mode!=='read';$('show-demo').hidden=mode!=='imitate';$('undo').textContent=mode==='read'?'退一格':'退一筆';
  try{if(mode==='read'){$('model').textContent=item.character;editReading();keypad();}
    else{const resp=await fetch('data/hanzi-strokes/U'+item.character.codePointAt(0).toString(16).toUpperCase()+'.json');if(!resp.ok)throw Error('暫時無法載入這個字的筆順，請再試一次。');
      ref=await resp.json();if(mode==='imitate')$('model').append(example(ref));else $('model').textContent=item.reading;
      board=createHandwriting($('board'),{allowDemo:mode==='imitate',loadReference:async()=>ref,onChange:i=>{interrupted=i.inputInterrupted;tooComplex=i.inputTooComplex;drawing=i.isDrawing;}});
      await board.load(item.character);
    }
   }catch(e){screen('choose');$('message').textContent=e.message;}
}
async function start(){
  if(busy||!item)return;busy=true;
  try{await openExercise();}finally{busy=false;}
}
async function demonstrateAndRetry(feedback){
  pending=null;sessionStorage.removeItem(key);$('retry').hidden=true;
  if(!board||$('exercise').hidden){
    updateChoice();await openExercise();
  }
  if(!board)return;
  $('message').textContent=feedback+' 看一次筆順，再寫一次。';
  const pad=board;pad.setDisabled(true);
  try{await pad.showDemo();}finally{
    if(pad===board){pad.clear();pad.setDisabled(false);$('message').textContent='換你再寫一次，注意筆順和格子裡的位置。';}
  }
}
function choose(){if(busy||pending)return;board?.destroy();board=null;screen('choose');updateChoice();}
function showResult(out){board?.destroy();board=null;screen('result');$('feedback').textContent=(out.correct?'答對了！':'練習完成，再看看正確答案：'+item.character+'（'+item.reading+'）。')+(out.stars?' 得到 1 顆'+(demo?'試玩':'')+'星星。':' 這個字的這種練習今天已領滿 3 顆星。');}
async function finish(){if(busy)return;busy=true;$('message').textContent='';
  try{
    if(!pending){const answer=mode==='read'?editReading():{strokes:board?.getStrokes(),inputInterrupted:interrupted||drawing,inputTooComplex:tooComplex};
      if(mode==='read'&&(!syllable||tone===null))throw Error('請選注音和聲調，一聲也要點選。');
      if(mode!=='read'&&(!answer.strokes?.length||answer.inputInterrupted||answer.inputTooComplex))throw Error('請先完整寫一次再送出。');
      if(mode==='imitate'){
        const grade=gradeCopy(answer.strokes,ref);
        if(grade.correct!==true){await demonstrateAndRetry(copyFeedback(grade));return;}
      }
      pending={choiceId:item.id,mode,character:item.character,reading:item.reading,answer,requestId:crypto.randomUUID()};
      sessionStorage.setItem(key,JSON.stringify(pending));
    }
    let out;
    if(demo){const correct=mode==='read'?gradeReading({bopomofo:item.reading},pending.answer).correct:
      (mode==='imitate'?gradeCopy(pending.answer.strokes,ref):gradeStrokes(pending.answer.strokes,ref,{gradingPolicy:'automatic-v1'})).correct;
      if(correct===null)throw Object.assign(Error('請重新寫完整的字。'),{code:'writing_incomplete'});
      const date=new Date(Date.now()+28800000).toISOString().slice(0,10),k=key+':'+date+':'+mode+':'+item.character,count=Number(sessionStorage.getItem(k)||0);
      out={correct,stars:count<3?1:0};sessionStorage.setItem(k,String(count+out.stars));
    }else out=await api('classroom-finish',pending);
    pending=null;sessionStorage.removeItem(key);$('retry').hidden=true;showResult(out);
  }catch(e){if(e.code==='correction_required'&&mode==='imitate'){await demonstrateAndRetry('請留意字形和位置。');return;}if(['writing_incomplete','invalid_answer','choice_unavailable'].includes(e.code)){pending=null;sessionStorage.removeItem(key);if(e.code==='choice_unavailable'){board?.destroy();await load();}}
    $('message').textContent=e.message||'連線中斷，請再試一次。';if(pending){screen(null);$('message').textContent='答案已保留。'+e.message;$('retry').hidden=false;}
  }finally{busy=false;}
}
async function load(){
  try{const {groups}=demo?{groups:[{label:'試玩姓名',items:[{id:'name:0',character:'林',reading:'ㄌㄧㄣˊ',canWrite:true}]},{label:'試玩課次',items:[{id:'demo-spring',character:'春',reading:'ㄔㄨㄣ',canWrite:true}]}]}:await api('classroom-choices',{});
    options.clear();$('character').replaceChildren();for(const g of groups){const group=document.createElement('optgroup');group.label=g.label;for(const i of g.items){options.set(i.id,i);group.append(new Option(i.character+'　'+i.reading,i.id));}$('character').append(group);}
    $('retry').hidden=true;screen('choose');updateChoice();
    const saved=sessionStorage.getItem(key);if(saved&&!demo){pending=JSON.parse(saved);if(options.has(pending.choiceId))$('character').value=pending.choiceId;$('mode').value=pending.mode;item={id:pending.choiceId,character:pending.character,reading:pending.reading};mode=pending.mode;screen(null);$('message').textContent='上一次的答案等待儲存。';$('retry').hidden=false;}
  }catch(e){$('message').textContent=e.message;$('retry').hidden=false;}
}
$('character').onchange=updateChoice;$('start').onclick=start;$('finish').onclick=finish;$('again').onclick=()=>{updateChoice();return start();};
$('change').onclick=choose;$('back').onclick=choose;$('retry').onclick=()=>pending?finish():load();
$('clear').onclick=()=>{if(busy||pending)return;if(mode==='read'){syllable='';tone=null;editReading();}else board?.clear();};
$('undo').onclick=()=>{if(busy||pending)return;if(mode==='read'){if(tone!==null)tone=null;else syllable=syllable.slice(0,-1);editReading();}else board?.undo();};
$('show-demo').onclick=async()=>{if(!busy&&board){busy=true;try{await board.showDemo();}finally{busy=false;}}};
window.addEventListener('pageshow',()=>{if(!validSession()&&!demo){board?.destroy();options.clear();$('character').replaceChildren();screen(null);$('message').textContent='請回學習廣場重新登入。';}});
await load();

