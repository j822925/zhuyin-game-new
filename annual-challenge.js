import {STATIONS,TONES,active,summary,LISTEN_POLICY,LISTEN_OUTCOMES,listeningSummary} from './annual-challenge-core.js?v=20261106-v2';
import {INITIALS,FINALS,COMBINED} from './annual-challenge-bank.js?v=20261106-v2';
import {stampsForStation,stampById} from './annual-challenge-stamps.js?v=20261106-v2';
const $=id=>document.getElementById(id),app=$('app'),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const previewAdapter=globalThis.__ANNUAL_LOCAL_PREVIEW__||null;
const asset=id=>previewAdapter?.assets[id]||'assets/annual-challenge-20261103/'+id+'.webp';
const image=id=>`<img src="${asset(id)}" alt="${escape(stampById(id)?.name||'過關印章')}" loading="lazy">`;
function actionZhuyin(value){
 const syllables=String(value??'').trim().split(/[\s　]+/).filter(Boolean);
 return '<span class="action-zhuyin" role="img" aria-label="'+escape(syllables.join(' '))+'">'+syllables.map(syllable=>{
  const tone=syllable.match(/[ˉˊˇˋ˙]/)?.[0]||'',symbols=[...syllable.replace(/[ˉˊˇˋ˙]/g,'')];
  return '<span class="action-syllable" aria-hidden="true">'+symbols.map((symbol,i)=>'<span class="action-glyph">'+escape(symbol)+(tone&&i===symbols.length-1?'<span class="action-tone">'+escape(tone)+'</span>':'')+'</span>').join('')+'</span>';
 }).join('')+'</span>';
}
let session=null,handoffChild=null,card=null,event=null,station=null,target='990001',busy=false,answers=[],cursor=0,lines=[],stamp='',pending=null,streamController=null,offlineUnsubscribe=null,spinning=false;
let listenDraftKey='',listenDraft=[],listenFocus=0,listenReplanning=false;
let rehearsalResetPending=null,fullEvent=null,accessDrafts={},rosterPage=0,extendCount=1,extensionPlanning=false;
let workingMode=new URL(location.href).searchParams.get('mode')==='official'?'official':'rehearsal';
const modeName=()=>workingMode==='rehearsal'?'預演':'正式闖關';
const homeUrl='https://j822925.github.io/zhuyin-game-new/?class=main';
const completeAttempt=a=>!!a?.rounds?.length&&a.rounds.every(r=>r.result);
const availableExtension=a=>Math.max(0,Math.min(5,(station==='listen'?59:station==='read'?9:30)-(a?.rounds.length||0)));
function selectedEvent(config){return {...config,...config?.access?.[workingMode],mode:workingMode};}
function accessDraft(){if(!accessDrafts[workingMode]){const source=fullEvent?.access?.[workingMode]||{enabled:false,allStudents:false,seats:[],startsAt:null,endsAt:null};accessDrafts[workingMode]={...structuredClone(source),revision:fullEvent?.revision||0,actionCount:fullEvent?.actionCount||3};}return accessDrafts[workingMode];}
let settingsTab='stations',listenCategory=0,spellingCategory='initial',awardStep=1,awardSignPanel='signature',awardViewTab='stamp';
const year=Number(new URL(location.href).searchParams.get('year'))||new Date().getFullYear(),local=['127.0.0.1','localhost'].includes(location.hostname)||location.protocol==='file:'&&!!previewAdapter;
const production=!local&&!previewAdapter;
let productionAdapter=null,liveHelpers=null,poller=null,cardFingerprint='',draftQuestionKey='',combinedOpen=false,loginGeneration=0,readSequence=0;
const permittedStations=()=>STATIONS.filter(s=>session?.role==='organizer'||(session?.stations||[session?.station]).includes(s.id));
const allTeacherSeats=()=>production?session?.seats||[]:['990001','990002','990003'];
const seatsForTeacher=()=>{const access=fullEvent?.access?.[workingMode];return allTeacherSeats().filter(seat=>!access||access.allStudents||access.seats.includes(seat));};
function saveTabSession(value){if(production)return;try{if(value)sessionStorage.setItem('annual-preview-session',JSON.stringify(value));else sessionStorage.removeItem('annual-preview-session');}catch{}}
function startupReady(){window.dispatchEvent(new Event('annual-ready'));if(!production)document.querySelector('.preview-note').textContent='本機試玩 · 虛構帳號 · 不計入正式學生紀錄';if(previewAdapter&&!previewAdapter.persistent)document.querySelector('.preview-note').textContent='單檔試玩 · 虛構帳號 · 此瀏覽器未開放保存，進度只留在這一頁';}
function toast(message){$('status').textContent=message;$('status').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('status').classList.remove('visible'),4500);}
async function api(path,body){
 if(production){if(!productionAdapter)throw Error('登入服務尚未準備完成，請稍後重試');return productionAdapter.request(path,body);}
 if(previewAdapter)return previewAdapter.request(path,session?.token,body);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch('/annual-preview/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'無法讀取，請重試'),{status:response.status});return data;}
 catch(e){if(e.name==='AbortError')throw Error('連線逾時，尚未確認保存結果；請按重試');throw e;}finally{clearTimeout(timer);}
}
function identity(){
 $('home-link').href=homeUrl;
 $('identity').innerHTML=session?`<span>${handoffChild?'🔒 關主操作 · '+handoffChild.seat:session.role==='student'?(production?'🎒 學號 ':'🎒 示範學號 ')+escape(session.seat):session.role==='organizer'?'🧑‍🏫 活動管理老師':'🧑‍🏫 '+escape(session.displayName||'闖關關主')}</span><button id="${handoffChild?'return-child':'logout'}" class="quiet">${handoffChild?'交回孩子':'換人登入'}</button>`:'';
 if($('return-child'))$('return-child').onclick=()=>{if(busy||pending)return;leaveTeacher().catch(e=>toast(e.message));};
 if($('logout'))$('logout').onclick=async()=>{if(busy)return;if(pending){toast('保存尚未確認，請先重試');return;}try{await api('logout',{});}catch{}resetViewSession();loginScreen();};
}
function resetViewSession(){loginGeneration++;readSequence++;streamController?.abort();offlineUnsubscribe?.();poller?.stop();session=null;card=null;station=null;handoffChild=null;pending=null;answers=[];cursor=0;cardFingerprint='';draftQuestionKey='';combinedOpen=false;rehearsalResetPending=null;fullEvent=null;accessDrafts={};extensionPlanning=false;$('award-dialog').close();$('unlock-dialog').close();saveTabSession(null);identity();}
function showUnlock(){if(production||busy||pending||session.role!=='student')return;$('unlock-context').textContent=`${card.mode==='rehearsal'?'預演':'正式闖關'} · 學號 ${session.seat} · ${STATIONS.find(s=>s.id===station).name}`;$('unlock-error').textContent='';$('unlock-dialog').showModal();}
async function leaveTeacher(){
 if(!handoffChild)return;try{await api('lock',{});}catch{}streamController?.abort();session=handoffChild;handoffChild=null;identity();await refresh();subscribe();
}
function hero(){return `<section class="hero"><div><span class="eyebrow">CHIDONG ADVENTURE ISLAND</span><h1>小小冒險家<br>注音闖關日</h1><p>十週的練習，今天一起發光。<br>走過五座小島，收集屬於你的可愛印章！</p><span class="pill">🎒 一張闖關卡，五個小挑戰</span></div><div class="hero-art">${STATIONS.map(s=>image(s.animal)).join('')}</div></section>`;}
function loginScreen(){
 app.dataset.screen='login';
 if(production){productionLoginScreen();return;}
 app.innerHTML=hero()+`<div class="banner">獨立本機試玩，先用虛構帳號體驗。聲調關用教室大屏，其餘四關用孩子的 iPad。</div>
 <div class="login-grid"><section class="panel"><span class="eyebrow">孩子登入後，直接在這台裝置闖關</span><h2>🎒 打開我的闖關卡</h2>
 <label>示範學號<select id="child-seat"><option>990001</option><option>990002</option><option>990003</option></select></label>
 <p class="subtle">孩子作答與關主操作在同一畫面交接，老師不必另備裝置。正式版沿用池東探險島原帳號。</p><button class="primary wide" id="child-login">打開我的闖關卡 →</button></section>
 <section class="panel"><span class="eyebrow">老師開關活動</span><h2>🧑‍🏫 活動管理</h2>
 <label>示範教師角色<select id="teacher-station"><option value="organizer">⚙ 活動管理老師</option>${STATIONS.map(s=>`<option value="${s.id}">${s.icon} ${s.name}關主（另台裝置示範）</option>`).join('')}</select></label>
 <p class="subtle">可切換關閉、預演和正式闖關。預演與正式紀錄分開保存。</p><button class="wide" id="teacher-login">進入活動管理 →</button></section></div>
 <p class="history-note">五關各 20 分 · 聽音先選十題，拼音與聲調可選三至八題 · 預演不計入正式成績</p>`;
 $('child-login').onclick=()=>login({role:'student',seat:$('child-seat').value});
 $('teacher-login').onclick=()=>login({role:$('teacher-station').value==='organizer'?'organizer':'teacher',station:$('teacher-station').value});
 startupReady();
}
function productionLoginScreen(){
 app.dataset.screen='login';
 const teacher=productionAdapter?.teacher;
 app.innerHTML=hero()+`<section class="panel live-login"><h2>${teacher?'🧑‍🏫 關主登入':'🎒 打開我的闖關卡'}</h2><p>${teacher?'使用原本已授權的 Google 教師帳號登入，一次登入後即可連續選題、評分與簽章。':'使用池東探險島原本的六位學號和密碼登入。請從老師開放的入口進入，預演與正式闖關各自保存。'}</p>${teacher?'':`<form id="live-student-form"><label for="live-seat">六位學號</label><input id="live-seat" inputmode="numeric" autocomplete="username" maxlength="6" pattern="[0-9]{6}" required placeholder="輸入六位學號"><button class="primary wide" id="live-login">輸入密碼，打開闖關卡 →</button></form>`}${teacher?'<button class="primary wide" id="live-login">使用 Google 帳號登入</button>':''}<p id="live-login-error" role="alert"></p><p class="subtle">${teacher?'本次平板預演由關主自己的裝置操作，孩子留在自己的 iPad 或教室大屏作答。離開前請登出。':'請關主在老師的裝置選題，孩子的畫面會自動接題，不必每一題重新登入。'}</p>${teacher?'<a class="quiet" href="/admin/">回老師管理</a>':'<a class="quiet" href="./?class=main">回池東探險島</a>'}</section>`;
 const perform=async e=>{e?.preventDefault();if(busy)return;busy=true;const button=$('live-login'),generation=loginGeneration;button.disabled=true;$('live-login-error').textContent='';
  try{const logged=await productionAdapter.login({seat:$('live-seat')?.value.trim()});if(!logged||generation!==loginGeneration)return;session=logged;target=logged.role==='student'?logged.seat:logged.seats[0]||'';station=null;cardFingerprint='';identity();await refresh();subscribe();}
  catch(error){if(generation===loginGeneration){const message=liveHelpers.annualError(error);if($('live-login-error'))$('live-login-error').textContent=message;else toast(message);}}
  finally{busy=false;if(button.isConnected)button.disabled=false;}
 };
 if(teacher)$('live-login').onclick=perform;else $('live-student-form').onsubmit=perform;
 startupReady();
}
async function login(details){if(busy)return;busy=true;try{const data=await api('login',{...details,classId:'main',year});session=data;saveTabSession(session);station=null;identity();await refresh();subscribe();}catch(e){toast(e.message);}finally{busy=false;}}
function renderUnavailable(message){
 card=null;station=null;app.dataset.screen='closed';identity();
 app.innerHTML=hero()+'<section class="panel closed"><div class="big-icon">🌙</div><h2>'+modeName()+'目前無法進入</h2><p>'+escape(message)+'</p><button id="closed-refresh">↻ 重新確認</button><a class="primary preview-open" href="'+homeUrl+'">回池東探險島</a></section>';
 $('closed-refresh').onclick=()=>refresh().catch(e=>toast(e.message));startupReady();
}
async function refresh(){
 if(!session)return;const sequence=++readSequence,identityAtStart=session,modeAtStart=workingMode;let data;
 if(session.role!=='student'&&!handoffChild&&(!station||!fullEvent)){
  let config,roster;try{[config,roster]=await Promise.all([api('config-read?year='+year),session.role==='teacher'?api('roster?year='+year):Promise.resolve(null)]);if(roster&&(!Array.isArray(roster.seats)||roster.seats.some(seat=>typeof seat!=='string'||!/^\d{6}$/.test(seat))))throw Error('學生名單暫時無法讀取');}catch(e){if(sequence!==readSequence||session!==identityAtStart)return;if(production&&[401,403].includes(e.status)){await productionAdapter.logout();resetViewSession();loginScreen();toast(e.message);return;}throw e;}if(sequence!==readSequence||session!==identityAtStart||modeAtStart!==workingMode)return;
  if(roster)session.seats=roster.seats;fullEvent=config;event=selectedEvent(config);const seats=seatsForTeacher();if(!seats.includes(target))target=seats[0]||'';
  if(!station||!target){card=null;cardFingerprint='';render();return;}
 }
 const seatAtStart=session.role==='student'?session.seat:target;
 try{data=await api('card?year='+year+'&mode='+workingMode+'&seat='+encodeURIComponent(seatAtStart));}catch(e){
  if(sequence!==readSequence||session!==identityAtStart||modeAtStart!==workingMode)return;
  if(handoffChild&&[401,403].includes(e.status)){pending=null;$('award-dialog').close();toast('請關主重新確認活動模式');await leaveTeacher();return;}
  if(production&&e.status===401){await productionAdapter.logout();resetViewSession();loginScreen();toast(e.message);return;}
  if(e.status===403){if(session.role==='student')renderUnavailable(e.message);else{station=null;card=null;fullEvent=null;await refresh();toast(e.message);}return;}throw e;
 }
 if(sequence!==readSequence||session!==identityAtStart||modeAtStart!==workingMode||(session.role==='student'?session.seat:target)!==seatAtStart)return;
 const fingerprint=JSON.stringify(data),changed=fingerprint!==cardFingerprint;
 if(card){const scopeChanged=[card.mode,card.rehearsalRound,card.seat].join(':')!==[data.mode,data.rehearsalRound,data.seat].join(':');const awardChanged=$('award-dialog').open&&(scopeChanged||JSON.stringify([card.attempts[station]?.rounds,card.attempts[station]?.award])!==JSON.stringify([data.attempts[station]?.rounds,data.attempts[station]?.award])||!active(data.event));if(scopeChanged||awardChanged){pending=null;answers=[];cursor=0;draftQuestionKey='';combinedOpen=false;listenDraftKey='';lines=[];stamp='';extensionPlanning=false;$('award-dialog').close();if(scopeChanged)toast('活動已更新，現在使用新一輪闖關卡');else toast('進度已更新，請重新確認分數與簽章');}}
 card=data;event=data.event;cardFingerprint=fingerprint;
 if(changed&&!$('award-dialog').open&&!spinning)render();
}
async function subscribe(){
 if(production){poller?.start();return;}
 if(previewAdapter){offlineUnsubscribe?.();offlineUnsubscribe=previewAdapter.subscribe(()=>refresh().catch(e=>toast(e.message)));return;}
 streamController?.abort();streamController=new AbortController();const thisSession=session;
 try{const response=await fetch('/annual-preview/updates',{headers:{Authorization:'Bearer '+session.token},signal:streamController.signal});if(!response.ok)throw Error();const reader=response.body.getReader();while(session===thisSession){const {done}=await reader.read();if(done)break;await refresh();}}
 catch(e){if(e.name!=='AbortError'&&session===thisSession)toast('即時接題已中斷，請按「更新進度」重新讀取');}
}
async function command(type,extra={}){
 if(busy)return;if(pending){toast('剛才的保存尚未確認，請先按重試');return;}busy=true;document.querySelectorAll('[data-command],#submit-answer,#draw-lesson').forEach(b=>b.disabled=true);
 const payload={year,mode:card.mode,rehearsalRound:card.rehearsalRound,seat:session.role==='student'?session.seat:target,station,type,revision:card.attempts[station]?.revision||0,...extra,requestId:crypto.randomUUID()};pending=payload;
 try{await sendPending();}catch(e){toast(e.message);render();}finally{busy=false;}
}
async function sendPending(){
 if(!pending)return;try{const sent=pending;await api('command',sent);pending=null;answers=[];cursor=0;if(sent.type==='extend'){extensionPlanning=false;listenDraft=[];listenFocus=card.attempts[station]?.rounds.length||0;}if(sent.station==='listen'&&['start','listen-replan'].includes(sent.type))listenReplanning=false;if(handoffChild&&(sent.type==='select'||sent.type==='start'&&station==='read'))await leaveTeacher();else await refresh();}catch(e){if(e.status&&e.status<500){pending=null;await refresh();}throw e;}
}
function render(){
 renderContent();
 const mode=workingMode;
 app.insertAdjacentHTML('afterbegin',`<div class="mode-notice ${mode==='rehearsal'?'rehearsal':'official'}">${!active(event)?'🌙 活動目前關閉':mode==='rehearsal'?'🌱 預演第 '+event.rehearsalRound+' 輪 · 放心練習，這張卡不計入正式闖關':'🏅 正式闖關 · 這次會記在正式闖關卡'}</div>`);
 startupReady();
 if(production)poller?.wake();
}
function renderContent(){
 identity();const teacher=session.role!=='student';
 app.dataset.screen='card';
 if(teacher&&session.role==='organizer'&&(!station||!card)){renderSettings();return;}
 if(session.role==='teacher'&&!handoffChild&&(!station||!card||!active(event))){if(!active(event))station=null;renderTeacherDesk();return;}
 if(teacher&&!card){app.innerHTML='<section class="panel closed"><div class="big-icon">🌙</div><h2>'+modeName()+'目前沒有可操作的學生</h2><p>請活動管理老師確認這個模式的開放設定。</p><div class="mode-switch">'+['rehearsal','official'].map(mode=>'<button type="button" data-working-mode="'+mode+'">'+(mode==='rehearsal'?'預演':'正式闖關')+'</button>').join('')+'</div><button id="teacher-empty-refresh">↻ 更新活動</button></section>';app.querySelectorAll('[data-working-mode]').forEach(b=>b.onclick=()=>switchWorkingMode(b.dataset.workingMode).catch(e=>toast(e.message)));$('teacher-empty-refresh').onclick=()=>refresh().catch(e=>toast(e.message));return;}
 if(!active(event)){app.innerHTML=hero()+`<section class="panel closed"><div class="big-icon">🌙</div><h2>年度闖關還在休息中</h2><p>老師開放活動後，就可以帶著 iPad 來闖關囉。</p><button id="closed-refresh">↻ 更新活動</button>${session.role==='organizer'?'<button id="to-settings">回活動設定</button>':handoffChild?'<button id="close-to-child">交回孩子</button>':''}</section>`;if($('closed-refresh'))$('closed-refresh').onclick=()=>refresh().catch(e=>toast(e.message));if($('to-settings'))$('to-settings').onclick=()=>{station=null;render();};if($('close-to-child'))$('close-to-child').onclick=()=>leaveTeacher().catch(e=>toast(e.message));return;}
 if(station){renderStation();return;}
 const totals=summary(card.attempts);
 app.innerHTML=hero()+`<div class="row"><div><span class="eyebrow">${year} · 我的電子闖關卡</span><h2>${production?"冒險家":"示範冒險家"} ${escape(card.seat)}</h2></div><div class="summary"><span>已完成 <strong>${totals.complete}</strong> / 5 關</span><span>得分 <strong>${totals.total}</strong> / 100</span></div></div><div class="progress"><span style="width:${totals.complete*20}%"></span></div><div class="station-grid">${STATIONS.map((s,i)=>{const a=card.attempts[s.id];return `<section class="station"><div class="number">第 ${i+1} 關</div>${image(s.animal)}<h3>${s.name}</h3><p class="subtle">${s.short}</p>${a?.award?`<div class="earned">${image(a.award.stamp)} ${a.award.score} / 20 分</div>`:''}<button data-station="${s.id}" class="${a?.award?'':'primary'}">${a?.award?'看看我的章':a?'接著闖關 →':'到這裡闖關 →'}</button></section>`;}).join('')}</div><div class="toolbar" style="margin-top:22px"><button id="refresh">↻ 更新進度</button><button id="print-card">🖨 列印闖關卡</button></div><p class="history-note">隨時可以回來看看進度。每一枚印章，都記得你的努力。</p>`;
 app.querySelectorAll('[data-station]').forEach(b=>b.onclick=()=>{station=b.dataset.station;answers=[];render();});$('refresh').onclick=()=>refresh().then(()=>subscribe()).catch(e=>toast(e.message));$('print-card').onclick=()=>printCard();
}
async function switchWorkingMode(mode){
 if(busy||pending||mode===workingMode)return;workingMode=mode;productionAdapter?.setMode(mode);const url=new URL(location.href);url.searchParams.set('mode',mode);history.replaceState(null,'',url);station=null;card=null;cardFingerprint='';extensionPlanning=false;rosterPage=0;await refresh();
}
async function saveAccess(button){
 if(session.role!=='organizer'){toast('請由活動管理老師操作');return;}
 if(busy)return;busy=true;button.disabled=true;const draft=accessDraft();
 try{const config=await api('configure',{year,revision:draft.revision,mode:workingMode,actionCount:draft.actionCount,access:{[workingMode]:{enabled:draft.enabled,allStudents:draft.allStudents,seats:[...draft.seats],startsAt:draft.startsAt,endsAt:draft.endsAt}}});fullEvent=config;delete accessDrafts[workingMode];for(const draft of Object.values(accessDrafts)){draft.revision=config.revision;draft.actionCount=config.actionCount;}toast(modeName()+'設定已保存');await refresh();}
 catch(e){toast(e.message);if(e.status===409){accessDrafts={};await refresh();}}
 finally{busy=false;if(button.isConnected)button.disabled=false;}
}
function renderTeacherDesk(){
 app.dataset.screen='teacher-desk';const ready=active(event)&&seatsForTeacher().length>0;
 app.innerHTML='<div class="settings-heading"><h1>關主桌</h1><div class="mode-switch" aria-label="選擇闖關模式">'+['rehearsal','official'].map(mode=>'<button type="button" data-working-mode="'+mode+'" class="'+(workingMode===mode?'selected':'')+'" aria-pressed="'+(workingMode===mode)+'">'+(mode==='rehearsal'?'🌱 預演':'🏅 正式闖關')+'</button>').join('')+'</div></div><section class="panel settings-panel" data-panel="teacher-stations"><h2>請選擇要操作的關卡</h2><p class="subtle">'+(ready?'進入後先確認學生，再選題、評分與簽章。':modeName()+'目前未開放或沒有可操作的學生，請活動管理老師確認。')+'</p><div class="station-grid teacher-station-grid">'+permittedStations().map(s=>'<button type="button" data-station="'+s.id+'" class="station-choice" '+(ready?'':'disabled')+'>'+image(s.animal)+'<strong>'+s.name+'</strong><span>'+s.short+'</span></button>').join('')+'</div><p class="subtle">登入一次即可連續操作，孩子留在自己的作答畫面。</p><button id="teacher-desk-refresh">↻ 更新活動與學生</button></section>';
 app.querySelectorAll('[data-working-mode]').forEach(b=>b.onclick=()=>switchWorkingMode(b.dataset.workingMode).catch(e=>toast(e.message)));
 app.querySelectorAll('[data-station]').forEach(b=>b.onclick=async()=>{if(busy||pending)return;station=b.dataset.station;cardFingerprint='';await refresh();});
 $('teacher-desk-refresh').onclick=()=>refresh().catch(e=>toast(e.message));
}
function renderSettings(){
 if(session.role!=='organizer'){renderTeacherDesk();return;}
 app.dataset.screen='settings';const draft=accessDraft();
 app.innerHTML='<div class="settings-heading"><h1>'+year+' 注音闖關</h1><div class="mode-switch" aria-label="選擇管理模式">'+['rehearsal','official'].map(mode=>'<button type="button" data-working-mode="'+mode+'" class="'+(workingMode===mode?'selected':'')+'">'+(mode==='rehearsal'?'🌱 預演':'🏅 正式闖關')+'</button>').join('')+'</div></div><nav class="screen-tabs" aria-label="活動管理分頁">'+[['stations','🏝 關主桌'],['activity','⚙ 活動設定'],['access','🎒 開放對象'],['reset','🔄 重置預演']].map(([id,label])=>'<button type="button" data-settings-tab="'+id+'" aria-pressed="'+(settingsTab===id)+'" class="'+(settingsTab===id?'selected':'')+'">'+label+'</button>').join('')+'</nav><section class="panel settings-panel" data-panel="'+settingsTab+'" id="settings-content"></section>';
 app.querySelectorAll('[data-working-mode]').forEach(b=>b.onclick=()=>switchWorkingMode(b.dataset.workingMode).catch(e=>toast(e.message)));
 app.querySelectorAll('[data-settings-tab]').forEach(b=>b.onclick=()=>{if(busy||pending)return;settingsTab=b.dataset.settingsTab;render();});
 const section=$('settings-content');
 if(settingsTab==='stations'){
  const ready=seatsForTeacher().length>0&&active(event);
  section.innerHTML='<h2>'+modeName()+' · 請選擇這次負責的關卡</h2><p class="subtle">'+(ready?'進入後先確認學生，再選題、評分與簽章。':'先在活動設定開啟本模式，並於開放對象選擇學生。')+'</p><div class="station-grid teacher-station-grid">'+STATIONS.map(s=>'<button data-station="'+s.id+'" class="station-choice" '+(ready?'':'disabled')+'>'+image(s.animal)+'<strong>'+s.name+'</strong><span>'+s.short+'</span></button>').join('')+'</div><p class="subtle">關主登入一次即可連續操作；孩子留在自己的作答畫面。</p>';
  app.querySelectorAll('[data-station]').forEach(b=>b.onclick=async()=>{if(busy||pending)return;station=b.dataset.station;cardFingerprint='';await refresh();});return;
 }
 if(settingsTab==='reset'){
  const allowed=workingMode==='rehearsal'&&active(event);
  section.innerHTML='<div class="big-icon">🔄</div><h2>目前是預演第 '+event.rehearsalRound+' 輪</h2><p>開始新一輪，孩子會拿到空白預演卡。<br>舊輪次仍保留，正式成績不受影響。</p><button id="reset-rehearsal" class="primary" '+(allowed?'':'disabled')+'>'+(rehearsalResetPending?'重試剛才的預演重置':'開始第 '+(event.rehearsalRound+1)+' 輪預演')+'</button><p class="subtle">先切換到預演並開啟活動，才能重置。</p>';
  $('reset-rehearsal').onclick=async()=>{if(busy)return;busy=true;$('reset-rehearsal').disabled=true;rehearsalResetPending??={year,mode:'rehearsal',revision:event.revision,requestId:crypto.randomUUID()};try{await api('reset-rehearsal',rehearsalResetPending);rehearsalResetPending=null;toast('新一輪預演已開始');}catch(e){if(e.status&&e.status<500)rehearsalResetPending=null;toast(e.message);}finally{busy=false;try{await refresh();}catch(error){toast(error.message);}if($('reset-rehearsal'))$('reset-rehearsal').disabled=!(active(event)&&workingMode==='rehearsal');}};return;
 }
 if(settingsTab==='access'){
  const seats=allTeacherSeats(),pages=Math.max(1,Math.ceil(seats.length/8));rosterPage=Math.min(rosterPage,pages-1);
  section.innerHTML='<h2>'+modeName()+' · 選擇開放學生</h2><label class="all-students"><input id="all-students" type="checkbox" '+(draft.allStudents?'checked':'')+'> 本班所有學生</label><div class="roster-grid">'+seats.slice(rosterPage*8,rosterPage*8+8).map(seat=>'<label class="roster-seat '+(draft.seats.includes(seat)?'selected':'')+'"><input type="checkbox" data-seat="'+escape(seat)+'" '+(draft.allStudents||draft.seats.includes(seat)?'checked':'')+' '+(draft.allStudents?'disabled':'')+'><span>'+escape(seat)+'</span></label>').join('')+'</div><div class="pager"><button id="roster-prev" '+(rosterPage?'':'disabled')+'>← 上一頁</button><span>第 '+(rosterPage+1)+'／'+pages+' 頁</span><button id="roster-next" '+(rosterPage<pages-1?'':'disabled')+'>下一頁 →</button></div><p class="subtle">'+(draft.allStudents?'已選本班所有學生':'已選 '+draft.seats.length+' 位學生')+'；儲存後才生效。預演與正式各自設定。</p><button id="save-access" class="primary">保存'+modeName()+'設定</button>';
  $('all-students').onchange=e=>{draft.allStudents=e.target.checked;render();};
  section.querySelectorAll('[data-seat]').forEach(input=>input.onchange=()=>{draft.seats=input.checked?[...new Set([...draft.seats,input.dataset.seat])]:draft.seats.filter(seat=>seat!==input.dataset.seat);render();});
  $('roster-prev').onclick=()=>{rosterPage--;render();};$('roster-next').onclick=()=>{rosterPage++;render();};$('save-access').onclick=e=>saveAccess(e.currentTarget);return;
 }
 section.innerHTML='<h2>'+modeName()+' · 活動開放設定</h2><form id="event-form"><div class="settings-grid"><label>活動開關<select id="event-enabled"><option value="no" '+(!draft.enabled?'selected':'')+'>🌙 關閉</option><option value="yes" '+(draft.enabled?'selected':'')+'>☀ 開放</option></select></label><label>照做不誤預設次數<select id="action-count">'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'" '+(draft.actionCount===i+1?'selected':'')+'>'+(i+1)+' 次</option>').join('')+'</select></label><label>開始時間（選填）<input id="starts" type="datetime-local" value="'+toLocal(draft.startsAt)+'"></label><label>結束時間（選填）<input id="ends" type="datetime-local" value="'+toLocal(draft.endsAt)+'"></label></div><p class="subtle">每關20分，總分100分。聲調／拼音由關主選3～8題，完成後可加題。</p><button class="primary" id="save-event">保存'+modeName()+'設定</button></form>';
 $('event-enabled').onchange=e=>draft.enabled=e.target.value==='yes';$('action-count').onchange=e=>draft.actionCount=Number(e.target.value);$('starts').onchange=e=>draft.startsAt=fromLocal(e.target.value);$('ends').onchange=e=>draft.endsAt=fromLocal(e.target.value);
 $('event-form').onsubmit=e=>{e.preventDefault();void saveAccess($('save-event'));};
}
function toLocal(value){if(!value)return '';const d=new Date(value);return new Date(d.valueOf()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function fromLocal(value){return value?new Date(value).valueOf():null;}
function renderStation(){
 app.dataset.screen='station';app.dataset.station=station;app.dataset.role=session.role;
 {const nextKey=JSON.stringify([card.mode,card.rehearsalRound,card.seat,station,card.attempts[station]?.index,card.attempts[station]?.rounds[card.attempts[station]?.index]?.selected,!!card.attempts[station]?.rounds[card.attempts[station]?.index]?.result]);if(nextKey!==draftQuestionKey){draftQuestionKey=nextKey;answers=[];cursor=0;combinedOpen=false;spellingCategory='initial';}}
 const s=STATIONS.find(s=>s.id===station),a=card.attempts[station],teacher=session.role!=='student',round=a?.rounds[a.index];
 const controls=handoffChild?`<div class="handoff-notice">🔒 關主接手中 · ${escape(card.seat)} · ${s.name}<small>只操作眼前這位孩子；選好題目後會交回孩子作答。</small></div>`:teacher?`<section class="panel teacher-controls"><label>目前學生<select id="target">${seatsForTeacher().map(v=>`<option ${target===v?'selected':''}>${escape(v)}</option>`).join('')}</select></label><label>關主關卡<select id="station-select">${permittedStations().map(v=>`<option value="${v.id}" ${station===v.id?'selected':''}>${v.name}</option>`).join('')}</select></label><div><span class="eyebrow">關主操作畫面</span><p class="subtle">先確認學生，再選題與簽章</p></div></section>`:'';
 app.innerHTML=`<div class="toolbar"><button id="back" class="quiet">← ${handoffChild?'交回孩子':teacher&&session.role==='organizer'?'活動設定':teacher?'關主桌':'我的闖關卡'}</button><button id="refresh">↻ 更新進度</button>${!production&&!teacher&&!a?.award?'<button id="unlock-teacher">🔒 請關主操作</button>':''}${pending?'<button id="retry" class="primary">重試剛才的保存</button>':''}</div>${controls}
 <div class="station-head">${image(s.animal)}<div><span class="eyebrow">第 ${STATIONS.indexOf(s)+1} 關 · ${teacher?'關主操作':'孩子作答'} · ${production&&teacher?'關主的 iPad':station==='tone'?'教室大屏':station==='spell'&&teacher&&!handoffChild?'關主的 iPad':'孩子的 iPad'}</span><h1>${s.name}</h1><p class="subtle">${s.description}</p></div></div><section class="panel question-panel"><div class="row question-progress"><span class="pill">🎒 ${escape(card.seat)}</span>${a?`<span>${station==='listen'?'已評 '+a.rounds.filter(r=>r.result).length+' / '+a.rounds.length+' 題':'第 '+(a.index+1)+' / '+a.rounds.length+' 題'}</span>`:''}</div><div id="question" class="question-area"></div></section>`;
 $('question').dataset.panel=station+'-'+(!a?'start':round?.result?'result':teacher?(round?.selected===null?'choose':'waiting'):'answer');
 $('back').onclick=()=>{if(pending)return;if(handoffChild){leaveTeacher().catch(e=>toast(e.message));return;}station=null;answers=[];extensionPlanning=false;if(session.role!=='student')refresh().catch(e=>toast(e.message));else render();};$('refresh').onclick=()=>refresh().then(()=>subscribe()).catch(e=>toast(e.message));if($('unlock-teacher'))$('unlock-teacher').onclick=showUnlock;if($('retry'))$('retry').onclick=async()=>{if(busy)return;busy=true;try{await sendPending();toast('已確認保存');}catch(e){toast(e.message);}finally{busy=false;}};
 if(teacher&&!handoffChild){$('target').onchange=async()=>{if(busy||pending){$('target').value=target;toast('請先重試剛才的保存');return;}target=$('target').value;pending=null;answers=[];await refresh();};$('station-select').onchange=()=>{if(busy||pending){$('station-select').value=station;toast('請先完成眼前的保存');return;}station=$('station-select').value;answers=[];extensionPlanning=false;render();};}
 if(a?.award){renderAward(a.award);return;}
 if(completeAttempt(a)&&!teacher){renderStudentStamp(a);return;}
 if(completeAttempt(a)&&teacher&&station!=='listen'){renderCompletion(a);return;}
 if(station==='listen'){
  if(teacher)renderListeningTeacher(a);
  else $('question').innerHTML='<div class="big-icon">👂 ✋</div><h2>聽老師讀，指給老師看</h2><p>用愛的小手，指出黑板上的符號。'+(production?'老師會在關主的裝置記下表現。':'請關主在這台 iPad 選題並記下表現。')+'</p>';
  return;
 }
 if(!a){$('question').innerHTML=`<div class="big-icon">${s.icon}</div><h2>${teacher?'準備好開始了嗎？':'等關主老師幫你開始'}</h2><p>${teacher?'請確認眼前孩子的學號，再按開始。':'走到這一關，讓老師確認你的學號。'}</p>${teacher&&['action','spell','tone'].includes(station)?`<label>這位孩子考幾次？<select id="attempt-count">${Array.from({length:station==='action'?8:6},(_,i)=>{const n=i+(station==='action'?1:3);return `<option value="${n}" ${(station==='action'?event.actionCount:5)===n?'selected':''}>${n} 題</option>`;}).join('')}</select></label>`:''}${teacher?'<button id="start" data-command class="primary">開始這位孩子的闖關 →</button>':''}`;if($('start'))$('start').onclick=()=>command('start',['action','spell','tone'].includes(station)?{count:Number($('attempt-count').value)}:{});return;}
 if(round.result){$('question').innerHTML=`<div class="done-mark">${station==='read'?'📖':'✓'}</div><h2>${station==='read'?escape(round.options[round.selected].text):'這一題已完成'}</h2><p>${teacher?station==='read'?'請孩子拿課本朗讀，聽完後評分。':['tone','spell'].includes(station)?`這題${round.result.correct?'答對了':'還需要練習'}，最後由關主確認整關分數。`:'已記下孩子的表現。':(production?'等老師準備下一個挑戰。':'請關主接手，準備下一個挑戰。')}</p>${teacher?`<button id="advance" data-command class="primary">${a.index===a.rounds.length-1?'評分、蓋章與簽名':'下一題 →'}</button>`:''}`;if($('advance'))$('advance').onclick=()=>a.index===a.rounds.length-1?renderCompletion(a):command('next');return;}
 if(teacher){
  if(round.selected===null&&station!=='read'){$('question').innerHTML=`<h2>請關主選一${station==='action'?'個動作':'個詞語'}</h2><p class="subtle">${station==='tone'&&round.options[0].mode==='sandhi'?'這一題的三個選項都含變音。':'選定後才會送到孩子畫面，選好就不重抽。'}</p><div class="choice-grid">${round.options.map((q,i)=>`<button data-option="${i}" class="choice">${escape(q.text)}${station==='action'?actionZhuyin(q.zhuyin):''}</button>`).join('')}</div>`;app.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>command('select',{option:Number(b.dataset.option)}));return;}
  const q=round.options[round.selected];
  if(station==='read'){$('question').innerHTML='<div class="big-icon">🎡</div><h2>等孩子點轉盤抽課</h2><p>抽中的課次會同步到這裡。</p>';return;}
  $('question').innerHTML=`<p class="eyebrow">${station==='listen'?'請老師讀出這個符號':'孩子目前的題目'}</p><div class="${station==='listen'?'big-symbol':'big-word'}">${escape(q.text)}</div>${station==='action'?'<p class="zhuyin-action">'+actionZhuyin(q.zhuyin)+'</p>':''}${['listen','action'].includes(station)?'<div class="actions"><button id="observe-yes" data-command class="primary">✓ 完成得很好</button><button id="observe-no" data-command>再多練習</button></div>':'<p>請孩子在自己的畫面作答，送出後會同步顯示。</p>'}`;
  if($('observe-yes')){$('observe-yes').onclick=()=>command('observe',{correct:true});$('observe-no').onclick=()=>command('observe',{correct:false});}return;
 }
 if(station==='listen'){$('question').innerHTML='<div class="big-icon">👂 ✋</div><h2>聽老師讀，指給老師看</h2><p>用愛的小手，指出黑板上的符號。</p>';return;}
 if(station==='read'){renderWheel();return;}
 if(round.selected===null){$('question').innerHTML='<div class="big-icon">⏳</div><h2>關主正在選題</h2><p>準備好了嗎？下一個挑戰就要來囉！</p>';return;}
 const q=round.options[round.selected];
 if(station==='tone'){renderTone(q);return;}if(station==='spell'){renderSpelling(q);return;}
 $('question').innerHTML='<div class="big-icon">🎭</div><p class="eyebrow">讀一讀，做出來</p><div class="zhuyin-action">'+actionZhuyin(q.zhuyin)+'</div><p>讓老師看看你的動作！</p>';
}
function renderStudentStamp(a){
 $('question').dataset.panel='stamp-choice';
 $('question').innerHTML='<div class="done-mark">🌟</div><h2>'+(station==='read'?'抽中'+escape(a.rounds[a.index].options[a.rounds[a.index].selected]?.text)+'，請讀給老師聽':'完成了！選一枚喜歡的印章')+'</h2><p>'+(station==='read'?'讀完後，選一枚喜歡的印章。':'')+'等老師確認是否加題，再為你評分簽章。</p><div class="student-stamps">'+stampsForStation(station).map(s=>'<button type="button" data-preferred-stamp="'+s.id+'" class="'+(a.preferredStamp===s.id?'selected':'')+'" aria-pressed="'+(a.preferredStamp===s.id)+'">'+image(s.id)+'<span>'+escape(s.name)+'</span></button>').join('')+'</div><p class="subtle">'+(a.preferredStamp?'已選「'+escape(stampById(a.preferredStamp)?.name)+'」，老師確認後就會蓋上。':'點喜歡的圖案告訴老師。')+'</p>';
 app.querySelectorAll('[data-preferred-stamp]').forEach(b=>b.onclick=()=>command('choose-stamp',{stamp:b.dataset.preferredStamp}));
}
function renderCompletion(a){
 $('question').dataset.panel='extend';const limit=availableExtension(a);extendCount=Math.max(1,Math.min(limit||1,extendCount));
 $('question').innerHTML='<div class="done-mark">✓</div><h2>要再增加幾題嗎？</h2><p>已完成 '+a.rounds.length+' 題。'+(station==='read'?'剛才抽中：'+escape(a.rounds[a.index].options[a.rounds[a.index].selected]?.text)+'。':'')+(station==='listen'?'本關會依全部題目表現換算為20分。':station==='read'?'新抽的課次不會重複。':'可再練習幾題，最後由關主評分。')+'</p>'+(limit?'<div class="count-picker" aria-label="加題數量">'+Array.from({length:limit},(_,i)=>'<button type="button" data-extend-count="'+(i+1)+'" class="'+(extendCount===i+1?'selected':'')+'">'+(i+1)+' 題</button>').join('')+'</div><button id="extend-attempt" class="primary">'+(station==='listen'?'選擇新增符號':'再增加 '+extendCount+' 題')+' →</button>':'<p class="subtle">這一關已達本輪題數上限。</p>')+'<button id="complete-award">不加題，評分蓋章與簽名 →</button>'+(station==='listen'?'<button id="back-listen-grading" class="quiet">← 檢查逐題評量</button>':'')+(a.preferredStamp?'<p class="subtle">孩子想選：'+escape(stampById(a.preferredStamp)?.name||'印章')+'</p>':'');
 app.querySelectorAll('[data-extend-count]').forEach(b=>b.onclick=()=>{extendCount=Number(b.dataset.extendCount);renderCompletion(a);});
 if($('extend-attempt'))$('extend-attempt').onclick=()=>{if(busy||pending)return;if(station==='listen'){extensionPlanning=true;listenDraft=[];listenCategory=0;renderListeningPlan(a);}else command('extend',{count:extendCount});};
 $('complete-award').onclick=openAward;if($('back-listen-grading'))$('back-listen-grading').onclick=()=>renderListeningTeacher(a);
}
function renderListeningTeacher(a){
 const key=[session.classId,year,card.mode,card.rehearsalRound,card.seat].join(':');if(key!==listenDraftKey){listenDraftKey=key;listenDraft=[];listenFocus=0;listenReplanning=false;listenCategory=0;extensionPlanning=false;}
 if(!a||a.listenPolicy!==LISTEN_POLICY||listenReplanning||extensionPlanning){renderListeningPlan(a);return;}
 $('question').dataset.panel='listen-grade';
 const totals=listeningSummary(a);listenFocus=Math.max(0,Math.min(a.rounds.length-1,listenFocus));const focused=a.rounds[listenFocus],result=LISTEN_OUTCOMES.find(v=>v.id===focused.result?.outcome),page=Math.floor(listenFocus/10),pages=Math.ceil(a.rounds.length/10);
 $('question').innerHTML='<div class="listening-panel"><div class="row listen-grade-heading"><h2>'+(pages>1?'逐題評量':'點符號，再選表現')+'</h2><span>已評 '+totals.assessed+'／'+a.rounds.length+' 題</span><strong class="listen-total">'+totals.points+' <small>／20 分</small></strong>'+(pages>1?'<div class="listen-inline-pager"><button id="listen-prev" aria-label="上一頁十題" '+(page?'':'disabled')+'>←</button><span>'+(page+1)+'／'+pages+'</span><button id="listen-next" aria-label="下一頁十題" '+(page<pages-1?'':'disabled')+'>→</button></div>':'')+'</div><div class="listen-round-grid">'+a.rounds.slice(page*10,page*10+10).map((r,offset)=>{const i=page*10+offset,state=LISTEN_OUTCOMES.find(v=>v.id===r.result?.outcome);return '<button class="listen-round '+(state?.id||'unrated')+' '+(i===listenFocus?'focused':'')+'" data-listen-round="'+i+'" aria-pressed="'+(i===listenFocus)+'" aria-label="第'+(i+1)+'題 '+escape(r.options[0].text)+' '+(state?state.label+' '+state.points+'分':'尚未評量')+'"><small>第 '+(i+1)+' 題</small><strong>'+escape(r.options[0].text)+'</strong><span>'+(state?state.icon+' '+state.points+' 分':'○ 尚未評量')+'</span></button>';}).join('')+'</div>'+'<div class="listen-rating"><div class="listen-current"><span>第 '+(listenFocus+1)+' 題</span><strong>'+escape(focused.options[0].text)+'</strong></div><div class="listen-rating-buttons">'+LISTEN_OUTCOMES.map(v=>'<button data-command data-listen-outcome="'+v.id+'" class="'+v.id+'" '+(result?.id===v.id?'disabled':'')+'>'+v.icon+' '+v.label+'<small>'+v.points+' 分</small></button>').join('')+'</div><button id="listen-clear" class="quiet" '+(focused.result?'':'disabled')+'>清除此題</button></div><div class="listen-footer">'+(totals.assessed===0&&a.rounds.length===10?'<button id="listen-replan" class="quiet">改選十題</button>':'<span class="subtle">'+(a.rounds.length>10?'依 '+a.rounds.length+' 題換算20分':'簽章前都可更正')+'</span>')+'<button id="listen-finish" class="primary" '+(totals.remaining?'disabled':'')+'>'+(totals.remaining?'還有 '+totals.remaining+' 題待評量':'完成，選擇加題或簽章 →')+'</button></div></div>';
 app.querySelectorAll('[data-listen-round]').forEach(b=>b.onclick=()=>{if(busy||pending)return;listenFocus=Number(b.dataset.listenRound);renderListeningTeacher(card.attempts.listen);});
 app.querySelectorAll('[data-listen-outcome]').forEach(b=>b.onclick=()=>command('listen-rate',{index:listenFocus,outcome:b.dataset.listenOutcome}));
 if($('listen-prev'))$('listen-prev').onclick=()=>{listenFocus=(page-1)*10;renderListeningTeacher(a);};if($('listen-next'))$('listen-next').onclick=()=>{listenFocus=(page+1)*10;renderListeningTeacher(a);};
 $('listen-clear').onclick=()=>command('listen-rate',{index:listenFocus,outcome:null});$('listen-finish').onclick=()=>renderCompletion(a);
 if($('listen-replan'))$('listen-replan').onclick=()=>{listenReplanning=true;listenDraft=a.rounds.map(r=>r.options[0].text);renderListeningTeacher(a);};
}
function renderListeningPlan(a){
 $('question').dataset.panel=extensionPlanning?'listen-extend':'listen-plan';
 const groups=[['聲符',INITIALS],['韻符',FINALS],['結合韻',COMBINED]],symbols=groups[listenCategory][1],count=extensionPlanning?extendCount:10,used=extensionPlanning?a.rounds.map(r=>r.options[0].text):[];
 $('question').innerHTML='<div class="listening-panel"><div class="listen-plan-bar"><h2>'+(extensionPlanning?'新增 '+count+' 題':'自由選十題')+' <small>'+listenDraft.length+'／'+count+'</small></h2><button id="listen-start" data-command class="primary" '+(listenDraft.length===count?'':'disabled')+'>'+(extensionPlanning?'選好了，增加題目 →':'選好了，開始評量 →')+'</button></div><div class="listen-picked" aria-label="已選題目">'+Array.from({length:count},(_,i)=>listenDraft[i]?'<button type="button" data-listen-remove="'+i+'" aria-label="取消第'+(i+1)+'題 '+escape(listenDraft[i])+'"><small>'+(i+1)+'</small>'+escape(listenDraft[i])+'</button>':'<span class="listen-empty">'+(i+1)+'</span>').join('')+'</div><nav class="screen-tabs" aria-label="注音分類">'+groups.map(([name,items],i)=>'<button type="button" data-listen-category="'+i+'" aria-pressed="'+(listenCategory===i)+'" class="'+(listenCategory===i?'selected':'')+'">'+name+' '+items.length+'</button>').join('')+'</nav><section class="listen-symbol-group" data-category="'+listenCategory+'"><div class="listen-symbol-grid '+(listenCategory===2?'combined':'')+'">'+symbols.map(symbol=>{const i=listenDraft.indexOf(symbol),already=used.includes(symbol);return '<button data-listen-symbol="'+symbol+'" class="'+(i>=0?'is-picked':'')+'" '+(already?'disabled':'')+' aria-pressed="'+(i>=0)+'" aria-label="'+symbol+(already?' 已考過':i>=0?' 已選第'+(i+1)+'題':' 選這題')+'"><strong>'+symbol+'</strong><small>'+(already?'已考過':i>=0?'✓ 第 '+(i+1)+' 題':'選這題')+'</small></button>';}).join('')+'</div></section>'+(extensionPlanning?'<button id="cancel-extend" class="quiet">← 回加題選擇</button>':'<p class="listen-plan-tip">點藍色符號或上方已選題可取消；切換分類會保留已選題目。</p>')+'</div>';
 app.querySelectorAll('[data-listen-category]').forEach(b=>b.onclick=()=>{listenCategory=Number(b.dataset.listenCategory);renderListeningPlan(a);});
 app.querySelectorAll('[data-listen-remove]').forEach(b=>b.onclick=()=>{if(busy||pending)return;listenDraft.splice(Number(b.dataset.listenRemove),1);renderListeningPlan(a);});
 app.querySelectorAll('[data-listen-symbol]').forEach(b=>b.onclick=()=>{if(busy||pending)return;const symbol=b.dataset.listenSymbol,index=listenDraft.indexOf(symbol);if(index>=0)listenDraft.splice(index,1);else if(listenDraft.length<count)listenDraft.push(symbol);else{toast('已選 '+count+' 題，請先取消一題再更換');return;}renderListeningPlan(a);});
 $('listen-start').onclick=()=>command(extensionPlanning?'extend':a?'listen-replan':'start',{...(extensionPlanning?{count}:{}),symbols:[...listenDraft]});
 if($('cancel-extend'))$('cancel-extend').onclick=()=>{extensionPlanning=false;listenDraft=[];renderCompletion(a);};
}
let questionAudio=null;
function playQuestionAudio(q){if(!q.audioUrl){toast('請關主朗讀這個詞語');return;}questionAudio?.pause();questionAudio=new Audio(production?new URL(q.audioUrl,'https://j822925.github.io/zhuyin-game-new/').href:q.audioUrl);questionAudio.play().catch(()=>toast('音檔未能播放，請關主朗讀這個詞語'));}
function renderTone(q){
 $('question').dataset.panel='tone';
 if(answers.length!==[...q.text].length)answers=Array(q.text.length).fill(null);
 $('question').innerHTML=`<button id="play-audio" class="quiet">🔊 再聽一次</button><p class="subtle">${card.attempts.tone.tonePolicy==='surface'?'請選實際聽到的聲調':'請選每個字原本的聲調'}</p><div class="tone-words">${[...q.text].map((c,i)=>`<div><div class="tone-char">${escape(c)}</div><div class="tone-options">${TONES.map(t=>`<button data-char="${i}" data-tone="${t.value}" aria-label="${escape(c)}的${t.name}" class="${answers[i]===t.value?'selected':''}">${t.mark}</button>`).join('')}</div></div>`).join('')}</div><div class="actions"><button id="submit-answer" class="primary" ${answers.some(v=>v===null)?'disabled':''}>選好了，送出 →</button></div>`;
 $('play-audio').onclick=()=>playQuestionAudio(q);
 app.querySelectorAll('[data-tone]').forEach(b=>b.onclick=()=>{answers[Number(b.dataset.char)]=Number(b.dataset.tone);renderTone(q);});$('submit-answer').onclick=()=>command('answer',{answer:answers});
}
function renderSpelling(q){
 $('question').dataset.panel='spell';
 if(answers.length!==q.text.length)answers=Array(q.text.length).fill('');
 const categories=[['initial','聲符',INITIALS],['final','韻符',FINALS],['combined','結合韻',COMBINED],['tone','聲調',TONES]],current=categories.find(v=>v[0]===spellingCategory)||categories[0];
 const pieces=current[0]==='tone'?TONES.map(t=>'<button data-tone-piece="'+t.value+'" aria-label="'+t.name+'">'+t.mark+'<small>'+t.name+'</small></button>').join(''):current[2].map(v=>'<button data-piece="'+v+'" data-part="'+(current[0]==='initial'?'initial':'final')+'">'+v+'</button>').join('');
 $('question').innerHTML='<div class="spelling-wordline"><strong>'+escape(q.text)+'</strong><span>正在拼第 '+(cursor+1)+' 個字</span><button type="button" id="spell-audio" class="quiet">🔊 聽詞語</button></div><div class="syllable-list">'+[...q.text].map((c,i)=>'<button data-syllable="'+i+'" class="'+(i===cursor?'selected':'')+'" aria-label="拼出'+escape(c)+'"><small>'+escape(c)+'</small><span>'+ (escape(answers[i])||'＿')+'</span></button>').join('')+'</div><div class="helper"><nav class="screen-tabs" aria-label="拼音積木分類">'+categories.map(([id,label])=>'<button type="button" data-helper-category="'+id+'" class="'+(current[0]===id?'selected':'')+'" aria-pressed="'+(current[0]===id)+'">'+label+'</button>').join('')+'</nav><div class="helper-pieces '+(current[0]==='tone'?'tone-pieces':'')+'" data-category="'+current[0]+'">'+pieces+'</div></div><div class="actions spell-actions"><button id="clear-syllable" class="quiet">⌫ 清除此字</button><button id="next-syllable" '+(cursor>=q.text.length-1?'disabled':'')+'>下一個字 →</button><button id="submit-answer" class="primary" '+(answers.some(v=>!v)?'disabled':'')+'>拼好了，送出 →</button></div>';
 $('spell-audio').onclick=()=>playQuestionAudio(q);
 app.querySelectorAll('[data-helper-category]').forEach(b=>b.onclick=()=>{spellingCategory=b.dataset.helperCategory;renderSpelling(q);});
 app.querySelectorAll('[data-syllable]').forEach(b=>b.onclick=()=>{cursor=Number(b.dataset.syllable);spellingCategory='initial';renderSpelling(q);});
 app.querySelectorAll('[data-piece]').forEach(b=>b.onclick=()=>{const old=answers[cursor],tone=old.match(/[ˊˇˋ˙]/)?.[0]||'',body=old.replace(/[ˊˇˋ˙]/g,''),initial=INITIALS.includes(body[0])?body[0]:'',final=initial?body.slice(1):body;answers[cursor]=(b.dataset.part==='initial'?b.dataset.piece+final:initial+b.dataset.piece)+tone;spellingCategory=b.dataset.part==='initial'?'final':'tone';renderSpelling(q);});
 app.querySelectorAll('[data-tone-piece]').forEach(b=>b.onclick=()=>{answers[cursor]=answers[cursor].replace(/[ˊˇˋ˙]/g,'')+(['','', 'ˊ','ˇ','ˋ','˙'][Number(b.dataset.tonePiece)]);renderSpelling(q);});
 $('clear-syllable').onclick=()=>{answers[cursor]='';spellingCategory='initial';renderSpelling(q);};$('next-syllable').onclick=()=>{cursor++;spellingCategory='initial';renderSpelling(q);};$('submit-answer').onclick=()=>command('answer',{answer:answers});
}
function renderWheel(){
 const used=new Set(card.attempts.read.rounds.filter(r=>r.result).map(r=>Number(r.options[r.selected]?.lesson)||Number(r.options[r.selected]?.text?.match(/[0-9]+/)?.[0])));
 $('question').dataset.panel='read-wheel';
 $('question').innerHTML=`<h2>九課幸運輪</h2><p>從尚未讀過的課次中抽一課，點一下開始！</p><div class="wheel ${spinning?'spinning':''}">${Array.from({length:9},(_,i)=>`<span style="--i:${i}" class="${used.has(i+1)?'used-lesson':''}" aria-label="第${i+1}課${used.has(i+1)?'已抽過':''}">${i+1}</span>`).join('')}</div><button id="draw-lesson" class="primary" ${spinning?'disabled':''}>🎡 ${spinning?'轉呀轉…':'轉一轉，抽一課'}</button>`;
 $('draw-lesson').onclick=async()=>{if(busy||spinning)return;spinning=true;renderWheel();const start=Date.now();await command('draw');setTimeout(()=>{spinning=false;render();},Math.max(0,1300-(Date.now()-start)));};
}
function signatureSvg(value){return `<svg class="signature-view" viewBox="0 0 400 120" aria-label="關主手寫簽名">${value.map(line=>`<polyline fill="none" stroke="#294b45" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${line.map(([x,y])=>`${x*400},${y*120}`).join(' ')}"/>`).join('')}</svg>`;}
function renderAward(award){
 $('question').dataset.panel='award';
 const tab=award.note?awardViewTab:'stamp';
 $('question').innerHTML=(award.note?'<nav class="screen-tabs award-view-tabs" aria-label="闖關成果"><button type="button" data-award-view="stamp" class="'+(tab==='stamp'?'selected':'')+'">🏅 印章與簽名</button><button type="button" data-award-view="note" class="'+(tab==='note'?'selected':'')+'">💬 老師的話</button></nav>':'')+(tab==='note'?'<h2>老師給你的話</h2><p class="award-note-full">'+escape(award.note)+'</p>':'<div class="award-view">'+image(award.stamp)+'<div><h2>這一關，完成了！</h2><p><strong class="award-total">'+award.score+'</strong> ／20 分</p>'+signatureSvg(award.signature)+'</div></div><p class="subtle">關主已確認分數並簽章。</p>')+(session.role==='student'&&station==='tone'?'<button id="next-child" class="primary">完成，換下一位登入 →</button>':'');
 app.querySelectorAll('[data-award-view]').forEach(b=>b.onclick=()=>{awardViewTab=b.dataset.awardView;renderAward(award);});if($('next-child'))$('next-child').onclick=()=>$('logout').click();
}
function showAwardStep(step){
 awardStep=step;$('award-dialog').dataset.step=String(step);$('award-step-label').textContent=step===1?'1／2 分數與印章':'2／2 手寫簽名';$('award-step-score').hidden=step!==1;$('award-step-sign').hidden=step!==2;
 if(step===2)showSignPanel(awardSignPanel);
}
function showSignPanel(panel){
 awardSignPanel=panel;$('award-signature-panel').hidden=panel!=='signature';$('award-note-panel').hidden=panel!=='note';$('award-step-sign').dataset.signPanel=panel;
 document.querySelectorAll('[data-sign-panel]').forEach(b=>{b.classList.toggle('selected',b.dataset.signPanel===panel);b.setAttribute('aria-pressed',String(b.dataset.signPanel===panel));});if(panel==='signature')setupCanvas();
}
function renderScoreChoices(){
 const locked=$('award-score').dataset.locked==='true',value=$('award-score').value;$('score-options').hidden=locked;
 $('score-options').innerHTML=locked?'':Array.from({length:21},(_,i)=>'<button type="button" data-score="'+i+'" class="'+(value!==''&&Number(value)===i?'selected':'')+'" aria-pressed="'+(value!==''&&Number(value)===i)+'">'+i+'</button>').join('');
 $('score-options').querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>{if(busy||pending)return;$('award-score').value=b.dataset.score;renderScoreChoices();});
}
function awardNext(){
 const raw=$('award-score').value,score=Number(raw);if(raw===''||!Number.isInteger(score)||score<0||score>20){$('award-error').textContent='請先選擇零至二十分的整數分數';return;}
 $('award-error').textContent='';showAwardStep(2);
}
function openAward(){
 if(pending){toast('剛才的保存尚未確認，請先重試原本的簽章');$('award-dialog').showModal();showAwardStep(2);return;}
 const a=card.attempts[station],correct=a.rounds.filter(r=>r.result?.correct).length;
 const listening=station==='listen'&&a.listenPolicy===LISTEN_POLICY,totals=listening?listeningSummary(a):null;
 $('score-hint').textContent=listening?'通過 '+totals.pass+' 題、提示 '+totals.hint+' 題、未通過 '+totals.fail+' 題；共 '+a.rounds.length+' 題，換算 '+totals.points+'／20 分':['tone','spell'].includes(station)?'答對 '+correct+'／'+a.rounds.length+' 題，建議 '+Math.round(correct/a.rounds.length*20)+' 分。請關主確認。':'請依孩子整體表現，點選零至二十分。';
 $('award-score').readOnly=true;$('award-score').dataset.locked=String(listening);$('award-score').value=listening?totals.points:['tone','spell'].includes(station)?Math.round(correct/a.rounds.length*20):'';stamp=stampsForStation(station).some(s=>s.id===a.preferredStamp)?a.preferredStamp:stampsForStation(station)[0].id;lines=[];awardSignPanel='signature';$('award-note').value='';$('award-error').textContent='';$('award-form').querySelectorAll('input,textarea,button').forEach(b=>b.disabled=false);$('save-award').textContent='確認分數，蓋章保存';renderStamps();renderScoreChoices();$('award-dialog').showModal();showAwardStep(1);
}
function renderStamps(){$('stamp-options').innerHTML=stampsForStation(station).map(s=>`<button type="button" data-stamp="${s.id}" class="${stamp===s.id?'selected':''}" aria-label="${escape(s.name)}印章" aria-pressed="${stamp===s.id}">${image(s.id)}</button>`).join('');$('stamp-options').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(busy||pending)return;stamp=b.dataset.stamp;renderStamps();});}
function setupCanvas(){const canvas=$('signature'),ratio=devicePixelRatio||1;canvas.width=canvas.clientWidth*ratio;canvas.height=canvas.clientHeight*ratio;let drawing=false;
 const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
 canvas.onpointerdown=e=>{e.preventDefault();if(busy||pending)return;drawing=true;canvas.setPointerCapture(e.pointerId);if(lines.length<100)lines.push([point(e)]);else drawing=false;};canvas.onpointermove=e=>{if(!drawing)return;const line=lines.at(-1);if(line.length<2000)line.push(point(e));drawCanvas();};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;};drawCanvas();}
function drawCanvas(){const canvas=$('signature'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.lineWidth=2.4*(devicePixelRatio||1);ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle='#294b45';for(const line of lines){ctx.beginPath();line.forEach(([x,y],i)=>i?ctx.lineTo(x*canvas.width,y*canvas.height):ctx.moveTo(x*canvas.width,y*canvas.height));ctx.stroke();}}
let resized;window.addEventListener('resize',()=>{clearTimeout(resized);resized=setTimeout(()=>{if($('award-dialog').open&&awardStep===2&&awardSignPanel==='signature')setupCanvas();},100);});
function printCard(){
 const full=Object.entries(card.attempts).filter(([,a])=>a.award),totals=summary(card.attempts),section=document.createElement('section');
 const title=card.mode==='rehearsal'?'預演闖關卡（不計正式成績）':production?'正式闖關卡':'正式闖關卡（本機示範）';
 const roundLabel=card.mode==='rehearsal'?'預演第'+card.rehearsalRound+'輪 · ':'';
 const rows=STATIONS.map(s=>{const award=full.find(([id])=>id===s.id)?.[1].award;return `<tr><td>${s.name}</td><td>${award?award.score+' /20':'尚未完成'}</td><td>${award?image(award.stamp):''}</td><td>${award?signatureSvg(award.signature)+'<br>'+escape(award.note):''}</td></tr>`;}).join('');
 section.className='print-only';section.innerHTML=`<h1>${title}</h1><p>年度 ${year} · ${roundLabel}${production?'學號':'示範學號'} ${escape(card.seat)} · 已完成 ${totals.complete}/5 關 · ${totals.total}/100 分</p><table class="score-table"><tr><th>關卡</th><th>分數</th><th>印章</th><th>簽名與建議</th></tr>${rows}</table>`;
 app.append(section);window.print();section.remove();
}
systemSetup().catch(()=>window.dispatchEvent(new Event('annual-load-error')));
async function systemSetup(){
 $('home-link').onclick=e=>{if(pending){e.preventDefault();toast('保存尚未確認，請先重試原本的保存');}};
 if(previewAdapter||production)document.querySelector('.brand').onclick=async e=>{e.preventDefault();if(busy||pending)return;if(handoffChild)await leaveTeacher();station=null;answers=[];if(session&&session.role!=='student')await refresh();else if(session&&card)render();else if(session)await refresh();else loginScreen();};
 $('cancel-unlock').onclick=()=>{if(!busy)$('unlock-dialog').close();};$('unlock-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 $('confirm-unlock').onclick=async()=>{if(production||busy)return;busy=true;$('confirm-unlock').disabled=true;try{const grant=await api('unlock',{year,mode:card.mode,rehearsalRound:card.rehearsalRound,station});handoffChild=session;target=session.seat;streamController?.abort();session=grant;$('unlock-dialog').close();await refresh();subscribe();}catch(e){$('unlock-error').textContent=e.message;}finally{busy=false;$('confirm-unlock').disabled=false;}};
 $('close-award').onclick=()=>{if(pending){toast('保存尚未確認，請先重試原本的簽章');return;}if(!busy)$('award-dialog').close();};$('award-dialog').addEventListener('cancel',e=>{if(busy||pending)e.preventDefault();});$('clear-signature').onclick=()=>{if(busy||pending)return;lines=[];drawCanvas();};
 document.querySelectorAll('[data-sign-panel]').forEach(b=>b.onclick=()=>{if(!busy&&!pending)showSignPanel(b.dataset.signPanel);});
 $('award-next').onclick=()=>{if(!busy&&!pending)awardNext();};$('award-previous').onclick=()=>{if(!busy&&!pending)showAwardStep(1);};
 $('award-form').onsubmit=async e=>{e.preventDefault();if(busy)return;if(awardStep!==2){awardNext();return;}const award={score:Number($('award-score').value),stamp,signature:structuredClone(lines),note:$('award-note').value};busy=true;$('save-award').disabled=true;
  try{const payload=pending?.type==='award'?pending:{year,mode:card.mode,rehearsalRound:card.rehearsalRound,seat:target,station,type:'award',revision:card.attempts[station].revision,requestId:crypto.randomUUID(),award};pending=payload;await api('command',payload);pending=null;$('award-dialog').close();if(handoffChild)await leaveTeacher();else await refresh();toast('印章、分數和簽名已保存');}catch(err){$('award-error').textContent=err.message;if(err.status&&err.status<500)pending=null;$('award-form').querySelectorAll('input,textarea,[data-stamp],[data-score],[data-sign-panel],#award-next,#award-previous,#clear-signature').forEach(b=>b.disabled=!!pending);$('save-award').textContent=pending?'重試確認剛才的保存':'確認分數，蓋章保存';if(err.status===409)await refresh();}finally{busy=false;$('save-award').disabled=false;}};
 if(production){
  document.querySelector('.preview-note').textContent='年度注音闖關 · 預演與正式成績分開保存';
  $('confirm-unlock').hidden=true;
  app.innerHTML=hero()+'<section class="panel"><h2>正在準備登入…</h2><p>請稍候。</p></section>';startupReady();
  try{
   const bootController=new AbortController(),bootMessage='登入準備逾時，請確認網路後按「重新載入」再試。';let bootTimer;
   try{
    const ready=await Promise.race([(async()=>{const helpers=await import('./annual-challenge-production.js?v=20261107-teachers1');if(bootController.signal.aborted)throw Error(bootMessage);const adapter=await helpers.createProductionAdapter({year,signal:bootController.signal,onExpired:()=>{resetViewSession();loginScreen();toast('關主登入已到期，請重新登入');}});if(bootController.signal.aborted)throw Error(bootMessage);return {helpers,adapter};})(),new Promise((resolve,reject)=>{bootTimer=setTimeout(()=>{bootController.abort();reject(Error(bootMessage));},15000);})]);
    liveHelpers=ready.helpers;productionAdapter=ready.adapter;
   }finally{clearTimeout(bootTimer);}
   poller=liveHelpers.createStationPoller({read:refresh,eligible:()=>!!session&&!!station&&active(event)&&!busy&&!pending&&!spinning&&document.visibilityState==='visible'&&navigator.onLine!==false,onError:(error,count)=>{if(count===1)toast(error.message);}});
   const resume=()=>{if(session&&document.visibilityState==='visible'&&navigator.onLine!==false&&!busy)refresh().catch(error=>toast(error.message));poller.wake();};
   document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
   window.addEventListener('pagehide',()=>{poller.stop();if(productionAdapter.teacher)void productionAdapter.logout();});
   window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
   try{session=await productionAdapter.restore();}catch(error){toast(liveHelpers.annualError(error));}
   if(session){target=session.seat||session.seats[0]||'';identity();await refresh();subscribe();}else loginScreen();
  }catch(error){app.innerHTML=hero()+'<section class="panel"><h2>登入暫時無法使用</h2><p id="live-start-error"></p><button id="live-start-retry">重新載入</button></section>';$('live-start-error').textContent=error.message;$('live-start-retry').onclick=()=>location.reload();}
  return;
 }
 try{const raw=sessionStorage.getItem('annual-preview-session');session=raw?JSON.parse(raw):null;if(session){target=session.role==='student'?session.seat:target;station=null;await refresh();subscribe();identity();}else loginScreen();}catch{session=null;saveTabSession(null);loginScreen();}
}
