import {STAR_CARDS} from './data/star-cards.js?v=20260919-star1';
export function createStarCollection({root,request}){
 let busy=false,version=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const title=el('h2','✨ 滿分星使收藏'),notice=el('p','每場小考滿分可抽一張，不扣星星。先抽未擁有的卡片；集滿後保留資格。'),status=el('p'),refresh=el('button','重新讀取收藏／恢復領獎'),tickets=el('div'),reveal=el('div'),grid=el('div');
 status.setAttribute('role','status');grid.className='star-grid';reveal.className='star-reveal';reveal.hidden=true;refresh.type='button';root.replaceChildren(title,notice,status,refresh,tickets,reveal,grid);
 function imageCard(c){const img=el('img');img.src=c.image;img.alt=c.symbol+'之星使・'+c.name;img.loading='lazy';img.width=1024;img.height=1536;return img;}
 function render(out){
  grid.replaceChildren();tickets.replaceChildren();status.textContent='已收藏 '+out.owned.length+'／'+out.total+' 張・尚有 '+out.tickets.length+' 次滿分抽卡資格';
  for(const c of STAR_CARDS){const f=el('figure'),owned=out.owned.some(x=>x.character===c.id);if(owned){const a=el('a');a.href=c.image;a.target='_blank';a.rel='noopener';a.append(imageCard(c));f.append(a);}else{const back=el('div','✦');back.className='star-card-back';back.setAttribute('aria-label','尚未獲得的神祕星使');f.append(back);}f.append(el('figcaption',owned?c.symbol+'・'+c.name:'神祕星使'));grid.append(f);}
  if(out.owned.length>=out.total&&out.tickets.length)tickets.append(el('p','目前的星使已集滿！資格保留，新增卡片後可以再抽。'));
  else for(const t of out.tickets){const b=el('button','🎁 '+t.title+'：抽滿分星使');b.type='button';b.dataset.examId=t.exam_id;b.onclick=()=>draw(t.exam_id);tickets.append(b);}
 }
 function lock(on){busy=on;refresh.disabled=on;tickets.querySelectorAll('button').forEach(b=>b.disabled=on);}
 async function load(){if(busy)return;const v=++version;lock(true);try{const out=await request({kind:'star-list'});if(v===version)render(out);}catch{status.textContent='收藏讀取失敗，請重新讀取；若登入過期，請回上一頁重新登入。';}finally{lock(false);}}
 async function draw(examId){if(busy)return;lock(true);reveal.hidden=false;reveal.className='star-reveal opening';reveal.replaceChildren(el('p','✨ 星使正在現身…'));status.textContent='正在確認滿分資格與保存獎品…';
  try{const out=await request({kind:'star-draw',examId});if(out.complete){reveal.replaceChildren(el('p','已集滿本期星使，這次資格已保留。'));}else{const c=STAR_CARDS.find(x=>x.id===out.character);if(!c)throw Error('unknown_card');reveal.replaceChildren(el('h3','🎉 '+c.symbol+'之星使・'+c.name),imageCard(c),el('p','已保存到你的收藏！'));reveal.className='star-reveal appeared';}
   render(await request({kind:'star-list'}));
  }catch{status.textContent='連線尚未確認。請按重新讀取；若已領到會出現在收藏，未領到可再按同一場抽卡，不會重複扣資格。';reveal.className='star-reveal';reveal.replaceChildren(el('p','📶 獎品以已保存的收藏為準。'));}finally{lock(false);}
 }
 refresh.onclick=load;return {load};
}
