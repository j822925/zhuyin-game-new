import {drawHomeRest,drawHomePlay} from './adventure-rest-art.js';
import {clothingCharacter,ensureClothingArt,drawClothing} from './adventure-clothing.js';
import {GROVE_WORLD,ISLAND_WORLD} from './adventure-exploration-model.js';
import {drawExploration} from './adventure-exploration-art.js';
import {drawFishing} from './adventure-fishing-feedback.js';
import {drawDining,diningFrame} from './adventure-dining.js';
import {HOME_CELLS} from './data/home-atlas-cells.js';
import {isInterior,layoutFor} from './adventure-model.js';
import {adventureMediaUrl as mediaUrl} from './adventure-media.js';
import {WORLD,TREES,GROVE_TREES,SPAWN,MONSTER_HOME,FURNITURE} from './adventure-model.js';
import {createRoomGround,drawPaintedRoomShell,drawRoomWardrobe,drawFurniture,drawInteriorDoors} from './adventure-room.js';
import {attachedPosition} from './furniture-surfaces.js';
import {walkFrame,walkPosture} from './adventure-animation.js';
import {drawVillageLife,drawFarm} from './adventure-life-art.js';
import {loadTerrain} from './adventure-terrain.js?v=20261010-light2';
import {drawGentleSide,sideReachX} from './adventure-side-reach.js';
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function line(c,points,color,width){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
export function star(c,x,y,r,color,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.46:r;i?c.lineTo(Math.cos(a)*d,Math.sin(a)*d):c.moveTo(Math.cos(a)*d,Math.sin(a)*d);}c.closePath();c.fillStyle=color;c.fill();c.restore();}
export async function loadAtlas(src,columns,boundaries,{adaptiveRows=false}={}){
  const image=new Image();image.src=mediaUrl(src);await image.decode();
  const scan=document.createElement('canvas');scan.width=image.width;scan.height=image.height;
  const ctx=scan.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,image.width,image.height).data;
  const rows=boundaries.map(v=>Math.round(v*image.height));
  const columnRows=Array.from({length:columns},(_,col)=>rows.map((y,index)=>{
    if(!adaptiveRows||!index||index===rows.length-1)return y;
    const left=Math.round(col*image.width/columns),right=Math.round((col+1)*image.width/columns);
    let best=y,cost=Infinity;
    for(let yy=Math.max(1,y-Math.round(image.height*.055));yy<Math.min(image.height-1,y+image.height*.055);yy++){
      let occupied=0;
      for(let dy=-1;dy<=1;dy++)for(let x=left;x<right;x++)if(pixels[((yy+dy)*image.width+x)*4+3]>100)occupied++;
      const value=occupied+Math.abs(yy-y)*.03;
      if(value<cost){best=yy;cost=value;}
    }
    return best;
  }));
  const cells=[];
  for(let row=0;row<rows.length-1;row++)for(let col=0;col<columns;col++){
    const x0=Math.round(col*image.width/columns),x1=Math.round((col+1)*image.width/columns),y0=columnRows[col][row],y1=columnRows[col][row+1],w=x1-x0,h=y1-y0;
    const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=null,max=0;
    const solid=n=>pixels[((y0+Math.floor(n/w))*image.width+x0+n%w)*4+3]>70;
    for(let n=0;n<seen.length;n++){
      if(seen[n]||!solid(n))continue;let head=0,tail=1,l=w,t=h,r=0,b=0;seen[n]=1;queue[0]=n;
      while(head<tail){const v=queue[head++],x=v%w,y=Math.floor(v/w);l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
        for(const next of [x?v-1:-1,x<w-1?v+1:-1,y?v-w:-1,y<h-1?v+w:-1])if(next>=0&&!seen[next]&&solid(next)){seen[next]=1;queue[tail++]=next;}
      }
      if(tail>max){max=tail;best={x:x0+Math.max(0,l-2),y:y0+Math.max(0,t-2),w:Math.min(w-1,r+2)-Math.max(0,l-2)+1,h:Math.min(h-1,b+2)-Math.max(0,t-2)+1};}
    }
    if(!best||max<100)throw new Error('Missing sprite '+src+':'+cells.length);
    cells.push(best);
  }
  return {image,cells};
}
export async function loadArt(){
  const [rabbit,forest,furniture,walk,sideWalk,frontBackWalk,life,fish,terrain,seedling,cooking]=await Promise.all([
    loadAtlas('assets/adventure-prototype/rabbit-cohesive-v3.png',4,[0,.5,1]),
    loadAtlas('assets/adventure-prototype/forest-atlas-v1.png',2,[0,.5,1]),
    loadAtlas('assets/adventure-prototype/furniture-v2.png',3,[0,.49,1]),
    loadAtlas('assets/adventure-prototype/rabbit-daisy-walk-v1.png',4,[0,291/1402,577/1402,863/1402,1142/1402,1]),
    loadAtlas('assets/adventure-prototype/rabbit-daisy-side-eight-v4.png',4,[0,.5,1]),
    loadAtlas('assets/adventure-prototype/rabbit-daisy-front-back-walk-v1.png',4,[0,.49,1]),
    loadAtlas('assets/adventure-prototype/farm-pond-atlas-v2.png',3,[0,.5,1]),
    loadAtlas('assets/adventure-prototype/pond-fish-atlas-v1.png',3,[0,1]),
    loadTerrain(),
    loadAtlas('assets/adventure-prototype/seedling-painted-v1.png',1,[0,1]),
    loadAtlas('assets/adventure-prototype/cooking-atlas-v1.png',3,[0,.5,1]),
  ]);
  furniture.cells=HOME_CELLS.furniture.cells;
  // Register full lower-body poses at the collar, keeping a shared head.
  // Never resize or rotate individual limbs.
  for(const atlas of [rabbit,walk,sideWalk,frontBackWalk]){
  const scan=document.createElement('canvas');scan.width=atlas.image.width;scan.height=atlas.image.height;
  const ctx=scan.getContext('2d',{willReadFrequently:true});ctx.drawImage(atlas.image,0,0);
  const pixels=ctx.getImageData(0,0,scan.width,scan.height).data;
  for(const s of atlas.cells){
    let narrow=Infinity,neck=Math.round(s.h*.565),neckCenter=s.w/2;
    for(let yy=Math.floor(s.h*.50);yy<Math.ceil(s.h*.66);yy++){
      let left=s.w,right=-1;
      for(let xx=0;xx<s.w;xx++)if(pixels[((s.y+yy)*scan.width+s.x+xx)*4+3]>150){left=Math.min(left,xx);right=xx;}
      const width=right-left;if(width>12&&width<narrow){narrow=width;neck=yy;neckCenter=(left+right)/2;}
    }
    let left=s.w,right=0;
    for(let yy=0;yy<neck;yy++)for(let xx=0;xx<s.w;xx++)if(pixels[((s.y+yy)*scan.width+s.x+xx)*4+3]>150){left=Math.min(left,xx);right=Math.max(right,xx);}
    s.neck=neck;s.neckCenter=neckCenter;s.headWidth=right-left+1;s.headCenter=(left+right)/2;
  }
  }
  return {rabbit,forest,furniture,walk,sideWalk,frontBackWalk,life,fish,terrain,seedling,cooking};
}
function stamp(c,atlas,index,x,y,height,alpha=1){
  const s=atlas.cells[index],w=s.w/s.h*height;c.save();c.globalAlpha=alpha;c.drawImage(atlas.image,s.x,s.y,s.w,s.h,x-w/2,y-height,w,height);c.restore();
}
export function drawRabbit(c,art,{x,y,height=110,outfit='daisy',direction=0,walking=false,phase=0,wand=true,casting=0,shadow=true}){
  const h=height,frame=walkFrame(walking,phase,direction===1||direction===3?art.sideWalk.cells.length:4),step=walking?Math.sin(phase):0;
  const posture=walkPosture(walking&&outfit==='daisy',phase,direction);
  const collarOffset=posture.bob*h,bodyHeight=h*.454-collarOffset;
  let poseGrip=null;
  // Continuous artwork keeps shoulders, arms, torso and boots connected.
  // Both costumes retain the same upper silhouette and face.
  const head=art.rabbit.cells[direction],body=art.rabbit.cells[(outfit==='gardener'?4:0)+direction];
  // Only the frontal daisy pose changes registration: asymmetric ears and
  // the flower must not decide where the chin sits above the collar.
  const frontAligned=outfit==='daisy'&&direction===0;
  const headOffsetX=frontAligned?(head.w/2-head.neckCenter)/head.h*h:0;
  const drawRegion=(cell,from,to)=>{
    const width=cell.w/cell.h*h;
    c.drawImage(art.rabbit.image,cell.x,cell.y+cell.h*from,cell.w,cell.h*(to-from),-width/2,-h+h*from,width,h*(to-from));
  };
  if(shadow){ellipse(c,x,y+1,h*.19,h*.044,'#3b4c2e36');ellipse(c,x,y,h*.12,h*.021,'#37492b20');}
  c.save();c.translate(x,y);c.rotate((outfit==='daisy'?0:step*.022)+(casting?Math.sin(casting*Math.PI)*-.055:0));
  // Share the head down to the fur just above the collar; preserve the
  // illustrator's uninterrupted shoulders and limbs below it.
  if(outfit==='daisy'){
    const side=direction===1||direction===3;
    const atlas=frame?(side?art.sideWalk:art.frontBackWalk):art.walk;
    // Each complete pose includes BOTH counter-swinging arms. The far arm
    // recedes behind the torso, instead of remaining a fixed bump in front.
    // Mirror complete front/back passing poses to alternate the support foot.
    const mirror=frame>0&&((side&&direction===3)||(!side&&frame===4));
    const index=!frame?direction:side?frame-1:(direction===2?4:0)+(frame===4?1:frame-1);
    const s=atlas.cells[index],sx=(head.w/head.h*h)/s.headWidth;
    const bodyAnchor=frontAligned?s.neckCenter:s.headCenter;
    if(frame){
      // Palm centers measured in the source sheets. Register the prop with
      // the same whole-body transform, including the mirrored passing pose.
      const palms=side?[[135,368],[558,378],[955,380],[1384,361],[257,857],[622,875],[995,879],[1308,872]]:
        direction===0?[[269,340],[650,349],[1027,349],[482,349]]:
        [[137,794],[482,822],[870,817],[650,822]];
      const [px,py]=palms[frame-1];
      const gx=(px-s.x-bodyAnchor)*sx;
      poseGrip={x:mirror?-gx:gx,y:-bodyHeight+(py-s.y-s.neck)/(s.h-s.neck)*bodyHeight};
      if(side)poseGrip.x=sideReachX(poseGrip.x,poseGrip.y,h);
    }else if(frontAligned)poseGrip={x:h*.15+(s.headCenter-bodyAnchor)*sx,y:-h*.25};
    c.save();if(mirror)c.scale(-1,1);
    // The complete connected body compresses/extends by at most 3.1%.
    // Its bottom stays at y=0, so the planted foot and shadow never bounce.
    drawGentleSide(c,h,ctx=>ctx.drawImage(atlas.image,s.x,s.y+s.neck,s.w,s.h-s.neck,-bodyAnchor*sx,-bodyHeight,s.w*sx,bodyHeight),side&&frame?'normal':null);c.restore();
  }else drawRegion(body,.565,1);
  // Follow the moving collar, rotating around the neck rather than the
  // image center. The existing fur/collar overlap conceals the small tilt.
  c.save();c.translate(0,collarOffset-h*.44);c.rotate(posture.headAngle);
  c.translate(headOffsetX,h*.44);drawRegion(head,0,.565);c.restore();
  if(wand){
    let grip=[{x:.15,y:-.25},{x:-.10,y:-.245},{x:-.15,y:-.25},{x:.10,y:-.245}][direction];
    const sign=direction===2||direction===1?-1:1;
    c.save();c.translate(poseGrip?.x??grip.x*h,poseGrip?.y??grip.y*h);c.rotate(sign*.13+(casting?Math.sin(casting*Math.PI)*sign*.8:0));
    line(c,[[0,0],[0,-h*.235]],'#715939',h*.021);line(c,[[-h*.003,0],[-h*.003,-h*.235]],'#bc975b',h*.01);
    star(c,0,-h*.265,h*.067,'#ce9c49');star(c,0,-h*.268,h*.052,'#ffe1a0');
    line(c,[[-h*.03,-h*.16],[h*.03,-h*.135],[0,-h*.105]],'#9caf83',h*.015);c.restore();
  }
  c.restore();
}
const dollRequests=new WeakMap();
export function drawDoll(canvas,art,options){
  const request={};dollRequests.set(canvas,request);
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
  const pose={x:canvas.width*.5,y:canvas.height*.94,height:canvas.height*.88,walking:false,...options};
  if(clothingCharacter(options.outfit)){
    if(drawClothing(c,art,pose))return;
    return ensureClothingArt(options.outfit).then(()=>{if(dollRequests.get(canvas)===request){c.clearRect(0,0,canvas.width,canvas.height);drawClothing(c,art,pose);}}).catch(()=>{if(dollRequests.get(canvas)===request){c.fillStyle='#536c50';c.font='16px sans-serif';c.fillText('圖片待載入',8,canvas.height/2);}});
  }
  drawRabbit(c,art,pose);
}
import {islandCamera,islandZoomLimits} from './adventure-map-zoom.js';
export class ForestScene{
  constructor(canvas,art){
    this.drawPlayer=drawRabbit;
    this.canvas=canvas;this.c=canvas.getContext('2d');this.art=art;this.ground=art.terrain.village;this.roomGround=createRoomGround();this.area='forest';this.editing=false;this.placement=null;this.player={...SPAWN,direction:0,moving:false,phase:0};
    this.monster={...MONSTER_HOME,visible:true,hp:3,direction:0,phase:0,moving:false,wait:1.1,route:[]};this.camera={x:0,y:0,scale:1};this.marker=null;this.castAt=0;this.last=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  }
  resize(){const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.width=rect.width;this.height=rect.height;this.dpr=dpr;}
  toWorld(x,y){const r=this.canvas.getBoundingClientRect(),cam=this.camera;return {x:(x-r.left)/cam.scale+cam.x,y:(y-r.top)/cam.scale+cam.y};}
  toScreen(x,y){return {x:(x-this.camera.x)*this.camera.scale,y:(y-this.camera.y)*this.camera.scale};}
  render(now,state,battle){
    this.resize();const {c,player:p,monster:m}=this;
    const bounds=this.area==='grove'?GROVE_WORLD:this.area==='island'?ISLAND_WORLD:WORLD;
    let scale=this.area==='island'?Math.max(.55,Math.min(.92,this.width/1280)):this.area==='grove'?Math.max(.7,Math.min(1.15,this.width/1100)):Math.max(this.width/WORLD.width,this.height/WORLD.height,battle&&this.width<700?.8:0),viewW=this.width/scale,viewH=this.height/scale;
    const focus=battle?{x:(p.x+m.x)/2,y:(p.y+m.y)/2+viewH*.14}:p;
    let desired={x:Math.max(0,Math.min(bounds.width-viewW,focus.x-viewW/2)),y:Math.max(0,Math.min(bounds.height-viewH,focus.y-viewH/2))};
    if(this.fishingView&&this.area==='forest'){const target={x:960,y:590};desired={x:Math.max(0,Math.min(WORLD.width-viewW,target.x-viewW/2)),y:Math.max(0,Math.min(WORLD.height-viewH,target.y-viewH*.52))};}
    if(this.area==='farm'){
      // Cover the viewport at one scale; choosing seeds never zooms the whole map.
      const target=this.farmFocus||p;
      desired={x:Math.max(0,Math.min(WORLD.width-viewW,target.x-viewW/2)),y:Math.max(0,Math.min(WORLD.height-viewH,target.y-viewH*.45))};
    }
    if(isInterior(this.area)){
      if(this.editing){
        const mobile=this.width<601,panel=mobile?0:380,availableH=this.height-(mobile?350:160);
        scale=Math.max(.22,Math.min((this.width-panel-30)/1060,availableH/650));
        desired={x:640-(this.width-panel)/2/scale,y:440-(this.height-(mobile?220:0))/2/scale};
      }else{
        scale=Math.max(this.width/1270,this.height/1040);viewW=this.width/scale;viewH=this.height/scale;
        desired={x:Math.max(0,Math.min(WORLD.width-viewW,p.x-viewW/2)),y:Math.max(-60,Math.min(800-viewH,p.y-viewH*.64))};
      }
    }

    if(this.foodTrayHeight&&isInterior(this.area)&&!this.dining&&!this.editing){desired.y=p.y-Math.max(190,this.height-this.foodTrayHeight-32)*.84/scale;}
    if(this.dining&&this.area==='room'){
      scale=Math.max(scale,Math.min(1.5,this.height/470));viewW=this.width/scale;viewH=this.height/scale;
      desired={x:Math.max(0,Math.min(1280-viewW,(p.x+this.dining.table.x)/2-viewW/2)),y:Math.max(-60,Math.min(800-viewH,p.y-55-viewH*.5))};
    }
    if(this.area==='island'){
      const view=this.islandView;
      if(view&&p.moving)view.free=false;
      const limits=islandZoomLimits(this.width,this.height);
      scale=view?Math.max(limits.min,Math.min(limits.max,view.scale)):limits.normal;
      const bounded=islandCamera({scale,x:view?.free?view.x:p.x-this.width/scale/2,y:view?.free?view.y:p.y-this.height/scale/2},this.width,this.height);
      scale=bounded.scale;desired={x:bounded.x,y:bounded.y};
      if(view){Object.assign(view,bounded);if(view.free)Object.assign(this.camera,bounded);}
    }
    if(this.wasDining!==!!this.dining){this.camera.x=desired.x;this.camera.y=desired.y;this.wasDining=!!this.dining;}
    this.camera.scale=scale;for(const axis of ['x','y'])this.camera[axis]=Math.abs(desired[axis]-this.camera[axis])<.1?desired[axis]:this.camera[axis]+(desired[axis]-this.camera[axis])*(this.reduced.matches?1:.13);
    if(this.area==='island')Object.assign(this.camera,islandCamera(this.camera,this.width,this.height));

    if(this.area==='farm'){this.camera.x=Math.max(0,Math.min(WORLD.width-viewW,this.camera.x));this.camera.y=Math.max(0,Math.min(WORLD.height-viewH,this.camera.y));}
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle=isInterior(this.area)?'#d9dfcb':this.area==='island'?'#46b6c8':'#abc48d';c.fillRect(0,0,this.width,this.height);c.scale(scale,scale);c.translate(-this.camera.x,-this.camera.y);
    if(isInterior(this.area)){this.renderRoom(c,now,state);return;}
    if(this.area==='farm'){drawFarm(c,this.art,state,this,now);return;}
    if(this.area==='grove'||this.area==='island'){drawExploration(c,this.art,state,this,now,battle,drawMonster,star);return;}
    c.drawImage(this.ground,0,0,WORLD.width,WORLD.height);
    if(this.area==='forest')drawVillageLife(c,this.art,state,now,this);
    const clock=this.reduced.matches?0:now/1000;
    // Shadows stay on the floor; everything above them sorts by its feet.
    const grove=this.area==='grove',trees=grove?GROVE_TREES:TREES;
    if(!grove)ellipse(c,240,322,133,25,'#4a623526');for(const t of trees)ellipse(c,t.x+18,t.y,t.size*.3,t.size*.08,'#47602c21');
    if(grove){
      // Soft pools of light and flowers use the original forest palette.
      for(const [x,y] of [[365,400],[631,351],[755,619],[932,416]]){
        const glow=c.createRadialGradient(x,y,2,x,y,45);glow.addColorStop(0,'#fff9c744');glow.addColorStop(1,'#fff9c700');ellipse(c,x,y,45,22,glow);
        for(let i=0;i<5;i++){const fx=x+Math.cos(i*2.4)*25,fy=y+Math.sin(i*2.4)*13;for(let j=0;j<5;j++)ellipse(c,fx+Math.cos(j*TAU/5)*3,fy+Math.sin(j*TAU/5)*3,2.8,2,'#fff4d5');ellipse(c,fx,fy,1.5,1.5,'#cfac63');}
      }
    }
    if(this.marker&&!battle){const a=Math.min(1,(now-this.marker.at)/350);c.strokeStyle='#ffffe9bb';c.lineWidth=2;c.beginPath();c.ellipse(this.marker.x,this.marker.y,13+4*a,6+2*a,0,0,TAU);c.stroke();ellipse(c,this.marker.x,this.marker.y,3,2,'#fff9d9');}
    const things=grove?[]:[{y:327,paint:()=>stamp(c,this.art.forest,0,240,327,298)}];
    for(const t of trees)things.push({y:t.y,paint:()=>stamp(c,this.art.forest,t.type,t.x+Math.sin(clock*.55+t.x)*1.2,t.y,t.size,(p.y<t.y&&p.y>t.y-t.size*.7&&Math.abs(p.x-t.x)<t.size*.3)?.72:1)});
    const casting=this.castAt?Math.min(1,(now-this.castAt)/1050):0;
    things.push({y:p.y,paint:()=>this.drawPlayer(c,this.art,{x:p.x,y:p.y,height:116,outfit:state.outfit,direction:p.direction,walking:p.moving&&!this.reduced.matches,phase:p.phase,wand:state.wand&&!this.fishingView,casting})});
    if(m.visible)things.push({y:m.y,paint:()=>{
      const hit=casting>.42&&casting<.83?Math.sin(casting*56)*5:0;
      drawMonster(c,this.art,m,this.reduced.matches?0:m.phase,hit);
      if(battle){c.fillStyle='#fff9ed';c.beginPath();c.roundRect(m.x-36,m.y-120,72,10,5);c.fill();if(m.hp){c.fillStyle='#c48765';c.beginPath();c.roundRect(m.x-33,m.y-117,66*m.hp/3,4,2);c.fill();}}
    }});
    things.push(...(this.extraPlayers||[]));things.sort((a,b)=>a.y-b.y).forEach(o=>o.paint());
    drawFishing(c,this.art,state,this,now);
    if(casting>0&&casting<1){
      const t=Math.max(0,Math.min(1,(casting-.12)/.43)),from={x:p.x+22,y:p.y-61},to={x:m.x,y:m.y-47};
      if(t<1){const x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t-Math.sin(t*Math.PI)*48;for(let i=0;i<4;i++)star(c,x-i*8,y+i*2,8-i,'#fff4bf');star(c,x,y,17,'#f8d783',clock*3);}
      else for(let i=0;i<9;i++){const a=i*TAU/9,d=(casting-.5)*125;star(c,m.x+Math.cos(a)*d,m.y-45+Math.sin(a)*d,6,'#fff1a0',a);}
    }
    if(!battle&&!this.reduced.matches)for(let i=0;i<7;i++){const x=700+i*62+Math.sin(clock*.6+i)*25,y=230+i%3*40+Math.cos(clock*.7+i)*16;ellipse(c,x,y,1.8,1.8,'#fffad2aa');}
  }
  renderRoom(c,now,state){
    const wall=this.wallpaperPreview||state.wallpaper||'original',wallImage=this.art.wallpapers?.[wall];
    // One native-resolution painted shell is shared by both spaces. Furniture,
    // routes and hit targets remain independent; only the selected style loads.
    if(this.area==='bathroom'&&this.art.bathroomGround)c.drawImage(this.art.bathroomGround,0,0,1280,800);
    else if(wallImage)drawPaintedRoomShell(c,wallImage,this.area);
    else if(this.area!=='room'){if(!this.sideRoomGround)this.sideRoomGround=createRoomGround(null,false);c.drawImage(this.sideRoomGround,0,0);}
    else{if(!this.originalRoomGround)this.originalRoomGround=createRoomGround();c.drawImage(this.originalRoomGround,0,0);}
    const p=this.player;
    const visible=layoutFor(state,this.area).filter(item=>item.id!==this.placement?.id).map(item=>({...item}));
    if(this.placement)visible.push(this.placement);
    for(const item of visible){const pos=attachedPosition(item,visible,FURNITURE);if(pos)Object.assign(item,pos);}
    const paintItem=item=>drawFurniture(c,this.art,item,item===this.placement?{alpha:.9,outline:item.valid?'#658a50':'#bd795e'}:{});
    for(const item of visible.filter(item=>FURNITURE.find(f=>f.id===item.id).wall))paintItem(item);
    drawInteriorDoors(c,this.art,this.area);
    for(const item of visible.filter(item=>FURNITURE.find(f=>f.id===item.id).flat))paintItem(item);
    const things=[...(this.area==='bedroom'?[{y:332,paint:()=>drawRoomWardrobe(c,wall,this.art)}]:[]),...visible.filter(item=>!FURNITURE.find(f=>f.id===item.id).flat&&!FURNITURE.find(f=>f.id===item.id).wall).map(item=>({y:item.on?(visible.find(p=>p.id===item.on)?.y??item.y)+.1:item.y,paint:()=>paintItem(item)})),{y:p.y,paint:()=>{
      if(this.homeRest)return;
      c.save();if(this.dining){c.translate(p.x,p.y);c.rotate(diningFrame(this.dining,now,this.reduced.matches).lean);c.translate(-p.x,-p.y);}
      this.drawPlayer(c,this.art,{x:p.x,y:p.y,height:116,outfit:state.outfit,direction:p.direction,walking:p.moving&&!this.reduced.matches,phase:p.phase,wand:state.wand&&!this.dining});c.restore();
    }}];
    things.push(...(this.extraPlayers||[]));things.sort((a,b)=>a.y-b.y).forEach(x=>x.paint());
    drawDining(c,this.art,this,now);drawHomeRest(c,this,state,now);drawHomePlay(c,this,state,now);
    if(this.marker&&!this.editing){c.strokeStyle='#fff8e2';c.lineWidth=2;c.beginPath();c.ellipse(this.marker.x,this.marker.y,13,6,0,0,TAU);c.stroke();}
  }
}

export function drawMonster(c,art,m,phase,hit=0){
  const s=art.forest.cells[3],h=100,w=s.w/s.h*h,step=m.moving?Math.sin(phase):0;
  // Feet share one ground anchor with their contact shadows. No whole-body hover.
  ellipse(c,m.x,m.y+1,29,6,'#33472a4d');ellipse(c,m.x,m.y,17,3,'#33472a38');
  c.save();c.translate(m.x+hit,m.y);if(m.direction===3)c.scale(-1,1);
  for(let i=0;i<2;i++){
    const sign=i?1:-1,lift=Math.max(0,step*sign)*3,dx=step*sign*2;
    c.drawImage(art.forest.image,s.x+i*s.w/2,s.y+s.h*.86,s.w/2,s.h*.14,-w/2+i*w/2+dx,-h*.14-lift,w/2,h*.14);
  }
  c.save();c.translate(0,-h*.1);c.rotate(step*.025);c.drawImage(art.forest.image,s.x,s.y,s.w,s.h*.90,-w/2,-h*.90,w,h*.90);c.restore();c.restore();
}

