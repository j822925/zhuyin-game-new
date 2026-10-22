// Keep pronunciation playback separate from HTML media and microphone capture.
// Call unlock() directly in a user gesture, before awaiting other work.
export function createHelperWebAudioPlayer({
  resolve = src => src,
  onStep = () => {},
  contextFactory = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('此瀏覽器無法播放，請使用 Safari 或 Chrome。');
    return new Context();
  },
  fetcher = (...args) => globalThis.fetch(...args),
  timeoutMs = 15000,
  cacheBudgetBytes = 16 * 1024 * 1024
} = {}) {
  const CANCELLED = Symbol('helper audio cancelled');
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000;
  const budget = Number.isFinite(cacheBudgetBytes) ? Math.max(0, cacheBudgetBytes) : 16 * 1024 * 1024;
  const cache = new Map();
  const pendingResumes = new Set();
  let cacheBytes = 0, context = null, resumeTask = null, active = null, intent = 0;

  function failure(message, code, cause) {
    const error = new Error(message);
    error.code = code;
    error.retryable = true;
    if (cause !== undefined) error.cause = cause;
    return error;
  }

  function deadline(promise, message, code, milliseconds = timeout) {
    return new Promise((fulfill, reject) => {
      const timer = setTimeout(() => reject(failure(message, code)), milliseconds);
      Promise.resolve(promise).then(value => {
        clearTimeout(timer);
        fulfill(value);
      }, error => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function getContext() {
    if (!context || context.state === 'closed') {
      context = contextFactory();
      resumeTask = null;
    }
    return context;
  }

  function resume(ctx) {
    if (resumeTask?.context === ctx) return resumeTask.promise;
    // This call must stay synchronous: Safari grants playback in this gesture.
    const nativeResume = ctx.resume();
    const completion = Promise.resolve(nativeResume);
    const task = {context: ctx, completion, promise: null};
    pendingResumes.add(task);
    const settled = () => pendingResumes.delete(task);
    completion.then(settled, settled);
    const promise = deadline(nativeResume, '聲音尚未準備好，請再按一次播放。', 'AUDIO_RESUME_TIMEOUT')
      .then(() => {
        if (ctx.state !== 'running') {
          throw failure('聲音暫時中斷，請再按一次播放。', 'AUDIO_NOT_RUNNING');
        }
        return true;
      });
    task.promise = promise;
    resumeTask = task;
    const clear = () => { if (resumeTask === task) resumeTask = null; };
    promise.then(clear, clear);
    return promise;
  }

  function unlock() {
    intent++;
    try { return resume(getContext()); }
    catch (error) { return Promise.reject(error); }
  }

  function cancel(run, reason = CANCELLED) {
    if (!run || run.reason) return;
    run.reason = reason;
    run.controller.abort();
    for (const callback of [...run.cancellations]) callback();
    run.cancellations.clear();
  }

  function stop() {
    const previous = active;
    active = null;
    cancel(previous);
  }

  function check(run) {
    if (run.reason) throw run.reason;
    if (active !== run) throw CANCELLED;
  }

  // Every asynchronous boundary is cancellable, even decodeAudioData, whose
  // underlying work cannot be aborted. Its eventual result cannot start audio.
  function operation(run, begin, message, code) {
    return new Promise((fulfill, reject) => {
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        run.cancellations.delete(onCancel);
        error ? reject(error) : fulfill(value);
      };
      const onCancel = () => finish(run.reason || CANCELLED);
      const timer = setTimeout(() => finish(failure(message, code)), timeout);
      run.cancellations.add(onCancel);
      try {
        check(run);
        Promise.resolve(begin()).then(value => finish(null, value), error => finish(error));
      } catch (error) { finish(error); }
    });
  }

  function remember(src, buffer) {
    const bytes = buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > budget) return;
    if (cache.has(src)) {
      cacheBytes -= cache.get(src).bytes;
      cache.delete(src);
    }
    while (cacheBytes + bytes > budget && cache.size) {
      const oldest = cache.keys().next().value;
      cacheBytes -= cache.get(oldest).bytes;
      cache.delete(oldest);
    }
    cache.set(src, {buffer, bytes});
    cacheBytes += bytes;
  }

  function cached(src) {
    const entry = cache.get(src);
    if (!entry) return null;
    cache.delete(src);
    cache.set(src, entry);
    return entry.buffer;
  }

  function decode(ctx, bytes) {
    return new Promise((fulfill, reject) => {
      // Accept both callback-style and Promise-style Web Audio implementations.
      const pending = ctx.decodeAudioData(bytes, fulfill, reject);
      if (pending?.then) pending.then(fulfill, reject);
    });
  }

  async function load(run, ctx, src) {
    check(run);
    const hit = cached(src);
    if (hit) return hit;
    let buffer;
    try {
      buffer = await operation(run, async () => {
        const response = await fetcher(src, {signal: run.controller.signal});
        check(run);
        if (!response?.ok) throw failure('音檔未載入，請再按一次播放。', 'AUDIO_HTTP');
        const bytes = await response.arrayBuffer();
        check(run);
        return decode(ctx, bytes);
      }, '音檔載入較久，請再按一次播放。', 'AUDIO_LOAD_TIMEOUT');
      check(run);
      if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration < 0) {
        throw failure('音檔未能播放，請再試一次。', 'AUDIO_DECODE');
      }
    } catch (error) {
      if (run.reason || active !== run || error === CANCELLED) throw run.reason || CANCELLED;
      if (error?.retryable) throw error;
      throw failure('音檔未能播放，請再試一次。', 'AUDIO_LOAD', error);
    }
    remember(src, buffer);
    return buffer;
  }

  async function preload(run, ctx, steps) {
    const sources = [...new Set(steps.map(step => step.url))];
    const loaded = new Map();
    let next = 0;
    const worker = async () => {
      while (next < sources.length) {
        check(run);
        const src = sources[next++];
        const buffer = await load(run, ctx, src);
        check(run);
        loaded.set(src, buffer);
      }
    };
    await Promise.all(Array.from({length: Math.min(3, sources.length)}, worker));
    return loaded;
  }

  function clip(run, ctx, step, buffer) {
    return new Promise((fulfill, reject) => {
      let source, timer, settled = false;
      const finish = (error, stopSource = false) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        run.cancellations.delete(onCancel);
        if (source) {
          source.onended = null;
          if (stopSource) { try { source.stop(); } catch {} }
          try { source.disconnect(); } catch {}
        }
        error ? reject(error) : fulfill();
      };
      const onCancel = () => finish(run.reason || CANCELLED, true);
      run.cancellations.add(onCancel);
      try {
        check(run);
        if (ctx.state !== 'running') throw failure('聲音暫時中斷，請再按一次播放。', 'AUDIO_INTERRUPTED');
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => finish();
        // Audio duration plus a bounded grace period also covers missing ended.
        timer = setTimeout(() => finish(failure('播放暫時中斷，請再按一次播放。', 'AUDIO_PLAY_TIMEOUT'), true),
          Math.ceil(buffer.duration * 1000) + timeout);
        onStep(step.original);
        check(run);
        source.start();
      } catch (error) { finish(error, true); }
    });
  }

  function gap(run, milliseconds) {
    return new Promise((fulfill, reject) => {
      const finish = error => {
        clearTimeout(timer);
        run.cancellations.delete(onCancel);
        error ? reject(error) : fulfill();
      };
      const onCancel = () => finish(run.reason || CANCELLED);
      const timer = setTimeout(() => finish(), milliseconds);
      run.cancellations.add(onCancel);
      try { check(run); } catch (error) { finish(error); }
    });
  }

  async function play(steps) {
    stop();
    if (!steps.length) return true;
    intent++;
    const run = {controller: new AbortController(), cancellations: new Set(), reason: null, phase: 'resuming'};
    active = run;
    let ctx, onState;
    try {
      ctx = getContext();
      onState = () => {
        if (ctx.state === 'closed' || ctx.state === 'interrupted' ||
            (run.phase !== 'resuming' && ctx.state !== 'running')) {
          cancel(run, failure('聲音暫時中斷，請再按一次播放。', 'AUDIO_INTERRUPTED'));
        }
      };
      ctx.addEventListener('statechange', onState);
      if (ctx.state !== 'running') {
        await operation(run, () => resume(ctx), '聲音尚未準備好，請再按一次播放。', 'AUDIO_RESUME_TIMEOUT');
      }
      check(run);
      run.phase = 'preloading';
      onState();
      check(run);
      const prepared = steps.map(original => {
        const url = resolve(original.src);
        const pause = original.gap ?? 0;
        if (typeof url !== 'string' || !url || !Number.isFinite(pause) || pause < 0) {
          throw failure('找不到這段聲音，請重新查詢。', 'AUDIO_INVALID_STEP');
        }
        return {original, url, gap: pause};
      });
      const buffers = await preload(run, ctx, prepared);
      check(run);
      run.phase = 'playing';
      for (const step of prepared) {
        check(run);
        await clip(run, ctx, step, buffers.get(step.url));
        check(run);
        if (step.gap) await gap(run, step.gap);
      }
      check(run);
      return true;
    } catch (error) {
      if (active !== run || run.reason === CANCELLED || error === CANCELLED) return false;
      cancel(run, error);
      throw error;
    } finally {
      if (onState) ctx.removeEventListener('statechange', onState);
      if (active === run) active = null;
    }
  }

  function suspend() {
    stop();
    const ticket = ++intent;
    if (!context || context.state === 'closed') return Promise.resolve(false);
    const ctx = context;
    const pending = [...pendingResumes].filter(task => task.context === ctx).map(task => task.completion);
    const pause = () => {
      if (ticket !== intent) throw failure('聲音操作已更換，請再試一次。', 'AUDIO_SUPERSEDED');
      if (ctx.state === 'suspended' || ctx.state === 'closed') return true;
      return Promise.resolve(ctx.suspend()).then(() => {
        if (ctx.state !== 'suspended' && ctx.state !== 'closed') {
          throw failure('聲音尚未停止，請再試一次。', 'AUDIO_NOT_SUSPENDED');
        }
        return true;
      });
    };
    try {
      // A pending resume can otherwise finish AFTER suspend and take audio back
      // from recognition. Wait for all native resumes (including timed-out ones).
      // If this wait times out, reject: the caller must not start the microphone.
      // The retained continuation will still pause a late resume, unless a new
      // playback intent has superseded it. This uses no ongoing polling.
      const work = pending.length ? Promise.allSettled(pending).then(pause) : pause();
      return deadline(work, '聲音尚未停止，請再按一次開始說話。', 'AUDIO_SUSPEND_TIMEOUT', Math.min(timeout, 4000));
    } catch (error) { return Promise.reject(error); }
  }

  return {unlock, play, stop, suspend};
}
