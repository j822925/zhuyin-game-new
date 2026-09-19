import {createLittleTeacher} from './little-teacher.js?v=20260913-tutor1';
import {setVerticalSymbols,showSpellingTone} from './spelling-layout.js?v=20260913-tutor1';
import {BASE,COMPOUNDS,normalizeConfig,createCatalog,poolFor,optionsFor,shuffle,questionDeck,Round} from './core.js?v=20260913-heroes1';
import {createMultiplayer} from './multiplayer.js?v=20260919-profile1';
import {createRewards} from './rewards.js?v=20260919-egg1';
import {createStudentProfile} from './student-profile.js?v=20260919-profile1';
import {portrait} from './characters.js?v=20260913-heroes1';
import {setupChildUI} from './child-ui.js?v=20260913-family1';
import {setupCozyUI} from './cozy-ui.js?v=20260913-heroes1';
import {createStudentAuth} from './student-auth.js?v=20260913-tutor1';
import {createApiClient} from './api-client.js?v=20260913-tutor1';
import {setupExamEntry} from './exam-entry.js?v=20260919-entry1';
const API='https://zhuyin-api.j822925.workers.dev/api';
const demo=new URLSearchParams(location.search).get('demo')==='1';
const names={single:'聲音森林',spelling:'拼音工坊'};
const $=id=>document.getElementById(id);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const audio=new Audio();audio.preload='auto';
const choices=4;
let config,catalog=[],duo=false,mode='single',rounds=[],active=0,currentPool=[],seats=[],selected={},audioReady=false,session=0,saving=false,latestIds=[];
let playStyle='solo';
const memory={};
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return memory[key]??fallback;}}
function write(key,value){memory[key]=value;try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
let pending=read('zhuyin.pending.v2',[]);if(!Array.isArray(pending))pending=[];
$('app').innerHTML=`<header><a class="brand" href="./${demo?'?demo=1':''}"><img class="brand-app-icon" src="assets/icons/apple-touch-icon-v1.png" alt="">注音探險島</a><div class="top-actions"><span id="connection" role="status">讀取老師任務…</span><a href="${demo?'teacher.html':'parents.html'}">${demo?'老師專區':'親子專區'} ↗</a></div></header>
<main id="home"><section class="hero"><div><p class="eyebrow">每天一點點，聲音變熟悉</p><h1>準備好了嗎？<br>一起去<span>聲音探險！</span></h1><p>仔細聽、動手拼。<br>每一次練習，都是一次新的發現。</p><div id="learned" class="learned"></div></div><div class="island" aria-hidden="true"><div class="cloud"></div><span class="sun">✦</span><div class="mountain back"></div><div class="mountain front"></div><div class="ground"></div><div class="tree t1">♠</div><div class="tree t2">♠</div><div class="mascot"><span>•ᴗ•</span><b>ㄅ</b></div><span class="floating f1">ㄧ</span><span class="floating f2">ㄠ</span></div></section>
<aside id="demo-note" class="notice" ${demo?'':'hidden'}>老師試玩：不傳送成績。拼音為待確認的合成示範音。<button id="demo-basic" class="text-button">第一週六音</button><button id="demo-expanded" class="text-button">含結合韻</button></aside>
<section class="setup"><label>我是 <select id="seat" aria-label="選擇座號"><option value="">選擇座號</option></select></label><div class="segmented" aria-label="遊玩方式"><button id="solo" class="selected" aria-pressed="true">一人闖關</button><button id="duo" aria-pressed="false">兩人輪流</button></div><label id="partner-label" hidden>夥伴 <select id="partner" aria-label="夥伴座號"></select></label><span id="collection" class="small"></span></section>
<section class="section-heading"><div><p class="eyebrow">選一座島，練一種本領</p><h2>今天想去哪裡？</h2></div></section>
<section class="worlds" aria-label="選擇關卡">${[['single','forest','♧','ㄅ','01 · 聽音辨識','聽一聽，找出正確的注音。'],['spelling','workshop','⌂','ㄅ + ㄠ','02 · 拼音練習','點選或拖曳，拼出聽到的聲音。']].map(([id,theme,art,symbol,subtitle,description])=>`<button class="world ${theme}" data-mode="${id}" disabled><span class="world-art">${art}<i>${symbol}</i></span><small>${subtitle}</small><h3>${names[id]}</h3><p>${description}</p><span class="world-status">讀取中…</span></button>`).join('')}</section><p id="home-message" class="message" role="status"></p><div class="home-foot"><span>不搶快，也能很厲害。先聽清楚，再慢慢選。</span><button id="reload" class="text-button">重新讀取老師任務</button></div></main>
<main id="game" hidden><div class="game-top"><button id="leave" class="text-button">← 回島嶼</button><span id="world-title"></span><span id="question-number"></span></div><div class="progress-track"><div id="progress-fill"></div></div><div id="player-turn" class="player-turn"></div><section class="question-card"><p id="instruction" class="instruction"></p><button id="listen" class="listen" aria-label="播放題目聲音">♪<span>再聽一次</span></button><p id="audio-status" class="audio-status" role="status"></p><div id="options" class="options"></div><div id="spelling" hidden><div class="slots"><button class="slot" data-slot="initial" aria-label="聲符位置">聲符</button><span class="spelling-tone" hidden></span><button class="slot" data-slot="final" aria-label="韻符或結合韻位置">韻符</button></div><p class="small">點一下積木，或把它拖到上方的位置</p><div id="tiles" class="tiles"></div><button id="check-spelling" class="primary" disabled>拼好了！</button></div><p id="feedback" class="feedback" aria-live="polite"></p><button id="next" class="primary next" hidden>下一題 →</button></section><p class="game-hint">選錯了也沒關係，再聽一次就好。</p></main>
<main id="result" hidden><section class="result-card"><div class="celebration" aria-hidden="true">✦</div><p class="eyebrow">今天又前進了一步</p><h1>探險完成！</h1><div id="result-details"></div><p id="save-status" class="small" role="status"></p><button id="retry-save" class="text-button" hidden>重新傳送紀錄</button><div class="result-actions"><button id="again" class="primary">再練一次</button><button id="back-home" class="secondary">回到島嶼</button></div></section></main>
<dialog id="leave-dialog"><h2>要先離開這次探險嗎？</h2><p>完成整回合才會記錄成績，這回合還沒完成喔。</p><div class="result-actions"><button id="stay" class="primary">繼續探險</button><button id="confirm-leave" class="secondary">回到島嶼</button></div></dialog><footer>注音探險島<span>聽見聲音，看見進步。</span></footer>`;
const raceButton=document.createElement('button');raceButton.id='race';raceButton.textContent='⚡ 雙人搶答';raceButton.setAttribute('aria-pressed','false');$('duo').after(raceButton);
const apiClient=createApiClient(API);
const postJSON=payload=>apiClient.post(payload);
const auth=createStudentAuth({demo,getConfig:()=>config,post:postJSON});
let rewards,profiles;
const teamUI=createMultiplayer({getIdentity:seat=>profiles?.identity(seat),getOwned:seat=>rewards?.owned(seat),getSeats:()=>[$('seat').value,$('partner').value],onExit:home,onFinish:(payload,html)=>{screen('result');$('result-details').innerHTML=html;persistResults([payload]);}});
function renderIdentity(){teamUI.refreshPicker();profiles?.renderHeader();if($('seat').value)document.querySelector('.mascot').innerHTML=portrait(profiles?.identity($('seat').value).character||rewards.avatar($('seat').value));}
rewards=createRewards({demo,getConfig:()=>config,getSeat:()=>auth.verified($('seat').value)?$('seat').value:'',getSeats:()=>[$('seat').value,$('partner').value].filter(s=>auth.verified(s)),jsonGet,post:payload=>auth.request(payload),onChange:renderIdentity});
const voiceHelp=setupChildUI({demo,onPreviewBonus:()=>rewards.previewBonus(),onBeforeVoice:()=>audio.pause()});
const tutorButton=document.createElement('button');tutorButton.id='little-teacher';tutorButton.hidden=true;tutorButton.setAttribute('aria-label','小老師：看答案，聽拼音示範');tutorButton.innerHTML='<img src="assets/characters/cozy-v1/owl.png" alt=""><span aria-hidden="true">🎓</span>';$('audio-status').after(tutorButton);
const tutor=createLittleTeacher({onReturn:()=>{clearSpelling();audio.src=rounds[active].current.audio;play();}});
tutorButton.onclick=()=>{const r=rounds[active];if(mode!=='spelling'||!r?.canUseTutor||tutor.open)return;const result=r.useTutor(currentPool);if(result.ignored)return;voiceHelp.stop();audio.pause();audioReady=false;clearSpelling();setAnswerEnabled(false);$('question-number').textContent=`${r.index+1} / ${r.deck.length}`;$('progress-fill').style.width=`${r.index/r.deck.length*100}%`;tutor.show(r.current);};
function clearSpelling(){selected={};for(const b of document.querySelectorAll('.slot')){b.textContent='';b.classList.remove('filled');b.setAttribute('aria-label',b.dataset.slot==='initial'?'聲符位置':'韻符或結合韻位置');}showSpellingTone(document.querySelector('#spelling .slots'),rounds[active].current);$('check-spelling').disabled=true;}
setupCozyUI();
profiles=createStudentProfile({demo,auth,getSeat:()=>$('seat').value,getSeats:()=>[$('seat').value,$('partner').value],getOwned:seat=>rewards.owned(seat),getAvatar:seat=>rewards.avatar(seat),onChange:renderIdentity,isHome:()=>!$('home').hidden});
setupExamEntry({endpoint:API,home:$('home'),demo});
function screen(id){for(const name of ['home','game','result'])$(name).hidden=name!==id;profiles?.renderHeader();window.scrollTo(0,0);}
function refreshHome(){
 const previous=$('seat').value,partner=$('partner').value;
 for(const id of ['seat','partner'])$(id).innerHTML='<option value="">選擇座號</option>'+config.seats.map(x=>`<option value="${safe(x)}">${safe(x)} 號</option>`).join('');
 $('seat').value=previous;$('partner').value=partner;
 $('learned').innerHTML='<span class="label">老師已教</span>'+[...config.symbols,...config.compounds].map(x=>`<span>${safe(x)}</span>`).join('');
 for(const button of document.querySelectorAll('[data-mode]')){const id=button.dataset.mode,pool=poolFor(id,config,catalog);button.disabled=!pool.length||(id==='spelling'&&!config.spellingApproved);button.querySelector('.world-status').textContent=!pool.length?'等待老師安排學過的內容':id==='spelling'&&!config.spellingApproved?'等老師確認示範音後開放':`${pool.length} 種聲音 · 每人 ${config.questions} 題`;}
 $('connection').textContent=demo?'老師試玩模式':'已讀取老師任務';
 $('collection').textContent=playStyle==='race'?'左右搶答 · 比賽另存，不計入每日練習／全對':duo?'輪流答題，每人完成一整回合':'慢慢練，一次比一次熟悉';
}
async function jsonGet(params=''){const p=new URLSearchParams(params);if(p.get('api')&&p.get('api')!=='config')return auth.request({kind:'query',api:p.get('api'),seat:p.get('seat')||$('seat').value,id:p.get('id')||''});return apiClient.get(Object.fromEntries(p));}
async function load(){
 $('reload').disabled=true;$('home-message').textContent='';
 try{catalog=createCatalog(await fetch('data/syllables.json?v=20260913-tutor1').then(r=>{if(!r.ok)throw new Error();return r.json();}));
  config=normalizeConfig(demo?{version:2,symbols:({fo2:['ㄈ','ㄛ'],lve4:['ㄌ','ㄩㄝ']})[new URLSearchParams(location.search).get('lesson')]||['ㄅ','ㄆ','ㄇ','ㄉ','ㄧ','ㄠ'],compounds:[],seats:Array.from({length:15},(_,i)=>String(i+1)),questions:10,spellingApproved:true}:await jsonGet('?api=config'));
  refreshHome();if(config.legacy)$('home-message').textContent='老師提醒：目前連接舊版後台。正式記錄前，請先更新後台；現在仍可讀取已教注音。';
  // Pending records wait until their student has authenticated.
 }catch{$('connection').textContent='尚未連線';$('home-message').textContent='還沒讀到老師的任務，請確認網路後再試一次。';document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=true);}
 finally{$('reload').disabled=false;}
}
function demoConfig(expanded){config=normalizeConfig({version:2,symbols:expanded?BASE:['ㄅ','ㄆ','ㄇ','ㄉ','ㄧ','ㄠ'],compounds:expanded?COMPOUNDS:[],seats:Array.from({length:15},(_,i)=>String(i+1)),questions:10,spellingApproved:true});refreshHome();}
async function start(id){
 voiceHelp.stop();
 if(!config)return;
 seats=[$('seat').value];if(duo)seats.push($('partner').value);
 if(seats.some(s=>!config.seats.includes(s))||new Set(seats).size!==seats.length){$('home-message').textContent=duo?'請先選好兩位不同的小朋友座號。':'請先選擇你的座號。';$('seat').focus();return;}
 if(!demo&&!config.verifiedWrites){$('home-message').textContent='請老師先更新後台再開始，才能確認成績有成功儲存。';return;}
 for(const seat of seats)if(!await auth.ensure(seat))return;
 await profiles.refresh();
 mode=id;currentPool=poolFor(mode,config,catalog);if(!currentPool.length||(mode==='spelling'&&!config.spellingApproved))return;
 if(playStyle==='race'){
  if(currentPool.length<2){$('home-message').textContent='搶答至少需要兩種已教聲音。請先用單人或輪流練習。';return;}
  if(!demo&&!config.raceWrites){$('home-message').textContent='老師提醒：搶答紀錄需要新版後台，目前可先在老師試玩體驗。';return;}
  audio.pause();session++;latestIds=[];teamUI.start({seats,mode,questionPool:currentPool,questions:config.questions,choices});return;
 }
 session++;active=0;rounds=seats.map(()=>new Round(questionDeck(currentPool,config.questions)));latestIds=[];
 screen('game');renderQuestion();
}
function setAnswerEnabled(enabled){enabled=enabled&&!tutor.open;document.querySelectorAll('.option,.tile,.slot').forEach(b=>b.disabled=!enabled);$('check-spelling').disabled=!enabled||!selected.initial||!selected.final;tutorButton.disabled=!rounds[active]?.canUseTutor||tutor.open;}
async function play(){
 if(tutor.open)return;
 voiceHelp.stop();
 const currentSession=session,question=rounds[active]?.current;
 if(!question)return;
 $('audio-status').textContent='仔細聽…';
 try{audio.currentTime=0;await audio.play();if(session!==currentSession||rounds[active]?.current!==question)return;audioReady=true;setAnswerEnabled(!rounds[active].locked);$('audio-status').textContent='需要的話，可以再聽一次。';}
 catch{if(session!==currentSession||rounds[active]?.current!==question)return;audioReady=false;setAnswerEnabled(false);$('audio-status').textContent='請按喇叭播放聲音；若仍無聲音，請確認音量與網路。';}
}
audio.addEventListener('error',()=>{audioReady=false;setAnswerEnabled(false);$('audio-status').textContent='這段聲音暫時無法播放，請再按一次喇叭。';});
function renderQuestion(){
 tutor.close();tutorButton.hidden=mode!=='spelling'||(!demo&&!config.tutorWrites);
 const r=rounds[active],q=r.current;document.getElementById('game').classList.toggle('spelling-active',mode==='spelling');r.questionStarted=Date.now();selected={};audio.pause();audio.src=q.audio;audioReady=false;
 $('world-title').textContent=names[mode];$('question-number').textContent=`${r.index+1} / ${r.deck.length}`;
 $('progress-fill').style.width=`${r.index/r.deck.length*100}%`;$('player-turn').classList.toggle('profile-playing',!duo);if(duo)$('player-turn').replaceChildren();else profiles.renderPlayer($('player-turn'),seats[active]);
 $('instruction').textContent=mode==='spelling'?'聽一聽，用注音積木拼出聲音':'仔細聽，選出正確的注音';$('feedback').textContent='';$('next').hidden=true;$('options').replaceChildren();$('spelling').hidden=mode!=='spelling';
 if(mode!=='spelling'){for(const option of optionsFor(q,currentPool,choices)){const b=document.createElement('button');b.className='option';b.textContent=option.label;b.onclick=()=>answer(option.label,b);$('options').append(b);}}
 else{showSpellingTone(document.querySelector('#spelling .slots'),q);document.querySelectorAll('.slot').forEach(b=>{b.textContent=b.dataset.slot==='initial'?'聲符':'韻符';b.classList.remove('filled');b.setAttribute('aria-label',b.dataset.slot==='initial'?'聲符位置':'韻符或結合韻位置');});$('tiles').replaceChildren();for(const kind of ['initial','final']){const row=document.createElement('div');row.className='tile-row';const target=q[kind],other=[...new Set(currentPool.map(x=>x[kind]))].filter(x=>x!==target);for(const value of shuffle([target,...shuffle(other).slice(0,choices-1)])){const b=document.createElement('button');b.className='tile';setVerticalSymbols(b,value);b.setAttribute('aria-label',value);b.dataset.kind=kind;b.draggable=true;b.onclick=()=>place(kind,value);b.ondragstart=e=>e.dataTransfer.setData('text/plain',JSON.stringify({kind,value}));b.onpointerup=e=>{if(e.pointerType==='mouse')return;const slot=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(slot?.dataset.slot===kind)place(kind,value);};row.append(b);}$('tiles').append(row);}}
 setAnswerEnabled(false);if(duo)teamUI.turnPrompt(active,seats,()=>{r.questionStarted=Date.now();play();});else play();
}
function place(kind,value){if(!audioReady||rounds[active].locked)return;if(!currentPool.some(x=>x[kind]===value)||!['initial','final'].includes(kind))return;selected[kind]=value;if(kind==='final')document.querySelector('#spelling .slots').dataset.finalLength=String(Math.max(value.length,rounds[active].current.final.length));const b=document.querySelector(`[data-slot="${kind}"]`);setVerticalSymbols(b,value);b.setAttribute('aria-label',(kind==='initial'?'聲符：':'韻符：')+value);b.classList.add('filled');$('check-spelling').disabled=!selected.initial||!selected.final;}
function answer(value,button){
 if(!audioReady)return;const r=rounds[active],outcome=r.answer(value);if(outcome.ignored)return;
 if(!outcome.correct){if(button){button.classList.add('wrong');button.disabled=true;} $('feedback').textContent='🔁 👂';play();return;}
 if(button)button.classList.add('correct');setAnswerEnabled(false);
 $('feedback').textContent=outcome.firstCorrect?'⭐ ✨':'✅ ⭐';
 $('next').textContent=outcome.finished&&active===rounds.length-1?'🎉 →':duo?`${teamUI.character((active+1)%2)} ▶`:'▶';$('next').hidden=false;$('next').focus();
}
function next(){const r=rounds[active];if(!r.locked)return;r.next();if(rounds.every(x=>x.index>=x.deck.length)){finish();return;}active=(active+1)%rounds.length;if(rounds[active].index>=rounds[active].deck.length)active=(active+1)%rounds.length;renderQuestion();}
function finish(){audio.pause();teamUI.stop();screen('result');let html='';const results=[];
 rounds.forEach((r,i)=>{const correct=r.deck.length-r.mistakes;html+=`<h2>${safe(seats[i])} 號${r.mistakes===0?' · 全部答對！':''}</h2><div class="metrics"><div><strong>${correct}<small> / ${r.deck.length}</small></strong><span>第一次就答對</span></div><div><strong>${r.mistakes}</strong><span>需要再練的題目</span></div></div>`;const weak=[...new Set(r.rows.filter(x=>!x.firstCorrect).map(x=>x.target))];if(weak.length)html+='<p class="small">這幾個聲音，再當一次好朋友</p><div class="review-chips">'+weak.map(x=>`<button class="review-chip" data-review="${safe(x)}">${safe(x)} ♪</button>`).join('')+'</div>';const progress=read('zhuyin.progress.v2',{});progress[seats[i]]??={};progress[seats[i]][mode]=Math.max(progress[seats[i]][mode]||0,correct);write('zhuyin.progress.v2',progress);const key=`zhuyin.attempt.${seats[i]}`,attempt=read(key,0)+1;write(key,attempt);results.push({roundId:crypto.randomUUID(),seat:seats[i],attempt,total:r.deck.length,mistakes:r.mistakes,mode,seconds:Math.round((Date.now()-r.started)/1000),results:r.rows});});
 if(duo){const a=-rounds[0].mistakes,b=-rounds[1].mistakes;html+=`<p>${a===b?'兩隊平手，一起完成探險！':`${safe(seats[a>b?0:1])} 號得到較多星星，兩位都完成了探險！`}</p>`;}
 $('result-details').innerHTML=html;document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{const q=currentPool.find(x=>(x.displayLabel||x.label)===b.dataset.review);audio.src=q.audio;audio.currentTime=0;audio.play().catch(()=>{$('save-status').textContent='複習聲音無法播放，請確認音量與網路。';});});
 if(duo){const competition={kind:'turn',seats:[...seats],rounds:results.map(({total,mistakes,results})=>({total,mistakes,results}))};results.forEach(r=>r.competition=competition);}
 persistResults(results);
}
function persistResults(results){
 const awards=rewards.credit(results);
 if(awards?.length){const rewardLine=document.createElement('div');rewardLine.className='round-awards';rewardLine.innerHTML=awards.map(a=>`<p>🔢 ${safe(a.seat)}　⭐ +${a.stars} <span aria-label="${a.threshold} 回合毅力進度">${a.perseveranceStars?'🎁':Array.from({length:a.threshold},(_,i)=>i<a.completedRounds%a.threshold?'●':'○').join(' ')}</span></p>`).join('');$('result-details').append(rewardLine);}
 if(demo){$('save-status').textContent='這是老師試玩，沒有傳送學生成績。';$('retry-save').hidden=true;return;}
 latestIds=results.map(x=>x.roundId);pending.push(...results);const stored=write('zhuyin.pending.v2',pending);$('save-status').textContent=stored?'正在確認老師是否收到紀錄…':'此裝置無法暫存，請保持頁面開啟，等待確認傳送。';flushPending();
}
async function send(payload){const status=await auth.request(payload);if(status.saved!==true)throw new Error(status.error||'unconfirmed');if(latestIds.includes(payload.roundId)&&Array.isArray(status.awards)&&!document.getElementById('award-'+payload.roundId)){const line=document.createElement('div');line.id='award-'+payload.roundId;line.className='round-awards';for(const award of status.awards){const p=document.createElement('p');p.textContent=`🔢 ${award.seat}　⭐ +${award.stars}`;line.append(p);}$('result-details').append(line);}}
async function flushPending(){if(saving||demo||!config?.verifiedWrites)return;saving=true;$('retry-save').disabled=true;const attempted=new Set();try{for(const payload of [...pending]){attempted.add(payload.roundId);try{await send(payload);pending=pending.filter(x=>x.roundId!==payload.roundId);write('zhuyin.pending.v2',pending);}catch{/* Keep failed rounds and try the others. */}}}finally{saving=false;$('retry-save').disabled=false;const outstanding=pending.some(x=>latestIds.includes(x.roundId)),stored=write('zhuyin.pending.v2',pending);$('retry-save').hidden=!outstanding;$('save-status').textContent=outstanding?(stored?'紀錄已暫存在這台裝置，尚未確認存入後台。':'此裝置無法暫存，請勿關閉頁面。')+'請保持連線並重新傳送。':'老師已收到這次的完整紀錄！';rewards.refresh();if(pending.some(x=>!attempted.has(x.roundId)))flushPending();}}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>start(b.dataset.mode));
function selectStyle(style){playStyle=style;duo=style!=='solo';for(const id of ['solo','duo','race']){const selected=id===(style==='turn'?'duo':style);$(id).classList.toggle('selected',selected);$(id).setAttribute('aria-pressed',String(selected));}$('partner-label').hidden=!duo;teamUI.setStyle(style);if(config)refreshHome();if(style!=='solo'&&$('partner').value&&!auth.verified($('partner').value))$('partner').onchange();}
$('solo').onclick=()=>selectStyle('solo');$('duo').onclick=()=>selectStyle('turn');$('race').onclick=()=>selectStyle('race');
const selectedIdentities={seat:'',partner:''};
for(const id of ['seat','partner'])$(id).onchange=async()=>{const seat=$(id).value;auth.forget(selectedIdentities[id]);auth.forget(seat);profiles.clearSeat(selectedIdentities[id]);profiles.clearSeat(seat);selectedIdentities[id]=seat;if(seat&&!await auth.ensure(seat))$(id).value='';await rewards.refresh();await profiles.refresh();if(!demo)flushPending();};
$('listen').onclick=play;$('check-spelling').onclick=()=>answer((selected.initial||'')+(selected.final||''));$('next').onclick=next;$('reload').onclick=load;$('demo-basic').onclick=()=>demoConfig(false);$('demo-expanded').onclick=()=>demoConfig(true);$('again').onclick=()=>start(mode);$('retry-save').onclick=flushPending;
function home(){session++;tutor.close();audio.pause();teamUI.stop();screen('home');if(config)refreshHome();}
$('back-home').onclick=home;$('leave').onclick=()=>{$('leave-dialog').showModal();};$('stay').onclick=()=>$('leave-dialog').close();$('confirm-leave').onclick=()=>{$('leave-dialog').close();home();};
document.querySelectorAll('.slot').forEach(b=>{b.onclick=()=>{if(rounds[active].locked||!audioReady)return;delete selected[b.dataset.slot];b.setAttribute('aria-label',b.dataset.slot==='initial'?'聲符位置':'韻符或結合韻位置');if(b.dataset.slot==='final')showSpellingTone(document.querySelector('#spelling .slots'),rounds[active].current);b.classList.remove('filled');b.textContent=b.dataset.slot==='initial'?'聲符':'韻符';$('check-spelling').disabled=true;};b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();try{const item=JSON.parse(e.dataTransfer.getData('text/plain'));if(item.kind===b.dataset.slot)place(item.kind,item.value);}catch{}};});
// Pointer capture makes drag-and-drop work on touch tablets as well as mouse devices.
let touchStart;
$('tiles').addEventListener('pointerdown',e=>{const tile=e.target.closest('.tile');if(!tile||e.pointerType==='mouse'||tile.disabled)return;e.preventDefault();tile.setPointerCapture(e.pointerId);touchStart={tile,x:e.clientX,y:e.clientY};});
$('tiles').addEventListener('pointerup',e=>{if(!touchStart||e.pointerType==='mouse')return;const {tile,x,y}=touchStart;touchStart=null;const slot=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(tile.hasPointerCapture(e.pointerId))tile.releasePointerCapture(e.pointerId);if(slot?.dataset.slot===tile.dataset.kind||Math.hypot(e.clientX-x,e.clientY-y)<12)place(tile.dataset.kind,tile.textContent);});
$('tiles').addEventListener('pointercancel',()=>{touchStart=null;});
window.addEventListener('online',flushPending);window.addEventListener('beforeunload',e=>{if(pending.length){e.preventDefault();e.returnValue='';}});load();
