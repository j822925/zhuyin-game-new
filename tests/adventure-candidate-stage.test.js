import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublishFiles} from '../tools/stage-adventure-candidate.mjs';
import {CANDIDATE_BASELINE,CANDIDATE_ID,PREVIOUS_CANDIDATE_ID,candidateFiles} from '../tools/build-adventure-candidate.mjs';
const files=candidateFiles(),publishFiles=[files.bundle,files.css,files.manifest,'adventure-release-policy.js','adventure-entry.bundle.js','adventure-preview.html','assets/home-perspective/moon-12345678abcdef.webp','assets/home-rooms-v3/moon/kitchen-abcdef123456.webp'];
const manifest={id:CANDIDATE_ID,baseline:CANDIDATE_BASELINE,previousCandidate:PREVIOUS_CANDIDATE_ID,publishFiles,assetInventory:{newAssets:publishFiles.filter(file=>file.startsWith('assets/')),perspectiveReferences:['assets/home-perspective/moon-12345678abcdef.webp']}};
test('isolated release copies only candidate outputs/new art and the three selector entrance files',()=>{
 assert.deepEqual(validatePublishFiles(manifest),publishFiles);
 for(const file of ['adventure-model.js','home-spatial.css','adventure-play.bundle.js','farm-learning.bundle.js','index.html','assets/home-rooms-v2/moon-12345678.webp','../outside.txt','C:/outside.txt','assets\\home-perspective\\moon-12345678.webp'])assert.throws(()=>validatePublishFiles({...manifest,publishFiles:[...publishFiles,file]}),file);
});

test('staging does not publish rejected intermediate artwork even when it has a plausible hash filename',()=>{
 const rejected='assets/home-perspective/moon-cabinet-v4-12345678abcdef.webp';
 assert.throws(()=>validatePublishFiles({...manifest,publishFiles:[...publishFiles,rejected]}),/asset inventory/);
 assert.throws(()=>validatePublishFiles({...manifest,publishFiles:[...publishFiles,rejected],assetInventory:{...manifest.assetInventory,newAssets:[...manifest.assetInventory.newAssets,rejected]}}),/Unreferenced perspective art/);
 assert.throws(()=>validatePublishFiles({...manifest,assetInventory:null}),/Missing sealed/);
 assert.throws(()=>validatePublishFiles({...manifest,assetInventory:{...manifest.assetInventory,newAssets:[...manifest.assetInventory.newAssets,manifest.assetInventory.newAssets[0]]}}),/asset inventory/);
});
test('isolated release rejects wrong baselines, incomplete manifests and duplicate files',()=>{
 assert.throws(()=>validatePublishFiles({...manifest,baseline:'other'}));
 assert.throws(()=>validatePublishFiles({...manifest,previousCandidate:'other'}));
 for(const file of Object.values(candidateFiles(PREVIOUS_CANDIDATE_ID)).filter(value=>value.endsWith('.js')||value.endsWith('.css')||value.endsWith('.json')))assert.throws(()=>validatePublishFiles({...manifest,publishFiles:[...publishFiles,file]}),'never rewrite the previous candidate '+file);
 assert.throws(()=>validatePublishFiles({...manifest,publishFiles:publishFiles.slice(1)}));
 assert.throws(()=>validatePublishFiles({...manifest,publishFiles:[...publishFiles,publishFiles[0]]}));
});
