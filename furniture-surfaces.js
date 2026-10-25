import {surfaceVector,spatialFields,spatialRole,furnitureWallDepth,HOME_FLOOR} from './home-spatial-model.js';
// Coordinates are room units, shared by drawing, hit testing and durable saves.
export function scaleHomeFurniture(f){
 let height=f.height,small=false;
 if(f.id.startsWith('plush-')){height=48;small=true;}
 const sizes={'moon-lamp':62,'ocean-play':56,'honey-play':50,'deep-lamp':64,'port-radio':54,'port-toaster':45,'gift-port':65,'gift-sand':48,'gift-stone':45,'gift-bud':58,'gift-shell':46,'gift-deep':62,'bud-daisies':62};
 if(sizes[f.id]){height=sizes[f.id];small=true;}
 if(!small&&!f.wall){if(f.id==='plant'||f.id.endsWith('-plant'))height=90;if(f.id.endsWith('-bed')||f.id==='bed')height=Math.min(height,185);}
 const ratio=height/f.height;
 return {...f,height,...(small?{small:true,fw:Math.max(20,Math.round(f.fw*ratio)),fh:Math.max(12,Math.round(f.fh*ratio))}:{})};
}
export function furnitureSurfaces(f,host){
 if(!f||f.small||f.flat||f.cooking)return [];
 // Native L artwork: right-hand workspace clears the sink; the short return
 // has its own painted axis, rather than borrowing a skewed rectangular cabinet.
 if(f.corner)return [{name:'後方檯面',dx:155,dy:-182,width:210,kind:'cabinet'},{name:'轉角檯面',dx:-210,dy:-165,width:70,kind:'cabinet',wing:true,axis:{x:.8,y:-1}}];
 const kind=f.surfaceKind||(/bookcase|plant-stand/.test(f.id)?'shelf':/cabinet|pantry/.test(f.id)?'cabinet':f.id==='sofa'||f.id.endsWith('-sofa')?'sofa':f.id==='table'||/-table$|-desk$|-tea-cart$/.test(f.id)?'table':null);
 if(!kind)return [];
 const levels=f.surfaceLevels||(kind==='shelf'?[.72,.45,.18]:kind==='cabinet'?[.82]:kind==='sofa'?[.27]:[.6]);
 return levels.map((level,i)=>{
  const surface={name:kind==='shelf'?['上層','中層','下層'][i]:kind==='sofa'?'座墊':'檯面',dy:-Math.round(f.height*level),width:f.surfaceWidth??Math.max(40,f.fw*(kind==='sofa'?.6:.72)),kind,depth:kind==='cabinet'?furnitureWallDepth(f):0};
  if(spatialRole(f)==='base'){const scale=f.height/125,length=f.surfaceWidth||f.fw;surface.nativeSide={dx:-HOME_FLOOR.sideSlope*length/2+12.2*scale,dy:length/2-171.1*scale,width:80*scale,axis:{x:.914,y:-1}};}
  return host?surfaceForHost(host,surface):surface;
 });
}
export function surfaceForHost(host,surface){if(!surface?.nativeSide||!['left','right'].includes(host.mount))return surface;const sign=host.mount==='left'?1:-1;return {...surface,...surface.nativeSide,dx:surface.nativeSide.dx*sign,depth:0,nativeSideSurface:true};}
export function surfaceItemWidth(f,item,host,surface){const effective=surfaceForHost(host,surface),facing=item?.facing??host.facing;return (f?.fw||20)*(effective.nativeSideSurface&&['left','right'].includes(facing)?.45:1);}
export function surfaceAnchor(host,surface){surface=surfaceForHost(host,surface);const mirror=host.mount==='corner-right'?-1:1,sign=host.mount==='left'||(surface.wing&&host.mount==='corner-left')?1:host.mount==='right'||(surface.wing&&host.mount==='corner-right')?-1:0;return {x:host.x+(surface.dx||0)*mirror-sign*(surface.depth||0)/2,y:host.y+surface.dy};}
function surfaceAxis(host,surface){surface=surfaceForHost(host,surface);if(surface.axis)return {x:surface.axis.x*(['right','corner-right'].includes(host.mount)?-1:1),y:surface.axis.y};if(surface.wing)return {x:host.mount==='corner-right'?-HOME_FLOOR.sideSlope:HOME_FLOOR.sideSlope,y:-1};if(host.mount==='corner-left')return {x:1,y:0};if(host.mount==='corner-right')return {x:-1,y:0};return surfaceVector(host);}
export function surfaceOffsetAt(host,surface,point){const v=surfaceAxis(host,surface),a=surfaceAnchor(host,surface);return ((point.x-a.x)*v.x+(point.y-a.y)*v.y)/(v.x*v.x+v.y*v.y);}
export function surfaceDistance(host,surface,point){surface=surfaceForHost(host,surface);const v=surfaceAxis(host,surface),a=surfaceAnchor(host,surface),offset=Math.max(-surface.width/2,Math.min(surface.width/2,surfaceOffsetAt(host,surface,point)));return Math.hypot(point.x-a.x-offset*v.x,point.y-a.y-offset*v.y);}
export function attachedPosition(item,layout,catalog){
 if(!item?.on)return null;
 const f=catalog.find(f=>f.id===item.id),host=layout.find(p=>p.id===item.on),base=catalog.find(f=>f.id===host?.id),surface=furnitureSurfaces(base,host)[item.surface];
 if(!f?.small||!host||host.on||host.id===item.id||!surface||!Number.isFinite(item.offsetX)||Math.abs(item.offsetX)+surfaceItemWidth(f,item,host,surface)/2>surface.width/2+1)return null;
 const v=surfaceAxis(host,surface),a=surfaceAnchor(host,surface),facing=item.facing??(surface.nativeSideSurface?host.facing:undefined);return {x:a.x+item.offsetX*v.x,y:a.y+item.offsetX*v.y,on:host.id,surface:item.surface,offsetX:item.offsetX,...spatialFields({...item,facing})};
}
export function freeSurfacePosition(id,host,index,layout,catalog,preferredPoint,options={}){
 const f=catalog.find(f=>f.id===id),surface=furnitureSurfaces(catalog.find(f=>f.id===host.id),host)[index];if(!f?.small||!surface||host.on)return null;
 const facing=options.facing??layout.find(p=>p.id===id)?.facing??(surface.nativeSideSurface?host.facing:undefined),itemWidth=surfaceItemWidth(f,{facing},host,surface);
 const limit=surface.width/2-itemWidth/2;if(limit<0)return null;
 const peers=layout.filter(p=>p.id!==id&&p.on===host.id&&p.surface===index);
 // Search actual free intervals. Sampling three positions skipped the narrow
 // but valid gap between an oven and a blender, making a cooker look unplaceable.
 let intervals=[[-limit,limit]];
 for(const peer of peers){
  if(!Number.isFinite(peer.offsetX))continue;
  const clearance=(itemWidth+surfaceItemWidth(catalog.find(item=>item.id===peer.id),peer,host,surface))/2+3;
  const from=peer.offsetX-clearance,to=peer.offsetX+clearance;
  intervals=intervals.flatMap(([a,b])=>to<a||from>b?[[a,b]]:[...(from>=a?[[a,Math.min(b,from)]]:[]),...(to<=b?[[Math.max(a,to),b]]:[])]);
 }
 if(!intervals.length)return null;
 const target=preferredPoint&&Number.isFinite(preferredPoint.x)&&Number.isFinite(preferredPoint.y)?surfaceOffsetAt(host,surface,preferredPoint):peers.length===0?-limit:peers.length===1?limit:0;
 const offsetX=intervals.map(([a,b])=>Math.max(a,Math.min(b,target))).sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b)[0];
 const v=surfaceAxis(host,surface),a=surfaceAnchor(host,surface);return {x:a.x+offsetX*v.x,y:a.y+offsetX*v.y,on:host.id,surface:index,offsetX,...(facing?{facing}:{})};
}
