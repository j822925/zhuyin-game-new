// Optional layout fields: old saves retain their original position and appearance.
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
 if(host.mount==='left')return {x:1,y:-.45};
 if(host.mount==='right')return {x:1,y:.45};
 return {x:host.facing==='left'?-1:1,y:0};
}
export function floorWallX(y){return Math.max(65,200-(y-280)*.31);}
export function spatialFootprint(f,p){
 if(f.corner)return {x:p.x-f.fw/2,y:p.y-f.fh,w:f.fw,h:f.fh};
 const side=p.mount==='left'||p.mount==='right';const w=side?Math.max(50,f.fw*.62):f.fw,h=side?f.fh+f.fw*.4:f.fh;
 return {x:p.x-w/2,y:p.y-h,w,h};
}
export function floorPosition(at,f,{auto=true,area='room'}={}){
 let p={x:Math.round(at.x/5)*5,y:Math.round(at.y/5)*5,...spatialFields(at)};
 if(f.corner){const side=at.x<640?'left':'right';return {x:side==='left'?360:920,y:465,facing:side,mount:'corner-'+side};}
 if(!auto||f.flat||f.small)return p;
 // The child's pointer chooses a wall; rotation can also be chosen explicitly.
 const wallSuitable=f.cooking||f.areas?.includes('kitchen')||/cabinet|bookcase|shelf|fridge|sink|pantry|stand|desk|vanity|glass-door|bed|sofa|tub|toilet/.test(f.id);
 if(wallSuitable&&at.x<300){p.mount='left';p.facing='left';p.y=Math.max(area==='bathroom'?500:370,Math.min(690,p.y));p.x=Math.round((floorWallX(p.y)+Math.max(40,f.fw*.24))/5)*5;}
 else if(wallSuitable&&at.x>980){p.mount='right';p.facing='right';p.y=Math.max(area==='bathroom'?500:370,Math.min(690,p.y));p.x=1280-Math.round((floorWallX(p.y)+Math.max(40,f.fw*.24))/5)*5;}
 else if(wallSuitable&&at.y<(area==='bathroom'?510:390)){p.mount='back';p.facing='front';p.y=(area==='bathroom'?425:280)+f.fh;p.x=Math.max(220+f.fw/2,Math.min(1060-f.fw/2,p.x));}
 else delete p.mount;
 return p;
}
export function spatialFloorValid(f,p){
 if(f.corner)return ['corner-left','corner-right'].includes(p.mount)&&p.x>=300&&p.x<=980&&p.y>=400&&p.y<=600;
 if(p.mount==='left'||p.mount==='right')return p.y>=340&&p.y<=710&&p.x>=floorWallX(p.y)+20&&p.x<=1280-floorWallX(p.y)-20;
 const r=spatialFootprint(f,p);return r.x>=158&&r.x+r.w<=1122&&r.y>=280&&r.y+r.h<=728;
}
export function decorCamera(width,height,insets={}){
 const left=insets.left||12,top=insets.top||12,right=insets.right||12,bottom=insets.bottom||12;
 const w=Math.max(100,width-left-right),h=Math.max(90,height-top-bottom),scale=Math.max(.1,Math.min(w/1280,h/800));
 return {scale,x:640-(left+w/2)/scale,y:400-(top+h/2)/scale};
}
