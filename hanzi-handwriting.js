import { gradeStrokes, HANDWRITING_MODEL_VERSION, HANDWRITING_INPUT_LIMITS } from './hanzi-stroke-core.js';

const templateCache = new Map();
const sourceBase = new URL('./data/hanzi-strokes/', import.meta.url);
let nextInstance = 0;

async function defaultLoad(character) {
  const key = `U${character.codePointAt(0).toString(16).toUpperCase()}.json`;
  if (!templateCache.has(key)) {
    const pending = fetch(new URL(key, sourceBase), { credentials: 'same-origin' })
      .then(response => { if (!response.ok) throw new Error('reference-unavailable'); return response.json(); })
      .catch(error => { templateCache.delete(key); throw error; });
    templateCache.set(key, pending);
  }
  return templateCache.get(key);
}

const copyStrokes = strokes => strokes.map(stroke => stroke.map(point => ({ ...point })));

function demoPoints(stroke) {
  const points = stroke.map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : p);
  if (points.length < 2) return points;
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  const total = lengths.at(-1);
  if (total < 0.00001) return points;
  let segment = 1;
  return Array.from({ length: 48 }, (_, i) => {
    const target = total * i / 47;
    while (segment < lengths.length - 1 && lengths[segment] < target) segment++;
    const a = points[segment - 1], b = points[segment];
    const t = (target - lengths[segment - 1]) / Math.max(0.00001, lengths[segment] - lengths[segment - 1]);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}

function validateRestorableStrokes(input) {
  if (!Array.isArray(input) || input.length > HANDWRITING_INPUT_LIMITS.maxStrokes) return null;
  let total = 0;
  const copy = [];
  for (const stroke of input) {
    if (!Array.isArray(stroke) || !stroke.length || stroke.length > HANDWRITING_INPUT_LIMITS.maxPointsPerStroke) return null;
    total += stroke.length;
    if (total > HANDWRITING_INPUT_LIMITS.maxTotalPoints) return null;
    const points = [];
    for (const p of stroke) {
      if (!p || Array.isArray(p) || typeof p.x !== 'number' || typeof p.y !== 'number'
        || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return null;
      const point = { x: p.x, y: p.y };
      if (p.t !== undefined) {
        if (typeof p.t !== 'number' || !Number.isFinite(p.t) || p.t < 0 || p.t > Number.MAX_SAFE_INTEGER) return null;
        point.t = p.t;
      }
      if (p.pressure !== undefined) {
        if (typeof p.pressure !== 'number' || !Number.isFinite(p.pressure) || p.pressure < 0 || p.pressure > 1) return null;
        point.pressure = p.pressure;
      }
      points.push(point);
    }
    copy.push(points);
  }
  return copy;
}

/** A square, resize-safe white handwriting board. No automatic snap-to-template.
 * Methods: async load(character), clear(), undo(), getStrokes(), grade(options),
 * restoreStrokes(raw, {inputInterrupted}), setDisabled(boolean), async showDemo(),
 * destroy(). All student coordinates are [0,1], top-left.
 * onChange receives {strokeCount,strokes,inputInterrupted,inputTooComplex,character,isDrawing}.
 */
export function createHandwriting(container, options = {}) {
  if (!container?.appendChild) throw new TypeError('A container element is required');
  const document = container.ownerDocument;
  const view = document.defaultView;
  const id = `hanzi-board-${++nextInstance}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'hanzi-handwriting';
  wrapper.style.cssText = 'position:relative;width:100%;max-width:620px;aspect-ratio:1;background:#fff;border:2px solid #7e8a78;border-radius:14px;overflow:hidden;box-sizing:border-box;touch-action:none;';
  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '國字手寫田字格，可以用手指或觸控筆書寫');
  canvas.setAttribute('aria-disabled', String(options.disabled === true));
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:crosshair;';
  const overlay = document.createElement('canvas');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none;background:rgba(255,255,255,.94);';
  const status = document.createElement('div');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'position:absolute;left:8px;right:8px;bottom:5px;text-align:center;font:12px sans-serif;color:#52634b;pointer-events:none;';
  wrapper.append(canvas, overlay, status);
  container.appendChild(wrapper);
  const ctx = canvas.getContext('2d'), demoCtx = overlay.getContext('2d');
  if (!ctx || !demoCtx) { wrapper.remove(); throw new Error('canvas-unavailable'); }

  let strokes = [], activePointer = null, activeStroke = null, reference = null, character = null;
  let interruptedAt = new Set(), destroyed = false, disabled = options.disabled === true, inputTooComplex = false, loadVersion = 0, demoVersion = 0;
  let size = 300, ratio = 1, originTime = performance.now(), demoActive = false;
  let raf = 0, lastNotify = 0, demoResolve = null;
  const loadData = options.loadReference || defaultLoad;

  function notify(force = false) {
    if (destroyed) return;
    const now = performance.now();
    if (!force && now - lastNotify < 80) return;
    lastNotify = now;
    options.onChange?.({ character, strokeCount: strokes.length, strokes: copyStrokes(strokes),
      inputInterrupted: interruptedAt.size > 0, inputTooComplex, isDrawing: activePointer !== null });
  }

  function strokePath(context, stroke, color = '#28332b', width = 6) {
    if (!stroke.length) return;
    context.beginPath();
    context.lineCap = 'round'; context.lineJoin = 'round';
    context.strokeStyle = color; context.fillStyle = color; context.lineWidth = width;
    context.moveTo(stroke[0].x * size, stroke[0].y * size);
    if (stroke.length === 1) {
      context.arc(stroke[0].x * size, stroke[0].y * size, width / 2, 0, Math.PI * 2); context.fill();
    } else {
      for (let i = 1; i < stroke.length; i++) context.lineTo(stroke[i].x * size, stroke[i].y * size);
      context.stroke();
    }
  }

  function grid(context) {
    context.clearRect(0, 0, size, size);
    context.fillStyle = '#fff'; context.fillRect(0, 0, size, size);
    context.strokeStyle = '#d8ddd5'; context.lineWidth = 1;
    context.setLineDash([6, 6]); context.beginPath();
    context.moveTo(size / 2, 0); context.lineTo(size / 2, size);
    context.moveTo(0, size / 2); context.lineTo(size, size / 2); context.stroke();
    context.setLineDash([]);
  }

  function render() {
    if (destroyed) return;
    grid(ctx);
    for (const stroke of strokes) strokePath(ctx, stroke, '#27392e', Math.max(4, size * 0.014));
  }

  function resize() {
    if (destroyed) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width < 1) return;
    size = rect.width;
    ratio = Math.min(3, Math.max(1, view.devicePixelRatio || 1));
    for (const surface of [canvas, overlay]) { surface.width = Math.round(size * ratio); surface.height = Math.round(size * ratio); }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); demoCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
    if (demoActive) stopDemo();
  }

  function pointFrom(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height))),
      t: Math.max(0, Math.round(performance.now() - originTime)),
      pressure: Math.max(0, Math.min(1, Number(event.pressure) || 0.5)) };
  }

  function addPoint(event) {
    if (!activeStroke) return;
    const point = pointFrom(event), previous = activeStroke.at(-1);
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.001) activeStroke.push(point);
    // Stop explicitly after recording the first over-limit point. This retained
    // evidence cannot be mistaken for a valid truncated answer after reload.
    // Do not silently decimate a child's shape to make it fit a network limit.
    if (activeStroke.length > HANDWRITING_INPUT_LIMITS.maxPointsPerStroke
      || strokes.reduce((sum, stroke) => sum + stroke.length, 0) > HANDWRITING_INPUT_LIMITS.maxTotalPoints) {
      inputTooComplex = true; stopInput();
      status.textContent = '這個字的筆跡太密了，請清除後再寫一次。';
      notify(true);
    }
  }

  function onDown(event) {
    if (destroyed || disabled || inputTooComplex || demoActive || activePointer !== null || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (strokes.length >= HANDWRITING_INPUT_LIMITS.maxStrokes) { inputTooComplex = true; status.textContent = '筆畫較多，請清除後重新書寫。'; notify(true); return; }
    event.preventDefault();
    activePointer = event.pointerId; activeStroke = []; strokes.push(activeStroke);
    try { canvas.setPointerCapture(activePointer); } catch { /* Pointer may already have ended. */ }
    status.textContent = ''; addPoint(event); render(); notify(true);
  }

  function onMove(event) {
    if (event.pointerId !== activePointer) return;
    event.preventDefault();
    const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    for (const sample of events.length ? events : [event]) addPoint(sample);
    render(); notify();
  }

  function finish(event, interrupted = false) {
    if (event.pointerId !== activePointer) return;
    event.preventDefault();
    if (!interrupted) addPoint(event);
    else interruptedAt.add(strokes.length - 1);
    const pointer = activePointer;
    activePointer = null; activeStroke = null;
    try { if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer); } catch { /* no capture */ }
    if (interrupted) status.textContent = '這一筆中途斷開了，可以按「上一筆」再寫一次。';
    render(); notify(true);
  }
  const onUp = event => finish(event, false);
  const onCancel = event => finish(event, true);
  const onLostCapture = event => { if (activePointer === event.pointerId) finish(event, true); };
  const onContext = event => event.preventDefault();
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('lostpointercapture', onLostCapture);
  canvas.addEventListener('contextmenu', onContext);
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : null;
  observer?.observe(wrapper);
  view.addEventListener('resize', resize);
  resize();

  function stopDemo(completed = false) {
    demoVersion++; demoActive = false;
    if (raf) view.cancelAnimationFrame(raf);
    raf = 0; overlay.style.display = 'none';
    status.textContent = '';
    const resolve = demoResolve; demoResolve = null; resolve?.(completed);
  }

  function stopInput() {
    if (activePointer === null) return;
    const pointer = activePointer; activePointer = null; activeStroke = null;
    try { if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer); } catch { /* no capture */ }
  }

  const api = {
    modelVersion: HANDWRITING_MODEL_VERSION,
    async load(nextCharacter) {
      const chars = Array.from(String(nextCharacter || ''));
      if (chars.length !== 1) throw new TypeError('load expects exactly one character');
      const version = ++loadVersion;
      character = chars[0]; reference = null; api.clear();
      status.textContent = '正在準備筆順資料…';
      try {
        const loaded = await loadData(character);
        if (destroyed || version !== loadVersion) return null;
        if (loaded?.character !== character || !Array.isArray(loaded.strokes)) throw new Error('reference-unavailable');
        reference = loaded; status.textContent = ''; notify(true); return loaded;
      } catch (error) {
        if (!destroyed && version === loadVersion) { status.textContent = '這個字的筆順資料尚未準備好，請換一題。'; notify(true); }
        return null;
      }
    },
    clear() {
      stopInput(); stopDemo(); strokes = []; interruptedAt.clear(); inputTooComplex = false; originTime = performance.now();
      render(); notify(true);
    },
    undo() {
      stopInput(); stopDemo();
      if (!strokes.length) return false;
      interruptedAt.delete(strokes.length - 1); strokes.pop();
      inputTooComplex = strokes.reduce((sum, stroke) => sum + stroke.length, 0) > HANDWRITING_INPUT_LIMITS.maxTotalPoints;
      render(); notify(true); return true;
    },
    getStrokes() { return copyStrokes(strokes); },
    restoreStrokes(raw, { inputInterrupted = false } = {}) {
      const restored = validateRestorableStrokes(raw);
      if (destroyed || !restored || typeof inputInterrupted !== 'boolean') return false;
      stopInput(); stopDemo();
      strokes = restored; interruptedAt.clear(); inputTooComplex = false;
      if (inputInterrupted && strokes.length) interruptedAt.add(strokes.length - 1);
      let latestTime = 0;
      for (const stroke of strokes) for (const point of stroke) latestTime = Math.max(latestTime, point.t || 0);
      originTime = performance.now() - latestTime;
      render(); notify(true); return true;
    },
    setDisabled(value = true) {
      disabled = Boolean(value);
      if (disabled && activePointer !== null) { interruptedAt.add(strokes.length - 1); stopInput(); }
      canvas.setAttribute('aria-disabled', String(disabled));
      canvas.style.cursor = disabled ? 'default' : 'crosshair';
      notify(true);
    },
    cancelDemo() { stopDemo(); },
    getReference() { return reference; },
    grade(gradeOptions = {}) {
      return gradeStrokes(copyStrokes(strokes), reference, { ...gradeOptions,
        inputInterrupted: interruptedAt.size > 0 || activePointer !== null, inputTooComplex });
    },
    async showDemo() {
      if (destroyed || !reference?.strokes?.length || options.allowDemo === false) return false;
      stopInput(); stopDemo();
      const version = demoVersion;
      const demoStrokes = reference.strokes.map(demoPoints);
      demoActive = true; overlay.style.display = 'block';
      let start = null;
      const perStroke = 650;
      return new Promise(resolve => {
        demoResolve = resolve;
        function frame(now) {
          if (destroyed || version !== demoVersion) { resolve(false); return; }
          if (start === null) start = now;
          const progress = (now - start) / perStroke;
          const index = Math.min(demoStrokes.length - 1, Math.floor(progress));
          grid(demoCtx);
          for (let i = 0; i < Math.min(demoStrokes.length, Math.floor(progress)); i++) strokePath(demoCtx, demoStrokes[i], '#8a9689', size * 0.014);
          if (progress < demoStrokes.length) {
            const current = demoStrokes[index], amount = progress - index;
            const count = Math.max(1, Math.min(current.length, Math.ceil(amount * current.length)));
            strokePath(demoCtx, current.slice(0, count), '#bc4e2d', size * 0.018);
            const first = current[0];
            demoCtx.beginPath(); demoCtx.fillStyle = '#a13e20'; demoCtx.arc(first.x * size, first.y * size, Math.max(9, size * 0.025), 0, Math.PI * 2); demoCtx.fill();
            demoCtx.fillStyle = '#fff'; demoCtx.font = `bold ${Math.max(12, size * 0.032)}px sans-serif`; demoCtx.textAlign = 'center'; demoCtx.textBaseline = 'middle'; demoCtx.fillText(String(index + 1), first.x * size, first.y * size);
            status.textContent = `第 ${index + 1} 筆／共 ${demoStrokes.length} 筆`;
          } else status.textContent = '再換你試試看！';
          if (progress >= demoStrokes.length + 1) { stopDemo(true); return; }
          raf = view.requestAnimationFrame(frame);
        }
        raf = view.requestAnimationFrame(frame);
      });
    },
    destroy() {
      stopInput(); stopDemo(); destroyed = true; loadVersion++;
      observer?.disconnect(); view.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('lostpointercapture', onLostCapture); canvas.removeEventListener('contextmenu', onContext);
      wrapper.remove();
    },
  };
  return api;
}
