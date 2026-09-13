const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function startGachaAnimation(element,{reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false,now=Date.now,sleep=wait}={}){
 const started=now();
 element.classList.remove('reveal-pop');element.classList.add('gacha-shaking');element.setAttribute('aria-busy','true');
 element.innerHTML='<span class="capsule" role="img" aria-label="轉蛋搖搖，等待開蛋"><span class="capsule-top"></span><span class="capsule-bottom"></span><span class="capsule-star">★</span></span>';
 return {
  async open(){
   // Start networking immediately; do not reveal a character before the saved result.
   if(!reducedMotion)await sleep(Math.max(0,1000-(now()-started)));
   element.classList.remove('gacha-shaking');element.classList.add('gacha-opening');
   if(!reducedMotion)await sleep(380);
  },
  finish(){element.classList.remove('gacha-shaking','gacha-opening');element.removeAttribute('aria-busy');},
 };
}
