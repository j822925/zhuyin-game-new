import {OPTIMIZED_MEDIA} from './data/optimized-media.js';
// Unknown/new artwork keeps working before the next optimization build.
// The hash replaces legacy query versions, so identical portraits download once.
export function mediaUrl(source){
 if(typeof source!=='string')return source;
 const key=source.replace(/^\.\//,'').split(/[?#]/)[0];
 return OPTIMIZED_MEDIA[key]||source;
}
