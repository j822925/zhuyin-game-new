import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const args=process.argv.slice(2),input=args[0],output=args[1],dependencyRoot=args[2];
if(!input||!output||!dependencyRoot)throw new Error('Usage: node tools/prepare-collection-regional.mjs inputs.json output-dir absolute-node_modules-dir');
const require=createRequire(path.join(dependencyRoot,'package.json')),sharp=require('sharp');
const sourceRows=JSON.parse(await fs.readFile(input,'utf8'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(path.join(root,'assets/home-collection'),{recursive:true});
const normalized=(rows,w=1448,h=1086)=>rows.map(([l,t,r,b])=>[l/w,t/h,r/w,b/h]);
// Measured object boundaries are deliberately not forced into equal quarters.
const regions={
 bud:normalized([[0,0,390,395],[390,0,750,395],[750,0,1085,395],[1085,0,1448,465],[0,395,390,750],[390,395,715,745],[715,395,1085,745],[1085,465,1448,745],[0,750,405,1086],[405,745,730,1086],[730,745,1085,1086],[1085,745,1448,1086]]),
 stone:normalized([[0,0,370,365],[370,0,782,365],[782,0,1140,360],[1140,0,1448,365],[0,365,390,715],[390,365,737,730],[737,360,1090,735],[1090,365,1448,735],[0,715,350,1086],[350,730,735,1086],[735,735,1075,1086],[1075,735,1448,1086]]),
 sail:normalized([[0,0,360,435],[360,0,725,435],[725,0,1100,435],[1100,0,1448,435],[0,435,340,735],[340,435,720,735],[720,435,1140,735],[1140,435,1448,735],[0,735,360,1086],[360,735,725,1086],[725,735,1125,1086],[1125,735,1448,1086]]),
 shell:normalized([[0,0,400,390],[400,0,780,390],[780,0,1150,390],[1150,0,1448,390],[0,390,400,725],[400,390,780,725],[780,390,1150,725],[1150,390,1448,725],[0,725,400,1086],[400,725,780,1086],[780,725,1150,1086],[1150,725,1448,1086]]),
 whale:normalized([[0,0,365,395],[365,0,715,395],[715,0,1105,395],[1105,0,1448,395],[0,395,365,740],[365,395,715,740],[715,395,1105,740],[1105,395,1448,740],[0,740,365,1086],[365,740,725,1086],[725,740,1090,1086],[1090,740,1448,1086]]),
 bridge:normalized([[0,0,380,375],[380,0,725,370],[725,0,1090,395],[1090,0,1448,395],[0,375,380,725],[380,370,725,740],[725,395,1090,735],[1090,395,1448,735],[0,725,352,1086],[352,740,745,1086],[745,735,1090,1086],[1090,735,1448,1086]]),
 deep:normalized([[0,0,390,375],[390,0,745,375],[745,0,1107,375],[1107,0,1448,375],[0,375,390,725],[390,375,745,725],[745,375,1107,725],[1107,375,1448,725],[0,725,390,1086],[390,725,745,1086],[745,725,1107,1086],[1107,725,1448,1086]]),
 watch:normalized([[0,0,440,305],[440,0,755,340],[755,0,1310,340],[1310,0,1536,340],[0,305,345,690],[380,340,690,680],[700,340,1100,680],[1130,340,1536,680],[0,700,335,1024],[335,680,565,1024],[580,700,1025,1024],[1030,700,1536,1024]],1536,1024)
};
const report={},prompts=[];
for(const row of sourceRows){
 if(row.zone==='watch'&&!row.fixed)continue;
 const source=path.join(output,row.zone+'-goods-source.png');await fs.copyFile(row.source,source);
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});const {width,height,channels}=info;
 let transparent=0;for(let i=3;i<data.length;i+=channels)if(data[i]===0)transparent++;
 if(transparent/(width*height)<.08)throw new Error(row.zone+' requires genuine alpha');
 const cells=regions[row.zone].map(([l,t,r,b],index)=>{
  const x0=Math.round(l*width),y0=Math.round(t*height),x1=Math.round(r*width),y1=Math.round(b*height);let minX=x1,minY=y1,maxX=-1,maxY=-1,count=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*width+x)*channels+3]>32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
  if(count<500)throw new Error(row.zone+' missing object '+index);
  const x=Math.max(x0,minX-2),y=Math.max(y0,minY-2);return {x,y,w:Math.min(x1,maxX+3)-x,h:Math.min(y1,maxY+3)-y};
 });
 const encoded=await sharp(source).webp({quality:80,alphaQuality:100,effort:6}).toBuffer();const hash=crypto.createHash('sha256').update(encoded).digest('hex').slice(0,12),key='collection'+row.zone[0].toUpperCase()+row.zone.slice(1),src='assets/home-collection/'+key+'-'+hash+'.webp';
 await fs.writeFile(path.join(root,src),encoded);report[key]={src,width,height,bytes:encoded.length,cells};prompts.push({...row,source:path.relative(root,source),mode:'builtin image_gen',transparentPercent:Number((100*transparent/(width*height)).toFixed(2))});
}
const electric=JSON.parse(await fs.readFile(path.join(path.dirname(input),'atlas-report.json'),'utf8'));report.collectionElectric=electric.collectionElectric;
await fs.mkdir(path.join(root,'docs/home-collection'),{recursive:true});
await fs.writeFile(path.join(root,'data/collection-zone-art.js'),'// Lightweight regional atlases load only when visible.\nexport const COLLECTION_ZONE_ART='+JSON.stringify(report,null,2)+';\n');
await fs.writeFile(path.join(root,'docs/home-collection/regional-art-report.json'),JSON.stringify(report,null,2));
await fs.writeFile(path.join(root,'docs/home-collection/regional-prompts.json'),JSON.stringify(prompts,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k,v])=>[k,{bytes:v.bytes,cells:v.cells.length}]))));
