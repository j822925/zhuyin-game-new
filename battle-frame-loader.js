import {PACKED_BATTLES,PACKED_BATTLE_VERSION} from './data/packed-battle-frames.js?v=20261007-ipad1';

// Decode only the finished poses. No full-size pixel scans on student devices.
function decode(url,timeout){
 return new Promise((resolve,reject)=>{
  const image=new Image();let finished=false;
  const done=(error)=>{if(finished)return;finished=true;clearTimeout(timer);image.onload=image.onerror=null;if(error){image.src='';reject(error);}else resolve(image);};
  const timer=setTimeout(()=>done(Error('Battle image timed out')),timeout);
  image.onload=()=>done();image.onerror=()=>done(Error('Battle image unavailable'));
  image.src=url;
 });
}
export async function loadPackedBattle(id,{timeout=8000}={}){
 const entry=PACKED_BATTLES[id];if(!entry)return null;
 const url=new URL(entry.atlas,new URL('./',import.meta.url));url.searchParams.set('v',PACKED_BATTLE_VERSION);
 let image;
 for(let attempt=0;attempt<2;attempt++){
  try{if(attempt)url.searchParams.set('retry',crypto.randomUUID());image=await decode(url.href,timeout);if(image.naturalWidth!==entry.width||image.naturalHeight!==entry.height)throw Error('Battle image dimensions do not match');break;}
  catch(error){if(attempt)throw error;}
 }
 const crop=f=>{
  const [x,y,w,h]=f.rect;
  if(![x,y,w,h,...f.pivot,f.scale].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>entry.width||y+h>entry.height||f.scale<=0)throw Error('Invalid battle pose');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
  return {image:canvas,pivot:f.pivot.slice(),scale:f.scale,bodyRatio:f.bodyRatio,sourceScale:f.sourceScale??entry.sourceScale};
 };
 const frames=entry.frames.map(crop);
 return {frames,allyStar:entry.allyStar?crop(entry.allyStar):null,enemyX:entry.enemyX,sourceScale:entry.sourceScale};
}
