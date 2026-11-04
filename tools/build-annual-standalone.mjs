import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Script} from 'node:vm';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'../../output/annual-challenge-20261103');
// Only the five controlled project modules below are bundled. Reject any other import.
const names=new Map([['./annual-challenge-bank.js','bank'],['./annual-challenge-core.js','core'],['./annual-challenge-service.js','service'],['./annual-challenge-browser-preview.js','preview']]);
async function bundle(file,name){
 let source=await readFile(resolve(root,file),'utf8');
 source=source.replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?\r?$/gm,(_,bindings,path)=>{if(!names.has(path))throw Error('Unsupported import '+path);return 'const {'+bindings+'}=__annual.'+names.get(path)+';';});
 const exports=[...source.matchAll(/^export (?:const|function|async function) (\w+)/gm)].map(m=>m[1]);source=source.replace(/^export /gm,'');
 if(/^\s*(?:import|export)\s/m.test(source))throw Error('Unbundled module syntax in '+file);
 return '__annual.'+name+'=(()=>{\n'+source+'\nreturn {'+exports.join(',')+'};\n})();\n';
}
const assets={};for(const id of ['listen-owl','tone-rabbit','spell-fox','action-monkey','read-cat'])assets[id]='data:image/webp;base64,'+(await readFile(resolve(root,'assets/annual-challenge-20261103/'+id+'.webp'))).toString('base64');
const bank=JSON.parse(await readFile(resolve(root,'tone-questions.json'),'utf8'));
for(const q of bank.questions)q.audioUrl='../../.local/annual-challenge-20261103/'+q.audioUrl;
let script='(()=>{\nconst __annual={};\n';
for(const [file,name]of [['annual-challenge-bank.js','bank'],['annual-challenge-core.js','core'],['annual-challenge-service.js','service'],['annual-challenge-browser-preview.js','preview']])script+=await bundle(file,name);
script+='let channel=null;try{channel=new BroadcastChannel("annual-local-review-v1");}catch{}\n';
script+='let storage=null,tabStorage=null;try{storage=localStorage;}catch{}try{tabStorage=sessionStorage;}catch{}\n';
script+='globalThis.__ANNUAL_LOCAL_PREVIEW__=__annual.preview.createBrowserPreview({bank:'+JSON.stringify(bank)+',assets:'+JSON.stringify(assets)+',storage,tabStorage,channel,lock:navigator.locks?fn=>navigator.locks.request("annual-local-review-v1",fn):null});\n';
script+=await bundle('annual-challenge.js','app');script+='})();';
new Script(script,{filename:'annual-standalone.js'});
const bootstrap=await readFile(resolve(root,'annual-challenge-bootstrap.js'),'utf8'),css=await readFile(resolve(root,'annual-challenge.css'),'utf8');
let html=await readFile(resolve(root,'annual-challenge.html'),'utf8');
html=html.replace('<html lang="zh-Hant">','<html lang="zh-Hant" data-annual-standalone="1">').replace('<link rel="stylesheet" href="annual-challenge.css">',()=>'<style>'+css+'</style>');
html=html.replace(/<script[^>]*src="annual-challenge-bootstrap\.js[^"\s]*"[^>]*><\/script>/,()=>'<script>'+bootstrap.replace(/<\/script/gi,'<\\/script')+'</script>\n<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace('本機試玩 · 全部使用虛構帳號 · 尚未接上正式登入與雲端成績','單檔試玩 · 虛構帳號 · 進度只存此瀏覽器，未連接正式學生資料');
html=html.replace('href="annual-challenge.html"','href="#"');
await mkdir(out,{recursive:true});const output=resolve(out,'注音闖關單檔試玩.html');await writeFile(output,html);
await writeFile(resolve(out,'standalone-build.json'),JSON.stringify({output,bytes:Buffer.byteLength(html),inlineScripts:2,externalScripts:0,inlineImages:5,generatedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({output,bytes:Buffer.byteLength(html)}));
