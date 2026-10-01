import {classUrl} from './class-context.js?v=20260926-classes1';
import {readingLaunchEnvironment,readingLaunchPlan} from './reading-launch.js?v=20260928-home-reading1';
export function nativeReadingLink(){
 const plan=readingLaunchPlan(location.href,readingLaunchEnvironment()),url=new URL(plan.browserUrl);url.searchParams.set('speech','native');url.searchParams.set('v','20261001-retry1');
 return {browserUrl:url.href,url:plan.safariUrl?url.href.replace(/^https:/,'x-safari-https:'):url.href,standalone:plan.standalone};
}
export function showNativeFallback(container){
 if(container.querySelector('[data-native-fallback]'))return;
 const choice=nativeReadingLink(),box=document.createElement('div');box.dataset.nativeFallback='1';box.className='note';
 const note=document.createElement('p');note.textContent='也可以改用原本的 Safari 朗讀辨識。這回合若尚未完成，切換後需要重新登入並開始五題；未完成的回合不計分。';
 const link=document.createElement('a');link.className='secondary';link.href=choice.url;link.textContent=choice.standalone?'用 Safari 繼續朗讀 ↗':'改用瀏覽器原有辨識 →';
 box.append(note,link);
 if(choice.standalone){const details=document.createElement('details'),summary=document.createElement('summary'),p=document.createElement('p'),input=document.createElement('input');summary.textContent='Safari 沒有開啟時';p.textContent='請大人複製下方網址，貼到 Safari 開啟。';input.value=choice.browserUrl;input.readOnly=true;input.style='width:100%;font:inherit';details.append(summary,p,input);box.append(details);}
 container.append(box);
}
