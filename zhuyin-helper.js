import {INITIALS, FINALS, TONES, displaySound, createSoundIndex, boardQuestion, createWordLookup} from './helper-core.js?v=20261022-common1';
import {createHelperPlayer} from './helper-player.js?v=20261020-preview1';
import {tutorClips} from './little-teacher.js?v=20261020-bo1';
import {audioSource} from './audio-source.js?v=20261020-bo1';
import {symbolPage, symbolPageSize, resizeSymbolPage} from './helper-pagination.js?v=20261022-pages1';
import {HELPER_EXAMPLES} from './helper-examples.js?v=20261022-common1';

const $ = id => document.getElementById(id);
const state = {initial: '', final: '', tone: 1, kind: 'initial'};
const trayPages = {initial: 0, final: 0, tone: 0};
const narrowTray = matchMedia('(max-width: 900px)');
let pageSize = symbolPageSize(innerWidth);
let index, lookup, lookupJob = 0, playbackJob = 0, currentWord = null, recognition = null, micTimer;
let readyPromise, dictionaryPromise;
const voice = new Audio();
voice.preload = 'none';
const player = createHelperPlayer(voice, {
  resolve: audioSource,
  onStep: step => document.querySelectorAll('.word-card').forEach((card, i) =>
    card.classList.toggle('speaking', step.wordIndex === i))
});

async function json(path) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, {signal: controller.signal});
    if (!response.ok) throw new Error('資料還沒準備好');
    return await response.json();
  } finally { clearTimeout(timer); }
}
function ready() {
  return readyPromise ||= json('./data/syllables.json?v=20261018-teacher1').then(rows => {
    index = createSoundIndex(rows); updateBoard(); return index;
  }).catch(error => { readyPromise = null; throw error; });
}
function dictionary() {
  return dictionaryPromise ||= Promise.all([
    import('./reading-pronunciation-data.js?v=20260930-sound1'),
    json('./tone-questions.json?v=20261011-teacher1')
  ]).then(([data, bank]) => {
    lookup = createWordLookup(data.PRONUNCIATIONS, data.PRONUNCIATION_SYLLABLES, bank.questions);
  }).catch(error => { dictionaryPromise = null; throw error; });
}
function stopAudio() {
  playbackJob++; player.stop();
  for (const id of ['lookup-status', 'board-status'])
    if ($(id).textContent === '🔊 老師正在拼讀…') $(id).textContent = '點喇叭，再聽一次。';
  document.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
}
function cancelLookup() {
  lookupJob++;
  if ($('lookup-status').textContent === '查注音中…')
    $('lookup-status').textContent = '查詢已暫停，請再按「查注音」。';
}
function stopMic() {
  clearTimeout(micTimer);
  const old = recognition; recognition = null;
  old?.abort();
  if (old) $('mic-status').textContent = '收音已停止，可確認國字或重新說話。';
  $('mic').textContent = '🎤 開始說話'; $('mic').classList.remove('recording');
}
async function playQuestions(questions, status, highlight = false) {
  stopMic(); stopAudio();
  const job = playbackJob;
  try {
    const steps = questions.flatMap((q, wordIndex) => {
      const clips = q.initial && q.final ? tutorClips(q) : [q.audio];
      return clips.map((src, i) => ({src, wordIndex: highlight ? wordIndex : -1,
        gap: i === clips.length - 1 ? 300 : clips.length === 3 && i === 0 ? 90 : 150}));
    });
    status.textContent = '🔊 老師正在拼讀…';
    if (await player.play(steps)) status.textContent = '還想聽一次？再點喇叭。';
  } catch {
    if (job === playbackJob) status.textContent = '聲音沒播出來，請再點一次喇叭。';
  } finally {
    if (job === playbackJob) document.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
  }
}
function updateBoard() {
  document.querySelector('[data-slot=initial] strong').textContent = state.initial || '＋';
  document.querySelector('[data-slot=final] strong').textContent = state.final || '＋';
  document.querySelector('[data-slot=tone] strong').textContent = state.tone === 1 ? '一聲' : TONES[state.tone];
  const q = index && boardQuestion(index, state.initial, state.final, state.tone);
  $('board-play').disabled = !q;
  $('board-status').textContent = !index ? '資料還沒載入，請點「重新載入」。'
    : !state.initial && !state.final ? '先選注音，再選聲調。'
    : q ? `拼好了：${displaySound(q.displayLabel)}`
    : '這個組合沒有可用錄音，請檢查注音和聲調。';
}
function choose(kind, value) {
  cancelLookup(); stopMic(); stopAudio();
  state[kind] = kind === 'tone' ? Number(value) : value;
  updateBoard();
  showTray(kind === 'initial' ? 'final' : kind === 'final' ? 'tone' : 'tone');
}
function showTray(kind) {
  state.kind = kind;
  document.querySelectorAll('.tabs [data-kind]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.kind === kind)));
  document.querySelectorAll('[data-slot]').forEach(b => b.classList.toggle('active', b.dataset.slot === kind));
  const tray = $('symbol-tray');
  tray.dataset.kind = kind;
  tray.replaceChildren(); tray.setAttribute('aria-labelledby', 'tab-' + kind);
  const {page, count, values} = symbolPage(kind, trayPages[kind], pageSize);
  trayPages[kind] = page;
  $('symbols-prev').disabled = page === 0;
  $('symbols-next').disabled = page === count - 1;
  $('symbols-page').textContent = `${page + 1} / ${count}`;
  $('symbols-page').setAttribute('aria-label', `第 ${page + 1} 組，共 ${count} 組`);
  for (const value of values) {
    const button = document.createElement('button');
    button.textContent = kind === 'tone' ? ['','一聲','ˊ 二聲','ˇ 三聲','ˋ 四聲','˙ 輕聲'][value] : value || '空白';
    button.className = kind === 'tone' ? 'tone-choice' : !value ? 'blank' : value.length > 1 ? 'compound' : '';
    button.setAttribute('aria-pressed', String(state[kind] === value));
    // Pointer events work for mouse and iPad fingers, without requiring HTML drag support.
    button.draggable = false;
    let origin = null, dragged = false, suppressClick = false;
    button.onclick = () => {
      if (suppressClick) { suppressClick = false; return; }
      choose(kind, value);
    };
    const clearDrop = () => document.querySelectorAll('.slot.drop').forEach(slot => slot.classList.remove('drop'));
    button.onpointerdown = event => {
      if (event.button !== 0) return;
      origin = {id:event.pointerId, x:event.clientX, y:event.clientY};
      dragged = false; suppressClick = false;
      button.setPointerCapture(event.pointerId);
    };
    button.onpointermove = event => {
      if (!origin || event.pointerId !== origin.id) return;
      if (Math.hypot(event.clientX-origin.x, event.clientY-origin.y) > 9) dragged = true;
      if (!dragged) return;
      clearDrop();
      const slot = document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-slot]');
      if (slot?.dataset.slot === kind) slot.classList.add('drop');
    };
    button.onpointerup = event => {
      if (!origin || event.pointerId !== origin.id) return;
      origin = null; clearDrop();
      if (!dragged) return;
      suppressClick = true;
      const slot = document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-slot]');
      if (slot?.dataset.slot === kind) choose(kind,value);
    };
    button.onpointercancel = () => { origin = null; suppressClick = true; clearDrop(); };
    tray.append(button);
  }
}
function turnTrayPage(delta) { trayPages[state.kind] += delta; showTray(state.kind); }
$('symbols-prev').onclick = () => turnTrayPage(-1);
$('symbols-next').onclick = () => turnTrayPage(1);
narrowTray.addEventListener('change', () => {
  const nextSize = symbolPageSize(innerWidth);
  for (const kind of Object.keys(trayPages)) trayPages[kind] = resizeSymbolPage(trayPages[kind], pageSize, nextSize);
  pageSize = nextSize;
  showTray(state.kind);
});
document.querySelectorAll('.tabs [data-kind]').forEach(b => b.onclick = () => showTray(b.dataset.kind));
document.querySelectorAll('[data-slot]').forEach(b => {
  b.onclick = () => showTray(b.dataset.slot);
  b.ondragover = e => { e.preventDefault(); b.classList.add('drop'); };
  b.ondragleave = () => b.classList.remove('drop');
  b.ondrop = e => {
    e.preventDefault(); b.classList.remove('drop');
    try {
      const {kind, value} = JSON.parse(e.dataTransfer.getData('application/x-zhuyin-helper'));
      const valid = kind === 'initial' ? ['', ...INITIALS].includes(value)
        : kind === 'final' ? ['', ...FINALS].includes(value) : kind === 'tone' && [1,2,3,4,5].includes(value);
      if (kind === b.dataset.slot && valid) choose(kind, value);
    } catch { /* Ignore unrelated dragged content. */ }
  };
});
$('clear').onclick = () => {
  cancelLookup(); stopMic(); stopAudio(); Object.assign(state, {initial:'', final:'', tone:1});
  Object.assign(trayPages, {initial:0, final:0, tone:0}); updateBoard(); showTray('initial');
};
$('board-play').onclick = () => {
  cancelLookup();
  const q = index && boardQuestion(index, state.initial, state.final, state.tone);
  if (q) playQuestions([q], $('board-status'));
};
function renderWord(text, sounds, autoPlay = true) {
  stopAudio(); currentWord = null; $('word-play').hidden = true;
  $('word-result').replaceChildren();
  const questions = sounds.map(sound => index.get(sound));
  Array.from(text).forEach((char, i) => {
    const card = document.createElement('div'), han = document.createElement('span'), phonetic = document.createElement('span');
    card.className = 'word-card'; han.className = 'han'; phonetic.className = 'phonetic';
    han.textContent = char; phonetic.textContent = displaySound(sounds[i]);
    card.append(han, phonetic); $('word-result').append(card);
  });
  if (questions.some(q => !q)) {
    $('lookup-status').textContent = '注音查到了，這個詞還缺部分老師錄音。'; return;
  }
  currentWord = questions; $('word-play').hidden = false;
  $('lookup-status').textContent = '點喇叭，聽老師慢慢拼。';
  if (autoPlay) playQuestions(questions, $('lookup-status'), true);
}
async function search() {
  const job = ++lookupJob, text = $('word').value;
  stopMic(); stopAudio(); currentWord = null;
  $('word-result').replaceChildren(); $('variants').replaceChildren(); $('word-play').hidden = true;
  $('alternative-readings').hidden = true; $('alternative-readings').open = false;
  $('lookup-status').textContent = '查注音中…';
  try {
    await Promise.all([ready(), dictionary()]);
    if (job !== lookupJob) return;
    const result = lookup(text);
    if (result.error) { $('lookup-status').textContent = result.error; return; }
    if (result.choices.length === 1 || result.preferred) renderWord(result.text, result.choices[0]);
    if (result.choices.length === 1) return;
    $('alternative-readings').hidden = false;
    if (!result.preferred) {
      $('lookup-status').textContent = '這個詞有不同讀音，請和大人一起選。';
      $('alternative-readings').open = true;
    }
    for (const sounds of result.choices) {
      const button = document.createElement('button');
      button.textContent = sounds.map(displaySound).join(' ');
      button.onclick = () => renderWord(result.text, sounds);
      $('variants').append(button);
    }
  } catch {
    if (job === lookupJob) $('lookup-status').textContent = '資料載入較久，請再按一次「查注音」。';
  }
}
$('lookup-form').onsubmit = e => { e.preventDefault(); search(); };
function invalidateWord() {
  lookupJob++; stopAudio(); currentWord = null;
  $('word-play').hidden = true; $('word-result').replaceChildren(); $('variants').replaceChildren();
  $('alternative-readings').hidden = true;
  $('lookup-status').textContent = '確認國字後，按「查注音」。';
}
$('word').oninput = () => { stopMic(); invalidateWord(); };
for (const group of HELPER_EXAMPLES) {
  const heading=document.createElement('h3'), row=document.createElement('div');
  heading.textContent=group.focus; row.className='examples';
  for (const text of group.sentences) {
    const button=document.createElement('button'); button.textContent=text; button.dataset.word=text; row.append(button);
  }
  $('example-list').append(heading,row);
}
document.querySelectorAll('[data-word]').forEach(b => b.onclick = () => {
  $('word').value = b.dataset.word; $('example-details').open=false; search();
  $('lookup-form').scrollIntoView({block:'nearest'});
});
$('word-play').onclick = () => { if (currentWord) playQuestions(currentWord, $('lookup-status'), true); };
$('stop').onclick = () => {
  lookupJob++; stopAudio(); stopMic();
  $('lookup-status').textContent = '已停止播放。'; $('mic-status').textContent = '也可以直接打字查詢。';
  updateBoard();
};
const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
$('mic').disabled = !Recognition;
if (!Recognition) $('mic-status').textContent = '這個瀏覽器不支援收音辨識，可改用 Safari／Chrome，或直接打字。';
$('mic').onclick = () => {
  if (recognition) { recognition.stop(); $('mic-status').textContent = '正在整理你說的詞…'; return; }
  lookupJob++; stopAudio();
  const r = new Recognition(); recognition = r;
  r.lang = 'zh-TW'; r.continuous = false; r.interimResults = true; r.maxAlternatives = 1;
  let finalText = '', heard = false;
  $('mic').classList.add('recording'); $('mic').textContent = '⏹ 說完了';
  $('mic-status').textContent = '請說一個詞語…';
  r.onresult = event => {
    if (recognition !== r) return;
    const results = Array.from(event.results);
    const text = results.map(row => row[0]?.transcript || '').join('').trim();
    if (!text) return;
    heard = true; finalText = text;
    $('word').value = text; invalidateWord();
    $('mic-status').textContent = '聽到了！請確認國字，再按「查注音」。';
  };
  r.onerror = event => {
    if (recognition !== r) return;
    stopMic();
    $('mic-status').textContent = ['not-allowed','service-not-allowed'].includes(event.error)
      ? '麥克風未獲允許，可以在瀏覽器設定開啟，或直接打字。'
      : '這次沒有聽清楚，請再試一次，或直接打字。';
  };
  r.onend = () => {
    if (recognition !== r) return;
    clearTimeout(micTimer); recognition = null;
    $('mic').textContent = '🎤 開始說話'; $('mic').classList.remove('recording');
    if (heard && finalText) $('mic-status').textContent = '請確認國字，再按「查注音」。';
    else $('mic-status').textContent = '沒聽到詞語，再試一次吧。';
  };
  micTimer = setTimeout(() => {
    if (recognition !== r) return;
    stopMic(); $('mic-status').textContent = heard ? '請確認國字，再按「查注音」。' : '這次沒聽清楚，請再試一次。';
  }, 15000);
  try { r.start(); } catch { stopMic(); $('mic-status').textContent = '無法開始收音，請改用 Safari 或直接打字。'; }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) { lookupJob++; stopAudio(); stopMic(); } });
window.addEventListener('pagehide', () => { lookupJob++; stopAudio(); stopMic(); });
showTray('initial');
function prepare() {
  ready().catch(() => {
    $('board-status').textContent = '聲音資料還沒載入。';
    const retry = document.createElement('button'); retry.textContent = '重新載入';
    retry.onclick = () => { retry.remove(); prepare(); };
    $('board-status').append(' ', retry);
  });
}
prepare();
