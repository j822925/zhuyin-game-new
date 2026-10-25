import {furnitureWallDepth,spatialRole,fixtureRole} from './home-spatial-model.js';

// Project separate painted faces onto the room's three axes. A single skew of
// a whole cutout cannot simultaneously align its front, end and countertop.
export function mountedSolidGeometry(f,item){
 if(!['left','right'].includes(item.mount)||f.corner||f.small||f.flat)return null;
 const role=spatialRole(f),fixture=fixtureRole(f);
 const cabinet=['cabinet','shelf'].includes(f.surfaceKind)||/cabinet|bookcase|pantry|tv-stand|nightstand/.test(f.id);
 if(!cabinet&&!['base','wall-cabinet','bookcase'].includes(role)&&!['stove','fridge','sink'].includes(fixture))return null;
 const sign=item.mount==='left'?1:-1;
 const length=f.surfaceWidth||f.fw,depth=role==='wall-cabinet'?30:furnitureWallDepth(f);
 const height=role==='base'||fixture==='stove'||fixture==='sink'?105:Math.round(f.height*((role==='bookcase'||f.surfaceKind==='shelf')?.86:(f.surfaceLevels?.[0]||.82)));
 const axis={x:.42*sign,y:-1};
 const near={x:item.x-axis.x*length/2,y:item.y-axis.y*length/2};
 const far={x:item.x+axis.x*length/2,y:item.y+axis.y*length/2};
 const rearNear={x:near.x-sign*depth,y:near.y},rearFar={x:far.x-sign*depth,y:far.y};
 const points=[near,far,rearNear,rearFar];
 const x=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
 const bottom=Math.max(...points.map(p=>p.y)),top=Math.min(...points.map(p=>p.y))-height;
 return {axis,length,depth,height,sign,near,far,rearNear,rearFar,bounds:{x,y:top,w:right-x,h:bottom-top}};
}
function face(c,points,fill){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();}
export function drawMountedSolid(c,front,side,f,item){
 const g=mountedSolidGeometry(f,item);if(!g||!front)return false;
 const {near,far,rearNear,rearFar,height:H,sign,depth:D}=g,s=front.cell,im=front.atlas.image;
 const top=p=>({x:p.x,y:p.y-H});
 // A visible end panel maintains actual depth, rather than a flattened front.
 face(c,[rearNear,near,top(near),top(rearNear)],'#bdab83');
 if(side){const q=side.cell;c.save();c.translate(rearNear.x,rearNear.y-H);c.scale(sign,1);c.drawImage(side.atlas.image,q.x+q.w*.04,q.y+q.h*.28,q.w*.20,q.h*.66,0,0,D,H);c.restore();}
 face(c,[top(rearNear),top(rearFar),top(far),top(near)],'#e9dcc2');
 c.save();c.transform(g.axis.x,g.axis.y,-sign,0,near.x,near.y-H);
 c.drawImage(im,s.x+s.w*.10,s.y+s.h*.03,s.w*.80,s.h*.14,0,0,g.length,D);c.restore();
 face(c,[near,far,top(far),top(near)],'#e3d7b9');
 c.save();c.transform(g.axis.x,g.axis.y,0,1,near.x,near.y-H);
 const head=spatialRole(f)==='bookcase'?.04:.20;
 c.drawImage(im,s.x+s.w*.035,s.y+s.h*head,s.w*.93,s.h*(.97-head),0,0,g.length,H);c.restore();
 c.strokeStyle='#8e77584d';c.lineWidth=1.2;c.beginPath();c.moveTo(rearNear.x,rearNear.y);c.lineTo(near.x,near.y);c.lineTo(far.x,far.y);c.stroke();
 return true;
}
