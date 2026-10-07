// Personal practice after server settlement. This module never grants rewards,
// changes scores, or deletes the teacher's original mistake records.
export function createCompletion({document,storage=globalThis.sessionStorage,rankTable}){
 const $=id=>document.getElementById(id),el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const audio=new Audio();let key='',progress=null,selected=null,correct=false,wrong=false,audioKey='';
 const persist=()=>{try{storage.setItem(key,JSON.stringify(progress));}catch{}};
 const pause=()=>{audio.pause();};
 globalThis.addEventListener('pagehide',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 function render(s){
  if(s.role==='host'||s.phase!=='finished')return false;
  const nextKey='zhuyin.classroom.review:'+s.classId+':'+s.activityId+':'+s.seat,review=s.mine?.review||[];
  if(key!==nextKey){key=nextKey;progress={stage:'reward',index:0};try{const saved=JSON.parse(storage.getItem(key));if(saved&&['reward','review','done'].includes(saved.stage)&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<=review.length)progress=saved;}catch{}selected=null;correct=false;wrong=false;audioKey='';}
  for(const id of ['choices','controls','feedback','ranking','report'])$(id).replaceChildren();
  $('players').replaceChildren();$('invite').hidden=true;$('audio-area').hidden=true;
  $('progress').textContent='';$('timer').textContent='';
  const button=(text,fn)=>{const b=el('button',text);b.type='button';b.className='primary';b.onclick=fn;return b;};
  const rerender=()=>render(s);
  if(progress.stage==='reward'){
   $('phase-title').textContent='🎉 你完成全班挑戰了！';
   const pending=s.rewarding&&s.mine?.rewardPending,stars=s.mine?.rewardStars||0,card=el('div');card.className='classroom-reward';
   card.append(el('div',s.rewarding?'⭐'.repeat(stars||1):'🎉'),el('h2',s.rewarding?stars?'獲得 '+stars+' 顆星星！':'本場沒有星星入帳':'挑戰完成！'),el('p',pending?'星星正在存入帳號；網路慢也不用擔心，系統會自動補發。':s.rewarding&&stars?'已經存入帳號，不用再領一次。':'一起把錯題學會吧！'));
   $('feedback').append(card);
   const b=button(review.length?'📖 開始錯題重做':'🌈 看完成畫面',()=>{progress.stage=review.length?'review':'done';persist();rerender();});$('controls').append(b);
   $('room-note').textContent=s.transport==='peer'?'本場是 P2P 試玩，不發星星、不寫正式紀錄；可以在這裡把錯題重做。':'先看看你的獎勵，再一起把錯題學會。訂正不會改變比賽分數，也不會重複發星星。';return true;
  }
  if(progress.stage==='review'&&progress.index>=review.length){progress.stage='done';persist();}
  if(progress.stage==='done'){
   pause();$('phase-title').textContent='🌈 全部訂正完成，真棒！';
   $('feedback').textContent=review.length?'每一題都選對了！':'這次沒有錯題，真棒！';
   $('ranking').append(el('h2','🏆 前五名・掌聲鼓勵！'),rankTable(s.ranking));
   $('room-note').textContent=s.transport==='peer'?'P2P 試玩訂正完成！老師可下載本場 CSV，這次沒有更動正式成績或星星。':'原本的作答與錯題紀錄仍保留在教師後台。星星每場只發一次。';return true;
  }
  const q=review[progress.index],qkey=key+':'+progress.index;
  const play=async()=>{audio.src=q.audio;$('audio-status').textContent='🔊 正在播放…';audio.onended=()=>{$('audio-status').textContent='聽完了，可以再聽一次。';};audio.onerror=()=>{$('audio-status').textContent='聲音還沒讀取好，請再按「聽題目」。';};try{await audio.play();}catch{$('audio-status').textContent='請點「聽題目」播放聲音。';}};
  $('phase-title').textContent='📖 我的錯題重做';$('progress').textContent='訂正第 '+(progress.index+1)+' / '+review.length+' 題・原第 '+(q.index+1)+' 題';
  $('audio-area').hidden=false;$('listen').onclick=play;
  for(const [i,value]of q.choices.entries()){
   const b=el('button');b.append(el('span',['▲','●','◆','■'][i]),el('span',value));b.firstChild.className='shape';b.dataset.value=value;b.classList.toggle('selected',selected===value);b.classList.toggle('correct',correct&&value===q.answer);b.disabled=correct;
   b.onclick=()=>{selected=value;correct=value===q.answer;wrong=!correct;rerender();};$('choices').append(b);
  }
  $('feedback').textContent=correct?'🎉 選對了！':wrong?'🌱 再聽一次、再選一次！':'聽題目，再選一次；選對才能繼續。';
  if(correct)$('controls').append(button(progress.index===review.length-1?'🌈 完成訂正':'➡️ 下一題',()=>{pause();progress.index++;selected=null;correct=false;wrong=false;persist();rerender();}));
  $('room-note').textContent='這裡沒有倒數，可以一直重播；選對才能繼續，不會再額外發星星。';
  if(audioKey!==qkey){audioKey=qkey;play();}
  return true;
 }
 return {render,pause};
}
