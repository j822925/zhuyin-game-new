// Screen-space bounds: never inherit the cropped, cover-sized world rectangle.
export function battleStageLayout(width,height,panelTop,headerBottom){
 const top=Math.max(12,headerBottom+12),bottom=Math.max(top+16,Math.min(height-12,panelTop-14));
 const available=Math.max(16,bottom-top),foeHeight=Math.min(460,available),foeWidth=Math.min(width*.42,foeHeight*1.5);
 const playerHeight=Math.min(210,available*.9),playerWidth=playerHeight;
 return {foe:{x:width*.71-foeWidth/2,y:bottom-foeHeight,width:foeWidth,height:foeHeight},player:{x:width*.27,y:bottom,width:playerWidth,height:playerHeight}};
}
