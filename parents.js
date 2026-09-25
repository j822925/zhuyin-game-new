import {BASE,COMPOUNDS,createCatalog} from './core.js?v=20260925-pitchhalf1';
import {setupTeacherAudio} from './teacher-audio.js?v=20260925-pitchhalf1';
// Listening only: no authentication, score submission or teacher controls on this page.
await setupTeacherAudio({BASE,COMPOUNDS,createCatalog});
