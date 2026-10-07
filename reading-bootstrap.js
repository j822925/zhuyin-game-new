// Normal cloud reading stays inside the Home Screen app. Only the explicit
// no-quota native fallback uses the older Safari handoff.
import {readingLaunchEnvironment,readingLaunchPlan,mountReadingLaunch} from './reading-launch.js?v=20261007-ipad1';
const native=new URL(location.href).searchParams.get('speech')==='native';
const plan=readingLaunchPlan(location.href,readingLaunchEnvironment());
if(native&&plan.standalone){
 const url=new URL(plan.browserUrl);url.searchParams.set('speech','native');url.searchParams.set('v','20261007-ipad1');plan.browserUrl=url.href;if(plan.safariUrl)plan.safariUrl=url.href.replace(/^https:/,'x-safari-https:');
 mountReadingLaunch(plan);await import('./class-context.js?v=20260928-all1');
}else await import('./reading.js?v=20261007-ipad1');
