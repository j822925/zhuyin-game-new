// Only public navigation state crosses from the Home Screen app to Safari.
// Never forward the original query/hash, seat, PIN or authentication session.
export function readingLaunchEnvironment(nav=globalThis.navigator||{}){
 return {userAgent:nav.userAgent||'',platform:nav.platform||'',maxTouchPoints:nav.maxTouchPoints||0,standalone:nav.standalone===true,displayStandalone:globalThis.matchMedia?.('(display-mode: standalone)').matches||false};
}
export function readingLaunchPlan(href,env={}){
 const base=new URL(href),apple=/iPad|iPhone|iPod/.test(env.userAgent||'')||(env.platform==='MacIntel'&&env.maxTouchPoints>1);
 const standalone=apple&&!!(env.standalone||env.displayStandalone);
 const major=Number((env.userAgent||'').match(/(?:CPU(?: iPhone)? OS|iPhone OS) (\d+)/)?.[1]||(env.userAgent||'').match(/Version\/(\d+)/)?.[1]||0);
 const make=file=>{const out=new URL(file,base),classId=base.searchParams.get('class')||(base.pathname.endsWith('/grade2.html')?'grade2':null);if(classId)out.searchParams.set('class',classId);return out;};
 const browser=make('reading.html');browser.searchParams.set('v','20261008-safari1');browser.searchParams.set('speech','native');
 const local=['localhost','127.0.0.1','[::1]'].includes(base.hostname);
 if(local&&base.searchParams.get('demo')==='1')browser.searchParams.set('demo','1');
 if(standalone)browser.searchParams.set('source','homescreen-reading');
 const browserUrl=browser.href;
 // x-safari-https is an OS handoff available on newer Apple devices. Do not
 // promise it works on older/unknown versions; keep a bookmark setup fallback.
 const safariUrl=standalone&&major>=17&&browser.protocol==='https:'?browserUrl.replace(/^https:/,'x-safari-https:'):null;
 return {standalone,major,browserUrl,safariUrl,shortcutUrl:make('reading-shortcut.html?v=20261008-safari1').href,homeUrl:make('./').href};
}

export function mountReadingLaunch(plan,root=document.querySelector('main')){
 const panel=document.createElement('section');panel.className='panel';panel.id='reading-launch';
 panel.innerHTML='<div class="stage-icon" aria-hidden="true">🎙️</div><h1>朗讀小舞台</h1><p id="launch-message"></p><a id="launch-safari" class="primary">🎙️ 開始 →</a><details><summary>⚙️ 給大人</summary><p>這台 iPad 的主畫面模式無法穩定使用朗讀辨識。若系統詢問是否開啟 Safari，請選「打開」。</p><p>較舊或受管理的 iPad 可能無法直接切換。可以由大人設定一次「朗讀小舞台」主畫面捷徑，之後孩子只要點圖示。</p><a id="launch-shortcut" class="secondary">設定朗讀主畫面捷徑</a><label for="launch-address">Safari 朗讀網址</label><input id="launch-address" readonly style="display:block;width:100%;font:inherit;padding:12px;margin:12px 0"><button id="launch-copy" class="secondary" type="button">複製朗讀網址</button><p id="launch-copy-status" role="status"></p><a id="launch-browser" class="secondary" target="_blank" rel="noopener">用一般連結開啟</a><p class="note">若一般連結仍留在遊戲小視窗，請將上方網址貼入 Safari。</p></details>';
 const q=id=>panel.querySelector('#'+id);
 q('launch-message').textContent=plan.safariUrl?'🎙️ → 🧭':'請老師幫忙開啟 👋';
 q('launch-safari').href=plan.safariUrl||plan.shortcutUrl;
 if(!plan.safariUrl)q('launch-safari').textContent='👋 找老師幫忙';
 q('launch-shortcut').href=plan.shortcutUrl;q('launch-browser').href=plan.browserUrl;q('launch-address').value=plan.browserUrl;
 q('launch-copy').onclick=async()=>{try{await navigator.clipboard.writeText(plan.browserUrl);q('launch-copy-status').textContent='已複製，請貼到 Safari 的網址列。';}catch{q('launch-address').focus();q('launch-address').select();q('launch-copy-status').textContent='請長按上方網址，選擇「複製」，再貼到 Safari。';}};
 root.replaceChildren(panel);
 const home=document.getElementById('home-link');if(home)home.href=plan.homeUrl;
 return panel;
}
