// A read-only tool link; no account, reward or score requests are needed here.
export function helperUrl(href=globalThis.location.href){
 const source=new URL(href),target=new URL('zhuyin-helper.html',source);
 const selected=source.searchParams.get('class');
 const grade2=selected==='grade2'||(!selected&&source.pathname.endsWith('/grade2.html'));
 target.searchParams.set('v','20261022-audio1');
 target.searchParams.set('class',grade2?'grade2':'main');
 if(source.searchParams.get('demo')==='1')target.searchParams.set('demo','1');
 return target.href;
}
export function mountHelperEntry(root=document,href=globalThis.location.href){
 const home=root.getElementById('home');
 if(!home||root.getElementById('helper-home-entry'))return;
 const panel=root.createElement('nav');panel.id='helper-home-entry';panel.className='special-destinations';panel.setAttribute('aria-label','注音小幫手');
 const link=root.createElement('a');link.href=helperUrl(href);link.className='destination-card destination-exam';link.style.gridColumn='1 / -1';
 link.innerHTML='<span class="destination-icon helper-icon" aria-hidden="true">📖</span><span class="destination-copy"><strong class="destination-title">注音小幫手</strong><span class="destination-detail">說詞查注音・拼音聽讀音</span></span><span class="destination-arrow" aria-hidden="true">➜</span>';
 panel.append(link);home.prepend(panel);
}
if(typeof document!=='undefined')mountHelperEntry();
