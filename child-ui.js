export function setupChildUI({demo,onPreviewBonus,onBeforeVoice}){
 const $=id=>document.getElementById(id);document.body.classList.add('child-ui');
 const hideText=node=>{for(const child of node.childNodes)if(child.nodeType===Node.TEXT_NODE)child.textContent='';};
 const icon=(id,text,label)=>{if($(id)){$(id).textContent=text;$(id).setAttribute('aria-label',label);}};
 const heading=document.querySelector('.hero h1');heading.textContent='👂 🎵';heading.setAttribute('aria-label','一起去聲音探險');
 document.querySelector('.top-actions a').textContent='⚙';document.querySelector('.top-actions a').setAttribute('aria-label','老師專區');
 for(const [id,symbol,label] of [['solo','👤','一人練習'],['duo','🐰 ⇄ 🦊','雙人輪流練習'],['race','⚡','雙人搶答'],['leave','⌂','回到島嶼'],['reload','⟳','重新讀取老師任務'],['again','↻','再玩一次'],['back-home','⌂','回到島嶼'],['check-spelling','✓','確認拼音'],['race-leave','⌂','回到島嶼'],['race-fullscreen','⛶','全螢幕']])icon(id,symbol,label);
 for(const select of [$('seat'),$('partner')]){hideText(select.parentElement);select.before(document.createTextNode(select.id==='seat'?'🔢 ':'＋ '));}
 const demoNote=$('demo-note');if(demo){const details=document.createElement('details');details.className='teacher-demo-controls';const summary=document.createElement('summary');summary.textContent='⚙ 老師試玩設定';details.append(summary);demoNote.before(details);details.append(demoNote);const bonus=document.createElement('button');bonus.className='text-button';bonus.textContent='試玩補充：20 星星＋50 糖果';bonus.onclick=onPreviewBonus;demoNote.append(bonus);}
 document.querySelector('.result-card h1').textContent='🎉';
 document.querySelectorAll('.slots+p').forEach(p=>p.classList.add('sr-only'));
 const help=document.createElement('button');help.id='voice-help';help.textContent='🔊';help.setAttribute('aria-label','聽操作提示');document.body.append(help);
 const voice=new Audio();
 help.onclick=async()=>{const sound=!$('race-game').hidden?'race':!$('game').hidden?($('spelling').hidden?'listen':'spelling'):'home';onBeforeVoice?.();voice.pause();voice.src='audio/help/'+sound+'.wav';try{await voice.play();}catch{help.textContent='🔇';help.setAttribute('aria-label','語音無法播放，請老師確認音量與網路');}};
 // Help never interrupts a live race: the same-question audio must remain fair.
 const style=document.createElement('style');style.textContent='.race-active #voice-help{display:none}.exchange-dialog{text-align:center}.exchange-dialog #exchange-character{width:170px;height:180px;margin:auto}.exchange-dialog p{font-size:32px}.candy-bonus{font-size:30px;white-space:nowrap}.teacher-demo-controls{margin:5px 0 20px;font-size:12px;color:#617b74}.teacher-demo-controls summary{cursor:pointer;padding:8px}.teacher-demo-controls .notice{margin:10px 0}.child-ui #race-message{font-size:24px}.child-ui .race-next-row button{font-size:30px}';document.head.append(style);
 return {stop(){voice.pause();}};
}
