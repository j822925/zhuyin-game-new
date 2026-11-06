import sharp from 'file:///C:/Users/j8229/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {STAMPS} from '../annual-challenge-stamps.js';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'../../output/annual-challenge-20261106'),assets=resolve(root,'assets/annual-challenge-20261103');
const input=JSON.parse(await readFile(resolve(out,'stamp-generation.json'),'utf8'));
await mkdir(resolve(out,'stamps'),{recursive:true});const report=[];
for(const row of input.results){
 if(!row.source||!row.id||row.error)throw Error('Missing generated stamp '+row.id);
 const info=await sharp(row.source).metadata();if(!info.hasAlpha)throw Error('Stamp must preserve transparency '+row.id);
 await copyFile(row.source,resolve(out,'stamps',row.id+'.png'));
 const saved=await sharp(row.source).resize(384,384,{fit:'inside'}).webp({quality:85,alphaQuality:100}).toFile(resolve(assets,row.id+'.webp'));
 report.push({id:row.id,width:info.width,height:info.height,hasAlpha:true,webBytes:saved.size});
}
await writeFile(resolve(out,'stamps/manifest.json'),JSON.stringify(report,null,2));
const tiles=[],names=['聽音辨識','先聲奪人','東拼西湊','照做不誤','書聲琅琅'];
for(let i=0;i<STAMPS.length;i++){
 const input=await sharp(resolve(assets,STAMPS[i].id+'.webp')).resize(180,180,{fit:'contain'}).png().toBuffer();
 tiles.push({input,left:20+(i%5)*200,top:60+Math.floor(i/5)*232});
}
for(let i=0;i<5;i++){const svg=Buffer.from('<svg width="1000" height="48"><text x="500" y="33" text-anchor="middle" font-family="Microsoft JhengHei,sans-serif" font-size="26" font-weight="bold" fill="#365b45">'+names[i]+' · 專屬五枚</text></svg>');tiles.push({input:svg,left:0,top:4+i*232});}
await sharp({create:{width:1020,height:1175,channels:4,background:'#fffaf0'}}).composite(tiles).png().toFile(resolve(out,'25枚專屬印章.png'));
console.log(JSON.stringify({newStamps:report.length,webBytes:report.reduce((n,r)=>n+r.webBytes,0),allStamps:STAMPS.length}));
