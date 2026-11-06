// A stalled image must never leave the challenge button locked indefinitely.
export async function preloadGuardianArt(zone,{imageFactory=()=>new Image(),timeoutMs=12000}={}){
 const images=[];let timer,finished=false;
 try{
  await Promise.race([
   Promise.all([zone.human,zone.beast].map(async src=>{const image=imageFactory();images.push(image);image.src=src;await image.decode();})),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('guardian_image_timeout')),timeoutMs);})
  ]);finished=true;
 }finally{
  clearTimeout(timer);
  if(!finished)for(const image of images)image.src='';
 }
}
