import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

let chromium;
for (const base of [import.meta.url, path.join(path.dirname(process.execPath), '../node_modules/playwright/package.json')]) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch { /* Optional browser dependency. */ }
}
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const chromePath = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined;
const browserAvailable = chromium && (!chromePath || fs.existsSync(chromePath));
const origin = 'https://handwriting-navigation.test';
const referenceFor = char => JSON.parse(fs.readFileSync(path.join(root, `data/hanzi-strokes/U${char.codePointAt(0).toString(16).toUpperCase()}.json`), 'utf8'));

async function saved(page) {
  return page.evaluate(() => {
    const key = Object.keys(sessionStorage).find(key => key.includes('hanzi.round.'));
    return key ? JSON.parse(sessionStorage.getItem(key)) : null;
  });
}
async function prepOnly(page) {
  await page.locator('#lesson-details').evaluate(el => { el.open = true; });
  for (const input of await page.locator('#lesson-options input').all()) await input.setChecked(await input.getAttribute('value') === '0');
  await page.locator('#count').selectOption('5');
}
async function drawStroke(page, points, lift = true) {
  const canvas = page.locator('#handwriting canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + points[0][0] * box.width, box.y + points[0][1] * box.height);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + x * box.width, box.y + y * box.height);
  if (lift) await page.mouse.up();
}
async function routeApp(page, intercept = async () => false) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { await route.abort(); return; }
    if (await intercept(route, url)) return;
    const file = path.resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { await route.fulfill({ status: 404 }); return; }
    const contentType = ({ '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream';
    await route.fulfill({ contentType, body: fs.readFileSync(file) });
  });
}

test('app loading, reload during a stroke, double next/resume, old demo completion and failed reference retry stay on the right question', { skip: !browserAvailable, timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { Math.random = () => .999999; });
    let holdPath = '/data/hanzi-strokes/U4E00.json', release, heldResolve, failHeld = false;
    let held = new Promise(resolve => { heldResolve = resolve; });
    await routeApp(page, async (route, url) => {
      if (url.pathname !== holdPath) return false;
      holdPath = null;
      const pause = new Promise(resolve => { release = resolve; });
      heldResolve(); await pause;
      if (failHeld) { failHeld = false; await route.fulfill({ status: 503 }); return true; }
      return false;
    });
    await page.goto(origin + '/hanzi.html?demo=1');
    await page.locator('#entry').waitFor({ state: 'visible' }); await prepOnly(page);
    await page.locator('[data-mode="writing"]').click(); await held;
    assert.equal(await page.locator('#back-entry').isDisabled(), true);
    assert.equal(await page.locator('#submit').isDisabled(), true);
    await page.evaluate(() => { document.querySelector('#back-entry').onclick(); document.querySelector('#next').onclick(); document.querySelector('#resume').onclick(); });
    assert.equal(await page.locator('#play').isVisible(), true);
    assert.equal((await saved(page)).index, 0);
    release(); await page.waitForFunction(() => !document.querySelector('#demo-ink').disabled);
    const first = await saved(page), q = first.round.questions[0], q2 = first.round.questions[1];
    assert.equal(q.character, '一'); assert.equal(q2.character, '二');
    const reference = referenceFor(q.character);

    await drawStroke(page, reference.strokes[0], false);
    const midStroke = await saved(page);
    assert.equal(midStroke.inputInterrupted, true, 'a still-down pointer is unsafe to restore as a finished stroke');
    assert.equal(await page.locator('#submit').isDisabled(), true);
    await page.reload(); await page.mouse.up(); await page.locator('#entry').waitFor({ state: 'visible' });
    await page.evaluate(() => { document.querySelector('#resume').onclick(); document.querySelector('#resume').onclick(); });
    await page.waitForFunction(() => document.querySelector('#ink-status').textContent.includes('中斷'));
    assert.deepEqual((await saved(page)).strokes, midStroke.strokes);
    assert.equal((await saved(page)).index, 0);
    assert.equal(await page.locator('#submit').isDisabled(), true);
    await page.locator('#undo-ink').click();
    for (const points of reference.strokes) await drawStroke(page, points);
    assert.equal((await saved(page)).inputInterrupted, false);
    await page.locator('#submit').click(); await page.locator('#next').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#feedback').getAttribute('data-state'), 'correct');
    const completed = await saved(page);
    await drawStroke(page, [[.2, .2], [.8, .8]]);
    assert.deepEqual((await saved(page)).strokes, completed.strokes, 'feedback locks the submitted ink');

    // The old demonstration resolves while the new question waits for data.
    // Its completion must not re-enable the new question or change its state.
    holdPath = '/data/hanzi-strokes/U4E8C.json'; failHeld = true;
    held = new Promise(resolve => { heldResolve = resolve; });
    await page.locator('#demo-ink').click();
    await page.evaluate(() => { document.querySelector('#next').onclick(); document.querySelector('#next').onclick(); });
    await held;
    await page.evaluate(() => Promise.resolve());
    assert.equal(await page.locator('#progress-label').textContent(), '2 / 5');
    assert.equal(await page.locator('#demo-ink').isDisabled(), true);
    assert.equal(await page.locator('#back-entry').isDisabled(), true);
    await page.evaluate(() => document.querySelector('#back-entry').onclick());
    assert.equal(await page.locator('#play').isVisible(), true);
    release();
    await page.waitForFunction(() => document.querySelector('#ink-status').textContent.includes('暫時無法'));
    assert.equal(await page.locator('#back-entry').isDisabled(), false);
    assert.equal(await page.locator('#submit').isDisabled(), true);
    assert.equal((await saved(page)).index, 1);
    assert.deepEqual((await saved(page)).strokes, []);
    assert.equal((await saved(page)).answers.length, 1);
    assert.deepEqual((await saved(page)).answers[0].answer.strokes, completed.answers[0].answer.strokes);

    await page.locator('#back-entry').click(); await page.locator('#leave').click();
    await page.evaluate(() => { document.querySelector('#resume').onclick(); document.querySelector('#resume').onclick(); });
    await page.waitForFunction(() => !document.querySelector('#demo-ink').disabled);
    const retry = await saved(page);
    assert.equal(retry.index, 1); assert.equal(retry.round.questions[retry.index].character, '二');
    assert.deepEqual(retry.strokes, []); assert.deepEqual(retry.currentAnswer, {});
    assert.equal(await page.locator('#handwriting canvas').first().getAttribute('aria-disabled'), 'false');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('demo boot tolerates a throwing sessionStorage getter and visibly warns about unsaved progress', { skip: !browserAvailable, timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
    });
    await routeApp(page);
    await page.goto(origin + '/hanzi.html?demo=1'); await page.locator('#entry').waitFor({ state: 'visible' });
    await prepOnly(page); await page.locator('[data-mode="writing"]').click();
    await page.waitForFunction(() => !document.querySelector('#demo-ink').disabled);
    assert.ok((await page.locator('#storage-warning').textContent()).includes('無法保存'));
    assert.equal(await page.locator('#handwriting canvas').first().getAttribute('aria-disabled'), 'false');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
