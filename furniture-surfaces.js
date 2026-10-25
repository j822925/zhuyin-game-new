import {surfaceVector,spatialFields,spatialRole,furnitureWallDepth,HOME_FLOOR} from './home-spatial-model.js';
import {nativeCabinetGeometry,nativeBookcaseGeometry,NATIVE_CABINET_LANDMARKS_BY_STYLE} from './home-native-cabinet-geometry.js';
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
 if(f.corner)return [{name:'水槽旁短檯',dx:165,dy:-190,width:56,kind:'cabinet'},{name:'轉角檯面',dx:-132,dy:-160,width:48,kind:'cabinet',wing:true,axis:{x:1.18,y:-1}},{name:'水槽左檯',dx:-52,dy:-190,width:78,kind:'cabinet'}];
 const kind=f.surfaceKind||(/bookcase|plant-stand/.test(f.id)?'shelf':/cabinet|pantry/.test(f.id)?'cabinet':f.id==='sofa'||f.id.endsWith('-sofa')?'sofa':f.id==='table'||/-table$|-desk$|-tea-cart$/.test(f.id)?'table':null);
 if(!kind)return [];
 const levels=f.surfaceLevels||(kind==='shelf'?[.72,.45,.18]:kind==='cabinet'?[.82]:kind==='sofa'?[.27]:[.6]);
 return levels.map((level,i)=>{
  const surface={name:kind==='shelf'?['上層','中層','下層'][i]:kind==='sofa'?'座墊':'檯面',dy:-Math.round(f.height*level),width:f.surfaceWidth??Math.max(40,f.fw*(kind==='sofa'?.6:.72)),kind,depth:kind==='cabinet'?furnitureWallDepth(f):0};
  if(spatialRole(f)==='base'){const scale=f.height/125,length=f.surfaceWidth||f.fw;surface.nativeSide={dx:-HOME_FLOOR.sideSlope*length/2+12.2*scale,dy:length/2-171.1*scale,width:80*scale,axis:{x:.914,y:-1}};if(NATIVE_CABINET_LANDMARKS_BY_STYLE[f.style])surface.nativeCabinet=f;}
  if(spatialRole(f)==='bookcase')surface.nativeShelf={f,index:i};
  return host?surfaceForHost(host,surface):surface;
 });
}
export function surfaceForHost(host,surface){
 const shelf=surface?.nativeShelf&&nativeBookcaseGeometry(surface.nativeShelf.f,host)?.shelves[surface.nativeShelf.index];
 if(shelf)return {...surface,dx:shelf.x-host.x,dy:shelf.y-host.y,width:shelf.physicalWidth,physicalWidth:shelf.physicalWidth,projectedSpan:shelf.projectedSpan,axis:shelf.axis,nativeCabinetProjection:true,nativeSideSurface:true,depth:0};
 if(!surface?.nativeSide)return surface;
 const geometry=surface.nativeCabinet&&nativeCabinetGeometry(surface.nativeCabinet,host);
 if(geometry){
  // Painting and attachment use the same pose even when automatic wall mounting
  // is disabled. The visible projection never changes physical item capacity.
  const ratio=geometry.top.width/geometry.physicalWidth;
  return {...surface,dx:geometry.top.x-host.x,dy:geometry.top.y-host.y,width:geometry.physicalWidth,axis:{x:geometry.axis.x*ratio,y:geometry.axis.y*ratio},physicalWidth:geometry.physicalWidth,projectedSpan:geometry.top.width,nativeCabinetProjection:true,depth:0,nativeSideSurface:true};
 }
 if(!['left','right'].includes(host.mount))return surface;
 const sign=host.mount==='left'?1:-1;
 return {...surface,...surface.nativeSide,dx:surface.nativeSide.dx*sign,physicalWidth:surface.physicalWidth||surface.width,projectedSpan:surface.nativeSide.width,depth:0,nativeSideSurface:true};
}
export function surfaceItemWidth(f,item,host,surface){const effective=surfaceForHost(host,surface),facing=item?.facing??host.facing;if(effective.nativeCabinetProjection)return f?.fw||20;return (f?.fw||20)*(effective.nativeSideSurface&&['left','right'].includes(facing)?.45:1);}
export function surfaceAnchor(host,surface){surface=surfaceForHost(host,surface);const mirror=host.mount==='corner-right'?-1:1,sign=host.mount==='left'||(surface.wing&&host.mount==='corner-left')?1:host.mount==='right'||(surface.wing&&host.mount==='corner-right')?-1:0;return {x:host.x+(surface.dx||0)*mirror-sign*(surface.depth||0)/2,y:host.y+surface.dy};}
function surfaceAxis(host,surface){surface=surfaceForHost(host,surface);if(surface.axis)return {x:surface.axis.x*((surface.nativeCabinetProjection?host.facing==='right':['right','corner-right'].includes(host.mount))?-1:1),y:surface.axis.y};if(surface.wing)return {x:host.mount==='corner-right'?-HOME_FLOOR.sideSlope:HOME_FLOOR.sideSlope,y:-1};if(host.mount==='corner-left')return {x:1,y:0};if(host.mount==='corner-right')return {x:-1,y:0};return surfaceVector(host);}
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

export const SURFACE_GAP=3;
const epsilon=1e-7;
function surfaceContext(id,host,index,layout,catalog,options={}){
 const f=catalog.find(f=>f.id===id),surface=host&&furnitureSurfaces(catalog.find(f=>f.id===host.id),host)[index];
 if(!f?.small||!surface||host.on)return null;
 const facing=options.facing??layout.find(p=>p.id===id)?.facing??(surface.nativeSideSurface?host.facing:undefined);
 const peers=layout.filter(p=>p.id!==id&&p.on===host.id&&p.surface===index).map(p=>({...p,width:surfaceItemWidth(catalog.find(f=>f.id===p.id),p,host,surface)})).sort((a,b)=>a.offsetX-b.offsetX||a.id.localeCompare(b.id));
 return {f,surface,facing,peers,itemWidth:surfaceItemWidth(f,{facing},host,surface)};
}
// Capacity is measured in physical tabletop units; the painted axis converts
// those units to screen coordinates without changing item size or capacity.
export function surfaceCapacity(id,host,index,layout,catalog,options={}){
 const data=surfaceContext(id,host,index,layout,catalog,options);if(!data)return {fits:false,reason:'invalid-surface'};
 const {surface,peers,itemWidth}=data,occupied=peers.reduce((sum,p)=>sum+p.width,0)+Math.max(0,peers.length-1)*SURFACE_GAP;
 const required=occupied+itemWidth+(peers.length?SURFACE_GAP:0),remaining=Math.max(0,surface.width-occupied-(peers.length?SURFACE_GAP:0));
 const physicalWidth=surface.physicalWidth||surface.width,physicalRequired=(data.f.fw||20)+peers.reduce((sum,p)=>sum+(catalog.find(f=>f.id===p.id)?.fw||20),0)+peers.length*SURFACE_GAP,physicalFits=physicalRequired<=physicalWidth+epsilon;
 const fits=required<=surface.width+epsilon,projectionLimited=!!surface.projectionLimited&&!fits&&physicalFits;
 return {width:surface.width,itemWidth,occupied,remaining,required,count:peers.length,fits,physicalWidth,physicalRequired,physicalFits,projectionLimited,reason:projectionLimited?'projection-limited':itemWidth>surface.width+epsilon?'item-too-wide':!fits?'surface-full':null};
}
function rowFits(items,width){
 let edge=-width/2-SURFACE_GAP;
 for(const p of items){if(!Number.isFinite(p.offsetX)||p.offsetX-p.width/2<edge+SURFACE_GAP-epsilon||p.offsetX+p.width/2>width/2+epsilon)return false;edge=p.offsetX+p.width/2;}
 return true;
}
// Weighted bounded isotonic regression gives the least squared displacement
// for a fixed left-to-right order, after removing every physical item span.
function packedOffsets(items,width,targetId){
 let used=0;const starts=items.map(p=>{const start=used+p.width/2;used+=p.width+SURFACE_GAP;return start;});
 const slack=Math.max(0,width-(used-SURFACE_GAP)),blocks=[];
 items.forEach((p,i)=>{
  const weight=p.id===targetId?1e-6:1,value=p.offsetX+width/2-starts[i];blocks.push({from:i,to:i,weight,sum:value*weight});
  while(blocks.length>1){const a=blocks.at(-2),b=blocks.at(-1);if(a.sum/a.weight<=b.sum/b.weight)break;blocks.splice(-2,2,{from:a.from,to:b.to,weight:a.weight+b.weight,sum:a.sum+b.sum});}
 });
 const offsets=[];for(const b of blocks){const shift=Math.max(0,Math.min(slack,b.sum/b.weight));for(let i=b.from;i<=b.to;i++)offsets[i]=-width/2+starts[i]+shift;}return offsets;
}
export function planSurfacePlacement(id,host,index,layout,catalog,preferredPoint,options={}){
 const data=surfaceContext(id,host,index,layout,catalog,options),capacity=surfaceCapacity(id,host,index,layout,catalog,options);
 if(!data)return {ok:false,reason:capacity.reason,capacity,changes:[]};
 const {surface,facing,peers,itemWidth}=data,a=surfaceAnchor(host,surface),axis=surfaceAxis(host,surface);
 const target=Number.isFinite(options.offsetX)?options.offsetX:preferredPoint&&Number.isFinite(preferredPoint.x)&&Number.isFinite(preferredPoint.y)?surfaceOffsetAt(host,surface,preferredPoint):peers.length===0?(-surface.width+itemWidth)/2:peers.length===1?(surface.width-itemWidth)/2:0;
 const positionAt=offsetX=>({x:a.x+axis.x*offsetX,y:a.y+axis.y*offsetX,on:host.id,surface:index,offsetX,...(facing?{facing}:{})});
 const fallback=positionAt(Math.max(-Math.max(0,(surface.width-itemWidth)/2),Math.min(Math.max(0,(surface.width-itemWidth)/2),target)));
 if(!capacity.fits||peers.some(p=>!Number.isFinite(p.offsetX)))return {ok:false,reason:capacity.reason||'invalid-surface',capacity,position:fallback,changes:[]};
 const pointed=Number.isFinite(options.offsetX)||!!preferredPoint,pointedSlot=peers.filter(p=>p.offsetX<target).length;
 const point={x:a.x+axis.x*target,y:a.y+axis.y*target},direct=freeSurfacePosition(id,host,index,layout,catalog,point,{facing});
 if(direct&&rowFits(peers,surface.width)&&(!pointed||peers.filter(p=>p.offsetX<direct.offsetX).length===pointedSlot))return {ok:true,capacity,position:direct,changes:[{id,...direct}],moved:0};
 let best=null;
 for(let slot=0;slot<=peers.length;slot++){
  if(pointed&&slot!==pointedSlot)continue;
  const row=[...peers.slice(0,slot),{id,offsetX:target,width:itemWidth},...peers.slice(slot)],offsets=packedOffsets(row,surface.width,id);
  const score=row.reduce((sum,p,i)=>sum+(p.id===id?1e-6:1)*(offsets[i]-p.offsetX)**2,0);
  if(!best||score<best.score-epsilon)best={row,offsets,score};
 }
 const changes=best.row.map((p,i)=>({id:p.id,...(p.id===id?positionAt(best.offsets[i]):{...attachedPosition({...p,offsetX:best.offsets[i]},layout,catalog)})}));
 if(changes.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return {ok:false,reason:'invalid-surface',capacity,position:fallback,changes:[]};
 return {ok:true,capacity,position:changes.find(p=>p.id===id),changes,moved:changes.filter(p=>p.id!==id&&Math.abs(p.offsetX-peers.find(q=>q.id===p.id).offsetX)>epsilon).length};
}

export function surfaceCapacityText(plan){
 if(!plan?.ok)return plan?.reason==='projection-limited'?'這個角度會擋住物品，請改用正面或另一段檯面。':plan?.reason==='item-too-wide'?'這件物品比檯面寬，請換大一點的檯面。':plan?.reason==='surface-full'?'檯面空間不足，請先移走一件或換較大的檯面。':'請選擇可擺放的檯面。';
 const c=plan.capacity,after=Math.max(0,c.width-c.required),extra=Math.floor((after+epsilon)/(c.itemWidth+SURFACE_GAP));
 return `${plan.moved?'已預覽整理位置，確認才會一起保存。':'位置放得下，確認後保存。'}${extra?`還能放約 ${extra} 件同樣大小的物品。`:'放好後只剩小空隙。'}`;
}

// Authoring/QA data: each actual host surface gets its own capacity rather than
// a universal slot count. The mixed example is the requested three appliances.
export function surfaceCapacityReport(catalog){
 const samples=[['small','collection-port-8'],['medium','collection-port-4'],['large','collection-port-3']],rows=[];
 for(const f of catalog){if(!furnitureSurfaces(f).length)continue;
  for(const view of f.corner?['left','right']:['front','left','right']){
   const host={id:f.id,x:640,y:500,facing:view,...(f.corner?{mount:'corner-'+view}:view==='front'?{}:{mount:view})};
   for(const [index,surface] of furnitureSurfaces(f,host).entries()){
    const facing=surface.wing?(view==='right'?'right':'left'):f.corner?'front':view,footprints=samples.map(([size,id])=>{const item=catalog.find(x=>x.id===id),width=surfaceItemWidth(item,{facing},host,surface);return {size,id,width,count:Math.floor((surface.width+SURFACE_GAP)/(width+SURFACE_GAP))};}),mixedWidth=footprints.reduce((n,p)=>n+p.width,0)+2*SURFACE_GAP;
    const physicalWidth=surface.physicalWidth||surface.width,physicalRequired=samples.reduce((sum,[,id])=>sum+(catalog.find(f=>f.id===id)?.fw||20),0)+2*SURFACE_GAP;
    rows.push({id:f.id,name:f.name,view,surface:index,surfaceName:surface.name,width:surface.width,physicalWidth,projectedSpan:surface.projectedSpan??surface.width,axis:surfaceAxis(host,surface),projectionLimited:!!surface.projectionLimited,gap:SURFACE_GAP,examples:footprints,mixed:{ids:samples.map(p=>p[1]),required:mixedWidth,fits:mixedWidth<=surface.width+epsilon,physicalRequired,physicalFits:physicalRequired<=physicalWidth+epsilon}});
   }
  }
 }return rows;
}
