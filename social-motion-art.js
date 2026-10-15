import {SOCIAL_OUTFITS} from './data/social-motions.js';
import {socialFrame} from './social-motion-model.js';
const loaded=new Map(),pending=new Map();
export function socialOutfit(character,outfit){return SOCIAL_OUTFITS.find(o=>o.character===character&&o.id===outfit)||null;}
export async function ensureSocialArt(character,outfit){
 const item=socialOutfit(character,outfit);if(!item)return false;
 if(loaded.has(item.id))return true;if(pending.has(item.id))return pending.get(item.id);
 const promise=new Promise(resolve=>{const im=new Image();let finished=false;const finish=ok=>{if(finished)return;finished=true;clearTimeout(timer);im.onload=im.onerror=null;if(ok)loaded.set(item.id,im);resolve(ok);};const timer=setTimeout(()=>{finish(false);im.src='';},12000);im.onload=()=>finish(true);im.onerror=()=>finish(false);im.src=new URL(item.image,import.meta.url).href;}).finally(()=>pending.delete(item.id));
 pending.set(item.id,promise);return promise;
}
export function drawSocialMotion(c,{character,outfit,x,y,height=116,facing=1,motion,now=performance.now(),reduced=false}){
 const item=socialOutfit(character,outfit),im=item&&loaded.get(item.id);
 if(!im||!motion)return false;
 const f=socialFrame(motion.action,now-motion.started,reduced);if(!f)return false;
 const k=height/item.bodyHeight,w=item.cellWidth*k,h=item.cellHeight*k;
 const beat=(now-motion.started)/400,amount=reduced?0:Math.sin(beat*Math.PI);
 c.save();c.translate(x,y);if(motion.action!=='dance'&&item.facing==='right')c.scale(facing<0?-1:1,1);
 if(motion.action==='dance'&&!reduced){c.translate(amount*height*.025,-Math.abs(amount)*height*.035);c.rotate(amount*.025);}
 c.drawImage(im,f.column*item.cellWidth,f.row*item.cellHeight,item.cellWidth,item.cellHeight,-w/2,-item.baseline*k,w,h);
 if(motion.action==='kiss'&&f.progress>.36){
  const t=(f.progress-.36)/.64;c.save();c.globalAlpha=reduced?1:Math.sin(t*Math.PI);c.fillStyle='#e9788d';
  const hx=height*(.22+t*.42),hy=-height*(.55+t*.24),s=height*.075;
  c.beginPath();c.moveTo(hx,hy+s);c.bezierCurveTo(hx-s*2,hy-s*.3,hx-s,hy-s,hx,hy-s*.35);c.bezierCurveTo(hx+s,hy-s,hx+s*2,hy-s*.3,hx,hy+s);c.fill();c.restore();
 }
 if(motion.action==='hug'&&f.progress>.35){c.fillStyle='#e9b575';c.globalAlpha=.65;c.font=Math.round(height*.13)+'px sans-serif';c.fillText('♥',height*.28,-height*.72);}
 c.restore();return true;
}
