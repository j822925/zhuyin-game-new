import {floorWallX,floorWallRightX,spatialRole,HOME_FLOOR} from './home-spatial-model.js';
import {HOME_PERSPECTIVE_ART} from './data/home-perspective-art.js';

// Image landmarks, not a new physical size of the purchased cabinet. All drawing
// uses one uniform scale. Each style was measured on its own cropped source.
export const NATIVE_CABINET_LANDMARKS_BY_STYLE={moon:{
 base:{width:740,height:1609,backNear:{x:43,y:1604},backFar:{x:382,y:718},backFarInferred:true,topNear:{x:188,y:944},topFar:{x:560,y:9},nearTopHeight:660,topInset:4,nearDepth:366},
 wall:{width:661,height:1744,backNear:{x:18,y:1588},topNear:{x:145,y:755},topFar:{x:513,y:13},nearTopHeight:833,nearDepth:276}
},daisy:{
 base:{width:599,height:1197,backNear:{x:40,y:1192},backFar:{x:330,y:572},backFarInferred:true,topNear:{x:150,y:710},topFar:{x:462,y:10},nearTopHeight:482,topInset:4,nearDepth:295},
 wall:{width:484,height:1135,backNear:{x:14,y:1060},topNear:{x:106,y:532},topFar:{x:373,y:12},nearTopHeight:528,nearDepth:200}
},fox:{
 base:{width:620,height:1150,backNear:{x:40,y:1145},backFar:{x:340,y:525},backFarInferred:true,topNear:{x:155,y:695},topFar:{x:490,y:10},nearTopHeight:450,topInset:4,nearDepth:295},
 wall:{width:454,height:1100,backNear:{x:14,y:1015},topNear:{x:101,y:500},topFar:{x:352,y:12},nearTopHeight:515,nearDepth:190}
},honey:{
 base:{width:608,height:1180,backNear:{x:40,y:1175},backFar:{x:324,y:528},backFarInferred:true,topNear:{x:153,y:705},topFar:{x:475,y:10},nearTopHeight:470,topInset:4,nearDepth:295},
 wall:{width:453,height:1051,backNear:{x:12,y:972},topNear:{x:100,y:500},topFar:{x:350,y:12},nearTopHeight:472,nearDepth:190}
},ocean:{
 base:{width:649,height:1193,backNear:{x:42,y:1187},backFar:{x:348,y:530},backFarInferred:true,topNear:{x:165,y:712},topFar:{x:505,y:10},nearTopHeight:475,topInset:4,nearDepth:318},
 wall:{width:472,height:1115,backNear:{x:14,y:1045},topNear:{x:104,y:500},topFar:{x:363,y:12},nearTopHeight:545,nearDepth:195}
},berry:{
 base:{width:608,height:1225,backNear:{x:40,y:1218},backFar:{x:318,y:558},backFarInferred:true,topNear:{x:155,y:730},topFar:{x:469,y:10},nearTopHeight:488,topInset:4,nearDepth:303},
 wall:{width:470,height:1147,backNear:{x:14,y:1080},topNear:{x:102,y:534},topFar:{x:363,y:12},nearTopHeight:546,nearDepth:194}
}};
export const NATIVE_CABINET_LANDMARKS=NATIVE_CABINET_LANDMARKS_BY_STYLE.moon;
export function nativeCabinetGeometry(f,p={}){
 const role=spatialRole(f),name=role==='base'?'base':role==='wall-cabinet'?'wall':null;
 if(!NATIVE_CABINET_LANDMARKS_BY_STYLE[f?.style]||!name||!['left','right'].includes(p.facing))return null;
 const mark=NATIVE_CABINET_LANDMARKS_BY_STYLE[f.style][name],sign=p.facing==='left'?1:-1,mounted=['left','right'].includes(p.mount);
 const scale=f.height*(name==='base'?.84:1)/mark.nearTopHeight,w=mark.width*scale,h=mark.height*scale;
 const length=(mark.topNear.y-mark.topFar.y)*scale,axis={x:(mark.topFar.x-mark.topNear.x)/(mark.topNear.y-mark.topFar.y),y:-1};
 let x,y;
 if(name==='base'){
  const back={x:(mark.backNear.x+mark.backFar.x)/2,y:(mark.backNear.y+mark.backFar.y)/2};
  const contactX=mounted?(sign>0?floorWallX(p.y):floorWallRightX(p.y)):p.x-sign*25;
  x=contactX-(sign>0?back.x:mark.width-back.x)*scale;y=p.y-back.y*scale;
 }else{
  // Hanging cabinets align their actual near BACK fixing point to the wall,
  // rather than centering a tall side sprite around its inventory coordinates.
  const nearY=p.y+length/2,contactX=mounted?(sign>0?floorWallX(nearY+180):floorWallRightX(nearY+180)):p.x-sign*15;
  x=contactX-(sign>0?mark.backNear.x:mark.width-mark.backNear.x)*scale;y=nearY-mark.backNear.y*scale;
 }
 const center={x:(mark.topNear.x+mark.topFar.x)/2,y:(mark.topNear.y+mark.topFar.y)/2};
 return {name,x,y,w,h,scale,length,axis,top:{x:x+(sign>0?center.x:mark.width-center.x)*scale,y:y+center.y*scale,width:Math.max(0,length-(mark.topInset||0)*2)},physicalWidth:f.surfaceWidth||f.fw};
}

// Actual inner shelf bearing edges, from near to far, measured in each native
// source. These are NOT the decorative roof or the closed lower cabinet panel.
export const NATIVE_BOOKCASE_LANDMARKS={
 moon:{width:356,height:1400,shelves:[[225,643,300,455],[225,819,300,662],[225,1045,304,837]]},
 daisy:{width:269,height:896,shelves:[[164,405,222,303],[164,540,222,441],[164,664,229,557]]},
 fox:{width:269,height:778,shelves:[[142,357,216,258],[143,474,216,377],[146,585,230,473]]},
 honey:{width:267,height:873,shelves:[[145,421,224,284],[145,544,223,413],[146,676,232,528]]},
 ocean:{width:288,height:943,shelves:[[166,452,240,317],[167,578,240,466],[168,731,251,579]]},
 berry:{width:268,height:939,shelves:[[157,449,218,306],[159,576,219,444],[160,742,231,563]]}
};
export function nativeBookcaseGeometry(f,p={}){
 const mark=NATIVE_BOOKCASE_LANDMARKS[f?.style],cell=HOME_PERSPECTIVE_ART[f?.style+'Side']?.cells?.bookcase;
 if(!mark||!cell||spatialRole(f)!=='bookcase'||!['left','right'].includes(p.facing))return null;
 // This is the existing complete-cutout pose. The renderer shares this function
 // so shelves cannot drift if its image aspect ratio or mounting pose changes.
 const h=f.height*1.16,w=h*cell.w/cell.h,sign=p.facing==='left'?1:-1,length=f.surfaceWidth||f.fw;
 const mounted=['left','right'].includes(p.mount);
 const nearX=mounted?p.x-sign*HOME_FLOOR.sideSlope*length/2:p.x,nearY=mounted?p.y+length/2:p.y;
 const x=mounted?nearX-(sign>0?.52:.48)*w:p.x-w/2,y=nearY-h;
 const physicalWidth=f.surfaceWidth??Math.max(40,f.fw*.72);
 const point=(sx,sy)=>({x:x+(sign>0?sx/mark.width:1-sx/mark.width)*w,y:y+sy/mark.height*h});
 const shelves=mark.shelves.map(([nx,ny,fx,fy])=>{
  const near=point(nx,ny),far=point(fx,fy),center={x:(near.x+far.x)/2,y:(near.y+far.y)/2};
  return {...center,near,far,physicalWidth,projectedSpan:near.y-far.y,axis:{x:Math.abs(far.x-near.x)/physicalWidth,y:(far.y-near.y)/physicalWidth}};
 });
 return {name:'bookcase',x,y,w,h,physicalWidth,shelves};
}
