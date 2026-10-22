import test from 'node:test';
import assert from 'node:assert/strict';
import {createHelperSpeech} from '../helper-speech.js';

function fixture(options = {}) {
  const instances = [], states = [], texts = [], messages = [];
  class Recognition {
    constructor() { instances.push(this); this.calls = []; }
    start() { this.calls.push('start'); }
    stop() { this.calls.push('stop'); }
    abort() { this.calls.push('abort'); }
  }
  const speech = createHelperSpeech({Recognition,
    onState: state => states.push(state), onText: text => texts.push(text), onMessage: text => messages.push(text),
    startTimeoutMs: 60, listenTimeoutMs: 150, stopTimeoutMs: 20, ...options
  });
  return {speech, Recognition, instances, states, texts, messages};
}
const result = (...texts) => ({results: texts.map(transcript => [{transcript}])});
const last = array => array.at(-1);

test('start is synchronous, configured for zh-TW, and listening requires a native event', async () => {
  const f = fixture();
  assert.equal(f.speech.state, 'idle'); assert.equal(f.speech.busy, false);
  assert.equal(f.speech.start(), true);
  const r = f.instances[0];
  assert.deepEqual(r.calls, ['start']);
  assert.equal(r.lang, 'zh-TW'); assert.equal(r.interimResults, true); assert.equal(r.continuous, false);
  assert.equal(f.speech.state, 'starting'); assert.equal(f.speech.busy, true);
  r.onstart(); assert.equal(f.speech.state, 'listening');
  r.onend(); assert.equal(f.speech.state, 'idle');
  assert.deepEqual(f.states, ['starting', 'listening', 'idle']);
  assert.equal(await f.speech.stop(), true);
});

test('audiostart also confirms listening, but duplicate started events do not restart the limit', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(); f.speech.start(); const r = f.instances[0];
  r.onaudiostart(); t.mock.timers.tick(100); r.onstart();
  assert.deepEqual(f.states, ['starting', 'listening']);
  t.mock.timers.tick(50);
  assert.equal(f.speech.state, 'stopping'); assert.equal(last(r.calls), 'stop');
  r.onend(); assert.equal(f.speech.state, 'idle');
});

test('stop awaits onend and does not permit another recognizer while stopping', async () => {
  const f = fixture(); f.speech.start(); const r = f.instances[0]; r.onstart();
  let settled = false;
  const stopped = f.speech.stop(); stopped.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false); assert.equal(f.speech.state, 'stopping');
  assert.equal(f.speech.start(), false); assert.equal(f.instances.length, 1);
  assert.equal(last(r.calls), 'abort');
  r.onend(); assert.equal(await stopped, true);
  assert.equal(f.speech.state, 'idle'); assert.equal(f.speech.busy, false);
});

test('reentrant stops share one promise and call the native stopping method once', async () => {
  const f = fixture(); f.speech.start(); const r = f.instances[0];
  const first = f.speech.stop({abort: false});
  const second = f.speech.stop();
  assert.equal(first, second); assert.deepEqual(r.calls, ['start', 'stop']);
  r.onend(); assert.equal(await first, true); assert.equal(await second, true);
});

test('interim text survives a normal end without blank callbacks or audio operations', () => {
  const f = fixture(); f.speech.start(); const r = f.instances[0]; r.onstart();
  r.onresult(result('快')); r.onresult(result('快', '樂')); r.onresult(result(''));
  r.onend();
  assert.deepEqual(f.texts, ['快', '快樂']);
  assert.match(last(f.messages), /確認國字/); assert.equal(f.speech.state, 'idle');
  assert.deepEqual(r.calls, ['start']);
});

test('graceful stop accepts the final result; abort ignores further results', async () => {
  const f = fixture(); f.speech.start(); let r = f.instances[0]; r.onstart();
  const graceful = f.speech.stop({abort: false});
  r.onresult(result('學校')); r.onend(); assert.equal(await graceful, true);
  assert.deepEqual(f.texts, ['學校']);
  f.speech.start(); r = f.instances[1]; r.onstart();
  const aborted = f.speech.stop(); r.onresult(result('不該採用')); r.onend();
  assert.equal(await aborted, true); assert.deepEqual(f.texts, ['學校']);
});

test('no start event times out, aborts, and returns idle only after native end', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(); f.speech.start(); const r = f.instances[0];
  t.mock.timers.tick(60);
  assert.equal(f.speech.state, 'stopping'); assert.equal(last(r.calls), 'abort');
  assert.match(last(f.messages), /沒有開始收音/);
  assert.equal(f.speech.start(), false);
  r.onend(); assert.equal(f.speech.state, 'idle');
  assert.match(last(f.messages), /沒有開始收音/);
  t.mock.timers.tick(1000); assert.equal(f.speech.state, 'idle');
});

test('no events at all cannot hang: startup plus stop limits end in reload-only blocked state', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(); f.speech.start();
  t.mock.timers.tick(60); t.mock.timers.tick(20);
  assert.equal(f.speech.state, 'blocked'); assert.equal(f.speech.busy, true);
  assert.match(last(f.messages), /重新整理/);
  assert.equal(f.speech.start(), false); assert.equal(await f.speech.stop(), false);
  assert.equal(f.instances.length, 1);
});

test('abort without onend resolves false, blocks, and ignores late captured events', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(); f.speech.start(); const r = f.instances[0]; r.onstart();
  const late = {start: r.onstart, result: r.onresult, error: r.onerror, end: r.onend};
  const stopped = f.speech.stop(); t.mock.timers.tick(20);
  assert.equal(await stopped, false); assert.equal(f.speech.state, 'blocked');
  const count = f.messages.length;
  late.start(); late.result(result('舊文字')); late.error({error: 'network'}); late.end();
  assert.equal(f.speech.state, 'blocked'); assert.equal(f.messages.length, count);
  assert.deepEqual(f.texts, []); assert.equal(f.speech.start(), false);
});

test('abort throws: bounded stop immediately resolves false and cannot falsely recover', async () => {
  const f = fixture(); f.speech.start(); const r = f.instances[0];
  const lateEnd = r.onend; r.abort = () => { throw new Error('native failure'); };
  assert.equal(await f.speech.stop(), false);
  assert.equal(f.speech.state, 'blocked'); assert.match(last(f.messages), /重新整理/);
  lateEnd(); assert.equal(f.speech.state, 'blocked'); assert.equal(f.speech.start(), false);
});

test('synchronous start rejection cleans handlers and timers so a fresh tap can retry', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(); f.Recognition.prototype.start = function () { this.calls.push('start'); throw new Error('not permitted'); };
  assert.equal(f.speech.start(), false); assert.equal(f.speech.state, 'idle');
  const rejected = f.instances[0]; assert.equal(rejected.onend, null);
  t.mock.timers.tick(1000); assert.equal(f.speech.state, 'idle');
  f.Recognition.prototype.start = function () { this.calls.push('start'); };
  assert.equal(f.speech.start(), true); f.instances[1].onend();
  assert.equal(f.speech.state, 'idle'); assert.equal(await f.speech.stop(), true);
});

test('rapid start taps cannot create parallel recognizers, and stale old callbacks cannot touch a new one', () => {
  const f = fixture(); f.speech.start(); const first = f.instances[0];
  const old = {result: first.onresult, end: first.onend, error: first.onerror};
  for (let i = 0; i < 8; i++) assert.equal(f.speech.start(), false);
  assert.equal(f.instances.length, 1); first.onend();
  assert.equal(f.speech.start(), true); const second = f.instances[1];
  old.result(result('舊詞')); old.error({error: 'network'}); old.end();
  assert.equal(f.speech.state, 'starting'); assert.deepEqual(f.texts, []);
  second.onstart(); second.onresult(result('新詞')); second.onend();
  assert.deepEqual(f.texts, ['新詞']); assert.equal(f.speech.state, 'idle');
});

test('permission, capture, network, no-speech and unsupported-language errors retain distinct messages', async () => {
  for (const [error, expected] of [
    ['not-allowed', /未獲允許/], ['service-not-allowed', /未獲允許/],
    ['audio-capture', /找不到/], ['network', /連線中斷/],
    ['no-speech', /沒聽到詞語/], ['language-not-supported', /不支援/]
  ]) {
    const f = fixture(); f.speech.start(); const r = f.instances[0];
    r.onerror({error}); assert.equal(f.speech.state, 'stopping');
    assert.match(last(f.messages), expected);
    r.onend(); assert.equal(f.speech.state, 'idle'); assert.match(last(f.messages), expected);
  }
});

test('listen timeout gracefully stops then remains bounded if no final end arrives', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(); f.speech.start(); const r = f.instances[0]; r.onstart(); r.onresult(result('保留'));
  t.mock.timers.tick(150); assert.equal(last(r.calls), 'stop'); assert.equal(f.speech.state, 'stopping');
  t.mock.timers.tick(20); assert.equal(f.speech.state, 'blocked');
  assert.deepEqual(f.texts, ['保留']); assert.match(last(f.messages), /重新整理/);
});

test('synchronous native end during abort resolves without leaving stop timers behind', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(); f.speech.start(); const r = f.instances[0];
  r.abort = () => { r.onend(); };
  assert.equal(await f.speech.stop(), true); assert.equal(f.speech.state, 'idle');
  t.mock.timers.tick(1000); assert.equal(f.speech.state, 'idle');
});

test('missing recognition or constructor rejection stays idle and never clears existing text', async () => {
  for (const Recognition of [undefined, class { constructor() { throw new Error('unavailable'); } }]) {
    const f = fixture({Recognition});
    assert.equal(f.speech.start(), false); assert.equal(f.speech.state, 'idle');
    assert.equal(await f.speech.stop(), true); assert.deepEqual(f.texts, []);
    assert.ok(f.messages.length);
  }
});
