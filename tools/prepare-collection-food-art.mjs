import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/j8229/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const sharp=require('sharp'),root=fileURLToPath(new URL('..',import.meta.url));
const sourceRoot='C:/Users/j8229/.codex/generated_images/01a1632c-5b4d-7d61-942d-1bff9384d241';
const grid=(xs,ys)=>ys.slice(0,-1).flatMap((top,row)=>xs[row].slice(0,-1).map((left,col)=>[left,top,xs[row][col+1],ys[row+1]]));
const entries=[
 {key:'collectionCrops',file:'exec-2ad3b165-46c9-4762-ac20-1de24e76406e.png',regions:grid([[0,.25,.5,.75,1],[0,.25,.5,.75,1],[0,.25,.5,.76,1]],[0,.333,.648,1]).map((r,i)=>i===7?[r[0],r[1],r[2],.645]:i===11?[r[0],.645,r[2],r[3]]:r)},
 {key:'collectionFish',file:'exec-f3303e01-64dc-48e3-a091-ceebda40ef9a.png',regions:grid([[0,.251,.5,.765,1],[0,.25,.5,.76,1],[0,.25,.5,.76,1]],[0,.345,.635,1])},
 {key:'collectionMeals',file:'exec-5f616e56-1436-47ee-86cc-15ddd235385b.png',regions:grid(Array(3).fill([0,.25,.5,.75,1]),[0,1/3,.64,1])},
 {key:'collectionHomeMeals',file:'exec-e5433fa3-7487-4596-b63d-c672f2d4eb61.png',regions:grid([[0,.347,.665,1],[0,.347,.677,1]],[0,.485,1])},
];
const report={};
for(const entry of entries){
 const source=path.join(sourceRoot,entry.file),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=info,cells=entry.regions.map(([l,t,r,b],index)=>{
  const x0=Math.round(l*width),y0=Math.round(t*height),x1=Math.round(r*width),y1=Math.round(b*height);
  let minX=x1,minY=y1,maxX=-1,maxY=-1,opaque=0,edgePixels=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const alpha=data[(y*width+x)*4+3];if(alpha>32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);opaque++;if(x===x0||x===x1-1||y===y0||y===y1-1)edgePixels++;}}
  if(opaque<500)throw Error(entry.key+' missing art '+index);
  const x=Math.max(x0,minX-2),y=Math.max(y0,minY-2);return{x,y,w:Math.min(x1,maxX+3)-x,h:Math.min(y1,maxY+3)-y,edgePixels};
 });
 const buffer=await sharp(source).webp({quality:82,alphaQuality:100,effort:6}).toBuffer(),hash=crypto.createHash('sha256').update(buffer).digest('hex').slice(0,12),src='assets/home-collection/'+entry.key+'-'+hash+'.webp';
 await fs.mkdir(path.join(root,'assets/home-collection'),{recursive:true});await fs.writeFile(path.join(root,src),buffer);
 report[entry.key]={src,width,height,bytes:buffer.length,source,cells};
}
await fs.mkdir(path.join(root,'docs/home-collection'),{recursive:true});
await fs.writeFile(path.join(root,'docs/home-collection/food-art-report.json'),JSON.stringify(report,null,2));
const art=Object.fromEntries(Object.entries(report).map(([key,{src,cells}])=>[key,{src,cells:cells.map(({edgePixels,...cell})=>cell)}]));
await fs.writeFile(path.join(root,'data/collection-food-art.js'),'// Original illustrations made with built-in image_gen; loaded on demand.\nexport const COLLECTION_FOOD_ART='+JSON.stringify(art)+';\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([key,v])=>[key,{bytes:v.bytes,edge:v.cells.map(c=>c.edgePixels)}]))));
