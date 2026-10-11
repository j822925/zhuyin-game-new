import {hasEnergy} from './adventure-food-model.js';
import {mediaUrl} from './media-url.js';
import {WALLPAPERS} from './data/home-wallpapers.js';
import {INTERIOR_ART} from './data/interior-style-art.js';
import {WALLPAPER_THUMBS} from './data/wallpaper-thumbs.js';
export {WALLPAPERS} from './data/home-wallpapers.js';
export function buyWallpaper(state,id){if(!hasEnergy(state))return false;const w=WALLPAPERS.find(w=>w.id===id);if(!w||state.wallpaperOwned.includes(id)||!Number.isInteger(state.stars)||state.stars<w.price)return false;state.stars-=w.price;state.wallpaperOwned.push(id);return true;}
export function applyWallpaper(state,id){if(!hasEnergy(state))return false;if(!state.wallpaperOwned.includes(id)||!WALLPAPERS.some(w=>w.id===id))return false;state.wallpaper=id;return true;}
const jobs=new WeakMap();
export function ensureWallpapers(art,ids){let cache=jobs.get(art);if(!cache){cache=new Map();jobs.set(art,cache);}art.wallpapers??={};return Promise.all(ids.map(id=>{
 if(art.wallpapers[id])return art.wallpapers[id];if(cache.has(id))return cache.get(id);const w=INTERIOR_ART[id];if(!w?.src)return null;
 const job=(async()=>{const image=new Image();image.src=mediaUrl(w.src);await image.decode();art.wallpapers[id]=image;return image;})();cache.set(id,job);job.catch(()=>cache.delete(id));return job;
}));}
const thumbJobs=new WeakMap();
export function ensureWallpaperThumbs(art,ids){let cache=thumbJobs.get(art);if(!cache){cache=new Map();thumbJobs.set(art,cache);}art.wallpaperThumbs??={};return Promise.all(ids.map(id=>{
 if(art.wallpaperThumbs[id])return art.wallpaperThumbs[id];if(cache.has(id))return cache.get(id);const meta=WALLPAPER_THUMBS[id];if(!meta)return null;
 const job=(async()=>{const image=new Image();image.src=mediaUrl(meta.src);await image.decode();art.wallpaperThumbs[id]=image;return image;})();cache.set(id,job);job.catch(()=>cache.delete(id));return job;
}));}
