// Shop interiors use existing art; adding a destination does not require changing movement.
export const SHOP_ROOMS={
 clothes:{style:'moon',owner:'星河織夢師',portrait:'assets/characters/star-envoy-sprites/star-14-xi-v1.png',greeting:'歡迎來到我的小店！今天想穿什麼呢？',displays:[{kind:'clothes',id:'gardener',painted:true,position:{x:25,y:40}},{kind:'clothes',id:'daisy',painted:true,displayOnly:true,position:{x:77,y:40}}]},
 seeds:{style:'daisy',owner:'荷葉蛙',portrait:'assets/characters/cozy-v1/frog.png',greeting:'呱！今天要種點什麼呢？',displays:[{kind:'seeds',id:'sunflower'},{kind:'seeds',id:'pumpkin'},{kind:'crop',id:'carrot',displayOnly:true},{kind:'crop',id:'tomato',displayOnly:true}]},
 furniture:{style:'fox',paintedCounter:true,bounds:{left:37,right:63,top:47,bottom:92},counter:{x:50,y:48},owner:'森林精靈',portrait:'assets/characters/cozy-v1/forest.png',greeting:'歡迎！一起把家布置得暖暖的吧。',displays:[{kind:'furniture',id:'fox-sofa',painted:true,caption:'沙發展示',position:{x:21,y:66}},{kind:'furniture',id:'fox-lamp',painted:true,caption:'燈具展示',position:{x:84,y:50}},{kind:'furniture',id:'fox-bed',painted:true,caption:'床鋪展示',position:{x:82,y:78}},{kind:'furniture',id:'fox-table',painted:true,caption:'桌椅展示',position:{x:24,y:79}}]},
};
export const SHOP_DISPLAY_POSITIONS=[{x:25,y:59},{x:76,y:59},{x:24,y:78},{x:77,y:78}];
export const SHOP_START={x:50,y:81},SHOP_COUNTER={x:50,y:61},SHOP_EXIT={x:50,y:91};
export function shopPoint(p,bounds={left:15,right:85,top:59,bottom:92}){return {x:Math.max(bounds.left,Math.min(bounds.right,Number.isFinite(p.x)?p.x:50)),y:Math.max(bounds.top,Math.min(bounds.bottom,Number.isFinite(p.y)?p.y:81))};}
export function shopStep(p,dx,dy,seconds,bounds){const length=Math.hypot(dx,dy);if(!length)return {...p};const dt=Math.max(0,Math.min(.05,seconds));return shopPoint({x:p.x+dx/length*dt*18,y:p.y+dy/length*dt*25},bounds);}
