import {HOME_FLOOR,floorWallX} from '../home-spatial-model.js';
// Small decorations priced below functional sinks (25) and most large furniture.
export const WALL_FURNITURE=[
 ['mirror','雛菊木框鏡',18,140,90],['towel','雛菊毛巾環',8,120,66],['towel-shelf','暖木毛巾櫃',15,128,128],
 ['picture','雛菊掛畫',10,125,96],['plant-shelf','綠葉盆栽架',15,125,145],['sconce','暖光壁燈',12,118,74],
].map(([id,name,price,height,fw],index)=>({id:'wall-'+id,name,price,height,fw,fh:12,index,style:'daisy',atlas:'wallDecor',wall:true}));
export const WALL_HANG_HEIGHT=180;
export function wallMountDepth(f){return f?.role==='kitchen-wall'?30:0;}
export function wallSide(p){return p.mount==='left'?-1:p.mount==='right'?1:p.mount==='back'?0:p.x<200?-1:p.x>1080?1:0;}
function sideLimits(f){const half=(f?.surfaceWidth||f?.fw||60)/2,height=f?.role==='kitchen-wall'?Math.round(f.height*.86):(f?.height||60);return {min:Math.ceil(Math.max(HOME_FLOOR.back+half+5-WALL_HANG_HEIGHT,height+half+45)/5)*5,max:Math.floor((HOME_FLOOR.front-half-5-WALL_HANG_HEIGHT)/5)*5};}
export function wallPosition(p,f=null){
 const side=wallSide(p),x=Math.round(p.x/5)*5,y=Math.round(p.y/5)*5;
 if(f?.ceiling)return {x:Math.max(220+f.fw/2,Math.min(1060-f.fw/2,x)),y:Math.max(f.height+30,Math.min(200,y)),...(p.facing?{facing:p.facing}:{})};
 if(side){const limits=sideLimits(f),bottom=Math.max(limits.min,Math.min(limits.max,y)),left=Math.round((floorWallX(bottom+WALL_HANG_HEIGHT)+wallMountDepth(f))/5)*5;return {x:side<0?left:1280-left,y:bottom,mount:side<0?'left':'right',facing:side<0?'left':'right'};}
 const half=(f?.fw||60)/2,minX=Math.ceil((220+half)/5)*5,maxX=Math.floor((1060-half)/5)*5,minY=Math.ceil(((f?.height||60)+45)/5)*5;
 return {x:Math.max(minX,Math.min(maxX,x)),y:Math.max(minY,Math.min(350,y)),mount:'back',facing:'front'};
}
export function wallPlacementValid(f,p,area){
 if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return false;
 if(f.ceiling)return p.x-f.fw/2>=220&&p.x+f.fw/2<=1060&&p.y-f.height>=30&&p.y<=200;
 const side=wallSide(p);
 if(side){
  const legacy=p.x>=(side<0?140:1100)&&p.x<=(side<0?180:1140)&&p.y>=220&&p.y<=470;
  const limits=sideLimits(f),left=floorWallX(p.y+WALL_HANG_HEIGHT)+wallMountDepth(f),target=side<0?left:1280-left;
  return legacy||(p.y>=limits.min&&p.y<=limits.max&&Math.abs(p.x-target)<=2.5);
 }
 return p.x-f.fw/2>=210&&p.x+f.fw/2<=1070&&p.y-f.height>=45&&p.y<=350;
}
