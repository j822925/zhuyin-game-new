// Run before game modules, storage, or API requests. Class never follows the
// last visitor on a shared device: it belongs to the launch URL itself.
(()=>{
 const url=new URL(location.href),file=url.pathname.split('/').pop();
 const selected=url.searchParams.get('class');
 const move=(file)=>{const target=new URL(file,url);target.search=url.search;target.hash=url.hash;location.replace(target.href);};
 if(file==='grade2.html'){
  if(selected&&selected!=='grade2'){move('./');return;}
  if(!selected){url.searchParams.set('class','grade2');history.replaceState(null,'',url.href);}
  return;
 }
 if(file&&file!=='index.html')return;
 if(selected==='grade2'){move('grade2.html');return;}
 const standalone=navigator.standalone===true||globalThis.matchMedia?.('(display-mode: standalone)').matches;
 if(!selected&&!url.searchParams.has('demo')&&(standalone||url.searchParams.get('source')==='homescreen'))move('choose-class.html');
})();
