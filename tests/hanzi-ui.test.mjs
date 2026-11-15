import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { splitBopomofo, questionPool } from '../hanzi-bank.js';

let chromium;
for (const base of [import.meta.url, path.join(path.dirname(process.execPath), '../node_modules/playwright/package.json')]) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch { /* Optional browser dependency. */ }
}
const root = fileURLToPath(new URL('../', import.meta.url));
const chromePath = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined;
const browserAvailable = chromium && (!chromePath || fs.existsSync(chromePath));
const preview = path.join(root, 'teacher-preview/hanzi-offline.html');
const screenshotDirectory = process.env.HANZI_SCREENSHOT_DIR || path.join(root, 'docs/hanzi-qa');

async function state(page, offline = true) {
  return page.evaluate(offline => {
    const key = Object.keys(sessionStorage).find(key => key.includes('hanzi.round.') && (!offline || key.startsWith('hanzi.offline.')));
    return key ? JSON.parse(sessionStorage.getItem(key)) : null;
  }, offline);
}
async function chooseLesson(page, lessonId = '0') {
  await page.locator('#lesson-details').evaluate(element => { element.open = true; });
  for (const input of await page.locator('#lesson-options input').all()) {
    await input.setChecked((await input.getAttribute('value')) === lessonId);
  }
  await page.locator('#count').selectOption('5');
}
async function chooseReading(page, answer) {
  for (const part of ['initial', 'rime', 'tone']) {
    const index = ['initial', 'rime', 'tone'].indexOf(part);
    await page.locator('#answer-slots button').nth(index).click();
    const value = answer[part];
    const label = part === 'tone' ? ({ 1: '一聲', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙' })[value]
      : value || (part === 'initial' ? '不用聲符' : '不用韻符');
    await page.locator('#symbol-palette').getByRole('button', { name: label, exact: true }).click();
  }
}
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, JSON.stringify(dimensions));
}
async function stroke(page, coordinates) {
  const canvas = page.locator('#handwriting canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  const rect = await canvas.boundingBox();
  await page.mouse.move(rect.x + coordinates[0][0] * rect.width, rect.y + coordinates[0][1] * rect.height);
  await page.mouse.down();
  for (const [x, y] of coordinates.slice(1)) await page.mouse.move(rect.x + x * rect.width, rect.y + y * rect.height);
  await page.mouse.up();
}

test('single-file preview embeds all data and disallows external connections', () => {
  const html = fs.readFileSync(preview, 'utf8');
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /84 embedded stroke references/);
  assert.match(html, /offline_network_disabled/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel="stylesheet"|<img[^>]+src="(?!data:)/);
  assert.ok(Buffer.byteLength(html) < 2 * 1024 * 1024, 'A complete preview should remain compact');
});

const backend = path.resolve(root, '../backend-hanzi-20261115');
test('unmodified student app completes a real fixture assignment, exam and idempotent card draw', {
  skip: !browserAvailable || !fs.existsSync(path.join(backend, 'tests/hanzi-fixture.mjs')), timeout: 60000
}, async () => {
  const { createHanziFixture, FIXTURE_TEACHER } = await import(pathToFileURL(path.join(backend, 'tests/hanzi-fixture.mjs')));
  const { drawHanziCard, HANZI_REWARD_CARDS } = await import(pathToFileURL(path.join(backend, 'source/hanzi-rewards.js')));
  const seedCatalog = JSON.parse(fs.readFileSync(path.join(root, 'data/hanzi-curriculum.json'), 'utf8'));
  const fixture = await createHanziFixture({ seedCatalog, questionPool, drawCard: drawHanziCard, rewardCards: HANZI_REWARD_CARDS });
  // Only the isolated in-memory SQLite database is changed. The legacy card
  // table is required by the production card service's cross-catalog dedupe.
  fixture.sqlite.exec('CREATE TABLE star_card_ownership(seat TEXT,character TEXT,PRIMARY KEY(seat,character));');
  const origin = 'http://127.0.0.1:32117';
  async function teacher(action, payload) {
    const response = await fixture.api.fetch(new Request(origin + '/admin/api/hanzi/' + action, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + FIXTURE_TEACHER },
      body: JSON.stringify({ classId: 'main', ...payload }) }), fixture.env);
    const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result)); return result;
  }
  const common = { revision: 0, mode: 'reading', termId: seedCatalog.semesterId, lessonIds: ['0'], count: 1,
    studentSeats: [fixture.student.seat], startsAt: Date.now() - 1000, endsAt: Date.now() + 600000, enabled: true };
  await teacher('assignment-save', { ...common, id: 'ui-assignment', title: '瀏覽器測試作業', requiredRounds: 1 });
  const rewardId = HANZI_REWARD_CARDS[0].id;
  await teacher('exam-save', { ...common, id: 'ui-exam', title: '瀏覽器測試小考', rewardCardIds: [rewardId] });
  const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    const errors = [], external = [], apiStatuses = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) { external.push(url.href); await route.abort(); return; }
      if (url.pathname === '/hanzi-fixture/session') { await route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture.student) }); return; }
      if (url.pathname === '/api') { await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ avatar: 'rabbit', nickname: '本機測試夥伴' }) }); return; }
      if (url.pathname.startsWith('/hanzi/')) {
        const response = await fixture.api.fetch(new Request(url.href, { method: request.method(), headers: request.headers(), body: request.postData() }), fixture.env);
        apiStatuses.push({ path: url.pathname, status: response.status });
        await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) }); return;
      }
      const file = path.resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { await route.fulfill({ status: 404 }); return; }
      const contentType = ({ '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml' })[path.extname(file)] || 'application/octet-stream';
      await route.fulfill({ contentType, body: fs.readFileSync(file) });
    });
    await page.goto(origin + '/hanzi.html?fixture=1');
    await page.locator('#entry').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#identity').textContent(), fixture.student.seat + ' 號');
    assert.equal(await page.locator('#hero-name').textContent(), '本機測試夥伴');
    await page.locator('#tasks-button').click();
    await page.locator('#task-list .task-card').first().waitFor();
    await page.locator('#task-list .task-card').filter({ hasText: '瀏覽器測試作業' }).getByRole('button').click();
    await page.locator('#play').waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const monster = document.querySelector('.monster-canvas'), hero = document.querySelector('#hero canvas');
      return monster?.dataset.ready && hero?.dataset.ready;
    });
    for (const selector of ['.monster-canvas', '#hero canvas']) {
      const drawing = await page.locator(selector).evaluate(canvas => {
        const style = getComputedStyle(canvas), rect = canvas.getBoundingClientRect();
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) opaque++;
        return { display: style.display, visibility: style.visibility, opacity: Number(style.opacity), width: rect.width, opaque };
      });
      assert.notEqual(drawing.display, 'none', selector); assert.equal(drawing.visibility, 'visible', selector);
      assert.equal(drawing.opacity, 1, selector); assert.ok(drawing.width > 50 && drawing.opaque > 100, selector + JSON.stringify(drawing));
    }
    let saved = await state(page, false);
    await chooseReading(page, splitBopomofo(saved.round.questions[0].bopomofo));
    await page.locator('#submit').click(); await page.locator('#next').click();
    await page.waitForFunction(() => !document.querySelector('#again').disabled);
    assert.match(await page.locator('#result-score').textContent(), /1\s*\/\s*1/);
    assert.match(await page.locator('#save-status').textContent(), /紀錄已儲存/);
    const homework = fixture.sqlite.prepare("SELECT result FROM hanzi_runs WHERE assignment_id='ui-assignment'").get();
    assert.equal(JSON.parse(homework.result).correct, 1);
    await page.locator('#again').click(); await page.locator('#tasks-button').click();
    const homeworkCard = page.locator('#task-list .task-card').filter({ hasText: '瀏覽器測試作業' });
    await homeworkCard.waitFor(); assert.equal(await homeworkCard.getByRole('button').isDisabled(), true);
    assert.match(await homeworkCard.textContent(), /已完成 1 \/ 1 回/);
    await page.locator('#task-list .task-card').filter({ hasText: '瀏覽器測試小考' }).getByRole('button').click();
    await page.locator('#play').waitFor({ state: 'visible' });
    saved = await state(page, false);
    await chooseReading(page, splitBopomofo(saved.round.questions[0].bopomofo));
    await page.locator('#submit').click(); await page.locator('#next').click();
    await page.waitForFunction(() => !document.querySelector('#again').disabled);
    await page.locator('#card-reward').getByRole('button', { name: /領取小考卡片/ }).click();
    await page.waitForFunction(() => document.querySelector('#card-reward').textContent.includes('已加入收藏'));
    assert.equal(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM hanzi_card_ownership').get().count, 1);
    assert.equal(fixture.sqlite.prepare('SELECT character FROM hanzi_card_ownership').get().character, rewardId);
    await page.locator('#again').click(); await page.locator('#tasks-button').click();
    await page.locator('#task-list .task-card').filter({ hasText: '瀏覽器測試小考' }).getByRole('button', { name: '查看成績與卡片' }).click();
    await page.locator('#result').waitFor({ state: 'visible' });
    await page.locator('#card-reward').getByRole('button', { name: /領取小考卡片/ }).click();
    await page.waitForFunction(() => document.querySelector('#card-reward').textContent.includes('已加入收藏'));
    assert.equal(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM hanzi_card_ownership').get().count, 1, 'reopening a submitted exam cannot duplicate cards');
    assert.ok(apiStatuses.some(row => row.path === '/hanzi/card-draw' && row.status === 200));
    assert.ok(apiStatuses.every(row => row.status === 200), JSON.stringify(apiStatuses));
    assert.deepEqual(external, []); assert.deepEqual(errors, []);
  } finally { await browser.close(); fixture.close(); }
});

test('offline app completes a mixed-result reading round and retries the precise notebook question', { skip: !browserAvailable, timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await page.goto(pathToFileURL(preview).href + '?demo=0');
    await page.locator('#entry').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#identity').textContent(), '老師試玩', 'offline mode is forced even if the URL says demo=0');
    assert.equal(await page.locator('#lesson-options input').count(), 7);
    assert.equal(await page.locator('.forest-art img').evaluate(img => img.complete && img.naturalWidth > 0), true);
    await chooseLesson(page);
    await page.locator('[data-mode="reading"]').click();
    await page.locator('#play').waitFor({ state: 'visible' });
    let wrongQuestion;
    for (let i = 0; i < 5; i++) {
      const saved = await state(page), q = saved.round.questions[saved.index];
      const answer = splitBopomofo(q.bopomofo);
      if (i === 0) { wrongQuestion = q; answer.tone = answer.tone === '1' ? '2' : '1'; }
      await chooseReading(page, answer);
      await page.locator('#submit').click();
      await page.locator('#next').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#feedback').getAttribute('data-state'), i === 0 ? 'incorrect' : 'correct');
      assert.equal(await page.locator('#hero-hp').getAttribute('value'), '4');
      if (i === 1) {
        assert.match(await page.locator('#battle-message').textContent(), /出招/);
        assert.equal(await page.locator('#hero img').evaluate(img => img.complete && img.naturalWidth > 0), true);
        assert.equal(await page.locator('.monster-sprite').evaluate(img => img.complete && img.naturalWidth > 0), true);
        assert.equal(await page.locator('.monster-sprite').isVisible(), true, 'loaded portrait must not be hidden by the production animated-sprite CSS');
        assert.equal(await page.locator('.monster-sprite').evaluate(img => getComputedStyle(img).visibility), 'visible');
      }
      await noOverflow(page);
      await page.locator('#next').click();
    }
    await page.locator('#again').waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('#again').disabled);
    assert.match(await page.locator('#result-score').textContent(), /4\s*\/\s*5/);
    assert.equal(await page.locator('.answer-review').count(), 5);
    assert.equal(await state(page), null, 'receipt clears only the finished round');
    await page.locator('#again').click();
    await page.locator('#notebook-button').click();
    await page.locator('#notebook-list .task-card').waitFor();
    assert.equal(await page.locator('#notebook-list .task-card').count(), 1);
    assert.match(await page.locator('#notebook-list').textContent(), new RegExp(wrongQuestion.word));
    await page.locator('#notebook-list button').click();
    await page.locator('#play').waitFor({ state: 'visible' });
    assert.equal((await state(page)).round.questions[0].id, wrongQuestion.id);
    await chooseReading(page, splitBopomofo(wrongQuestion.bopomofo));
    await page.locator('#submit').click(); await page.locator('#next').click();
    await page.waitForFunction(() => !document.querySelector('#again').disabled);
    await page.locator('#again').click(); await page.locator('#notebook-button').click();
    await page.waitForFunction(() => !document.querySelector('#notebook-list').textContent.includes('正在'));
    assert.equal(await page.locator('#notebook-list .task-card').count(), 0);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('offline handwriting restores original ink and remains usable at desktop, iPad and narrow widths', { skip: !browserAvailable, timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await page.goto(pathToFileURL(preview).href);
    await page.locator('#entry').waitFor({ state: 'visible' });
    fs.mkdirSync(screenshotDirectory, { recursive: true });
    for (const [width, height] of [[1024,768], [768,1024], [390,844]]) {
      await page.setViewportSize({ width, height }); await noOverflow(page);
      await page.screenshot({ path: path.join(screenshotDirectory, `hanzi-entry-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 768, height: 1024 });
    await chooseLesson(page);
    await page.locator('[data-mode="writing"]').click();
    await page.waitForFunction(() => !document.querySelector('#demo-ink').disabled);
    const first = await state(page), q = first.round.questions[0];
    assert.equal(await page.locator('#word .target .word-char').count(), 0, 'writing does not expose the target Hanzi');
    assert.equal(await page.locator('#word .word-unit:not(.target) .zhuyin-stack').count(), [...q.word].length - 1);
    const reference = JSON.parse(fs.readFileSync(path.join(root, `data/hanzi-strokes/U${q.character.codePointAt(0).toString(16).toUpperCase()}.json`), 'utf8'));
    const board = await page.locator('#handwriting canvas').first().boundingBox();
    assert.ok(board.width >= 350, 'iPad writing board should be at least about ten centimetres wide');
    assert.ok(Math.abs(board.width - board.height) <= 1);
    await stroke(page, reference.strokes[0]);
    const savedInk = (await state(page)).strokes;
    assert.equal(savedInk.length, 1);
    await page.reload(); await page.locator('#entry').waitFor({ state: 'visible' });
    await page.locator('#resume').click();
    await page.waitForFunction(() => document.querySelector('#ink-status').textContent.includes('1'));
    assert.deepEqual((await state(page)).strokes, savedInk, 'refresh preserves original coordinates, not a template copy');
    for (const [width, height] of [[1024,768], [768,1024], [390,844]]) {
      await page.setViewportSize({ width, height }); await noOverflow(page);
      const size = await page.locator('#handwriting canvas').first().boundingBox();
      assert.ok(size.width >= Math.min(280, width - 60));
      assert.ok(Math.abs(size.width - size.height) <= 1);
      await page.screenshot({ path: path.join(screenshotDirectory, `hanzi-writing-${width}.png`), fullPage: true });
    }
    await page.locator('#undo-ink').click();
    assert.equal((await state(page)).strokes.length, 0);
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const points of reference.strokes) await stroke(page, points);
    await page.locator('#submit').click();
    await page.locator('#next').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#feedback').getAttribute('data-state'), 'correct');
    assert.doesNotMatch(await page.locator('#feedback').textContent(), /老師.*(確認|複核|幫忙)/);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    console.log('Hanzi UI screenshots:', screenshotDirectory);
  } finally { await browser.close(); }
});
