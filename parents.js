import {BASE,COMPOUNDS,createCatalog} from './core.js?v=20260913-heroes1';
import {setupTeacherAudio} from './teacher-audio.js?v=20260920-le4';
// Listening only: no authentication, score submission or teacher controls on this page.
await setupTeacherAudio({BASE,COMPOUNDS,createCatalog});
