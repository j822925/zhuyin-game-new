import {PAINTED_ISLAND} from './adventure-island-pilot.js';
import {STUDY_BEASTS,beastPosition,drawStudyBeast} from './adventure-island-actors.js';
import {ENEMIES,GROVE_WORLD,ISLAND_WORLD,DESTINATIONS} from './adventure-exploration-model.js';
const pending=new WeakMap();
export async function ensureExplorationArt(art,area){
 let jobs=pending.get(art);
 if(!jobs){jobs=new Map();pending.set(art,jobs);}
 art.exploration??={};
 const files=area==='grove'
   ? [['grove','assets/exploration/grove-v1.webp'],...ENEMIES.map(m=>[m.id,'assets/grove-creatures-v1/'+m.id+'.webp'+(m.art==='cloud'?'?v=hover1':'')])]
   : [['island',PAINTED_ISLAND?'assets/exploration/island-xiyu-open-v5.webp':'assets/exploration/island-xiyu-v2.webp']];
 if(area!=='grove'&&!PAINTED_ISLAND)files.push(['seeds','assets/exploration/seeds-v1.webp']);
 await Promise.all(files.map(([key,url])=>{
   if(art.exploration[key])return;
   if(!jobs.has(key)){
     const image=new Image();image.src=url;
     const ready=image.decode().then(()=>{art.exploration[key]=image;}).finally(()=>jobs.delete(key));
     jobs.set(key,ready);
   }
   return jobs.get(key);
 }));
}

function drawGroveCreature(c,image,m,height,hit,reduced,clock){
 const sw=image.naturalWidth/9,sh=image.naturalHeight/4;
 const floats=m.art==='cloud';
 const cycle=clock/(m.level===2?3.2:2.8)+(m.slot||0)*.21;
 let frame=8,lift=0;
 if(!reduced){
  if(floats){
   frame=Math.floor(cycle*8)%8;
   lift=4*Math.sin(2*Math.PI*cycle);
  }else if(m.moving)frame=Math.floor((m.walkDistance||0)/4)%8;
 }
 const row=(m.away?2:0)+(m.direction===3?1:0);
 const scale=height/150;
 c.save();
 c.translate(m.x,m.y);
 c.scale(scale,scale);
 c.save();
 c.scale(1,.23);
 const shade=c.createRadialGradient(0,0,2,0,0,38);
 shade.addColorStop(0,'rgba(45,36,28,.37)');
 shade.addColorStop(.58,'rgba(51,43,31,.19)');
 shade.addColorStop(1,'rgba(51,43,31,0)');
 c.fillStyle=shade;c.fillRect(-38,-38,76,76);c.restore();
 // The sprite and ground shadow share an anchor. Only the cloud body rises.
 c.drawImage(image,frame*sw,row*sh,sw,sh,-sw/2+hit/scale,13-sh-lift,sw,sh);
 c.restore();
}
export function drawExploration(c,art,state,scene,now,battle,star){
 const grove=scene.area==='grove',size=grove?GROVE_WORLD:ISLAND_WORLD,p=scene.player,clock=scene.reduced.matches?0:now/1000;
 c.drawImage(art.exploration[grove?'grove':'island'],0,0,size.width,size.height);
 if(!grove&&!PAINTED_ISLAND){const im=art.exploration.seeds,shop=DESTINATIONS.find(d=>d.id==='seeds'),h=246;c.drawImage(im,shop.x-im.width/im.height*h/2,shop.y-h,im.width/im.height*h,h);}
 const things=[],casting=scene.castAt?Math.min(1,(now-scene.castAt)/1050):0;
 things.push({y:p.y,draw:()=>scene.drawPlayer(c,art,{x:p.x,y:p.y,height:grove?116:90,outfit:state.outfit,direction:p.direction,walking:p.moving&&!scene.reduced.matches,phase:p.phase,wand:state.wand,casting})});
 if(!grove)scene.chapterPost?.draw(c,art,scene,things,clock);
 if(!grove)for(const b of STUDY_BEASTS){
   if(scene.studyBeastCooldown?.has(b.id))continue;
   const pos=beastPosition(b,clock);
   things.push({y:pos.y,draw:()=>drawStudyBeast(c,b,pos.x,pos.y,clock,{scale:1.12})});
 }
 if(grove)for(const m of scene.encounters||[]){if(!m.visible)continue;things.push({y:m.y,draw:()=>{
  const hit=m===scene.monster&&casting>.42&&casting<.83?Math.sin(casting*56)*4:0,h=m.level===2?120:100;
  drawGroveCreature(c,art.exploration[m.id],m,h,hit,scene.reduced.matches,clock);
  if(m.level===2){c.fillStyle='#e9bf68';for(let i=0;i<2;i++)star(c,m.x-7+i*14,m.y-h-9,5,'#f2d47c');}
  if(battle&&m===scene.monster){c.fillStyle='#fff9ed';c.fillRect(m.x-35,m.y-h-23,70,7);c.fillStyle='#85a56f';c.fillRect(m.x-33,m.y-h-21,66*m.hp/m.maxHp,3);}
 }});}
 things.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 if(scene.marker&&!battle){c.strokeStyle='#fff4d0';c.lineWidth=2;c.beginPath();c.ellipse(scene.marker.x,scene.marker.y,14,6,0,0,Math.PI*2);c.stroke();}
 if(casting&&grove){const m=scene.monster,t=Math.min(1,casting*2);if(t<1)star(c,p.x+(m.x-p.x)*t,p.y-60+(m.y-p.y)*t-Math.sin(t*Math.PI)*65,17,'#ffe49c',clock);else for(let i=0;i<7;i++){const a=i*Math.PI*2/7,d=(casting-.5)*130;star(c,m.x+Math.cos(a)*d,m.y-48+Math.sin(a)*d,6,'#fff2b3');}}
 if(grove&&!scene.reduced.matches)for(let i=0;i<14;i++){const x=scene.camera.x+80+i*73+Math.sin(clock+i)*10,y=scene.camera.y+200+(i*119)%530;c.fillStyle='#faf8b57a';c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();}
}
