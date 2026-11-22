import {currentClass,classStorageKey,classUrl} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {HANZI_AUDIO} from './data/hanzi-teacher-audio.js?v=20261115-hanzi2';
const get=id=>document.getElementById(id), content=get('content'), params=new URLSearchParams(location.search);
const demo=params.get('demo')==='1', quiz=params.get('mode')==='challenge';
const base=new URL('.',location.href).pathname;
let storage;try{storage=sessionStorage;}catch{}
const sessions=createStudentSession({storage,key:classStorageKey('zhuyin.student-session.v1:'+base+':live')});
const owner=demo?'demo':sessions.read()?.seat;
const saveKey=classStorageKey('weekly-hanzi:v1:'+base+':'+(demo?'demo':'student')+':'+owner);
const api=['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'https://zhuyin-api.j822925.workers.dev';
get('home').href=classUrl('hanzi.html'+(demo?'?demo=1':''));
get('title').textContent=quiz?'七字認字挑戰':'每週認字';
get('note').textContent=(demo?'教師試玩 · ':'')+(quiz?'七個字各答一次，全對拿 7 顆星。每週最多 70 顆。':'選一個字，點一點，聽讀音和造詞。');
let edition,round,busy=false,timer,spoken=0,audio=new Audio();
function element(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn,cls){const b=element('button',text,cls);b.type='button';b.onclick=fn;return b;}
function resetSound(){spoken++;audio.onerror=null;audio.pause();window.speechSynthesis?.cancel();}
function speak(text,reading){
 resetSound();const id=spoken;get('status').textContent='';
 function voice(){
   if(id!==spoken)return;
   if(!window.speechSynthesis){get('status').textContent='這台裝置沒有中文朗讀語音。';return;}
   const u=new SpeechSynthesisUtterance(text),voices=speechSynthesis.getVoices();
   u.lang='zh-TW';u.voice=voices.find(v=>/zh[-_]TW|cmn[-_]TW/i.test(v.lang))||voices.find(v=>/^zh|^cmn/.test(v.lang))||null;u.rate=.82;
   u.onerror=e=>{if(id===spoken&&!['interrupted','canceled'].includes(e.error))get('status').textContent='播放失敗，請再點一次，或檢查裝置的中文語音。';};speechSynthesis.speak(u);
 }
 const path=HANZI_AUDIO[reading];
 if(path){let used=false;const fallback=()=>{if(!used&&id===spoken){used=true;voice();}};audio.onerror=fallback;audio.src=new URL(path,import.meta.url);audio.play().catch(fallback);}else voice();
}
window.addEventListener('pagehide',resetSound);
function read(key){try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}}
function write(key,data){try{storage?.setItem(key,JSON.stringify(data));}catch{}}
async function request(op,data={}){
 if(demo){
   const {weeklySet,scoreRound}=await import('./weekly-hanzi-core.js?v=20261122-textbook'),set=weeklySet();
   if(op==='weekly-set')return set;
   const k=saveKey+':preview:'+data.weekId,receipts=read(k)||{};
   if(receipts[data.roundId])return receipts[data.roundId];
   if(data.weekId!==set.weekId)throw Error('week_changed');
   const correct=scoreRound(set,data.answers),earned=Object.values(receipts).reduce((n,r)=>n+r.stars,0);
   const result={correct,stars:correct===7&&earned<70?7:0};receipts[data.roundId]=result;write(k,receipts);return result;
 }
 const session=sessions.read();if(!owner||session?.seat!==owner)throw Error('請從學習廣場重新登入。');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
 try{
   const r=await fetch(new URL('/hanzi/'+op,api),{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify({...data,classId:currentClass})});
   const value=await r.json();if(!r.ok)throw Error(value.code==='week_changed'?'week_changed':value.error||'無法讀取，請再試一次。');return value;
 }finally{clearTimeout(timeout);}
}
function shuffled(list){const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function study(i=0,play=false){
 resetSound();content.replaceChildren();const card=edition.cards[i],tabs=element('div',undefined,'tabs');
 edition.cards.forEach((c,j)=>{const b=button(c.char,()=>study(j,true));b.setAttribute('aria-pressed',j===i);tabs.append(b);});
 const panel=element('article',undefined,'card'),sound=()=>speak(card.char,card.reading);
 panel.append(button(card.char,sound,'hero-word'),element('p'));
 panel.append(button('聽讀音　'+card.reading+(/[ˊˇˋ˙]/.test(card.reading)?'':'ˉ'),sound,'reading'),button('部首　'+card.radical,()=>speak(card.radical+'部')));
 panel.append(element('h2','這個字的意思'),button(card.meaning,()=>speak(card.meaning)),element('h2','用這個字造詞'));
 const words=element('div',undefined,'word-list'),letters=element('div',undefined,'letters');
 card.words.forEach(w=>words.append(button('♪ '+w,()=>{speak(w);letters.replaceChildren(element('span','聽單字'));for(const ch of w)letters.append(button(ch,()=>speak(ch,ch===card.char?card.reading:undefined)));})));
 panel.append(words,letters);content.append(tabs,panel);if(play)sound();
}
function newRound(){round={weekId:edition.weekId,roundId:crypto.randomUUID(),order:shuffled(edition.cards.map(c=>c.char)),answers:[],input:''};write(saveKey,round);question();}
function question(){
 if(round.answers.length===7){void submit();return;}
 content.replaceChildren();const n=round.answers.length,panel=element('article',undefined,'quiz');
 const top=element('div',undefined,'quiz-head'),out=element('output',round.input||'？','answer');
 out.setAttribute('aria-label','我的注音');top.append(element('span','第 '+(n+1)+'／7 題'),element('strong',round.order[n],'prompt'),out);
 const keys=element('div',undefined,'keys');panel.append(top,keys);content.append(panel);
 const tones='ˉˊˇˋ˙';const update=value=>{round.input=value;out.textContent=value||'？';write(saveKey,round);};
 for(const key of 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ'+tones){
   const mark=tones.includes(key),b=button(key,()=>{if(mark)update(round.input.replace(/[ˉˊˇˋ˙]/g,'')+key);else if(round.input.replace(/[ˉˊˇˋ˙]/g,'').length<3)update(round.input.replace(/[ˉˊˇˋ˙]/g,'')+key);});
   if(mark)b.setAttribute('aria-label',['一聲','二聲','三聲','四聲','輕聲'][tones.indexOf(key)]);keys.append(b);
 }
 const actions=element('div',undefined,'actions');actions.append(button('刪一個',()=>update(round.input.slice(0,-1))),button(n===6?'完成挑戰':'下一題 →',()=>{
   if(!/[ㄅ-ㄩ]/.test(round.input)){get('status').textContent='先點注音，再送出。';return;}
   get('status').textContent='';round.answers.push({char:round.order[n],reading:round.input});round.input='';write(saveKey,round);question();
 },'primary'));panel.append(actions);
}
async function submit(){
 if(busy)return;busy=true;content.replaceChildren(element('p','正在核對七個字…'));
 try{
   const r=await request('weekly-submit',{weekId:round.weekId,roundId:round.roundId,answers:round.answers});
   write(saveKey,null);get('status').textContent='';
   const panel=element('article',undefined,'card');panel.append(element('h2','答對 '+r.correct+'／7 個字','score'),element('p',r.stars?'得到 '+r.stars+' 顆'+(demo?'試玩星星！':'星星！'):r.correct===7?'這週已集滿 70 顆星星！':'七個字全對就能拿星星。'));
   for(const a of round.answers){const c=edition.cards.find(v=>v.char===a.char);if(c&&c.reading!==a.reading.replace(/ˉ$/,''))panel.append(button(c.char+'　'+c.reading,()=>speak(c.char,c.reading)));}
   panel.append(element('p'),button('再挑戰一次',()=>load(true),'primary'));content.replaceChildren(panel);
 }catch(e){if(e.message==='week_changed'){write(saveKey,null);get('status').textContent='新的一週到了，一起看看新的七個字！';content.replaceChildren(button('看這週的字',()=>load(true)));}else retry(e,submit);}
 finally{busy=false;}
}
function retry(e,fn){get('status').textContent=/fetch|abort|network/i.test(e.message)?'連線中斷，請再試一次。':e.message;content.replaceChildren(button('重新連線',fn));}
async function load(fresh=false){
 clearTimeout(timer);resetSound();get('status').textContent='';
 try{
   edition=await request('weekly-set');const until=new Date(edition.changesAt).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric'});
   get('edition').textContent='下次換字 '+until;
   const saved=read(saveKey);
   if(quiz){if(!fresh&&saved?.order?.length===7&&(saved.weekId===edition.weekId||saved.answers?.length===7)){round=saved;question();}else newRound();}
   else study();
   timer=setTimeout(()=>{if(!busy)load();},Math.max(1500,edition.changesAt-Date.now()+250));
 }catch(e){retry(e,()=>load());}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy&&edition&&Date.now()>=edition.changesAt)load();});
load();
