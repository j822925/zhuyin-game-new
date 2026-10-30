// OS dictation writes to an ordinary text field. It cannot be distinguished from typing.
// Keep text only in this control; the caller uses the existing reading verdict.
export function createKeyboardReadingInput(root,onText,{doc=globalThis.document}={}){
 root.classList.add('reading-keyboard');
 root.innerHTML='<label>① 點框框，再按鍵盤 🎙️<span data-keyboard-field></span></label><p>② 讀完關閉 🎙️，再送出</p><div class="reading-keyboard-actions"><button type="button" data-keyboard-submit>✅ 送出</button><button type="button" data-keyboard-clear>↻ 重讀</button></div><details><summary>⚙️ 給大人</summary><p>鍵盤也能打字，請陪孩子使用麥克風。遊戲只保存作答結果，不保存輸入文字。</p></details>';
 const field=root.querySelector('[data-keyboard-field]'),send=root.querySelector('[data-keyboard-submit]'),clear=root.querySelector('[data-keyboard-clear]');
 let input,enabled=false,visible=false,composing=false,sending=false,generation=0;
 function controls(){const disabled=!enabled||!visible||sending;input.disabled=disabled;send.disabled=disabled||composing||!input.value.trim();clear.disabled=disabled;root.hidden=!visible;}
 function reset(){
  const old=input;generation++;if(old){old.oninput=old.oncompositionstart=old.oncompositionend=null;old.value='';old.blur();}
  composing=false;sending=false;input=doc.createElement('input');input.type='text';input.value='';
  for(const [key,value] of Object.entries({lang:'zh-TW',inputmode:'text',autocomplete:'off',autocorrect:'off',autocapitalize:'off',spellcheck:'false',maxlength:'80','aria-label':'鍵盤聽寫文字',placeholder:'點這裡，再按鍵盤 🎙️'}))input.setAttribute(key,value);
  const current=input,version=generation;
  current.oninput=()=>{if(version===generation)controls();};
  current.oncompositionstart=()=>{if(version===generation){composing=true;controls();}};
  current.oncompositionend=()=>{if(version===generation){composing=false;controls();}};
  field.replaceChildren(input);controls();
 }
 send.onclick=()=>{
  if(!visible||!enabled||sending||composing||doc.hidden)return;
  const text=input.value.trim().slice(0,80);if(!text)return;
  const version=generation;sending=true;controls();input.blur();
  try{onText(text);}finally{if(version===generation)reset();}
 };
 clear.onclick=()=>{if(!enabled||!visible||sending)return;reset();input.focus();};
 reset();
 return {reset,setEnabled(value){enabled=!!value;controls();},setVisible(value){const next=!!value;if(visible!==next)reset();visible=next;controls();}};
}
