import {COPY_MODES} from './hanzi-copy-core.js?v=20261116-copy1';
import {cover,phonetic} from './hanzi-covers.js?v=20261129-words1';
export async function attachCopyEntries({host,endpoint,classId,classUrl,session,demo}){
  host.querySelector('.entry-title').replaceChildren(phonetic('國字森林'));const grid=host.querySelector('.mode-grid');
  for(const b of grid.querySelectorAll('[data-mode]'))cover(b,b.dataset.mode);
  function add(mode,file,disabled=false){
    const b=document.createElement('button');b.className='mode-card';b.disabled=disabled;cover(b,mode);
    b.onclick=()=>{const u=new URL(classUrl(file),location.href);if(mode!=='classroom')u.searchParams.set('mode',mode);
      if(demo)u.searchParams.set('demo','1');location.href=u.href;};grid.append(b);
  }
  add('learn','weekly-hanzi.html');
  add('challenge','weekly-hanzi.html');
  add('word-challenge','word-challenge.html');
  add('classroom','hanzi-classroom.html');
  let status={copyReady:true,nameReady:demo};
  if(!demo){try{const r=await fetch(new URL('/hanzi/copy/bootstrap',endpoint),{method:'POST',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify({classId})});
    if(!r.ok)throw Error();status=await r.json();
  }catch{host.querySelector('#scope-description').textContent='書寫練習暫時無法讀取，請稍後重新整理。';return;}}
  for(const mode of Object.keys(COPY_MODES)){if(mode!=='copy'&&!status.nameReady)continue;add(mode,'hanzi-copy.html',mode==='copy'&&!status.copyReady);}
  if(status.missingNameCharacters?.length){const p=document.createElement('p');p.textContent='我的姓名缺筆順：'+status.missingNameCharacters.join('、')+'。可到上課選字練讀音。';grid.after(p);}
}
