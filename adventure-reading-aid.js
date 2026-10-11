// Forest interface text stays plain. Quiz phonetic symbols are left untouched.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function readingHTML(text){return escape(text);}
export function setReadingText(el,text){el.setAttribute('aria-label',text);el.textContent=text;}
export function installReadingAid(){return ()=>{};}
