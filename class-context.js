// Class is explicit in each URL. Never reuse the last class visited on a device.
export const currentClass=typeof location==='undefined'?'main':new URL(location.href).searchParams.get('class')||'main';
export const classStorageKey=key=>currentClass==='main'?key:key+':class:'+currentClass;
export function classUrl(value,base=globalThis.location?.href||'https://example.test/'){
 const url=new URL(value,base);if(currentClass!=='main')url.searchParams.set('class',currentClass);return url.href;
}
if(typeof document!=='undefined'){
 // Capture covers dynamically created exam/collection links without rewriting assets.
 document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a||a.hasAttribute('download'))return;
  const url=new URL(a.href,location.href),base=new URL('.',location.href);
  if(url.origin===base.origin&&url.pathname.startsWith(base.pathname)&&(!url.pathname.split('/').at(-1)||url.pathname.endsWith('.html')))a.href=classUrl(url);
 },true);
 function start(){
  if(currentClass==='main')return;
  const links=()=>{const base=new URL('.',location.href);for(const a of document.querySelectorAll('a[href]')){if(a.hasAttribute('download'))continue;const u=new URL(a.href,location.href);if(u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&(!u.pathname.split('/').at(-1)||u.pathname.endsWith('.html'))){const value=classUrl(u);if(a.href!==value)a.href=value;}}};
  links();new MutationObserver(links).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
  const manifest=document.querySelector('link[rel=manifest]');if(manifest&&currentClass==='grade2')manifest.href=new URL('manifest-grade2.webmanifest',import.meta.url).href;
  const banner=document.createElement('div');banner.id='class-banner';banner.setAttribute('role','status');banner.style.cssText='text-align:center;padding:8px;background:#e3eed7;color:#285548;font-weight:bold';banner.textContent='🏫 正在確認班級…';document.body.prepend(banner);
  const endpoint=location.hostname==='127.0.0.1'?location.origin:'https://zhuyin-api.j822925.workers.dev';
  fetch(classUrl(endpoint+'/class-info'),{cache:'no-store'}).then(r=>r.json()).then(out=>{if(!out.class)throw Error();banner.textContent='🏫 '+out.class.name+'・注音探險島';document.title=out.class.name+'｜'+document.title;const title=document.querySelector('meta[name=apple-mobile-web-app-title]');if(title)title.content=out.class.name+'注音';}).catch(()=>{banner.textContent='⚠ 找不到這個班級，請使用老師提供的遊戲網址。';});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
