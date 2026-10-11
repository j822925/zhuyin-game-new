import {actionCopy} from './data/adventure-action-copy.js';
import {readingHTML} from './adventure-reading-aid.js';
let sink=null;
export function completeAction(kind,options={}){sink?.(kind,options);}
export function createActionFeedback({scene}){
 let active=null,frame=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function clear(){cancelAnimationFrame(frame);frame=0;active?.node.remove();active=null;}
 function show(kind,options={}){
  const copy=actionCopy(kind);if(!copy)return;clear();
  const modal=document.querySelector('dialog[open]:modal'),host=options.host||modal||document.getElementById('map-stage');if(!host)return;
  const node=document.createElement('div');node.className='action-feedback';node.dataset.action=kind;node.dataset.tone=copy.tone;node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-label',copy.text+(options.detail?'，'+options.detail:''));
  const bubble=document.createElement('div');bubble.className='action-bubble';bubble.innerHTML=`<span class="action-icon" aria-hidden="true">${copy.icon}</span><span class="action-words">${readingHTML(copy.text)}</span>`;
  if(host.id==='island-shop')bubble.querySelector('.action-words').textContent=copy.text;
  if(options.detail){const small=document.createElement('small');small.textContent=options.detail;small.setAttribute('aria-label',options.detail);bubble.append(small);}node.append(bubble);
  if(copy.particles&&!reduced.matches)for(let i=0;i<8;i++){const star=document.createElement('i');star.className='action-particle';star.textContent=['bath','eat'].includes(kind)&&i%3===0?'✦':copy.particles;star.setAttribute('aria-hidden','true');const angle=i*Math.PI/4;star.style.setProperty('--dx',Math.cos(angle)*65+'px');star.style.setProperty('--dy',Math.sin(angle)*42-20+'px');star.style.setProperty('--delay',i*65+'ms');node.append(star);}
  host.dataset.lastAction=kind;host.append(node);active={node,host,modal:host.tagName==='DIALOG',area:scene()?.area,copy,options,start:performance.now(),duration:options.duration??(kind==='attack'||kind==='defend'||kind==='retry'?1600:3800)};
  tick(performance.now());
 }
 function tick(now){if(!active)return;const a=active,s=scene();if(document.hidden||now-a.start>a.duration||a.modal&&!a.host.open||!a.modal&&s?.area!==a.area){clear();return;}
  // A shop or battle may redraw its body after a state change. Keep the one effect.
  if(!a.node.isConnected)a.host.append(a.node);
  let x,y;const rect=a.host.getBoundingClientRect();const anchor=a.options.anchor&&a.host.querySelector(a.options.anchor)||a.modal&&a.host.querySelector('.exp-player,#doll');
  if(anchor){const b=anchor.getBoundingClientRect();x=b.left+b.width/2-rect.left+a.host.scrollLeft;y=b.top+b.height*.55-rect.top+a.host.scrollTop;}
  else if(a.modal){x=a.host.clientWidth/2;y=Math.min(a.host.clientHeight-35,220)+a.host.scrollTop;}
  else if(s){const at=s.toScreen(s.player.x,s.player.y-65);x=at.x;y=at.y;}
  else{clear();return;}
  const w=rect.width||innerWidth,h=rect.height||innerHeight;
  a.node.style.left=Math.max(Math.min(150,w/2),Math.min(w-Math.min(150,w/2),x))+'px';a.node.style.top=Math.max(145,Math.min(h-50,y))+'px';
  a.node.classList.toggle('leaving',now-a.start>a.duration-400);frame=requestAnimationFrame(tick);
 }
 sink=show;return {show,clear,destroy(){clear();sink=null;}};
}

