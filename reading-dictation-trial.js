// An ungraded keyboard-input check, separate from all recognition/scoring APIs.
// The webpage cannot start OS dictation or distinguish dictated from typed text.
const WORDS=['蘋果','香蕉','白雲','雨傘','小白兔'];
export function mountDictationTrial({trigger,beforeOpen=()=>{},doc=document,win=window}){
 const dialog=doc.createElement('dialog');dialog.className='dictation-trial';
 dialog.setAttribute('aria-label','鍵盤聽寫試用，不計分');
 dialog.innerHTML='<h2>⌨️ 聽寫試用</h2><p>不計分 · 不保存文字</p><p data-step></p><p class="dictation-trial-word" data-word></p><label for="dictation-trial-text">① 點輸入框　② 按鍵盤 🎙️</label><input id="dictation-trial-text" type="text" lang="zh-TW" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" maxlength="80" placeholder="用鍵盤麥克風說出上面的詞"><p data-status role="status">說完先點鍵盤 🎙️ 停止，再按下一個。</p><div class="dictation-trial-actions"><button type="button" data-next class="primary">下一個 →</button><button type="button" data-retry class="secondary">清空重讀</button><button type="button" data-close class="secondary">結束試用</button></div>';
 doc.body.append(dialog);
 const q=s=>dialog.querySelector(s),input=q('input'),next=q('[data-next]'),retry=q('[data-retry]'),status=q('[data-status]');let index=0,composing=false;
 function sync(){next.disabled=composing||!input.value.trim();}
 function render(){
  const done=index===WORDS.length;input.value='';input.hidden=done;input.disabled=done;q('label').hidden=done;next.hidden=done;
  q('[data-step]').textContent=done?'已完成五次輸入（未判分）':`第 ${index+1} / ${WORDS.length} 個`;
  q('[data-word]').textContent=done?'✅':WORDS[index];retry.textContent=done?'再試五個詞語':'清空重讀';
  status.textContent=done?'請告訴老師：是否每個詞語都能連續輸入，不必等很久？':'說完先點鍵盤 🎙️ 停止，再按下一個。';sync();
 }
 function clear(){input.blur();input.value='';index=0;composing=false;}
 function close(){clear();if(dialog.open)dialog.close();}
 trigger.onclick=()=>{beforeOpen();clear();render();dialog.showModal();};
 input.oninput=sync;input.oncompositionstart=()=>{composing=true;sync();};input.oncompositionend=()=>{composing=false;sync();};
 next.onclick=()=>{if(!dialog.open||next.disabled||index>=WORDS.length)return;input.blur();index++;render();};
 retry.onclick=()=>{if(index===WORDS.length)index=0;composing=false;render();input.focus();};
 q('[data-close]').onclick=close;dialog.onclose=clear;
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)close();});win.addEventListener('pagehide',close);
 return {close};
}
