// A single familiar entrance. Never shown to signed-in students in normal mode.
if(new URLSearchParams(location.search).get('demo')==='1'){
 const panel=document.createElement('section');panel.id='teacher-testing-hub';panel.className='teacher-testing-hub';
 panel.innerHTML=`<h2>🧪 教師試玩中心</h2><p>所有試玩集中在這裡。全班問答使用本班帳號，錯題存入教師後台；其他測試仍使用獨立試玩帳號。下方原有遊戲仍可繼續試玩。</p><div class="teacher-test-grid">
 <a href="https://zhuyin-api.j822925.workers.dev/trial/classroom.html?role=teacher&from=admin"><b>🌟 老師主持・全班問答</b><span>老師 Google 登入、選範圍並開房間。孩子從正式首頁登入、直接選活動加入。可比速度、重播、揭曉；最後只公布前五名，錯題存到各班後台。完成活動依名次發星星，之後訂正錯題；不計入正式小考成績。</span></a>
 <a href="classroom.html"><b>🎒 全班問答・學生加入</b><span>用平常的座號、密碼登入遊戲，直接選本班活動，不用填房號或再登入一次。先下載本場聲音，再等老師開始。</span></a>
 <a href="https://zhuyin-api.j822925.workers.dev/trial/admin/"><b>👩‍🏫 指定學生重考</b><span>登入測試後台 → 建立小考 → 指定 901 或 902 重考。保留原題，獎勵不重複發放。</span></a>
 <a href="https://zhuyin-api.j822925.workers.dev/trial/"><b>🎮 學生視角・讀取優化</b><span>虛構座號 901／902，測試密碼 2580。玩關卡、參加測試小考；只保存測試紀錄。</span></a>
 <a href="https://zhuyin-api.j822925.workers.dev/trial/notebook.html"><b>📒 錯題本複習</b><span>先在測試小考或完成的練習回合答錯，再來複習。答對一次就移出錯題本。</span></a>
 <a href="teacher-preview/reading.html?demo=1"><b>🎙️ 朗讀小舞台</b><span>讀出注音詞語，試用麥克風與辨識。只示範，不記正式成績。</span></a>
 <a href="tone.html?demo=1"><b>🎭 聲調小劇場</b><span>100 個真人詞語直接練習，選每個字的聲調；提供慢速重播、無變調／有變調。不記正式成績、不發星星。</span></a>
 </div><p class="trial-note">重考／錯題本共用獨立測試班，不要填真實學生姓名或密碼。試玩星星與卡片不會轉入正式帳號。</p>`;
 const hosting=panel.querySelector('a[href*="role=teacher"]');if(hosting){const u=new URL(hosting.href);u.searchParams.set('class',new URL(location.href).searchParams.get('class')||'main');hosting.href=u.href;}
 const style=document.createElement('style');style.textContent='.teacher-testing-hub{margin:20px 0;padding:24px;border:3px solid #b9cd9e;border-radius:28px;background:#fffcf1;color:#31564e}.teacher-test-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px}.teacher-test-grid a{display:flex;flex-direction:column;gap:10px;padding:20px;background:#e6efda;border:2px solid #b5c79e;border-radius:20px;color:#31564e;text-decoration:none;min-height:110px}.teacher-test-grid a:hover{background:#d5e6c0}.teacher-test-grid b{font-size:1.25rem}.teacher-test-grid span,.trial-note{font-size:1rem;line-height:1.6}.teacher-testing-hub a:focus-visible{outline:4px solid #ca882c}';document.head.append(style);
 function attach(){const home=document.getElementById('home');if(home&&!document.getElementById(panel.id))home.prepend(panel);}
 attach();new MutationObserver(attach).observe(document.getElementById('app'),{childList:true,subtree:true});
 const onlineCards=[...panel.querySelectorAll('a')].filter(a=>a.href.startsWith('https://zhuyin-api.j822925.workers.dev/trial/')&&!a.href.includes('/classroom.html'));
 let trialReady=false;for(const a of onlineCards){a.setAttribute('aria-disabled','true');a.style.opacity='.65';a.onclick=e=>{if(!trialReady)e.preventDefault();};}
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='正在確認重考／錯題本測試服務…';panel.append(status);
 fetch('https://zhuyin-api.j822925.workers.dev/trial/health',{cache:'no-store',signal:AbortSignal.timeout(8000)}).then(r=>r.json()).then(r=>{if(r.environment!=='teacher-trial'||r.writes!==true)throw Error();trialReady=true;for(const a of onlineCards){a.removeAttribute('aria-disabled');a.style.opacity='';}status.textContent='重考／錯題本測試服務已準備好。';}).catch(()=>{status.textContent='重考／錯題本測試服務尚未開放或暫時無法連線；朗讀與聲調試聽仍可使用。';});
}
