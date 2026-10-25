import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {adventureMediaUrl} from '../adventure-media.js';

export const CANDIDATE_BASELINE='7060bd793bdda43d765a648a908ef6309cddea2a';
export const CANDIDATE_ID='20261025-perspective1';
const root=path.resolve(import.meta.dirname,'..');
export const candidateFiles=(id=CANDIDATE_ID)=>{
 if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id))throw Error('Invalid immutable candidate ID');
 const prefix='adventure-candidate-'+id;
 return {id,bundle:prefix+'.bundle.js',css:prefix+'.css',manifest:'docs/'+prefix+'.json'};
};
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function candidateAssetReferences(code,baseline,resolve=adventureMediaUrl,inheritedReferences=new Set()){
 // Literal legacy aliases are map keys, not additional downloadable PNG files.
 // Follow the same delivery mapping as the game before packaging new assets.
 return [...new Set((code.match(/assets\/[a-zA-Z0-9_.\/-]+\.(?:webp|png|jpg|jpeg|svg|mp3|m4a|woff2)/g)||[]).map(resolve))].filter(file=>!baseline.has(file)&&!inheritedReferences.has(file));
}
export function protectedStableFile(file){
 return file.startsWith('assets/')||file.endsWith('.css')||(file.endsWith('.bundle.js')&&file!=='adventure-entry.bundle.js')||[
  'index.html','grade2.html','tone.html','reading.html','reading-shortcut.html','app.js','tone.js','reading.js','game-boot.js','reading-bootstrap.js','reading-entry.js','reading-launch.js','forest-home-entry.js','preparation.js','child-picture-ui.js','adventure-entry.js','adventure-release.js','adventure-student.js','student-session.js','adventure-media.js','media-url.js','data/adventure-media.js','data/optimized-media.js',
 ].includes(file);
}
export function candidateDecorSource(source,id=CANDIDATE_ID){
 const target='./'+candidateFiles(id).css;
 const pattern=/\.\/home-spatial\.css\?v=[a-z0-9-]+/g;
 if((source.match(pattern)||[]).length!==1)throw Error('Expected one decor stylesheet reference');
 return source.replace(pattern,target);
}
export function assertImmutable(target,bytes){
 if(fs.existsSync(target)&&!fs.readFileSync(target).equals(Buffer.from(bytes)))throw Error('Immutable candidate already exists with different contents: '+path.basename(target));
}
export function stableEntrySource(file,policy,readBaseline){
 if(typeof file!=='string'||file.includes('..')||file.includes('\\')||path.posix.isAbsolute(file)||!file.endsWith('.js'))throw Error('Entry dependency must belong to the stable checkout');
 return file==='adventure-release-policy.js'?policy:readBaseline(file);
}
const writeImmutable=(target,bytes)=>{assertImmutable(target,bytes);if(!fs.existsSync(target)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});}};
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const lines=value=>value.split(/\r?\n/).filter(Boolean);
const read=file=>fs.readFileSync(path.join(root,file));
function baselineFiles(){return new Set(lines(git('ls-tree','-r','--name-only',CANDIDATE_BASELINE)));}
function assertStable(){
 if(git('remote','get-url','origin')!=='https://github.com/j822925/zhuyin-game-new.git')throw Error('Wrong deployment repository');
 execFileSync('git',['merge-base','--is-ancestor',CANDIDATE_BASELINE,'HEAD'],{cwd:root});
 const baseline=baselineFiles(),changed=lines(git('diff','--name-only',CANDIDATE_BASELINE));
 const forbidden=changed.filter(file=>baseline.has(file)&&protectedStableFile(file));
 if(forbidden.length)throw Error('Stable public files changed: '+forbidden.join(', '));
 const policy=read('adventure-release-policy.js').toString('utf8');
 const stablePolicy=execFileSync('git',['show',CANDIDATE_BASELINE+':adventure-release-policy.js'],{cwd:root,encoding:'utf8'});
 const audience=value=>value.match(/audience:Object\.freeze\((\[[^\]]*\])\)/)?.[1];
 if(!audience(policy)||audience(policy)!==audience(stablePolicy))throw Error('Candidate audience must remain the existing exact authorized class/account');
 return baseline;
}
function verifyManifest(manifest){
 assertStable();
 if(manifest.id!==CANDIDATE_ID||manifest.baseline!==CANDIDATE_BASELINE)throw Error('Manifest version/baseline mismatch');
 for(const [file,sha256]of Object.entries(manifest.files))if(digest(read(file))!==sha256)throw Error('Candidate content changed: '+file);
 for(const [file,sha256]of Object.entries(manifest.inputs))if(digest(read(file))!==sha256)throw Error('Candidate source changed after build: '+file);
 return true;
}
async function buildCandidate(files){
 const baseline=assertStable();
 const {build}=createRequire(path.join(root,'package.json'))('esbuild');
 const result=await build({absWorkingDir:root,entryPoints:['adventure-preview.js'],outfile:files.bundle,bundle:true,minify:true,format:'esm',target:'safari15',write:false,metafile:true,plugins:[{
  name:'candidate-only-decor-style',setup(builder){builder.onLoad({filter:/[\\/]adventure-home-decor\.js$/},({path:file})=>({contents:candidateDecorSource(fs.readFileSync(file,'utf8'),files.id),loader:'js'}));},
 }]});
 const meta=Object.values(result.metafile.outputs)[0];
 if(meta.imports.length)throw Error('Candidate must bundle all JavaScript dependencies: '+JSON.stringify(meta.imports));
 const code=result.outputFiles[0].contents,codeText=Buffer.from(code).toString('utf8');
 if(/\.\/home-spatial\.css\?v=/.test(codeText))throw Error('Candidate still loads the mutable stable decor stylesheet');
 // The old bundles contain unused historical map entries whose originals were
 // deliberately not shipped. Only newly introduced resolved references belong
 // to this release; immutable delivery maps cannot change during this candidate.
 const baselineCode=execFileSync('git',['show',CANDIDATE_BASELINE+':adventure-play.bundle.js'],{cwd:root,encoding:'utf8'});
 const inheritedReferences=new Set(candidateAssetReferences(baselineCode,new Set()));
 const assets=candidateAssetReferences(codeText,baseline,adventureMediaUrl,inheritedReferences);
 for(const file of assets){if(!fs.existsSync(path.join(root,file)))throw Error('Missing candidate asset: '+file);if(!/-[a-f0-9]{8,64}\.[a-z0-9]+$/.test(file))throw Error('New candidate art must have a content-hashed filename: '+file);}
 // Shared CSS remains unchanged; this immutable copy isolates future candidate styling.
 const css=Buffer.from('/* Candidate '+files.id+'; loaded only after authenticated audience selection. */\n'+read('home-spatial.css').toString('utf8'));
 const outputs={[files.bundle]:code,[files.css]:css};
 for(const [file,bytes]of Object.entries(outputs))assertImmutable(path.join(root,file),bytes);
 // esbuild retains URL query suffixes in its metafile keys, while the source
 // filesystem has one physical file. Seal each physical input only once.
 const inputFiles=[...new Set([...Object.keys(result.metafile.inputs),'home-spatial.css'].map(file=>file.split(/[?#]/)[0]))];
 const inputs=Object.fromEntries(inputFiles.map(file=>[file,digest(read(file))]));
 const manifest={id:files.id,baseline:CANDIDATE_BASELINE,bundle:'./'+files.bundle,styles:['./'+files.css],inputs,files:{...Object.fromEntries(Object.entries(outputs).map(([file,bytes])=>[file,digest(bytes)])),...Object.fromEntries(assets.map(file=>[file,digest(read(file))]))},protectedStableFiles:[...baseline].filter(protectedStableFile).length,entryCacheVersion:files.id+'-entry',publishFiles:[...Object.keys(outputs),...assets,files.manifest,'adventure-release-policy.js','adventure-entry.bundle.js','adventure-preview.html']};
 const manifestBytes=JSON.stringify(manifest,null,2)+'\n';assertImmutable(path.join(root,files.manifest),manifestBytes);
 for(const [file,bytes]of Object.entries(outputs))writeImmutable(path.join(root,file),bytes);
 writeImmutable(path.join(root,files.manifest),manifestBytes);
 return manifest;
}
async function activateCandidate(files){
 const manifest=JSON.parse(read(files.manifest));verifyManifest(manifest);
 const policyFile='adventure-release-policy.js',current=read(policyFile).toString('utf8');
 const descriptor={id:manifest.id,bundle:manifest.bundle,styles:manifest.styles};
 const policy=current.includes('candidate:null')?current.replace('candidate:null','candidate:Object.freeze('+JSON.stringify(descriptor)+')'):current;
 if(!policy.includes('candidate:Object.freeze('+JSON.stringify(descriptor)+')'))throw Error('A different candidate is configured; inspect before replacing it');
 const {build}=createRequire(path.join(root,'package.json'))('esbuild');
 const result=await build({absWorkingDir:root,entryPoints:['adventure-entry.js'],outfile:'adventure-entry.bundle.js',bundle:true,minify:true,format:'esm',target:'safari15',write:false,external:['./adventure-play.bundle.js*'],plugins:[{name:'frozen-stable-entry-with-candidate-policy',setup(builder){
  builder.onLoad({filter:/\.js$/},({path:file})=>{
   const relative=path.relative(root,file).split(path.sep).join('/');
   return {contents:stableEntrySource(relative,policy,name=>execFileSync('git',['show',CANDIDATE_BASELINE+':'+name],{cwd:root,encoding:'utf8'})),loader:'js'};
  });
 }}]});
 const entry=result.outputFiles[0].contents;
 if(!Buffer.from(entry).toString('utf8').includes('adventure-play.bundle.js?v=20261025-homefix2'))throw Error('Stable fallback was changed');
 const htmlFile='adventure-preview.html',html=read(htmlFile).toString('utf8'),version=manifest.entryCacheVersion;
 const baselineHtml=execFileSync('git',['show',CANDIDATE_BASELINE+':'+htmlFile],{cwd:root,encoding:'utf8'});
 const normalize=value=>value.replace(/\r\n/g,'\n').replace(/adventure-entry\.bundle\.js\?v=[a-z0-9-]+/g,'adventure-entry.bundle.js?v=ENTRY');
 if(normalize(html)!==normalize(baselineHtml))throw Error('Candidate cannot alter the shared HTML shell');
 const nextHtml=html.replace(/adventure-entry\.bundle\.js\?v=[a-z0-9-]+/g,'adventure-entry.bundle.js?v='+version);
 fs.writeFileSync(path.join(root,policyFile),policy);fs.writeFileSync(path.join(root,'adventure-entry.bundle.js'),entry);fs.writeFileSync(path.join(root,htmlFile),nextHtml);
 assertStable();return {...manifest,activated:true};
}
export async function runCandidateCommand(command='plan'){
 const files=candidateFiles(),baseline=assertStable();
 if(command==='plan')return {...files,baseline:CANDIDATE_BASELINE,protectedStableFiles:[...baseline].filter(protectedStableFile).length,candidateEnabled:/candidate:Object\.freeze\(/.test(read('adventure-release-policy.js').toString('utf8')),commands:['build','activate','verify'],note:'This plan command performed no build, policy change, commit or deployment.'};
 if(command==='build')return buildCandidate(files);
 if(command==='activate')return activateCandidate(files);
 if(command==='verify'){const manifest=JSON.parse(read(files.manifest));verifyManifest(manifest);return {id:files.id,verified:true,publishFiles:manifest.publishFiles};}
 throw Error('Use plan, build, activate or verify; this tool never commits, pushes or deploys.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const result=await runCandidateCommand(process.argv[2]||'plan');console.log(JSON.stringify(result,null,2));
}
