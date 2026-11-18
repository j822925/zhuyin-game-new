const readings={森:'ㄙㄣ',林:'ㄌㄧㄣˊ',看:'ㄎㄢˋ',國:'ㄍㄨㄛˊ',字:'ㄗˋ',寫:'ㄒㄧㄝˇ',注:'ㄓㄨˋ',音:'ㄧㄣ',生:'ㄕㄥ',模:'ㄇㄛˊ',仿:'ㄈㄤˇ',姓:'ㄒㄧㄥˋ',名:'ㄇㄧㄥˊ',上:'ㄕㄤˋ',課:'ㄎㄜˋ',選:'ㄒㄩㄢˇ',練:'ㄌㄧㄢˋ',習:'ㄒㄧˊ',開:'ㄎㄞ',始:'ㄕˇ'};
const tonePaths={'ˉ':'M1 5 H10','ˊ':'M2 8 L9 2','ˇ':'M1 3 L5.5 8 L10 3','ˋ':'M2 2 L9 8'};
export function phonetic(text){
  const label=document.createElement('span');label.className='hz-ruby-title';label.setAttribute('aria-label',text);
  const phrases=text.startsWith('看')&&text.length===6?[text.slice(0,3),text.slice(3)]:[text];
  for(const phrase of phrases){
    const group=document.createElement('span');group.className='hz-phrase';
    for(const c of phrase){
      const ruby=document.createElement('ruby'),rt=document.createElement('rt'),symbols=document.createElement('span'),mark=document.createElement('span');
      const raw=readings[c],tone=raw.match(/[ˊˇˋ]/)?.[0]||'ˉ';
      symbols.className='phonetic-symbols';symbols.textContent=raw.replace(/[ˊˇˋ]/g,'');
      mark.className='phonetic-tone';mark.textContent=tone;
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
      svg.setAttribute('viewBox','0 0 11 10');svg.setAttribute('aria-hidden','true');path.setAttribute('d',tonePaths[tone]);svg.append(path);mark.append(svg);
      rt.append(symbols,mark);ruby.append(c,rt);group.append(ruby);
    }
    label.append(group);
  }
  return label;
}
const cards={
  reading:['看國字寫注音','山','ㄕㄢˉ','sound'],
  writing:['看注音寫國字','ㄕㄢˉ','山','grid'],
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

