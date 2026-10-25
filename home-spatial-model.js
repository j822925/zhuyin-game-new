// Optional layout fields: old free placements retain their original position.
export const HOME_FACINGS=['front','right','back','left'];
export const HOME_MOUNTS=['back','left','right','corner-left','corner-right'];
export function spatialFields(p={}){return {...(HOME_FACINGS.includes(p.facing)?{facing:p.facing}:{}),...(HOME_MOUNTS.includes(p.mount)?{mount:p.mount}:{})};}
export function spatialRole(f){
 if(f.corner)return 'corner';
 if(f.role==='dining-chair'||f.role==='dining-chair-extra')return 'chair';
 if(f.role==='kitchen-wall')return 'wall-cabinet';
 if(f.role==='kitchen-base'||f.role==='appliance-counter')return 'base';
 if(f.role==='bookcase'||f.role==='display-cabinet')return 'bookcase';
 return null;
}
export function fixtureRole(f){if(!f||f.small||f.wall||f.corner)return null;return f.cooking?'stove':/fridge/.test(f.id)?'fridge':/sink|vanity/.test(f.id)?'sink':f.rest==='bath'?'tub':null;}
export function facingOptions(f){return f?.corner?['left','right']:spatialRole(f)==='chair'?HOME_FACINGS:['front','left','right'];}
export function surfaceVector(host={}){
 if(host.mount==='left')return {x:HOME_FLOOR.sideSlope,y:-1};
 if(host.mount==='right')return {x:-HOME_FLOOR.sideSlope,y:-1};
 return {x:host.facing==='left'?-1:1,y:0};
}
// New rooms share one painted floor plan, including the bathroom. A wall snap
// aligns the furniture's BACK contact, never its variable collision-box width.
export const HOME_FLOOR={back:385,left:175,right:1105,front:730,leftFront:60,rightFront:1220,sideSlope:.34};
export const HOME_DOOR_SPACE={start:590,end:735,margin:8,wallMargin:20,innerLeft:320,innerRight:960,anchorY:640,approachY:680};
export const HOME_CORNER_SPACE={leftX:410,rightX:870,bottom:500,width:570,depth:115};
export const HOME_SIDE_DOORS={room:['left','right'],bedroom:['left','right'],kitchen:['left'],bathroom:['right']};
export function floorWallX(y){return Math.max(HOME_FLOOR.leftFront,HOME_FLOOR.left-(y-HOME_FLOOR.back)*HOME_FLOOR.sideSlope);}
export function floorWallRightX(y){return Math.min(HOME_FLOOR.rightFront,HOME_FLOOR.right+(y-HOME_FLOOR.back)*HOME_FLOOR.sideSlope);}
export function sideHasDoor(area,side){return (HOME_SIDE_DOORS[area]||[]).includes(side);}
export function sideFurnitureRange(f,side,area='room',hangHeight=0){
 const half=(f.surfaceWidth||f.fw)/2,farEnd=sideHasDoor(area,side)?HOME_DOOR_SPACE.start-HOME_DOOR_SPACE.margin-(hangHeight?HOME_DOOR_SPACE.wallMargin:0):HOME_FLOOR.front-5;
 return {min:Math.ceil((HOME_FLOOR.back+half+5-hangHeight)/5)*5,max:Math.floor((farEnd-half-hangHeight)/5)*5};
}
export function furnitureWallDepth(f){
 if(!f)return 0;
 if(f.wall)return 0;
 if(spatialRole(f)==='base'||['stove','fridge','sink'].includes(fixtureRole(f)))return 65;
 return Math.round(Math.max(25,Math.min(120,Number(f.fh)||45))/5)*5;
}
export function furnitureWallAnchor(f,p){
 const depth=furnitureWallDepth(f);
 if(p.mount==='left')return {x:p.x-depth,y:p.y};
 if(p.mount==='right')return {x:p.x+depth,y:p.y};
 return {x:p.x,y:p.y-depth};
}
// Absolute, idempotent placement: safe even if a server omits version flags.
// Wall hangings and free floor objects are intentionally not migrated.
export function canonicalMountedPosition(p,f,area='room'){
 if(!f||f.wall||f.ceiling||f.flat||f.small||!HOME_MOUNTS.includes(p.mount)||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
 if(f.corner){if(!['corner-left','corner-right'].includes(p.mount))return null;const side=p.mount==='corner-left'?'left':'right';return {x:side==='left'?HOME_CORNER_SPACE.leftX:HOME_CORNER_SPACE.rightX,y:HOME_CORNER_SPACE.bottom,facing:side,mount:'corner-'+side};}
 const depth=furnitureWallDepth(f);
 if(p.mount==='back')return {x:Math.max(Math.ceil((HOME_FLOOR.left+f.fw/2)/5)*5,Math.min(Math.floor((HOME_FLOOR.right-f.fw/2)/5)*5,Math.round(p.x/5)*5)),y:HOME_FLOOR.back+depth,facing:'front',mount:'back'};
 if(p.mount==='left'||p.mount==='right'){const range=sideFurnitureRange(f,p.mount,area),y=Math.max(range.min,Math.min(range.max,Math.round(p.y/5)*5)),x=p.mount==='left'?floorWallX(y)+depth:floorWallRightX(y)-depth;return {x:Math.round(x/5)*5,y,facing:p.mount,mount:p.mount};}
 return null;
}
export function spatialFootprint(f,p){
 if(f.corner)return {x:p.x-HOME_CORNER_SPACE.width/2,y:p.y-HOME_CORNER_SPACE.depth,w:HOME_CORNER_SPACE.width,h:HOME_CORNER_SPACE.depth};
 const side=p.mount==='left'||p.mount==='right';const w=side?Math.max(50,f.fw*.62):f.fw,h=side?f.fh+f.fw*.4:f.fh;
 return {x:p.x-w/2,y:p.y-h,w,h};
}
export function floorPosition(at,f,{auto=true,area='room'}={}){
 let p={x:Math.round(at.x/5)*5,y:Math.round(at.y/5)*5,...spatialFields(at)};
 if(f.corner){if(!auto&&['corner-left','corner-right'].includes(at.mount))return p;const side=at.x<640?'left':'right';return {x:side==='left'?HOME_CORNER_SPACE.leftX:HOME_CORNER_SPACE.rightX,y:HOME_CORNER_SPACE.bottom,facing:side,mount:'corner-'+side};}
 if(!auto||f.flat||f.small)return p;
 // The child's pointer chooses a wall; rotation can also be chosen explicitly.
 const wallSuitable=f.cooking||f.areas?.includes('kitchen')||/cabinet|bookcase|shelf|fridge|sink|pantry|stand|desk|vanity|glass-door|bed|sofa|tub|toilet/.test(f.id);
 if(wallSuitable&&at.x<300){p.mount='left';Object.assign(p,canonicalMountedPosition(p,f,area));}
 else if(wallSuitable&&at.x>980){p.mount='right';Object.assign(p,canonicalMountedPosition(p,f,area));}
 else if(wallSuitable&&at.y<HOME_FLOOR.back+90){p.mount='back';Object.assign(p,canonicalMountedPosition(p,f,area));}
 else delete p.mount;
 return p;
}
export function placementBlocksDoor(f,p,area='room'){
 if(!f||!p||f.small||f.flat||f.ceiling||p.on)return false;
 const sides=HOME_SIDE_DOORS[area]||[];
 if(f.wall){const side=p.mount==='left'||p.mount==='right'?p.mount:null;if(!sides.includes(side))return false;const half=(f.surfaceWidth||f.fw)/2,near=p.y+180+half;return near>HOME_DOOR_SPACE.start-HOME_DOOR_SPACE.margin-HOME_DOOR_SPACE.wallMargin;}
 if(sides.includes(p.mount)){const near=p.y+(f.surfaceWidth||f.fw)/2;return near>HOME_DOOR_SPACE.start-HOME_DOOR_SPACE.margin;}
 const r=spatialFootprint(f,p);
 if(r.y+r.h<=HOME_DOOR_SPACE.start||r.y>=HOME_DOOR_SPACE.end)return false;
 return sides.some(side=>side==='left'?r.x<HOME_DOOR_SPACE.innerLeft&&r.x+r.w>HOME_FLOOR.leftFront:r.x+r.w>HOME_DOOR_SPACE.innerRight&&r.x<HOME_FLOOR.rightFront);
}
export function spatialFloorValid(f,p){
 if(f.corner)return ['corner-left','corner-right'].includes(p.mount)&&p.x>=300&&p.x<=980&&p.y>=400&&p.y<=600;
 // Do not discard existing saved side placements when the painted room changes.
 if(p.mount==='left'||p.mount==='right'){const legacyX=Math.max(65,200-(p.y-280)*.31),minX=Math.min(legacyX,floorWallX(p.y));return p.y>=340&&p.y<=710&&p.x>=minX+20&&p.x<=1280-minX-20;}
 const r=spatialFootprint(f,p);return r.x>=158&&r.x+r.w<=1122&&r.y>=280&&r.y+r.h<=728;
}
export function decorCamera(width,height,insets={}){
 const left=insets.left||12,top=insets.top||12,right=insets.right||12,bottom=insets.bottom||12;
 const w=Math.max(100,width-left-right),h=Math.max(90,height-top-bottom),scale=Math.max(.1,Math.min(w/1280,h/800));
 return {scale,x:640-(left+w/2)/scale,y:400-(top+h/2)/scale};
}
