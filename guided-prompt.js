import {setVerticalSymbols} from './spelling-layout.js';

export function syllable(reading) {
  const unit=document.createElement('span');
  unit.className='syllable';
  unit.setAttribute('role','img');
  unit.setAttribute('aria-label',reading);
  const symbols=reading.replace(/[ˉˊˇˋ˙]/gu,'');
  if(symbols)setVerticalSymbols(unit,symbols);
  const tone=reading.match(/[ˉˊˇˋ˙]/u)?.[0];
  if(tone){
    const mark=document.createElement('span');
    mark.className=tone==='˙'?'neutral':'tone';
    mark.setAttribute('aria-hidden','true');
    mark.textContent=tone;
    unit.append(mark);
  }
  return unit;
}

export function writingPrompt(q){
  const word=document.createElement('span');
  word.className='word-column';
  // The blank in the saved question identifies the selected occurrence, including repeated characters.
  let context=q.context;
  if(!context?.includes('□')){
    const text=q.word||'';
    const pos=text.indexOf(q.character);
    context=pos>=0 ? text.slice(0,pos)+'□'+text.slice(pos+q.character.length) : '□';
  }
  for(const ch of context){
    if(ch==='□'){word.append(syllable(q.reading));continue;}
    const han=document.createElement('span');
    han.className='word-character';
    han.textContent=ch;
    word.append(han);
  }
  return word;
}

export function phoneticFeedback(text){
  const content=document.createDocumentFragment();
  for(const part of text.split(/(˙?[ㄅ-ㄩ]+[ˉˊˇˋ˙]?)/u)){
    content.append(/[ㄅ-ㄩ]/u.test(part)?syllable(part):part);
  }
  return content;
}
