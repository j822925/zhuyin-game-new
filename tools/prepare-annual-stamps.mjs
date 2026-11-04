import sharp from 'file:///C:/Users/j8229/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base='C:/Users/j8229/.codex/generated_images/01a1a133-bb49-7342-ac25-789c1e7473ec';
const files={'listen-owl':'exec-7271da45-bbd2-4fc3-8369-f47492e9c3d4.png','tone-rabbit':'exec-fb925f3c-4eaf-4417-a24c-796307bcec57.png','spell-fox':'exec-496b42d6-532f-4730-a395-8838a756df6f.png','action-monkey':'exec-3afcd194-cadf-44dc-a68d-1ae04b251ac9.png','read-cat':'exec-253e2b91-1b6b-4c8f-8e9c-25a725b8060c.png'};
const root=resolve(import.meta.dirname,'..'),assets=resolve(root,'assets/annual-challenge-20261103'),output=resolve(root,'../../output/annual-challenge-20261103/stamps');
await mkdir(assets,{recursive:true});await mkdir(output,{recursive:true});const manifest=[];
for(const [id,file]of Object.entries(files)){const source=resolve(base,file);await copyFile(source,resolve(output,id+'.png'));const metadata=await sharp(source).metadata();const info=await sharp(source).resize(384,384,{fit:'inside'}).webp({quality:85,alphaQuality:100}).toFile(resolve(assets,id+'.webp'));manifest.push({id,source:file,sourceWidth:metadata.width,sourceHeight:metadata.height,alpha:metadata.hasAlpha,webBytes:info.size});}
await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));
