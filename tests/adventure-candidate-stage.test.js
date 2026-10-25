import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublishFiles} from '../tools/stage-adventure-candidate.mjs';
import {CANDIDATE_BASELINE,CANDIDATE_ID,candidateFiles} from '../tools/build-adventure-candidate.mjs';
const files=candidateFiles(),publishFiles=[files.bundle,files.css,files.manifest,'adventure-release-policy.js','adventure-entry.bundle.js','adventure-preview.html','assets/home-perspective/moon-12345678abcdef.webp','assets/home-rooms-v3/moon/kitchen-abcdef123456.webp'];
const manifest={id:CANDIDATE_ID,baseline:CANDIDATE_BASELINE,publishFiles};
test('isolated release copies only candidate outputs/new art and the three selector entrance files',()=>{
 assert.deepEqual(validatePublishFiles(manifest),publishFiles);
 for(const file of ['adventure-model.js','home-spatial.css','adventure-play.bundle.js','farm-learning.bundle.js','index.html','assets/home-rooms-v2/moon-12345678.webp','../outside.txt','C:/outside.txt','assets\\home-perspective\\moon-12345678.webp'])assert.throws(()=>validatePublishFiles({...manifest,publishFiles:[...publishFiles,file]}),file);
});
test('isolated release rejects wrong baselines, incomplete manifests and duplicate files',()=>{
 assert.throws(()=>validatePublishFiles({...manifest,baseline:'other'}));
 assert.throws(()=>validatePublishFiles({...manifest,publishFiles:publishFiles.slice(1)}));
 assert.throws(()=>validatePublishFiles({...manifest,publishFiles:[...publishFiles,publishFiles[0]]}));
});
