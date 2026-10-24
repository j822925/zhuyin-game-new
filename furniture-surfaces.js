import {surfaceVector,spatialFields} from './home-spatial-model.js';
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
export function furnitureSurfaces(f){
 if(!f||f.small||f.flat||f.cooking)return [];
 if(f.corner)return [{name:'後方檯面',dx:65,dy:-208,width:210},{name:'轉角檯面',dx:-160,dy:-160,width:120,wing:true}];
 const kind=f.surfaceKind||(/bookcase|plant-stand/.test(f.id)?'shelf':/cabinet|pantry/.test(f.id)?'cabinet':f.id==='sofa'||f.id.endsWith('-sofa')?'sofa':f.id==='table'||/-table$|-desk$|-tea-cart$/.test(f.id)?'table':null);
 if(!kind)return [];
 const levels=f.surfaceLevels||(kind==='shelf'?[.72,.45,.18]:kind==='cabinet'?[.82]:kind==='sofa'?[.27]:[.6]);
 return levels.map((level,i)=>({name:kind==='shelf'?['上層','中層','下層'][i]:kind==='sofa'?'座墊':'檯面',dy:-Math.round(f.height*level),width:f.surfaceWidth??Math.max(40,f.fw*(kind==='sofa'?.6:.72))}));
}
export function surfaceAnchor(host,surface){const mirror=host.mount==='corner-right'?-1:1;return {x:host.x+(surface.dx||0)*mirror,y:host.y+surface.dy};}
function surfaceAxis(host,surface){if(surface.wing)return {x:host.mount==='corner-right'?-.42:.42,y:-.65};return surfaceVector(host);}
export function attachedPosition(item,layout,catalog){
 if(!item?.on)return null;
 const f=catalog.find(f=>f.id===item.id),host=layout.find(p=>p.id===item.on),base=catalog.find(f=>f.id===host?.id),surface=furnitureSurfaces(base)[item.surface];
 if(!f?.small||!host||host.on||host.id===item.id||!surface||!Number.isFinite(item.offsetX)||Math.abs(item.offsetX)+f.fw/2>surface.width/2+1)return null;
 const v=surfaceAxis(host,surface),a=surfaceAnchor(host,surface);return {x:a.x+item.offsetX*v.x,y:a.y+item.offsetX*v.y,on:host.id,surface:item.surface,offsetX:item.offsetX,...spatialFields(item)};
}
export function freeSurfacePosition(id,host,index,layout,catalog){
 const f=catalog.find(f=>f.id===id),surface=furnitureSurfaces(catalog.find(f=>f.id===host.id))[index];if(!f?.small||!surface||host.on)return null;
 const limit=surface.width/2-f.fw/2;if(limit<0)return null;
 const peers=layout.filter(p=>p.id!==id&&p.on===host.id&&p.surface===index);
 const candidates=[-limit,0,limit];for(let x=-limit;x<=limit;x+=f.fw+4)candidates.push(x);
 for(const offsetX of candidates)if(peers.every(p=>Math.abs(p.offsetX-offsetX)>=(f.fw+(catalog.find(f=>f.id===p.id)?.fw||20))/2+3)){const v=surfaceAxis(host,surface),a=surfaceAnchor(host,surface);return {x:a.x+offsetX*v.x,y:a.y+offsetX*v.y,on:host.id,surface:index,offsetX};}
 return null;
}
