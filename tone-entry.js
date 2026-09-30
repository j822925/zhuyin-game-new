import {classUrl} from './class-context.js?v=20260928-all1';
function attach(){const worlds=document.querySelector('#home .worlds');if(!worlds||document.getElementById('tone-entry'))return;const demo=new URLSearchParams(location.search).get('demo')==='1';
 const a=document.createElement('a');a.id='tone-entry';a.className='world';a.href=classUrl('tone.html'+(demo?'?demo=1':''));a.style.cssText='text-decoration:none;color:inherit;display:block;background:#f1e9f4';a.setAttribute('aria-label','第三關：聲調小劇場，聽詞語，選每個字的聲調');
 a.innerHTML='<span class="world-art">🎭<i>─ ˊ ˇ ˋ ˙</i></span><small>03 · 聽詞語選聲調</small><h3>聲調小劇場</h3><p>100 個真人詞語，陪你慢慢聽。</p><span class="world-status">每回合最多 10 題 · 開放練習，暫不發星星</span>';worlds.insertBefore(a,document.getElementById('reading-entry'));
}
attach();new MutationObserver(attach).observe(document.getElementById('app'),{childList:true,subtree:true});
