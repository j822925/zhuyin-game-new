// Keep the static, legacy layout hidden until current controls and styles exist.
// This makes no requests and never reads or changes a student save.
(()=>{
 const root=document.documentElement,cover=document.getElementById('adventure-boot'),shell=document.querySelector('.app-shell');
 if(!cover||!shell)return;
 const home=cover.querySelector('a'),url=new URL('index.html',location.href);
 url.searchParams.set('class',new URL(location.href).searchParams.get('class')||'main');home.href=url.href;
 cover.querySelector('button').onclick=()=>location.reload();
 let done=false;
 const timer=setTimeout(()=>{if(!done){cover.querySelector('p').textContent='連線有點慢，您可以再試一次。';cover.querySelector('button').hidden=false;}},20000);
 const finish=()=>{if(done)return;done=true;clearTimeout(timer);root.removeAttribute('data-adventure-boot');shell.inert=false;cover.hidden=true;};
 document.addEventListener('adventure-ui-ready',async()=>{
  // child-picture styles are inserted dynamically; do not reveal an unstyled frame.
  await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map(link=>link.sheet?Promise.resolve():new Promise(resolve=>{
   const release=()=>{clearTimeout(deadline);resolve();};const deadline=setTimeout(release,10000);
   link.addEventListener('load',release,{once:true});link.addEventListener('error',release,{once:true});
  })));
  requestAnimationFrame(()=>requestAnimationFrame(finish));
 },{once:true});
 document.addEventListener('adventure-ui-blocked',()=>{clearTimeout(timer);cover.hidden=true;},{once:true});
 window.addEventListener('error',event=>{if(!done&&event.target?.tagName==='SCRIPT'){cover.querySelector('p').textContent='遊戲還沒載入，請再試一次。';cover.querySelector('button').hidden=false;}},true);
})();
