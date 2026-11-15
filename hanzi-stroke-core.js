/* Specified-character geometric checks, not general handwriting recognition.
 * All thresholds are prototype defaults and need classroom calibration.
 * No DOM, network, storage, randomness or dependency on client-reported scores.
 */
export const HANDWRITING_MODEL_VERSION = 'tw-template-20261115-v2';
export const HANDWRITING_INPUT_LIMITS = Object.freeze({ maxStrokes: 64, maxPointsPerStroke: 2000, maxTotalPoints: 2000 });
export const AUTOMATIC_GRADING_DEFAULTS = Object.freeze({
  meanDistance: 0.15,
  maxStrokeDistance: 0.29,
  reverseDirectionMargin: 0.035,
  alternativeMargin: 0.004,
});

const SAMPLE_COUNT = 24;
const MAX_STROKES = 64;
const MAX_POINTS_PER_STROKE = 4096;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function parseStrokes(input, isReference = false) {
  if (!Array.isArray(input) || input.length > MAX_STROKES) return null;
  const strokes = [];
  let pointCount = 0;
  for (const stroke of input) {
    if (!Array.isArray(stroke) || stroke.length < 1 || stroke.length > MAX_POINTS_PER_STROKE) return null;
    pointCount += stroke.length;
    if (pointCount > 32768) return null;
    const points = [];
    for (const point of stroke) {
      const x = Array.isArray(point) ? point[0] : point?.x;
      const y = Array.isArray(point) ? point[1] : point?.y;
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
      // The saved student record uses unit-square coordinates. Never silently
      // normalize a malformed or server-forged coordinate system.
      if (x < -0.02 || x > 1.02 || y < -0.02 || y > 1.02) return null;
      const clean = { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
      if (!points.length || distance(points[points.length - 1], clean) > 0.00001) points.push(clean);
    }
    if (isReference && points.length < 2) return null;
    strokes.push(points);
  }
  return strokes;
}

function bounds(strokes) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const stroke of strokes) for (const p of stroke) {
    left = Math.min(left, p.x); right = Math.max(right, p.x);
    top = Math.min(top, p.y); bottom = Math.max(bottom, p.y);
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function normalize(strokes) {
  const box = bounds(strokes);
  const span = Math.max(box.width, box.height, 0.00001);
  const cx = (box.left + box.right) / 2, cy = (box.top + box.bottom) / 2;
  // One shared scale for the entire character: preserve aspect, stroke spacing
  // and relative lengths. Per-stroke normalization would accept many wrong words.
  return strokes.map(stroke => stroke.map(p => ({ x: 0.5 + (p.x - cx) * 0.8 / span, y: 0.5 + (p.y - cy) * 0.8 / span })));
}

function pathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i]);
  return length;
}

function resample(points, count = SAMPLE_COUNT) {
  if (points.length === 1) return Array.from({ length: count }, () => ({ ...points[0] }));
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + distance(points[i - 1], points[i]));
  const total = lengths[lengths.length - 1];
  if (total < 0.00001) return Array.from({ length: count }, () => ({ ...points[0] }));
  const result = [];
  let segment = 1;
  for (let i = 0; i < count; i++) {
    const target = total * i / (count - 1);
    while (segment < lengths.length - 1 && lengths[segment] < target) segment++;
    const a = points[segment - 1], b = points[segment];
    const t = (target - lengths[segment - 1]) / Math.max(0.00001, lengths[segment] - lengths[segment - 1]);
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}

function strokeDistance(a, b, reverse = false) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += distance(a[i], b[reverse ? b.length - 1 - i : i]);
  const start = distance(a[0], b[reverse ? b.length - 1 : 0]);
  const end = distance(a[a.length - 1], b[reverse ? 0 : b.length - 1]);
  return 0.7 * sum / a.length + 0.15 * (start + end);
}

// Minimum-cost one-to-one stroke matching. This separates shape from order;
// requiring all strokes also prevents one correct line from satisfying several.
function assignment(costs) {
  const n = costs.length;
  const u = Array(n + 1).fill(0), v = Array(n + 1).fill(0);
  const p = Array(n + 1).fill(0), way = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(n + 1).fill(Infinity), used = Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = costs[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const result = Array(n);
  for (let j = 1; j <= n; j++) result[p[j] - 1] = j - 1;
  return result;
}

function compare(student, reference) {
  const rawNorm = normalize(student), refNorm = normalize(reference);
  const a = rawNorm.map(s => resample(s)), b = refNorm.map(s => resample(s));
  const forward = a.map(s => b.map(r => strokeDistance(s, r)));
  const backward = a.map(s => b.map(r => strokeDistance(s, r, true)));
  const costs = a.map((s, i) => b.map((r, j) => {
    const shape = Math.min(forward[i][j], backward[i][j]);
    const ratio = pathLength(rawNorm[i]) / Math.max(0.01, pathLength(refNorm[j]));
    const lengthPenalty = Math.min(0.15, Math.abs(Math.log(Math.max(0.01, ratio))) * 0.045);
    return shape + lengthPenalty;
  }));
  const map = assignment(costs);
  const distances = map.map((j, i) => costs[i][j]);
  const mean = distances.reduce((a, b) => a + b, 0) / a.length;
  const worst = Math.max(...distances);
  return { mean, worst, costs, forward, backward, map, distances, rawNorm, refNorm };
}

function pending(base, reason) {
  const automatic = base.gradingPolicy === 'automatic-v1';
  return { ...base, status: 'pending', correct: null, reasons: [...base.reasons, reason],
    needsReview: !automatic, confidence: 'unavailable',
    ...(automatic ? { needsRewrite: reason !== 'reference-unavailable', requiresTemplate: reason === 'reference-unavailable' } : {}) };
}

/**
 * raw: Array<Array<{x:number,y:number,t?:number,pressure?:number}>>.
 * reference: {character,strokes: Array<Array<[number,number]>>,strokeCount,
 * readiness:'verified'|'practice-only', ...}. Coordinates: [0,1], top-left.
 * A correct result only means this specified template passed these geometric
 * checks. It is not a general OCR or a validated measure of handwriting quality.
 * Legacy options.mode='exam' requires a reviewed template. Explicit
 * gradingPolicy='automatic-v1' grades usable templates in either mode with the
 * bounded automaticThresholds below; readiness is retained as provenance only.
 * Client options must not be trusted by the server; policy is server-owned.
 */
export function gradeStrokes(raw, reference, options = {}) {
  const mode = options.mode === 'exam' ? 'exam' : 'practice';
  const automatic = options.gradingPolicy === 'automatic-v1';
  const supplied = options.automaticThresholds || {};
  const setting = (key, min, max) => typeof supplied[key] === 'number' && Number.isFinite(supplied[key])
    ? clamp(supplied[key], min, max) : AUTOMATIC_GRADING_DEFAULTS[key];
  const thresholds = {
    meanDistance: setting('meanDistance', 0.06, 0.25),
    maxStrokeDistance: setting('maxStrokeDistance', 0.15, 0.45),
    reverseDirectionMargin: setting('reverseDirectionMargin', 0.005, 0.10),
    alternativeMargin: setting('alternativeMargin', 0, 0.05),
  };
  const base = {
    modelVersion: HANDWRITING_MODEL_VERSION,
    referenceVersion: reference?.version || null,
    character: reference?.character || null,
    gradingScope: 'specified-character-template',
    gradingPolicy: automatic ? 'automatic-v1' : 'legacy-review-v1',
    calibratedOnChildren: false,
    provisional: automatic || reference?.readiness !== 'verified',
    confidence: 'unavailable',
    confidenceBasis: 'template-geometry-not-calibrated-probability',
    ...(automatic ? { automaticThresholds: thresholds, needsRewrite: false, requiresTemplate: false } : {}),
    status: 'pending', correct: null, needsReview: true,
    strokeCount: Array.isArray(raw) ? raw.length : 0,
    expectedStrokeCount: reference?.strokeCount || reference?.strokes?.length || 0,
    shape: { status: 'pending', score: null },
    order: { status: 'pending', wrongPositions: [], reversedStrokes: [] },
    reasons: [],
  };
  const tooComplex = Array.isArray(raw) && (raw.length > HANDWRITING_INPUT_LIMITS.maxStrokes
    || raw.some(stroke => Array.isArray(stroke) && stroke.length > HANDWRITING_INPUT_LIMITS.maxPointsPerStroke)
    || raw.reduce((sum, stroke) => sum + (Array.isArray(stroke) ? stroke.length : 0), 0) > HANDWRITING_INPUT_LIMITS.maxTotalPoints);
  if (options.inputTooComplex || (automatic && tooComplex)) return pending(base, 'writing-too-complex');
  const student = parseStrokes(raw), expected = parseStrokes(reference?.strokes, true);
  if (!student) return pending(base, 'invalid-stroke-data');
  if (!expected?.length || expected.length !== base.expectedStrokeCount || reference?.readiness === 'missing') return pending(base, 'reference-unavailable');
  if (!student.length) return pending(base, 'no-writing');
  if (options.inputInterrupted) return pending(base, 'input-interrupted');
  const box = bounds(student);
  if (Math.max(box.width, box.height) < 0.08) return pending(base, 'writing-too-small');
  if (student.some(s => pathLength(s) < 0.006)) return pending(base, 'possible-accidental-touch');
  const unreviewedExam = !automatic && mode === 'exam' && reference.readiness !== 'verified';
  if (student.length !== expected.length) {
    const result = { ...base, status: 'incorrect', correct: false, needsReview: false, confidence: 'high',
      shape: { status: 'incorrect', score: 0 }, reasons: [student.length < expected.length ? 'missing-strokes' : 'extra-strokes'] };
    return unreviewedExam ? pending(result, 'reference-awaiting-review') : result;
  }

  const match = compare(student, expected);
  const shapeScore = Math.round(clamp(1 - match.mean / 0.35, 0, 1) * 100);
  const legacyShapeStatus = match.mean <= 0.10 && match.worst <= 0.20 ? 'correct'
    : match.mean >= 0.20 || match.worst >= 0.38 ? 'incorrect' : 'pending';
  const shapeStatus = automatic
    ? match.mean <= thresholds.meanDistance && match.worst <= thresholds.maxStrokeDistance ? 'correct' : 'incorrect'
    : legacyShapeStatus;
  base.shape = { status: shapeStatus, score: shapeScore,
    meanDistance: Number(match.mean.toFixed(5)), worstDistance: Number(match.worst.toFixed(5)) };
  const wrongPositions = [], reversedStrokes = [], ambiguousPositions = [];
  match.map.forEach((j, i) => {
    if (j !== i) {
      if (automatic || match.costs[i][i] - match.costs[i][j] >= 0.025) wrongPositions.push(i + 1);
      if (match.costs[i][i] - match.costs[i][j] < 0.025) ambiguousPositions.push(i + 1);
    }
    if (match.backward[i][j] + (automatic ? thresholds.reverseDirectionMargin : 0.045) < match.forward[i][j]
      && distance(match.refNorm[j][0], match.refNorm[j].at(-1)) > 0.06) reversedStrokes.push(i + 1);
  });
  base.order = { status: !automatic && shapeStatus === 'incorrect' ? 'pending'
    : wrongPositions.length || reversedStrokes.length ? 'incorrect'
    : !automatic && ambiguousPositions.length ? 'pending' : 'correct', wrongPositions, reversedStrokes, ambiguousPositions };
  if (shapeStatus === 'incorrect') base.reasons.push('shape-mismatch');
  if (shapeStatus === 'pending') base.reasons.push('shape-uncertain');
  if (wrongPositions.length) base.reasons.push('stroke-order-mismatch');
  if (reversedStrokes.length) base.reasons.push('stroke-direction-mismatch');
  if (ambiguousPositions.length) base.reasons.push(automatic ? 'automatic-order-tiebreak' : 'stroke-order-uncertain');
  if (automatic && legacyShapeStatus === 'pending') base.reasons.push('automatic-mid-band-decision');

  // If another taught, same-stroke-count character fits better, do not pass the
  // expected word merely because a generous template threshold tolerated it.
  let alternative = null;
  for (const other of (Array.isArray(options.alternatives) ? options.alternatives : []).slice(0, 200)) {
    if (!other || other.character === reference.character) continue;
    const otherStrokes = parseStrokes(other.strokes, true);
    if (otherStrokes?.length !== student.length) continue;
    const otherMatch = compare(student, otherStrokes);
    if (!alternative || otherMatch.mean < alternative.distance) alternative = { character: other.character, distance: otherMatch.mean };
  }
  if (alternative && alternative.distance + (automatic ? thresholds.alternativeMargin : 0.018) < match.mean
    && alternative.distance < (automatic ? thresholds.meanDistance : 0.10)) {
    base.confusable = { character: alternative.character, distance: Number(alternative.distance.toFixed(5)) };
    base.shape.status = 'incorrect'; base.reasons.push('closer-to-other-character');
  } else if (alternative && alternative.distance <= match.mean + 0.012 && alternative.distance < 0.10) {
    base.confusable = { character: alternative.character, distance: Number(alternative.distance.toFixed(5)) };
    if (!automatic) base.shape.status = 'pending';
    base.reasons.push(automatic ? 'automatic-confusable-tiebreak' : 'confusable-character-uncertain');
  }
  // When shape matching itself is ambiguous, its inferred stroke assignment is
  // not strong enough evidence to punish a child for an apparent order error.
  base.status = base.shape.status === 'pending' ? 'pending'
    : base.shape.status === 'incorrect' || base.order.status === 'incorrect' ? 'incorrect'
    : base.order.status === 'correct' ? 'correct' : 'pending';
  base.correct = base.status === 'pending' ? null : base.status === 'correct';
  base.needsReview = base.status === 'pending';
  base.confidence = base.reasons.some(reason => reason.includes('tiebreak')) ? 'low'
    : legacyShapeStatus === 'pending' ? 'medium' : 'high';
  return unreviewedExam ? pending(base, 'reference-awaiting-review') : base;
}
