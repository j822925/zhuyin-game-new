import {HOME_SPATIAL_ART} from './data/home-spatial-art.js';
import {spatialRole,fixtureRole} from './home-spatial-model.js';
import {adventureMediaUrl} from './adventure-media.js';
import {ensurePaintedFurniture,drawPaintedFurniture,paintedFurnitureBounds,paintedFurnitureSprite} from './home-painted-furniture.js';
const jobs=new WeakMap();
export async function ensureSpatialArt(art,styles=[]){
 let cache=jobs.get(art);if(!cache){cache=new Map();jobs.set(art,cache);}art.spatial??={};
 await ensurePaintedFurniture(art,styles);
 await Promise.all([...new Set([...styles,'doors','fixturesFront','fixturesSide'])].filter(key=>HOME_SPATIAL_ART[key]).map(key=>{
  if(art.spatial[key])return; if(cache.has(key))return cache.get(key);
  const task=(async()=>{const meta=HOME_SPATIAL_ART[key],image=new Image();image.src=adventureMediaUrl(meta.src);await image.decode();art.spatial[key]={image,cells:meta.cells};})();cache.set(key,task);task.catch(()=>cache.delete(key));return task;
 }));
}
export function spatialSprite(art,f,item={}){
 const fixture=fixtureRole(f),theme=['daisy','fox','moon','honey','ocean','berry'].indexOf(f.style),sideView=['left','right'].includes(item.facing),fixtureAtlas=art.spatial?.[sideView?'fixturesSide':'fixturesFront'];
 if(fixture&&theme>=0&&fixtureAtlas)return {atlas:fixtureAtlas,cell:fixtureAtlas.cells[theme*4+['stove','fridge','sink','tub'].indexOf(fixture)],mirror:item.facing==='right',role:'fixture'};
 const atlas=art.spatial?.[f.style],role=spatialRole(f);if(!atlas||!role)return null;
 const facing=item.facing||'front',side=['left','right'].includes(facing),mirror=facing==='right';
 const index=role==='corner'?(facing==='right'?5:4):role==='chair'?({front:8,right:9,back:10,left:11})[facing]:role==='base'?(side?1:0):role==='wall-cabinet'?(side?3:2):side?7:6;
 const cell=atlas.cells[index];return {atlas,cell,mirror:role!=='chair'&&role!=='corner'&&mirror,role};
}
export function furnitureVisualBounds(art,f,item){
 const painted=paintedFurnitureBounds(art,f,item);if(painted)return painted;
 const sprite=spatialSprite(art,f,item),cell=sprite?.cell||art[f.atlas||'furniture']?.cells[f.index];if(!cell)return {x:item.x-f.fw/2,y:item.y-f.height,w:f.fw,h:f.height};
 const height=item.mount==='back'&&['stove','sink'].includes(fixtureRole(f))?145:f.height;
 let w=f.corner?f.fw:height*cell.w/cell.h,h=height;
 if(f.wall&&['left','right'].includes(item.mount)){h+=w;w*=.42;}
 return {x:item.x-w/2,y:item.y-h+(h-f.height)/2,w,h};
}
export function drawSpatialFurniture(c,art,f,item){
 if(drawPaintedFurniture(c,art,f,item))return true;
 const sprite=spatialSprite(art,f,item);if(!sprite)return false;

 const {atlas,cell:s,role,mirror}=sprite,height=item.mount==='back'&&['stove','sink'].includes(fixtureRole(f))?145:f.height,width=role==='corner'?f.fw:height*s.w/s.h;
 c.save();c.translate(item.x,item.y);
 // Remaining cutouts retain their painted proportions and depth.
 if(mirror)c.scale(-1,1);
 c.drawImage(atlas.image,s.x,s.y,s.w,s.h,-width/2,-height,width,height);c.restore();return true;
}
export function drawSpatialThumb(c,art,f,width,height){const p=f.corner?{facing:'left'}:{},sprite=paintedFurnitureSprite(art,f,p)||spatialSprite(art,f,p);if(!sprite)return false;const {atlas,cell:s}=sprite,scale=Math.min((width-12)/s.w,(height-10)/s.h);c.drawImage(atlas.image,s.x,s.y,s.w,s.h,(width-s.w*scale)/2,height-s.h*scale-4,s.w*scale,s.h*scale);return true;}
export function drawSpatialDoor(c,art,style,side,geometry){
 const atlas=art.spatial?.doors;if(!atlas)return false;
 const index=['daisy','fox','moon','honey','ocean','berry'].indexOf(style),s=atlas.cells[Math.max(0,index)],{x,y,width,height}=geometry;
 c.save();c.translate(x,y+38);if(side>0)c.scale(-1,1);c.transform(1,-1.05,0,1,0,0);c.drawImage(atlas.image,s.x,s.y,s.w,s.h,-width/2,-height,width,height);c.restore();return true;
}
