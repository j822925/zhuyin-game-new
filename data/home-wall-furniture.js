// Small decorations priced below functional sinks (25) and most large furniture.
export const WALL_FURNITURE=[
 ['mirror','雛菊木框鏡',18,140,90],['towel','雛菊毛巾環',8,120,66],['towel-shelf','暖木毛巾櫃',15,128,128],
 ['picture','雛菊掛畫',10,125,96],['plant-shelf','綠葉盆栽架',15,125,145],['sconce','暖光壁燈',12,118,74],
].map(([id,name,price,height,fw],index)=>({id:'wall-'+id,name,price,height,fw,fh:12,index,style:'daisy',atlas:'wallDecor',wall:true}));
export function wallSide(p){return p.x<200?-1:p.x>1080?1:0;}
export function wallPosition(p){const side=wallSide(p),x=Math.round(p.x/10)*10;return {x:side<0?Math.max(140,Math.min(180,x)):side>0?Math.max(1100,Math.min(1140,x)):x,y:Math.round(p.y/10)*10};}
export function wallPlacementValid(f,p,area){const side=wallSide(p);if(side)return p.x>=(side<0?140:1100)&&p.x<=(side<0?180:1140)&&p.y>=220&&p.y<=400;return p.x-f.fw/2>=210&&p.x+f.fw/2<=1070&&p.y-f.height>=45&&p.y<=(area==='bathroom'?340:270);}
