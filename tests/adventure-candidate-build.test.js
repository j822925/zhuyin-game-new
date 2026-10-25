import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {candidateFiles,candidateDescriptor,transitionCandidatePolicy,candidateDecorSource,candidateAssetReferences,perspectiveArtReferences,assertCandidateArtScope,protectedStableFile,assertImmutable,digest,stableEntrySource,CANDIDATE_ID,PREVIOUS_CANDIDATE_ID} from '../tools/build-adventure-candidate.mjs';

test('candidate builder isolates only the decor stylesheet and rejects ambiguous rewriting',()=>{
 const source="new URL('./home-spatial.css?v=20261025-homefix2',import.meta.url); const other='./island-visits.css?v=20261015-facing2';";
 const next=candidateDecorSource(source);assert(next.includes('./'+candidateFiles().css));assert(next.includes('./island-visits.css?v=20261015-facing2'));assert(!next.includes('home-spatial.css'));
 assert.throws(()=>candidateDecorSource('no stylesheet'));assert.throws(()=>candidateDecorSource(source+source));
 for(const id of ['../escape','x?query','X bad'])assert.throws(()=>candidateFiles(id));
 assert.equal(candidateFiles().bundle,'adventure-candidate-'+CANDIDATE_ID+'.bundle.js');
});

test('stable guard covers playable bundles, styles, old art and shared learning entry modules',()=>{
 for(const file of ['adventure-play.bundle.js','farm-learning.bundle.js','reading-farm.bundle.js','home-spatial.css','assets/home-rooms-v2/room-old.webp','app.js','student-session.js','reading-launch.js','adventure-entry.js','adventure-release.js',candidateFiles(PREVIOUS_CANDIDATE_ID).bundle,candidateFiles(PREVIOUS_CANDIDATE_ID).css,candidateFiles(PREVIOUS_CANDIDATE_ID).manifest])assert(protectedStableFile(file),file);
 for(const file of ['adventure-entry.bundle.js','adventure-preview.html','adventure-release-policy.js','home-furniture-projection.js'])assert(!protectedStableFile(file),file);
});

test('immutable candidate output cannot be reused for changed contents',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'adventure-candidate-fixture-')),file=path.join(dir,'candidate.js');
 t.after(()=>{if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(dir);});assert.doesNotThrow(()=>assertImmutable(file,'first'));
 fs.writeFileSync(file,'first');assert.doesNotThrow(()=>assertImmutable(file,'first'));assert.throws(()=>assertImmutable(file,'changed'),/Immutable candidate/);
 assert.equal(fs.readFileSync(file,'utf8'),'first');assert.notEqual(digest('first'),digest('changed'));
});

test('shared entry dependencies always come from the stable baseline, with only candidate policy substituted',()=>{
 const reads=[],baseline=file=>{reads.push(file);return 'stable:'+file;};
 assert.equal(stableEntrySource('adventure-release-policy.js','candidate-policy',baseline),'candidate-policy');assert.deepEqual(reads,[]);
 for(const file of ['adventure-entry.js','adventure-student.js','adventure-model.js','data/home-furniture.js'])assert.equal(stableEntrySource(file,'candidate-policy',baseline),'stable:'+file);
 assert.deepEqual(reads,['adventure-entry.js','adventure-student.js','adventure-model.js','data/home-furniture.js']);
 for(const file of ['../other.js','/other.js','dir\\other.js'])assert.throws(()=>stableEntrySource(file,'policy',baseline));
});

test('candidate asset packaging follows legacy delivery aliases without duplicating stable media',()=>{
 const old='assets/adventure-lite/old-12345678.webp',fresh='assets/home-perspective/new-87654321.webp';
 const code='"assets/adventure-prototype/old.png","'+old+'","'+fresh+'","'+fresh+'"';
 assert.deepEqual(candidateAssetReferences(code,new Set([old]),value=>value==='assets/adventure-prototype/old.png'?old:value),[fresh]);
 assert.deepEqual(candidateAssetReferences('"assets/home-perspective/missing-12345678.webp"',new Set()),['assets/home-perspective/missing-12345678.webp']);
 const historical='assets/optimized/unused-12345678.webp';
 assert.deepEqual(candidateAssetReferences('"'+historical+'","'+fresh+'"',new Set(),value=>value,new Set([historical])),[fresh]);
 assert(protectedStableFile('data/optimized-media.js'));assert(protectedStableFile('data/adventure-media.js'));
});

test('second candidate transition requires the exact previous descriptor and preserves every audience setting',()=>{
 const policy=id=>'export const POLICY=Object.freeze({\n candidate:Object.freeze('+JSON.stringify(candidateDescriptor(id))+'),\n audience:Object.freeze(["authorized-digest"])\n});\n';
 const baseline=policy(PREVIOUS_CANDIDATE_ID),next=policy(CANDIDATE_ID);
 assert.equal(transitionCandidatePolicy(baseline,baseline),next);
 assert.equal(transitionCandidatePolicy(next,baseline),next,'same sealed version activation is idempotent');
 assert.equal(transitionCandidatePolicy(baseline.replace(/\n/g,'\r\n'),baseline),next.replace(/\n/g,'\r\n'));
 for(const current of [policy('some-other-version'),baseline.replace(/candidate:Object\.freeze\(\{[^\n]*?\}\)/,'candidate:null'),baseline.replace('authorized-digest','other-digest'),baseline+'candidate:null',baseline.replace('Object.freeze(["authorized-digest"])','[]')])assert.throws(()=>transitionCandidatePolicy(current,baseline));
 assert.throws(()=>transitionCandidatePolicy(baseline,policy('some-other-version')));
 assert.throws(()=>transitionCandidatePolicy(baseline,baseline,{...candidateDescriptor(),bundle:'./adventure-play.bundle.js'}));
});

test('candidate art uses only active runtime registry files, rejecting old trials or missing live references',()=>{
 const previous='assets/home-perspective/previous-12345678.webp',approved='assets/home-perspective/moon-cabinet-v5-abcdef123456.webp',rejected='assets/home-perspective/moon-cabinet-v4-87654321.webp';
 const refs=perspectiveArtReferences({previous:{src:previous},moon:{src:approved},same:{src:approved}}),baseline=new Set([previous]);
 assert.deepEqual(refs,[approved,previous].sort());
 const packed=candidateAssetReferences('"'+previous+'","'+approved+'"',baseline);
 assert.deepEqual(packed,[approved]);assert.doesNotThrow(()=>assertCandidateArtScope(packed,baseline,refs));
 assert.throws(()=>assertCandidateArtScope([...packed,rejected],baseline,refs),/unused or rejected/);
 assert.throws(()=>assertCandidateArtScope([],baseline,refs),/missing from candidate delta/);
 assert.throws(()=>assertCandidateArtScope([approved,previous],baseline,refs),/overwrite an existing asset/);
 for(const invalid of [null,[],{bad:{src:'../escape.webp'}},{bad:{src:'assets/home-perspective/raw.png'}},{bad:{}}])assert.throws(()=>perspectiveArtReferences(invalid));
});
