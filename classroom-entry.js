import {classUrl} from './class-context.js?v=20260928-all1';
const home=document.getElementById('home');
if(home&&!document.getElementById('classroom-home-entry')){
 const panel=document.createElement('nav');panel.id='classroom-home-entry';panel.className='special-destinations';panel.setAttribute('aria-label','加入全班問答');
 const link=document.createElement('a');link.href=classUrl('classroom.html');link.className='destination-card destination-exam';link.style.gridColumn='1 / -1';
 link.innerHTML='<img class="destination-icon" src="assets/icons/classroom-quiz.svg" width="112" height="112" alt=""><span class="destination-copy"><strong class="destination-title">加入全班問答</strong><span class="destination-detail">🌟 和老師、同學一起答題！</span></span><span class="destination-arrow" aria-hidden="true">➜</span>';
 panel.append(link);home.prepend(panel);
}
