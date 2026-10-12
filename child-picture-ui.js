// Presentation only: preserve event handlers, disabled controls, question symbols
// and accessible names. No accounts, scoring, audio downloads or network calls.
const page=typeof location==='undefined'?'':location.pathname.split('/').pop()||'index.html';
const enabled=['index.html','grade2.html','adventure-preview.html','reading.html','reading-local.html','exam.html','online.html','notebook.html','star-cards.html'].includes(page);
const forest=page==='adventure-preview.html';
const icons={
 'wardrobe-open':'🧥','decor-open':'🎒','trail-open':'🗺️','find-monster':'⚔️','decor-close':'✕','decor-cancel':'↶','decor-store':'📦','decor-place':'✓','decor-buy':'🛒',
 'life-close':'✕','life-plant':'🌱','life-water':'💧','life-harvest':'🧺','life-study':'👂','life-unlock':'🔓','harvest-cook':'🏠',
 'food-close':'✕','food-bag-tab':'🥄','food-cook-tab':'🍲','trail-basket':'🧺','trail-village':'🏡','trail-pond':'🎣','trail-farm':'🌱','grove-unlock':'🌲',
 'start':'▶','next':'➜','again':'↻','reload':'↻','recover':'📶','retry':'📶','retry-save':'💾','recover-pending':'💾','listen':'🔊','review-play':'🔊','replay':'🔊','submit':'✓','check-spelling':'✓',
 'login-guide-retry':'↻','load-retry':'↻','change-student':'🔢','logout':'🔢','create':'🏠','join-show':'🔎','join':'➜','reconnect':'📶','recover-room':'↩','takeover':'📱',
 'go-home':'🏠','room-exit':'🚪','room-kitchen':'🍲','room-wardrobe':'🧥','pond-sign':'🎣','farm-sign':'🌱','farm-exit':'↩',
 'home-link':'🏠','leave':'🏠','home':'🏠','stay':'▶','confirm-leave':'🏠','back-home':'🏠'
};
let queued=false;
function decorate(){
 queued=false;document.body.classList.add('picture-first');
 for(const b of document.querySelectorAll('button,a')){
  if(b.classList.contains('child-nav'))continue;
  let icon=icons[b.id];
  if(b.matches('[data-decor-category]')){const category={furniture:['🪑','家具'],wallpaper:['🏡','室內風格'],clothes:['👗','服飾'],meal:['🍲','食物'],ingredients:['🥕','食材'],seeds:['🌱','種子']}[b.dataset.decorCategory];if(category){icon=category[0];b.dataset.childLabel=category[1];}}
  if(b.matches('[data-home-style]'))icon=({daisy:'🌼',fox:'🦊',moon:'🌙'})[b.dataset.homeStyle];
  if(b.matches('[id^="cook-"]'))icon='🍲';if(b.matches('[id^="eat-"],[id^="serve-"]'))icon='🥄';
  if(b.id==='life-study')icon=/拼音/.test(b.textContent)?'🧩':/朗讀/.test(b.textContent)?'🎤':'👂';
  if(b.id==='life-fish-action')icon=/拉起/.test(b.textContent)?'🐟':/等/.test(b.textContent)?'⏳':'🎣';
  if(b.id==='tap-record')icon=['listening','hearing'].includes(b.dataset.state)?'■':['starting','processing'].includes(b.dataset.state)?'⏳':'🎤';
  if(forest&&b.matches('.topbar a.hud-button'))icon='🐰';
  if(!icon)continue;
  const text=b.textContent.trim();if(/[\p{L}\p{N}]/u.test(text))b.setAttribute('aria-label',text);else if(!b.hasAttribute('aria-label'))b.setAttribute('aria-label',({next:'下一題',again:'再玩一次',listen:'播放題目',submit:'確認答案',start:'開始',reload:'重新讀取'})[b.id]||'操作');
  b.dataset.childIcon=icon;
  b.dataset.childBadge=['decor-buy','life-unlock','grove-unlock','trail-pond','trail-farm'].includes(b.id)?(text.match(/\d+/)?.[0]?'✦ '+text.match(/\d+/)[0]:''):'';
 }
 const record=document.getElementById('tap-record'),status=document.getElementById('speech-status');
 if(record&&status){const state=record.dataset.state;status.dataset.pictureStatus=['listening','hearing'].includes(state)?'👂 🗣️':state==='processing'||state==='starting'?'⏳':document.getElementById('speech-help')?.hidden===false?'🎤 ⚠️':'🎤 → 🗣️ → ■';}
 // Put explanatory paragraphs behind an information flap, keeping important
 // connection/error/save states visible and all original controls connected.
 fold('reading-intro-details','#intro > .eyebrow,#intro > p:not([id]),#wordbank-count,#lesson-symbols,#intro > .rules');
 fold('exam-child-details','#exam-rules,#login-area > p,#question-controls > p:not([id])');
 if(page==='reading.html'||page==='reading-local.html')mountHelp();
 if(forest)mountHelp();
}
function fold(id,selector){const items=[...document.querySelectorAll(selector)].filter(n=>!n.closest('details'));if(!items.length)return;let details=document.getElementById(id);if(!details){details=document.createElement('details');details.id=id;details.className='picture-details';const summary=document.createElement('summary');summary.textContent='ⓘ';summary.setAttribute('aria-label','查看完整說明');details.append(summary);items[0].parentElement.append(details);}items.forEach(n=>details.append(n));}
function mountHelp(){if(document.getElementById('picture-help'))return;const help=document.createElement('button');help.id='picture-help';help.textContent='🔊';help.setAttribute('aria-label','看圖示、聽操作提示');document.body.append(help);help.onclick=()=>{
 if(document.querySelector('#tap-record[data-state="listening"],#tap-record[data-state="hearing"],#tap-record[data-state="starting"],#tap-record[data-state="processing"]'))return;
 let box=document.getElementById('picture-help-dialog');if(!box){box=document.createElement('dialog');box.id='picture-help-dialog';box.innerHTML='<button class="picture-help-close" aria-label="關閉說明">✕</button><div class="picture-help-steps"></div><p></p>';box.querySelector('button').onclick=()=>{box.close();globalThis.speechSynthesis?.cancel();};document.body.append(box);}
 const area=document.getElementById('world')?.dataset.area;
 const steps=forest?(area==='farm'?'🌱 → 💧 → 👂 → 🥕 → 🧺':area==='kitchen'?'🪑 → 🍲 → ✓ → 🥄':area==='room'?'🪑　🏡　🍲':area==='island'?'🪑　👗　🌱　⛵':area==='grove'?'👂　🧩　♫ → ✦':'🏠　🌱　🎣　🌲'):'🎤 → 🗣️ → ■';
 const words=forest?(area==='farm'?'先播種，再澆水。玩種子對應的注音關卡，答對七成，回來就能收成。':area==='kitchen'?'廚房已有免費的基本料理爐。收起來的話，按椅子圖示擺回。點料理爐，選料理，再按鍋子做一份，按湯匙到客廳吃東西。':area==='room'?'背包是物品清單，能查看與擺放買好的物品。左邊小門去臥室，右邊小門去廚房。':area==='island'?'點商店走到門口。椅子是家具行，衣服是服飾店，小芽是種子店。買好的家具和衣服，回家再使用。帆船的拜訪航線正在準備。':area==='grove'?'點小怪開始挑戰。耳朵選注音，拼圖拼注音，音符選聲調。房子回村莊，地圖通往島上商店。':'點房子回家，芽苗去農場，釣竿去釣魚。'):'按麥克風。看到耳朵，再慢慢讀。讀完按方塊送出。';
 box.querySelector('.picture-help-steps').textContent=steps;box.querySelector('p').textContent=forest?'看圖示，一步一步來':'按一下・讀・再按一下';box.showModal();
 // Only installed local Chinese voices; never add paid/cloud speech requests.
 const synth=globalThis.speechSynthesis,voice=synth?.getVoices().find(v=>v.localService&&/^zh(-|_)/i.test(v.lang));if(voice){synth.cancel();const utterance=new SpeechSynthesisUtterance(words);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.85;synth.speak(utterance);}
};}
if(enabled){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('child-picture-ui.css?v=20261012-recovery1',import.meta.url).href;document.head.append(css);
 const start=()=>{decorate();new MutationObserver(records=>{if(queued||!records.some(r=>!(r.target instanceof Element&&r.target.closest('#map-stage'))))return;queued=true;requestAnimationFrame(decorate);}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-state']});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 document.addEventListener('click',e=>{if(e.target.closest?.('#tap-record,#listen,#next,#leave'))globalThis.speechSynthesis?.cancel();},true);
}
