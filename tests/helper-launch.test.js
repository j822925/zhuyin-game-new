import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {helperLaunchPlan, mountHelperLaunch, showHelperReturnHint} from '../helper-launch.js';

const base = 'https://j822925.github.io/zhuyin-game-new/';
const version = '20261022-audio1';
const ipad = {
  userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_7 like Mac OS X) AppleWebKit/605.1.15 Version/17.7 Mobile/15E148 Safari/604.1',
  platform: 'iPad', maxTouchPoints: 5, standalone: true
};
const desktopIpad = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/26.1 Mobile/15E148 Safari/604.1',
  platform: 'MacIntel', maxTouchPoints: 5, standalone: true
};

function browserURL(plan) { return new URL(plan.browserUrl); }
function checkHelperTarget(plan, origin = 'https://j822925.github.io', directory = '/zhuyin-game-new/') {
  const url = browserURL(plan);
  assert.equal(url.origin, origin);
  assert.equal(url.pathname, directory + 'zhuyin-helper.html');
  assert.equal(url.hash, '');
  assert.equal(url.searchParams.get('v'), version);
  assert.equal(url.username, '');
  assert.equal(url.password, '');
  if (plan.safariUrl) {
    assert.equal(plan.safariUrl, plan.browserUrl.replace(/^https:/, 'x-safari-https:'));
  }
}

test('modern iPad Home Screen gets an explicit Safari handoff to the existing helper', () => {
  const plan = helperLaunchPlan(base + 'zhuyin-helper.html?class=main', ipad);
  assert.equal(plan.standalone, true);
  assert.equal(plan.major, 17);
  assert.match(plan.safariUrl, /^x-safari-https:/);
  assert.equal(browserURL(plan).searchParams.get('class'), 'main');
  assert.equal(browserURL(plan).searchParams.get('source'), 'homescreen-helper');
  checkHelperTarget(plan);
});

test('desktop-style iPad UA is recognized by MacIntel plus touch points', () => {
  const plan = helperLaunchPlan(base + 'zhuyin-helper.html?class=grade2', desktopIpad);
  assert.equal(plan.standalone, true);
  assert.equal(plan.major, 26);
  assert.equal(browserURL(plan).searchParams.get('class'), 'grade2');
  assert.ok(plan.safariUrl);
  checkHelperTarget(plan);
});

test('display-mode standalone works even if navigator.standalone is false', () => {
  const plan = helperLaunchPlan(base, {...ipad, standalone: false, displayStandalone: true});
  assert.equal(plan.standalone, true);
  assert.ok(plan.safariUrl);
  checkHelperTarget(plan);
});

test('ordinary Safari stays in the browser and does not inherit a handoff source', () => {
  for (const env of [ipad, desktopIpad]) {
    const plan = helperLaunchPlan(base + 'zhuyin-helper.html?source=homescreen-helper', {...env, standalone: false});
    assert.equal(plan.standalone, false);
    assert.equal(plan.safariUrl, null);
    assert.equal(browserURL(plan).searchParams.has('source'), false);
    checkHelperTarget(plan);
  }
});

test('Android, Windows and non-touch Mac standalone do not receive an Apple scheme', () => {
  for (const env of [
    {userAgent: 'Android Chrome/140.0', platform: 'Linux armv8', maxTouchPoints: 5, standalone: true},
    {userAgent: 'Windows NT 10.0 Chrome/140.0', platform: 'Win32', standalone: true},
    {...desktopIpad, maxTouchPoints: 0},
    {...desktopIpad, maxTouchPoints: 1}
  ]) {
    const plan = helperLaunchPlan(base, env);
    assert.equal(plan.standalone, false);
    assert.equal(plan.safariUrl, null);
    assert.equal(browserURL(plan).searchParams.has('source'), false);
  }
});

test('iPadOS 16 and unknown versions retain an ordinary URL rather than claiming a working scheme', () => {
  for (const userAgent of ['iPad CPU OS 16_7 Version/16.7 Safari/605.1', 'iPad']) {
    const plan = helperLaunchPlan(base, {...ipad, userAgent});
    assert.equal(plan.standalone, true);
    assert.equal(plan.safariUrl, null);
    assert.equal(browserURL(plan).protocol, 'https:');
    assert.equal(browserURL(plan).searchParams.get('source'), 'homescreen-helper');
  }
});

test('local HTTP preview never produces an unsupported x-safari-https URL', () => {
  const plan = helperLaunchPlan('http://127.0.0.1:8093/zhuyin-helper.html?class=grade2&demo=1', ipad);
  assert.equal(plan.standalone, true);
  assert.equal(plan.safariUrl, null);
  assert.equal(browserURL(plan).searchParams.get('demo'), '1');
  checkHelperTarget(plan, 'http://127.0.0.1:8093', '/');
});

test('both classrooms preserve only public navigation state in every generated link', () => {
  for (const cls of ['main', 'grade2']) {
    const plan = helperLaunchPlan(base + 'zhuyin-helper.html?class=' + cls + '&demo=1', ipad);
    for (const value of [plan.browserUrl, plan.safariUrl, plan.homeUrl]) {
      const url = new URL(value);
      assert.equal(url.hostname, 'j822925.github.io');
      assert.equal(url.searchParams.get('class'), cls);
      assert.equal(url.searchParams.get('demo'), '1');
      assert.equal(url.hash, '');
      for (const key of url.searchParams.keys()) {
        assert.ok(['class', 'demo', 'v', 'source'].includes(key), 'unexpected forwarded key: ' + key);
      }
    }
  }
});

test('credentials, speech text, redirects and fragments are never forwarded', () => {
  const query = new URLSearchParams({
    class: 'grade2', seat: '999999', pin: 'test-only', token: 'test-token', session: 'test-session',
    auth: 'test-auth', word: '測試文字', transcript: '測試語音', speech: 'cloud',
    next: 'https://example.invalid/', redirect: 'https://example.invalid/',
    source: 'arbitrary-source', v: 'old-version'
  });
  const plan = helperLaunchPlan(base + 'zhuyin-helper.html?' + query + '#private-fragment', ipad);
  for (const value of [plan.browserUrl, plan.safariUrl, plan.homeUrl]) {
    const url = new URL(value);
    assert.equal(url.hash, '');
    for (const key of ['seat', 'pin', 'token', 'session', 'auth', 'word', 'transcript', 'speech', 'next', 'redirect']) {
      assert.equal(url.searchParams.has(key), false, key + ' must not cross handoff');
    }
    assert.notEqual(url.searchParams.get('source'), 'arbitrary-source');
    assert.notEqual(url.searchParams.get('v'), 'old-version');
  }
  checkHelperTarget(plan);
});

test('grade2.html without a class parameter infers grade2 for helper and return', () => {
  const plan = helperLaunchPlan(base + 'grade2.html', ipad);
  assert.equal(browserURL(plan).searchParams.get('class'), 'grade2');
  assert.equal(new URL(plan.homeUrl).searchParams.get('class'), 'grade2');
  checkHelperTarget(plan);
});

test('missing or invalid class becomes explicit main; invalid class is not inferred from pathname', () => {
  for (const href of [base, base + 'zhuyin-helper.html', base + 'grade2.html?class=other', base + '?class=', base + 'grade2.html?class=']) {
    const plan = helperLaunchPlan(href, ipad);
    assert.equal(browserURL(plan).searchParams.get('class'), 'main');
    assert.equal(new URL(plan.homeUrl).searchParams.get('class'), 'main');
    checkHelperTarget(plan);
  }
});

test('demo is preserved only when exactly 1, never invented or coerced from other values', () => {
  for (const suffix of ['', '?demo=0', '?demo=true', '?demo=01', '?demo=']) {
    const plan = helperLaunchPlan(base + 'zhuyin-helper.html' + suffix, ipad);
    for (const value of [plan.browserUrl, plan.safariUrl, plan.homeUrl]) {
      assert.equal(new URL(value).searchParams.has('demo'), false);
    }
  }
});

test('different same-origin directories retain their own helper target, not a query redirect', () => {
  const plan = helperLaunchPlan('https://example.invalid/nested/game/entry.html?next=/elsewhere/helper.html&class=grade2', ipad);
  checkHelperTarget(plan, 'https://example.invalid', '/nested/game/');
  const home = new URL(plan.homeUrl);
  assert.equal(home.origin, 'https://example.invalid');
  assert.ok(home.pathname.startsWith('/nested/game/'));
});

test('default environment and source query cannot force a Safari handoff', () => {
  const plan = helperLaunchPlan(base + 'zhuyin-helper.html?source=homescreen-helper&standalone=1');
  assert.equal(plan.standalone, false);
  assert.equal(plan.safariUrl, null);
  assert.equal(browserURL(plan).searchParams.has('source'), false);
  assert.equal(browserURL(plan).searchParams.has('standalone'), false);
  checkHelperTarget(plan);
});

function launchDOM() {
  const nodes = new Map();
  function element() {
    return {
      hidden: false, open: false, textContent: '', value: '', href: '', attributes: {},
      classList: {added: [], add(name) { this.added.push(name); }},
      setAttribute(name, value) { this.attributes[name] = value; },
      set innerHTML(html) {
        this.html = html;
        for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes.set(match[1], element());
      },
      querySelector(selector) { return nodes.get(selector.slice(1)); },
      replaceChildren(...children) { this.children = children; },
      focus() { this.focused = true; }, select() { this.selected = true; }
    };
  }
  const root = element(), footer = element(), examples = element(), back = element(), hint = element();
  hint.hidden = true;
  nodes.set('back', back); nodes.set('helper-return-hint', hint);
  const doc = {
    createElement: element,
    querySelectorAll: selector => { assert.equal(selector, 'footer, #example-details'); return [footer, examples]; },
    getElementById: id => nodes.get(id)
  };
  return {doc, root, footer, examples, back, hint, nodes};
}

test('modern launch panel keeps the user-gesture anchor, a same-class return, and manual fallback', () => {
  const dom = launchDOM(), plan = helperLaunchPlan(base + '?class=grade2&demo=1', ipad);
  const panel = mountHelperLaunch(plan, dom);
  const start = dom.nodes.get('helper-open-safari');
  assert.equal(start.href, plan.safariUrl);
  assert.equal(dom.back.href, plan.homeUrl);
  assert.deepEqual(dom.root.children, [panel]);
  assert.deepEqual(dom.root.classList.added, ['helper-launch-layout']);
  assert.equal(dom.footer.hidden, true); assert.equal(dom.examples.hidden, true);
  assert.equal(dom.nodes.get('helper-launch-help').open, false);
  assert.equal(dom.nodes.get('helper-safari-address').value, plan.browserUrl);
  assert.equal(dom.nodes.get('helper-open-browser').href, plan.browserUrl);
  let prevented = false;
  const result = start.onclick({preventDefault() { prevented = true; }});
  assert.equal(result, undefined, 'click remains synchronous and does not return false');
  assert.equal(prevented, false);
  assert.equal(start.href, plan.safariUrl);
  assert.equal(dom.nodes.get('helper-launch-help').open, true);
});

test('old iPad panel exposes ordinary-link/manual-copy fallback immediately', () => {
  const dom = launchDOM(), plan = helperLaunchPlan(base, {...ipad, userAgent: 'iPad CPU OS 16_7 Version/16.7'});
  mountHelperLaunch(plan, dom);
  const start = dom.nodes.get('helper-open-safari');
  assert.equal(start.href, plan.browserUrl);
  assert.equal(start.target, '_blank'); assert.equal(start.rel, 'noopener');
  assert.equal(dom.nodes.get('helper-launch-help').open, true);
  assert.match(dom.nodes.get('helper-launch-status').textContent, /大人協助/);
});

test('blocked clipboard still selects the same clean URL for manual copy', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {clipboard: {writeText: async () => { throw new Error('permission denied'); }}}});
    const dom = launchDOM(), plan = helperLaunchPlan(base + '?class=grade2&token=test-private', ipad);
    mountHelperLaunch(plan, dom);
    await dom.nodes.get('helper-copy-address').onclick();
    const address = dom.nodes.get('helper-safari-address');
    assert.equal(address.value, plan.browserUrl);
    assert.equal(address.focused, true); assert.equal(address.selected, true);
    assert.match(dom.nodes.get('helper-copy-status').textContent, /長按/);
    assert.equal(address.value.includes('test-private'), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  }
});

test('Safari return hint is optional, visible when requested, and does not change navigation', () => {
  const dom = launchDOM();
  showHelperReturnHint(dom.doc);
  assert.equal(dom.hint.hidden, false);
  assert.equal(dom.back.href, '');
  assert.doesNotThrow(() => showHelperReturnHint({getElementById: () => null}));
});

const bootstrapSource = readFileSync(new URL('../helper-bootstrap.js', import.meta.url), 'utf8');
async function runBootstrap(env, href) {
  const calls = [];
  const source = bootstrapSource
    .replace(/^import\s+\{[^}]+\}\s+from\s+'\.\/helper-launch\.js\?v=[^']+';\s*/m, '')
    .replace(/import\('\.\/zhuyin-helper\.js\?v=([^']+)'\)/g, "loadHelper('$1')");
  const context = {
    URL, location: {href}, helperLaunchEnvironment: () => env, helperLaunchPlan,
    mountHelperLaunch: plan => calls.push({kind: 'mount', plan}),
    showHelperReturnHint: () => calls.push({kind: 'return-hint'}),
    loadHelper: async cacheVersion => calls.push({kind: 'load-helper', cacheVersion})
  };
  await vm.runInNewContext('(async () => {' + source + '})()', context);
  return calls;
}

test('Home Screen bootstrap mounts handoff without loading or starting recognition module', async () => {
  const calls = await runBootstrap(ipad, base + 'zhuyin-helper.html?class=grade2');
  assert.deepEqual(calls.map(call => call.kind), ['mount']);
  assert.equal(calls[0].plan.standalone, true);
  assert.equal(browserURL(calls[0].plan).searchParams.get('class'), 'grade2');
});

test('Safari handoff destination loads normal helper and return hint without another handoff', async () => {
  const calls = await runBootstrap({...ipad, standalone: false}, base + 'zhuyin-helper.html?class=grade2&source=homescreen-helper');
  assert.deepEqual(calls.map(call => call.kind), ['return-hint', 'load-helper']);
  assert.equal(calls[1].cacheVersion, version);
});

test('ordinary browser loads normal helper without an unnecessary return hint', async () => {
  const calls = await runBootstrap({}, base + 'zhuyin-helper.html?class=main');
  assert.deepEqual(calls.map(call => call.kind), ['load-helper']);
  assert.equal(calls[0].cacheVersion, version);
});
