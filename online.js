import {CHARACTER_CATALOG} from './data/character-catalog.js';
import {STAR_SPRITES} from './data/star-sprites.js';
import {audioSource} from './audio-source.js?v=20260920-le4';
const $=id=>document.getElementById(id),SESSION='zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live';
const ENDPOINT=location.hostname==='127.0.0.1'?location.origin:'https://zhuyin-api.j822925.workers.dev';

const avatars=Object.fromEntries(CHARACTER_CATALOG.map(c=>[c.id,c.image]));Object.assign(avatars,STAR_SPRITES);
const avatar=id=>avatars[id]||CHARACTER_CATALOG.find(c=>c.starter)?.image;
const messages={invalid_pin:'密碼不正確，再試一次。',locked:'密碼試了太多次，請等五分鐘。',login_required:'登入到期了，請重新選座號、輸入密碼。',room_missing:'找不到這個房間，請問同學新的四位房號。',room_full:'這個房間已經有兩位同學了。',room_closed:'這個房間已結束，回首頁再開一間吧！',already_in_room:'你已經在另一個房間，先回去或離開那間房。',capacity:'現在八間房都在使用，等同學玩完再試。',disabled:'連線對戰暫時休息，晚一點再來。',slow_down:'按得太快了，請稍等一下再試。',device_active:'這個座號正在另一台平板玩。確定要換到這台嗎？',wrong_phase:'正在等同學，請稍等畫面更新。',answer_closed:'本題已收到作答或已結束，請等結果。',stale_command:'畫面已更新，請依目前題目繼續。',temporarily_unavailable:'網路還沒回覆，請稍後按重新連線。',ticket_invalid:'連線驗證過期，請按重新連線。',player_left:'同學先離開了，這場不發獎勵。',teacher_closed:'老師結束了這個房間。',room_expired:'等待時間到了，回首頁重新開房間。',disconnect_timeout:'等候連線逾時，這場未完成，可以重新找同學。',too_many_interruptions:'這場連線不穩，先檢查網路再開新房間。',audio_timeout:'聲音還沒播完，確認音量後一起繼續。'};
let identityReady=false;
let session=null,people=[],state=null,roomId='',ws=null,socketGeneration=0,reconnectTimer=null,attempts=0,stopped=false,offset=0,working=false,pinSeat='',pin='',pinBusy=false,audioKey='',playedKey='',lastPong=0,slowPings=0,audioBusy=false,audioGeneration=0;
messages.not_your_turn='現在是同學的回合，等畫面顯示你的名字再答題。';messages.inactivity='休息一下，兩人按繼續就可以再答題。';
function stopAudio(){audioGeneration++;audio.pause();audioBusy=false;}
try{const s=JSON.parse(sessionStorage.getItem(SESSION)||'null');if(s?.token&&s.expires>Date.now())session=s;}catch{}
let device;try{device=sessionStorage.getItem('zhuyin.online-device');if(!device){device=crypto.randomUUID();sessionStorage.setItem('zhuyin.online-device',device);}}catch{device=crypto.randomUUID();}
const audio=new Audio();audio.preload='auto';
function message(code,target='message'){$(target).textContent=messages[code]||code;}
function store(){try{if(session)sessionStorage.setItem(SESSION,JSON.stringify(session));else sessionStorage.removeItem(SESSION);}catch{}}
async function api(path,data={}){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);try{const r=await fetch(ENDPOINT+'/online/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify(data),signal:controller.signal});const out=await r.json();if(out.error)throw Error(out.error);return out;}catch(e){if(e.message==='login_required'){session=null;identityReady=false;store();disconnect();showLobby();}throw e;}finally{clearTimeout(timeout);}}
function showLobby(){$('create').disabled=!identityReady;$('join-show').disabled=!identityReady;state=null;roomId='';stopAudio();audioKey='';playedKey='';$('recover-room').hidden=true;$('room').hidden=true;$('lobby').hidden=!session;$('login').hidden=!!session;$('logout').hidden=!session;$('identity').textContent=session?session.seat+' 號・'+(session.name||'正在讀取角色…'):'先選自己的座號';if(session)$('my-character').src=avatar(session.avatar);}
function disconnect(){stopped=true;socketGeneration++;clearTimeout(reconnectTimer);if(ws){ws.onclose=null;ws.close();ws=null;}}
async function home(){if(roomId&&state&&!['closed','finished'].includes(state.phase)&&!confirm('離開會結束這一場，要回首頁嗎？'))return;try{if(roomId)await api('leave');disconnect();showLobby();message('');location.href='./';}catch(e){message(e.message);}}
$('home').onclick=home;$('leave').onclick=home;
$('logout').onclick=async()=>{if(roomId&&!confirm('換人會離開這場對戰，確定嗎？'))return;try{if(roomId)await api('leave');}catch{message('請先確認已離開房間，再換人登入。');return;}session=null;store();disconnect();location.href='./';};
function keypad(root,change){for(const key of ['1','2','3','4','5','6','7','8','9','clear','0','back']){const b=document.createElement('button');b.type='button';b.dataset.key=key;b.textContent=key==='clear'?'重填':key==='back'?'⌫':key;b.onclick=()=>change(key);root.append(b);}}
async function load(){if(!session){showLobby();return;}try{await restoreRoom();$('load-retry').hidden=true;}catch(e){message(messages[e.message]||'尚未連線，請按重新讀取。');$('load-retry').hidden=false;}}
$('load-retry').onclick=load;
async function restoreRoom(){const out=await api('me');identityReady=true;session={...session,...out.person};showLobby();$('recover-room').hidden=!out.current.room;if(out.current.room){$('recover-room').onclick=()=>enter(out.current.room);message('你還有一間房，可以按「回到剛剛的房間」。');}else $('recover-room').onclick=null;}
async function run(fn){if(working)return;working=true;try{await fn();}catch(e){message(messages[e.message]||'網路尚未確認，請稍後再試。');}finally{working=false;}}
$('create').onclick=()=>run(async()=>{const out=await api('create',{mode:document.querySelector('input[name="mode"]:checked').value,lesson:document.querySelector('input[name="lesson"]:checked').value});await enter(out.room);});
$('join-show').onclick=()=>{$('join-code').value='';message('','join-error');$('join-dialog').showModal();};$('join-close').onclick=()=>$('join-dialog').close();
keypad($('join-pad'),key=>{const input=$('join-code');input.value=key==='clear'?'':key==='back'?input.value.slice(0,-1):(input.value+key).slice(0,4);});$('join-code').oninput=()=>$('join-code').value=$('join-code').value.replace(/\D/g,'').slice(0,4);
$('join').onclick=async()=>{if(working)return;const code=$('join-code').value;if(!/^\d{4}$/.test(code)){message('請輸入同學的四位房號。','join-error');return;}working=true;$('join').disabled=true;try{const out=await api('join',{code});$('join-dialog').close();await enter(out.room);}catch(e){message(messages[e.message]||'連線還沒回覆，稍後再試。','join-error');}finally{working=false;$('join').disabled=false;}};
async function enter(id){disconnect();roomId=id;state=null;stopped=false;attempts=0;$('login').hidden=true;$('lobby').hidden=true;$('room').hidden=false;$('people').replaceChildren();$('phase-title').textContent='正在找同學…';$('question').hidden=true;$('action').hidden=true;$('result-answer').textContent='';$('summary').textContent='';message('');await connect();}
async function connect(takeover=false){if(!roomId||!session||document.hidden)return;const gen=++socketGeneration;stopped=false;$('connection').textContent='📶 正在連線…';$('reconnect').hidden=true;$('takeover').hidden=true;
 try{const out=await api('ticket',{room:roomId,device});if(gen!==socketGeneration)return;const socket=new WebSocket(ENDPOINT.replace(/^http/,'ws')+'/online/socket?room='+encodeURIComponent(roomId));if(ws){ws.onclose=null;ws.close();}ws=socket;
 socket.onopen=()=>socket.send(JSON.stringify({type:'auth',ticket:out.ticket,takeover}));
 socket.onmessage=event=>{if(gen!==socketGeneration)return;let d;try{d=JSON.parse(event.data);}catch{return;}
  if(d.type==='welcome'){attempts=0;lastPong=Date.now();$('connection').textContent='🟢 已連線';$('reconnect').hidden=true;}
  if(d.type==='state'){if(state?.matchId===d.state.matchId&&state.seq>d.state.seq)return;state=d.state;offset=state.serverNow-Date.now();render();}
  if(d.type==='pong'){lastPong=Date.now();const rtt=Date.now()-d.sent;slowPings=rtt>1500?slowPings+1:0;if(slowPings>=2&&state&&['audio','answer','countdown'].includes(state.phase)){send('pause');message('網路比較慢，先暫停，確認連線後再一起繼續。');slowPings=0;}}
  if(d.type==='replaced'){disconnect();message('這個座號已換到另一台平板，本台停止作答。');$('reconnect').hidden=false;}
  if(d.type==='error'){message(messages[d.code]||'畫面正在更新，請稍後再試。');if(d.code==='device_active'){stopped=true;$('takeover').hidden=false;}if(d.code==='login_required'){session=null;identityReady=false;store();disconnect();showLobby();}if(state&&['answer_closed','wrong_phase','stale_command'].includes(d.code))render();}
 };
 socket.onclose=()=>{if(gen!==socketGeneration||stopped)return;stopAudio();$('connection').textContent='🟠 連線中斷';disableAnswers();retry();};socket.onerror=()=>{$('connection').textContent='🟠 等待網路';};
 }catch(e){if(gen!==socketGeneration)return;message(messages[e.message]||'網路還沒連上。');if(['room_missing','room_closed'].includes(e.message)){$('reconnect').hidden=false;return;}retry();}}
function retry(){if(stopped||!roomId||!session)return;$('reconnect').hidden=false;if(++attempts>6||document.hidden)return;clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>connect(),Math.min(500*2**(attempts-1),5000));}
$('reconnect').onclick=()=>{attempts=0;connect();};$('takeover').onclick=()=>connect(true);
function send(kind,value){if(!state||ws?.readyState!==1){message('請先按重新連線。');return;}const d={protocolVersion:1,id:crypto.randomUUID(),kind,matchId:state.matchId,version:state.version,questionId:state.question?.id,...(value!==undefined?{value}:{})};ws.send(JSON.stringify(d));return d.id;}
function disableAnswers(){$('choices').querySelectorAll('button').forEach(b=>b.disabled=true);}
async function unlock(){stopAudio();try{audio.muted=true;audio.src='audio/audio_F1.WAV';await audio.play();audio.pause();}catch{}finally{audio.muted=false;}}
function showAction(label,kind,disabled=false){$('action').hidden=false;$('action').textContent=label;$('action').disabled=disabled;$('action').onclick=async()=>{if(['ready','resume','turn_start'].includes(kind))await unlock();$('action').disabled=true;send(kind);};}
function render(){if(!state)return;const s=state,i=s.me,turn=s.mode==='turn',mine=!turn||i===s.activePlayer,total=s.total||10,active=s.players[s.activePlayer],questionPhase=['turn_ready','audio','countdown','answer'].includes(s.phase);$('room-code').textContent=s.code;$('room-mode').textContent=(s.lesson==='spelling'?'拼音工坊 · ':'聽音辨識 · ')+(turn?'🤝 輪流答題':'⚡ 搶答對戰');$('people').replaceChildren();
 for(let j=0;j<2;j++){const p=s.players[j],box=document.createElement('div');box.className='person'+(turn&&questionPhase&&j===s.activePlayer?' active-turn':'');const img=document.createElement('img');img.src=avatar(p?.avatar);img.alt='';const text=document.createElement('div'),name=document.createElement('h3'),status=document.createElement('p');name.textContent=p?(j===i?'我：':'同學：')+p.seat+' 號・'+p.name:'等同學加入';status.textContent=p?(p.online?(turn&&questionPhase?(j===s.activePlayer?'👉 現在輪到這位':'👀 等一下，幫同學加油'):'🟢 已連線'):'🟠 等待連線'):'';text.append(name,status);const score=document.createElement('strong');score.className='score';score.textContent='★ '+s.scores[j];box.append(img,text,score);$('people').append(box);}
 $('action').hidden=true;$('summary').textContent='';$('result-answer').textContent='';$('question').hidden=!['audio','countdown','answer'].includes(s.phase);$('progress').textContent=s.index<total&&!['waiting','ready'].includes(s.phase)?(turn?'每人第 '+(Math.floor(s.index/2)+1)+' / 10 題':'第 '+(s.index+1)+' / 10 題'):'';
 const titles={waiting:'🏠 告訴同學這個房號',ready:'👋 是這位同學嗎？',audio:'👂 兩個人一起聽',countdown:'準備搶答！',answer:'⚡ 選出聽到的注音',result:'✨ 這一題的結果',paused:'⏸ 等同學，一起繼續',finished:'🎉 一起完成了！',closed:'🏡 這個房間已結束'};
 $('phase-title').textContent=titles[s.phase]||'';$('phase-detail').textContent=s.phase==='waiting'?'請同學按「找同學」，輸入上方四位房號。':s.phase==='ready'?'看清楚名字和角色，兩個人都按準備才會開始。':s.phase==='paused'?(messages[s.reason]||'有人暫停或斷線了。連回來後，兩個人都按繼續。'):s.phase==='closed'?(messages[s.reason]||'回首頁再找同學。'):'';
 if(turn&&questionPhase){$('phase-title').textContent=mine?'👉 輪到你了！':'👀 輪到 '+active.seat+' 號・'+active.name;$('phase-detail').textContent=mine?'不用搶快，可以按喇叭再聽一次。':'這題由同學作答，你可以聽題目、幫同學加油。';}
 if(s.phase==='turn_ready'){stopAudio();showAction(mine?'🙋 換我了，開始答題':'👀 等同學按「換我了」','turn_start',!mine||s.players.some(p=>!p.online));}
 if(s.phase==='ready')showAction(s.ready[i]?'✅ 我準備好了，等同學':'就是這位同學！我準備好了','ready',s.ready[i]||s.players.some(p=>!p.online));
 if(s.phase==='paused'){stopAudio();audioKey='';showAction(s.resume[i]?'✅ 等同學一起繼續':'🔊 連好了，一起繼續','resume',s.resume[i]||s.players.some(p=>!p.online));}
 if(s.question&&['audio','countdown','answer'].includes(s.phase)){
  const key=s.matchId+':'+s.version+':'+s.question.id;
  if($('choices').dataset.key!==key){$('choices').dataset.key=key;$('choices').replaceChildren();for(const value of s.question.choices||[]){const b=document.createElement('button');b.textContent=value;b.dataset.value=value;b.onclick=()=>{disableAnswers();b.classList.add('selected');send('answer',value);};$('choices').append(b);}}
  $('listen').disabled=audioBusy||ws?.readyState!==1;$('audio-status').textContent=audioBusy?'👂 仔細聽…':s.phase==='audio'?(s.heard[i]?'✅ 聽完了，等同學一起開始。':'聽完題目，才能開始作答。'):turn?(s.turnErrors&&mine?'再聽、再試一次，答對就可以換人。':'需要的話，可以再聽一次。'):'可以重播；只在自己的裝置播放，搶答倒數照常。';
  if(s.phase==='audio'&&audioKey!==key&&!s.heard[i]&&mine){audioKey=key;playedKey=key;playQuestion();}
  if(s.question.tiles)renderSpelling(s,key,mine);
  const allow=s.phase==='answer'&&!s.submitted&&ws?.readyState===1&&mine;for(const b of $('choices').querySelectorAll('button[data-value]')){const wrong=turn&&(s.wrongChoices||[]).includes(b.dataset.value);b.disabled=!allow||wrong;b.classList.toggle('wrong',wrong);}
 }
 if(s.phase==='result'){stopAudio();$('result-answer').textContent='正確答案：'+s.result.target;const points=s.result.points;$('phase-detail').textContent=points.every(Boolean)?'🤝 幾乎同時答對，兩人各得 1 分！':points.some(Boolean)?s.players[points.indexOf(1)].name+' 第一次就答對，得 1 分！':turn?'再試後答對了！這題不加分，繼續加油。':'一起記住這個聲音，下題再試！';showAction(s.next[i]?'✅ 等同學':turn?'換下一位 ➜':'下一題 ➜','next',s.next[i]);}
 if(s.phase==='finished'){stopAudio();const mine=s.scores[i],other=s.scores[1-i];$('summary').textContent=(mine===other?'🤝 平手，一起完成！':mine>other?'🏆 你贏得這一場！':'🌟 很棒的練習，下次再挑戰！')+' '+mine+'：'+other+'。'+(s.settled?'已保存，獲得 '+(s.awards?.[i]?.stars??(mine>other?2:1))+' 顆星星。':'正在保存結果，請稍候…');showAction(s.rematch[i]?'✅ 等同學同意再來一場':'再來一場！','rematch',!s.settled||s.rematch[i]);}
 if(s.phase==='closed'){stopAudio();stopped=true;$('action').hidden=false;$('action').textContent='回首頁';$('action').disabled=false;$('action').onclick=home;}
}
async function playQuestion(){if(!state?.question||!['audio','countdown','answer'].includes(state.phase)||audioBusy)return;const key=state.matchId+':'+state.version+':'+state.question.id,gen=++audioGeneration;playedKey=key;audioBusy=true;$('listen').disabled=true;audio.src=audioSource(state.question.audio);
 const current=()=>gen===audioGeneration&&state?.question&&key===state.matchId+':'+state.version+':'+state.question.id;
 audio.onended=()=>{if(!current())return;audioBusy=false;if(state.phase==='audio'&&!state.heard[state.me]&&(state.mode!=='turn'||state.me===state.activePlayer))send('heard');render();};
 const failed=()=>{if(!current())return;audioBusy=false;render();$('audio-status').textContent='聲音還沒播出來，請再按一次喇叭並確認音量與網路。';};audio.onerror=failed;
 try{await audio.play();if(current())$('audio-status').textContent='👂 仔細聽…';}catch{failed();}}
$('listen').onclick=playQuestion;
setInterval(()=>{if(ws?.readyState===1&&!stopped){ws.send(JSON.stringify({type:'ping',sent:Date.now()}));if(lastPong&&Date.now()-lastPong>15000){disableAnswers();ws.close();}}},5000);
setInterval(()=>{if(state?.phase==='countdown')$('phase-title').textContent='準備… '+Math.max(0,Math.ceil((state.openAt-Date.now()-offset)/1000));if(state?.phase==='answer'&&state.mode!=='turn')$('progress').textContent='第 '+(state.index+1)+' / 10 題・剩 '+Math.max(0,Math.ceil((state.deadline-Date.now()-offset)/1000))+' 秒';},150);
document.addEventListener('visibilitychange',()=>{if(!roomId)return;if(document.hidden){if(state&&['turn_ready','audio','answer','countdown','result'].includes(state.phase))send('pause');stopAudio();if(ws)ws.close();}else if(!stopped){attempts=0;connect();}});
for(const key of ['mode','lesson']){const value=new URLSearchParams(location.search).get(key);const radio=[...document.querySelectorAll('input[name="'+key+'"]')].find(r=>r.value===value);if(radio)radio.checked=true;}
showLobby();load();
messages.scope_small='這個關卡至少要有兩種已教聲音，請老師確認範圍。';
messages.spelling_unavailable='拼音工坊還沒開放，請先選聽音辨識。';
let spellingSelection={},spellingKey='';
function renderSpelling(s,key,mine){
 if(spellingKey!==key){spellingKey=key;spellingSelection={};}
 const root=$('choices');root.replaceChildren();root.classList.add('spelling-choices');
 const allowed=s.phase==='answer'&&!s.submitted&&ws?.readyState===1&&mine;
 const slots=document.createElement('div');slots.className='spelling-slots';
 for(const kind of ['initial','final']){
  const b=document.createElement('button');b.textContent=spellingSelection[kind]||(kind==='initial'?'聲符':'韻符');b.disabled=!allowed;b.onclick=()=>{delete spellingSelection[kind];render();};slots.append(b);
 }
 const tone=document.createElement('span');tone.textContent=s.question.toneMark||'';tone.className='tone';slots.append(tone);root.append(slots);
 for(const kind of ['initial','final']){
  const row=document.createElement('div');row.className='tile-row';
  for(const value of s.question.tiles[kind]){const b=document.createElement('button');b.textContent=value;b.dataset.tile=kind;b.setAttribute('aria-label',value);b.classList.toggle('selected',spellingSelection[kind]===value);b.disabled=!allowed;b.onclick=()=>{spellingSelection[kind]=value;render();};row.append(b);}root.append(row);
 }
 const check=document.createElement('button'),value=(spellingSelection.initial||'')+(spellingSelection.final||'');check.className='primary';check.textContent='✓ 拼好了！';check.disabled=!allowed||!spellingSelection.initial||!spellingSelection.final||(s.wrongChoices||[]).includes(value);check.onclick=()=>{disableAnswers();send('answer',value);};root.append(check);
}
