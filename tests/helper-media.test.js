import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHelperSpeech} from '../helper-speech.js';

const original = readFileSync(new URL('../zhuyin-helper.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../zhuyin-helper.html', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
function fakeDOM() {
  const ids = new Map(), all = [], events = new Map();
  function element(tag = 'div') {
    const classes = new Set();
    const node = {
      tagName: tag.toUpperCase(), children: [], dataset: {}, attributes: {}, textContent: '',
      value: '', hidden: false, disabled: false, open: false,
      classList: {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle(name, force) { const enabled = force ?? !classes.has(name); enabled ? classes.add(name) : classes.delete(name); return enabled; }
      },
      set className(value) { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(name => classes.add(name)); },
      get className() { return [...classes].join(' '); },
      setAttribute(name, value) { this.attributes[name] = value; },
      append(...nodes) { this.children.push(...nodes); },
      replaceChildren(...nodes) { this.children = nodes; },
      scrollIntoView() {}, setPointerCapture() {}, remove() {},
      after(node) { this.afterNode = node; }
    };
    all.push(node); return node;
  }
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) ids.set(match[1], element());
  const slots = ['initial', 'final', 'tone'].map(kind => {
    const node = element('button'); node.dataset.slot = kind; node.classList.add('slot');
    node.strong = element('strong'); return node;
  });
  const tabs = ['initial', 'final', 'tone'].map(kind => {
    const node = ids.get('tab-' + kind); node.dataset.kind = kind; return node;
  });
  const examples = ['快樂', '學校', '銀行'].map(word => { const node = element('button'); node.dataset.word = word; return node; });
  const doc = {
    hidden: false,
    getElementById: id => { assert.ok(ids.has(id), 'Unknown fixture id ' + id); return ids.get(id); },
    createElement: element,
    addEventListener: (name, fn) => events.set(name, fn),
    querySelector(selector) {
      const match = selector.match(/^\[data-slot=(initial|final|tone)\] strong$/);
      if (match) return slots.find(node => node.dataset.slot === match[1]).strong;
      throw new Error('Unexpected selector ' + selector);
    },
    querySelectorAll(selector) {
      if (selector === '.tabs [data-kind]') return tabs;
      if (selector === '[data-slot]') return slots;
      if (selector === '[data-word]') return all.filter(node => node.dataset.word);
      if (selector === '[data-word], #variants button') return [...all.filter(node => node.dataset.word), ...ids.get('variants').children];
      if (selector === '.word-card') return ids.get('word-result').children.filter(node => node.classList.contains('word-card'));
      if (selector === '.speaking') return all.filter(node => node.classList.contains('speaking'));
      if (selector === '.slot.drop') return slots.filter(node => node.classList.contains('drop'));
      throw new Error('Unexpected selector ' + selector);
    }
  };
  return {doc, ids, all, slots, tabs, examples, events};
}

async function fixture({holdDictionary = false} = {}) {
  const dom = fakeDOM(), calls = [], instances = [], lookupCalls = [], reloads = [];
  let nextUnlock = null, nextSuspend = null, activePlay = null;
  const dictionary = deferred();
  if (!holdDictionary) dictionary.resolve({PRONUNCIATIONS: {}, PRONUNCIATION_SYLLABLES: {}});
  const questions = [
    {id: 'first', initial: 'ㄎ', final: 'ㄨㄞ', audio: 'whole-kuai.mp3', displayLabel: 'ㄎㄨㄞˋ'},
    {id: 'second', initial: 'ㄌ', final: 'ㄜ', audio: 'whole-le.mp3', displayLabel: 'ㄌㄜˋ'}
  ];
  const index = new Map([['ㄎㄨㄞˋ', questions[0]], ['ㄌㄜˋ', questions[1]]]);
  class Recognition {
    constructor() { instances.push(this); this.calls = []; }
    start() { this.calls.push('start'); }
    stop() { this.calls.push('stop'); }
    abort() { this.calls.push('abort'); }
  }
  const player = {
    unlock() { calls.push({kind: 'unlock'}); const promise = nextUnlock?.promise || Promise.resolve(); nextUnlock = null; return promise; },
    stop() { calls.push({kind: 'stop'}); if (activePlay) { activePlay.resolve(false); activePlay = null; } },
    suspend() { calls.push({kind: 'suspend'}); const promise = nextSuspend?.promise || Promise.resolve(); nextSuspend = null; return promise; },
    play(steps) { calls.push({kind: 'play', steps}); activePlay = deferred(); return activePlay.promise; }
  };
  const context = {
    console, URL, AbortController, setTimeout, clearTimeout, Promise, Map,
    document: dom.doc, window: {addEventListener() {}},
    location: {reload: () => reloads.push(true)}, innerWidth: 1024,
    matchMedia: () => ({matches: false, addEventListener() {}}),
    SpeechRecognition: Recognition,
    INITIALS: ['ㄎ'], FINALS: ['ㄨㄞ'], TONES: {1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙'},
    HELPER_EXAMPLES: [], displaySound: sound => sound,
    createHelperSpeech, createHelperWebAudioPlayer: () => player,
    audioSource: source => source, tutorClips: q => [q.initial + '.mp3', q.final + '.mp3', q.audio],
    createSoundIndex: () => index,
    boardQuestion: (rows, initial, final) => initial || final ? questions[0] : null,
    createWordLookup: () => text => { lookupCalls.push(text); return {text: '快樂', choices: [['ㄎㄨㄞˋ', 'ㄌㄜˋ']]}; },
    symbolPageSize: () => 12, resizeSymbolPage: () => 0,
    symbolPage: kind => ({page: 0, count: 1, values: kind === 'initial' ? ['ㄎ'] : kind === 'final' ? ['ㄨㄞ'] : [1, 4]}),
    fetch: async path => ({ok: true, json: async () => path.includes('tone-questions') ? {questions: []} : []}),
    loadDictionary: () => dictionary.promise
  };
  const source = original.replace(/^import\s+.*?;\s*$/gm, '')
    .replace(/import\('\.\/reading-pronunciation-data\.js\?v=[^']+'\)/g, 'loadDictionary()');
  const api = vm.runInNewContext('(function(){' + source + '\nreturn {search,choose,playQuestions,getSpeech:()=>speech};})()', context);
  await flush();
  const node = id => dom.ids.get(id);
  return {
    ...dom, api, calls, instances, lookupCalls, reloads, node, dictionary,
    async search() { node('word').value = '快樂'; node('lookup-form').onsubmit({preventDefault() {}}); await flush(); },
    holdUnlock() { return nextUnlock = deferred(); },
    holdSuspend() { return nextSuspend = deferred(); },
    finishAudio() { assert.ok(activePlay); const pending = activePlay; activePlay = null; pending.resolve(true); },
    failAudio() { assert.ok(activePlay); const pending = activePlay; activePlay = null; pending.reject(new Error('decode failure')); },
    async close() { node('stop').onclick(); const r = instances.at(-1); r?.onend?.(); await flush(); }
  };
}

test('mic stays disabled and guarded throughout dictionary preparation, playback, and context release', async () => {
  const f = await fixture({holdDictionary: true});
  try {
    await f.search();
    assert.equal(f.node('mic').disabled, true);
    f.node('mic').onclick(); assert.equal(f.instances.length, 0);
    f.dictionary.resolve({PRONUNCIATIONS: {}, PRONUNCIATION_SYLLABLES: {}}); await flush();
    assert.equal(f.calls.filter(call => call.kind === 'play').length, 1);
    assert.equal(f.node('mic').disabled, true); assert.equal(f.node('stop-audio').hidden, false);
    f.node('mic').onclick(); assert.equal(f.instances.length, 0);
    const released = f.holdSuspend(); f.finishAudio(); await flush();
    assert.equal(f.node('mic').disabled, true);
    f.node('mic').onclick(); assert.equal(f.instances.length, 0);
    released.resolve(); await flush();
    assert.equal(f.node('mic').disabled, false);
    f.node('mic').onclick(); assert.equal(f.instances.length, 1);
  } finally { await f.close(); }
});

test('recognition starting/listening/stopping disables playback and guards programmatic clicks', async () => {
  const f = await fixture();
  try {
    f.api.choose('initial', 'ㄎ'); await flush();
    f.node('mic').onclick(); const r = f.instances[0];
    const count = f.calls.length;
    for (const phase of ['starting', 'listening', 'stopping']) {
      if (phase === 'listening') r.onstart();
      if (phase === 'stopping') f.node('mic').onclick();
      assert.equal(f.api.getSpeech().state, phase);
      for (const id of ['lookup-submit', 'word-play', 'board-play']) assert.equal(f.node(id).disabled, true, phase + ': ' + id);
      f.node('board-play').onclick();
      f.node('lookup-form').onsubmit({preventDefault() {}});
      await flush(); assert.equal(f.calls.length, count, 'no audio operation while ' + phase);
    }
    r.onend(); await flush(); assert.equal(f.node('lookup-submit').disabled, false);
  } finally { await f.close(); }
});

test('interim recognition only updates text: no player stop, suspend, unlock, or play', async () => {
  const f = await fixture();
  try {
    f.node('mic').onclick(); const r = f.instances[0]; r.onstart();
    const count = f.calls.length;
    r.onresult({results: [[{transcript: '快'}]]});
    r.onresult({results: [[{transcript: '快樂'}]]});
    assert.equal(f.node('word').value, '快樂');
    assert.equal(f.calls.length, count);
    assert.equal(f.node('lookup-submit').disabled, true);
    r.onend(); await flush();
    assert.equal(f.node('word').value, '快樂'); assert.equal(f.node('lookup-submit').disabled, false);
  } finally { await f.close(); }
});

test('global stop cancels speech but leaves media locked until real end and audio release', async () => {
  const f = await fixture();
  try {
    f.node('mic').onclick(); const r = f.instances[0]; r.onstart();
    const released = f.holdSuspend(); f.node('stop').onclick();
    assert.equal(f.api.getSpeech().state, 'stopping'); assert.equal(r.calls.at(-1), 'abort');
    f.node('mic').onclick(); assert.equal(f.instances.length, 1);
    assert.equal(f.node('lookup-submit').disabled, true);
    released.resolve(); await flush();
    assert.equal(f.node('lookup-submit').disabled, true); assert.equal(f.node('mic').disabled, true);
    r.onend(); await flush();
    assert.equal(f.node('lookup-submit').disabled, false); assert.equal(f.node('mic').disabled, false);
  } finally { await f.close(); }
});

test('stale async dictionary completion after stop cannot render or play', async () => {
  const f = await fixture({holdDictionary: true});
  try {
    await f.search(); f.node('stop-audio').onclick(); await flush();
    f.dictionary.resolve({PRONUNCIATIONS: {}, PRONUNCIATION_SYLLABLES: {}}); await flush();
    assert.equal(f.calls.some(call => call.kind === 'play'), false);
    assert.equal(f.lookupCalls.length, 0);
    assert.equal(f.node('word-result').children.length, 0);
    assert.equal(f.node('mic').disabled, false);
  } finally { await f.close(); }
});

test('normal lookup plays the full multi-character sequence with correct component order', async () => {
  const f = await fixture();
  try {
    await f.search();
    const played = f.calls.find(call => call.kind === 'play'); assert.ok(played);
    assert.deepEqual(Array.from(played.steps, step => step.src), [
      'ㄎ.mp3', 'ㄨㄞ.mp3', 'whole-kuai.mp3', 'ㄌ.mp3', 'ㄜ.mp3', 'whole-le.mp3'
    ]);
    assert.deepEqual(Array.from(played.steps, step => step.gap), [90, 150, 300, 90, 150, 300]);
    assert.equal(f.node('word-result').children.length, 2);
    f.finishAudio(); await flush();
    assert.match(f.node('lookup-status').textContent, /再點喇叭/);
    assert.equal(f.node('mic').disabled, false);
  } finally { await f.close(); }
});

test('unlock rejection shows a retry message and releases controls without playing', async () => {
  const f = await fixture();
  try {
    const unlock = f.holdUnlock(); await f.search();
    assert.equal(f.node('mic').disabled, true);
    unlock.reject(new Error('not allowed')); await flush();
    assert.equal(f.calls.some(call => call.kind === 'play'), false);
    assert.match(f.node('lookup-status').textContent, /再點一次喇叭/);
    assert.equal(f.node('mic').disabled, false); assert.equal(f.node('word-play').disabled, false);
  } finally { await f.close(); }
});

test('playback failure leaves a usable retry and no false permanent lock', async () => {
  const f = await fixture();
  try {
    await f.search(); f.failAudio(); await flush();
    assert.match(f.node('lookup-status').textContent, /再點一次喇叭/);
    assert.equal(f.node('mic').disabled, false); assert.equal(f.node('word-play').disabled, false);
    f.node('word-play').onclick(); await flush();
    assert.equal(f.calls.filter(call => call.kind === 'play').length, 2);
    f.finishAudio(); await flush(); assert.equal(f.node('mic').disabled, false);
  } finally { await f.close(); }
});

test('context release failure blocks new mic/audio and exposes reload, rather than false recovery', async () => {
  const f = await fixture();
  try {
    await f.search(); const released = f.holdSuspend(); f.finishAudio(); await flush();
    released.reject(new Error('native audio stuck')); await flush();
    assert.equal(f.node('mic').disabled, true); assert.equal(f.node('lookup-submit').disabled, true);
    assert.equal(f.node('audio-reload').hidden, false);
    assert.match(f.node('mic-status').textContent, /重新開啟/);
    f.node('mic').onclick(); assert.equal(f.instances.length, 0);
    f.node('audio-reload').onclick(); assert.equal(f.reloads.length, 1);
  } finally { await f.close(); }
});

test('typing cancels a pending lookup so its late dictionary cannot autoplay old text', async () => {
  const f = await fixture({holdDictionary: true});
  try {
    await f.search(); f.node('word').value = '新文字'; f.node('word').oninput(); await flush();
    f.dictionary.resolve({PRONUNCIATIONS: {}, PRONUNCIATION_SYLLABLES: {}}); await flush();
    assert.equal(f.calls.some(call => call.kind === 'play'), false);
    assert.equal(f.node('word').value, '新文字'); assert.equal(f.node('mic').disabled, false);
  } finally { await f.close(); }
});

test('synchronous native abort failure retains the reload hint after the global stop button', async () => {
  const f = await fixture();
  try {
    f.node('mic').onclick(); const r = f.instances[0]; r.onstart();
    r.abort = () => { throw new Error('native stop failed'); };
    f.node('stop').onclick(); await flush();
    assert.equal(f.api.getSpeech().state, 'blocked');
    assert.equal(f.node('audio-reload').hidden, false); assert.equal(f.node('mic').disabled, true);
    assert.match(f.node('mic-status').textContent, /重新整理|重新開啟/);
    const count = f.calls.length;
    f.node('lookup-form').onsubmit({preventDefault() {}}); await flush();
    assert.equal(f.calls.length, count);
  } finally { await f.close(); }
});
