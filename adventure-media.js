import {ADVENTURE_MEDIA} from './data/adventure-media.js';
import {mediaUrl} from './media-url.js';
// Only forest-owned assets use these delivery copies; other games keep their art.
export function adventureMediaUrl(source){
 if(typeof source!=='string')return source;
 return ADVENTURE_MEDIA[source.replace(/^\.\//,'').split(/[?#]/)[0]]||mediaUrl(source);
}
