import {readingLaunchEnvironment} from './reading-launch.js?v=20261023-life1';
export function readingExamLaunchPlan(href,id,env=readingLaunchEnvironment()){
 if(typeof id!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(id))return null;
 const from=new URL(href),url=new URL('exam.html',from),classId=from.searchParams.get('class');
 url.searchParams.set('v','20261023-readingexam1');url.searchParams.set('id',id);if(['main','grade2'].includes(classId))url.searchParams.set('class',classId);
 const apple=/iPad|iPhone|iPod/.test(env.userAgent||'')||(env.platform==='MacIntel'&&env.maxTouchPoints>1),standalone=apple&&!!(env.standalone||env.displayStandalone);
 const major=Number((env.userAgent||'').match(/(?:CPU(?: iPhone)? OS|iPhone OS) (\d+)/)?.[1]||(env.userAgent||'').match(/Version\/(\d+)/)?.[1]||0);
 return {standalone,browserUrl:url.href,safariUrl:standalone&&major>=17&&url.protocol==='https:'?url.href.replace(/^https:/,'x-safari-https:'):null};
}
export function offerReadingExamHandoff({id,href=location.href,env,root=document.querySelector('main')}){
 const plan=readingExamLaunchPlan(href,id,env);if(!plan?.standalone)return false;
 root.querySelector('#reading-exam-handoff')?.remove();const panel=document.createElement('section');panel.id='reading-exam-handoff';
 panel.innerHTML='<h2>🎙️ 朗讀小考</h2><p>到 Safari 接著考，不會換題。</p><a class="reading-exam-primary" id="reading-exam-open">🎙️ 到 Safari 開始</a><details><summary>⚙️ 給大人</summary><p>若沒有開啟 Safari，複製下面網址到 Safari。選原班級與學號登入即可接續；不要按一般朗讀練習。</p><input readonly aria-label="朗讀小考網址"><button type="button">複製小考網址</button><p role="status"></p></details>';
 const link=panel.querySelector('a');link.href=plan.safariUrl||plan.browserUrl;if(!plan.safariUrl){link.target='_blank';link.rel='noopener';}
 panel.querySelector('input').value=plan.browserUrl;panel.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText(plan.browserUrl);panel.querySelector('[role=status]').textContent='已複製';}catch{panel.querySelector('input').select();panel.querySelector('[role=status]').textContent='請長按網址複製';}};
 root.prepend(panel);panel.scrollIntoView({block:'start'});return true;
}
