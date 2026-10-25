import {furnitureSurfaces,surfaceItemWidth} from './furniture-surfaces.js';

const layouts=['layout','kitchenLayout','bedroomLayout','bathroomLayout'];
// The published learning pages understand two L worktops and discard surface 2.
// Reserve two disjoint spans of their 210-unit back worktop for the new 78/56
// workspaces. Their outer edges remain exactly -105/+105; no item is enlarged.
const spans={2:{center:-66,edge:-27},0:{center:77,edge:49}};
// Match attachedPosition's one-unit allowance for old fractional coordinates.
const tolerance=1+1e-7;

function validPosition(item,host,base,f,surfaceIndex,offsetX){
 const surface=furnitureSurfaces(base,host)[surfaceIndex];
 return surface&&Number.isFinite(offsetX)&&Math.abs(offsetX)+surfaceItemWidth(f,item,host,surface)/2<=surface.width/2+tolerance;
}

function decodedPosition(item,host,base,f){
 if(item.surface!==0||validPosition(item,host,base,f,0,item.offsetX))return null;
 const surface=item.offsetX<=spans[2].edge?2:item.offsetX>=spans[0].edge?0:null;
 if(surface===null)return null;
 const offsetX=item.offsetX-spans[surface].center;
 return validPosition(item,host,base,f,surface,offsetX)?{surface,offsetX}:null;
}

function transform(state,catalog,decode){
 if(!state||typeof state!=='object')return state;
 const next={...state},byId=new Map(catalog.map(f=>[f.id,f]));
 for(const key of layouts){
  if(!Array.isArray(state[key]))continue;
  const layout=state[key],hosts=new Map(layout.filter(p=>p&&typeof p==='object').map(p=>[p.id,p])),legacyHosts=new Set();
  if(decode)for(const item of layout){
   const f=byId.get(item?.id),host=hosts.get(item?.on),base=byId.get(host?.id);
   if(item?.surface!==0||!f?.small||!base?.corner||host.on||!Number.isFinite(item.offsetX))continue;
   // A partially matching legacy row must be migrated as a whole. Otherwise a
   // small prop could take the short workspace before its larger neighbour.
   if(!validPosition(item,host,base,f,0,item.offsetX)&&!decodedPosition(item,host,base,f)&&Math.abs(item.offsetX)+f.fw/2<=106)legacyHosts.add(host.id);
  }
  if(decode)for(const host of hosts.values()){
   const base=byId.get(host.id);if(!base?.corner||host.on||legacyHosts.has(host.id))continue;
   const surfaces=furnitureSurfaces(base,host),rows=new Map();
   for(const item of layout){
    const f=byId.get(item?.id);if(item?.on!==host.id||!f?.small)continue;
    const trial={...item,...decodedPosition(item,host,base,f)};
    if(!validPosition(trial,host,base,f,trial.surface,trial.offsetX))continue;
    const row=rows.get(trial.surface)||[];row.push({offset:trial.offsetX,width:surfaceItemWidth(f,trial,host,surfaces[trial.surface])});rows.set(trial.surface,row);
   }
   // Individually recognizable offsets can still belong to a legacy wide
   // row. Accept an encoded host only when its complete trial layout fits.
   for(const [index,row]of rows){
    row.sort((a,b)=>a.offset-b.offset);
    const required=row.reduce((sum,item)=>sum+item.width,0)+Math.max(0,row.length-1)*3;
    if(required>surfaces[index].width+1e-7||row.some((item,i)=>i&&item.offset-item.width/2<row[i-1].offset+row[i-1].width/2+3-1e-7)){legacyHosts.add(host.id);break;}
   }
  }
  next[key]=layout.map(item=>{
   if(!item||typeof item!=='object')return item;
   const copy={...item},f=byId.get(item.id),host=hosts.get(item.on),base=byId.get(host?.id);
   if(!item.on||!f?.small||!host||host.on||!base?.corner||!Number.isFinite(item.offsetX))return copy;
   if(decode){
    // A valid in-memory short-worktop position is never decoded a second time.
    if(legacyHosts.has(host.id))return copy;
    const position=decodedPosition(item,host,base,f);
    if(position)return {...copy,...position};
   }else if((item.surface===0||item.surface===2)&&validPosition(item,host,base,f,item.surface,item.offsetX)){
    return {...copy,surface:0,offsetX:item.offsetX+spans[item.surface].center};
   }
   // Unknown or former oversized positions still use the model's legacy repair.
   return copy;
  });
 }
 return next;
}

// Both functions produce display/storage copies; a save cannot move live props.
export const encodeHomeSurfaceState=(state,catalog)=>transform(state,catalog,false);
export const decodeHomeSurfaceState=(state,catalog)=>transform(state,catalog,true);
