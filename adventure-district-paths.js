import {findPath} from './adventure-model.js';

// Coordinates are percentages of a 3:2 painting. Measure widths in height units.
function nearestLane(p,lanes){
 let nearest=null,best=Infinity;
 for(const line of lanes)for(let i=1;i<line.length;i++){
  const [ax,ay]=line[i-1],[bx,by]=line[i],dx=(bx-ax)*1.5,dy=by-ay;
  const t=Math.max(0,Math.min(1,((p.x-ax)*1.5*dx+(p.y-ay)*dy)/(dx*dx+dy*dy||1)));
  const x=ax+(bx-ax)*t,y=ay+dy*t,dist=((p.x-x)*1.5)**2+(p.y-y)**2;
  if(dist<best){nearest={x,y};best=dist;}
 }
 return {nearest,dist:Math.sqrt(best)};
}
export function laneContains(layout,p,village=false){
 if(p.x<1||p.y<1||p.x>99||p.y>99)return false;
 return nearestLane(p,village?layout.streets:layout.trails).dist<=(village?3.7:layout.width);
}
export function lanePoint(layout,p,village=false){
 return laneContains(layout,p,village)?{...p}:nearestLane(p,village?layout.streets:layout.trails).nearest;
}
export function laneRoute(layout,from,to,village){
 const goal=lanePoint(layout,to,village),scale=p=>({x:p.x*12,y:p.y*8});
 const path=findPath(scale(from),scale(goal),(x,y)=>laneContains(layout,{x:x/12,y:y/8},village),{width:1200,height:800,cell:22});
 return (path||[]).map(p=>({x:p.x/12,y:p.y/8}));
}

