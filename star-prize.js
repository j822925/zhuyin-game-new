const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function starEgg(){
 const art=el('span');art.className='star-egg-art';art.setAttribute('aria-hidden','true');
 const halo=el('span');halo.className='star-egg-halo';const img=el('img');img.src='assets/icons/star-prize-egg-v1.svg';img.alt='';img.width=240;img.height=280;
 art.append(halo,img);for(let i=0;i<6;i++){const spark=el('span','✦');spark.className='egg-spark';art.append(spark);}return art;
}
export function createStarPrize({ordinary=false}={}){
 const dialog=el('dialog');dialog.className='star-prize-dialog'+(ordinary?' ordinary-prize':'');dialog.setAttribute('aria-label',ordinary?'轉蛋獎勵':'滿分星使獎勵');
 const close=el('button','✕');close.type='button';close.className='star-prize-close';close.setAttribute('aria-label','關閉獎勵畫面，獎品仍會保存');close.onclick=()=>dialog.close();
 const stage=el('div');stage.className='star-prize-stage';const status=el('p');status.className='star-prize-status';status.setAttribute('role','status');const done=el('button','收進收藏 ✓');done.type='button';done.className='star-prize-done';done.onclick=()=>dialog.close();
 const sky=el('div');sky.className='prize-meteors';sky.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)sky.append(el('i'));
 dialog.append(sky,close,stage,status,done);document.body.append(dialog);let started=0;
 const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 function start(){started=Date.now();stage.className='star-prize-stage charging';stage.replaceChildren(el('h2',ordinary?'神祕夥伴來了…':'星使正在甦醒…'),starEgg());status.textContent=ordinary?'正在開蛋，請稍候。':'正在確認滿分資格與保存獎品，請稍候。';done.textContent='收進收藏 ✓';done.hidden=true;if(!dialog.open)dialog.showModal();}
 async function reveal(c,{duplicate=false}={}){
  // Only called after the server has saved the one-time prize. No client-side draw.
  const label=ordinary?c.name:c.symbol+'之星使・'+c.name;
  const image=el('img');image.className='star-prize-card';image.src=c.image;image.alt=label;image.width=1024;image.height=1536;image.loading='eager';
  let timer;try{await Promise.race([image.decode(),new Promise(resolve=>timer=setTimeout(resolve,1800))]);}catch{/* Saved prize remains valid even if its image is offline. */}finally{clearTimeout(timer);}
  if(dialog.open&&!reduced()){await wait(Math.max(0,1100-(Date.now()-started)));stage.className='star-prize-stage hatching';await wait(500);}
  stage.className='star-prize-stage revealed';const name=el('h2','✨ '+label),scene=el('div');scene.className='star-prize-scene';
  const glow=el('span');glow.className='star-prize-glow';glow.setAttribute('aria-hidden','true');const frame=el('div');frame.className='star-prize-frame';frame.append(image);scene.append(glow,frame);
  for(let i=0;i<10;i++){const spark=el('span','✦');spark.className='prize-spark';spark.setAttribute('aria-hidden','true');scene.append(spark);}
  stage.replaceChildren(name,scene);status.textContent=ordinary?(duplicate?'又遇見老朋友！🍬 糖果 +1，已保存。':'新夥伴已保存到你的收藏！'):'已保存到你的收藏！不扣星星。';done.hidden=false;if(dialog.open)done.focus({preventScroll:true});
 }
 function message(text){stage.className='star-prize-stage';stage.replaceChildren(el('h2',ordinary?'🥚 轉蛋小提醒':'✨ 滿分星使'));status.textContent=text;done.hidden=false;done.textContent='回到收藏';}
 return {start,reveal,message};
}
