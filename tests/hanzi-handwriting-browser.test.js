import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch {
  try { ({ chromium } = createRequire(path.join(path.dirname(process.execPath), '../node_modules/playwright/package.json'))('playwright')); }
  catch { /* Browser suite may be skipped on a minimal Node-only checkout. */ }
}
const chromePath = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined;
const browserAvailable = chromium && (!chromePath || fs.existsSync(chromePath));

test('real browser retains original ink, resizes, undoes, cancels demos, and records interrupted pointers', { skip: !browserAvailable, timeout: 30000 }, async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
    const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
    // Fulfil all resources from the checkout in-process. No external or localhost
    // network access is needed, and no real student/server data is involved.
    await page.route('https://handwriting.test/**', async route => {
      const pathname = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
      if (!pathname) {
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width"><div id="board" style="width:440px;max-width:100%"></div>' }); return;
      }
      if (!/^(hanzi-(handwriting|stroke-core)\.js|data\/hanzi-strokes\/U[0-9A-F]+\.json)$/.test(pathname)) { await route.fulfill({ status: 404 }); return; }
      const file = path.join(root, pathname);
      if (!fs.existsSync(file)) { await route.fulfill({ status: 404 }); return; }
      await route.fulfill({ contentType: file.endsWith('.js') ? 'text/javascript' : 'application/json', body: fs.readFileSync(file) });
    });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://handwriting.test/');
    await page.evaluate(async () => {
      const { createHandwriting } = await import('/hanzi-handwriting.js');
      window.pad = createHandwriting(document.querySelector('#board'), { onChange: value => { window.lastChange = value; } });
      await window.pad.load('右');
    });
    const reference = await page.evaluate(() => window.pad.getReference());
    const box = await page.locator('#board canvas').first().boundingBox();
    for (const stroke of reference.strokes) {
      await page.mouse.move(box.x + stroke[0][0] * box.width, box.y + stroke[0][1] * box.height);
      await page.mouse.down();
      for (const point of stroke.slice(1)) await page.mouse.move(box.x + point[0] * box.width, box.y + point[1] * box.height);
      await page.mouse.up();
    }
    const before = await page.evaluate(() => ({ ink: window.pad.getStrokes(), result: window.pad.grade() }));
    assert.equal(before.ink.length, 5);
    assert.equal(before.result.status, 'correct');
    assert.ok(before.ink[0][0].t >= 0);
    await page.evaluate(() => { document.querySelector('#board').style.width = '280px'; });
    await page.waitForFunction(() => document.querySelector('#board canvas').getBoundingClientRect().width < 300);
    assert.deepEqual(await page.evaluate(() => window.pad.getStrokes()), before.ink);
    assert.equal(await page.evaluate(() => window.pad.undo()), true);
    assert.equal(await page.evaluate(() => window.pad.getStrokes().length), 4);
    assert.ok((await page.evaluate(() => window.pad.grade())).reasons.includes('missing-strokes'));
    await page.evaluate(() => window.pad.clear());
    assert.deepEqual(await page.evaluate(() => window.pad.getStrokes()), []);

    // A pointercancel must not silently turn a truncated stroke into a graded mark.
    await page.evaluate(() => {
      const canvas = document.querySelector('#board canvas'), rect = canvas.getBoundingClientRect();
      const send = (name, x, y) => canvas.dispatchEvent(new PointerEvent(name, { pointerId: 77, pointerType: 'pen', isPrimary: true,
        clientX: rect.left + x * rect.width, clientY: rect.top + y * rect.height, bubbles: true, cancelable: true }));
      send('pointerdown', .2, .2); send('pointermove', .6, .6); send('pointercancel', .6, .6);
    });
    assert.equal((await page.evaluate(() => window.pad.grade())).status, 'pending');
    assert.ok((await page.evaluate(() => window.pad.grade())).reasons.includes('input-interrupted'));
    await page.evaluate(() => window.pad.undo());
    assert.equal(await page.evaluate(() => window.lastChange.inputInterrupted), false);

    assert.equal(await page.evaluate(raw => window.pad.restoreStrokes(raw), before.ink), true);
    assert.deepEqual(await page.evaluate(() => window.pad.getStrokes()), before.ink);
    assert.equal((await page.evaluate(() => window.pad.grade())).status, 'correct');
    const invalidRestore = await page.evaluate(() => [
      window.pad.restoreStrokes([[{ x: 1.5, y: .5 }]]),
      window.pad.restoreStrokes([[{ x: .5, y: NaN }]]),
      window.pad.restoreStrokes(Array(65).fill([{ x: .3, y: .5 }]))
    ]);
    assert.deepEqual(invalidRestore, [false, false, false]);
    assert.deepEqual(await page.evaluate(() => window.pad.getStrokes()), before.ink);
    assert.equal(await page.evaluate(() => {
      const raw = window.pad.getStrokes(); window.pad.restoreStrokes(raw); raw[0][0].x = .999;
      return window.pad.getStrokes()[0][0].x !== .999;
    }), true);
    await page.evaluate(() => window.pad.setDisabled(true));
    const currentBox = await page.locator('#board canvas').first().boundingBox();
    await page.mouse.move(currentBox.x + 50, currentBox.y + 50); await page.mouse.down();
    await page.mouse.move(currentBox.x + 180, currentBox.y + 180); await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => window.pad.getStrokes()), before.ink);
    assert.equal(await page.locator('#board canvas').first().getAttribute('aria-disabled'), 'true');
    await page.evaluate(() => window.pad.setDisabled(false));
    assert.equal(await page.evaluate(raw => window.pad.restoreStrokes(raw, { inputInterrupted: true }), before.ink), true);
    assert.ok((await page.evaluate(() => window.pad.grade())).reasons.includes('input-interrupted'));

    const limits = await page.evaluate(() => {
      const points = Array.from({ length: 2000 }, (_, i) => ({ x: i % 2 ? .2 : .8, y: .5 }));
      const rejected = window.pad.restoreStrokes([[...points, { x: .3, y: .3 }]]);
      const accepted = window.pad.restoreStrokes([points]);
      const canvas = document.querySelector('#board canvas'), rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 80, pointerType: 'pen', isPrimary: true,
        clientX: rect.left + .3 * rect.width, clientY: rect.top + .3 * rect.height, bubbles: true, cancelable: true }));
      return { rejected, accepted, result: window.pad.grade({ gradingPolicy: 'automatic-v1' }),
        points: window.pad.getStrokes().reduce((n, s) => n + s.length, 0), notice: document.querySelector('[role="status"]').textContent };
    });
    assert.equal(limits.rejected, false); assert.equal(limits.accepted, true);
    assert.equal(limits.points, 2001); assert.equal(limits.result.needsRewrite, true);
    assert.equal(limits.result.needsReview, false); assert.ok(limits.notice.includes('請清除'));

    await page.evaluate(async () => { await window.pad.load('一'); window.demoFinished = null; window.pad.showDemo().then(v => { window.demoFinished = v; }); });
    await page.waitForFunction(() => window.demoFinished !== null);
    assert.equal(await page.evaluate(() => window.demoFinished), true);
    assert.deepEqual(await page.evaluate(() => window.pad.getStrokes()), []);
    await page.evaluate(() => { window.demoFinished = null; window.pad.showDemo().then(v => { window.demoFinished = v; }); window.pad.clear(); });
    await page.waitForFunction(() => window.demoFinished !== null);
    assert.equal(await page.evaluate(() => window.demoFinished), false);
    await page.evaluate(raw => { window.pad.restoreStrokes(raw); window.demoFinished = null; window.pad.showDemo().then(v => { window.demoFinished = v; }); window.pad.cancelDemo(); }, before.ink);
    await page.waitForFunction(() => window.demoFinished !== null);
    assert.equal(await page.evaluate(() => window.demoFinished), false);
    assert.deepEqual(await page.evaluate(() => window.pad.getStrokes()), before.ink);
    // Trace practice stays out of the challenge draft and grade, including after a rotation.
    await page.evaluate(async raw => {
      await window.pad.load('右');
      window.pad.restoreStrokes(raw);
      window.pad.setTracePractice(true);
      window.blankNotice = window.lastChange;
    }, before.ink);
    const traceCanvas = page.locator('#board canvas').first();
    const area = await traceCanvas.boundingBox();
    await page.mouse.move(area.x + 20, area.y + 30);
    await page.mouse.down();
    await page.mouse.move(area.x + 100, area.y + 120);
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => [
      window.pad.isTracePractice(), window.blankNotice.strokeCount, window.blankNotice === window.lastChange,
      window.pad.getStrokes(), window.pad.grade().correct, window.pad.restoreStrokes(window.lastChange.strokes)
    ]), [true, 0, true, [], null, false]);
    await page.setViewportSize({ width: 840, height: 390 });
    assert.equal(await page.evaluate(() => window.pad.undo()), true);
    assert.equal(await page.evaluate(() => window.pad.isTracePractice()), true);
    await page.evaluate(() => window.pad.setTracePractice(false));
    assert.deepEqual(await page.evaluate(() => [window.pad.getStrokes(), window.lastChange.strokeCount]), [[], 0]);
    assert.equal(await page.evaluate(raw => window.pad.restoreStrokes(raw), before.ink), true);
    assert.equal(await page.evaluate(() => window.pad.grade().status), 'correct');
    await page.evaluate(() => window.pad.destroy());
    assert.equal(await page.locator('#board canvas').count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
  }
});
