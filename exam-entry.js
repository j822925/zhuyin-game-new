import {classUrl} from './class-context.js?v=20260926-classes1';
// Public schedule only; all attempts/answers still require the student's PIN.
export function setupExamEntry({endpoint,home,demo}){
 if(demo)return;
 const panel=document.createElement('nav');panel.className='special-destinations';panel.setAttribute('aria-label','小考與星使收藏');
 function card({href,theme,icon,title,description}){
  const a=document.createElement('a');a.href=href;a.className='destination-card '+theme;
  const img=document.createElement('img');img.src=icon;img.alt='';img.width=112;img.height=112;img.className='destination-icon';
  const text=document.createElement('span');text.className='destination-copy';
  const label=document.createElement('strong');label.className='destination-title';label.textContent=title;
  const detail=document.createElement('span');detail.className='destination-detail';detail.textContent=description;
  const arrow=document.createElement('span');arrow.className='destination-arrow';arrow.textContent='➜';arrow.setAttribute('aria-hidden','true');
  text.append(label,detail);a.append(img,text,arrow);panel.append(a);return {a,detail};
 }
 const {a:link,detail}=card({href:'exam.html',theme:'destination-exam',icon:'assets/icons/exam-notebook-v1.svg',title:'老師小考',description:'聽音 25 題・拼音 10 題'});
 card({href:'star-cards.html',theme:'destination-stars',icon:'assets/icons/star-collection-v1.svg',title:'滿分星使收藏',description:'領取滿分獎勵・看看我的卡片'});
 home.prepend(panel);
 async function refresh(){try{const r=await fetch(classUrl(endpoint+'?api=exams'),{cache:'no-store'});if(!r.ok)throw Error('schedule');const out=await r.json();if(!Array.isArray(out.exams)||!Number.isFinite(out.serverNow))throw Error('schedule');const active=out.exams.find(e=>e.starts<=out.serverNow&&e.ends>out.serverNow);link.href=active?'exam.html?id='+encodeURIComponent(active.id):'exam.html';link.classList.toggle('exam-open',!!active);detail.textContent=active?'小考進行中：'+active.title+'（'+(active.questions??25)+' 題）':'聽音 25 題・拼音 10 題';}catch{link.href='exam.html';link.classList.remove('exam-open');detail.textContent='點這裡確認小考時間';}}
 refresh();setInterval(()=>{if(!document.hidden&&!home.hidden)refresh();},60000);
}
