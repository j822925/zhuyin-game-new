import fs from 'node:fs/promises';import {createRequire} from 'node:module';
import {SOCIAL_OUTFITS} from '../data/social-motions.js';import {SOCIAL_ACTIONS} from '../social-motion-model.js';
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require('../../cloudflare-tools/node_modules/sharp');}
const folder='output/social-motions/animated';await fs.mkdir(folder,{recursive:true});
for(const item of SOCIAL_OUTFITS)for(const [action,a]of Object.entries(SOCIAL_ACTIONS)){
 const frames=[];for(const col of a.frames)frames.push(await sharp(item.image).extract({left:col*item.cellWidth,top:a.row*item.cellHeight,width:item.cellWidth,height:item.cellHeight}).resize(192,224).ensureAlpha().raw().toBuffer());
 const delay=Array(frames.length).fill(Math.round(a.duration/frames.length));delay[delay.length-1]+=700;
 await sharp(Buffer.concat(frames),{raw:{width:192,height:224*frames.length,channels:4,pageHeight:224}}).webp({quality:82,alphaQuality:100,loop:0,delay}).toFile(folder+'/'+item.id+'-'+action+'.webp');
}
console.log('48 animated WebP previews exported (authoring only; game uses 12 shared atlases).');
