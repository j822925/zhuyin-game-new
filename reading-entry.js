import {classUrl} from './class-context.js?v=20260926-classes1';
import {createApiClient} from './api-client.js?v=20260926-classes1';
import {readingLaunchEnvironment,readingLaunchPlan} from './reading-launch.js?v=20261008-safari1';
// Independent entry: does not register as data-mode in the other levels' controller.
function attach(){const worlds=document.querySelector('#home .worlds');if(!worlds||document.getElementById('reading-entry'))return;
 const plan=readingLaunchPlan(location.href,readingLaunchEnvironment());
 const a=document.createElement('a');a.id='reading-entry';a.className='world reading-world';a.href=plan.safariUrl||plan.browserUrl;
 a.setAttribute('aria-label','第四關：朗讀小舞台，點一下錄音讀詞語，每回合五題');
 a.innerHTML='<span class="world-art">🎙️<i>ㄉㄨˊ</i></span><small>04 · 詞語朗讀</small><h3>朗讀小舞台</h3><p>iPad 開啟 Safari，點一下錄音讀詞語。</p><span class="world-status">每回合 5 題 · 全對 3 星 · 對 3 題以上 1 星</span>';
 a.style.cssText='text-decoration:none;color:inherit;display:block;background:#f1eee0';worlds.append(a);

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

