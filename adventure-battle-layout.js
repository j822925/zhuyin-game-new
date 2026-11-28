import {PAINTED_ISLAND} from './adventure-island-pilot.js';
// Screen-space bounds: never inherit the cropped, cover-sized world rectangle.
export function battleStageLayout(width,height,panelTop,headerBottom){
 const top=Math.max(12,headerBottom+12),bottom=Math.max(top+16,Math.min(height-12,panelTop-14));
 const available=Math.max(16,bottom-top),foeHeight=Math.min(460,available),foeWidth=Math.min(width*.42,foeHeight*1.5);
 if(PAINTED_ISLAND){
  const farFoot=bottom-available*.25;
  const farHeight=Math.min(350,farFoot-top),farWidth=Math.min(width*.41,farHeight*1.45);
  const nearSize=Math.min(215,available*.68,width*.33);
  return {foe:{x:width*.28-farWidth/2,y:farFoot-farHeight,width:farWidth,height:farHeight},player:{x:width*.73,y:bottom,width:nearSize,height:nearSize}};
 }
 const playerHeight=Math.min(210,available*.9),playerWidth=playerHeight;
 return {foe:{x:width*.71-foeWidth/2,y:bottom-foeHeight,width:foeWidth,height:foeHeight},player:{x:width*.27,y:bottom,width:playerWidth,height:playerHeight}};
}
