const openButton=document.getElementById('split-open');
openButton.addEventListener('click',()=>{
  let dialog=document.getElementById('split-box');
  if(!dialog){dialog=buildBox();document.body.append(dialog);}
  dialog.showModal();
});
function buildBox(){
  const dialog=document.createElement('dialog');dialog.id='split-box';dialog.setAttribute('aria-labelledby','split-title');
  dialog.innerHTML=`<header><h1 id="split-title">分合箱</h1><button data-close>回加減玩</button></header>
  <div class="split-controls"><label>一共有 <select aria-label="總球數"></select> 顆球</label><button data-reset>重新分</button></div>
  <div class="split-area"><section class="wood"><div class="lid" data-zone="random"><span>投球口</span></div><div class="pockets"></div></section>
  <aside><div class="number-tree" aria-label="分合圖"><strong></strong><div><b></b><b></b></div></div><p class="split-status" role="status"></p><button class="split-toss">投一顆球 ↓</button><div class="tray" aria-label="待投的球"></div></aside></div>
  <footer>點球投入，或拖到左邊、右邊。點箱裡的球，可以換邊。</footer>`;
  const find=s=>dialog.querySelector(s),select=find('select'),pockets=find('.pockets');
  for(let i=1;i<=20;i++)select.add(new Option(i,i));select.value='7';
  let left=0,right=0,masks=[false,false];
  for(const [i,name] of ['左邊','右邊'].entries()){
    const pocket=document.createElement('div');pocket.className='pocket';pocket.dataset.zone=String(i);
    pocket.innerHTML='<div class="balls"></div><button class="mask-toggle"></button>';
    pocket.querySelector('button').onclick=()=>{masks[i]=!masks[i];render();};pockets.append(pocket);
    pocket.querySelector('button').dataset.side=name;
  }
  function transfer(from,to){
    if(from===to)return;
    const n=Number(select.value);
    if(from==='tray' && left+right>=n || from==='0' && (!left||masks[0]) || from==='1' && (!right||masks[1]))return;
    if(from==='0')left--;if(from==='1')right--;
    if(to==='random')to=Math.random()<.5?'0':'1';
    if(to==='0')left++;else right++;
    render();
  }
  function balls(host,count,from){
    host.replaceChildren();
    for(let i=0;i<count;i++){
      const b=document.createElement('button');b.className='split-ball';b.setAttribute('aria-label',from==='tray'?'投一顆球':'把球移到另一邊');
      b.onclick=e=>{if(e.detail===0)transfer(from,from==='tray'?'random':from==='0'?'1':'0');};
      b.onpointerdown=e=>{
        if(e.button!==0||!e.isPrimary)return;e.preventDefault();b.setPointerCapture(e.pointerId);
        const x=e.clientX,y=e.clientY;
        b.onpointermove=m=>{b.style.transform='translate('+(m.clientX-x)+'px,'+(m.clientY-y)+'px)';b.classList.add('picked');};
        b.onpointercancel=()=>{b.onpointermove=null;b.style.transform='';b.classList.remove('picked');};
        b.onpointerup=u=>{const moved=Math.hypot(u.clientX-x,u.clientY-y)>9;b.onpointercancel();
          if(!moved){transfer(from,from==='tray'?'random':from==='0'?'1':'0');return;}
          b.style.pointerEvents='none';const zone=document.elementFromPoint(u.clientX,u.clientY)?.closest('[data-zone]')?.dataset.zone;b.style.pointerEvents='';
          if(zone!==undefined)transfer(from,zone);
        };
      };host.append(b);
    }
  }
  function render(){
    const n=Number(select.value),remaining=n-left-right;
    find('.number-tree strong').textContent=n;
    [...pockets.children].forEach((p,i)=>{
      p.classList.toggle('covered',masks[i]);const amount=i?right:left;
      const host=p.querySelector('.balls');balls(host,masks[i]?0:amount,String(i));
      const toggle=p.querySelector('.mask-toggle');toggle.textContent=(masks[i]?'打開':'遮住')+toggle.dataset.side;toggle.setAttribute('aria-pressed',masks[i]);
      find('.number-tree').querySelectorAll('b')[i].textContent=masks[i]?'？':amount;
    });
    balls(find('.tray'),remaining,'tray');find('.split-toss').disabled=!remaining;
    find('.split-status').textContent=remaining?'還有 '+remaining+' 顆球可以投':masks.some(Boolean)?'猜一猜，遮住了幾顆？':left+' ＋ '+right+' ＝ '+n;
  }
  function reset(){left=right=0;masks=[false,false];render();}
  find('[data-close]').onclick=()=>dialog.close();select.onchange=reset;find('[data-reset]').onclick=reset;
  find('.split-toss').onclick=()=>transfer('tray','random');reset();return dialog;
}
