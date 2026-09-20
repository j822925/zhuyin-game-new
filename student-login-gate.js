// A single, child-friendly sign-in path for all home-screen destinations.
export function setupStudentLoginGate({auth,getSeat,selectSeat,getSeats,onRetry,onHome}){
 const dialog=document.createElement('dialog');dialog.id='student-login-guide';dialog.setAttribute('aria-labelledby','login-guide-title');
 dialog.innerHTML='<button type="button" id="login-guide-close" aria-label="關閉登入提示">✕</button><div class="login-guide-picture" aria-hidden="true">🔢 ➜ 🔒</div><h2 id="login-guide-title">先登入，再去探險！</h2><p>① 點自己的座號　② 輸入四位密碼</p><div id="login-guide-seats" aria-label="選擇我的座號"></div><p id="login-guide-status" role="status"></p><button type="button" id="login-guide-retry">重新讀取座號</button>';
 document.body.append(dialog);let pending=null,working=false;
 const $=id=>document.getElementById(id);
 function cancel(){pending=null;dialog.close();}
 $('login-guide-close').onclick=cancel;dialog.addEventListener('cancel',()=>{pending=null;});
 function update(){const seats=getSeats();$('login-guide-seats').replaceChildren();$('login-guide-status').textContent=seats.length?'':'還沒讀到座號，請稍候或按「重新讀取座號」。';$('login-guide-retry').hidden=!!seats.length;
  for(const seat of seats){const button=document.createElement('button');button.type='button';button.textContent=seat+' 號';button.onclick=async()=>{
   if(working)return;working=true;const target=pending;pending=null;dialog.close();
   try{await selectSeat(seat);if(auth.verified(getSeat())&&target?.isConnected&&!target.disabled)target.click();}finally{working=false;}
  };$('login-guide-seats').append(button);}
 }
 function open(target=null){if(working)return;pending=target;onHome();update();if(!dialog.open)dialog.showModal();}
 $('login-guide-retry').onclick=async()=>{$('login-guide-retry').disabled=true;try{await onRetry();update();}finally{$('login-guide-retry').disabled=false;}};
 document.addEventListener('click',event=>{
  const target=event.target.closest?.('button,a,select,input');
  if(!target||target.closest('dialog')||!target.closest('header,#home')||target.id==='seat'||auth.verified(getSeat()))return;
  event.preventDefault();event.stopImmediatePropagation();
  open(target.matches('button,a')?target:null);
 },true);
 return {open,update};
}
