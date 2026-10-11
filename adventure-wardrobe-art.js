const files={original:'original-v1.webp',daisy:'daisy-v1.webp',fox:'fox-v1.webp',moon:'moon-v1.webp',honey:'original-v1.webp',ocean:'original-v1.webp',berry:'daisy-v1.webp'};
const jobs=new WeakMap();
export function ensureWardrobeArt(art,style='original'){
 if(!Object.hasOwn(files,style))style='original';art.wardrobes??={};
 if(art.wardrobes[style])return Promise.resolve(art.wardrobes[style]);
 let cache=jobs.get(art);if(!cache){cache=new Map();jobs.set(art,cache);}if(cache.has(style))return cache.get(style);
 const job=(async()=>{const img=new Image();img.src='assets/wardrobes/'+files[style];await img.decode();art.wardrobes[style]=img;return img;})();cache.set(style,job);job.catch(()=>cache.delete(style));return job;
}
