import {Race} from './race-core.js?v=20260913-tutor1';
import {questionDeck,optionsFor} from './core.js?v=20260913-tutor1';
import {CHARACTERS,STARTERS,portrait} from './characters.js?v=20260913-heroes1';

const animals=CHARACTERS.map(c=>[c.emoji,c.name]);
const keys=[['a','s','d','f'],['h','j','k','l']];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createMultiplayer({onExit,onFinish,getOwned,getSeats}){
 const $=id=>document.getElementById(id);
 let picked=[0,1],race=null,participants=[],pool=[],count=3,questionMode='single',running=false,generation=0,ready=[false,false];
 let turnCallback=null,roundStarted=0,questionStarted=0,currentOptions=[];
 const sound=new Audio();sound.preload='auto';
 const picker=document.createElement('div');picker.id='animal-picker';picker.className='animal-picker';picker.hidden=true;
 document.querySelector('.setup').after(picker);
 const turn=document.createElement('dialog');turn.id='turn-gate';turn.innerHTML='<div id="turn-gate-content"></div>';
 document.body.append(turn);
 const stage=document.createElement('main');stage.id='race-game';stage.hidden=true;
 stage.innerHTML=`<div class="game-top"><button id="race-leave" class="text-button">← 回島嶼</button><span id="race-progress"></span><button id="race-fullscreen" class="text-button">⛶ 全螢幕</button></div>
 <section class="race-cue"><button id="race-listen" class="listen" aria-label="重新播放搶答題目">♪<span>一起聽</span></button><div id="race-cue-symbol" class="cue-symbol" aria-live="polite">👂</div><p id="race-message" role="status"></p></section>
 <div id="race-arena" class="race-arena"></div><div class="race-next-row"><button id="race-next" class="primary" hidden>下一題 →</button></div>
 <p class="small race-rules">老師提示：先答對得 1 分；答錯的一方本題暫停。左右各有自己的選項。鍵盤左方 A S D F／右方 H J K L。</p>`;
 $('game').after(stage);
 const leave=document.createElement('dialog');leave.innerHTML='<h2>先結束這場比賽嗎？</h2><p>未完成的比賽不會記錄。</p><button class="primary" id="race-stay">繼續比賽</button> <button class="secondary" id="race-exit">離開</button>';
 document.body.append(leave);
 function character(i){return animals[picked[i]][0];}
 function teamMarkup(i){return `<span class="animal-face">${portrait(CHARACTERS[picked[i]])}</span><span>${i===0?'藍隊':'橘隊'} · ${escape(participants[i]||'')} 號</span>`;}
 function drawPicker(){
  const seats=getSeats?.()||[];for(let i=0;i<2;i++){const owned=getOwned?.(seats[i])||STARTERS;if(!owned.includes(CHARACTERS[picked[i]].id)||picked[i]===picked[1-i])picked[i]=CHARACTERS.findIndex((c,n)=>owned.includes(c.id)&&n!==picked[1-i]);}
  picker.innerHTML='<p>各選一隻小動物；藍隊在左邊，橘隊在右邊。</p><div class="animal-teams">'+[0,1].map(i=>`<section class="team-${i}"><h3>${i===0?'◀ 藍隊':'橘隊 ▶'}</h3><div class="animal-choices">${animals.map(([emoji,name],n)=>`<button data-player="${i}" data-animal="${n}" aria-label="${i===0?'藍隊':'橘隊'}選${name}" aria-pressed="${picked[i]===n}" ${picked[1-i]===n||!(getOwned?.(seats[i])||STARTERS).includes(CHARACTERS[n].id)?'disabled':''}>${portrait(CHARACTERS[n])}</button>`).join('')}</div></section>`).join('')+'</div>';
  picker.querySelectorAll('[data-animal]').forEach(b=>b.onclick=()=>{picked[Number(b.dataset.player)]=Number(b.dataset.animal);drawPicker();});
 }
 drawPicker();
 function stop(){running=false;generation++;sound.pause();if(document.fullscreenElement===stage)document.exitFullscreen().catch(()=>{});stage.hidden=true;if(turn.open)turn.close();turnCallback=null;document.body.classList.remove('turn-team-0','turn-team-1','race-active');}
 function turnPrompt(i,seats,callback){participants=seats;turnCallback=callback;document.body.classList.remove('turn-team-0','turn-team-1');document.body.classList.add('turn-team-'+i);$('player-turn').innerHTML=`<div class="turn-banner team-${i}">${teamMarkup(i)}<b>▼</b></div>`;
  turn.className='team-'+i;$('turn-gate-content').innerHTML=`<button id="turn-ready" class="turn-ready" aria-label="${animals[picked[i]][1]}準備好了">${teamMarkup(i)}<strong>▶</strong></button><p>輪到這隻小動物！點牠開始。</p>`;
  $('turn-ready').onclick=()=>{turn.close();const cb=turnCallback;turnCallback=null;cb?.();};turn.showModal();
 }
 turn.addEventListener('cancel',e=>e.preventDefault());
 function lockButtons(){stage.querySelectorAll('[data-race-player]').forEach(b=>{b.disabled=!race?.open||race.resolved||!!race.attempts[Number(b.dataset.racePlayer)];});}
 async function playQuestion(){
  if(!running||!ready.every(Boolean)||race.resolved)return;
  const token=++generation;race.open=false;lockButtons();$('race-listen').disabled=true;$('race-cue-symbol').textContent='👂';$('race-message').textContent='👂 → ⚡';
  sound.onended=()=>{if(token!==generation||!running||race.resolved)return;race.listenFinished();questionStarted=Date.now();$('race-cue-symbol').textContent='⚡';$('race-message').textContent='';$('race-listen').disabled=false;lockButtons();};
  sound.onerror=()=>{if(token===generation&&running){race.open=false;lockButtons();$('race-listen').disabled=false;$('race-message').textContent='聲音暫時無法播放，請老師檢查連線，再按喇叭。';}};
  try{sound.currentTime=0;await sound.play();}catch{if(token===generation){$('race-listen').disabled=false;$('race-message').textContent='請按喇叭，兩人一起聽題目。';}}
 }
 function renderRaceQuestion(){
  const target=race.current;currentOptions=optionsFor(target,pool,count);sound.pause();sound.src=target.audio;
  $('race-progress').textContent=`${race.index+1} / ${race.deck.length}`;$('race-next').hidden=true;$('race-listen').disabled=!ready.every(Boolean);$('race-cue-symbol').textContent=ready.every(Boolean)?'👂':'👇';
  $('race-message').textContent=ready.every(Boolean)?'👂 → ⚡':'👇 🐾';
  $('race-arena').innerHTML=[0,1].map(i=>`<section class="race-panel team-${i}" aria-label="${i===0?'左方藍隊':'右方橘隊'}"><div class="race-player">${teamMarkup(i)}<strong id="race-score-${i}">🏁 ${race.scores[i]}</strong></div><div id="race-player-status-${i}" class="race-player-status"></div><div class="race-options">${currentOptions.map((q,n)=>`<button class="race-option" data-race-player="${i}" data-choice="${n}" disabled aria-label="${i===0?'藍隊':'橘隊'} ${escape(q.displayLabel||q.label)}"><span>${escape(q.label)}</span><small>${keys[i][n].toUpperCase()}</small></button>`).join('')}</div>${!ready[i]?`<button class="race-ready" data-ready="${i}" aria-label="${animals[picked[i]][1]}準備好了">${character(i)}<span>▶</span></button>`:''}</section>`).join('');
  stage.querySelectorAll('[data-ready]').forEach(b=>{b.innerHTML=portrait(CHARACTERS[picked[Number(b.dataset.ready)]])+'<span>▶</span>';b.onclick=()=>{const i=Number(b.dataset.ready);ready[i]=true;b.remove();$('race-player-status-'+i).textContent='✅';if(ready.every(Boolean))playQuestion();};});
  stage.querySelectorAll('[data-race-player]').forEach(b=>{
   const submit=()=>choose(Number(b.dataset.racePlayer),Number(b.dataset.choice));
   b.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();submit();};
   b.onclick=e=>{if(e.detail===0)submit();};
  });
  if(ready.every(Boolean))playQuestion();
 }
 function choose(player,index){
  if(!running||!currentOptions[index])return;const result=race.answer(player,currentOptions[index].label);if(result.ignored)return;
  $('race-player-status-'+player).textContent=result.correct?'🏁 +1':'⏸';$('race-listen').disabled=true;lockButtons();
  if(result.resolved){generation++;sound.pause();race.rows.at(-1).seconds=Math.max(0,Math.round((Date.now()-questionStarted)/1000));
   $('race-cue-symbol').textContent=result.winner===null?'🤝':character(result.winner)+' 🏁';
   $('race-message').textContent=`${result.winner===null?'🤝':'🏁'} ${(race.current.displayLabel||race.current.label)}`;
   [0,1].forEach(i=>$('race-score-'+i).textContent='🏁 '+race.scores[i]);
   stage.querySelectorAll('[data-choice]').forEach(b=>{if(currentOptions[Number(b.dataset.choice)].label===race.current.label)b.classList.add('race-correct');});
   $('race-next').textContent=race.index===race.deck.length-1?'🎉 →':'▶';$('race-next').hidden=false;$('race-listen').disabled=true;
  }
 }
 function finish(){
  const scores=[...race.scores],rows=race.rows;const winner=scores[0]===scores[1]?null:scores[0]>scores[1]?0:1;
  const payload={kind:'race',roundId:crypto.randomUUID(),seats:[...participants],mode:questionMode,total:rows.length,seconds:Math.round((Date.now()-roundStarted)/1000),results:rows};
  const html=`<h2>${winner===null?'🤝 一起完成比賽！':character(winner)+' 贏得比賽！'}</h2><div class="race-results">${[0,1].map(i=>`<section class="team-${i}">${teamMarkup(i)}<strong>🏁 ${scores[i]}</strong><p>${rows.filter(r=>r.attempts[i]&&!r.attempts[i].correct).length} 次答錯 · ${rows.filter(r=>!r.attempts[i]).length} 題未搶答</p></section>`).join('')}</div><p class="small">比賽分數獨立記錄，不算每日練習完成或全對。沒搶到不算答錯。</p>`;
  stop();onFinish(payload,html);
 }
 $('race-next').onclick=()=>{if(!running||!race.next())return;if(race.finished)finish();else renderRaceQuestion();};
 $('race-listen').onclick=()=>{if(race?.open&&race.attempts.some(Boolean))return;playQuestion();};
 $('race-leave').onclick=()=>leave.showModal();$('race-stay').onclick=()=>leave.close();$('race-exit').onclick=()=>{leave.close();stop();onExit();};
 $('race-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{$('race-message').textContent='此瀏覽器無法切換全螢幕；可使用大螢幕瀏覽器的全螢幕功能。';}};
 document.addEventListener('keydown',e=>{if(!running||leave.open||e.repeat||e.ctrlKey||e.altKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;for(let i=0;i<2;i++){const n=keys[i].indexOf(e.key.toLowerCase());if(n>=0){e.preventDefault();choose(i,n);return;}}});
 return {
  setStyle(style){picker.hidden=style==='solo';if(style==='solo')document.body.classList.remove('turn-team-0','turn-team-1');},
  character,turnPrompt,stop,refreshPicker:drawPicker,
  start({seats,mode,questionPool,questions,choices}){stop();participants=[...seats];questionMode=mode;pool=questionPool;count=choices;race=new Race(questionDeck(pool,questions));ready=[false,false];running=true;roundStarted=Date.now();['home','game','result'].forEach(id=>$(id).hidden=true);stage.hidden=false;document.body.classList.add('race-active');window.scrollTo(0,0);renderRaceQuestion();}
 };
}
