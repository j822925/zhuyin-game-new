import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';import {createHash} from 'node:crypto';
import {MOBILE_IMAGES} from '../data/mobile-media.js';
import {PORTRAIT_THUMBNAILS,optimizedImage} from '../data/portrait-thumbnails.js';
import {PROFILE_CHARACTERS} from '../student-profile.js';
const file=p=>new URL('../'+p,import.meta.url);
test('delivery aliases all resolve to smaller files with immutable content names',()=>{
 for(const [original,delivery]of Object.entries(MOBILE_IMAGES))assert(statSync(file(delivery)).size<statSync(file(original)).size,original);
 for(const p of new Set([...Object.values(MOBILE_IMAGES),...Object.values(PORTRAIT_THUMBNAILS)])){const data=readFileSync(file(p));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.equal(p.split('/').at(-1),createHash('sha256').update(data).digest('hex').slice(0,20)+'.webp');}
});
test('every selectable character has a thumbnail instead of a full card in the picker',()=>{
 assert.equal(Object.keys(PORTRAIT_THUMBNAILS).length,PROFILE_CHARACTERS.length);
 for(const c of PROFILE_CHARACTERS){const thumbnail=PORTRAIT_THUMBNAILS[c.image];assert(thumbnail,c.id);assert(thumbnail.startsWith('assets/mobile-thumbs-v1/'));assert(statSync(file(thumbnail)).size<statSync(file(optimizedImage(c.image))).size,c.id);}
});
