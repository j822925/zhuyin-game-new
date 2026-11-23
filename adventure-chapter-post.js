import {ensureClothingArt,drawClothing} from './adventure-clothing.js';
import {ZONE_STOREFRONTS} from './data/zone-storefront-art.js';
const HOME={x:1555,y:1338},letters=[{id:'leaf',x:1615,y:1380,bit:1},{id:'mud',x:1710,y:1394,bit:2}];
export function createPost(chapter,walkTo){
 let house=null,ready=false;
 function available(){const m=chapter.mail();return letters.filter(l=>m.stage==='search'&&!(m.letters&l.bit));}
 function tag(ctx,x,y,label){
   ctx.save();ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#293b39';ctx.strokeText(label,x,y);ctx.fillStyle='#fff5ce';ctx.fillText(label,x,y);ctx.restore();
 }
 return {
   draw(ctx,art,scene,things,time){
     const p=scene.player,m=chapter.mail();
     if(!house){house=new Image();house.src=ZONE_STOREFRONTS.bud.src;void ensureClothingArt('fox-postman').then(()=>{ready=true;}).catch(()=>{});}
     if(m.partner&&ready)things.push({y:p.y+3,draw:()=>drawClothing(ctx,art,{x:p.x-43,y:p.y+3,height:68,direction:p.direction,phase:p.phase,walking:p.moving,outfit:'fox-postman'})});
     if(Math.hypot(p.x-HOME.x,p.y-HOME.y)>1350)return;
     const near=Math.hypot(p.x-HOME.x,p.y-HOME.y)<105,nx=HOME.x+(near?12:Math.sin(time*.7)*18);
     things.push({y:HOME.y-12,draw:()=>{if(house.complete&&house.naturalWidth)ctx.drawImage(house,HOME.x-72,HOME.y-138,144,126);tag(ctx,HOME.x,HOME.y-106,'送信小屋');}});
     if(!m.partner)things.push({y:HOME.y+8,draw:()=>{if(ready)drawClothing(ctx,art,{x:nx,y:HOME.y+8,height:69,direction:near?(p.x>nx?1:3):(Math.cos(time*.7)>0?1:3),phase:time*4,walking:!near,outfit:'fox-postman'});tag(ctx,nx,HOME.y-62,'✉ 阿橘');}});
     for(const l of available())things.push({y:l.y,draw:()=>tag(ctx,l.x,l.y,'💌')});
   },
   tap(at){
     const l=available().find(l=>Math.hypot(at.x-l.x,at.y-l.y+7)<39);
     const home=Math.abs(at.x-HOME.x)<70&&at.y>HOME.y-135&&at.y<HOME.y+18;
     if(!l&&!home)return false;
     const dest=l||HOME;return walkTo({x:dest.x,y:dest.y+12},()=>chapter.visitMail(l?.id||'home'));
   }
 };
}
