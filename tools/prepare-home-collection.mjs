import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const sharp=createRequire('C:/Users/j8229/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json')('sharp');
const root=fileURLToPath(new URL('..',import.meta.url));
const output='C:/ChatGPT工作區/國小低年級注音教學/output/home-collection-20261022';
const parentImages='C:/Users/j8229/.codex/generated_images/01a10590-eb2f-7a23-8b3f-745433396ed3';
const ownImages='C:/Users/j8229/.codex/generated_images/01a1632b-0222-7620-a3cb-6b9d328b3d1a';
const sources={
 daisy:path.join(output,'daisy-furniture-source.png'),
 fox:path.join(ownImages,'exec-344f537b-d813-489e-864b-4bc645dd63b2.png'),
 moon:path.join(output,'moon-furniture-source.png'),
 honey:path.join(parentImages,'exec-be4321ed-2de4-4046-9441-17bcdb4a07f6.png'),
 ocean:path.join(ownImages,'exec-03eabcb2-c399-47b2-9a3c-91fe237bc99c.png'),
 berry:path.join(parentImages,'exec-42b4c493-bc6b-47a6-ab31-6b8b44f2672e.png')
};
// Read the existing alpha to measure each complete isolated sprite. This only
// builds crop metadata; generated pixels are preserved in the whole atlas.
function cellsFromAlpha(data,width,height,channels){
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height),components=[];
 for(let start=0;start<seen.length;start++){
  if(seen[start]||data[start*channels+3]<32)continue;
  let head=0,tail=1,minX=width,minY=height,maxX=0,maxY=0;queue[0]=start;seen[start]=1;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
   for(const next of [x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1])if(next>=0&&!seen[next]&&data[next*channels+3]>=32){seen[next]=1;queue[tail++]=next;}
  }
  if(tail>500)components.push({x:Math.max(0,minX-2),y:Math.max(0,minY-2),w:Math.min(width,maxX+3)-Math.max(0,minX-2),h:Math.min(height,maxY+3)-Math.max(0,minY-2),pixels:tail});
 }
 if(components.length!==12)throw new Error('Expected twelve separated sprites, got '+components.length);
 const rows=[0,1,2].map(row=>components.filter(c=>Math.floor((c.y+c.h/2)/height*3)===row).sort((a,b)=>a.x-b.x));
 if(rows.some(row=>row.length!==4))throw new Error('Sprite order must remain 4 × 3');
 return rows.flat().map(({pixels,...cell})=>cell);
}
const results={};
await fs.mkdir(path.join(root,'assets/home-collection'),{recursive:true});
await fs.mkdir(path.join(root,'docs/home-collection'),{recursive:true});
for(const [style,source] of Object.entries(sources)){
 const key='collection'+style[0].toUpperCase()+style.slice(1);
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height,channels}=info;
 const alphaCount=data.filter((v,i)=>i%channels===3&&v===0).length;
 if(alphaCount<width*height*.25)throw new Error(style+' does not have a transparent background');
 const cells=cellsFromAlpha(data,width,height,channels);
 const buffer=await sharp(source).webp({quality:82,alphaQuality:100,effort:6}).toBuffer();
 const hash=crypto.createHash('sha256').update(buffer).digest('hex').slice(0,12),src='assets/home-collection/'+key+'-'+hash+'.webp';
 await fs.writeFile(path.join(root,src),buffer);
 const copy=path.join(output,style+'-furniture-final.png');await fs.copyFile(source,copy);
 results[key]={src,width,height,bytes:buffer.length,cells};
 await sharp(source).flatten({background:'#fff9e8'}).jpeg({quality:85}).toFile(path.join(output,style+'-furniture-proof.jpg'));
}
await fs.writeFile(path.join(root,'data/home-collection-art.js'),'// Whole transparent atlases are encoded once and loaded only when needed.\nexport const HOME_COLLECTION_ART='+JSON.stringify(results,null,2)+';\n');
await fs.writeFile(path.join(root,'docs/home-collection/family-atlas-report.json'),JSON.stringify({tool:'built-in image_gen',sources,measurement:'12 alpha-connected sprites, threshold 32; 2px padding; whole atlas encoded unchanged',atlases:results},null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{bytes:v.bytes,cells:v.cells.length}]))));
