import {classUrl} from './class-context.js?v=20260926-classes1';
import {createApiClient} from './api-client.js?v=20260926-classes1';
import {readingLaunchEnvironment,readingLaunchPlan} from './reading-launch.js?v=20260928-home-reading1';
// Independent entry: does not register as data-mode in the other levels' controller.
function attach(){const worlds=document.querySelector('#home .worlds');if(!worlds||document.getElementById('reading-entry'))return;
 const a=document.createElement('a');a.id='reading-entry';a.className='world reading-world';a.href=classUrl('reading.html'+(new URLSearchParams(location.search).get('demo')==='1'?'?demo=1':''));
 a.setAttribute('aria-label','第四關：朗讀小舞台，點一下錄音讀詞語，每回合五題');
 a.innerHTML='<span class="world-art">🎙️<i>ㄉㄨˊ</i></span><small>04 · 詞語朗讀</small><h3>朗讀小舞台</h3><p>點一下錄音，讀出注音詞語。</p><span class="world-status">每回合 5 題 · 全對 3 星 · 對 3 題以上 1 星</span>';
 a.style.cssText='text-decoration:none;color:inherit;display:block;background:#f1eee0';worlds.append(a);
 const plan=readingLaunchPlan(location.href,readingLaunchEnvironment());
 if(plan.standalone){
  a.href=plan.safariUrl||plan.browserUrl;
  a.querySelector('p').textContent=plan.safariUrl?'點一下，前往 Safari 讀詞語。':'點一下，開啟朗讀入口。';
  a.setAttribute('aria-label','第四關：朗讀小舞台，開啟 Safari 朗讀，每回合五題');
  if(plan.safariUrl)a.addEventListener('click',()=>{
   // The anchor itself performs the OS handoff synchronously with the tap.
   // Retain a way to recover if the device declines or cannot open the scheme.
   if(document.getElementById('reading-launch-fallback'))return;
   const help=document.createElement('a');help.id='reading-launch-fallback';help.href=plan.browserUrl;help.textContent='朗讀沒有開啟？點這裡請大人幫忙';help.style.cssText='display:block;text-align:center;padding:16px;color:#285548';worlds.after(help);
  });
 }
}
async function enableEntry(){
 const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const demo=new URLSearchParams(location.search).get('demo')==='1';
 if(!(local&&demo)){
  try{const config=await createApiClient('https://zhuyin-api.j822925.workers.dev/api').get({api:'config'});if(config.readingWrites!==true)return;}catch{return;}
 }
 attach();new MutationObserver(attach).observe(document.getElementById('app'),{childList:true,subtree:true});
}
enableEntry();

