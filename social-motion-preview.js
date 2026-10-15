import {SOCIAL_OUTFITS} from './data/social-motions.js';
import {SOCIAL_ACTIONS,socialPlacement} from './social-motion-model.js';
import {ensureSocialArt,drawSocialMotion} from './social-motion-art.js';
let action='wave',epoch=performance.now();
const reduced=document.querySelector('#reduced');reduced.checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
const galleries=[];
for(const [id,a]of Object.entries(SOCIAL_ACTIONS)){const b=document.createElement('button');b.textContent=a.label;b.setAttribute('aria-pressed',String(id===action));b.onclick=()=>{action=id;epoch=performance.now();for(const x of b.parentElement.children)x.setAttribute('aria-pressed',String(x===b));};document.querySelector('#actions').append(b);}
for(const item of SOCIAL_OUTFITS){const card=document.createElement('article'),canvas=document.createElement('canvas'),h=document.createElement('h3'),small=document.createElement('small');canvas.width=288;canvas.height=330;canvas.setAttribute('aria-label',item.name+'動作');h.textContent=item.name;small.textContent='載入中…';card.append(canvas,h,small);document.querySelector('#gallery').append(card);galleries.push({item,c:canvas.getContext('2d')});ensureSocialArt(item.character,item.id).then(ok=>small.textContent=ok?'四種動作已就緒':'圖片尚未載入，請重新整理');for(const select of document.querySelectorAll('select')){const o=document.createElement('option');o.value=item.id;o.textContent=item.name;select.append(o);}}
document.querySelector('#right').value='fox-original';
function actor(c,item,x,y,height,motion,now,facing=1){c.save();c.fillStyle='#59674b20';c.beginPath();c.ellipse(x,y+4,height*.26,7,0,0,Math.PI*2);c.fill();c.restore();drawSocialMotion(c,{character:item.character,outfit:item.id,x,y,height,facing,motion,now,reduced:reduced.checked});}
function animate(now){
 const duration=SOCIAL_ACTIONS[action].duration,elapsed=(now-epoch)%(duration+700),started=now-Math.min(elapsed,duration-1),motion={action,started};
 for(const {item,c}of galleries){c.clearRect(0,0,288,330);actor(c,item,144,305,260,motion,now);}
 const c=document.querySelector('#pair').getContext('2d');c.clearRect(0,0,720,360);
 const poses=[{x:245,y:328,room:'room'},{x:475,y:328,room:'room'}];
 for(const [i,id]of ['left','right'].entries()){const item=SOCIAL_OUTFITS.find(o=>o.id===document.querySelector('#'+id).value),m={...motion,room:'room',side:i?1:-1},p=socialPlacement(poses[i],poses[1-i],m,now,240,reduced.checked);actor(c,item,p.x,p.y,240,m,now,p.facing);}
 if(!document.hidden)requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){epoch=performance.now();requestAnimationFrame(animate);}});requestAnimationFrame(animate);
