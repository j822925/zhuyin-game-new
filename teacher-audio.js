import {audioSource} from './audio-source.js?v=20260925-pitchhalf1';
import {BASE as SYMBOLS,COMPOUNDS as FINALS,poolFor} from './core.js?v=20260925-blanks1';
export function gameSamples(rows){return poolFor('spelling',{symbols:SYMBOLS,compounds:FINALS},rows).filter(s=>audioSource(s.audio).startsWith('audio/processed-'));}
// One native player for the entire catalogue: avoid hundreds of Safari media controls.
export const PAGE_SIZE=18;
export function samplePage(rows,initial='',page=0,query=''){
 const term=query.trim().replaceAll('一','ㄧ');
 const filtered=rows.filter(s=>(!initial||s.initial===initial)&&(!term||[s.displayLabel,s.label,s.word].some(v=>v?.includes(term))));
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
  const b=document.createElement('button');b.type='button';b.className='sample-play';b.textContent='▶ '+text;b.dataset.audio=audioSource(file);b.setAttribute('aria-pressed','false');
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
 function add(container,text,file){
  const card=document.createElement('article');card.className='audio-item';card.append(button(text,file));
  container.append(card);
 }
 COMPOUNDS.forEach((s,i)=>add($('compounds'),s,'audio/compound/c'+String(i+1).padStart(2,'0')+'.mp3'));
 const baseDetails=$('base').closest('details');
 baseDetails.addEventListener('toggle',()=>{if(baseDetails.open&&!$('base').children.length)BASE.forEach((s,i)=>add($('base'),s,'audio/audio_F'+(i+1)+'.WAV'));});
 return fetch('data/syllables.json?v=20260925-familyclean1').then(r=>{if(!r.ok)throw new Error('catalog');return r.json();}).then(rows=>{
  const all=gameSamples(createCatalog(rows));
  const filter=$('syllable-initial-filter');let page=0;
  const searchLabel=document.createElement('label');searchLabel.className='sample-search';searchLabel.htmlFor='syllable-search';searchLabel.textContent='搜尋注音或例字：';
  const search=document.createElement('input');search.id='syllable-search';search.type='search';search.placeholder='例如 ㄇㄚ、ㄩㄣ、母';search.autocomplete='off';searchLabel.append(search);filter.after(searchLabel);
  for(const initial of [...BASE,...COMPOUNDS]){const option=document.createElement('option');option.value=initial;option.textContent=initial;filter.append(option);}
  const nav=document.createElement('nav');nav.className='sample-pages';nav.setAttribute('aria-label','示範音分頁');
  const prev=document.createElement('button'),next=document.createElement('button'),status=document.createElement('span');prev.textContent='← 上一頁';next.textContent='下一頁 →';status.setAttribute('role','status');nav.append(prev,status,next);$('syllables').before(nav);
  function render(){
   release();const slice=samplePage(all,filter.value,page,search.value);page=slice.page;$('syllables').replaceChildren();
   for(const s of slice.items)add($('syllables'),s.displayLabel+(s.word?' · '+s.word:''),s.audio);
   $('syllable-count').textContent=`共 ${all.length} 個拼音錄音，加上 ${BASE.length} 個注音、${COMPOUNDS.length} 個結合韻，共 ${all.length+BASE.length+COMPOUNDS.length} 個錄音；目前篩選 ${slice.total} 個，每頁最多 ${PAGE_SIZE} 個。`;
   if(!slice.total){const empty=document.createElement('p');empty.textContent='找不到符合的錄音，請更換注音篩選或搜尋內容。';$('syllables').append(empty);}
   status.textContent=`${page+1} / ${slice.pages}`;prev.disabled=page===0;next.disabled=page===slice.pages-1;
  }
  prev.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};filter.onchange=()=>{page=0;render();};search.oninput=()=>{page=0;render();};render();
 }).catch(()=>{$('syllables').textContent='素材清單讀取失敗，請重新整理。';});
}
