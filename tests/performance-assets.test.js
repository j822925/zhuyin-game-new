import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {OPTIMIZED_IMAGES,PORTRAIT_THUMBNAILS,optimizedImage} from '../data/portrait-thumbnails.js';
import {LOADING_CARDS,STARTUP_MEDIA} from '../data/performance-assets.js';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('optimized presentation keeps original sources and uses real WebP assets',()=>{
 assert.equal(Object.keys(OPTIMIZED_IMAGES).length,69);
 for(const [source,file] of Object.entries(OPTIMIZED_IMAGES)){assert(fs.existsSync(new URL('../'+source,import.meta.url)));const bytes=fs.readFileSync(new URL('../'+file,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 assert.equal(Object.keys(PORTRAIT_THUMBNAILS).length,48);assert.equal(optimizedImage('unknown.png'),'unknown.png');
 assert.equal(LOADING_CARDS.length,18);assert.equal(STARTUP_MEDIA.length,5);
});
test('formal auth, audio resolver and home icons are retained; preparation is optional',()=>{
 const app=read('app.js');assert(app.includes("const API='https://zhuyin-api.j822925.workers.dev/api'"));assert(!app.includes('teachertrial.pending'));assert(app.includes("zhuyin.pending.v2"));
 const index=read('index.html'),version=index.match(/name="application-version" content="([^"]+)"/)[1];assert(index.includes('href="assets/icons/apple-touch-icon-v1.png"'));assert(index.includes('game-boot.js?v='+version));
 assert(read('preparation.js').includes('先進遊戲'));assert(read('student-login-gate.js').includes("target.classList.contains('prepare-launch')"));
 // Unchanged cache modules retain their own revision across cosmetic releases.
 for(const f of ['exam.js','online.js','notebook.js','reading.js'])assert.match(read(f),/import '\.\/asset-cache\.js\?v=[a-zA-Z0-9-]+'/);
});
