const host=document.querySelector('#handwriting, #writing, #board');
if(host){
  const isCopy=host.id==='writing', isLesson=host.id==='board';
  const screen=host.closest('#play, #practice, #exercise');
  const controls=screen.querySelector(isCopy?'.actions':isLesson?'#back':'.answer-actions');
  let scheduled=false;
  function fit(){
    scheduled=false;
    const pad=host.querySelector('.hanzi-handwriting');
    if(!pad||!host.getClientRects().length||!controls.getClientRects().length)return;
    const rect=pad.getBoundingClientRect(), bound=controls.getBoundingClientRect();
    const viewport=window.visualViewport;
    const height=viewport?viewport.height:document.documentElement.clientHeight;
    // In landscape the classroom controls sit beside the square, not below it.
    const bottom=isLesson&&matchMedia('(orientation:landscape)').matches?rect.bottom:Math.max(rect.bottom,bound.bottom);
    const shell=host.closest('.copy-shell, .page-shell');
    const pageEnd=shell.getBoundingClientRect().bottom;
    const available=rect.height+height-(Math.max(pageEnd,bottom)+window.scrollY)+ (viewport?.offsetTop||0)-10;
    const parent=host.parentElement;
    const style=getComputedStyle(parent);
    const width=parent.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
    const limit=Math.floor(Math.min(620,width,available));
    if(limit>0&&limit!==parseInt(screen.style.getPropertyValue('--ink-side'),10))screen.style.setProperty('--ink-side',limit+'px');
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(fit);}}
  const observer=new ResizeObserver(schedule);
  for(const el of [screen,controls,document.body,host.parentElement])observer.observe(el);
  new MutationObserver(schedule).observe(screen,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','data-mode']});
  window.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  schedule();
}
