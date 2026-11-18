const readings={森:'ㄙㄣ',林:'ㄌㄧㄣˊ',看:'ㄎㄢˋ',國:'ㄍㄨㄛˊ',字:'ㄗˋ',寫:'ㄒㄧㄝˇ',注:'ㄓㄨˋ',音:'ㄧㄣ',生:'ㄕㄥ',模:'ㄇㄛˊ',仿:'ㄈㄤˇ',姓:'ㄒㄧㄥˋ',名:'ㄇㄧㄥˊ',上:'ㄕㄤˋ',課:'ㄎㄜˋ',選:'ㄒㄩㄢˇ',練:'ㄌㄧㄢˋ',習:'ㄒㄧˊ',開:'ㄎㄞ',始:'ㄕˇ'};
export function phonetic(text){
  const label=document.createElement('span');label.className='hz-ruby-title';label.setAttribute('aria-label',text);
  for(const c of text){const r=document.createElement('ruby'),rt=document.createElement('rt');r.append(c);const raw=readings[c]||'',tone=raw.match(/[˙ˊˇˋ]/)?.[0]||'';rt.textContent=raw.replace(/[˙ˊˇˋ]/g,'');if(tone)rt.dataset.tone=tone;r.append(rt);label.append(r);}
  return label;
}
const cards={
  reading:['看國字寫注音','山','ㄕㄢ','sound'],
  writing:['看注音寫國字','ㄕㄢ','山','grid'],
  copy:['生字模仿','木','木','trace'],
  'name-writing':['看注音寫姓名','ㄇㄧㄥˊ','名','badge'],
  'name-copy':['姓名模仿','名','名','badge'],
  classroom:['上課選字','木','木','choice']
};
export function cover(button,mode){
  const [title,from,to,kind]=cards[mode];button.classList.add('lesson-cover');button.dataset.cover=mode;
  const diagram=document.createElement('span');diagram.className='lesson-diagram '+kind;diagram.setAttribute('aria-hidden','true');
  const paper=(value,style)=>{const el=document.createElement('span');el.className='lesson-paper '+style;el.textContent=value;if(value.length>2)el.classList.add('long-sound');return el;};
  const arrow=document.createElement('span');arrow.className='lesson-arrow';arrow.textContent='→';
  diagram.append(paper(from,'model'),arrow,paper(to,'answer'));
  const label=document.createElement('strong');label.append(phonetic(title));
  button.setAttribute('aria-label',title);button.replaceChildren(diagram,label);
}

