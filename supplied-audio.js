const $=id=>document.getElementById(id),player=$('player');let rows;
function stop(){player.pause();player.removeAttribute('src');player.load();}
function render(){
 stop();$('status').textContent='點選「試聽」播放。';
 const kind=$('filter').value,query=$('search').value.trim();
 for(const section of ['units','syllables']){
  const body=$(section);body.replaceChildren();
  for(const r of rows[section]){
   if(kind==='missing'&&r.available||kind==='available'&&!r.available)continue;
   if(query&&![r.label,r.word,r.id,r.expected].some(v=>v?.includes(query)))continue;
   const tr=document.createElement('tr');
   const values=section==='units'?[r.label,r.available?'已替換':'缺少，沿用原音']:[r.id,r.label+' · '+r.word,(r.available?'已替換':'缺少，沿用原音')+(r.enabled?'':'（暫不出題）')];
   for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}
   const td=document.createElement('td');
   if(r.available){const button=document.createElement('button');button.className='sample-play';button.textContent='▶ 試聽 '+r.label;button.onclick=()=>{player.pause();player.src=r.path;$('status').textContent=r.label;player.play().catch(()=>{$('status').textContent='無法播放，請再按一次或檢查網路。';});};td.append(button);}
   else td.textContent=r.expected;
   tr.append(td);body.append(tr);
  }
 }
}
player.onerror=()=>{if(player.hasAttribute('src'))$('status').textContent='音檔讀取失敗，請檢查網路。';};
window.addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
$('filter').onchange=render;$('search').oninput=render;
try{const response=await fetch('data/supplied-audio-report.json?v=20260925-tonefix1');if(!response.ok)throw Error();rows=await response.json();$('summary').textContent=`已替換：${rows.units.filter(r=>r.available&&r.label.length===1).length} 個單一注音、${rows.units.filter(r=>r.available&&r.label.length>1).length} 個結合韻、${rows.syllables.filter(r=>r.available).length} 個題目。待補：${rows.units.filter(r=>!r.available).length} 個注音／結合韻、${rows.syllables.filter(r=>!r.available).length} 個題目。`;render();}catch{$('summary').textContent='清單讀取失敗，請重新整理。';}
