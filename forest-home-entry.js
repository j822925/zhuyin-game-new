import {classUrl} from './class-context.js';
// The homepage's existing login guide also guards this entry.
const home=document.querySelector('#home .worlds');
if(home&&!document.getElementById('forest-entry')){
 const a=document.createElement('a');a.id='forest-entry';a.className='world';a.href=classUrl('adventure-preview.html?v=20261011-wallet1');
 a.style.cssText='text-decoration:none;color:inherit;background:#e5edcf';
 a.innerHTML='<span class="world-art">🌳</span><h3>森林世界</h3><p>我的小屋・農場・探險地圖</p><span class="world-status">用學習得到的星星，打造自己的小屋</span>';
 home.append(a);
}
