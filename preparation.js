import {prepareMedia,startMediaCache,missingMedia} from './asset-cache.js?v=20260928-perflive1';
import {LOADING_CARDS,STARTUP_MEDIA} from './data/performance-assets.js?v=20260928-perflive1';
import {orderedCards} from './cache-policy.js?v=20260928-perflive1';
let active=null;const cards=orderedCards(LOADING_CARDS);
export async function prepareWithCards(paths,{startup=false}={}){
 if(active)return;await startMediaCache();const missing=await missingMedia(paths);if(startup&&!missing.length)return;
 const controller=new AbortController();active=controller;
 const dialog=document.createElement('dialog');dialog.className='prepare-dialog';dialog.setAttribute('aria-label',startup?'正在準備探險':'課前素材準備');
 dialog.innerHTML='<h2>✨ 星使陪你準備探險</h2><div class="prepare-art"><img alt="" width="280" height="420"><strong></strong></div><p class="prepare-name"></p><progress max="1" value="0" aria-label="素材準備進度"></progress><p class="prepare-status" role="status"></p><p class="prepare-hint">只準備需要的圖片與聲音，不會下載學生姓名、成績或考試答案。</p><div class="prepare-actions"><button type="button" class="primary" data-next-card>下一位星使 →</button><button type="button" class="secondary" data-close>先進遊戲 ▶</button></div>';
 if(!startup)dialog.querySelector('.prepare-hint').textContent='本批最多準備 400 個已教範圍的圖片與聲音，其餘遊玩時再預載。請分批準備平板，避免全班同時下載。';
 document.body.append(dialog);const image=dialog.querySelector('img'),symbol=dialog.querySelector('strong'),name=dialog.querySelector('.prepare-name'),status=dialog.querySelector('.prepare-status'),progress=dialog.querySelector('progress'),closeButton=dialog.querySelector('[data-close]');
 let index=0,timer,showTimer,closed=false,finished=false;
 const showCard=()=>{if(!cards.length)return;const c=cards[index%cards.length];image.src=c.thumbnail;image.alt=c.symbol+'・'+c.name;symbol.textContent=c.symbol;name.textContent=c.name;};
 image.onerror=()=>{image.style.visibility='hidden';};image.onload=()=>{image.style.visibility='visible';};
 const advance=()=>{index++;showCard();};dialog.querySelector('[data-next-card]').onclick=advance;
 const close=()=>{if(closed)return;closed=true;controller.abort();clearInterval(timer);clearTimeout(showTimer);if(dialog.open)dialog.close();dialog.remove();active=null;};
 closeButton.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 const show=()=>{if(closed||finished)return;showCard();dialog.showModal();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>{if(!document.hidden)advance();},3200);};
 if(startup)showTimer=setTimeout(show,300);else show();
 const timeout=startup?setTimeout(close,15000):null;
 try{const result=await prepareMedia(paths,{signal:controller.signal,onProgress:({completed,total,failed})=>{progress.max=Math.max(total,1);progress.value=completed;status.textContent=total?`已準備 ${completed}／${total} 個素材${failed?'・'+failed+' 個稍後重試':''}`:'✓ 這台平板已經準備好了';}});
  finished=true;if(closed)return;
  if(startup&&!result.failed){close();return;}
  clearTimeout(showTimer);clearInterval(timer);if(!dialog.open){finished=false;show();finished=true;clearInterval(timer);}
  const unsaved=result.failed?[]:await missingMedia(paths);
  status.textContent=result.failed?`有 ${result.failed} 個素材未下載，進遊戲後仍會重試。`:unsaved.length?'素材已讀取，但部分無法保存在此瀏覽器，下次可能需要重新下載。':'✓ 準備完成！登入、交卷和連線對戰仍需要網路。';closeButton.textContent=result.failed?'先進遊戲 ▶':'準備好了，進遊戲 ▶';
 }finally{clearTimeout(timeout);}
 if(!closed)await new Promise(resolve=>{const check=setInterval(()=>{if(closed){clearInterval(check);resolve();}},80);});
}
export async function bootPreparation(){await prepareWithCards(STARTUP_MEDIA,{startup:true});}
export function addPreparationButton(getPaths){
 const button=document.createElement('button'),notice=document.createElement('p');notice.setAttribute('role','status');notice.hidden=true;
 button.type='button';button.className='secondary prepare-launch';button.textContent='📥 課前準備・星使輪播';button.onclick=async()=>{const paths=getPaths();if(!paths){notice.hidden=false;notice.textContent='還在讀取老師的範圍，請稍候再按；若一直沒出現座號，請先按重新讀取。';return;}notice.hidden=true;button.disabled=true;try{await prepareWithCards(paths);}catch{notice.hidden=false;notice.textContent='暫時無法準備素材，仍可先進遊戲，稍後再試。';}finally{button.disabled=false;}};
 document.querySelector('.home-foot')?.append(button,notice);
}
