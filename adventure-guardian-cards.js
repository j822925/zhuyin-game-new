import {ZONES} from './data/adventure-zones.js';
// Card-only restorations preserve battle artwork and its animation anchors.
const CARD_HUMAN_ART={bridge:'assets/expedition/card-starwing-13a40496ca05.webp'};

// A read-only album: opening a card never starts/resets an expedition or saves.
export function createGuardianCards({state}){
 const dialog=document.createElement('dialog');dialog.id='guardian-cards';dialog.setAttribute('aria-label','守護者好友卡');document.body.append(dialog);
 let selected=null,beast=false,opener=null,albumScroll=0;
 const owned=zone=>!!state().expedition?.cards?.[zone.id];
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 const button=(text,action,cls)=>{const el=node('button',text,cls);el.type='button';el.onclick=action;return el;};
 function loadStyle(){if(document.getElementById('guardian-cards-style'))return;const link=document.createElement('link');link.id='guardian-cards-style';link.rel='stylesheet';link.href='./adventure-guardian-cards.css?v=20261025-cards1';document.head.append(link);}
 function close(){if(!dialog.open)return;selected=null;dialog.close();if(opener?.isConnected)opener.focus({preventScroll:true});}
 function showAlbum(focusId){selected=null;render();if(focusId)dialog.querySelector(`[data-guardian="${focusId}"]`)?.focus({preventScroll:true});}
 function image(zone,large=false){
  const img=node('img');img.alt=zone.boss+(large&&beast?'・獸形':'・人形');img.loading=large?'eager':'lazy';img.decoding='async';
  img.onerror=()=>{if(!img.isConnected)return;const retry=button('圖片暫時沒載入，點此重試',()=>{retry.remove();img.hidden=false;img.src=src;},'guardian-image-retry');img.hidden=true;img.after(retry);};
  const src=large&&beast?zone.beast:(CARD_HUMAN_ART[zone.id]||zone.human);img.src=src;return img;
 }
 function render(){
  dialog.replaceChildren();dialog.dataset.detail=String(!!selected);
  const header=node('header'),title=node('h2','🃏 守護者好友卡');title.id='guardian-cards-title';dialog.setAttribute('aria-labelledby',title.id);
  const exit=button('✕ 關閉',close);exit.setAttribute('aria-label','關閉好友卡');header.append(title,exit);dialog.append(header);
  if(selected){
   const zone=ZONES.find(z=>z.id===selected);if(!zone||!owned(zone)){showAlbum();return;}
   const detail=node('section',null,'guardian-detail'),card=node('figure',null,'guardian-enlarged');
   card.append(image(zone,true));const caption=node('figcaption');caption.append(node('strong',zone.boss),node('span',zone.name+' · '+(beast?'獸形':'人形')),node('small','🤝 好友 · 切磋成功 '+state().expedition.cards[zone.id].wins+' 次'));card.append(caption);
   const actions=node('nav');actions.setAttribute('aria-label','卡片操作');
   const back=button('← 回收藏',()=>showAlbum(zone.id));back.dataset.cardBack='';
   const toggle=button(beast?'✨ 看人形':'🐾 看獸形',()=>{beast=!beast;render();dialog.querySelector('[data-card-toggle]').focus({preventScroll:true});});toggle.dataset.cardToggle='';
   actions.append(back,toggle);detail.append(card,actions);dialog.append(detail);return;
  }
  const count=ZONES.filter(owned).length;dialog.append(node('p',`已收藏 ${count} / ${ZONES.length} · 點卡片看大圖`,'guardian-count'));
  if(!count)dialog.append(node('p','第一次與守護者切磋成功，就能收藏好友卡。','guardian-empty'));
  const album=node('div',null,'guardian-album');
  for(const zone of ZONES){
   if(owned(zone)){
    const tile=button('',()=>{albumScroll=album.scrollTop;selected=zone.id;beast=false;render();dialog.querySelector('[data-card-back]').focus({preventScroll:true});},'guardian-tile');tile.dataset.guardian=zone.id;tile.setAttribute('aria-label','放大'+zone.boss+'好友卡');
    tile.append(image(zone),node('strong',zone.boss),node('small',zone.name),node('span','🔍 看大圖'));album.append(tile);
   }else{
    const tile=node('article',null,'guardian-tile guardian-locked');tile.setAttribute('aria-label',zone.name+'，尚未收藏');tile.append(node('span','🔒','guardian-lock'),node('strong',zone.name),node('small','尚未收藏'));album.append(tile);
   }
  }
  dialog.append(album);album.scrollTop=albumScroll;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(selected)showAlbum(selected);else close();});
 return {open(){if(dialog.open)return;loadStyle();opener=document.activeElement;selected=null;beast=false;render();dialog.showModal();dialog.querySelector('header button').focus({preventScroll:true});},close,get busy(){return dialog.open;}};
}
