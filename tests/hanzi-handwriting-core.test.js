import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gradeStrokes, HANDWRITING_MODEL_VERSION, AUTOMATIC_GRADING_DEFAULTS, HANDWRITING_INPUT_LIMITS } from '../hanzi-stroke-core.js';

const dataDir = new URL('../data/hanzi-strokes/', import.meta.url);
const read = char => JSON.parse(fs.readFileSync(new URL(`U${char.codePointAt(0).toString(16).toUpperCase()}.json`, dataDir), 'utf8'));
const asRaw = strokes => strokes.map(s => s.map(([x, y]) => ({ x, y })));
const allReferences = () => fs.readdirSync(dataDir).filter(f => /^U[0-9A-F]+\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(new URL(f, dataDir), 'utf8')));

test('all installed Taiwan templates reproduce as practice matches without modifying original ink', () => {
  const references = allReferences();
  assert.equal(references.length, 84);
  for (const reference of references) {
    const raw = asRaw(reference.strokes), before = JSON.stringify(raw);
    const result = gradeStrokes(raw, reference, { alternatives: references });
    assert.equal(result.status, 'correct', reference.character);
    assert.equal(result.shape.status, 'correct'); assert.equal(result.order.status, 'correct');
    assert.equal(result.modelVersion, HANDWRITING_MODEL_VERSION);
    assert.equal(result.calibratedOnChildren, false);
    assert.equal(JSON.stringify(raw), before);
  }
});

test('moderate coordinate jitter and natural translation/scale do not demand pixel-perfect tracing', () => {
  for (const char of '右手這花那') {
    const reference = read(char);
    const raw = asRaw(reference.strokes).map((s, i) => s.map((p, j) => ({
      x: p.x * 0.82 + 0.07 + 0.009 * Math.sin(i * 3 + j),
      y: p.y * 0.82 + 0.04 + 0.009 * Math.cos(i + j * 3),
    })));
    assert.equal(gradeStrokes(raw, reference).status, 'correct', char);
  }
});

test('same outline in reversed stroke order is a shape pass and an order failure', () => {
  for (const char of '左右手花這') {
    const reference = read(char), raw = asRaw(reference.strokes).reverse();
    const result = gradeStrokes(raw, reference);
    assert.equal(result.shape.status, 'correct', char);
    assert.equal(result.order.status, 'incorrect', char);
    assert.equal(result.status, 'incorrect', char);
    assert.ok(result.order.wrongPositions.length);
  }
});

test('backwards strokes are distinguished from order and shape', () => {
  const reference = read('一');
  const result = gradeStrokes(asRaw(reference.strokes).map(s => s.reverse()), reference);
  assert.equal(result.shape.status, 'correct');
  assert.deepEqual(result.order.reversedStrokes, [1]);
  assert.equal(result.status, 'incorrect');
});

test('missing or extra genuine strokes do not pass', () => {
  const reference = read('右'), raw = asRaw(reference.strokes);
  const missing = gradeStrokes(raw.slice(0, -1), reference);
  const extra = gradeStrokes([...raw, raw[0]], reference);
  assert.equal(missing.status, 'incorrect'); assert.ok(missing.reasons.includes('missing-strokes'));
  assert.equal(extra.status, 'incorrect'); assert.ok(extra.reasons.includes('extra-strokes'));
});

test('all exact same-count wrong characters in this teaching set are rejected or sent for review', () => {
  const references = allReferences();
  let pairs = 0;
  for (const expected of references) for (const other of references) {
    if (expected.character === other.character || expected.strokeCount !== other.strokeCount) continue;
    pairs++;
    assert.notEqual(gradeStrokes(asRaw(other.strokes), expected).status, 'correct', `${other.character} must not pass as ${expected.character}`);
  }
  assert.ok(pairs > 200);
});

test('a near shape matching another taught word is not silently accepted', () => {
  const expected = read('左'), other = read('右');
  const result = gradeStrokes(asRaw(other.strokes), expected, { alternatives: [other] });
  assert.equal(result.status, 'incorrect');
  assert.equal(result.confusable.character, '右');
  assert.ok(result.reasons.includes('closer-to-other-character'));
});

test('blank, accidental dot, interrupted pointer, and illegibly small writing await review', () => {
  const reference = read('右');
  assert.ok(gradeStrokes([], reference).reasons.includes('no-writing'));
  const raw = asRaw(reference.strokes);
  assert.equal(gradeStrokes([...raw, [{ x: 0.2, y: 0.2 }]], reference).status, 'pending');
  assert.equal(gradeStrokes(raw, reference, { inputInterrupted: true }).status, 'pending');
  const tiny = raw.map(s => s.map(p => ({ x: p.x * 0.01, y: p.y * 0.01 })));
  assert.ok(gradeStrokes(tiny, reference).reasons.includes('writing-too-small'));
});

test('invalid data is bounded and never treated as a successful answer', () => {
  const reference = read('右');
  for (const raw of [null, {}, [[{ x: NaN, y: 0.1 }]], [[{ x: Infinity, y: 0 }]], [[{ x: -5, y: 4 }]], Array(65).fill([{ x: 0, y: 0 }]), [[{ x: '0.2', y: 0.1 }]]]) {
    const result = gradeStrokes(raw, reference);
    assert.equal(result.status, 'pending'); assert.ok(result.reasons.includes('invalid-stroke-data'));
  }
});

test('missing or inconsistent reference fails closed', () => {
  const reference = read('手'), raw = asRaw(reference.strokes);
  assert.equal(gradeStrokes(raw, null).status, 'pending');
  assert.ok(gradeStrokes(raw, { ...reference, strokeCount: 5 }).reasons.includes('reference-unavailable'));
});

test('exam scoring cannot promote an unreviewed template to an automatic mark', () => {
  const reference = read('手'), raw = asRaw(reference.strokes);
  const result = gradeStrokes(raw, { ...reference, readiness: 'practice-only' }, { mode: 'exam' });
  assert.equal(result.status, 'pending'); assert.equal(result.correct, null);
  assert.equal(result.shape.status, 'correct');
  assert.ok(result.reasons.includes('reference-awaiting-review'));
  assert.equal(gradeStrokes(raw, { ...reference, readiness: 'verified' }, { mode: 'exam' }).status, 'correct');
});

test('prototype evidence is explicitly labelled and deterministic', () => {
  const reference = read('花'), raw = asRaw(reference.strokes);
  assert.deepEqual(gradeStrokes(raw, reference), gradeStrokes(raw, reference));
  assert.equal(gradeStrokes(raw, reference).gradingScope, 'specified-character-template');
});

test('automatic-v1 grades every available practice-only template in exams without a review queue', () => {
  const references = allReferences();
  for (const reference of references) {
    const result = gradeStrokes(asRaw(reference.strokes), reference,
      { mode: 'exam', gradingPolicy: 'automatic-v1', alternatives: references });
    assert.equal(result.status, 'correct', reference.character);
    assert.equal(result.correct, true); assert.equal(result.needsReview, false);
    assert.equal(result.provisional, true); assert.equal(result.calibratedOnChildren, false);
    assert.equal(result.gradingPolicy, 'automatic-v1');
    assert.deepEqual(result.automaticThresholds, AUTOMATIC_GRADING_DEFAULTS);
    assert.ok(!result.reasons.includes('reference-awaiting-review'));
  }
});

test('automatic-v1 uses an explicit adjustable middle threshold instead of pending geometry', () => {
  const reference = read('手');
  const raw = asRaw(reference.strokes).map(s => s.map(p => ({ x: .5 + (p.x - .5) * .35, y: p.y })));
  assert.equal(gradeStrokes(raw, reference).status, 'pending');
  const automatic = gradeStrokes(raw, reference, { gradingPolicy: 'automatic-v1' });
  assert.equal(automatic.status, 'correct'); assert.equal(automatic.needsReview, false);
  assert.equal(automatic.confidence, 'medium'); assert.ok(automatic.reasons.includes('automatic-mid-band-decision'));
  const stricter = gradeStrokes(raw, reference, { gradingPolicy: 'automatic-v1', automaticThresholds: { meanDistance: .08 } });
  assert.equal(stricter.status, 'incorrect'); assert.equal(stricter.needsReview, false);
});

test('automatic-v1 resolves wrong order, backwards writing, and all same-count wrong templates', () => {
  const reference = read('右'), raw = asRaw(reference.strokes);
  const policy = { gradingPolicy: 'automatic-v1', mode: 'exam' };
  assert.equal(gradeStrokes(raw.slice().reverse(), reference, policy).status, 'incorrect');
  assert.equal(gradeStrokes(raw.map(s => s.slice().reverse()), reference, policy).status, 'incorrect');
  const references = allReferences();
  for (const expected of references) for (const other of references) {
    if (expected.character === other.character || expected.strokeCount !== other.strokeCount) continue;
    const result = gradeStrokes(asRaw(other.strokes), expected, { ...policy, alternatives: references });
    assert.equal(result.status, 'incorrect', `${other.character} as ${expected.character}`);
    assert.equal(result.needsReview, false);
  }
});

test('automatic-v1 cannot invent a missing reference and asks to rewrite interrupted input', () => {
  const reference = read('手'), raw = asRaw(reference.strokes), policy = { gradingPolicy: 'automatic-v1' };
  const missing = gradeStrokes(raw, null, policy);
  assert.equal(missing.status, 'pending'); assert.equal(missing.correct, null);
  assert.equal(missing.requiresTemplate, true); assert.equal(missing.needsReview, false);
  const interrupted = gradeStrokes(raw, reference, { ...policy, inputInterrupted: true });
  assert.equal(interrupted.status, 'pending'); assert.equal(interrupted.needsRewrite, true);
  assert.equal(interrupted.needsReview, false);
  const invalid = gradeStrokes([[{ x: 8, y: 9 }]], reference, policy);
  assert.equal(invalid.status, 'pending'); assert.equal(invalid.needsRewrite, true);
});

test('automatic-v1 enforces the same 2000-point limit before scoring, without truncation', () => {
  assert.equal(HANDWRITING_INPUT_LIMITS.maxTotalPoints, 2000);
  assert.equal(HANDWRITING_INPUT_LIMITS.maxPointsPerStroke, 2000);
  const reference = read('一');
  const points = Array.from({ length: 2001 }, (_, i) => ({ x: .1 + .8 * i / 2000, y: .5 }));
  const raw = [points], original = JSON.stringify(raw);
  const result = gradeStrokes(raw, reference, { gradingPolicy: 'automatic-v1' });
  assert.equal(result.status, 'pending'); assert.equal(result.needsRewrite, true); assert.equal(result.needsReview, false);
  assert.ok(result.reasons.includes('writing-too-complex')); assert.equal(JSON.stringify(raw), original);
  const split = gradeStrokes([points.slice(0, 1000), points.slice(1000)], reference, { gradingPolicy: 'automatic-v1' });
  assert.ok(split.reasons.includes('writing-too-complex'));
});
