export const toneNames=['','一聲','二聲','三聲','四聲','輕聲'];
export const toneMarks=['','—','ˊ','ˇ','ˋ','˙'];
export function toneComplete(text,answer){return typeof answer==='string'&&answer.length===[...text].length&&/^[1-5]+$/.test(answer);}
// One compact, touch-friendly selector; no correctness hints before submission.
export function createToneInput(root,onChange=()=>{}){
 let text='',values=[],active=0,enabled=false;
 const chars=document.createElement('div'),tones=document.createElement('div');chars.className='exam-tone-characters';tones.className='exam-tone-options';root.classList.add('exam-tone-input');root.replaceChildren(chars,tones);
 const value=()=>values.map(t=>t||'?').join('');
 function render(){
  chars.replaceChildren();[...text].forEach((char,i)=>{const b=document.createElement('button');b.type='button';b.className='exam-tone-character';b.dataset.active=String(active===i);b.disabled=!enabled;b.setAttribute('aria-pressed',String(active===i));b.setAttribute('aria-label',char+'，'+(toneNames[values[i]]||'請選聲調'));const word=document.createElement('strong'),mark=document.createElement('span');word.textContent=char;mark.textContent=toneMarks[values[i]]||'?';b.append(word,mark);b.onclick=()=>{active=i;render();};chars.append(b);});
  tones.replaceChildren();for(let n=1;n<=5;n++){const b=document.createElement('button');b.type='button';b.disabled=!enabled;b.textContent=toneMarks[n]+' '+toneNames[n];b.setAttribute('aria-label',toneNames[n]);b.onclick=()=>{values[active]=n;const next=values.findIndex((t,i)=>i>active&&!t),missing=values.findIndex(t=>!t);active=next>=0?next:missing>=0?missing:active;render();onChange(value());};tones.append(b);}
 }
 return {show(word){text=word;values=Array.from(text,()=>0);active=0;render();},setEnabled(ready){if(enabled!==ready){enabled=ready;render();}},value,complete:()=>toneComplete(text,value())};
}
