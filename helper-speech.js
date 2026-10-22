// Speech owns no audio player. The caller must finish playback before start(),
// and await stop() before playing audio. A missing native end is NOT recovery.
export function createHelperSpeech({
  Recognition,
  onState = () => {}, onText = () => {}, onMessage = () => {},
  startTimeoutMs = 6000, listenTimeoutMs = 15000, stopTimeoutMs = 2000
} = {}) {
  let state = 'idle', current = null;
  const delay = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
  const startLimit = delay(startTimeoutMs, 6000);
  const listenLimit = delay(listenTimeoutMs, 15000);
  const stopLimit = delay(stopTimeoutMs, 2000);
  const reloadMessage = '麥克風還沒有完全停止，請重新整理這一頁後再試。';
  // UI callback failures must not strand the native recognizer or its timers.
  const notify = (fn, value) => { try { fn(value); } catch {} };
  const message = text => notify(onMessage, text);
  const setState = value => {
    if (state === value) return;
    state = value; notify(onState, value);
  };
  const live = session => current === session && !session.cleaned && state !== 'blocked';
  function clearActiveTimers(session) {
    clearTimeout(session.startTimer); clearTimeout(session.listenTimer);
    session.startTimer = session.listenTimer = null;
  }
  function cleanup(session) {
    session.cleaned = true;
    clearActiveTimers(session); clearTimeout(session.stopTimer);
    session.stopTimer = null;
    for (const name of ['onstart', 'onaudiostart', 'onresult', 'onerror', 'onend']) {
      try { session.recognizer[name] = null; } catch {}
    }
    if (current === session) current = null;
  }
  function settleStop(session, result) {
    const resolve = session.resolveStop;
    session.resolveStop = null;
    resolve?.(result);
  }
  function block(session) {
    if (!live(session)) return;
    cleanup(session);
    setState('blocked'); message(reloadMessage);
    settleStop(session, false);
  }
  function ended(session) {
    if (!live(session)) return;
    cleanup(session);
    setState('idle');
    if (!session.keepMessage) {
      message(session.text ? '請確認國字，再按「查注音」。' :
        session.requestedStop ? '收音已停止，可以重新說話。' : '沒聽到詞語，再試一次吧。');
    }
    settleStop(session, true);
  }
  function stop({abort = true} = {}) {
    if (state === 'blocked') return Promise.resolve(false);
    const session = current;
    if (!session) return Promise.resolve(true);
    if (session.stopPromise) return session.stopPromise;
    session.requestedStop = true;
    session.acceptResults = !abort;
    clearActiveTimers(session);
    session.stopPromise = new Promise(resolve => { session.resolveStop = resolve; });
    // Arm the bound before invoking callbacks/native methods: either may finish
    // synchronously, and repeated stop() must see the very same pending promise.
    session.stopTimer = setTimeout(() => block(session), stopLimit);
    setState('stopping');
    if (!live(session)) return session.stopPromise;
    try {
      const method = abort ? 'abort' : 'stop';
      if (typeof session.recognizer[method] !== 'function') throw new Error('Missing native stop');
      session.recognizer[method]();
    } catch { block(session); }
    return session.stopPromise;
  }
  function errorText(code) {
    if (['not-allowed', 'service-not-allowed'].includes(code)) return '收音或語音辨識未獲允許，請檢查 Safari 的麥克風權限。';
    if (code === 'audio-capture') return '目前找不到可用的麥克風，請確認裝置後再試。';
    if (code === 'network') return '語音辨識連線中斷，請確認網路後再試。';
    if (code === 'no-speech') return '這次沒聽到詞語，請再試一次。';
    if (code === 'language-not-supported') return '這個裝置目前不支援所選的語音辨識，請改用打字。';
    if (code === 'aborted') return '收音已中斷，可以重新說話。';
    return '這次無法完成語音辨識，請再試一次，或直接打字。';
  }
  function start() {
    if (state !== 'idle' || current) {
      if (state === 'blocked') message(reloadMessage);
      return false;
    }
    if (typeof Recognition !== 'function') {
      message('這個瀏覽器不支援收音辨識，請使用 Safari 或直接打字。');
      return false;
    }
    let recognizer;
    try {
      recognizer = new Recognition();
      recognizer.lang = 'zh-TW'; recognizer.continuous = false;
      recognizer.interimResults = true; recognizer.maxAlternatives = 1;
    } catch {
      message('無法準備麥克風，請重新整理後再試，或直接打字。');
      return false;
    }
    const session = {
      recognizer, cleaned: false, text: '', acceptResults: true,
      requestedStop: false, keepMessage: false,
      startTimer: null, listenTimer: null, stopTimer: null,
      stopPromise: null, resolveStop: null
    };
    current = session;
    const started = () => {
      if (!live(session) || state !== 'starting') return;
      clearTimeout(session.startTimer); session.startTimer = null;
      session.listenTimer = setTimeout(() => {
        if (!live(session) || state !== 'listening') return;
        message('正在整理你說的詞…');
        void stop({abort: false});
      }, listenLimit);
      setState('listening');
      if (live(session) && state === 'listening') message('請說一個詞語…');
    };
    recognizer.onstart = started;
    recognizer.onaudiostart = started;
    recognizer.onresult = event => {
      if (!live(session) || !session.acceptResults) return;
      let text;
      try { text = Array.from(event.results || []).map(row => row[0]?.transcript || '').join('').trim(); }
      catch { return; }
      if (!text) return;
      session.text = text;
      notify(onText, text);
      if (live(session)) message('聽到了，請確認國字。');
    };
    recognizer.onerror = event => {
      if (!live(session) || state === 'stopping') return;
      session.keepMessage = true;
      message(errorText(event?.error));
      void stop({abort: true});
    };
    recognizer.onend = () => ended(session);
    session.startTimer = setTimeout(() => {
      if (!live(session) || state !== 'starting') return;
      session.keepMessage = true;
      message('麥克風沒有開始收音，請確認權限後再試。');
      void stop({abort: true});
    }, startLimit);
    setState('starting');
    if (!live(session) || state !== 'starting') return false;
    message('正在開啟麥克風…');
    if (!live(session) || state !== 'starting') return false;
    // No promise/await before start(): preserve the original tap's activation.
    try { recognizer.start(); }
    catch {
      // A synchronous start rejection did not launch a session. Ignore any late
      // events belonging to this rejected object; the next tap may retry.
      if (live(session)) {
        cleanup(session); setState('idle');
        message('無法開始收音，請檢查 Safari 權限或重新整理後再試。');
        settleStop(session, false);
      }
      return false;
    }
    return true;
  }
  return {start, stop, get state() { return state; }, get busy() { return state !== 'idle'; }};
}
