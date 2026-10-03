import {bootPreparation} from './preparation.js?v=20260928-all1';
(async()=>{try{await bootPreparation();}catch{/* Do not block gameplay on storage failure. */}
await import('./app.js?v=20261003-size1');
await import('./child-navigation.js?v=20260928-all1');
await import('./reading-entry.js?v=20261003-size1');
await import('./tone-entry.js?v=20260930-v1');
await import('./teacher-hub.js?v=20260930-tone1');
})().catch(()=>{document.getElementById('app').innerHTML='<p>連線暫時不穩，請重新整理再試一次。</p><button onclick="location.reload()">重新讀取 ↻</button>';});
