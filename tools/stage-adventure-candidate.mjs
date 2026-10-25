import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {CANDIDATE_BASELINE,CANDIDATE_ID,PREVIOUS_CANDIDATE_ID,candidateFiles,digest,runCandidateCommand} from './build-adventure-candidate.mjs';

const sourceRoot=path.resolve(import.meta.dirname,'..');
export function validatePublishFiles(manifest){
 const named=candidateFiles(manifest.id),required=[named.bundle,named.css,named.manifest,'adventure-release-policy.js','adventure-entry.bundle.js','adventure-preview.html'];
 if(manifest.id!==CANDIDATE_ID||manifest.baseline!==CANDIDATE_BASELINE||manifest.previousCandidate!==PREVIOUS_CANDIDATE_ID||!Array.isArray(manifest.publishFiles))throw Error('Unexpected candidate manifest');
 const unique=[...new Set(manifest.publishFiles)];if(unique.length!==manifest.publishFiles.length)throw Error('Duplicate publish path');
 const inventory=manifest.assetInventory;
 if(!inventory||!Array.isArray(inventory.newAssets)||!Array.isArray(inventory.perspectiveReferences))throw Error('Missing sealed runtime art inventory');
 const assets=unique.filter(file=>typeof file==='string'&&file.startsWith('assets/'));
 if(new Set(inventory.newAssets).size!==inventory.newAssets.length||JSON.stringify([...assets].sort())!==JSON.stringify([...inventory.newAssets].sort()))throw Error('Publish assets differ from sealed asset inventory');
 for(const file of assets)if(file.startsWith('assets/home-perspective/')&&!inventory.perspectiveReferences.includes(file))throw Error('Unreferenced perspective art cannot be published: '+file);
 for(const file of unique){
  if(typeof file!=='string'||file.includes('..')||file.includes('\\')||path.posix.isAbsolute(file))throw Error('Unsafe publish path');
  if(!required.includes(file)&&!/^assets\/(?:home-perspective|home-rooms-v3)\/[a-zA-Z0-9_/-]+-[a-f0-9]{8,64}\.webp$/.test(file))throw Error('Not in candidate-only publish allowlist: '+file);
 }
 if(required.some(file=>!unique.includes(file)))throw Error('Incomplete candidate publish manifest');
 return unique;
}
const git=(dir,...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
export async function stageCandidate(target,mode='plan'){
 if(!['plan','copy'].includes(mode)||!target)throw Error('Use stage-adventure-candidate.mjs plan|copy ABSOLUTE_RELEASE_WORKTREE');
 if(!path.isAbsolute(target))throw Error('Release worktree must be an absolute path');
 const destination=fs.realpathSync(target),source=fs.realpathSync(sourceRoot);
 if(destination.toLowerCase()===source.toLowerCase())throw Error('Use a separate clean release worktree');
 if(fs.realpathSync(git(destination,'rev-parse','--show-toplevel')).toLowerCase()!==destination.toLowerCase())throw Error('Target is not a worktree root');
 if(git(destination,'remote','get-url','origin')!=='https://github.com/j822925/zhuyin-game-new.git')throw Error('Wrong release repository');
 if(git(destination,'rev-parse','HEAD')!==CANDIDATE_BASELINE)throw Error('Release baseline has advanced; reconcile before staging');
 if(git(destination,'status','--porcelain'))throw Error('Release worktree must be clean before staging');
 await runCandidateCommand('verify');
 const files=candidateFiles(),manifest=JSON.parse(fs.readFileSync(path.join(source,files.manifest),'utf8')),paths=validatePublishFiles(manifest);
 const expectedPolicy='candidate:Object.freeze('+JSON.stringify({id:manifest.id,bundle:manifest.bundle,styles:manifest.styles})+')';
 const policy=fs.readFileSync(path.join(source,'adventure-release-policy.js'),'utf8');if(!policy.includes(expectedPolicy))throw Error('Candidate has not been activated');
 const html=fs.readFileSync(path.join(source,'adventure-preview.html'),'utf8');if(!html.includes('adventure-entry.bundle.js?v='+manifest.entryCacheVersion))throw Error('Entry HTML has not been activated');
 const entry=fs.readFileSync(path.join(source,'adventure-entry.bundle.js'),'utf8');if(!entry.includes(files.bundle)||!entry.includes('adventure-play.bundle.js?v=20261025-homefix2'))throw Error('Entry bundle does not preserve stable fallback');
 const plan=paths.map(file=>{const from=path.join(source,file),to=path.join(destination,file);if(!fs.statSync(from).isFile())throw Error('Not a regular source file: '+file);return {file,sha256:digest(fs.readFileSync(from)),bytes:fs.statSync(from).size,from,to};});
 if(mode==='copy'){
  for(const item of plan){fs.mkdirSync(path.dirname(item.to),{recursive:true});fs.copyFileSync(item.from,item.to);if(digest(fs.readFileSync(item.to))!==item.sha256)throw Error('Copied file verification failed: '+item.file);}
  const changed=git(destination,'diff','--name-only',CANDIDATE_BASELINE).split(/\r?\n/).filter(Boolean),newFiles=git(destination,'ls-files','--others','--exclude-standard').split(/\r?\n/).filter(Boolean);
  if([...changed,...newFiles].some(file=>!paths.includes(file)))throw Error('Unexpected file in release worktree after staging');
  const overwritten=changed.filter(file=>!['adventure-release-policy.js','adventure-entry.bundle.js','adventure-preview.html'].includes(file));if(overwritten.length)throw Error('Stable shared files would be overwritten: '+overwritten.join(', '));
 }
 return {mode,source,destination,baseline:CANDIDATE_BASELINE,candidateId:manifest.id,copied:mode==='copy',files:plan.map(({file,sha256,bytes})=>({file,sha256,bytes})),note:'No commit, push or deployment was performed.'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)console.log(JSON.stringify(await stageCandidate(process.argv[3],process.argv[2]||'plan'),null,2));
