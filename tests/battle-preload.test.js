import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BATTLE_PRELOAD} from '../data/battle-preload.js';
import {battleAssetPath} from '../data/battle-asset-url.js';
import {battleCharacter} from '../data/battle-catalog.js';
import {PROFILE_CHARACTERS} from '../student-profile.js';
import {PACKED_BATTLES,PACKED_BATTLE_VERSION} from '../data/packed-battle-frames.js';
import {optimizedImage} from '../data/portrait-thumbnails.js';

test('preparation covers all encounters and selectable heroes with the runtime cache key',()=>{
 const unique=new Set(BATTLE_PRELOAD);assert.equal(unique.size,BATTLE_PRELOAD.length);
 assert.equal(PROFILE_CHARACTERS.length,84);
 for(const c of PROFILE_CHARACTERS){
  const id=battleCharacter(c.id);
  assert(unique.has(battleAssetPath(id)),c.id+' battle');
  assert(unique.has(optimizedImage(c.image)),c.id+' portrait');
  const url=new URL(battleAssetPath(id),'https://test.invalid/game/');
  assert.equal(url.searchParams.get('v'),PACKED_BATTLE_VERSION);
  assert.equal(url.pathname,'/game/'+PACKED_BATTLES[id].atlas);
 }
 for(const path of unique){
  assert(/^assets\//.test(path));
  assert(fs.existsSync(new URL('../'+path.split('?')[0],import.meta.url)),path);
 }
 assert.equal(battleAssetPath('unreleased-id'),null);
 assert.equal(BATTLE_PRELOAD.filter(p=>p.includes('battle-ipad-v1/')).length,new Set(PROFILE_CHARACTERS.map(c=>battleCharacter(c.id))).size);
});
