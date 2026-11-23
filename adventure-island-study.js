import {createStudentSession} from './student-session.js';
import {createHandwriting} from './hanzi-handwriting.js';
import {gradeReading,questionPool} from './hanzi-bank.js';
import {generate,answer as sumAnswer,equation,hint as mathHint} from './arithmetic-core.js';
import {battleRewardLimit} from './adventure-economy.js';
import {canSpendEnergy,spendEnergy} from './adventure-food-model.js';
import {drawStudyBeast} from './adventure-island-actors.js';

export function questionsFor(mode,data){
  if(mode==='name'){
    const group=(data.groups||[]).flatMap(g=>g.items).filter(i=>/^name:\d+$/.test(i.id));
    return group.length&&group.every(i=>i.canWrite&&i.reading)?group.map(i=>({character:i.character,prompt:i.reading})):[];
  }
  if(mode==='math'){
    const scope=data.scope;
    if(!scope?.enabled||!scope.levels?.includes(10))return [];
    const operation=['mix','add','sub'].find(x=>scope.operations?.includes(x));
    const skill=['mixed','basic','regroup'].find(x=>scope.skills?.includes(x));
    if(!operation||!skill)return [];
    let deck;
    try{deck=generate({max:10,operation,skill,count:5});}catch(error){if(error.message==='scope_too_small')return [];throw error;}
    return deck.slice(0,3).map(q=>({prompt:equation(q)+' ＝ ？',q}));
  }
  const writing=mode==='writing';
  const pool=questionPool(data.catalog,data.scope?.lessonIds,mode,{termId:data.scope?.termId})
    .filter(q=>!writing||data.writingReadyItemIds?.includes(q.itemId));
  if(!pool.length)return [];
  const deck=pool.slice();
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return Array.from({length:3},(_,i)=>{const q=deck[i%deck.length];
    const hintWord=[...q.word].map((ch,j)=>ch===q.character?'□':ch).join('');
    const similar=writing?[...new Set(data.catalog.items.filter(item=>item.character!==q.character&&item.strokeCount===q.strokeCount).map(item=>item.character))].slice(0,6):[];
    return {...q,similar,prompt:writing?q.bopomofo+'　'+hintWord:[...q.word].map((ch,j)=>j===q.targetIndex?'【'+ch+'】':ch).join('')};
  });
}
export function studyReward(level){
  return battleRewardLimit({mode:'spelling',level})+1;
}
export function settleStudy(state,id,save){
  if(state.settled.includes(id))return true;
  const old={energy:state.life.nutrition.energy,wins:state.wins,stars:state.stars,settled:state.settled};
  if(!spendEnergy(state,'battle'))return false;
  state.stars+=studyReward(state.expedition.level);state.wins=Math.min(9999,state.wins+1);
  state.settled=[...state.settled,id].slice(-50);
  if(save())return true;
  state.stars=old.stars;state.wins=old.wins;state.settled=old.settled;state.life.nutrition.energy=old.energy;return false;
}
export function studentAccess(){
  const forest=globalThis.ForestStudent;
  if(!forest?.seat||!forest.classId)throw Error('請先回學習廣場登入，再來挑戰。');
  const suffix=forest.classId==='main'?'':':class:'+forest.classId;
  const auth=createStudentSession({storage:sessionStorage,key:'zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live'+suffix});
  const initial=auth.read();
  function current(){const s=auth.read();return !!initial&&s?.seat===forest.seat&&s.token===initial.token&&globalThis.ForestStudent===forest;}
  return {current,async load(mode,signal){
    if(!current())throw Error('請先重新登入。');
    const route=mode==='name'?'hanzi/copy/classroom-choices':mode==='math'?'arithmetic/bootstrap':'hanzi/bootstrap';
    const r=await fetch(new URL(route,'https://zhuyin-api.j822925.workers.dev/'),{method:'POST',credentials:'omit',cache:'no-store',signal,
      headers:{Authorization:'Bearer '+initial.token,'Content-Type':'application/json'},body:JSON.stringify({classId:forest.classId})});
    if(!r.ok||!current())throw Error('題目暫時讀不到，請稍後再試。');
    return questionsFor(mode,await r.json());
  }};
}
export function createIslandStudy({state,save,changed,stop,paintHero,onWon,access=studentAccess}){
  const dialog=document.createElement('dialog');dialog.className='island-study';dialog.ariaLabel='小怪答題挑戰';
  document.body.append(dialog);
  const node=(tag,txt,cls)=>{const e=document.createElement(tag);e.textContent=txt||'';if(cls)e.className=cls;return e;};
  const button=(label,fn)=>{const b=node('button',label);b.type='button';b.onclick=fn;return b;};
  let run=null,board=null,controller,timeout,raf;
  function close(){run=null;controller?.abort();clearTimeout(timeout);cancelAnimationFrame(raf);board?.destroy();board=null;dialog.close();dialog.replaceChildren();stop();}
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  function finish(r){
    if(run!==r||r.paid)return;
    if(!r.access.current()){close();return;}
    if(!settleStudy(state(),r.id,save)){
      r.note.textContent='還沒存好，請再試一次。';r.controls.replaceChildren(button('再試一次',()=>finish(r)));return;
    }
    r.paid=true;changed();onWon(r.b);r.prompt.textContent='挑戰成功！';
    r.note.textContent='獲得 '+studyReward(state().expedition.level)+' 枚星幣';r.controls.replaceChildren(button('回到地圖',close));
  }
  async function showQuestion(r){
    if(run!==r)return;
    if(!r.access.current()){close();return;}
    board?.destroy();board=null;
    const q=r.questions[r.index],mode=r.b.mode;
    r.prompt.textContent=q.prompt;r.count.textContent=(r.index+1)+' / '+r.questions.length;r.note.textContent='';r.controls.replaceChildren();
    let input='',tone=null,locked=false,writing=false,interrupted=false;
    const actions=node('div','','study-actions'),keys=node('div','','study-keys'),value=node('output','');
    let alternatives=[];
    const update=()=>{value.textContent=input+(tone||'')||'　';};
    const clear=()=>{input='';tone=null;update();board?.clear();};
    function submit(){
      if(locked||run!==r||writing)return;
      if(!r.access.current()){close();return;}
      let ok=false;
      if(mode==='math')ok=input!==''&&Number(input)===sumAnswer(q.q);
      else if(mode==='reading')ok=tone!==null&&gradeReading(q,input+tone).correct;
      else if(board&&!interrupted&&board.getStrokes().length)ok=board.grade({gradingPolicy:'automatic-v1',alternatives}).correct===true;
      if(!ok){r.note.textContent=mode==='math'?mathHint(q.q):mode==='reading'?'再看看括號裡的字，記得選聲調。':'再看一次注音，用手指重新寫。';clear();return;}
      locked=true;r.strike=performance.now();r.note.textContent='答對！星光擊中 '+r.b.name;
      r.hp.value=r.questions.length-r.index-1;r.index++;r.controls.replaceChildren();
      if(board){board.destroy();board=null;}
      timeout=setTimeout(()=>{if(run!==r)return;if(r.index===r.questions.length)finish(r);else void showQuestion(r);},540);
    }
    if(mode==='math'||mode==='reading'){
      keys.dataset.kind=mode;const labels=mode==='math'?[...'1234567890']:[...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ','一聲','ˊ','ˇ','ˋ','˙'];
      for(const k of labels)keys.append(button(k,()=>{if(mode==='reading'&&['一聲','ˊ','ˇ','ˋ','˙'].includes(k))tone=k==='一聲'?'':k;else if(input.length<3)input+=k;update();}));
      r.controls.append(value,keys);
    }else{
      const holder=node('div','','study-ink');r.controls.append(holder);
      const pad=createHandwriting(holder,{allowDemo:true,onChange:i=>{writing=i.isDrawing;interrupted=i.inputInterrupted||i.inputTooComplex;}});board=pad;
      try{const reference=await pad.load(q.character);if(run!==r)return;if(!reference)throw Error('reference-unavailable');
        alternatives=await Promise.all((q.similar||[]).map(async char=>{
          const url=new URL('./data/hanzi-strokes/U'+char.codePointAt(0).toString(16).toUpperCase()+'.json',import.meta.url);
          const response=await fetch(url,{signal:controller.signal});
          return response.ok?response.json():null;
        }));alternatives=alternatives.filter(Boolean);}
      catch{if(run===r){r.note.textContent='這個字的筆順暫時讀不到。';r.controls.replaceChildren(button('再試一次',()=>void showQuestion(r)));}return;}
      if(run!==r)return;
      actions.append(button('看筆順',async()=>{if(locked)return;locked=true;try{await pad.showDemo();}finally{locked=false;}}));
    }
    actions.append(button('重寫',clear),button('出招',submit));r.controls.append(actions);
  }
  async function open(b){
    if(run)return;stop();
    const r={b,id:'island-'+crypto.randomUUID(),index:0,strike:-10000};run=r;
    dialog.replaceChildren();const top=node('header'),title=node('strong',b.label);r.count=node('span','');
    top.append(title,r.count,button('回地圖',close));const stage=node('div','','study-stage'),left=node('canvas'),right=node('canvas');
    left.width=right.width=160;left.height=right.height=130;left.ariaLabel=b.name;right.ariaLabel='我的角色';
    const middle=node('div','','study-center');r.prompt=node('h2',b.name);r.hp=node('progress');middle.append(r.prompt,r.hp);
    stage.append(left,middle,right);r.note=node('div','準備題目中…','study-note');r.note.setAttribute('role','status');
    r.controls=node('div','','study-controls');dialog.append(top,stage,r.note,r.controls);dialog.showModal();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last=-100;
    function frame(now){if(run!==r)return;raf=requestAnimationFrame(frame);if(document.hidden||now-last<42)return;last=now;
      const c=left.getContext('2d');c.clearRect(0,0,160,130);const dt=now-r.strike;
      drawStudyBeast(c,b,80,109,reduced?0:now/1000,{scale:1.36,label:false,hit:!reduced&&dt<330?-8*Math.sin(Math.PI*dt/330):0});
      const h=right.getContext('2d');h.clearRect(0,0,160,130);paintHero(h,!reduced&&dt<330);
      if(dt<420){c.fillStyle='#f6c346';c.font='bold 32px sans-serif';c.fillText('✦',98,45);}
    }frame(performance.now());
    try{
      if(!canSpendEnergy(state(),'battle'))throw Error('體力不足，吃點東西再回來吧。');
      if(globalThis.ForestAccess&&!(await globalThis.ForestAccess.check())){if(run===r)close();return;}
      if(run!==r)return;
      r.access=access();controller=new AbortController();timeout=setTimeout(()=>controller.abort(),12000);
      const questions=await r.access.load(b.mode,controller.signal);if(run!==r)return;clearTimeout(timeout);
      if(!questions.length)throw Error(b.mode==='name'?'老師還沒有設定可書寫的姓名。':'目前還沒有開放這種題目。');
      r.questions=questions;r.hp.max=questions.length;r.hp.value=questions.length;await showQuestion(r);
    }catch(e){if(run!==r)return;clearTimeout(timeout);r.note.textContent=e.name==='AbortError'?'連線較慢，請再試一次。':e.message;r.controls.replaceChildren(button('再試一次',()=>{close();void open(b);}));}
  }
  return {open,get busy(){return !!run;}};
}
