import {classUrl} from './class-context.js?v=20261023-exam1';
// Public schedule only; all attempts/answers still require the student's PIN.
export function setupExamEntry({endpoint,home,demo,monsterCollection}){
 if(demo)return;
 const panel=document.createElement('nav');panel.className='special-destinations';panel.setAttribute('aria-label','任務、小考與錯題本');
 function card({href,theme,icon,title,description}){
  const a=document.createElement('a');a.href=href;a.className='destination-card '+theme;
  const img=document.createElement('img');img.src=icon;img.alt='';img.width=112;img.height=112;img.className='destination-icon';
  const text=document.createElement('span');text.className='destination-copy';
  const label=document.createElement('strong');label.className='destination-title';label.textContent=title;
  const detail=document.createElement('span');detail.className='destination-detail';detail.textContent=description;
  const arrow=document.createElement('span');arrow.className='destination-arrow';arrow.textContent='➜';arrow.setAttribute('aria-hidden','true');
  text.append(label,detail);a.append(img,text,arrow);panel.append(a);return {a,detail};
 }
 card({href:'daily.html?v=20261116-hub1',theme:'destination-stars',icon:'assets/icons/exam-notebook-v1.svg',title:'每日任務',description:'看看今天要完成哪些關卡'});
 card({href:'exam.html?v=20261023-readingexam1',theme:'destination-exam',icon:'assets/icons/exam-notebook-v1.svg',title:'老師小考',description:'所有關卡的小考都在這裡'});
 card({href:'star-cards.html?v=20261123-starenvoys1',theme:'destination-stars',icon:'assets/icons/star-collection-v1.svg',title:'星之使者',description:'領取滿分獎勵・看看我的卡片'});
 if(monsterCollection){const {a}=card({href:'#',theme:'destination-monsters',icon:'assets/icons/monster-collection.svg',title:'可愛反派收藏',description:'隨機遇見・全對擊敗三次就能收藏'});monsterCollection.button.className='destination-card destination-monsters';monsterCollection.button.replaceChildren(...a.childNodes);a.replaceWith(monsterCollection.button);}
 card({href:'notebook.html',theme:'destination-exam',icon:'assets/icons/mistake-notebook.svg',title:'我的錯題本',description:'所有關卡的錯題・再練一次！'});
 card({href:classUrl('guided-practice.html'),theme:'destination-exam',icon:'assets/icons/classroom-quiz.svg',title:'課堂練習',description:'跟著提示練一練，再自己答一次'});
 home.prepend(panel);
}
