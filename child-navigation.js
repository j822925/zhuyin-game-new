// Presentation only: retain each link destination, click handler, disabled state and login.
const art=new URL('./assets/ui/',import.meta.url);
export const NAV_TARGETS=[
 ['a[data-child-home],.child-ui a.brand,button#home,button#leave,#race-leave,#back-home,#confirm-leave,#race-exit,[data-child-home-button]','home','回首頁'],
 ['#collection-close,#profile-close','back','回遊戲'],
 ['.star-prize-close,.star-prize-done,#exchange-cancel','back','回收藏'],
 ['#pin-cancel,#login-guide-close,#join-close','back','返回'],
 ['[data-tutor-return]','back','回去作答'],
 ['#stay,#race-stay','play','繼續玩']
];
export function decorateNavigation(root=document){
 for(const [selector,kind,label] of NAV_TARGETS)for(const node of root.querySelectorAll(selector)){
  const icon=node.querySelector(':scope > .child-nav-icon'),text=node.querySelector(':scope > .child-nav-label');
  node.classList.add('child-nav');
  const previous=node.getAttribute('aria-label');
  if(previous&&!node.dataset.navigationOriginalLabel)node.dataset.navigationOriginalLabel=previous;
  node.setAttribute('aria-label',label);
  if(icon?.dataset.kind===kind&&text?.textContent===label&&node.childNodes.length===2)continue;
  const badge=document.createElement('span');badge.className='child-nav-icon';badge.dataset.kind=kind;badge.setAttribute('aria-hidden','true');
  const img=document.createElement('img');img.src=new URL('nav-'+kind+'.svg',art).href;img.alt='';img.width=44;img.height=44;badge.append(img);
  const caption=document.createElement('span');caption.className='child-nav-label';caption.textContent=label;node.replaceChildren(badge,caption);
 }
}
function start(){
 decorateNavigation();
 // Dialogs and the online end-of-room button are created after page load.
 const observer=new MutationObserver(()=>decorateNavigation());
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-child-home-button']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
