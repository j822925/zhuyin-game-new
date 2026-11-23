import {drawPaintedFrame} from './adventure-painted-actors.js';
import {STARS,POS,QUESTS,openRoads} from './adventure-chapter-model.js';

const dock='s0',fork='s3';
function graph(c){
 const nodes=new Map(),links=[];
 for(let i=0;i<=(c.phase==='clear'?3:Math.min(3,c.stars+1));i++){
   nodes.set('s'+i,STARS[i]);if(i)links.push(['s'+(i-1),'s'+i]);
 }
 for(const id of openRoads(c)){
   const q=QUESTS.find(x=>x.id===id);
   nodes.set(id,POS[id]);links.push([q.requires[0]||fork,id]);
 }
 return {nodes,links};
}
export function routeTo(links,start,end){
 const paths=[[start]],seen=new Set([start]);
 for(const path of paths){
   const tail=path.at(-1);if(tail===end)return path.slice(1);
   for(const [a,b] of links){
     const next=a===tail?b:b===tail?a:null;
     if(next&&!seen.has(next)){seen.add(next);paths.push([...path,next]);}
   }
 }
 return [];
}
export function mountShore(host,{chapter,paintHero,onArrive,onReturn}){
 const c=chapter(),clear=c.phase==='clear',world=document.createElement('div');world.className='bs-world';host.append(world);
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=650;canvas.setAttribute('aria-hidden','true');world.append(canvas);
 const {nodes,links}=graph(c),ctx=canvas.getContext('2d');
 let at=clear?fork:'s'+c.stars,xy=nodes.get(at).slice(),queue=[],destination=null,raf=0,last=0,dead=false,phase=0,face=0;
 const landscape=new Image();if(clear)landscape.src='assets/expedition/sand.webp';
 const point=id=>{const [x,y]=nodes.get(id);return [x*10,y*6.5];};
 const markers=new Map();
 function walk(id){
   if(dead||destination)return;
   if(id===at){onArrive(id);return;}
   queue=routeTo(links,at,id);if(queue.length)destination=id;
 }
 const names=id=>id===dock?'回長橋':id===fork?(clear?'通梁橋頭':'引路星'):id.startsWith('s')?'引路星':QUESTS.find(q=>q.id===id).place;
 const visible=id=>clear?(id===dock||id===fork||!id.startsWith('s')):id==='s'+Math.min(3,c.stars+1);
 for(const [id,[x,y]] of nodes){
   if(!visible(id))continue;
   const b=document.createElement('button');b.className='bs-pin';b.style.left=x+'%';b.style.top=y+'%';
   b.textContent=id===dock?'↩':id.startsWith('s')?(clear?'⚓':'✦'):({bud:'🌱',sand:'🐚',stone:'🪨',sail:'⛵',shell:'🐚',whale:'🐋',watch:'🚩',port:'🏮',deep:'✉'})[id];
   b.setAttribute('aria-label',names(id));if(clear){const label=document.createElement('small');label.textContent=names(id);b.append(label);}
   b.onclick=()=>walk(id);world.append(b);markers.set(id,b);
 }
 function draw(t){
   if(dead)return;
   const dt=Math.min(.055,(t-(last||t))/1000);last=t;
   if(!document.hidden&&queue.length){
     const next=nodes.get(queue[0]),dx=next[0]-xy[0],dy=next[1]-xy[1],dist=Math.hypot(dx,dy*.65),step=dt*24;
     face=Math.abs(dx)>Math.abs(dy*.65)?(dx>0?1:3):(dy>0?0:2);
     phase+=dt*9;
     if(dist<=step){xy=next.slice();at=queue.shift();if(!queue.length){destination=null;onArrive(at);if(dead)return;}}
     else {xy[0]+=dx*step/dist;xy[1]+=dy*step/dist;}
   }
   const gradient=ctx.createLinearGradient(0,0,860,650);gradient.addColorStop(0,'#25364a');gradient.addColorStop(.55,'#647880');gradient.addColorStop(1,'#34495b');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,1000,650);
   if(clear){
     ctx.save();ctx.beginPath();
     for(const [a,b] of links){
       const [x,y]=point(a),[u,v]=point(b),ang=Math.atan2(v-y,u-x),w=42;
       ctx.moveTo(x+w*Math.sin(ang),y-w*Math.cos(ang));ctx.lineTo(u+w*Math.sin(ang),v-w*Math.cos(ang));
       ctx.arc(u,v,w,ang-Math.PI/2,ang+Math.PI/2);ctx.lineTo(x-w*Math.sin(ang),y+w*Math.cos(ang));ctx.arc(x,y,w,ang+Math.PI/2,ang+1.5*Math.PI);ctx.closePath();
     }
     ctx.clip();ctx.fillStyle='#acc8aa';ctx.fillRect(0,0,1000,650);
     if(landscape.complete&&landscape.naturalWidth)ctx.drawImage(landscape,0,0,1000,650);
     ctx.strokeStyle='#e5cf9c';ctx.lineWidth=13;ctx.lineCap='round';
     for(const [a,b] of links){ctx.beginPath();ctx.moveTo(...point(a));ctx.lineTo(...point(b));ctx.stroke();}
     ctx.restore();
   }else{
     const next=nodes.get('s'+Math.min(3,c.stars+1)),glow=ctx.createRadialGradient(next[0]*10,next[1]*6.5,3,next[0]*10,next[1]*6.5,70);
     glow.addColorStop(0,'#ffe6a9aa');glow.addColorStop(1,'#ffe6a900');ctx.fillStyle=glow;ctx.fillRect(0,0,1000,650);
   }
   if(clear)for(const [id,[x,y]] of nodes){
     if(c.quests[id]!=='active')continue;
     const seconds=matchMedia('(prefers-reduced-motion: reduce)').matches?0:t/1000;
     drawPaintedFrame(ctx,id==='sand'?'crab':id==='bud'?'sprout':'cloud',Math.floor(seconds*6)%8,x*10+Math.sin(seconds)*18,y*6.5+13,60,Math.cos(seconds)>0);
   }
   paintHero(ctx,{x:xy[0]*10,y:xy[1]*6.5+13,height:85,direction:face,phase,walking:!!queue.length});
   raf=requestAnimationFrame(draw);
 }
 function key(e){
   const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
   if(!directions[e.key]||destination)return;e.preventDefault();e.stopPropagation();
   const [dx,dy]=directions[e.key],neighbors=links.filter(pair=>pair.includes(at)).map(pair=>pair.find(id=>id!==at));
   const score=id=>{const [x,y]=nodes.get(id),vx=x-xy[0],vy=(y-xy[1])*.65;return (vx*dx+vy*dy)/Math.hypot(vx,vy);};
   neighbors.sort((a,b)=>score(b)-score(a));if(neighbors.length&&score(neighbors[0])>.3)walk(neighbors[0]);
 }
 world.tabIndex=0;world.addEventListener('keydown',key);world.focus({preventScroll:true});raf=requestAnimationFrame(draw);
 return ()=>{dead=true;cancelAnimationFrame(raf);world.remove();};
}
