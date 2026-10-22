import test from 'node:test';
import assert from 'node:assert/strict';
import {createHelperWebAudioPlayer} from '../helper-web-audio.js';

const turn = () => new Promise(resolve => setImmediate(resolve));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
const bytes = text => new TextEncoder().encode(text).buffer;
const buffer = (name, length = 10, numberOfChannels = 1) => ({name, length, numberOfChannels, duration: 0.001});
const response = name => ({ok: true, arrayBuffer: async () => bytes(name)});

class FakeContext {
  state = 'suspended';
  destination = {};
  sources = [];
  events = [];
  listeners = new Set();
  resumeCalls = 0;
  suspendCalls = 0;
  activeSources = 0;
  maxActiveSources = 0;
  resume() {
    this.resumeCalls++;
    if (this.resumeHook) return this.resumeHook();
    this.setState('running');
    return Promise.resolve();
  }
  suspend() {
    this.suspendCalls++;
    if (this.suspendHook) return this.suspendHook();
    this.setState('suspended');
    return Promise.resolve();
  }
  addEventListener(type, callback) { assert.equal(type, 'statechange'); this.listeners.add(callback); }
  removeEventListener(type, callback) { this.listeners.delete(callback); }
  setState(state) { this.state = state; for (const callback of [...this.listeners]) callback(); }
  decodeAudioData(data) {
    const name = new TextDecoder().decode(data);
    this.events.push(['decode', name]);
    return this.decodeHook ? this.decodeHook(name) : Promise.resolve(buffer(name));
  }
  createBufferSource() {
    const context = this;
    const source = {
      onended: null, started: false, stopped: false, ended: false, disconnected: false,
      playbackRate: {value: 1}, detune: {value: 0},
      connect(destination) { assert.equal(destination, context.destination); },
      disconnect() { source.disconnected = true; },
      start() {
        source.started = true;
        context.events.push(['start', source.buffer.name]);
        context.activeSources++;
        context.maxActiveSources = Math.max(context.maxActiveSources, context.activeSources);
        if (context.startHook) context.startHook(source);
      },
      stop() {
        source.stopped = true;
        source.end();
      },
      end() {
        if (source.ended) return;
        source.ended = true;
        if (source.started) context.activeSources--;
        source.onended?.();
      }
    };
    this.sources.push(source);
    return source;
  }
}

function fixture(options = {}) {
  const ctx = new FakeContext(), fetched = [], signals = [];
  const player = createHelperWebAudioPlayer({
    contextFactory: () => ctx,
    fetcher: async (url, {signal}) => { fetched.push(url); signals.push(signal); return response(url); },
    timeoutMs: 200,
    ...options
  });
  return {ctx, player, fetched, signals};
}

async function complete(ctx, result) {
  await turn();
  ctx.sources.at(-1).end();
  assert.equal(await result, true);
}

test('unlock creates and resumes synchronously in the gesture, sharing an outstanding resume', async () => {
  const ctx = new FakeContext(), ready = deferred();
  let factories = 0;
  ctx.resumeHook = () => ready.promise;
  const p = createHelperWebAudioPlayer({contextFactory: () => { factories++; return ctx; }, timeoutMs: 200});
  const unlocked = p.unlock(), same = p.unlock();
  assert.equal(factories, 1);
  assert.equal(ctx.resumeCalls, 1);
  assert.equal(same, unlocked);
  ctx.setState('running'); ready.resolve();
  assert.equal(await unlocked, true);
});

test('failed or stuck resume never falsely reports that audio is unlocked', async () => {
  const {ctx, player} = fixture({timeoutMs: 12});
  ctx.resumeHook = () => Promise.resolve();
  await assert.rejects(player.unlock(), {code: 'AUDIO_NOT_RUNNING'});
  ctx.resumeHook = () => new Promise(() => {});
  await assert.rejects(player.unlock(), {code: 'AUDIO_RESUME_TIMEOUT'});
  ctx.resumeHook = null;
  assert.equal(await player.unlock(), true);
});

test('all unique clips decode before any playback, with at most three parallel loads', async () => {
  const pending = new Map(), fetched = [];
  const {ctx, player} = fixture({fetcher: (url, {signal}) => {
    assert.equal(signal.aborted, false);
    fetched.push(url);
    const d = deferred(); pending.set(url, d); return d.promise;
  }});
  const result = player.play(['a', 'b', 'a', 'c', 'd'].map(src => ({src})));
  await turn();
  assert.deepEqual(fetched, ['a', 'b', 'c']);
  assert.equal(ctx.sources.length, 0);
  pending.get('a').resolve(response('a')); await turn();
  assert.deepEqual(fetched, ['a', 'b', 'c', 'd']);
  pending.get('b').resolve(response('b')); pending.get('c').resolve(response('c'));
  await turn(); assert.equal(ctx.sources.length, 0);
  pending.get('d').resolve(response('d')); await turn();
  assert.deepEqual(ctx.events.filter(e => e[0] === 'decode').map(e => e[1]), ['a', 'b', 'c', 'd']);
  for (const name of ['a', 'b', 'a', 'c', 'd']) {
    assert.equal(ctx.sources.at(-1).buffer.name, name);
    ctx.sources.at(-1).end(); await turn();
  }
  assert.equal(await result, true);
  assert.equal(ctx.maxActiveSources, 1);
  assert.equal(ctx.listeners.size, 0);
});

test('resolved URLs, original step metadata and gaps remain ordered without pitch or speed changes', async () => {
  const seen = [], steps = [{src: 'a', wordIndex: 0, gap: 15}, {src: 'b', wordIndex: 1}];
  const {ctx, player, fetched} = fixture({resolve: src => `audio/${src}`, onStep: step => seen.push(step)});
  await player.unlock();
  const result = player.play(steps);
  await turn();
  assert.deepEqual(fetched, ['audio/a', 'audio/b']);
  assert.deepEqual(seen, [steps[0]]);
  ctx.sources[0].end(); await turn();
  assert.equal(ctx.sources.length, 1);
  await sleep(25);
  assert.deepEqual(seen, steps);
  assert.equal(ctx.sources[1].playbackRate.value, 1);
  assert.equal(ctx.sources[1].detune.value, 0);
  ctx.sources[1].end();
  assert.equal(await result, true);
});

test('stop cancels an active clip and its later segments immediately', async () => {
  const {ctx, player} = fixture();
  const result = player.play([{src: 'a'}, {src: 'b'}]);
  await turn(); player.stop();
  assert.equal(await result, false);
  assert.equal(ctx.sources.length, 1);
  assert.equal(ctx.sources[0].stopped, true);
  assert.equal(ctx.sources[0].disconnected, true);
  assert.equal(ctx.listeners.size, 0);
});

test('stop cancels a gap and cannot play the stale next clip', async () => {
  const {ctx, player} = fixture();
  const result = player.play([{src: 'a', gap: 30}, {src: 'b'}]);
  await turn(); ctx.sources[0].end(); await turn(); player.stop();
  assert.equal(await result, false);
  await sleep(40);
  assert.equal(ctx.sources.length, 1);
});

test('cancelled fetch aborts and a late old rejection cannot stop the next playback', async () => {
  const old = deferred(), signals = [];
  const {ctx, player} = fixture({fetcher: (url, {signal}) => {
    signals.push(signal); return url === 'old' ? old.promise : Promise.resolve(response(url));
  }});
  const previous = player.play([{src: 'old'}]); await turn();
  const current = player.play([{src: 'new'}]); await turn();
  assert.equal(await previous, false);
  assert.equal(signals[0].aborted, true);
  old.reject(new Error('late network failure')); await turn();
  assert.equal(ctx.sources[0].buffer.name, 'new');
  assert.equal(ctx.sources[0].stopped, false);
  ctx.sources[0].end(); assert.equal(await current, true);
});

test('cancelled decode cannot later start playback or fill the reusable cache', async () => {
  const {ctx, player, fetched} = fixture(), decoding = deferred();
  ctx.decodeHook = () => decoding.promise;
  const old = player.play([{src: 'a'}]); await turn();
  player.stop(); assert.equal(await old, false);
  decoding.resolve(buffer('a')); await turn();
  assert.equal(ctx.sources.length, 0);
  ctx.decodeHook = null;
  await complete(ctx, player.play([{src: 'a'}]));
  assert.deepEqual(fetched, ['a', 'a']);
});

test('HTTP and decode failures are retryable and never partially play a sequence', async () => {
  let broken = true;
  const {ctx, player} = fixture({fetcher: async url => broken && url === 'b' ? {ok: false} : response(url)});
  await assert.rejects(player.play([{src: 'a'}, {src: 'b'}]), {code: 'AUDIO_HTTP', retryable: true});
  assert.equal(ctx.sources.length, 0);
  broken = false; ctx.decodeHook = () => Promise.reject(new Error('bad encoding'));
  await assert.rejects(player.play([{src: 'c'}]), {code: 'AUDIO_LOAD', retryable: true});
  assert.equal(ctx.sources.length, 0);
  ctx.decodeHook = null;
  await complete(ctx, player.play([{src: 'b'}]));
});

test('fetch, body reading and decode have finite deadlines and abort the run', async () => {
  for (const stage of ['fetch', 'body', 'decode']) {
    const forever = new Promise(() => {}), signals = [];
    const {ctx, player} = fixture({timeoutMs: 12, fetcher: (url, {signal}) => {
      signals.push(signal);
      if (stage === 'fetch') return forever;
      if (stage === 'body') return {ok: true, arrayBuffer: () => forever};
      return response(url);
    }});
    if (stage === 'decode') ctx.decodeHook = () => forever;
    await assert.rejects(player.play([{src: stage}]), {code: 'AUDIO_LOAD_TIMEOUT'});
    assert.equal(signals[0].aborted, true);
    assert.equal(ctx.sources.length, 0);
    assert.equal(ctx.listeners.size, 0);
  }
});

test('missing ended times out, stops the source and allows a later retry', async () => {
  const {ctx, player} = fixture({timeoutMs: 12});
  await assert.rejects(player.play([{src: 'a'}]), {code: 'AUDIO_PLAY_TIMEOUT'});
  assert.equal(ctx.sources[0].stopped, true);
  await complete(ctx, player.play([{src: 'a'}]));
});

test('suspended, interrupted or closed context fails active playback instead of hanging', async () => {
  for (const state of ['suspended', 'interrupted', 'closed']) {
    const {ctx, player} = fixture();
    const result = player.play([{src: 'a'}, {src: 'b'}]);
    const rejection = assert.rejects(result, {code: 'AUDIO_INTERRUPTED'});
    await turn(); ctx.setState(state); await rejection;
    assert.equal(ctx.sources.length, 1);
    assert.equal(ctx.sources[0].stopped, true);
    assert.equal(ctx.listeners.size, 0);
  }
});

test('context interruption also cancels preload and gaps', async () => {
  const loading = deferred();
  const first = fixture({fetcher: () => loading.promise});
  const loadResult = first.player.play([{src: 'a'}]);
  const loadFailure = assert.rejects(loadResult, {code: 'AUDIO_INTERRUPTED'});
  await turn(); first.ctx.setState('interrupted'); await loadFailure;
  loading.resolve(response('a')); await turn(); assert.equal(first.ctx.sources.length, 0);
  const second = fixture();
  const gapResult = second.player.play([{src: 'a', gap: 40}, {src: 'b'}]);
  const gapFailure = assert.rejects(gapResult, {code: 'AUDIO_INTERRUPTED'});
  await turn(); second.ctx.sources[0].end(); await turn(); second.ctx.setState('suspended');
  await gapFailure;
  assert.equal(second.ctx.sources.length, 1);
});

test('decoded cache reuses clips and evicts least recently used by PCM bytes, not download size', async () => {
  // Each stereo buffer costs 10 samples * 2 channels * 4 = 80 bytes.
  const {ctx, player, fetched} = fixture({cacheBudgetBytes: 160});
  ctx.decodeHook = name => Promise.resolve(buffer(name, 10, 2));
  for (const src of ['a', 'b', 'a', 'c', 'a', 'b']) await complete(ctx, player.play([{src}]));
  assert.deepEqual(fetched, ['a', 'b', 'c', 'b']);
});

test('oversized or disabled cache retains no clips between sequences but deduplicates within one', async () => {
  for (const cacheBudgetBytes of [0, 10]) {
    const {ctx, player, fetched} = fixture({cacheBudgetBytes});
    const run = player.play([{src: 'a'}, {src: 'a'}]); await turn();
    ctx.sources[0].end(); await turn(); ctx.sources[1].end(); assert.equal(await run, true);
    await complete(ctx, player.play([{src: 'a'}]));
    assert.deepEqual(fetched, ['a', 'a']);
  }
});

test('suspend never creates a context, stops playback, and resumes only on a later request', async () => {
  const ctx = new FakeContext(); let factories = 0;
  const player = createHelperWebAudioPlayer({contextFactory: () => { factories++; return ctx; }, fetcher: async url => response(url)});
  assert.equal(await player.suspend(), false);
  assert.equal(factories, 0);
  const run = player.play([{src: 'a'}]); await turn();
  assert.equal(await player.suspend(), true);
  assert.equal(await run, false);
  assert.equal(ctx.sources[0].stopped, true);
  assert.equal(ctx.state, 'suspended');
  assert.equal(ctx.resumeCalls, 1);
  await complete(ctx, player.play([{src: 'a'}]));
  assert.equal(ctx.resumeCalls, 2);
});

test('suspend has a deadline and does not claim success when still running', async () => {
  const {ctx, player} = fixture({timeoutMs: 12}); await player.unlock();
  ctx.suspendHook = () => Promise.resolve();
  await assert.rejects(player.suspend(), {code: 'AUDIO_NOT_SUSPENDED'});
  ctx.suspendHook = () => new Promise(() => {});
  await assert.rejects(player.suspend(), {code: 'AUDIO_SUSPEND_TIMEOUT'});
});

test('suspend waits for an outstanding unlock before suspending, even if initially suspended', async () => {
  const {ctx, player} = fixture(), resumed = deferred();
  ctx.resumeHook = () => resumed.promise;
  const unlocked = player.unlock();
  const suspended = player.suspend();
  assert.equal(ctx.suspendCalls, 0);
  ctx.setState('running'); resumed.resolve();
  assert.equal(await unlocked, true);
  assert.equal(await suspended, true);
  assert.equal(ctx.suspendCalls, 1);
  assert.equal(ctx.state, 'suspended');
});

test('timed-out suspend rejects, then safely pauses a late native resume', async () => {
  const {ctx, player} = fixture({timeoutMs: 12}), resumed = deferred();
  ctx.resumeHook = () => resumed.promise;
  const unlockFailure = assert.rejects(player.unlock(), {code: 'AUDIO_RESUME_TIMEOUT'});
  const suspendFailure = assert.rejects(player.suspend(), {code: 'AUDIO_SUSPEND_TIMEOUT'});
  await Promise.all([unlockFailure, suspendFailure]);
  assert.equal(ctx.suspendCalls, 0);
  ctx.setState('running'); resumed.resolve(); await turn();
  assert.equal(ctx.suspendCalls, 1);
  assert.equal(ctx.state, 'suspended');
});

test('suspend still tracks a native resume after the public unlock has timed out', async () => {
  const {ctx, player} = fixture({timeoutMs: 12}), resumed = deferred();
  ctx.resumeHook = () => resumed.promise;
  await assert.rejects(player.unlock(), {code: 'AUDIO_RESUME_TIMEOUT'});
  const suspended = player.suspend();
  ctx.setState('running'); resumed.resolve();
  assert.equal(await suspended, true);
  assert.equal(ctx.state, 'suspended');
});

test('late suspend cleanup cannot stop a newer playback intent', async () => {
  const {ctx, player} = fixture({timeoutMs: 12}), resumed = deferred();
  ctx.resumeHook = () => resumed.promise;
  const unlockFailure = assert.rejects(player.unlock(), {code: 'AUDIO_RESUME_TIMEOUT'});
  const suspendFailure = assert.rejects(player.suspend(), {code: 'AUDIO_SUSPEND_TIMEOUT'});
  await Promise.all([unlockFailure, suspendFailure]);
  ctx.resumeHook = null;
  const current = player.play([{src: 'new'}]); await turn();
  resumed.resolve(); await turn();
  assert.equal(ctx.suspendCalls, 0);
  assert.equal(ctx.sources[0].stopped, false);
  ctx.sources[0].end(); assert.equal(await current, true);
});

test('already-suspended context is not touched and interrupted is not mistaken for safely suspended', async () => {
  const {ctx, player} = fixture(); await player.unlock(); ctx.setState('suspended');
  assert.equal(await player.suspend(), true);
  assert.equal(ctx.suspendCalls, 0);
  ctx.setState('interrupted'); ctx.suspendHook = () => Promise.resolve();
  await assert.rejects(player.suspend(), {code: 'AUDIO_NOT_SUSPENDED'});
});

test('empty playback does not create audio hardware and a highlight callback can safely cancel', async () => {
  let factories = 0;
  const empty = createHelperWebAudioPlayer({contextFactory: () => { factories++; return new FakeContext(); }});
  assert.equal(await empty.play([]), true); assert.equal(factories, 0);
  let player;
  const f = fixture({onStep: () => player.stop()}); player = f.player;
  assert.equal(await player.play([{src: 'a'}]), false);
  assert.equal(f.ctx.sources[0].started, false);
  assert.equal(f.ctx.sources[0].disconnected, true);
});
