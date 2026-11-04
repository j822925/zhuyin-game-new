// Classic script: can show a useful result even when browser file modules are blocked.
(()=>{
 let ready=false;
 const destination=new URL('../../output/annual-challenge-20261103/注音闖關單檔試玩.html',location.href);
 function failed(){
  if(ready)return;ready=true;clearTimeout(timer);const app=document.getElementById('app');if(!app)return;
  app.textContent='';const section=document.createElement('section');section.className='panel closed';
  const file=location.protocol==='file:',title=document.createElement('h1');title.textContent=file?'請開啟新版單檔試玩':'闖關頁尚未完成載入';const text=document.createElement('p');text.textContent=file?'這個舊入口沒有完成載入。新版可以直接在瀏覽器開啟，不必先啟動本機服務。':'請確認網路後重新載入；若仍無法開啟，請老師協助。';
  section.append(title,text);const link=document.createElement('a');link.className='primary preview-open';link.textContent='開啟注音闖關單檔試玩 →';
  if(location.protocol==='file:'){link.href=destination.href;section.append(link);}else{const retry=document.createElement('button');retry.textContent='重新載入';retry.onclick=()=>location.reload();section.append(retry);}
  app.append(section);
 }
 const timer=setTimeout(failed,15000);
 window.addEventListener('annual-ready',()=>{ready=true;clearTimeout(timer);},{once:true});
 window.addEventListener('annual-load-error',failed,{once:true});
 window.addEventListener('error',failed,{once:true});window.addEventListener('unhandledrejection',failed,{once:true});
 if(document.documentElement.dataset.annualStandalone==='1')return;
 if(location.protocol==='file:'){failed();return;}
 import('./annual-challenge.js?v=20261104-pilot1').catch(failed);
})();
