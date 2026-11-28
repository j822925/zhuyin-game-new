import {islandMapScale} from './data/island-map-space.js';
import {PAINTED_ISLAND} from './adventure-island-pilot.js';
import {drawPaintedFrame} from './adventure-painted-actors.js';
// Ground coordinates use the same scale as island-xiyu-v2 and ISLAND_ROUTES.
export const STUDY_BEASTS = Object.freeze([
  {id:'ribbon-moth',name:'鈴紋月蛾',mode:'reading',label:'看國字寫注音',x:512,y:456,pace:0.68,color:'#a980da'},
  {id:'ink-cuttle',name:'墨滴花枝',mode:'writing',label:'看注音寫國字',x:645,y:295,pace:0.52,color:'#347e84'},
  {id:'coral-horse',name:'珊瑚海馬',mode:'name',label:'看注音寫姓名',x:539,y:575,pace:0.64,color:'#eb9079'},
  {id:'bead-armadillo',name:'珠算犰狳',mode:'math',label:'加減玩',x:712,y:191,pace:0.75,color:'#bf8a45'}
]);
const paintedBeasts={'ribbon-moth':[580,562],'ink-cuttle':[779,376],'coral-horse':[701,711],'bead-armadillo':[1005,282]};
export function beastPosition(b,time){
  const phase=time*b.pace;
  const [x,y]=PAINTED_ISLAND?paintedBeasts[b.id]:[b.x,b.y];
  return {x:x*islandMapScale+Math.sin(phase)*19,y:y*islandMapScale+Math.sin(phase*.61)*8,phase};
}
function oval(c,x,y,rx,ry,ink,angle=0){
  c.fillStyle=ink;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();
}
function pearl(c,x,y,rx,ry,light,dark,angle=0){
  const fill=c.createRadialGradient(x-rx*.38,y-ry*.42,1,x,y,Math.max(rx,ry)*1.16);
  fill.addColorStop(0,light);fill.addColorStop(1,dark);oval(c,x,y,rx,ry,fill,angle);
}
function line(c,points,ink,width){
  c.strokeStyle=ink;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();
  c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.stroke();
}
function eye(c,x,y){oval(c,x,y,3.6,4.6,'#332e40');oval(c,x-1.1,y-1.7,1.25,1.45,'#fffdf5');}
export function drawStudyBeast(c,b,x,y,t,{scale=1,label=true,hit=0}={}){
  const wing=Math.sin(t*5),step=Math.sin(t*4),air=b.mode==='reading'||b.mode==='name';
  const lift=air?11+4*wing:0;
  c.save();c.translate(x,y);c.scale(scale,scale);
  oval(c,1,1,air?20-lift*.24:26,5,air?'#25354430':'#273b3c48');
  if(!air)oval(c,0,-1,18,3,'#253a4033');
  c.save();c.translate(hit,-lift);
  const frame = Math.floor(t * 7) % 8;
  const movingRight = label && Math.cos(t*b.pace) > 0;
  if(drawPaintedFrame(c,b.id,frame,0,0,70,movingRight)){
    // Painted bodies include their articulated fins, feet and wings.
  }else if(b.mode==='reading'){
    for(const side of [-1,1]){
      const span=21+wing*5;
      pearl(c,side*span,-37,16,27,'#f9d9ff','#8159bc',side*.61);
      pearl(c,side*15,-20,11,15,'#f7ceaa','#a16bba',side*-.6);
      oval(c,side*span,-40,5,8,'#fff3a7',side*.5);
      oval(c,side*(span+5),-45,2.1,3.4,'#8664a0');
    }
    pearl(c,0,-29,10,18,'#fee2a4','#956740');pearl(c,0,-40,12,11,'#fff2c3','#a27552');
    for(const side of [-1,1]){line(c,[[side*4,-46],[side*7,-55],[side*14,-60]],'#735271',2.2);eye(c,side*5,-42);}
  }else if(b.mode==='writing'){
    for(let n=-2;n<=2;n++){
      const x=n*7,tip=x+n*3+Math.sin(t*4+n)*4;
      line(c,[[x,-23],[x+step*3,-9],[tip,-4-Math.max(0,Math.sin(t*4+n))*3],[tip+4,-5]],'#365b68',7);
    }
    pearl(c,-15,-30,12,10,'#b2e4bf','#457d88',-.4);pearl(c,16,-30,12,10,'#b2e4bf','#457d88',.4);
    pearl(c,0,-33,21,27,'#ace1bd','#367781');
    for(let i=0;i<3;i++)oval(c,-8+i*7,-47-Math.sin(i)*3,2.2,2.7,'#fbd78f');
    eye(c,-8,-27);eye(c,8,-27);
  }else if(b.mode==='name'){
    c.strokeStyle='#b76059';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(2,-22);c.bezierCurveTo(21,-13,14,1,4,-5);c.bezierCurveTo(-1,-10,6,-13,8,-9);c.stroke();
    pearl(c,-4,-31,12,18,'#ffcfa3','#bb655f',-.27);
    pearl(c,9,-35,9,13,'#fff2b5','#ec8c72',.3+wing*.22);
    line(c,[[-6,-52],[-10,-63],[-16,-66]],'#bb685c',4);line(c,[[-10,-62],[-5,-68]],'#bb685c',3);
    pearl(c,-10,-47,14,12,'#ffcea0','#ae565d');
    pearl(c,-24,-45,10,5,'#ffc29a','#b56460');eye(c,-13,-49);
    for(let i=0;i<3;i++)oval(c,-9+i*3,-35+i*5,2,1.5,'#ffe6b3');
  }else{
    for(const side of [-1,1])for(const n of [-1,1]){
      const offset=Math.sin(t*5+side*n)*3;
      pearl(c,n*13+side*3+offset,-6-Math.max(0,offset),5,6,'#cfa477','#6d594a');
    }
    line(c,[[13,-17],[27,-14],[36,-18-step*2]],'#946d50',5);
    pearl(c,3,-21,24,18,'#f1c879','#977345');
    for(let i=0;i<3;i++){const x=-8+i*10;
      line(c,[[x-3,-32],[x,-22],[x+1,-14]],'#805940',2.5);
      pearl(c,x-1,-26,4,4,'#f7d792',i===1?'#639f94':'#c5664e');
    }
    pearl(c,-19,-19,12,10,'#f4cf98','#986f54');oval(c,-29,-18,4,3,'#634b47');eye(c,-21,-22);
  }
  c.restore();
  if(label){c.font='bold 13px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#fff9df';c.strokeText(b.name,0,19);c.fillStyle='#304c43';c.fillText(b.name,0,19);}
  c.restore();
}
export function hitStudyBeast(p,t,hidden){
  return STUDY_BEASTS.filter(b=>!hidden?.has(b.id)).map(b=>({b,...beastPosition(b,t)}))
    .sort((a,b)=>b.y-a.y).find(a=>Math.abs(p.x-a.x)<49&&p.y>a.y-95&&p.y<a.y+17)?.b;
}
