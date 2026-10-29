// Always hand off installed iPad apps; tabs use browser-native recognition.
import {readingLaunchEnvironment,readingLaunchPlan,mountReadingLaunch} from './reading-launch.js?v=20261025-homegallery1';
const plan=readingLaunchPlan(location.href,readingLaunchEnvironment());
if(plan.standalone){
 mountReadingLaunch(plan);await import('./class-context.js?v=20261023-exam1');
}else await import('./reading.js?v=20261029-auto1');
