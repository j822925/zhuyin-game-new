import {STAR_CARDS} from './data/star-cards.js?v=20260919-star1';
import {starEgg,createStarPrize} from './star-prize.js?v=20260919-egg1';
import {within} from './reward-request.js?v=20260919-egg1';
export function createStarCollection({root,request}){
 const send=request;request=payload=>within(Promise.resolve().then(()=>send(payload)),12000);
 let busy=false,version=0,prize=null;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const title=el('h2','✨ 滿分星使收藏'),notice=el('p','每場小考滿分可抽一張，不扣星星。先抽未擁有的卡片；集滿後保留資格。'),status=el('p'),refresh=el('button','重新讀取收藏／恢復領獎'),tickets=el('div'),reveal=el('div'),grid=el('div');
 status.setAttribute('role','status');grid.className='star-grid';tickets.className='star-ticket-eggs';reveal.className='star-reveal';reveal.hidden=true;refresh.type='button';root.replaceChildren(title,tickets,reveal,notice,status,refresh,grid);
 function imageCard(c){const img=el('img');img.src=c.image;img.alt=c.symbol+'之星使・'+c.name;img.loading='lazy';img.width=1024;img.height=1536;return img;}
 function render(out){
  grid.replaceChildren();tickets.replaceChildren();status.textContent='已收藏 '+out.owned.length+'／'+out.total+' 張・尚有 '+out.tickets.length+' 次滿分抽卡資格';
  for(const c of STAR_CARDS){const f=el('figure'),owned=out.owned.some(x=>x.character===c.id);if(owned){const a=el('a');a.href=c.image;a.target='_blank';a.rel='noopener';a.append(imageCard(c));f.append(a);}else{const back=el('div','✦');back.className='star-card-back';back.setAttribute('aria-label','尚未獲得的神祕星使');f.append(back);}f.append(el('figcaption',owned?c.symbol+'・'+c.name:'神祕星使'));grid.append(f);}
  if(out.owned.length>=out.total&&out.tickets.length)tickets.append(el('p','目前的星使已集滿！資格保留，新增卡片後可以再抽。'));
  else for(const t of out.tickets){const b=el('button');b.type='button';b.className='star-egg-button';b.dataset.examId=t.exam_id;b.setAttribute('aria-label',t.title+'：點星光蛋，抽滿分星使');const label=el('strong','點我開蛋！'),hint=el('span','👆'),exam=el('small',t.title);hint.className='star-egg-hand';b.append(starEgg(),hint,label,exam);b.onclick=()=>draw(t.exam_id);tickets.append(b);}
 }
 function lock(on){busy=on;refresh.disabled=on;tickets.querySelectorAll('button').forEach(b=>b.disabled=on);}
 async function load(){if(busy)return;const v=++version;lock(true);try{const out=await request({kind:'star-list'});if(v===version){render(out);if(out.tickets.length&&out.owned.length<out.total)tickets.scrollIntoView({block:'start'});}}catch{status.textContent='收藏讀取失敗，請重新讀取；若登入過期，請回上一頁重新登入。';}finally{lock(false);}}
 async function draw(examId){if(busy)return;lock(true);prize??=createStarPrize();prize.start();reveal.hidden=true;status.textContent='正在確認滿分資格與保存獎品…';let saved=false;
  try{const out=await request({kind:'star-draw',examId});if(out.complete){prize.message('已集滿本期星使，這次資格已保留。');}else{const c=STAR_CARDS.find(x=>x.id===out.character);if(!c)throw Error('unknown_card');saved=true;reveal.hidden=false;reveal.replaceChildren(el('h3','🎉 '+c.symbol+'之星使・'+c.name),imageCard(c),el('p','已保存到你的收藏！'));await prize.reveal(c);}
   try{render(await request({kind:'star-list'}));}catch{status.textContent=saved?'角色已保存！收藏清單暫時讀取失敗，請按重新讀取確認。':'收藏清單暫時讀取失敗，請重新讀取確認資格。';}
  }catch{status.textContent='連線尚未確認。請按重新讀取；若已領到會出現在收藏，未領到可再按同一場抽卡，不會重複扣資格。';prize.message('📶 尚未確認抽卡結果。請回到收藏，按重新讀取確認。');}finally{lock(false);}
 }
 refresh.onclick=load;return {load};
}
