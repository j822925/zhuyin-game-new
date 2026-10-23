import {readingLaunchEnvironment} from './reading-launch.js?v=20261023-life1';
export function readingNotebookLaunchPlan(href,env=readingLaunchEnvironment()){
 const from=new URL(href),url=new URL('reading-notebook.html',from),id=from.searchParams.get('class');url.searchParams.set('v','20261023-notebook1');url.searchParams.set('class',id==='grade2'?'grade2':'main');
 const apple=/iPad|iPhone|iPod/.test(env.userAgent||'')||(env.platform==='MacIntel'&&env.maxTouchPoints>1),standalone=apple&&!!(env.standalone||env.displayStandalone),major=Number((env.userAgent||'').match(/(?:CPU(?: iPhone)? OS|iPhone OS) (\d+)/)?.[1]||(env.userAgent||'').match(/Version\/(\d+)/)?.[1]||0);
 return {standalone,browserUrl:url.href,safariUrl:standalone&&major>=17&&url.protocol==='https:'?url.href.replace(/^https:/,'x-safari-https:'):null};
}
