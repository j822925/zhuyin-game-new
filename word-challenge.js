import {currentClass,classUrl,classStorageKey} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {createHanziClient} from './hanzi-client.js?v=20261129-words1';
import {newWordRound,markAnswer,visibleRound,taipeiDay,starReward,DAILY_LIMIT,SYMBOLS,TONES} from './word-challenge-core.js';
import {wordSpeaker} from './word-challenge-audio.js';
import {mountCharacter} from './character-motion.js?v=20261127-defeat1';
import {createOpponent,updateOpponent,createBattle} from './character-battle.js?v=20261127-defeat1';
import {showRoundOutcome} from './round-outcome.js?v=20261127-defeat1';
import {PROFILE_CHARACTERS} from './student-profile.js?v=20261127-defeat1';
import {MONSTERS} from './data/monsters.js?v=20261004-villains1';

const $=id=>document.getElementById(id);
const demo=new URLSearchParams(location.search).get('demo')==='1';
const path=new URL('.',location.href).pathname;
let storage;try{storage=sessionStorage;}catch{}
const sessions=createStudentSession({storage,key:classStorageKey('zhuyin.student-session.v1:'+path+':live')});
const owner=demo?null:sessions.read();
const belongs=()=>demo||!!owner&&sessions.read()?.token===owner.token;
const prefix=classStorageKey('word-challenge:v1:'+path+':'+(demo?'demo':owner?.seat||'guest'));
function read(key){try{return JSON.parse(storage?.getItem(prefix+key)??'null');}catch{return null;}}
function save(key,value){try{storage?.setItem(prefix+key,JSON.stringify(value));}catch{}}
const endpoint=['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'https://zhuyin-api.j822925.workers.dev';
const client=createHanziClient({endpoint,classId:currentClass,getSession:()=>belongs()?owner:null});
const opponent=createOpponent(),battle=createBattle(opponent,()=>$('hero'));
$('enemy').append(opponent);$('home').href=classUrl('hanzi.html'+(demo?'?demo=1':''));
let hero=PROFILE_CHARACTERS[0],id,state,shown,input='',tone='',busy=false,waiting=false,again,bank,trial;
const voice=wordSpeaker(text=>{$('notice').textContent=text;});
async function call(op,data){
  if(!belongs())throw Error('authentication_required');
  if(!demo)return client.request(op,data);
  if(op==='word-start'){
    if(!bank){const r=await fetch('./data/word-challenge-bank.json');if(!r.ok)throw Error('network');bank=await r.json();}
    trial=read(':trial');
    if(!trial||trial.id!==id){trial={...newWordRound(bank),id};save(':trial',trial);}
  }else if(trial.revision===data.revision&&trial.position<5){
    trial=markAnswer(trial,data.reading);
    if(trial.position===5){
      const day=':stars:'+taipeiDay(Date.now()),used=read(day)||0;
      trial.stars=Math.min(starReward(trial.correct),Math.max(0,DAILY_LIMIT-used));
      trial.dailyStars=used+trial.stars;save(day,trial.dailyStars);
    }
    save(':trial',trial);
  }
  return visibleRound(trial);
}
function refreshInput(){
  $('answer').textContent=(tone==='˙'?tone:'')+input+(tone==='˙'?'':tone)||'？';
  const locked=busy||waiting||!!again;
  for(const b of document.querySelectorAll('#keys button,#tones button,#erase'))b.disabled=locked;
  $('submit').disabled=locked||!input||!tone;
  $('next').disabled=busy;
  for(const b of $('tones').children)b.setAttribute('aria-pressed',String(b.dataset.tone===tone));
}
for(const sign of SYMBOLS){
  const b=document.createElement('button');b.textContent=sign;b.onclick=()=>{if(input.length<3){input+=sign;refreshInput();}};$('keys').append(b);
}
Array.from(TONES).forEach((sign,i)=>{
  const b=document.createElement('button');const label=['一聲','二聲','三聲','四聲','輕聲'][i];
  b.textContent=sign+' '+label;b.setAttribute('aria-label',label);b.dataset.tone=sign;
  b.onclick=()=>{tone=sign;refreshInput();};$('tones').append(b);
});
$('erase').onclick=()=>{if(tone)tone='';else input=input.slice(0,-1);refreshInput();};
function render(){
  voice.stop();battle.reset();$('notice').textContent='';$('feedback').textContent='';
  if(!state.question){
    $('arena').hidden=true;$('result').hidden=false;$('progress').textContent='';
    $('score').textContent='第一次就答對 '+state.correct+'／5 題';
    $('stars').textContent=(demo?'試玩':'本回合')+'得到 '+state.stars+' 顆星。今天 '+state.dailyStars+'／15 顆。';
    showRoundOutcome($('result'),state.correct,5,id,hero.id,opponent.dataset.monster||MONSTERS[0].id);
    save(':active',null);return;
  }
  shown=state.question;waiting=false;input='';tone='';
  $('progress').textContent='第 '+(state.position+1)+'／5 題';$('arena').hidden=false;$('result').hidden=true;
  const word=$('word');word.replaceChildren();
  const sound=document.createElement('span');sound.className='sound';sound.textContent='🔊';word.append(sound);
  Array.from(shown.word).forEach((ch,i)=>{const span=document.createElement('span');span.textContent=ch;if(i===shown.target)span.className='target';word.append(span);});
  word.setAttribute('aria-label','聽「'+shown.word+'」，請拼第 '+(shown.target+1)+' 個字「'+shown.word[shown.target]+'」');
  word.onclick=()=>{if(belongs())void voice.play(shown);};
  updateOpponent(opponent,MONSTERS[0],5,state.correct,{requiredLevels:[]});
  opponent.querySelector('.opponent-remaining').textContent='第一次答對 '+state.correct+' 題';
  $('health').value=5-(state.position-state.correct);
  if(state.last?.right===false)$('feedback').textContent='「'+state.last.character+'」讀 '+state.last.key+'，再拼一次。';
  $('submit').hidden=false;$('next').hidden=true;refreshInput();
}
async function perform(task){
  if(busy)return;busy=true;again=null;$('retry').hidden=true;$('notice').textContent='';refreshInput();
  try{await task();}
  catch(e){
    if(!belongs()||/authentication|forbidden|session/.test(e.message)){
      $('arena').hidden=true;$('notice').textContent='請回學習廣場登入，再進來挑戰。';
    }else{again=task;$('retry').hidden=false;$('notice').textContent='連線中斷，點「重新連線」接著這一題。';}
  }finally{busy=false;refreshInput();}
}
function start(newId=false){
  if(newId||!id)id=(!newId&&read(':active'))||crypto.randomUUID();
  save(':active',id);
  return perform(async()=>{state=await call('word-start',{roundId:id});render();});
}
$('submit').onclick=()=>{
  if(busy||waiting||!input||!tone)return;
  const sent={roundId:id,revision:state.revision,reading:input+tone},before=state;
  void perform(async()=>{
    const updated=await call('word-answer',sent);
    state=updated;
    if(updated.last?.revision!==sent.revision||updated.last.reading!==sent.reading){render();return;}
    voice.stop();battle.answer(updated.last.right);
    if(updated.last.right){
      waiting=true;$('feedback').textContent='答對了！';$('submit').hidden=true;$('next').hidden=false;
      $('next').textContent=updated.position===5?'看結果 →':'下一題 →';
    }else{
      $('feedback').textContent='「'+updated.last.character+'」讀 '+updated.last.key+'，聽一聽，再拼一次。';
      input='';tone='';$('health').value=Math.max(0,5-(before.position-before.correct)-1);
    }
  });
};
$('next').onclick=()=>{if(waiting&&!busy){waiting=false;render();}};
$('retry').onclick=()=>{if(again)void perform(again);};
$('again').onclick=()=>void start(true);
window.addEventListener('pagehide',()=>{voice.stop();battle.reset();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)voice.stop();else if(!belongs()){voice.stop();$('arena').hidden=true;$('notice').textContent='請回學習廣場重新登入。';}});
function mountHero(){mountCharacter($('hero'),hero);$('hero-name').textContent=hero.name;}
mountHero();
if(!demo&&owner){
  fetch(classUrl(endpoint+'/api'),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({kind:'profile',seat:owner.seat,token:owner.token})}).then(r=>r.json()).then(p=>{
    const selected=PROFILE_CHARACTERS.find(c=>c.id===p.avatar);
    if(selected&&belongs()){hero=selected;mountHero();}
  }).catch(()=>{});
}
void start();
