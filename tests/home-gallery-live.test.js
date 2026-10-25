import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADVENTURE_RELEASE_POLICY} from '../adventure-release-policy.js';
import {startAdventureRelease} from '../adventure-release.js';

test('approved gallery release loads stable for every authenticated class and account',async()=>{
 assert.equal(ADVENTURE_RELEASE_POLICY.candidate,null);
 for(const classId of ['main','grade2'])for(const seat of ['115001','115015','115016','114001']){
  let count=0;
  assert.equal(await startAdventureRelease({student:{classId,seat},policy:ADVENTURE_RELEASE_POLICY,loadStable:()=>count++,loadCandidate:()=>assert.fail('candidate loaded')}),'stable');
  assert.equal(count,1);
 }
 const entry=readFileSync(new URL('../adventure-entry.js',import.meta.url),'utf8');
 assert(entry.includes('adventure-play.bundle.js?v=20261025-cards1'));
 const built=readFileSync(new URL('../adventure-play.bundle.js',import.meta.url),'utf8');
 assert(built.includes('home-spatial.css?v=20261025-homegallery1'));
 assert(!built.includes('adventure-candidate-20261025-perspective2.css'));
});
