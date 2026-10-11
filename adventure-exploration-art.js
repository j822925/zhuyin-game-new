import {GROVE_WORLD,ISLAND_WORLD,DESTINATIONS} from './adventure-exploration-model.js';
const pending=new WeakMap();
export async function ensureExplorationArt(art,area){let jobs=pending.get(art);if(!jobs){jobs=new Map();pending.set(art,jobs);}art.exploration??={};const keys=area==='grove'?['grove','acorn','cloud']:['island','seeds'];await Promise.all(keys.map(key=>{if(art.exploration[key])return;if(jobs.has(key))return jobs.get(key);const task=(async()=>{const image=new Image();image.src=key==='island'?'assets/exploration/island-xiyu-v2.webp':`assets/exploration/${key}-v1.webp`;await image.decode();art.exploration[key]=image;})();jobs.set(key,task);task.catch(()=>jobs.delete(key));return task;}));}
export function drawExploration(c,art,state,scene,now,battle,drawMushroom,star){
 const grove=scene.area==='grove',size=grove?GROVE_WORLD:ISLAND_WORLD,p=scene.player,clock=scene.reduced.matches?0:now/1000;
 c.drawImage(art.exploration[grove?'grove':'island'],0,0,size.width,size.height);
 if(!grove){const im=art.exploration.seeds,shop=DESTINATIONS.find(d=>d.id==='seeds'),h=246;c.drawImage(im,shop.x-im.width/im.height*h/2,shop.y-h,im.width/im.height*h,h);}
 const things=[],casting=scene.castAt?Math.min(1,(now-scene.castAt)/1050):0;
 things.push({y:p.y,draw:()=>scene.drawPlayer(c,art,{x:p.x,y:p.y,height:grove?116:90,outfit:state.outfit,direction:p.direction,walking:p.moving&&!scene.reduced.matches,phase:p.phase,wand:state.wand,casting})});
 if(grove)for(const m of scene.encounters||[]){if(!m.visible)continue;things.push({y:m.y,draw:()=>{
  const hit=m===scene.monster&&casting>.42&&casting<.83?Math.sin(casting*56)*4:0,h=m.level===2?120:100;
  if(m.art==='mushroom'){c.save();c.translate(m.x,m.y);c.scale(h/100,h/100);drawMushroom(c,art,{...m,x:0,y:0},scene.reduced.matches?0:m.phase,hit);c.restore();}
  else{const im=art.exploration[m.art],w=im.width/im.height*h;c.fillStyle='#163a3433';c.beginPath();c.ellipse(m.x,m.y+1,26,6,0,0,Math.PI*2);c.fill();c.save();c.translate(m.x+hit,m.y);c.rotate(m.moving?Math.sin(m.phase)*.035:0);c.drawImage(im,-w/2,-h,w,h);c.restore();}
  if(m.level===2){c.fillStyle='#e9bf68';for(let i=0;i<2;i++)star(c,m.x-7+i*14,m.y-h-9,5,'#f2d47c');}
  if(battle&&m===scene.monster){c.fillStyle='#fff9ed';c.fillRect(m.x-35,m.y-h-23,70,7);c.fillStyle='#85a56f';c.fillRect(m.x-33,m.y-h-21,66*m.hp/m.maxHp,3);}
 }});}
 things.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 if(scene.marker&&!battle){c.strokeStyle='#fff4d0';c.lineWidth=2;c.beginPath();c.ellipse(scene.marker.x,scene.marker.y,14,6,0,0,Math.PI*2);c.stroke();}
 if(casting&&grove){const m=scene.monster,t=Math.min(1,casting*2);if(t<1)star(c,p.x+(m.x-p.x)*t,p.y-60+(m.y-p.y)*t-Math.sin(t*Math.PI)*65,17,'#ffe49c',clock);else for(let i=0;i<7;i++){const a=i*Math.PI*2/7,d=(casting-.5)*130;star(c,m.x+Math.cos(a)*d,m.y-48+Math.sin(a)*d,6,'#fff2b3');}}
 if(grove&&!scene.reduced.matches)for(let i=0;i<14;i++){const x=scene.camera.x+80+i*73+Math.sin(clock+i)*10,y=scene.camera.y+200+(i*119)%530;c.fillStyle='#faf8b57a';c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();}
}
