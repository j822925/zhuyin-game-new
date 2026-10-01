import {classUrl} from './class-context.js?v=20260926-classes1';
import {createApiClient} from './api-client.js?v=20260926-classes1';
import {getReadingCloudStatus,readingClosedMessage} from './reading-cloud-status.js?v=20261001-lenient1';
import {nativeReadingLink} from './reading-fallback.js?v=20261001-lenient1';
let cloud={available:false,reason:'checking'},checking=false;
function statusEntry(){const a=document.getElementById('reading-entry');if(!a)return;a.setAttribute('aria-disabled',String(cloud.reason==='checking'));a.style.opacity=cloud.reason==='checking'?'.65':'1';a.href=cloud.available?classUrl('reading.html?v=20261001-lenient1'):nativeReadingLink().url;a.querySelector('.world-status').textContent=cloud.available?'每回合 5 題 · 全對 3 星 · 對 3 題以上 1 星':cloud.reason==='checking'?'正在確認朗讀用量…':cloud.reason==='daily-limit'?'雲端用量已用完 · 點此用 Safari 繼續':'雲端暫時無法連線 · 點此用原有辨識';}
async function refreshCloud(){if(checking||document.hidden)return;checking=true;cloud=await getReadingCloudStatus();checking=false;statusEntry();}
// Independent entry: does not register as data-mode in the other levels' controller.
function attach(){const worlds=document.querySelector('#home .worlds');if(!worlds||document.getElementById('reading-entry'))return;
 const a=document.createElement('a');a.id='reading-entry';a.className='world reading-world';a.href=classUrl('reading.html?v=20261001-lenient1'+(new URLSearchParams(location.search).get('demo')==='1'?'&demo=1':''));
 a.setAttribute('aria-label','第四關：朗讀小舞台，點一下錄音讀詞語，每回合五題');
 a.innerHTML='<span class="world-art">🎙️<i>ㄉㄨˊ</i></span><small>04 · 詞語朗讀</small><h3>朗讀小舞台</h3><p>點一下錄音，讀出注音詞語。</p><span class="world-status">每回合 5 題 · 全對 3 星 · 對 3 題以上 1 星</span>';
 a.style.cssText='text-decoration:none;color:inherit;display:block;background:#f1eee0';worlds.append(a);
 a.addEventListener('click',e=>{if(cloud.reason==='checking'){e.preventDefault();refreshCloud();}});statusEntry();

}
async function enableEntry(){
 const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const demo=new URLSearchParams(location.search).get('demo')==='1';
 if(!(local&&demo)){
  try{const config=await createApiClient('https://zhuyin-api.j822925.workers.dev/api').get({api:'config'});if(config.readingWrites!==true)return;}catch{return;}
 }
 attach();new MutationObserver(attach).observe(document.getElementById('app'),{childList:true,subtree:true});
 refreshCloud();setInterval(refreshCloud,60000);window.addEventListener('pageshow',refreshCloud);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCloud();});
}
enableEntry();

