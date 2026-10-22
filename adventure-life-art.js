import {FARM_PLOTS,FARM_TREES,CROPS,FISH,plotStage} from './adventure-life-model.js';
import {drawFarmPlant} from './adventure-farm-feedback.js';
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function path(c,points,width,fill){c.strokeStyle=fill;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
export function lifeStamp(c,atlas,index,x,y,h,maxWidth=Infinity){if(!atlas?.cells?.[index])return;const a=atlas.cells[index];h=Math.min(h,maxWidth*a.h/a.w);const w=Math.min(maxWidth,a.w/a.h*h);c.drawImage(atlas.image,a.x,a.y,a.w,a.h,x-w/2,y-h,w,h);}
export function drawFishItem(c,art,id,x,y,h,maxWidth=Infinity){const f=FISH[id];if(!f)return;const atlas=art[f.atlas||'fish'];if(atlas?.cells?.[f.art])lifeStamp(c,atlas,f.art,x,y,h,maxWidth);else drawFish(c,x,y-h/2,h*.42,f.color);}
export function drawVillageLife(c,art,state,now,scene){
 // The farm branch is painted into the shared ground layer.
 for(const x of [373,518]){path(c,[[x,696],[x,747]],10,'#a78c61');ellipse(c,x,694,7,4,'#d0b787');}
 if(!state.life.farmUnlocked){path(c,[[372,712],[519,712]],9,'#b99b6b');path(c,[[372,729],[519,729]],9,'#c7ae7f');}
 for(let i=0;i<8;i++){const x=i%2?536:352,y=658+Math.floor(i/2)*28;ellipse(c,x,y,4,3,'#f7eed0');ellipse(c,x+4,y+2,3,3,'#f7eed0');ellipse(c,x+1,y+1,2,2,'#d5b464');}
 lifeStamp(c,art.life,1,930,696,96);
 // Fish silhouettes and rings make the pond readable as an activity from a distance.
 const t=scene.reduced.matches?0:now/1000;
 for(let i=0;i<3;i++){const x=1000+i*49+Math.sin(t*.4+i)*13,y=600+(i%2)*35;drawFish(c,x,y,13,'#4f807d66',i%2?-1:1);}

}
export function drawFish(c,x,y,size,color,dir=1){c.save();c.translate(x,y);c.scale(dir,1);ellipse(c,0,0,size,size*.52,color);c.fillStyle=color;c.beginPath();c.moveTo(-size*.65,0);c.lineTo(-size*1.6,-size*.6);c.lineTo(-size*1.6,size*.6);c.closePath();c.fill();ellipse(c,size*.5,-size*.1,Math.max(1,size*.09),Math.max(1,size*.09),'#405e55');c.restore();}
export function drawFarm(c,art,state,scene,now){c.drawImage(art.terrain.farm,0,0,1280,800);const p=scene.player;
 const things=FARM_TREES.map(t=>({y:t.y,draw:()=>lifeStamp(c,art.forest,t.type,t.x,t.y,t.size)}));things.push({y:261,draw:()=>lifeStamp(c,art.life,0,639,261,238)});
 // Individual planting batches share one soil surface and several short crop rows.
 for(const plot of FARM_PLOTS){
  const planted=state.life.plots[plot.id],stage=plotStage(planted),effect=scene.farmEffects?.get(plot.id);
  if(!planted&&!effect)continue;let index=0;
  for(const dy of [-34,8])for(const dx of [-70,0,70]){
   const x=plot.x+dx,y=plot.y+dy;
   const cell=index++;things.push({y,draw:()=>drawFarmPlant(c,art,{x,y,stage,crop:planted?.crop||effect.crop,effect,index:cell,now,reduced:scene.reduced.matches})});
  }
 }
 things.push({y:p.y,draw:()=>scene.drawPlayer(c,art,{x:p.x,y:p.y,height:116,outfit:state.outfit,direction:p.direction,walking:p.moving&&!scene.reduced.matches,phase:p.phase,wand:state.wand})});things.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 if(scene.marker){c.strokeStyle='#fff8df';c.lineWidth=2;c.beginPath();c.ellipse(scene.marker.x,scene.marker.y,13,6,0,0,TAU);c.stroke();}
}

export function drawSeedling(c,art,x,y,scale=1){lifeStamp(c,art.seedling,0,x,y,38*scale);}
