import './asset-cache.js?v=20260928-all1';
import {BASE,COMPOUNDS,createCatalog} from './core.js?v=20261009-accounts1';
import {setupTeacherAudio} from './teacher-audio.js?v=20261009-accounts1';
// Listening only: no authentication, score submission or teacher controls on this page.
await setupTeacherAudio({BASE,COMPOUNDS,createCatalog});
