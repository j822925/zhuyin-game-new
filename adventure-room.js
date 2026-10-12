import {FURNITURE,ROOM_WARDROBE,ROOM_KITCHEN_DOOR,ROOM_BEDROOM_DOOR,WALL_DOOR,furnitureRect} from './adventure-model.js';
import {wallSide} from './data/home-wall-furniture.js';
const TAU=Math.PI*2;
function rect(c,x,y,w,h,fill,r=0){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
export function createRoomGround(wallpaper=null,frontExit=true){
  const cv=document.createElement('canvas');cv.width=1280;cv.height=800;const c=cv.getContext('2d');
  c.fillStyle='#d9dfcb';c.fillRect(0,0,1280,800);
  const wash=c.createRadialGradient(640,380,100,640,380,780);wash.addColorStop(0,'#f3edda');wash.addColorStop(1,'#b5c1a0');c.fillStyle=wash;c.fillRect(0,0,1280,800);
  rect(c,143,147,995,627,'#87916d44',22);rect(c,130,128,1010,627,'#9b7f56',16);
  rect(c,144,139,982,143,'#efe8d1',8);
  // Wallpaper, wooden skirting and floorboards establish an actual interior.
  for(let x=156;x<1120;x+=29)rect(c,x,140,2,131,'#dbddbf');
  for(let x=170;x<1110;x+=58)for(let y=158;y<251;y+=40){ellipse(c,x,y,2.5,5,'#b0ba9855');ellipse(c,x+4,y+3,4,2.5,'#b0ba9855');}
  if(wallpaper){const pattern=c.createPattern(wallpaper,'repeat');pattern.setTransform(new DOMMatrix().scale(190/wallpaper.width));c.fillStyle=pattern;c.fillRect(145,140,980,118);}
  rect(c,145,258,980,24,'#b69868');rect(c,145,261,980,4,'#d9bc8a');
  rect(c,144,279,982,467,'#d1b785');
  for(let row=0;row<12;row++){
    const y=280+row*39;rect(c,146,y,978,37,row%2?'#d5bc8e':'#dcc497');
    for(let col=-1;col<7;col++){const x=147+col*185+(row%2?94:0);if(x>147)rect(c,x,y,1.5,38,'#b79a6860');
      c.strokeStyle='#b89c6d25';c.lineWidth=1;c.beginPath();c.moveTo(Math.max(148,x+15),y+12);c.bezierCurveTo(x+45,y+9,x+98,y+19,Math.min(1122,x+160),y+12);c.stroke();}
  }
  // Gentle daylight remains behind every character and furniture sprite.
  c.save();c.beginPath();c.rect(146,281,978,464);c.clip();c.fillStyle='#fff9d326';c.beginPath();c.moveTo(502,280);c.lineTo(654,280);c.lineTo(916,674);c.lineTo(647,674);c.fill();c.restore();
  rect(c,140,277,13,467,'#a68a5f');rect(c,1115,277,13,467,'#a68a5f');rect(c,141,736,987,16,'#967a51');
  // Window and curtains.
  rect(c,487,155,190,96,'#b69564',10);rect(c,496,163,172,78,'#a9c9b6',6);
  ellipse(c,530,218,43,21,'#8cac81');ellipse(c,627,214,48,25,'#98b58b');ellipse(c,622,185,12,12,'#f5e6a7');
  rect(c,578,160,6,85,'#eee4c8');rect(c,495,200,172,5,'#eee4c8');rect(c,476,244,214,11,'#c0a577',3);
  c.fillStyle='#f6f0d9';c.beginPath();c.moveTo(482,151);c.lineTo(514,151);c.quadraticCurveTo(518,206,492,233);c.lineTo(478,233);c.fill();c.beginPath();c.moveTo(650,151);c.lineTo(683,151);c.lineTo(688,234);c.lineTo(675,234);c.quadraticCurveTo(646,207,650,151);c.fill();
  // A little wall picture.
  rect(c,790,165,83,70,'#b59669',5);rect(c,798,173,67,54,'#f7efd8',2);ellipse(c,831,202,14,14,'#b4c19b');ellipse(c,831,202,6,6,'#d6b663');
  // The open front doorway stays clear during decorating.
  if(frontExit){rect(c,563,735,154,20,'#d9dfcb');ellipse(c,640,719,71,17,'#9eaa80');ellipse(c,640,715,61,12,'#c4c8a0');}
  return cv;
}
const frontRails=new WeakMap();
export function drawPaintedRoomShell(c,image,area){
 c.drawImage(image,0,0,1280,800);
 if(area==='room')return;
 // Reuse the existing hand-painted straight rail at its native scale. The
 // small cached sprite avoids downloading a second full background per style.
 let rail=frontRails.get(image);
 if(!rail){
  rail=document.createElement('canvas');rail.width=370;rail.height=112;const r=rail.getContext('2d');
  r.drawImage(image,180/1586*image.width,839/992*image.height,370/1586*image.width,112/992*image.height,0,0,370,112);
  r.globalCompositeOperation='destination-in';const blend=r.createLinearGradient(0,0,370,0);
  blend.addColorStop(0,'transparent');blend.addColorStop(.04,'#000');blend.addColorStop(.96,'#000');blend.addColorStop(1,'transparent');r.fillStyle=blend;r.fillRect(0,0,370,112);
  frontRails.set(image,rail);
 }
 c.drawImage(rail,610/1586*1280,839/992*800,370/1586*1280,112/992*800);
}
export function drawRoomWardrobe(c,style='original',art){
  const image=art?.wardrobes?.[style];if(!image)return;
  const {x,y}=ROOM_WARDROBE,height=205,width=image.width/image.height*height;
  ellipse(c,x,y+2,width*.45,10,'#59492d24');
  c.drawImage(image,x-width/2,y-height,width,height);
}
export function drawFurniture(c,art,item,{alpha=1,outline=null}={}){
  const f=FURNITURE.find(x=>x.id===item.id),atlas=art[f.atlas||'furniture'];if(!atlas)return;const s=atlas.cells[f.index],height=f.height,width=s.w/s.h*height;
  c.save();c.globalAlpha=alpha;
  if(f.wall){const side=wallSide(item);c.translate(item.x,item.y);if(side)c.transform(.5,side*1.15,0,1,0,0);c.drawImage(atlas.image,s.x,s.y,s.w,s.h,-width/2,-height,width,height);if(outline){c.strokeStyle=outline;c.lineWidth=3;c.setLineDash([7,5]);c.strokeRect(-width/2,-height,width,height);}c.restore();return;}
  if(!f.flat)ellipse(c,item.x,item.y+1,f.fw*.51,f.fh*(item.on?.07:.17),'#654d322d');
  c.drawImage(atlas.image,s.x,s.y,s.w,s.h,item.x-width/2,item.y-height,width,height);
  if(outline){const r=furnitureRect(item);c.strokeStyle=outline;c.lineWidth=3;c.setLineDash([7,5]);c.beginPath();c.roundRect(r.x,r.y,r.w,r.h,9);c.stroke();c.setLineDash([]);}
  c.restore();
}
export function drawFurnitureThumb(canvas,art,id){
  const f=FURNITURE.find(x=>x.id===id),atlas=art[f.atlas||'furniture'],c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);if(!atlas)return;const s=atlas.cells[f.index];
  const scale=Math.min((canvas.width-12)/s.w,(canvas.height-10)/s.h);c.drawImage(atlas.image,s.x,s.y,s.w,s.h,(canvas.width-s.w*scale)/2,canvas.height-s.h*scale-4,s.w*scale,s.h*scale);
}

export function interiorDoorGeometry(area,side){
 const p=side===-1?ROOM_BEDROOM_DOOR:ROOM_KITCHEN_DOOR;
 // Bathroom tile courses converge more gently than the cottage side walls.
 // The nearer jamb is taller, while the threshold follows the wooden skirting.
 return area==='bathroom'?{x:1181.5,y:536,width:80,height:245,rise:120,flare:62}:{...p,...WALL_DOOR,flare:0};
}
const bathroomDoors=new WeakMap();
function bathroomDoorSprite(atlas,s,g){
 let sprite=bathroomDoors.get(atlas.image);if(sprite)return sprite;
 const top=-g.height-g.rise/2+g.flare/2,bottom=g.rise/2;
 const cv=document.createElement('canvas'),scale=3;cv.width=g.width*scale;cv.height=Math.ceil((bottom-top)*scale);
 const ctx=cv.getContext('2d');
 // Cache narrow vertical strips once; each complete jamb remains vertical.
 for(let i=0;i<cv.width;i++){
  const u=(i+.5)/cv.width,h=g.height+(u-.5)*g.flare,y=(u-.5)*g.rise-h;
  ctx.drawImage(atlas.image,s.x+i/cv.width*s.w,s.y,s.w/cv.width,s.h,i,(y-top)*scale,1,h*scale);
 }
 sprite={image:cv,top,height:cv.height/scale};bathroomDoors.set(atlas.image,sprite);return sprite;
}
export function drawInteriorDoors(c,art,area){
 const atlas=art.daisyHome;if(!atlas)return;const s=atlas.cells[2];
 for(const side of area==='room'||area==='bedroom'?[-1,1]:area==='kitchen'?[-1]:[1]){
  const p=interiorDoorGeometry(area,side);
  if(area==='bathroom'){const sprite=bathroomDoorSprite(atlas,s,p);c.drawImage(sprite.image,p.x-p.width/2,p.y+sprite.top,p.width,sprite.height);continue;}
  // Project the existing painted doorway into the wall's plane. Vertical jambs
  // remain vertical; the threshold rises toward the back corner of the room.
  c.save();c.translate(p.x,p.y);c.transform(WALL_DOOR.width,side*WALL_DOOR.rise,0,WALL_DOOR.height,0,0);c.drawImage(atlas.image,s.x,s.y,s.w,s.h,-.5,-1,1,1);c.restore();
 }
}
