import {readingLaunchEnvironment,readingLaunchPlan,mountReadingLaunch} from './reading-launch.js?v=20260928-home-reading1';
const plan=readingLaunchPlan(location.href,readingLaunchEnvironment());
if(plan.standalone){
 mountReadingLaunch(plan);
 // No microphone, recognition, login or encounter starts in the unavailable
 // Home Screen context. Safari runs the already validated mic4 game normally.
 await import('./class-context.js?v=20260928-all1');
}else await import('./reading.js?v=20260928-mic4');
