import {HOME_PERSPECTIVE_ART} from './data/home-perspective-art.js';
import {adventureMediaUrl} from './adventure-media.js';
import {spatialRole,fixtureRole,HOME_FLOOR,HOME_CORNER_SPACE} from './home-spatial-model.js';
import {nativeCabinetGeometry,nativeBookcaseGeometry} from './home-native-cabinet-geometry.js';

const pending=new WeakMap();
const APPLIANCES={'collection-port-1':'tv','collection-port-2':'microwave','collection-port-3':'oven','collection-port-4':'rice','collection-port-5':'stereo','collection-port-8':'blender'};
export async function ensurePaintedFurniture(art,styles=[]){
 let jobs=pending.get(art);if(!jobs){jobs=new Map();pending.set(art,jobs);}art.perspective??={};
 const keys=[...new Set(styles.flatMap(s=>[s+'Side',s+'Corner',s+'Cabinet']).concat('appliances','sinks'))];
 await Promise.all(keys.filter(k=>HOME_PERSPECTIVE_ART[k]).map(key=>{
  if(art.perspective[key])return;if(jobs.has(key))return jobs.get(key);
  const task=(async()=>{const meta=HOME_PERSPECTIVE_ART[key],image=new Image();image.src=adventureMediaUrl(meta.src);await image.decode();art.perspective[key]={image,cells:meta.cells};})();
  jobs.set(key,task);task.catch(()=>jobs.delete(key));return task;
 }));
}
export function paintedFurnitureSprite(art,f,p={}){
 const side=['left','right'].includes(p.facing),role=spatialRole(f),fixture=fixtureRole(f);
 let key,name;
 if(f.corner){key=f.style+'Corner';name='corner';}
 else if(side&&APPLIANCES[f.id]){key='appliances';name=APPLIANCES[f.id];}
 else if(side&&fixture==='sink'&&(/sink/.test(f.id)||f.id==='ocean-vanity')){key='sinks';name=f.style;}
 else if(side){key=f.style+'Side';name=role==='base'?'base':role==='wall-cabinet'?'wall':role==='bookcase'?'bookcase':['stove','fridge'].includes(fixture)?fixture:null;}
 const calibrated=side&&['base','wall'].includes(name)&&!!art.perspective?.[f.style+'Cabinet']?.cells?.[name];
 if(calibrated)key=f.style+'Cabinet';
 const atlas=art.perspective?.[key],cell=atlas?.cells?.[name];
 return cell?{atlas,cell,name,calibrated,mirror:p.facing==='right'}:null;
}
export function paintedFurnitureBounds(art,f,p){
 const sprite=paintedFurnitureSprite(art,f,p);if(!sprite)return null;
 const {cell:s,name}=sprite;
 if(name==='bookcase'){const geometry=nativeBookcaseGeometry(f,p);if(geometry)return {x:geometry.x,y:geometry.y,w:geometry.w,h:geometry.h};}
 if(sprite.calibrated){const geometry=nativeCabinetGeometry(f,p);if(geometry)return {x:geometry.x,y:geometry.y,w:geometry.w,h:geometry.h};}
 if(f.corner){const w=HOME_CORNER_SPACE.width,h=w*s.h/s.w;return {x:p.x-w/2,y:p.y-h,w,h};}
 let h=f.height;
 if(name==='base')h=f.height*1.8;
 else if(name==='wall')h=f.height*1.45;
 else if(name==='bookcase')h=f.height*1.16;
 else if(name==='stove')h=f.height*1.28;
 else if(name==='fridge')h=f.height*1.08;
 else if(sprite.atlas===art.perspective?.sinks)h=f.height*1.45;
 const w=h*s.w/s.h;
 if(['left','right'].includes(p.mount)&&!f.wall&&!f.small){
  const length=f.surfaceWidth||f.fw,sign=p.mount==='left'?1:-1;
  // The near foot is a painted landmark. Keep the complete cutout uniformly
  // scaled; no face crops, shear matrices or unequal width/height scaling.
  const nearX=p.x-sign*HOME_FLOOR.sideSlope*length/2,nearY=p.y+length/2;
  const foot=name==='base'?.46:name==='bookcase'?.52:.55;
  return {x:nearX-(sign>0?foot:1-foot)*w,y:nearY-h,w,h};
 }
 return {x:p.x-w/2,y:p.y-h,w,h};
}
export function drawPaintedFurniture(c,art,f,p){
 const sprite=paintedFurnitureSprite(art,f,p),r=paintedFurnitureBounds(art,f,p);if(!sprite||!r)return false;
 const {atlas,cell:s,mirror}=sprite;
 c.save();c.translate(mirror?r.x+r.w:r.x,r.y);if(mirror)c.scale(-1,1);
 c.drawImage(atlas.image,s.x,s.y,s.w,s.h,0,0,r.w,r.h);c.restore();return true;
}
