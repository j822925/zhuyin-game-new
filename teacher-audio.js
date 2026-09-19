import {audioSource} from './audio-source.js?v=20260920-le4';
// One native player for the entire catalogue: avoid hundreds of Safari media controls.
export const PAGE_SIZE=18;
export function samplePage(rows,initial='',page=0){
 const filtered=rows.filter(s=>!initial||s.initial===initial);
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 const current=Math.max(0,Math.min(pages-1,page));
 return {items:filtered.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE),total:filtered.length,pages,page:current};
}
export function setupTeacherAudio({BASE,COMPOUNDS,createCatalog}){
 const $=id=>document.getElementById(id);
 const panel=document.createElement('section');panel.className='teacher-player';
 const label=document.createElement('span');label.id='teacher-playing';label.textContent='點選 ▶ 試聽';label.setAttribute('role','status');
 const player=document.createElement('audio');player.id='teacher-audio';player.controls=true;player.preload='none';player.setAttribute('aria-label','示範音播放器');
 panel.append(label,player);document.querySelector('header').after(panel);
 let selected=null,playId=0;
 function release(){playId++;player.pause();player.removeAttribute('src');player.load();selected?.setAttribute('aria-pressed','false');selected=null;label.textContent='點選 ▶ 試聽';}
 function button(text,file){
  const b=document.createElement('button');b.type='button';b.className='sample-play';b.textContent='▶ '+text;b.setAttribute('aria-pressed','false');
  b.onclick=()=>{
   release();selected=b;b.setAttribute('aria-pressed','true');label.textContent=text;const id=playId;
   player.src=audioSource(file);
   // Play directly inside the tap handler so Safari retains the user gesture.
   player.play().catch(()=>{if(id===playId){label.textContent='未能播放，請再點一次 ▶ 或檢查網路。';b.setAttribute('aria-pressed','false');}});
  };return b;
 }
 player.onended=()=>selected?.setAttribute('aria-pressed','false');
 player.onerror=()=>{if(player.hasAttribute('src')){label.textContent='音檔讀取失敗，請檢查網路後再試。';selected?.setAttribute('aria-pressed','false');}};
 window.addEventListener('pagehide',release);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
 function add(container,text,file,original){
  const card=document.createElement('article');card.className='audio-item';card.append(button(text,file));
  if(original){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='比較原版';details.append(summary,button(text+' 原版',original));card.append(details);}
  container.append(card);
 }
 COMPOUNDS.forEach((s,i)=>add($('compounds'),s,'audio/compound/c'+String(i+1).padStart(2,'0')+'.mp3'));
 const baseDetails=$('base').closest('details');
 baseDetails.addEventListener('toggle',()=>{if(baseDetails.open&&!$('base').children.length)BASE.forEach((s,i)=>add($('base'),s,'audio/audio_F'+(i+1)+'.WAV'));});
 return fetch('data/syllables.json?v=20260920-le4').then(r=>{if(!r.ok)throw new Error('catalog');return r.json();}).then(rows=>{
  const all=createCatalog(rows).map((s,index)=>({...s,original:index<44?s.audio.replace('syllable-clear/','syllable/'):null}));
  const filter=$('syllable-initial-filter');let page=0;
  for(const initial of BASE.slice(0,21)){const option=document.createElement('option');option.value=initial;option.textContent=initial;filter.append(option);}
  const nav=document.createElement('nav');nav.className='sample-pages';nav.setAttribute('aria-label','示範音分頁');
  const prev=document.createElement('button'),next=document.createElement('button'),status=document.createElement('span');prev.textContent='← 上一頁';next.textContent='下一頁 →';status.setAttribute('role','status');nav.append(prev,status,next);$('syllables').before(nav);
  function render(){
   release();const slice=samplePage(all,filter.value,page);page=slice.page;$('syllables').replaceChildren();
   for(const s of slice.items)add($('syllables'),s.displayLabel+' · '+s.word+(s.enabled?'':'（待核對，不出題）'),s.audio,s.original);
   $('syllable-count').textContent=`共 ${all.length} 個示範音，${all.filter(s=>s.enabled).length} 個可出題；目前篩選 ${slice.total} 個，每頁最多 ${PAGE_SIZE} 個。`;
   status.textContent=`${page+1} / ${slice.pages}`;prev.disabled=page===0;next.disabled=page===slice.pages-1;
  }
  prev.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};filter.onchange=()=>{page=0;render();};render();
 }).catch(()=>{$('syllables').textContent='素材清單讀取失敗，請重新整理。';});
}
