import {FURNITURE} from './data/home-furniture.js';
import {restFurniture} from './adventure-rest-model.js';
export function drawHomeRest(c,scene,state,now){
 const e=scene.homeRest;if(!e||e.area!==scene.area)return;const f=restFurniture(e.item.id),t=(now-e.start)/1000,x=e.item.x,y=e.item.y-f.height*.52;
 c.save();
 if(e.kind==='toilet'){
  // A short privacy curtain, with the fully dressed character's head above it.
  scene.drawPlayer(c,scene.art,{x,y:e.item.y-20,height:116,outfit:state.outfit,direction:0,walking:false,phase:0,wand:false});
  const top=e.item.y-86;c.fillStyle='#edf0dbee';c.strokeStyle='#b1b99a';c.lineWidth=2;c.beginPath();c.roundRect(x-67,top,134,94,9);c.fill();c.stroke();
  c.strokeStyle='#c4cdb5';for(let i=0;i<6;i++){const xx=x-52+i*21+Math.sin(t*2+i)*2;c.beginPath();c.moveTo(xx,top+5);c.lineTo(xx,top+88);c.stroke();}
  c.fillStyle='#fffaf0';c.font='22px sans-serif';c.textAlign='center';c.fillText('✿',x,top+54);
 }else if(e.kind==='bath'&&f.wall){
  // A wall shower uses the reachable floor position, not the wall's anchor.
  const px=scene.player.x,py=scene.player.y;
  scene.drawPlayer(c,scene.art,{x:px,y:py,height:116,outfit:state.outfit,direction:0,walking:false,phase:0,wand:false});
  c.strokeStyle='#b7e5ecc4';c.lineWidth=2.5;
  for(let i=0;i<12;i++){const dx=px-36+(i%6)*14,dy=py-112+((t*55+i*21)%100);c.beginPath();c.moveTo(dx,dy);c.lineTo(dx-2,dy+9);c.stroke();}
  for(let i=0;i<5;i++){c.fillStyle='#f4fdffb8';c.strokeStyle='#a8d3d77a';c.beginPath();c.arc(px-30+i*15,py-8+Math.sin(t*3+i)*3,6+i%2*3,0,Math.PI*2);c.fill();c.stroke();}
 }else if(e.kind==='bath'){
  // Keep the original dressed sprite; only the head peeks above the foam.
  c.beginPath();c.rect(x-70,y-112,140,66);c.clip();scene.drawPlayer(c,scene.art,{x,y:y+12,height:125,outfit:state.outfit,direction:0,walking:false,phase:0,wand:false});c.restore();c.save();
  for(let i=0;i<10;i++){const a=i*2.4+t,bx=x+Math.sin(a)*70,by=y-32+Math.cos(a*.7)*8-Math.sin(t+i)*4;c.fillStyle='#f4fdffee';c.strokeStyle='#9bc8cba0';c.lineWidth=1.5;c.beginPath();c.arc(bx,by,8+i%3*3,0,Math.PI*2);c.fill();c.stroke();}
 }else{
  scene.drawPlayer(c,scene.art,{x,y:e.item.y-f.height*.38,height:116,outfit:state.outfit,direction:0,walking:false,phase:0,wand:false});
  // Reuse this bed's own painted quilt to tuck the character in. No extra sprite.
  const atlas=scene.art[f.atlas||'furniture'],cell=atlas?.cells[f.index];
  if(cell){const width=cell.w/cell.h*f.height,quilt=.47;c.drawImage(atlas.image,cell.x,cell.y+cell.h*quilt,cell.w,cell.h*(1-quilt),x-width/2,e.item.y-f.height*(1-quilt),width,f.height*(1-quilt));}
  c.restore();c.save();
  c.fillStyle='#657b9b';c.font='bold 23px sans-serif';c.fillText('Z',x+45,y-60-Math.sin(t)*6);c.font='bold 15px sans-serif';c.fillText('z',x+68,y-78-Math.sin(t)*8);
 }
 c.restore();
}
export function drawHomePlay(c,scene,state,now){const e=scene.homePlay;if(!e)return;const f=FURNITURE.find(f=>f.id===e.item.id),x=e.item.x,y=e.item.y-f.height*.65,t=(now-e.start)/1000;c.save();c.globalAlpha=Math.max(0,1-t/2.2);c.font='24px sans-serif';c.textAlign='center';for(let i=0;i<5;i++){const px=x+Math.sin(i*2+t)*48,py=y-t*25-i%2*15;if(e.kind==='bubbles'){c.strokeStyle='#b2e4e8';c.fillStyle='#e9ffff88';c.beginPath();c.arc(px,py,8+i%3*3,0,Math.PI*2);c.fill();c.stroke();}else{c.fillStyle=['#d6ad4c','#e7a4b5','#819c64'][i%3];c.fillText(e.kind==='music'?'♪':'✦',px,py);}}c.restore();}
