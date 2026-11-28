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
// Route along the painted street centre lines so a shortcut never clips a roof or canal.
function streetRoute(layout,from,to){
 const nodes=new Map(),edges=[];
 function node(x,y){const id=x+','+y;if(!nodes.has(id))nodes.set(id,{x,y,links:[]});return nodes.get(id);}
 function connect(a,b){const d=Math.hypot((a.x-b.x)*1.5,a.y-b.y);a.links.push([b,d]);b.links.push([a,d]);}
 for(const line of layout.streets)for(let i=1;i<line.length;i++){const a=node(...line[i-1]),b=node(...line[i]);connect(a,b);edges.push([a,b]);}
 function attach(p){
  let best,score=Infinity;
  for(const edge of edges){const [a,b]=edge,v=nearestLane(p,[[[a.x,a.y],[b.x,b.y]]]);if(v.dist<score){score=v.dist;best={edge,p:v.nearest};}}
  const n=node(best.p.x,best.p.y);for(const end of best.edge)if(n!==end)connect(n,end);return {n,edge:best.edge};
 }
 const goal=lanePoint(layout,to,true),a=attach(from),b=attach(goal);
 if(a.edge===b.edge)return [a.n,b.n,goal].map(({x,y})=>({x,y}));
 const pending=new Set(nodes.values()),dist=new Map([[a.n,0]]),prev=new Map();
 while(pending.size){
  let here=null;for(const n of pending)if(dist.has(n)&&(!here||dist.get(n)<dist.get(here)))here=n;
  if(!here)return [];if(here===b.n)break;pending.delete(here);
  for(const [next,len] of here.links){const cost=dist.get(here)+len;if(cost<(dist.get(next)??Infinity)){dist.set(next,cost);prev.set(next,here);}}
 }
 const path=[goal];for(let n=b.n;n;n=prev.get(n))path.unshift({x:n.x,y:n.y});return path;
}
export function laneRoute(layout,from,to,village){
 if(village)return streetRoute(layout,from,to);
 const goal=lanePoint(layout,to,village),scale=p=>({x:p.x*12,y:p.y*8});
 const path=findPath(scale(from),scale(goal),(x,y)=>laneContains(layout,{x:x/12,y:y/8},village),{width:1200,height:800,cell:22});
 return (path||[]).map(p=>({x:p.x/12,y:p.y/8}));
}

