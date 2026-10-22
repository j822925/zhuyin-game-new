// One shared voice for both panels. Cancellation also cancels pending gaps.
export function createHelperPlayer(voice, {resolve = s => s, timeoutMs = 20000, onStep = () => {}} = {}) {
  let generation = 0, cancelPending = null;
  function stop() {
    generation++;
    cancelPending?.();
    cancelPending = null;
    voice.pause();
    voice.removeAttribute?.('src');
    voice.load?.();
  }
  function wait(ms) {
    return new Promise(resolve => {
      const done = () => { clearTimeout(timer); cancelPending = null; resolve(); };
      const timer = setTimeout(done, ms);
      cancelPending = done;
    });
  }
  function clip(src) {
    return new Promise((resolvePromise, reject) => {
      let timer, settled = false;
      const done = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        voice.onended = null; voice.onerror = null;
        cancelPending = null;
        error ? reject(error) : resolvePromise();
      };
      cancelPending = () => done();
      voice.onended = () => done();
      voice.onerror = () => done(new Error('音檔未載入，請再按一次播放。'));
      timer = setTimeout(() => done(new Error('聲音載入較久，請再試一次。')), timeoutMs);
      voice.src = src;
      try { Promise.resolve(voice.play()).catch(e => done(e)); }
      catch (e) { done(e); }
    });
  }
  async function play(steps) {
    stop();
    const token = generation;
    try {
      for (const step of steps) {
        if (token !== generation) return false;
        onStep(step);
        await clip(resolve(step.src));
        if (token !== generation) return false;
        if (step.gap) await wait(step.gap);
      }
      return token === generation;
    } catch (error) {
      if (token !== generation) return false;
      stop(); throw error;
    }
  }
  return {play, stop};
}
