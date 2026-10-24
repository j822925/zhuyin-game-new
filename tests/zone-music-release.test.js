import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MUSIC_TRACKS,ZONE_MUSIC_TRACKS} from '../adventure-music.js';
import {ADVENTURE_PRELOAD} from '../data/adventure-preload.js';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
test('all zone audio is verified, compact and included in optional pre-class preparation',()=>{
 const report=JSON.parse(read('docs/zone-music-20261023.json'));
 assert.equal(Object.keys(ZONE_MUSIC_TRACKS).length,10);
 assert.equal(report.tracks.length,10);
 for(const path of Object.values(MUSIC_TRACKS))assert(ADVENTURE_PRELOAD.includes(path),path);
 for(const path of Object.values(ZONE_MUSIC_TRACKS)){
  const file=new URL(path,root),bytes=readFileSync(file),hash=createHash('sha256').update(bytes).digest('hex');
  assert(statSync(file).size<3*1024*1024,path);
  const entry=report.tracks.find(item=>item.output.file===path);
  assert(entry,path+' is recorded');assert.equal(entry.output.sha256,hash);assert.equal(entry.output.bytes,bytes.length);
  assert(entry.output.completeDecodePassed);assert(entry.output.fastStartPassed);
  assert(Math.abs(entry.output.integratedLUFS+20)<.15);
  assert(Math.abs(entry.output.durationSeconds-entry.source.durationSeconds)<.1);
 }
});
test('shipped adventure and preparation cache chains select the new build without purging existing media',()=>{
 const version='20261023-zonemusic1';
 const refs={
  'index.html':['game-boot.js'],'grade2.html':['game-boot.js'],
  'game-boot.js':['app.js','preparation.js','forest-home-entry.js'],
  'app.js':['preparation.js'],'preparation.js':['data/adventure-preload.js'],
  'forest-home-entry.js':['adventure-preview.html'],
  'adventure-preview.html':['adventure-entry.bundle.js'],'adventure-entry.js':['adventure-play.bundle.js'],
 };
 for(const [file,targets]of Object.entries(refs))for(const target of targets){const expected=target.startsWith('adventure-')&&target.endsWith('.bundle.js')?'20261025-observer1':target==='game-boot.js'?'20261024-retire1':version;assert(read(file).includes(target+'?v='+expected),file+' -> '+target);}
 assert(read('adventure-entry.bundle.js').includes('adventure-play.bundle.js?v=20261025-observer1'));
 const bundle=read('adventure-play.bundle.js');
 assert(bundle.includes('assets/music/zone-'));
 for(const id of Object.keys(ZONE_MUSIC_TRACKS))assert(bundle.includes('"'+id+'"'),id);
 assert(read('cache-policy.js').includes("CACHE_VERSION='v2'"));
 assert(read('preparation.js').includes('13首音樂'));
});
