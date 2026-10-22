// Only public navigation state crosses to Safari. Never forward speech, account
// credentials, arbitrary query parameters or the original fragment.
export function helperLaunchEnvironment(nav = globalThis.navigator || {}) {
  return {
    userAgent: nav.userAgent || '', platform: nav.platform || '',
    maxTouchPoints: nav.maxTouchPoints || 0, standalone: nav.standalone === true,
    displayStandalone: globalThis.matchMedia?.('(display-mode: standalone)').matches || false
  };
}

export function helperLaunchPlan(href, env = {}) {
  const base = new URL(href);
  const apple = /iPad|iPhone|iPod/.test(env.userAgent || '') ||
    (env.platform === 'MacIntel' && env.maxTouchPoints > 1);
  const standalone = apple && !!(env.standalone || env.displayStandalone);
  const major = Number((env.userAgent || '').match(/(?:CPU(?: iPhone)? OS|iPhone OS) (\d+)/)?.[1] ||
    (env.userAgent || '').match(/Version\/(\d+)/)?.[1] || 0);
  const selected = base.searchParams.get('class');
  const classId = selected === 'grade2' || (selected === null && base.pathname.endsWith('/grade2.html')) ? 'grade2' : 'main';
  const browser = new URL('zhuyin-helper.html', base);
  browser.searchParams.set('v', '20261022-safari1');
  browser.searchParams.set('class', classId);
  if (base.searchParams.get('demo') === '1') browser.searchParams.set('demo', '1');
  if (standalone) browser.searchParams.set('source', 'homescreen-helper');
  const home = new URL(classId === 'grade2' ? 'grade2.html' : 'index.html', base);
  home.searchParams.set('class', classId);
  if (base.searchParams.get('demo') === '1') home.searchParams.set('demo', '1');
  const browserUrl = browser.href;
  // Same OS handoff policy as reading-launch; older/managed devices retain a
  // plain HTTPS address that an adult can paste into Safari.
  const safariUrl = standalone && major >= 17 && browser.protocol === 'https:'
    ? browserUrl.replace(/^https:/, 'x-safari-https:') : null;
  return {standalone, major, browserUrl, safariUrl, homeUrl: home.href};
}

export function mountHelperLaunch(plan, {root = document.querySelector('main'), doc = document} = {}) {
  const panel = doc.createElement('section');
  panel.id = 'helper-launch'; panel.className = 'panel helper-launch';
  panel.setAttribute('aria-labelledby', 'helper-launch-title');
  panel.innerHTML = `<div class="launch-icons" aria-hidden="true">🎤 🧩 → 🧭</div>
    <h2 id="helper-launch-title">到 Safari 使用小幫手</h2>
    <p class="launch-subtitle">說詞查注音・拼注音聽讀音</p>
    <a id="helper-open-safari" class="primary launch-button">🎤 開始說話 → Safari</a>
    <p id="helper-launch-status" class="status" role="status"></p>
    <details id="helper-launch-help"><summary>沒有打開？請大人幫忙</summary>
      <p>請將下面網址複製到 Safari 的網址列。開啟後，查注音和拼注音都在同一頁。</p>
      <label for="helper-safari-address">Safari 小幫手網址</label>
      <input id="helper-safari-address" readonly>
      <div class="launch-actions"><button id="helper-copy-address" type="button">📋 複製網址</button>
      <a id="helper-open-browser" class="launch-secondary" target="_blank" rel="noopener">用一般連結開啟</a></div>
      <p id="helper-copy-status" class="status" role="status"></p>
      <p>如果仍留在遊戲視窗，請手動貼到 Safari；學校管理的 iPad 若禁止開啟或使用收音，請老師協助。</p>
    </details>`;
  const q = id => panel.querySelector('#' + id);
  const start = q('helper-open-safari');
  start.href = plan.safariUrl || plan.browserUrl;
  if (!plan.safariUrl) { start.target = '_blank'; start.rel = 'noopener'; }
  q('helper-launch-status').textContent = plan.safariUrl
    ? '如果詢問是否開啟 Safari，請選「打開」。'
    : '這台 iPad 可能需要大人協助開啟 Safari。';
  q('helper-launch-help').open = !plan.safariUrl;
  q('helper-open-browser').href = plan.browserUrl;
  q('helper-safari-address').value = plan.browserUrl;
  start.onclick = () => {
    // Do not await anything or preventDefault: keep the original user gesture.
    q('helper-launch-help').open = true;
    q('helper-launch-status').textContent = '若沒有切換，請用下面的方式開啟 Safari。';
  };
  q('helper-copy-address').onclick = async () => {
    try {
      await globalThis.navigator.clipboard.writeText(plan.browserUrl);
      q('helper-copy-status').textContent = '已複製，請貼到 Safari 的網址列。';
    } catch {
      q('helper-safari-address').focus(); q('helper-safari-address').select();
      q('helper-copy-status').textContent = '請長按上方網址，選擇「複製」，再貼到 Safari。';
    }
  };
  root.classList.add('helper-launch-layout');
  root.replaceChildren(panel);
  for (const el of doc.querySelectorAll('footer, #example-details')) el.hidden = true;
  const back = doc.getElementById('back'); if (back) back.href = plan.homeUrl;
  return panel;
}

export function showHelperReturnHint(doc = document) {
  const hint = doc.getElementById('helper-return-hint');
  if (hint) hint.hidden = false;
}
